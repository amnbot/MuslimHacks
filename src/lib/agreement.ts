import { calculateCosts, type Invoice, type Quote, type FeeBearer, type CostResult } from './costs';

export type PartyId = 'buyer' | 'supplier';

/** These ephemeral keys demonstrate consent and integrity, not verified identity. */
export type Signer = {
  partyId: PartyId;
  displayName: string;
  publicKeyJwk: JsonWebKey;
  privateKey: CryptoKey;
};

export type AgreementSnapshot = {
  version: 1;
  id: string;
  createdAt: string;
  invoice: Invoice;
  quote: Quote;
  feeBearer: FeeBearer;
  costs: CostResult;
  terms: { deliveryWindow: string; note: string };
  parties: { buyer: string; supplier: string };
  disclosure: string;
};

export type AgreementSignature = {
  partyId: PartyId;
  displayName: string;
  publicKeyJwk: JsonWebKey;
  signedAt: string;
  signatureB64: string;
};

export type Agreement = {
  snapshot: AgreementSnapshot;
  hash: string;
  signatures: AgreementSignature[];
};

export type VerificationResult = {
  valid: boolean;
  hashMatches: boolean;
  signaturesValid: boolean;
  complete: boolean;
  message: string;
};

const encoder = new TextEncoder();
const partyNames: Record<PartyId, string> = {
  buyer: 'Bilal Mansouri',
  supplier: 'Amira Ben Youssef',
};
const costFields = [
  'principalCad', 'fxMarkupCad', 'transferFeeCad', 'feeReserveCad',
  'totalMinCad', 'totalMaxCad', 'recipientMinEur', 'recipientMaxEur',
  'marginMinCad', 'marginMaxCad',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function textValue(value: unknown, allowEmpty = false): value is string {
  return typeof value === 'string' && value.length <= 10_000 && (allowEmpty || value.trim().length > 0);
}

function isoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const time = new Date(value);
  return Number.isFinite(time.getTime()) && time.toISOString() === value;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Stable JSON for this prototype. Rejects values that JSON would silently change. */
export function canonicalize(value: unknown): string {
  const ancestors = new Set<object>();
  function visit(input: unknown): string {
    if (input === null || typeof input === 'boolean' || typeof input === 'string') return JSON.stringify(input);
    if (typeof input === 'number' && Number.isFinite(input)) return JSON.stringify(input);
    if (typeof input !== 'object' || input === null || (!Array.isArray(input) && !isRecord(input))) {
      throw new TypeError('Agreement data must contain only plain JSON values.');
    }
    if (ancestors.has(input)) throw new TypeError('Agreement data cannot contain circular references.');
    ancestors.add(input);
    let output: string;
    if (Array.isArray(input)) {
      output = `[${Array.from(input, (item) => visit(item)).join(',')}]`;
    } else {
      output = `{${Object.keys(input).sort().map((key) => `${JSON.stringify(key)}:${visit((input as Record<string, unknown>)[key])}`).join(',')}}`;
    }
    ancestors.delete(input);
    return output;
  }
  return visit(value);
}

export async function hashCanonical(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalize(value)));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const hashSnapshot = hashCanonical;

function cloneJson<T>(value: T): T {
  return JSON.parse(canonicalize(value)) as T;
}

function snapshotShape(value: unknown): value is AgreementSnapshot {
  if (!isRecord(value) || !exactKeys(value, ['version', 'id', 'createdAt', 'invoice', 'quote', 'feeBearer', 'costs', 'terms', 'parties', 'disclosure'])) return false;
  if (value.version !== 1 || !textValue(value.id) || !isoTimestamp(value.createdAt) || !textValue(value.disclosure)) return false;
  if (value.feeBearer !== 'buyer' && value.feeBearer !== 'supplier') return false;
  if (!isRecord(value.parties) || !exactKeys(value.parties, ['buyer', 'supplier']) || !textValue(value.parties.buyer) || !textValue(value.parties.supplier)) return false;
  if (!isRecord(value.terms) || !exactKeys(value.terms, ['deliveryWindow', 'note']) || !textValue(value.terms.deliveryWindow) || !textValue(value.terms.note, true)) return false;

  const invoice = value.invoice;
  if (!isRecord(invoice) || !exactKeys(invoice, ['id', 'goods', 'quantity', 'unitPriceEur', 'amountEur', 'revenueCad', 'otherCostsCad', 'dueDate'])) return false;
  if (!['id', 'goods', 'dueDate'].every((field) => textValue(invoice[field])) || !['quantity', 'unitPriceEur', 'amountEur', 'revenueCad', 'otherCostsCad'].every((field) => finiteNumber(invoice[field]))) return false;

  const quote = value.quote;
  if (!isRecord(quote) || !exactKeys(quote, ['id', 'name', 'description', 'rateCadPerEur', 'referenceRate', 'transferFeeCad', 'downstreamFeeEur', 'delivery', 'source', 'asOf'])) return false;
  if (!['id', 'name', 'description', 'delivery', 'source', 'asOf'].every((field) => textValue(quote[field])) || !['rateCadPerEur', 'referenceRate', 'transferFeeCad'].every((field) => finiteNumber(quote[field]))) return false;
  if (!isRecord(quote.downstreamFeeEur) || !exactKeys(quote.downstreamFeeEur, ['min', 'max']) || !finiteNumber(quote.downstreamFeeEur.min) || !finiteNumber(quote.downstreamFeeEur.max)) return false;

  const costs = value.costs;
  if (!isRecord(costs) || !exactKeys(costs, costFields) || !costFields.every((field) => finiteNumber(costs[field]))) return false;
  try {
    const calculated = calculateCosts(invoice as Invoice, quote as Quote, value.feeBearer);
    return costFields.every((field) => Math.abs(calculated[field] - (costs[field] as number)) < 0.000001);
  } catch {
    return false;
  }
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function publicKeyShape(value: unknown): value is JsonWebKey {
  if (!isRecord(value) || !exactKeys(value, ['key_ops', 'ext', 'kty', 'x', 'y', 'crv'])) return false;
  return value.kty === 'EC' && value.crv === 'P-256' && value.ext === true
    && Array.isArray(value.key_ops) && value.key_ops.length === 1 && value.key_ops[0] === 'verify'
    && typeof value.x === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value.x)
    && typeof value.y === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value.y);
}

