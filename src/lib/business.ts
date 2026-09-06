import { canonicalize, hashCanonical } from './agreement';

export const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const PAYMENT_NETWORK_LABEL = 'USDC · Solana mainnet';
export const MAX_INVOICE_RECORD_BYTES = 131_072;
const MICROS = 1_000_000;
const encoder = new TextEncoder();

export type InvoiceLine = { description: string; quantity: number; unitPriceMicros: number };
export type BusinessInvoice = {
  version: 1;
  id: string;
  createdAt: string;
  issuer: string;
  customer: string;
  reference: string;
  dueDate: string;
  note: string;
  lines: InvoiceLine[];
  totalMicros: number;
  payment: { currency: 'USDC'; network: 'solana-mainnet-beta'; mint: typeof SOLANA_USDC_MINT; recipientWallet: string };
};
export type InvoiceInput = {
  id?: string;
  createdAt?: string;
  issuer: string;
  customer: string;
  reference: string;
  dueDate: string;
  note?: string;
  recipientWallet: string;
  lines: InvoiceLine[];
};
/** Device-local signing key. The name is self-declared, not a verified business identity. */
export type BusinessSigner = { businessName: string; publicKeyJwk: JsonWebKey; privateKey: CryptoKey };
export type InvoiceSignatureRole = 'issuer' | 'customer';
export type InvoiceSignature = {
  role: InvoiceSignatureRole;
  businessName: string;
  publicKeyJwk: JsonWebKey;
  signedAt: string;
  /** A customer acknowledges the exact issuer signature, preventing issuer-key substitution. */
  issuerSignatureHash: string | null;
  signatureB64: string;
};
export type InvoiceRecord = { invoice: BusinessInvoice; hash: string; signatures: InvoiceSignature[] };
export type InvoiceVerification = { valid: boolean; hashMatches: boolean; signaturesValid: boolean; complete: boolean; message: string };
export type InvoiceStatus = 'awaiting-signature' | 'awaiting-acknowledgement' | 'acknowledged';

