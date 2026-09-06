/**
 * A minimal WebCrypto `SubtleCrypto` implementation for Hermes, covering exactly
 * what src/lib/agreement.ts uses: SHA-256 digests and ECDSA P-256 keys in JWK form.
 *
 * Built on audited pure-JavaScript primitives (@noble/curves, @noble/hashes) so the
 * app runs in Expo Go without native crypto modules. Signatures are the raw 64-byte
 * r||s encoding WebCrypto produces, so records signed in a browser verify on a phone
 * and vice versa. Private key material lives in a WeakMap; it is never a property of
 * the key object, so serializing a signer cannot leak it.
 */
import { p256 } from '@noble/curves/nist.js';
import { sha256 } from '@noble/hashes/sha2.js';

type Usage = 'sign' | 'verify';

export type ShimKey = {
  readonly type: 'public' | 'private';
  readonly extractable: boolean;
  readonly algorithm: { readonly name: 'ECDSA'; readonly namedCurve: 'P-256' };
  readonly usages: readonly Usage[];
};

type EcJwk = { kty: 'EC'; crv: 'P-256'; x: string; y: string; ext: true; key_ops: ['verify'] };
type AlgorithmLike = string | { name: string; namedCurve?: string; hash?: string | { name: string } };

const secretKeys = new WeakMap<ShimKey, Uint8Array>();
const publicPoints = new WeakMap<ShimKey, Uint8Array>();

function makeKey(type: ShimKey['type'], extractable: boolean, usages: readonly string[]): ShimKey {
  const allowed = usages.filter((usage): usage is Usage => usage === 'sign' || usage === 'verify');
  return Object.freeze({
    type,
    extractable,
    algorithm: Object.freeze({ name: 'ECDSA', namedCurve: 'P-256' } as const),
    usages: Object.freeze(allowed),
  });
}

function unsupported(message: string): Error {
  return new Error(`SANAD crypto shim: ${message}`);
}

function algorithmName(algorithm: AlgorithmLike): string {
  return (typeof algorithm === 'string' ? algorithm : algorithm.name).toUpperCase();
}

function assertEcdsaCurve(algorithm: AlgorithmLike): void {
  if (algorithmName(algorithm) !== 'ECDSA') throw unsupported('only ECDSA keys are supported.');
  const curve = typeof algorithm === 'string' ? undefined : algorithm.namedCurve;
  if (curve !== undefined && curve !== 'P-256') throw unsupported('only the P-256 curve is supported.');
}

function assertEcdsaSha256(algorithm: AlgorithmLike): void {
  if (algorithmName(algorithm) !== 'ECDSA') throw unsupported('only ECDSA signatures are supported.');
  const hash = typeof algorithm === 'string' ? undefined : algorithm.hash;
  const hashName = hash === undefined ? 'SHA-256' : typeof hash === 'string' ? hash : hash.name;
  if (hashName.toUpperCase() !== 'SHA-256') throw unsupported('only SHA-256 hashing is supported.');
}

function bytesOf(data: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return new Uint8Array(data);
}

function bufferOf(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) throw unsupported('invalid base64url in JWK.');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function isJwkRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function createSubtle() {
  return {
    async digest(algorithm: AlgorithmLike, data: ArrayBuffer | ArrayBufferView): Promise<ArrayBuffer> {
      if (algorithmName(algorithm) !== 'SHA-256') throw unsupported('only SHA-256 digests are supported.');
      return bufferOf(sha256(bytesOf(data)));
    },

    async generateKey(algorithm: AlgorithmLike, extractable: boolean, usages: readonly string[]): Promise<{ publicKey: ShimKey; privateKey: ShimKey }> {
      assertEcdsaCurve(algorithm);
      const secretKey = p256.utils.randomSecretKey();
      const point = p256.getPublicKey(secretKey, false);
      const privateKey = makeKey('private', extractable, usages.filter((usage) => usage === 'sign'));
      const publicKey = makeKey('public', true, usages.filter((usage) => usage === 'verify'));
      secretKeys.set(privateKey, secretKey);
      publicPoints.set(publicKey, point);
      return { publicKey, privateKey };
    },

    async exportKey(format: string, key: ShimKey): Promise<EcJwk> {
      if (format !== 'jwk') throw unsupported('only JWK export is supported.');
      if (!key.extractable) throw new Error('key is not extractable');
      const point = publicPoints.get(key);
      if (key.type !== 'public' || !point) throw unsupported('only public keys can be exported.');
      // Property order matches browser output so canonical JSON hashes are identical.
      return { key_ops: ['verify'], ext: true, kty: 'EC', x: toBase64Url(point.subarray(1, 33)), y: toBase64Url(point.subarray(33, 65)), crv: 'P-256' } as EcJwk;
    },

    async importKey(format: string, keyData: unknown, algorithm: AlgorithmLike, extractable: boolean, usages: readonly string[]): Promise<ShimKey> {
      if (format !== 'jwk') throw unsupported('only JWK import is supported.');
      assertEcdsaCurve(algorithm);
      if (!isJwkRecord(keyData) || keyData.kty !== 'EC' || keyData.crv !== 'P-256') throw new Error('Invalid JWK: expected an EC P-256 key.');
      if ('d' in keyData) throw unsupported('private JWK import is not supported.');
      if (typeof keyData.x !== 'string' || typeof keyData.y !== 'string') throw new Error('Invalid JWK: missing coordinates.');
      const x = fromBase64Url(keyData.x);
      const y = fromBase64Url(keyData.y);
      if (x.length !== 32 || y.length !== 32) throw new Error('Invalid JWK: coordinates must be 32 bytes.');
      const point = new Uint8Array(65);
      point[0] = 4;
      point.set(x, 1);
      point.set(y, 33);
      if (!p256.utils.isValidPublicKey(point, false)) throw new Error('Invalid JWK: point is not on the P-256 curve.');
      const key = makeKey('public', extractable, usages);
      publicPoints.set(key, point);
      return key;
    },

    async sign(algorithm: AlgorithmLike, key: ShimKey, data: ArrayBuffer | ArrayBufferView): Promise<ArrayBuffer> {
      assertEcdsaSha256(algorithm);
      const secretKey = secretKeys.get(key);
      if (!secretKey || key.type !== 'private' || !key.usages.includes('sign')) throw new Error('The key cannot be used for signing.');
      const signature = p256.sign(sha256(bytesOf(data)), secretKey, { prehash: false, lowS: true, format: 'compact' });
      return bufferOf(signature);
    },

    async verify(algorithm: AlgorithmLike, key: ShimKey, signature: ArrayBuffer | ArrayBufferView, data: ArrayBuffer | ArrayBufferView): Promise<boolean> {
      assertEcdsaSha256(algorithm);
      const point = publicPoints.get(key);
      if (!point || key.type !== 'public' || !key.usages.includes('verify')) throw new Error('The key cannot be used for verification.');
      const bytes = bytesOf(signature);
      if (bytes.length !== 64) return false;
      try {
        // Browsers may emit high-S signatures; accept both so web-signed records verify here.
        return p256.verify(bytes, sha256(bytesOf(data)), point, { prehash: false, lowS: false, format: 'compact' });
      } catch {
        return false;
      }
    },
  };
}