function signatureShape(value: unknown, snapshot: AgreementSnapshot): value is AgreementSignature {
  if (!isRecord(value) || !exactKeys(value, ['partyId', 'displayName', 'publicKeyJwk', 'signedAt', 'signatureB64'])) return false;
  if (value.partyId !== 'buyer' && value.partyId !== 'supplier') return false;
  if (value.displayName !== snapshot.parties[value.partyId] || !isoTimestamp(value.signedAt) || !publicKeyShape(value.publicKeyJwk)) return false;
  if (typeof value.signatureB64 !== 'string' || !/^[A-Za-z0-9+/]{86}==$/.test(value.signatureB64)) return false;
  try {
    const bytes = fromBase64(value.signatureB64);
    return bytes.length === 64 && toBase64(bytes) === value.signatureB64;
  } catch {
    return false;
  }
}

function signaturePayload(hash: string, signature: Omit<AgreementSignature, 'signatureB64'>): Uint8Array<ArrayBuffer> {
  return encoder.encode(canonicalize({
    purpose: 'SANAD demo agreement consent v1',
    hash,
    partyId: signature.partyId,
    displayName: signature.displayName,
    signedAt: signature.signedAt,
    publicKeyJwk: signature.publicKeyJwk,
  }));
}

function readInput(input: unknown): unknown {
  return typeof input === 'string' ? JSON.parse(input) as unknown : input;
}

function failed(message: string, hashMatches = false): VerificationResult {
  return { valid: false, hashMatches, signaturesValid: false, complete: false, message };
}

export async function createSigner(partyId: PartyId): Promise<Signer> {
  if (partyId !== 'buyer' && partyId !== 'supplier') throw new TypeError('Choose the buyer or supplier demo signer.');
  // Only the public key is exported. The private key remains non-extractable in memory.
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  return { partyId, displayName: partyNames[partyId], publicKeyJwk, privateKey: pair.privateKey };
}

export async function createAgreement(snapshot: AgreementSnapshot): Promise<Agreement> {
  if (!snapshotShape(snapshot)) throw new TypeError('The agreement has invalid details or costs. Review the invoice and route.');
  const copy = cloneJson(snapshot);
  return { snapshot: copy, hash: await hashCanonical(copy), signatures: [] };
}

export async function verifyAgreement(input: unknown): Promise<VerificationResult> {
  try {
    const value = cloneJson(readInput(input));
    if (!isRecord(value) || !exactKeys(value, ['snapshot', 'hash', 'signatures']) || !snapshotShape(value.snapshot)) {
      return failed('This file has invalid agreement details or cost calculations.');
    }
    if (typeof value.hash !== 'string' || !/^[a-f0-9]{64}$/.test(value.hash)) return failed('The agreement fingerprint is invalid.');
    const hashMatches = await hashCanonical(value.snapshot) === value.hash;
    if (!hashMatches) return failed('The agreement content changed. Its fingerprint no longer matches.');
    if (!Array.isArray(value.signatures) || value.signatures.length > 2) return failed('The agreement has an invalid signature list.', true);

    const seen = new Set<PartyId>();
    for (const signature of value.signatures) {
      if (!signatureShape(signature, value.snapshot)) return failed('A signature has invalid identity, timestamp, or key details.', true);
      if (seen.has(signature.partyId)) return failed('The agreement contains a duplicate party signature.', true);
      seen.add(signature.partyId);
      try {
        const key = await crypto.subtle.importKey('jwk', signature.publicKeyJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
        const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, fromBase64(signature.signatureB64), signaturePayload(value.hash, signature));
        if (!valid) return failed('A signature does not match this agreement or its signing details.', true);
      } catch {
        return failed('A signature cannot be verified with its included public key.', true);
      }
    }
    const complete = seen.has('buyer') && seen.has('supplier');
    return {
      valid: true, hashMatches: true, signaturesValid: true, complete,
      message: complete
        ? 'Both demo signatures and the agreement fingerprint are valid. Identity is not authenticated.'
        : `Agreement fingerprint and ${seen.size} demo signature${seen.size === 1 ? '' : 's'} verified. Both parties must sign to complete.`,
    };
  } catch {
    return failed('This file could not be read as a valid agreement.');
  }
}

