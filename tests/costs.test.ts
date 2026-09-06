import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCosts, DEMO_INVOICE, DEMO_QUOTES, money, validateInvoice } from '../src/lib/costs.ts';
import type { Invoice, Quote } from '../src/lib/costs.ts';

const bank = DEMO_QUOTES[0]!;
const specialist = DEMO_QUOTES[1]!;

test('buyer covers downstream fees: honest range and exact FX decomposition', () => {
  const cost = calculateCosts(DEMO_INVOICE, bank, 'buyer');
  assert.deepEqual(cost, {
    principalCad: 9000,
    fxMarkupCad: 234,
    transferFeeCad: 35,
    feeReserveCad: 53.87,
    totalMinCad: 9292.09,
    totalMaxCad: 9322.87,
    recipientMinEur: 6000,
    recipientMaxEur: 6000,
    marginMinCad: 1027.13,
    marginMaxCad: 1057.91,
  });
  assert.equal(Math.round((cost.principalCad + cost.fxMarkupCad + cost.transferFeeCad + cost.feeReserveCad) * 100), Math.round(cost.totalMaxCad * 100));
});

test('supplier covers downstream fees: lower payer cost reveals receipt shortfall', () => {
  const cost = calculateCosts(DEMO_INVOICE, bank, 'supplier');
  assert.equal(cost.feeReserveCad, 0);
  assert.equal(cost.totalMinCad, 9269);
  assert.equal(cost.totalMaxCad, 9269);
  assert.equal(cost.recipientMinEur, 5965);
  assert.equal(cost.recipientMaxEur, 5985);
  assert.equal(cost.marginMinCad, 1081);
  assert.equal(cost.marginMaxCad, 1081);
});

test('specialist synthetic quote uses precise rate, then rounds each money boundary', () => {
  const cost = calculateCosts(DEMO_INVOICE, specialist, 'buyer');
  assert.equal(cost.fxMarkupCad, 49.5);
  assert.equal(cost.feeReserveCad, 22.62);
  assert.equal(cost.totalMinCad, 9065.04);
  assert.equal(cost.totalMaxCad, 9080.12);
  assert.equal(cost.marginMinCad, 1269.88);
  assert.equal(cost.marginMaxCad, 1284.96);
});

test('positive stress makes EUR more expensive and keeps fixed transfer fee unchanged', () => {
  const up = calculateCosts(DEMO_INVOICE, bank, 'buyer', 10);
  const base = calculateCosts(DEMO_INVOICE, bank, 'buyer');
  const down = calculateCosts(DEMO_INVOICE, bank, 'buyer', -10);
  assert.equal(up.principalCad, 9900);
  assert.equal(up.fxMarkupCad, 257.4);
  assert.equal(up.totalMaxCad, 10251.65);
  assert.equal(up.transferFeeCad, base.transferFeeCad);
  assert.equal(down.principalCad, 8100);
  assert.ok(up.marginMinCad < base.marginMinCad);
  assert.ok(down.marginMinCad > base.marginMinCad);
  assert.equal(up.recipientMinEur, base.recipientMinEur);
});

test('a loss stays negative instead of being silently clamped', () => {
  const cost = calculateCosts({ ...DEMO_INVOICE, revenueCad: 8000 }, bank, 'buyer', 10);
  assert.equal(cost.marginMinCad, -3101.65);
  assert.ok(cost.marginMinCad <= cost.marginMaxCad);
});

test('half-cent rounding and the reference/markup split do not double count', () => {
  const invoice: Invoice = { ...DEMO_INVOICE, quantity: 1, unitPriceEur: 1, amountEur: 1, revenueCad: 10, otherCostsCad: 0 };
  const quote: Quote = { ...bank, referenceRate: 1.005, rateCadPerEur: 1.015, transferFeeCad: 0, downstreamFeeEur: { min: 0, max: 0 } };
  const cost = calculateCosts(invoice, quote, 'buyer');
  assert.equal(cost.principalCad, 1.01);
  assert.equal(cost.fxMarkupCad, 0.01);
  assert.equal(cost.totalMinCad, 1.02);
  assert.equal(cost.marginMinCad, 8.98);
});

test('invoice arithmetic allows fractional unit prices with a cent-rounded total', () => {
  assert.deepEqual(validateInvoice({ ...DEMO_INVOICE, quantity: 3, unitPriceEur: 1.005, amountEur: 3.02 }), []);
  assert.ok(validateInvoice({ ...DEMO_INVOICE, amountEur: 5000 }).some(error => error.includes('quantity × unit price')));
});

test('invalid invoice numbers and impossible dates return actionable validation errors', () => {
  for (const change of [
    { quantity: 0 }, { quantity: 1.5 }, { quantity: 1_000_001 },
    { unitPriceEur: -1 }, { unitPriceEur: Infinity },
    { amountEur: NaN }, { amountEur: 100_000_001 }, { amountEur: 6000.001 },
    { revenueCad: NaN }, { revenueCad: -1 }, { otherCostsCad: Infinity },
    { dueDate: '2026-02-29' }, { dueDate: '2026-09-31' }, { dueDate: '09/18/2026' },
    { goods: ' ' }, { id: '' },
  ]) {
    assert.ok(validateInvoice({ ...DEMO_INVOICE, ...change }).length > 0, JSON.stringify(change));
    assert.throws(() => calculateCosts({ ...DEMO_INVOICE, ...change }, bank, 'buyer'), RangeError);
  }
  assert.deepEqual(validateInvoice({ ...DEMO_INVOICE, dueDate: '2028-02-29' }), []);
});

test('invalid scenarios and quotes cannot produce a misleading NaN result', () => {
  for (const stress of [NaN, Infinity, -10.01, 10.01]) {
    assert.throws(() => calculateCosts(DEMO_INVOICE, bank, 'buyer', stress), /scenario/);
  }
  for (const change of [
    { rateCadPerEur: 0 }, { rateCadPerEur: NaN }, { referenceRate: Infinity },
    { transferFeeCad: -1 }, { transferFeeCad: NaN },
    { downstreamFeeEur: { min: 10, max: 5 } },
    { downstreamFeeEur: { min: 0, max: Infinity } },
  ]) {
    assert.throws(() => calculateCosts(DEMO_INVOICE, { ...bank, ...change }, 'buyer'), RangeError);
  }
  assert.throws(() => calculateCosts(DEMO_INVOICE, bank, 'someone' as 'buyer'), TypeError);
  assert.throws(() => calculateCosts(DEMO_INVOICE, { ...bank, downstreamFeeEur: { min: 0, max: 6001 } }, 'supplier'), /exceed the invoice/);
});

test('currency formatting has a stable two-decimal Canadian locale', () => {
  assert.equal(money(11200), '$11,200.00');
  assert.equal(money(6000, 'EUR'), '€6,000.00');
});
