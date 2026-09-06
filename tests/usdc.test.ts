import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCosts, calculateUsdcBreakdown, DEMO_INVOICE, DEMO_QUOTES,
  USDC_ASSUMPTIONS, USDC_QUOTE,
} from '../src/lib/costs.ts';

const cents = (value: number) => Math.round(value * 100);

test('a USD-pegged route still has CAD/USD and USD/EUR exposure', () => {
  assert.equal(DEMO_QUOTES[2], USDC_QUOTE);
  assert.ok(Math.abs(USDC_QUOTE.referenceRate - 1.5) < 1e-12);
  assert.notEqual(USDC_ASSUMPTIONS.cadPerUsd, 1);
  assert.notEqual(USDC_ASSUMPTIONS.usdPerEur, 1);
  const base = calculateCosts(DEMO_INVOICE, USDC_QUOTE, 'buyer');
  const up = calculateCosts(DEMO_INVOICE, USDC_QUOTE, 'buyer', 10);
  const down = calculateCosts(DEMO_INVOICE, USDC_QUOTE, 'buyer', -10);
  assert.equal(base.principalCad, 9000);
  assert.equal(up.principalCad, 9900);
  assert.equal(down.principalCad, 8100);
  assert.ok(up.totalMaxCad > base.totalMaxCad);
  assert.ok(down.totalMaxCad < base.totalMaxCad);
  const breakdown = calculateUsdcBreakdown(DEMO_INVOICE);
  assert.ok(Math.abs(breakdown.intermediateUsdc - 6733.333333333333) < 1e-9);
  assert.equal(calculateUsdcBreakdown(DEMO_INVOICE, 10).intermediateUsdc, breakdown.intermediateUsdc);
  assert.equal(calculateUsdcBreakdown(DEMO_INVOICE, 10).networkFeeCad, breakdown.networkFeeCad);
});

test('conversion spreads compound and reconcile to the quote at monetary boundaries', () => {
  assert.ok(Math.abs(USDC_QUOTE.rateCadPerEur - 1.52409) < 1e-12);
  const breakdown = calculateUsdcBreakdown(DEMO_INVOICE);
  assert.equal(breakdown.cashoutSpreadCad, 90);
  assert.equal(breakdown.fundingSpreadCad, 54.54);
  assert.equal(breakdown.totalConversionMarkupCad, 144.54);
  // Exercise cent allocation at small amounts and both ends of the FX scenario.
  for (const amountEur of [0.01, 1.01, 6000, 1_000_000]) {
    const invoice = { ...DEMO_INVOICE, quantity: 1, unitPriceEur: amountEur, amountEur };
    for (const stress of [-10, 0, 10]) {
      const cost = calculateCosts(invoice, USDC_QUOTE, 'buyer', stress);
      const parts = calculateUsdcBreakdown(invoice, stress);
      assert.equal(cents(parts.fundingSpreadCad) + cents(parts.cashoutSpreadCad), cents(cost.fxMarkupCad));
      assert.equal(cents(parts.fundingFeeCad) + cents(parts.networkFeeCad), cents(cost.transferFeeCad));
      assert.equal(cents(cost.principalCad) + cents(parts.totalConversionMarkupCad)
        + cents(parts.fundingFeeCad) + cents(parts.networkFeeCad) + cents(cost.feeReserveCad), cents(cost.totalMaxCad));
    }
  }
});

test('the small network fee is only one component of the full route cost', () => {
  const parts = calculateUsdcBreakdown(DEMO_INVOICE);
  const buyer = calculateCosts(DEMO_INVOICE, USDC_QUOTE, 'buyer');
  const supplier = calculateCosts(DEMO_INVOICE, USDC_QUOTE, 'supplier');
  assert.equal(parts.networkFeeCad, 0.34);
  assert.equal(parts.fundingFeeCad, 4);
  assert.equal(buyer.transferFeeCad, 4.34);
  assert.equal(buyer.feeReserveCad, 15.24);
  assert.equal(buyer.totalMinCad, 9153.45);
  assert.equal(buyer.totalMaxCad, 9164.12);
  assert.equal(cents(buyer.totalMaxCad - buyer.principalCad), 16412);
  assert.ok(buyer.totalMaxCad - buyer.principalCad > parts.networkFeeCad);
  assert.equal(supplier.recipientMinEur, 5990);
  assert.equal(supplier.recipientMaxEur, 5997);
  assert.equal(supplier.totalMaxCad, 9148.88);
});

test('honest total-cost comparison leaves the specialist cheaper than the USDC route', () => {
  const specialist = DEMO_QUOTES.find((quote) => quote.id === 'specialist-transfer')!;
  for (const bearer of ['buyer', 'supplier'] as const) {
    for (const stress of [-10, 0, 10]) {
      const specialistCost = calculateCosts(DEMO_INVOICE, specialist, bearer, stress);
      const usdcCost = calculateCosts(DEMO_INVOICE, USDC_QUOTE, bearer, stress);
      assert.ok(specialistCost.totalMaxCad < usdcCost.totalMinCad);
      assert.ok(specialistCost.marginMinCad > usdcCost.marginMaxCad);
    }
  }
});