function record(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function keys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}
function textValue(value: unknown, limit: number, empty = false): value is string {
  return typeof value === 'string' && value.length <= limit && value === value.trim()
    && (empty || value.length > 0) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
}
function businessName(value: unknown): value is string {
  return textValue(value, 120) && !/[\r\n\t]/.test(value);
}
function timestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length === 24 && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}
function dateOnly(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function positiveMicros(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
function copy<T>(value: T): T { return JSON.parse(canonicalize(value)) as T; }

/** Parse a human USDC amount without floating-point multiplication or silent rounding. */
export function parseUsdc(value: string): number {
  if (typeof value !== 'string' || value.length > 24 || !/^(0|[1-9]\d*)(\.\d{1,6})?$/.test(value)) {
    throw new TypeError('Enter a positive USDC amount with up to 6 decimal places.');
  }
  const [whole, fraction = ''] = value.split('.');
  const amount = BigInt(whole) * BigInt(MICROS) + BigInt(fraction.padEnd(6, '0'));
  if (amount <= 0n || amount > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('The USDC amount is outside the supported range.');
  return Number(amount);
}

/** Input and output arithmetic uses integer millionths of one USDC. */
export function formatUsdc(micros: number): string {
  if (!Number.isSafeInteger(micros) || micros < 0) throw new TypeError('USDC values must be nonnegative safe integer micros.');
  const amount = BigInt(micros);
  const fraction = String(amount % BigInt(MICROS)).padStart(6, '0').replace(/0+$/, '').padEnd(2, '0');
  return `${amount / BigInt(MICROS)}.${fraction}`;
}

function quantityThousandths(value: unknown): bigint {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 1_000_000
    || !/^(0|[1-9]\d*)(\.\d{1,3})?$/.test(String(value))) {
    throw new TypeError('Line quantities must be positive, at most 1,000,000, with up to 3 decimal places.');
  }
  const [whole, fraction = ''] = String(value).split('.');
  return BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'));
}

export function lineTotalMicros(line: InvoiceLine): number {
  if (!record(line) || !keys(line, ['description', 'quantity', 'unitPriceMicros']) || !textValue(line.description, 160)
    || !positiveMicros(line.unitPriceMicros)) throw new TypeError('Each invoice line needs a description, quantity, and positive USDC unit price.');
  const product = quantityThousandths(line.quantity) * BigInt(line.unitPriceMicros);
  if (product % 1000n !== 0n) throw new RangeError('A line total cannot use fractions smaller than 0.000001 USDC.');
  const amount = product / 1000n;
  if (amount <= 0n || amount > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('The invoice line total is outside the supported range.');
  return Number(amount);
}

/** Returns the total in integer USDC micros, never a floating-point currency amount. */
export function totalUsdc(lines: InvoiceLine[]): number {
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 50) throw new TypeError('An invoice needs between 1 and 50 line items.');
  let total = 0n;
  for (const line of lines) total += BigInt(lineTotalMicros(line));
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('The invoice total is outside the supported range.');
  return Number(total);
}

/** Validates canonical base58 encoding of a 32-byte Solana public key. It does not prove wallet ownership. */
export function isSolanaAddress(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 32 || value.length > 44 || !/^[1-9A-HJ-NP-Za-km-z]+$/.test(value)) return false;
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let decoded = 0n;
  for (const character of value) decoded = decoded * 58n + BigInt(alphabet.indexOf(character));
  let bytes = 0;
  for (let remainder = decoded; remainder > 0n; remainder >>= 8n) bytes++;
  let leadingZeros = 0;
  while (value[leadingZeros] === '1') leadingZeros++;
  // The zero key is the system program, not a business recipient.
  return decoded !== 0n && bytes + leadingZeros === 32;
}

/** Wallet input check: also prevents accidentally pasting the displayed USDC mint.
 * Account type, control of the address, and the recipient's token account still need wallet/RPC checks.
 */
export function isValidSolanaAddress(value: unknown): value is string {
  return isSolanaAddress(value) && value !== SOLANA_USDC_MINT;
}

/** Validates all portable fields, recalculates totals, and returns a detached copy. */
export function validateInvoice(value: unknown): BusinessInvoice {
  if (!record(value) || !keys(value, ['version', 'id', 'createdAt', 'issuer', 'customer', 'reference', 'dueDate', 'note', 'lines', 'totalMicros', 'payment'])
    || value.version !== 1 || !textValue(value.id, 100) || !timestamp(value.createdAt)
    || !businessName(value.issuer) || !businessName(value.customer) || value.issuer === value.customer
    || !textValue(value.reference, 80) || !dateOnly(value.dueDate) || !textValue(value.note, 2000, true)) {
    throw new TypeError('The invoice has invalid business names, reference, date, or details.');
  }
  const payment = value.payment;
  if (!record(payment) || !keys(payment, ['currency', 'network', 'mint', 'recipientWallet'])
    || payment.currency !== 'USDC' || payment.network !== 'solana-mainnet-beta' || payment.mint !== SOLANA_USDC_MINT
    || !isValidSolanaAddress(payment.recipientWallet)) throw new TypeError('Payment must use native USDC on Solana mainnet and a recipient wallet address, not the USDC mint.');
  if (!positiveMicros(value.totalMicros) || totalUsdc(value.lines as InvoiceLine[]) !== value.totalMicros) {
    throw new TypeError('The invoice total does not match its line items.');
  }
  return copy(value as BusinessInvoice);
}

export function createInvoice(input: InvoiceInput): BusinessInvoice {
  return validateInvoice({
    version: 1, id: input.id ?? crypto.randomUUID(), createdAt: input.createdAt ?? new Date().toISOString(),
    issuer: input.issuer, customer: input.customer, reference: input.reference, dueDate: input.dueDate,
    note: input.note ?? '', lines: input.lines, totalMicros: totalUsdc(input.lines),
    payment: { currency: 'USDC', network: 'solana-mainnet-beta', mint: SOLANA_USDC_MINT, recipientWallet: input.recipientWallet },
  });
}

/** A real transfer request for a wallet. Opening it does not execute or confirm a payment.
 * Solana Pay transfer URIs have no cluster field; the signed record pins mainnet and the
 * UI must require the wallet's mainnet network before presenting this request.
 */
export function buildSolanaPayUri(input: BusinessInvoice): string {
  const invoice = validateInvoice(input);
  const query = [
    ['amount', formatUsdc(invoice.totalMicros)], ['spl-token', invoice.payment.mint],
    ['label', invoice.issuer], ['message', `Invoice ${invoice.reference} · Solana mainnet`],
  ].map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
  return `solana:${invoice.payment.recipientWallet}?${query}`;
}

function coordinateShape(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) return false;
  try {
    const encoded = value.replace(/-/g, '+').replace(/_/g, '/') + '=';
    return btoa(atob(encoded)) === encoded;
  } catch { return false; }
}
function publicKeyShape(value: unknown): value is JsonWebKey {
  return record(value) && keys(value, ['key_ops', 'ext', 'kty', 'x', 'y', 'crv'])
    && value.kty === 'EC' && value.crv === 'P-256' && value.ext === true
    && Array.isArray(value.key_ops) && value.key_ops.length === 1 && value.key_ops[0] === 'verify'
    && coordinateShape(value.x) && coordinateShape(value.y);
}
function fromBase64(value: string): Uint8Array<ArrayBuffer> { return Uint8Array.from(atob(value), (character) => character.charCodeAt(0)); }
function toBase64(value: Uint8Array): string { return btoa(String.fromCharCode(...value)); }
function signatureShape(value: unknown, invoice: BusinessInvoice): value is InvoiceSignature {
  if (!record(value) || !keys(value, ['role', 'businessName', 'publicKeyJwk', 'signedAt', 'issuerSignatureHash', 'signatureB64'])
    || (value.role !== 'issuer' && value.role !== 'customer') || value.businessName !== invoice[value.role]
    || !publicKeyShape(value.publicKeyJwk) || !timestamp(value.signedAt)
    || (value.role === 'issuer' ? value.issuerSignatureHash !== null : typeof value.issuerSignatureHash !== 'string' || !/^[a-f0-9]{64}$/.test(value.issuerSignatureHash))
    || typeof value.signatureB64 !== 'string' || !/^[A-Za-z0-9+/]{86}==$/.test(value.signatureB64)) return false;
  try { return fromBase64(value.signatureB64).length === 64 && toBase64(fromBase64(value.signatureB64)) === value.signatureB64; } catch { return false; }
}
function signaturePayload(hash: string, signature: Omit<InvoiceSignature, 'signatureB64'>): Uint8Array<ArrayBuffer> {
  return encoder.encode(canonicalize({
    purpose: 'SANAD B2B invoice acknowledgement v1', hash, role: signature.role,
    businessName: signature.businessName, publicKeyJwk: signature.publicKeyJwk,
    signedAt: signature.signedAt, issuerSignatureHash: signature.issuerSignatureHash,
  }));
}
function recordShape(input: unknown): InvoiceRecord {
  let value = input;
  if (typeof value === 'string') {
    if (value.length > MAX_INVOICE_RECORD_BYTES || encoder.encode(value).byteLength > MAX_INVOICE_RECORD_BYTES) throw new Error('The invoice file is too large.');
    value = JSON.parse(value) as unknown;
  }
  if (!record(value) || !keys(value, ['invoice', 'hash', 'signatures'])) throw new Error('The invoice record has invalid fields.');
  const invoice = validateInvoice(value.invoice);
  if (typeof value.hash !== 'string' || !/^[a-f0-9]{64}$/.test(value.hash) || !Array.isArray(value.signatures) || value.signatures.length > 2
    || !value.signatures.every((signature) => signatureShape(signature, invoice))
    || new Set(value.signatures.map((signature) => signature.role)).size !== value.signatures.length) throw new Error('The invoice record has an invalid hash or signature list.');
  return copy(value as InvoiceRecord);
}

