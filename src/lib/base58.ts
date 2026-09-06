/**
 * Base58 in the Bitcoin/Solana alphabet, with no dependencies.
 *
 * Shared by the invoice validator in business.ts and the Solana devnet client in
 * solana.ts so both agree on exactly which strings are valid 32-byte addresses.
 */

export const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** Returns null for any character outside the alphabet, so callers never see a partial decode. */
export function decodeBase58(value: string): Uint8Array | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 128) return null;
  let decoded = 0n;
  for (const character of value) {
    const index = BASE58_ALPHABET.indexOf(character);
    if (index < 0) return null;
    decoded = decoded * 58n + BigInt(index);
  }
  const body: number[] = [];
  for (let remainder = decoded; remainder > 0n; remainder >>= 8n) body.unshift(Number(remainder & 0xffn));
  // A leading '1' encodes one leading zero byte and carries no value in the integer.
  let leadingZeros = 0;
  while (leadingZeros < value.length && value[leadingZeros] === '1') leadingZeros++;
  const out = new Uint8Array(leadingZeros + body.length);
  out.set(body, leadingZeros);
  return out;
}

export function encodeBase58(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = value * 256n + BigInt(byte);
  let encoded = '';
  while (value > 0n) {
    encoded = BASE58_ALPHABET[Number(value % 58n)] + encoded;
    value /= 58n;
  }
  let leadingZeros = 0;
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) leadingZeros++;
  return '1'.repeat(leadingZeros) + encoded;
}

/** Decodes a 32-byte public key, or throws. Ownership of the key is never implied. */
export function decodePublicKey(value: string): Uint8Array {
  const bytes = decodeBase58(value);
  if (!bytes || bytes.length !== 32) throw new TypeError(`Not a 32-byte base58 Solana address: ${value}`);
  return bytes;
}
