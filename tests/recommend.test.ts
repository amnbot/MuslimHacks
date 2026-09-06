import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANADA_TUNISIA, CORRIDORS, DEMO_INVOICE, UK_TUNISIA,
  calculateCosts, recommendRoute, type Corridor,
} from '../src/lib/costs.ts';

test('every corridor quotes a coherent set of routes', () => {
  for (const corridor of CORRIDORS) {
    assert.ok(corridor.quotes.length >= 3, `${corridor.id} needs routes to compare`);
    assert.notEqual(corridor.buyerCurrency, corridor.sellerCurrency);
    const reference = corridor.quotes[0].referenceRate;
    for (const quote of corridor.quotes) {
      // A shared mid-market reference is what makes the routes comparable at all.
      // The USDC routes reach it through cadPerUsd × usdPerEur, so allow for floating point.
      assert.ok(
        Math.abs(quote.referenceRate - reference) < 1e-12,
        `${corridor.id}/${quote.id} must share the reference rate`,
      );
      assert.ok(quote.rateCadPerEur >= quote.referenceRate, `${corridor.id}/${quote.id} cannot beat mid-market`);
      assert.ok(quote.source.startsWith('Synthetic'), 'every quote must disclose that it is synthetic');
    }
  }
});

test('the recommendation finds the true lowest friction by brute force', () => {
  for (const corridor of CORRIDORS) {
    const result = recommendRoute(DEMO_INVOICE, corridor);
    assert.equal(result.options.length, corridor.quotes.length * 2);

    const lowest = Math.min(...result.options.map((option) => option.frictionCad));
    assert.equal(result.lowestTotalCost.frictionCad, lowest);
    assert.equal(result.cheapestForBuyer.costs.totalMaxCad, Math.min(...result.options.map((o) => o.costs.totalMaxCad)));
    assert.equal(result.bestForSupplier.costs.recipientMinEur, Math.max(...result.options.map((o) => o.costs.recipientMinEur)));

    // Friction is what the two businesses lose together, so it must be positive
    // and must equal buyer outlay less the supplier's receipt at the reference rate.
    for (const option of result.options) {
      assert.ok(option.frictionCad > 0);
      const expected = option.costs.totalMaxCad - option.costs.recipientMinEur * option.quote.referenceRate;
      assert.ok(Math.abs(option.frictionCad - expected) < 0.005);
    }
  }
});

test('settling in USDC without a cash-out leg is the cheapest arrangement offered', () => {
  for (const corridor of CORRIDORS) {
    const result = recommendRoute(DEMO_INVOICE, corridor);
    assert.equal(result.lowestTotalCost.quote.id, 'usdc-direct');
    // The supplier is paid in full, because no correspondent bank stands in between.
    assert.equal(result.lowestTotalCost.costs.recipientMinEur, DEMO_INVOICE.amountEur);
    assert.ok(result.savingCad > 0, 'it must beat the bank-wire baseline');
    assert.equal(result.baseline?.quote.id, 'bank-wire');
    assert.ok(result.baseline!.frictionCad > result.lowestTotalCost.frictionCad);
  }
});

test('the buyer-optimal route is not always the one that costs least overall', () => {
  // On the Canadian lane the buyer can shave a little by pushing fees onto the supplier,
  // which raises the total cost of the deal. Surfacing both is the point of the comparison.
  const result = recommendRoute(DEMO_INVOICE, CANADA_TUNISIA);
  assert.equal(result.cheapestForBuyer.quote.id, 'specialist-transfer');
  assert.equal(result.cheapestForBuyer.bearer, 'supplier');
  assert.ok(result.cheapestForBuyer.costs.totalMaxCad < result.lowestTotalCost.costs.totalMaxCad);
  assert.ok(result.cheapestForBuyer.frictionCad > result.lowestTotalCost.frictionCad);
  assert.ok(result.cheapestForBuyer.costs.recipientMinEur < result.lowestTotalCost.costs.recipientMinEur);
});

test('ties resolve toward the other party rather than by list order', () => {
  const result = recommendRoute(DEMO_INVOICE, UK_TUNISIA);
  // Several routes pay the supplier in full; the winner must also be cheap for the buyer.
  const full = result.options.filter((option) => option.costs.recipientMinEur === DEMO_INVOICE.amountEur);
  assert.ok(full.length > 1, 'this test needs a tie to resolve');
  assert.equal(result.bestForSupplier.costs.totalMaxCad, Math.min(...full.map((option) => option.costs.totalMaxCad)));
});

test('a route whose fees exceed a small invoice is skipped, not guessed at', () => {
  const tiny = { ...DEMO_INVOICE, quantity: 1, unitPriceEur: 12, amountEur: 12 };
  const result = recommendRoute(tiny, CANADA_TUNISIA);
  // Supplier-borne bank fees of up to €35 cannot come out of a €12 invoice.
  assert.ok(result.options.length < CANADA_TUNISIA.quotes.length * 2);
  assert.ok(result.options.every((option) => option.costs.recipientMinEur >= 0));
  for (const option of result.options) {
    assert.doesNotThrow(() => calculateCosts(tiny, option.quote, option.bearer));
  }
});

test('an empty corridor reports that no route can carry the invoice', () => {
  const empty: Corridor = { ...CANADA_TUNISIA, id: 'empty', quotes: [] };
  assert.throws(() => recommendRoute(DEMO_INVOICE, empty), RangeError);
});
