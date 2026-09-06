import { AESEncryptionKey, AESSealedData, aesEncryptAsync, aesDecryptAsync, getRandomValues } from 'expo-crypto';
import {
  encodeRecord, decodeRecord, encodeRecordKey, decodeRecordKey,
  envelopeAdditionalData, serializeEnvelope, parseEnvelope,
} from '../../../src/lib/envelope';

export { isEncryptedEnvelope } from '../../../src/lib/envelope';

/** Native AES-GCM uses the same file format as browser WebCrypto, independently of the ECDSA shim. */
export async function encryptRecord(plaintext: string): Promise<{ envelope: string; key: string }> {
  const bytes = encodeRecord(plaintext);
  const rawKey = getRandomValues(new Uint8Array(32));
  const iv = getRandomValues(new Uint8Array(12));
  try {
    const key = await AESEncryptionKey.import(rawKey);
    const sealed = await aesEncryptAsync(bytes, key, { nonce: { bytes: iv }, additionalData: envelopeAdditionalData(), tagLength: 16 });
    const ciphertext = await sealed.ciphertext({ includeTag: true, encoding: 'bytes' });
    return { envelope: serializeEnvelope(iv, ciphertext), key: encodeRecordKey(rawKey) };
  } finally { rawKey.fill(0); }
}

export async function decryptRecord(envelope: string, key: string): Promise<string> {
  const { iv, ciphertext } = parseEnvelope(envelope);
  const rawKey = decodeRecordKey(key);
  try {
    const imported = await AESEncryptionKey.import(rawKey);
    const sealed = AESSealedData.fromParts(iv, ciphertext, 16);
    return decodeRecord(await aesDecryptAsync(sealed, imported, { additionalData: envelopeAdditionalData(), output: 'bytes' }));
  } catch {
    throw new Error('The file could not be decrypted. Check the key and that the file has not changed.');
  } finally { rawKey.fill(0); }
}
