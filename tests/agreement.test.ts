import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalize, hashCanonical, createAgreement, createSigner, signAgreement,
  verifyAgreement, parseAgreement, exportAgreement, mergeAgreements,
  type Agreement, type AgreementSnapshot, type PartyId,
} from '../src/lib/agreement';
import { calculateCosts, DEMO_INVOICE, DEMO_QUOTES } from '../src/lib/costs';

function snapshot(): AgreementSnapshot {
  const invoice = structuredClone(DEMO_INVOICE);
  const quote = structuredClone(DEMO_QUOTES[1]);
  return {
    version: 1,
    id: 'SANAD-2026-TEST',
    createdAt: '2026-09-05T20:00:00.000Z',
    invoice,
    quote,
    feeBearer: 'buyer',
    costs: calculateCosts(invoice, quote, 'buyer'),
    terms: { deliveryWindow: 'Ship within 5 business days of payment receipt.', note: 'Food-grade packaging required.' },
    parties: { buyer: 'Bilal Mansouri', supplier: 'Amira Ben Youssef' },
    disclosure: 'Synthetic demo only. Local signing keys do not authenticate either person.',
  };
}

async function signedAgreement(): Promise<Agreement> {
  let agreement = await createAgreement(snapshot());
  agreement = await signAgreement(agreement, await createSigner('buyer'));
  return signAgreement(agreement, await createSigner('supplier'));
}

test('canonical JSON ignores object insertion order while preserving array order', async () => {
  assert.equal(canonicalize({ z: 1, a: { c: 3, b: 2 } }), '{"a":{"b":2,"c":3},"z":1}');
  assert.equal(await hashCanonical({ z: 1, a: 2 }), await hashCanonical({ a: 2, z: 1 }));
  assert.notEqual(await hashCanonical([1, 2]), await hashCanonical([2, 1]));
  assert.throws(() => canonicalize({ value: undefined }), /plain JSON/);
  assert.throws(() => canonicalize({ value: NaN }), /plain JSON/);
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.throws(() => canonicalize(circular), /circular/);
});

test('two real signatures verify after export and import without private keys', async () => {
  const agreement = await signedAgreement();
  const result = await verifyAgreement(agreement);
  assert.equal(result.valid, true);
  assert.equal(result.complete, true);
  assert.equal(result.hashMatches, true);
  assert.equal(result.signaturesValid, true);
  const json = exportAgreement(agreement);
  assert.equal(json.includes('privateKey'), false);
  assert.equal(json.includes('"d"'), false);
  assert.equal(json.includes('"sign"'), false);
  assert.deepEqual(await parseAgreement(json), agreement);
  assert.equal((await verifyAgreement(JSON.parse(json))).complete, true);
});

test('private demo keys cannot be exported', async () => {
  const signer = await createSigner('buyer');
  assert.equal(signer.privateKey.extractable, false);
  await assert.rejects(crypto.subtle.exportKey('jwk', signer.privateKey));
});

test('unsigned and single-party agreements remain explicitly incomplete', async () => {
  const unsigned = await createAgreement(snapshot());
  const unsignedResult = await verifyAgreement(unsigned);
  assert.equal(unsignedResult.valid, true);
  assert.equal(unsignedResult.complete, false);
  const partial = await signAgreement(unsigned, await createSigner('supplier'));
  const partialResult = await verifyAgreement(partial);
  assert.equal(partialResult.valid, true);
  assert.equal(partialResult.complete, false);
  assert.equal(unsigned.signatures.length, 0, 'signing must not mutate the input agreement');
  assert.equal((await parseAgreement(exportAgreement(partial))).signatures.length, 1);
});

test('creating an agreement detaches invoice and terms from the caller', async () => {
  const original = snapshot();
  const agreement = await createAgreement(original);
  original.terms.note = 'Changed after sealing';
  original.invoice.goods = 'Different goods';
  assert.notEqual(agreement.snapshot.terms.note, original.terms.note);
  assert.notEqual(agreement.snapshot.invoice.goods, original.invoice.goods);
  assert.equal((await verifyAgreement(agreement)).valid, true);
});

test('editing a term invalidates content, and recomputing its hash cannot rescue signatures', async () => {
  const agreement = await signedAgreement();
  agreement.snapshot.terms.note = 'Supplier pays every fee now.';
  let result = await verifyAgreement(agreement);
  assert.equal(result.valid, false);
  assert.equal(result.hashMatches, false);
  assert.equal(result.complete, false);
  agreement.hash = await hashCanonical(agreement.snapshot);
  result = await verifyAgreement(agreement);
  assert.equal(result.hashMatches, true);
  assert.equal(result.signaturesValid, false);
  assert.equal(result.valid, false);
});

test('the timestamp is cryptographically bound to each signature', async () => {
  const agreement = await signedAgreement();
  agreement.signatures[0].signedAt = new Date(Date.parse(agreement.signatures[0].signedAt) + 1_000).toISOString();
  const result = await verifyAgreement(agreement);
  assert.equal(result.hashMatches, true);
  assert.equal(result.signaturesValid, false);
  assert.equal(result.valid, false);
});

test('altered signature bytes are detected', async () => {
  const agreement = await signedAgreement();
  const original = agreement.signatures[0].signatureB64;
  agreement.signatures[0].signatureB64 = `${original[0] === 'A' ? 'B' : 'A'}${original.slice(1)}`;
  assert.equal((await verifyAgreement(agreement)).signaturesValid, false);
});

test('an altered fingerprint is detected', async () => {
  const agreement = await signedAgreement();
  agreement.hash = '0'.repeat(64);
  assert.equal((await verifyAgreement(agreement)).hashMatches, false);
});

