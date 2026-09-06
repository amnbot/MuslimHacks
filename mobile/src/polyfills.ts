/**
 * Runtime globals the shared agreement module expects from a browser.
 * Import this before anything that touches src/lib. Each patch is guarded, so
 * nothing is replaced when the runtime already provides it.
 */
import { getRandomValues, randomUUID } from 'expo-crypto';
import { createSubtle } from './crypto/subtle-shim';

const scope = globalThis as unknown as Record<string, unknown>;

function define(target: Record<string, unknown>, key: string, value: unknown): void {
  try {
    target[key] = value;
    if (target[key] === value) return;
  } catch {
    // Fall through to defineProperty for read-only accessors.
  }
  Object.defineProperty(target, key, { value, configurable: true, writable: true });
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function btoaPolyfill(input: string): string {
  let output = '';
  for (let index = 0; index < input.length; index += 3) {
    const a = input.charCodeAt(index);
    const b = index + 1 < input.length ? input.charCodeAt(index + 1) : undefined;
    const c = index + 2 < input.length ? input.charCodeAt(index + 2) : undefined;
    if (a > 255 || (b ?? 0) > 255 || (c ?? 0) > 255) throw new Error('btoa: invalid character');
    const triple = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    output += BASE64[(triple >> 18) & 63] + BASE64[(triple >> 12) & 63]
      + (b === undefined ? '=' : BASE64[(triple >> 6) & 63])
      + (c === undefined ? '=' : BASE64[triple & 63]);
  }
  return output;
}

function atobPolyfill(input: string): string {
  const clean = input.replace(/\s/g, '');
  if (clean.length % 4 === 1 || /[^A-Za-z0-9+/=]/.test(clean)) throw new Error('atob: invalid base64');
  let output = '';
  let buffer = 0;
  let bits = 0;
  for (const character of clean) {
    if (character === '=') break;
    buffer = ((buffer << 6) | BASE64.indexOf(character)) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 255);
    }
  }
  return output;
}

class TextEncoderPolyfill {
  readonly encoding = 'utf-8';
  encode(input = ''): Uint8Array {
    const bytes: number[] = [];
    for (let index = 0; index < input.length; index++) {
      let code = input.charCodeAt(index);
      if (code >= 0xd800 && code <= 0xdbff && index + 1 < input.length) {
        const next = input.charCodeAt(index + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
          index++;
        }
      }
      if (code >= 0xd800 && code <= 0xdfff) code = 0xfffd;
      if (code < 0x80) bytes.push(code);
      else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
      else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
      else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    }
    return Uint8Array.from(bytes);
  }
}

if (typeof scope.btoa !== 'function') define(scope, 'btoa', btoaPolyfill);
if (typeof scope.atob !== 'function') define(scope, 'atob', atobPolyfill);
if (typeof scope.TextEncoder !== 'function') define(scope, 'TextEncoder', TextEncoderPolyfill);
if (typeof Object.hasOwn !== 'function') {
  define(Object as unknown as Record<string, unknown>, 'hasOwn', (target: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(target, key));
}

let cryptoObject = scope.crypto as Record<string, unknown> | undefined;
if (!cryptoObject || typeof cryptoObject !== 'object') {
  cryptoObject = {};
  define(scope, 'crypto', cryptoObject);
}
if (typeof cryptoObject.getRandomValues !== 'function') {
  define(cryptoObject, 'getRandomValues', <T extends ArrayBufferView>(array: T) => getRandomValues(array as unknown as Uint8Array) as unknown as T);
}
if (typeof cryptoObject.randomUUID !== 'function') define(cryptoObject, 'randomUUID', () => randomUUID());
if (!cryptoObject.subtle) define(cryptoObject, 'subtle', createSubtle());
