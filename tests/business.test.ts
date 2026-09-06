import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { canonicalize, hashCanonical } from '../src/lib/agreement';
import {
  SOLANA_USDC_MINT, MAX_INVOICE_RECORD_BYTES, buildSolanaPayUri, createBusinessSigner,
  createInvoice, createInvoiceRecord, exportInvoiceRecord, formatUsdc, invoiceStatus,
  isSolanaAddress, isValidSolanaAddress, lineTotalMicros, mergeInvoiceRecords, parseInvoiceRecord, parseUsdc,
  pinInvoiceRecord, signInvoiceRecord, totalUsdc, validateInvoice, verifyInvoiceRecord,
  type BusinessInvoice, type InvoiceRecord,
} from '../src/lib/business';

const wallet = '7YttLkHDoNj9wyDur5TQKkLBwZWfw46RaD52r13fMwpW';
function invoice(): BusinessInvoice {
  return createInvoice({
    id: 'INV-2026-0042', createdAt: '2026-09-06T12:00:00.000Z',
    issuer: 'Atlas Studio', customer: 'Northstar Retail', reference: 'PO-42', dueDate: '2026-09-30',
    note: 'Brand production and materials.', recipientWallet: wallet,
    lines: [
      { description: 'Packaging materials', quantity: 120, unitPriceMicros: parseUsdc('2.40') },
      { description: 'Design services · hours', quantity: 2.5, unitPriceMicros: parseUsdc('85.00') },
    ],
  });
}
async function issuerSigned(): Promise<InvoiceRecord> {
  return signInvoiceRecord(await createInvoiceRecord(invoice()), await createBusinessSigner('Atlas Studio'), 'issuer');
}
async function acknowledged(): Promise<InvoiceRecord> {
  return signInvoiceRecord(await issuerSigned(), await createBusinessSigner('Northstar Retail'), 'customer');
}

test('multiline goods and services invoices calculate exact USDC micros', () => {
  const value = invoice();
  assert.equal(value.totalMicros, 500_500_000);
  assert.equal(formatUsdc(value.totalMicros), '500.50');
  assert.equal(totalUsdc(value.lines), value.totalMicros);
  assert.equal(lineTotalMicros(value.lines[1]), 212_500_000);
  assert.equal(value.payment.network, 'solana-mainnet-beta');
  assert.equal(value.payment.mint, SOLANA_USDC_MINT);
  const detached = validateInvoice(value);
  value.lines[0].description = 'Changed later';
  assert.equal(detached.lines[0].description, 'Packaging materials');
});