export async function signAgreement(agreement: Agreement, signer: Signer): Promise<Agreement> {
  // Work on a detached snapshot so asynchronous signing cannot race caller edits.
  const copy = cloneJson(agreement);
  const verification = await verifyAgreement(copy);
  if (!verification.valid) throw new Error(verification.message);
  if (signer.partyId !== 'buyer' && signer.partyId !== 'supplier') throw new TypeError('The signer must be a buyer or supplier.');
  if (signer.displayName !== copy.snapshot.parties[signer.partyId]) throw new Error('The signer name does not match the agreement party.');
  if (!publicKeyShape(signer.publicKeyJwk)) throw new Error('The signer has an invalid public key.');
  if (copy.signatures.some((signature) => signature.partyId === signer.partyId)) throw new Error('This party has already signed the agreement.');
  const metadata = {
    partyId: signer.partyId,
    displayName: signer.displayName,
    publicKeyJwk: cloneJson(signer.publicKeyJwk),
    signedAt: new Date().toISOString(),
  };
  const bytes = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signer.privateKey, signaturePayload(copy.hash, metadata));
  copy.signatures.push({ ...metadata, signatureB64: toBase64(new Uint8Array(bytes)) });
  const result = await verifyAgreement(copy);
  if (!result.valid) throw new Error('The signer key does not match the signature public key.');
  return copy;
}

/** Combine independently signed copies of the same sealed agreement. */
export async function mergeAgreements(current: Agreement, incoming: Agreement): Promise<Agreement> {
  const merged = cloneJson(current);
  const other = cloneJson(incoming);
  const results = await Promise.all([verifyAgreement(merged), verifyAgreement(other)]);
  for (const result of results) {
    if (!result.valid) throw new Error(result.message);
  }
  if (merged.snapshot.id !== other.snapshot.id || merged.hash !== other.hash
    || canonicalize(merged.snapshot) !== canonicalize(other.snapshot)) {
    throw new Error('Only signatures for the same sealed agreement can be combined.');
  }
  for (const signature of other.signatures) {
    const existing = merged.signatures.find((entry) => entry.partyId === signature.partyId);
    if (!existing) merged.signatures.push(signature);
    else if (canonicalize(existing) !== canonicalize(signature)) {
      throw new Error(`Conflicting ${signature.partyId} signatures cannot be combined.`);
    }
  }
  // A stable party order makes both peers converge on the same exported document.
  merged.signatures.sort((left, right) => left.partyId.localeCompare(right.partyId));
  const result = await verifyAgreement(merged);
  if (!result.valid) throw new Error(result.message);
  return merged;
}

/** The caller should verify before showing a download as a completed agreement. */
export function exportAgreement(agreement: Agreement): string {
  if (!snapshotShape(agreement.snapshot) || !/^[a-f0-9]{64}$/.test(agreement.hash)
    || !Array.isArray(agreement.signatures) || agreement.signatures.length > 2
    || !agreement.signatures.every((signature) => signatureShape(signature, agreement.snapshot))
    || new Set(agreement.signatures.map((signature) => signature.partyId)).size !== agreement.signatures.length) {
    throw new TypeError('Only a well-formed agreement with public signing keys can be exported.');
  }
  // An explicit allowlist prevents accidental export of local signer/private-key state.
  return JSON.stringify({
    snapshot: cloneJson(agreement.snapshot),
    hash: agreement.hash,
    signatures: agreement.signatures.map(({ partyId, displayName, publicKeyJwk, signedAt, signatureB64 }) => ({
      partyId, displayName, publicKeyJwk: cloneJson(publicKeyJwk), signedAt, signatureB64,
    })),
  }, null, 2);
}

export async function parseAgreement(input: unknown): Promise<Agreement> {
  const value = cloneJson(readInput(input));
  const result = await verifyAgreement(value);
  if (!result.valid) throw new Error(result.message);
  return cloneJson(value as Agreement);
}
