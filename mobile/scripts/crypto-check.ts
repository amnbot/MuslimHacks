/**
 * Cross-runtime proof for the Hermes crypto shim.
 *
 * Runs the shared agreement module twice: once on Node's real WebCrypto and once
 * on the noble-based shim the phone uses. Records signed by either side must
 * verify on the other, tampering must fail on both, and the shim's JWK output must
 * satisfy the strict key shape the verifier enforces.
 *
 * Run from mobile/: ../node_modules/.bin/tsx scripts/crypto-check.ts
 */
import { webcrypto } from 'node:crypto';
import assert from 'node:assert/strict';
import { createSubtle } from '../src/crypto/subtle-shim';
import { calculateCosts, DEMO_INVOICE, DEMO_QUOTES } from '../../src/lib/costs';
import { createAgreement, createSigner, exportAgreement, signAgreement, verifyAgreement, mergeAgreements, type AgreementSnapshot } from '../../src/lib/agreement';

const nodeCrypto = webcrypto as unknown as Crypto;
const shim = { subtle: createSubtle(), getRandomValues: nodeCrypto.getRandomValues.bind(nodeCrypto), randomUUID: nodeCrypto.randomUUID.bind(nodeCrypto) };

function useRuntime(runtime: 'node' | 'shim') {
  Object.defineProperty(globalThis, 'crypto', { value: runtime === 'node' ? nodeCrypto : shim, configurable: true, writable: true });
}

function snapshot(id: string): AgreementSnapshot {
  const invoice = { ...DEMO_INVOICE };
  const quote = { ...DEMO_QUOTES[1], downstreamFeeEur: { ...DEMO_QUOTES[1].downstreamFeeEur } };
  return {
    version: 1, id, createdAt: '2026-09-05T20:00:00.000Z', invoice, quote, feeBearer: 'buyer',
    costs: calculateCosts(invoice, quote, 'buyer'),
    terms: { deliveryWindow: '21–25 September 2026', note: 'Cross-runtime check.' },
    parties: { buyer: 'Bilal Mansouri', supplier: 'Amira Ben Youssef' },
    disclosure: 'Synthetic demo only.',
  };
}

async function fullySigned(id: string): Promise<string> {
  let agreement = await createAgreement(snapshot(id));
  agreement = await signAgreement(agreement, await createSigner('buyer'));
  agreement = await signAgreement(agreement, await createSigner('supplier'));
  return exportAgreement(agreement);
}

async function expectValid(json: string, where: string) {
  const result = await verifyAgreement(json);
  assert.equal(result.valid, true, `${where}: ${result.message}`);
  assert.equal(result.complete, true, `${where}: expected both signatures`);
}

async function expectTamperDetected(json: string, where: string) {
  const tampered = JSON.parse(json) as { snapshot: { invoice: { amountEur: number } } };
  tampered.snapshot.invoice.amountEur += 1;
  const result = await verifyAgreement(tampered);
  assert.equal(result.valid, false, `${where}: tampering must fail`);
  const flipped = JSON.parse(json) as { signatures: { signatureB64: string }[] };
  const original = flipped.signatures[0].signatureB64;
  flipped.signatures[0].signatureB64 = `${original[0] === 'A' ? 'B' : 'A'}${original.slice(1)}`;
  assert.equal((await verifyAgreement(flipped)).signaturesValid, false, `${where}: altered signature must fail`);
}

async function main() {
  // WebCrypto randomly emits high-S ECDSA signatures, so repeat to cover both forms.
  const rounds = 12;
  const nodeSigned: string[] = [];
  const shimSigned: string[] = [];

  useRuntime('node');
  for (let round = 0; round < rounds; round++) nodeSigned.push(await fullySigned(`NODE-${round}`));

  useRuntime('shim');
  for (let round = 0; round < rounds; round++) shimSigned.push(await fullySigned(`SHIM-${round}`));
  for (const [index, json] of nodeSigned.entries()) {
    await expectValid(json, `shim verifying node record ${index}`);
    await expectTamperDetected(json, `shim on node record ${index}`);
  }
  for (const [index, json] of shimSigned.entries()) await expectValid(json, `shim verifying its own record ${index}`);

  // The shim must refuse to export or leak private material.
  const signer = await createSigner('buyer');
  assert.equal((signer.privateKey as CryptoKey).extractable, false);
  await assert.rejects(crypto.subtle.exportKey('jwk', signer.privateKey));
  assert.equal(JSON.stringify(signer).includes('"d"'), false, 'serialized signer must not contain a private scalar');

  // Concurrent signatures on the shim merge like they do in the browser.
  const unsigned = await createAgreement(snapshot('MERGE'));
  const buyerOnly = await signAgreement(unsigned, await createSigner('buyer'));
  const supplierOnly = await signAgreement(unsigned, await createSigner('supplier'));
  assert.equal((await verifyAgreement(await mergeAgreements(buyerOnly, supplierOnly))).complete, true);

  useRuntime('node');
  for (const [index, json] of shimSigned.entries()) {
    await expectValid(json, `node verifying shim record ${index}`);
    await expectTamperDetected(json, `node on shim record ${index}`);
  }

  console.log(`crypto-check: ${rounds} node-signed and ${rounds} shim-signed records verified in both runtimes; tampering detected in both.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