test('currency parsing never silently rounds precision, scientific notation, or unsafe integers', () => {
  for (const [input, expected] of [['0.000001', 1], ['0.10', 100_000], ['12.345678', 12_345_678], ['9007199254.740991', Number.MAX_SAFE_INTEGER]] as const) {
    assert.equal(parseUsdc(input), expected);
    assert.equal(parseUsdc(formatUsdc(expected)), expected);
  }
  assert.equal(formatUsdc(0), '0.00');
  assert.equal(formatUsdc(9_007_199_253_999_999), '9007199253.999999');
  for (const invalid of ['0', '0.0000001', '1e3', '-1', 'NaN', 'Infinity', '01.00', '.5', '1.', ' 2', '9007199254.740992']) {
    assert.throws(() => parseUsdc(invalid), undefined, invalid);
  }
  for (const invalid of [NaN, Infinity, -1, 0.1, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => formatUsdc(invalid));
});

test('fractional quantities must reconcile exactly to USDC precision and cannot overflow', () => {
  const line = { description: 'Compute time', quantity: 0.125, unitPriceMicros: parseUsdc('0.008') };
  assert.equal(lineTotalMicros(line), 1000);
  assert.throws(() => lineTotalMicros({ ...line, unitPriceMicros: 1 }), /fractions smaller/);
  for (const quantity of [0, -2, Infinity, NaN, 0.0001, 0.1 + 0.2, 1_000_001]) {
    assert.throws(() => lineTotalMicros({ ...line, quantity }));
  }
  assert.throws(() => lineTotalMicros({ ...line, quantity: 2, unitPriceMicros: Number.MAX_SAFE_INTEGER }), /outside/);
  assert.throws(() => totalUsdc([
    { ...line, quantity: 1, unitPriceMicros: Number.MAX_SAFE_INTEGER },
    { ...line, quantity: 1, unitPriceMicros: 1 },
  ]), /outside/);
  assert.throws(() => totalUsdc([]));
});

test('Solana wallet addresses validate decoded byte length, not just alphabet', () => {
  assert.equal(isSolanaAddress(wallet), true);
  assert.equal(isValidSolanaAddress(wallet), true);
  assert.equal(isSolanaAddress(SOLANA_USDC_MINT), true);
  assert.equal(isValidSolanaAddress(SOLANA_USDC_MINT), false);
  for (const value of ['', '0x11112222', 'O'.repeat(44), 'z'.repeat(44), '1'.repeat(32), '2'.repeat(31), '2'.repeat(45), `${wallet} `]) {
    assert.equal(isSolanaAddress(value), false, value);
  }
});

test('Solana Pay URI requests native USDC and the exact invoice amount without claiming execution', () => {
  const value = invoice();
  const uri = new URL(buildSolanaPayUri(value));
  assert.equal(uri.protocol, 'solana:');
  assert.equal(uri.pathname, wallet);
  assert.equal(uri.searchParams.get('amount'), '500.50');
  assert.equal(uri.searchParams.get('spl-token'), SOLANA_USDC_MINT);
  assert.equal(uri.searchParams.get('label'), 'Atlas Studio');
  assert.match(uri.searchParams.get('message')!, /Solana mainnet/);
  assert.equal(uri.searchParams.has('memo'), false); // No business note is posted onchain.
  assert.throws(() => buildSolanaPayUri({ ...value, totalMicros: 1 }), /total/);
});

test('invoice validation rejects unsupported tokens, wrong totals, extra fields and invalid dates', () => {
  const value = invoice();
  for (const changed of [
    { ...value, totalMicros: 500_499_999 },
    { ...value, dueDate: '2026-02-30' },
    { ...value, dueDate: '09/30/2026' },
    { ...value, issuer: ' ' },
    { ...value, customer: value.issuer },
    { ...value, paid: true },
    { ...value, payment: { ...value.payment, network: 'solana-devnet' } },
    { ...value, payment: { ...value.payment, mint: 'So11111111111111111111111111111111111111112' } },
    { ...value, payment: { ...value.payment, currency: 'EUR' } },
    { ...value, payment: { ...value.payment, recipientWallet: 'invalid' } },
    { ...value, payment: { ...value.payment, recipientWallet: SOLANA_USDC_MINT } },
  ]) assert.throws(() => validateInvoice(changed));
});

test('two independent businesses exchange, verify, acknowledge and merge a portable signed invoice', async () => {
  const draft = await createInvoiceRecord(invoice());
  assert.equal(invoiceStatus(draft), 'awaiting-signature');
  assert.equal((await verifyInvoiceRecord(draft)).complete, false);
  const issued = await signInvoiceRecord(draft, await createBusinessSigner('Atlas Studio'), 'issuer');
  assert.equal(invoiceStatus(issued), 'awaiting-acknowledgement');
  const imported = await parseInvoiceRecord(exportInvoiceRecord(issued));
  const signedBack = await signInvoiceRecord(imported, await createBusinessSigner('Northstar Retail'), 'customer');
  const merged = await mergeInvoiceRecords(issued, await parseInvoiceRecord(exportInvoiceRecord(signedBack)));
  assert.equal(invoiceStatus(merged), 'acknowledged');
  assert.deepEqual(await verifyInvoiceRecord(merged), {
    valid: true, hashMatches: true, signaturesValid: true, complete: true,
    message: 'Issuer signature and customer acknowledgement verified. Business identities are self-declared; payment is not confirmed.',
  });
  assert.equal(merged.signatures[1].issuerSignatureHash, await hashCanonical(merged.signatures[0]));
  assert.equal(canonicalize(await mergeInvoiceRecords(merged, issued)), canonicalize(merged));
  assert.equal(canonicalize(await pinInvoiceRecord(undefined, merged)), canonicalize(merged));
  assert.equal(canonicalize(await pinInvoiceRecord(merged, issued)), canonicalize(merged));
});

test('only the named business signs its role and the customer needs a separate key', async () => {
  const draft = await createInvoiceRecord(invoice());
  const issuer = await createBusinessSigner('Atlas Studio');
  const customer = await createBusinessSigner('Northstar Retail');
  await assert.rejects(signInvoiceRecord(draft, customer, 'issuer'), /named issuer/);
  await assert.rejects(signInvoiceRecord(draft, customer, 'customer'), /issuer-signed/);
  const issued = await signInvoiceRecord(draft, issuer, 'issuer');
  await assert.rejects(signInvoiceRecord(issued, issuer, 'issuer'), /already signed/);
  await assert.rejects(signInvoiceRecord(issued, { ...issuer, businessName: 'Northstar Retail' }, 'customer'), /independent/);
  const alternateKey = structuredClone(issuer.publicKeyJwk);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  alternateKey.x = alternateKey.x!.slice(0, -1) + alphabet[alphabet.indexOf(alternateKey.x!.at(-1)!) + 1];
  await assert.rejects(signInvoiceRecord(issued, { ...issuer, businessName: 'Northstar Retail', publicKeyJwk: alternateKey }, 'customer'), /public key is invalid/);
  await assert.rejects(signInvoiceRecord(draft, { ...issuer, publicKeyJwk: customer.publicKeyJwk }, 'issuer'), /signature/);
  await assert.rejects(createBusinessSigner(' '));
});

test('all invoice fields and signing details are cryptographically bound', async () => {
  const signed = await acknowledged();
  const modifications = [
    (value: InvoiceRecord) => { value.invoice.note = 'Different conditions'; },
    (value: InvoiceRecord) => { value.invoice.id = 'DIFFERENT-INVOICE'; },
    (value: InvoiceRecord) => { value.invoice.reference = 'PO-43'; },
    (value: InvoiceRecord) => { value.invoice.dueDate = '2026-10-01'; },
    (value: InvoiceRecord) => { value.invoice.payment.recipientWallet = SOLANA_USDC_MINT; },
    (value: InvoiceRecord) => { value.invoice.lines[0].unitPriceMicros++; value.invoice.totalMicros = totalUsdc(value.invoice.lines); },
  ];
  for (const change of modifications) {
    const tampered = structuredClone(signed);
    change(tampered);
    assert.equal((await verifyInvoiceRecord(tampered)).valid, false);
    tampered.hash = await hashCanonical(tampered.invoice);
    assert.equal((await verifyInvoiceRecord(tampered)).valid, false, 'Rehashing must not rescue an altered signed invoice');
  }
  const changedTime = structuredClone(signed);
  changedTime.signatures[1].signedAt = '2026-09-06T14:00:00.000Z';
  assert.equal((await verifyInvoiceRecord(changedTime)).valid, false);
  const wrongKey = structuredClone(signed);
  wrongKey.signatures[1].publicKeyJwk = (await createBusinessSigner('Northstar Retail')).publicKeyJwk;
  assert.equal((await verifyInvoiceRecord(wrongKey)).valid, false);
  const missingIssuer = structuredClone(signed);
  missingIssuer.signatures = missingIssuer.signatures.filter((signature) => signature.role === 'customer');
  assert.equal((await verifyInvoiceRecord(missingIssuer)).valid, false);
});

test('customer acknowledgement binds the original issuer key and exact signature', async () => {
  const signed = await acknowledged();
  const replacementIssuer = await issuerSigned();
  const substituted = structuredClone(signed);
  substituted.signatures[0] = replacementIssuer.signatures[0];
  assert.equal((await verifyInvoiceRecord(substituted)).valid, false);
  await assert.rejects(mergeInvoiceRecords(signed, replacementIssuer), /Conflicting issuer/);
});

test('saved invoice pins reject a valid newly signed version with changed content or another invoice ID', async () => {
  const current = await issuerSigned();
  for (const changed of [{ ...invoice(), note: 'Replaced terms' }, { ...invoice(), id: 'INV-ANOTHER' }]) {
    const incoming = await signInvoiceRecord(await createInvoiceRecord(changed), await createBusinessSigner('Atlas Studio'), 'issuer');
    assert.equal((await verifyInvoiceRecord(incoming)).valid, true);
    await assert.rejects(pinInvoiceRecord(current, incoming), /conflicts/);
  }
});

test('exchange is bounded and exports contain public data only', async () => {
  const signer = await createBusinessSigner('Atlas Studio');
  assert.equal(signer.privateKey.extractable, false);
  await assert.rejects(crypto.subtle.exportKey('jwk', signer.privateKey));
  const signed = await signInvoiceRecord(await createInvoiceRecord(invoice()), signer, 'issuer');
  const exported = exportInvoiceRecord(signed);
  assert.equal(exported.includes('privateKey'), false);
  assert.equal(exported.includes('"d"'), false);
  await assert.rejects(parseInvoiceRecord(await createInvoiceRecord(invoice())), /issuer-signed/);
  assert.throws(() => exportInvoiceRecord({ ...signed, privateKey: signer.privateKey } as InvoiceRecord), /invalid fields/);
  const secretField = structuredClone(signed);
  secretField.signatures[0].publicKeyJwk.d = 'not-allowed';
  await assert.rejects(parseInvoiceRecord(secretField), /invalid hash or signature/);
  const duplicated = structuredClone(signed);
  duplicated.signatures.push(duplicated.signatures[0]);
  assert.equal((await verifyInvoiceRecord(duplicated)).valid, false);
  await assert.rejects(parseInvoiceRecord(' '.repeat(MAX_INVOICE_RECORD_BYTES + 1)), /too large/);
  assert.equal((await verifyInvoiceRecord('{')).valid, false);
  const tooManyLines = invoice();
  tooManyLines.lines = Array.from({ length: 51 }, () => tooManyLines.lines[0]);
  assert.throws(() => validateInvoice(tooManyLines), /between 1 and 50/);
});

test('WebCrypto and the Expo P-256 shim verify each other’s invoice signatures', async (context) => {
  const shim = await import('../mobile/src/crypto/subtle-shim').catch((error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND' && error.message.includes('@noble/')) return null;
    throw error;
  });
  if (!shim) {
    context.skip('Install the mobile dependencies to run the Expo cross-runtime signature check.');
    return;
  }
  const { createSubtle } = shim;
  const original = globalThis.crypto;
  const nodeCrypto = webcrypto as unknown as Crypto;
  try {
    Object.defineProperty(globalThis, 'crypto', { value: nodeCrypto, configurable: true });
    const fromBrowser = await issuerSigned();
    Object.defineProperty(globalThis, 'crypto', {
      value: { subtle: createSubtle(), getRandomValues: nodeCrypto.getRandomValues.bind(nodeCrypto), randomUUID: nodeCrypto.randomUUID.bind(nodeCrypto) },
      configurable: true,
    });
    assert.equal((await verifyInvoiceRecord(fromBrowser)).valid, true);
    const fromPhone = await signInvoiceRecord(fromBrowser, await createBusinessSigner('Northstar Retail'), 'customer');
    assert.equal((await verifyInvoiceRecord(fromPhone)).complete, true);
    const shimSigner = await createBusinessSigner('Other business');
    await assert.rejects(crypto.subtle.exportKey('jwk', shimSigner.privateKey));
    Object.defineProperty(globalThis, 'crypto', { value: nodeCrypto, configurable: true });
    assert.equal((await verifyInvoiceRecord(fromPhone)).complete, true);
    const tampered = structuredClone(fromPhone);
    tampered.invoice.totalMicros++;
    assert.equal((await verifyInvoiceRecord(tampered)).valid, false);
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
  }
});