test('duplicate signatures and unknown roles cannot make an agreement complete', async () => {
  const agreement = await signedAgreement();
  agreement.signatures[1] = structuredClone(agreement.signatures[0]);
  assert.equal((await verifyAgreement(agreement)).valid, false);
  agreement.signatures[1].partyId = 'witness' as PartyId;
  assert.equal((await verifyAgreement(agreement)).complete, false);
  assert.equal((await verifyAgreement(agreement)).valid, false);
});

test('a changed display name is rejected, including at signing time', async () => {
  const agreement = await signedAgreement();
  agreement.signatures[0].displayName = 'Someone else';
  assert.equal((await verifyAgreement(agreement)).valid, false);
  const signer = await createSigner('buyer');
  signer.displayName = 'Someone else';
  await assert.rejects(signAgreement(await createAgreement(snapshot()), signer), /name does not match/);
});

test('signing rejects duplicate roles, invalid roles, edited content, and invalid prior signatures', async () => {
  const buyer = await createSigner('buyer');
  const supplier = await createSigner('supplier');
  const partial = await signAgreement(await createAgreement(snapshot()), buyer);
  await assert.rejects(signAgreement(partial, buyer), /already signed/);
  await assert.rejects(createSigner('witness' as PartyId), /buyer or supplier/);
  const edited = structuredClone(partial);
  edited.snapshot.terms.note = 'Changed';
  await assert.rejects(signAgreement(edited, supplier), /content changed/);
  partial.signatures[0].signatureB64 = 'broken';
  await assert.rejects(signAgreement(partial, supplier), /invalid/);
});

test('replacing a public key or mixing a signer public/private pair is detected', async () => {
  const agreement = await signedAgreement();
  const anotherBuyer = await createSigner('buyer');
  agreement.signatures[0].publicKeyJwk = anotherBuyer.publicKeyJwk;
  assert.equal((await verifyAgreement(agreement)).valid, false);
  const mismatched = await createSigner('buyer');
  mismatched.publicKeyJwk = anotherBuyer.publicKeyJwk;
  await assert.rejects(signAgreement(await createAgreement(snapshot()), mismatched), /key does not match/);
});

test('forged derived costs are rejected even if the file has been rehashed', async () => {
  const agreement = await signedAgreement();
  agreement.snapshot.costs.totalMaxCad = 1;
  agreement.hash = await hashCanonical(agreement.snapshot);
  assert.equal((await verifyAgreement(agreement)).valid, false);
  await assert.rejects(createAgreement(agreement.snapshot), /invalid details or costs/);
});

test('malformed and unexpected imported structures fail closed without throwing', async () => {
  const invalidInputs: unknown[] = [
    null, false, 5, [], {}, 'not json', '{', 'null',
    { snapshot: snapshot(), hash: 1, signatures: [] },
    { snapshot: snapshot(), hash: '0'.repeat(64), signatures: null },
    { snapshot: snapshot(), hash: '0'.repeat(64), signatures: [], valid: true },
  ];
  for (const input of invalidInputs) {
    const result = await verifyAgreement(input);
    assert.equal(result.valid, false);
    assert.equal(result.complete, false);
  }
  const agreement = await signedAgreement();
  (agreement.signatures[0].publicKeyJwk as Record<string, unknown>).d = 'never-allowed';
  assert.equal((await verifyAgreement(agreement)).valid, false);
  assert.throws(() => exportAgreement(agreement), /public signing keys/);
  await assert.rejects(parseAgreement(agreement));
});

test('concurrent buyer and supplier signatures merge into the same detached complete document', async () => {
  const unsigned = await createAgreement(snapshot());
  const buyerOnly = await signAgreement(unsigned, await createSigner('buyer'));
  const supplierOnly = await signAgreement(unsigned, await createSigner('supplier'));
  const combined = await mergeAgreements(buyerOnly, supplierOnly);
  assert.equal(combined.signatures.length, 2);
  assert.equal((await verifyAgreement(combined)).complete, true);
  assert.deepEqual(await mergeAgreements(supplierOnly, buyerOnly), combined);
  assert.deepEqual(await mergeAgreements(combined, buyerOnly), combined, 'identical duplicate signatures are idempotent');
  assert.equal(buyerOnly.signatures.length, 1);
  assert.equal(supplierOnly.signatures.length, 1);
  buyerOnly.snapshot.terms.note = 'Modified later';
  supplierOnly.signatures[0].displayName = 'Modified later';
  assert.equal((await verifyAgreement(combined)).complete, true);
});

test('merging rejects different agreement IDs, content hashes, and tampered inputs', async () => {
  const current = await createAgreement(snapshot());
  const differentId = snapshot();
  differentId.id = 'ANOTHER-AGREEMENT';
  await assert.rejects(mergeAgreements(current, await createAgreement(differentId)), /same sealed agreement/);
  const differentTerms = snapshot();
  differentTerms.terms.note = 'A different contract with the same ID';
  await assert.rejects(mergeAgreements(current, await createAgreement(differentTerms)), /same sealed agreement/);
  const tampered = structuredClone(current);
  tampered.snapshot.terms.note = 'Changed without resealing';
  await assert.rejects(mergeAgreements(current, tampered), /content changed/);
  await assert.rejects(mergeAgreements(tampered, current), /content changed/);
});

test('merging rejects conflicting valid signatures for the same party', async () => {
  const unsigned = await createAgreement(snapshot());
  const first = await signAgreement(unsigned, await createSigner('buyer'));
  const competing = await signAgreement(unsigned, await createSigner('buyer'));
  assert.equal((await verifyAgreement(first)).valid, true);
  assert.equal((await verifyAgreement(competing)).valid, true);
  await assert.rejects(mergeAgreements(first, competing), /Conflicting buyer signatures/);
  assert.equal(first.signatures.length, 1);
});