export async function createBusinessSigner(name: string): Promise<BusinessSigner> {
  if (!businessName(name)) throw new TypeError('Enter a business name of 1–120 characters.');
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  return { businessName: name, publicKeyJwk: await crypto.subtle.exportKey('jwk', pair.publicKey), privateKey: pair.privateKey };
}
export async function createInvoiceRecord(input: BusinessInvoice): Promise<InvoiceRecord> {
  const invoice = validateInvoice(input);
  return { invoice, hash: await hashCanonical(invoice), signatures: [] };
}
export function invoiceStatus(value: InvoiceRecord): InvoiceStatus {
  return value.signatures.some((signature) => signature.role === 'customer') ? 'acknowledged'
    : value.signatures.some((signature) => signature.role === 'issuer') ? 'awaiting-acknowledgement' : 'awaiting-signature';
}

export async function verifyInvoiceRecord(input: unknown): Promise<InvoiceVerification> {
  let hashMatches = false;
  try {
    const value = recordShape(input);
    hashMatches = await hashCanonical(value.invoice) === value.hash;
    if (!hashMatches) throw new Error('Invoice details changed: its SHA-256 fingerprint no longer matches.');
    const issuer = value.signatures.find((signature) => signature.role === 'issuer');
    const customer = value.signatures.find((signature) => signature.role === 'customer');
    if (customer && !issuer) throw new Error('Customer acknowledgement requires the issuer signature.');
    if (customer && issuer) {
      if (canonicalize(customer.publicKeyJwk) === canonicalize(issuer.publicKeyJwk)) throw new Error('The customer must acknowledge with an independent signing key.');
      if (customer.issuerSignatureHash !== await hashCanonical(issuer)) throw new Error('Customer acknowledgement does not match this issuer signature.');
    }
    for (const signature of value.signatures) {
      const key = await crypto.subtle.importKey('jwk', signature.publicKeyJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      if (!await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, fromBase64(signature.signatureB64), signaturePayload(value.hash, signature))) {
        throw new Error('A signature does not match the invoice or its signing details.');
      }
    }
    return { valid: true, hashMatches: true, signaturesValid: true, complete: Boolean(issuer && customer),
      message: customer ? 'Issuer signature and customer acknowledgement verified. Business identities are self-declared; payment is not confirmed.'
        : issuer ? 'Issuer signature verified. Awaiting customer acknowledgement; business identity is self-declared.'
          : 'Invoice fingerprint verified. Awaiting issuer signature.' };
  } catch (error) {
    return { valid: false, hashMatches, signaturesValid: false, complete: false, message: error instanceof Error ? error.message : 'This file is not a valid invoice record.' };
  }
}

