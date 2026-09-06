import test from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import {
  encryptRecord, decryptRecord, isEncryptedEnvelope, parseEnvelope, serializeEnvelope,
  envelopeAdditionalData, decodeRecordKey, encodeRecordKey, MAX_RECORD_BYTES, decodeRecord,
} from '../src/lib/envelope';

const record = JSON.stringify({ invoice: 'INV-2026-101', client: 'شركة نور · Montréal', amount: 4200 });

test('AES-256-GCM round trip preserves Unicode and exports neither plaintext nor key', async () => {
  const result = await encryptRecord(record);
  assert.equal(await decryptRecord(result.envelope, result.key), record);
  assert.equal(isEncryptedEnvelope(result.envelope), true);
  assert.equal(result.key.length, 43);
  assert.equal(result.envelope.includes('INV-2026-101'), false);
  assert.equal(result.envelope.includes(result.key), false);
  const next = await encryptRecord(record);
  assert.notEqual(next.key, result.key);
  assert.notEqual(JSON.parse(next.envelope).iv, JSON.parse(result.envelope).iv);
  assert.notEqual(next.envelope, result.envelope);
});

test('wrong keys, modified ciphertext, tags and IVs cannot decrypt', async () => {
  const original = await encryptRecord(record);
  const other = await encryptRecord(record);
  await assert.rejects(decryptRecord(original.envelope, other.key), /could not be decrypted/);
  for (const part of ['iv', 'ciphertext', 'tag'] as const) {
    const { iv, ciphertext } = parseEnvelope(original.envelope);
    if (part === 'iv') iv[0] ^= 1;
    else ciphertext[part === 'tag' ? ciphertext.length - 1 : 0] ^= 1;
    await assert.rejects(decryptRecord(serializeEnvelope(iv, ciphertext), original.key), /could not be decrypted/);
  }
});

test('strict envelope parsing rejects metadata changes, private fields, malformed and oversized input', async () => {
  const { envelope, key } = await encryptRecord(record);
  for (const extra of [{ version: 2 }, { algorithm: 'AES-CBC' }, { type: 'different' }, { key }, { iv: 'AAAA' }, { ciphertext: '?' }]) {
    const altered = JSON.stringify({ ...JSON.parse(envelope), ...extra });
    assert.equal(isEncryptedEnvelope(altered), false);
    await assert.rejects(decryptRecord(altered, key));
  }
  for (const input of ['', '[]', 'null', '{', 'a'.repeat(1_400_000)]) assert.equal(isEncryptedEnvelope(input), false);
  await assert.rejects(decryptRecord(envelope, 'short'), /43-character/);
  await assert.rejects(encryptRecord('a'.repeat(MAX_RECORD_BYTES + 1)), /too large/);
  await assert.rejects(encryptRecord('界'.repeat(Math.ceil(MAX_RECORD_BYTES / 3))), /too large/);
});

test('format interoperates with an independent AES-GCM implementation and authenticates its metadata', async () => {
  const browser = await encryptRecord(record);
  const parsed = parseEnvelope(browser.envelope);
  const ciphertext = parsed.ciphertext.subarray(0, -16);
  const tag = parsed.ciphertext.subarray(-16);
  const node = createDecipheriv('aes-256-gcm', decodeRecordKey(browser.key), parsed.iv);
  node.setAuthTag(tag);
  node.setAAD(envelopeAdditionalData());
  assert.equal(Buffer.concat([node.update(ciphertext), node.final()]).toString('utf8'), record);

  const key = randomBytes(32);
  const iv = randomBytes(12);
  const seal = (aad: Uint8Array) => {
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(aad);
    return serializeEnvelope(iv, Buffer.concat([cipher.update(record, 'utf8'), cipher.final(), cipher.getAuthTag()]));
  };
  assert.equal(await decryptRecord(seal(envelopeAdditionalData()), encodeRecordKey(key)), record);
  await assert.rejects(decryptRecord(seal(new Uint8Array()), encodeRecordKey(key)), /could not be decrypted/);
});

test('Hermes UTF-8 decoding fallback preserves Unicode and rejects invalid UTF-8', () => {
  const original = globalThis.TextDecoder;
  try {
    Object.defineProperty(globalThis, 'TextDecoder', { value: undefined, configurable: true, writable: true });
    assert.equal(decodeRecord(new TextEncoder().encode(record)), record);
    assert.throws(() => decodeRecord(new Uint8Array([0xff])));
  } finally {
    Object.defineProperty(globalThis, 'TextDecoder', { value: original, configurable: true, writable: true });
  }
});

test('a maximum-size record remains readable without base64 parser stack overflow', async () => {
  const large = 'x'.repeat(MAX_RECORD_BYTES);
  const result = await encryptRecord(large);
  assert.equal(await decryptRecord(result.envelope, result.key), large);
});
