/** Encrypted file sharing only. This does not encrypt app storage or blockchain transfers. */
const metadata = { type: 'sanad-encrypted-record', version: 1, algorithm: 'AES-256-GCM' } as const;
export const MAX_RECORD_BYTES = 1_000_000;
const MAX_ENVELOPE_CHARS = Math.ceil((MAX_RECORD_BYTES + 16) / 3) * 4 + 256;
const encoder = new TextEncoder();

export function envelopeAdditionalData(): Uint8Array<ArrayBuffer> {
  return encoder.encode(JSON.stringify(metadata));
}

function base64(bytes: Uint8Array): string {
  let binary = '';
  // Do not spread an entire file into a function's argument list.
  for (let start = 0; start < bytes.length; start += 8192) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
  }
  return btoa(binary);
}

function fromBase64(value: unknown): Uint8Array<ArrayBuffer> {
  if (typeof value !== 'string' || value.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(value) || value.slice(0, -2).includes('=')) {
    throw new Error('The encrypted file has an invalid encoding.');
  }
  const result = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  if (base64(result) !== value) throw new Error('The encrypted file has an invalid encoding.');
  return result;
}

export function encodeRecord(plaintext: string): Uint8Array<ArrayBuffer> {
  if (typeof plaintext !== 'string' || plaintext.length > MAX_RECORD_BYTES) throw new Error('The record is too large to encrypt.');
  const bytes = encoder.encode(plaintext);
  if (bytes.length > MAX_RECORD_BYTES) throw new Error('The record is too large to encrypt.');
  return bytes;
}

export function decodeRecord(bytes: Uint8Array): string {
  if (bytes.length > MAX_RECORD_BYTES) throw new Error('The decrypted record is too large.');
  if (typeof TextDecoder === 'function') return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  // Hermes does not always provide TextDecoder. URI decoding validates UTF-8.
  let encoded = '';
  for (const byte of bytes) encoded += `%${byte.toString(16).padStart(2, '0')}`;
  return decodeURIComponent(encoded);
}

export function encodeRecordKey(bytes: Uint8Array): string {
  if (bytes.length !== 32) throw new Error('Encryption requires a 256-bit key.');
  return base64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeRecordKey(key: string): Uint8Array<ArrayBuffer> {
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(key.trim())) throw new Error('Paste the complete 43-character decryption key.');
  const bytes = fromBase64(key.trim().replace(/-/g, '+').replace(/_/g, '/') + '=');
  if (bytes.length !== 32) throw new Error('The decryption key is invalid.');
  return bytes;
}

export function serializeEnvelope(iv: Uint8Array, ciphertext: Uint8Array): string {
  if (iv.length !== 12 || ciphertext.length < 16 || ciphertext.length > MAX_RECORD_BYTES + 16) throw new Error('The encrypted file has invalid dimensions.');
  return JSON.stringify({ ...metadata, iv: base64(iv), ciphertext: base64(ciphertext) });
}

export function parseEnvelope(input: string): { iv: Uint8Array<ArrayBuffer>; ciphertext: Uint8Array<ArrayBuffer> } {
  if (typeof input !== 'string' || input.length > MAX_ENVELOPE_CHARS) throw new Error('The encrypted file is too large.');
  let value: Record<string, unknown>;
  try { value = JSON.parse(input) as Record<string, unknown>; } catch { throw new Error('This is not a valid encrypted record.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== 5
    || !['type', 'version', 'algorithm', 'iv', 'ciphertext'].every((field) => Object.hasOwn(value, field))
    || value.type !== metadata.type || value.version !== metadata.version || value.algorithm !== metadata.algorithm) {
    throw new Error('The encrypted record format is not supported.');
  }
  const iv = fromBase64(value.iv);
  const ciphertext = fromBase64(value.ciphertext);
  if (iv.length !== 12 || ciphertext.length < 16 || ciphertext.length > MAX_RECORD_BYTES + 16) throw new Error('The encrypted file has invalid dimensions.');
  return { iv, ciphertext };
}

export function isEncryptedEnvelope(input: string): boolean {
  try { parseEnvelope(input); return true; } catch { return false; }
}

/** The returned key must be shared separately, never embedded in the exported file. */
export async function encryptRecord(plaintext: string): Promise<{ envelope: string; key: string }> {
  const bytes = encodeRecord(plaintext);
  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  try {
    const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt']);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: envelopeAdditionalData(), tagLength: 128 }, key, bytes);
    return { envelope: serializeEnvelope(iv, new Uint8Array(ciphertext)), key: encodeRecordKey(rawKey) };
  } finally { rawKey.fill(0); }
}

export async function decryptRecord(envelope: string, key: string): Promise<string> {
  const { iv, ciphertext } = parseEnvelope(envelope);
  const rawKey = decodeRecordKey(key);
  try {
    const imported = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: envelopeAdditionalData(), tagLength: 128 }, imported, ciphertext);
    return decodeRecord(new Uint8Array(plaintext));
  } catch {
    throw new Error('The file could not be decrypted. Check the key and that the file has not changed.');
  } finally { rawKey.fill(0); }
}