export async function signInvoiceRecord(input: InvoiceRecord, signer: BusinessSigner, role: InvoiceSignatureRole): Promise<InvoiceRecord> {
  const value = recordShape(input);
  const verification = await verifyInvoiceRecord(value);
  if (!verification.valid) throw new Error(verification.message);
  if (role !== 'issuer' && role !== 'customer') throw new TypeError('Choose an invoice issuer or customer signature.');
  if (!businessName(signer.businessName) || signer.businessName !== value.invoice[role]) throw new Error(`Only the named ${role} business can sign in this role.`);
  if (!publicKeyShape(signer.publicKeyJwk)) throw new Error('The signer public key is invalid.');
  if (value.signatures.some((signature) => signature.role === role)) throw new Error(`The ${role} already signed this invoice.`);
  const issuer = value.signatures.find((signature) => signature.role === 'issuer');
  if (role === 'customer' && !issuer) throw new Error('Import an issuer-signed invoice before acknowledging it.');
  if (role === 'customer' && canonicalize(signer.publicKeyJwk) === canonicalize(issuer!.publicKeyJwk)) throw new Error('Customer acknowledgement requires an independent signing key.');
  const metadata: Omit<InvoiceSignature, 'signatureB64'> = {
    role, businessName: signer.businessName, publicKeyJwk: copy(signer.publicKeyJwk),
    signedAt: new Date().toISOString(), issuerSignatureHash: role === 'customer' ? await hashCanonical(issuer) : null,
  };
  const bytes = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signer.privateKey, signaturePayload(value.hash, metadata));
  value.signatures.push({ ...metadata, signatureB64: toBase64(new Uint8Array(bytes)) });
  value.signatures.sort((left, right) => left.role === right.role ? 0 : left.role === 'issuer' ? -1 : 1);
  const result = await verifyInvoiceRecord(value);
  if (!result.valid) throw new Error(result.message);
  return value;
}

/** Import accepts issuer-signed records only. It verifies public signatures, not external identity or settlement. */
export async function parseInvoiceRecord(input: unknown): Promise<InvoiceRecord> {
  const value = recordShape(input);
  const result = await verifyInvoiceRecord(value);
  if (!result.valid) throw new Error(result.message);
  if (!value.signatures.some((signature) => signature.role === 'issuer')) throw new Error('Only issuer-signed invoice records can be imported.');
  return value;
}

/** Combine peer copies only when invoice content and all existing signatures match. */
export async function mergeInvoiceRecords(current: InvoiceRecord, incoming: InvoiceRecord): Promise<InvoiceRecord> {
  const [merged, other] = await Promise.all([parseInvoiceRecord(current), parseInvoiceRecord(incoming)]);
  if (merged.invoice.id !== other.invoice.id || merged.hash !== other.hash || canonicalize(merged.invoice) !== canonicalize(other.invoice)) {
    throw new Error('This record conflicts with the saved invoice. The invoice ID and signed content must match.');
  }
  for (const signature of other.signatures) {
    const previous = merged.signatures.find((entry) => entry.role === signature.role);
    if (!previous) merged.signatures.push(signature);
    else if (canonicalize(previous) !== canonicalize(signature)) throw new Error(`Conflicting ${signature.role} signatures cannot replace a saved signature.`);
  }
  merged.signatures.sort((left, right) => left.role === right.role ? 0 : left.role === 'issuer' ? -1 : 1);
  return parseInvoiceRecord(merged);
}

/** Pin the first verified content and signer keys for an invoice ID locally; later imports cannot replace them. */
export async function pinInvoiceRecord(existing: InvoiceRecord | undefined, incoming: InvoiceRecord): Promise<InvoiceRecord> {
  return existing ? mergeInvoiceRecords(existing, incoming) : parseInvoiceRecord(incoming);
}

/** Synchronous shape check and explicit public-data allowlist. Call verifyInvoiceRecord before sharing. */
export function exportInvoiceRecord(input: InvoiceRecord): string {
  const value = recordShape(input);
  if (!value.signatures.some((signature) => signature.role === 'issuer')) throw new Error('Sign the invoice before exporting it.');
  const json = JSON.stringify({ invoice: value.invoice, hash: value.hash, signatures: value.signatures.map(({ role, businessName: name, publicKeyJwk, signedAt, issuerSignatureHash, signatureB64 }) => ({
    role, businessName: name, publicKeyJwk, signedAt, issuerSignatureHash, signatureB64,
  })) }, null, 2);
  if (encoder.encode(json).byteLength > MAX_INVOICE_RECORD_BYTES) throw new Error('The invoice file is too large.');
  return json;
}
