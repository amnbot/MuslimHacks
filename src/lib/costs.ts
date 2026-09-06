/**
 * Naming note: the arithmetic here is generic rate maths between two currencies.
 * The historical field names say Cad and Eur, and are kept so the existing tests and
 * signed agreement snapshots stay byte-compatible. Read them as roles, not currencies:
 *
 *   ...Cad  →  the BUYER's currency (what leaves the buyer's account)
 *   ...Eur  →  the SELLER's currency (what the seller is invoiced in and receives)
 *
 * A Corridor carries the ISO codes used to label those numbers in the interface.
 */
export type Invoice = {
  id: string;
  goods: string;
  quantity: number;
  unitPriceEur: number;
  amountEur: number;
  revenueCad: number;
  otherCostsCad: number;
  dueDate: string;
};

export type Quote = {
  id: string;
  name: string;
  description: string;
  rateCadPerEur: number;
  referenceRate: number;
  transferFeeCad: number;
  downstreamFeeEur: { min: number; max: number };
  delivery: string;
  source: string;
  asOf: string;
};

export type FeeBearer = 'buyer' | 'supplier';

export type CostResult = {
  /** Invoice at the scenario reference rate, excluding the provider's FX markup. */
  principalCad: number;
  fxMarkupCad: number;
  transferFeeCad: number;
  /** Maximum extra amount set aside by the buyer for downstream fees. */
  feeReserveCad: number;
  totalMinCad: number;
  totalMaxCad: number;
  /** Estimated receipt under the fee assumption; never a payout guarantee. */
  recipientMinEur: number;
  recipientMaxEur: number;
  marginMinCad: number;
  marginMaxCad: number;
};

export const DEMO_INVOICE: Invoice = {
  id: 'SF-1048',
  goods: 'Organic extra virgin olive oil',
  quantity: 480,
  unitPriceEur: 12.5,
  amountEur: 6000,
  revenueCad: 11200,
  otherCostsCad: 850,
  dueDate: '2026-09-18',
};

/** Invented route inputs, with one USDC assumed to equal one USD throughout. */
export const USDC_ASSUMPTIONS = {
  cadPerUsd: 1.35,
  usdPerEur: 1.5 / 1.35,
  fundingSpreadPercent: 0.6,
  cashoutSpreadPercent: 1.0,
  fundingFeeCad: 4,
  networkFeeUsdc: 0.25,
  downstreamFeeEur: { min: 3, max: 10 },
} as const;

// CAD per USD × USD per EUR is CAD per EUR. Both conversion spreads
// compound: the CAD funding leg must also fund the USD/EUR cash-out markup.
export const USDC_QUOTE: Quote = {
  id: 'usdc-route',
  name: 'USDC route',
  description: 'CAD → USDC → EUR · simulated',
  referenceRate: USDC_ASSUMPTIONS.cadPerUsd * USDC_ASSUMPTIONS.usdPerEur,
  rateCadPerEur: USDC_ASSUMPTIONS.cadPerUsd * USDC_ASSUMPTIONS.usdPerEur
    * (1 + USDC_ASSUMPTIONS.fundingSpreadPercent / 100)
    * (1 + USDC_ASSUMPTIONS.cashoutSpreadPercent / 100),
  transferFeeCad: cents(USDC_ASSUMPTIONS.fundingFeeCad
    + cents(USDC_ASSUMPTIONS.networkFeeUsdc * USDC_ASSUMPTIONS.cadPerUsd)),
  downstreamFeeEur: { ...USDC_ASSUMPTIONS.downstreamFeeEur },
  delivery: 'On-chain leg may be fast; cash-out unverified',
  // The existing signed source field binds the assumptions without adding
  // fields to the strict Quote/agreement schema.
  source: 'Synthetic demo assumptions; not a live quote or provider offer. '
    + `1 USDC = 1 USD; CAD per USD = ${USDC_ASSUMPTIONS.cadPerUsd}; `
    + `USD per EUR = ${USDC_ASSUMPTIONS.usdPerEur} (1.5 / 1.35); `
    + `funding spread = ${USDC_ASSUMPTIONS.fundingSpreadPercent}%; `
    + `cash-out spread = ${USDC_ASSUMPTIONS.cashoutSpreadPercent.toFixed(1)}%; `
    + `funding fee = CAD ${USDC_ASSUMPTIONS.fundingFeeCad}; `
    + `network fee = ${USDC_ASSUMPTIONS.networkFeeUsdc} USDC, frozen at CAD ${cents(USDC_ASSUMPTIONS.networkFeeUsdc * USDC_ASSUMPTIONS.cadPerUsd)}; `
    + `downstream fee = EUR ${USDC_ASSUMPTIONS.downstreamFeeEur.min}–${USDC_ASSUMPTIONS.downstreamFeeEur.max}. `
    + 'FX stress shifts CAD per USD; USD per EUR and the quoted CAD network budget stay fixed.',
  asOf: '2026-09-05',
};

/**
 * Settling in USDC and holding it. The supplier keeps the stablecoin rather than
 * cashing out to EUR, so the 1% cash-out spread and the intermediary-bank deduction
 * both fall away; only the buyer's funding spread and the on-chain cost remain.
 *
 * This is the route the app actually executes on devnet. Its advantage is real but
 * conditional: it holds only while the supplier is willing to be paid in USDC and
 * does not immediately convert. Converting later reintroduces the cash-out spread.
 */
export const USDC_DIRECT_QUOTE: Quote = {
  id: 'usdc-direct',
  name: 'USDC direct',
  description: 'CAD → USDC, supplier holds USDC · no cash-out leg',
  referenceRate: USDC_ASSUMPTIONS.cadPerUsd * USDC_ASSUMPTIONS.usdPerEur,
  rateCadPerEur: USDC_ASSUMPTIONS.cadPerUsd * USDC_ASSUMPTIONS.usdPerEur
    * (1 + USDC_ASSUMPTIONS.fundingSpreadPercent / 100),
  transferFeeCad: cents(USDC_ASSUMPTIONS.fundingFeeCad
    + cents(USDC_ASSUMPTIONS.networkFeeUsdc * USDC_ASSUMPTIONS.cadPerUsd)),
  // An on-chain transfer has no correspondent bank in the middle to deduct from it.
  downstreamFeeEur: { min: 0, max: 0 },
  delivery: 'On-chain settlement, typically seconds',
  source: 'Synthetic demo assumptions; not a live quote or provider offer. '
    + `1 USDC = 1 USD; CAD per USD = ${USDC_ASSUMPTIONS.cadPerUsd}; `
    + `USD per EUR = ${USDC_ASSUMPTIONS.usdPerEur} (1.5 / 1.35); `
    + `funding spread = ${USDC_ASSUMPTIONS.fundingSpreadPercent}%; no cash-out spread, because the supplier is paid in USDC and holds it; `
    + `funding fee = CAD ${USDC_ASSUMPTIONS.fundingFeeCad}; `
    + `network fee = ${USDC_ASSUMPTIONS.networkFeeUsdc} USDC, frozen at CAD ${cents(USDC_ASSUMPTIONS.networkFeeUsdc * USDC_ASSUMPTIONS.cadPerUsd)}; `
    + 'downstream fee = 0, as no intermediary bank stands between the wallets. '
    + 'Excludes any later conversion of USDC into local currency, and the refundable SOL deposit for a new token account.',
  asOf: '2026-09-05',
};

// These names, rates, fees, and delivery estimates are invented demo inputs.
// No option represents a real company, a market quote, or availability.
export const DEMO_QUOTES: Quote[] = [
  {
    id: 'bank-wire',
    name: 'Bank wire',
    description: 'Synthetic bank-style quote · 2.60% FX markup',
    rateCadPerEur: 1.539,
    referenceRate: 1.5,
    transferFeeCad: 35,
    downstreamFeeEur: { min: 15, max: 35 },
    delivery: '2–4 business days · demo assumption',
    source: 'Synthetic demo assumptions; not a live quote or provider offer.',
    asOf: '2026-09-05',
  },
  {
    id: 'specialist-transfer',
    name: 'Specialist transfer',
    description: 'Synthetic specialist-style quote · 0.55% FX markup',
    rateCadPerEur: 1.50825,
    referenceRate: 1.5,
    transferFeeCad: 8,
    downstreamFeeEur: { min: 5, max: 15 },
    delivery: '1–2 business days · demo assumption',
    source: 'Synthetic demo assumptions; not a live quote or provider offer.',
    asOf: '2026-09-05',
  },
  USDC_QUOTE,
  USDC_DIRECT_QUOTE,
];

const MAX_INVOICE_EUR = 100_000_000;
const MAX_CAD_INPUT = 1_000_000_000;

// Round at monetary boundaries, not at exchange-rate boundaries. Adding a
// scale-aware epsilon avoids binary floating-point ties such as 1.005 -> 1.00.
function cents(value: number): number {
  const absolute = Math.abs(value);
  const rounded = Math.round((absolute + Number.EPSILON * Math.max(1, absolute)) * 100) / 100;
  return value < 0 ? -rounded : rounded;
}

function inRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateInvoice(invoice: Invoice): string[] {
  const errors: string[] = [];
  if (typeof invoice.id !== 'string' || !invoice.id.trim()) errors.push('Add an invoice reference.');
  if (typeof invoice.goods !== 'string' || !invoice.goods.trim()) errors.push('Describe the goods being purchased.');
  if (!Number.isInteger(invoice.quantity) || !inRange(invoice.quantity, 1, 1_000_000)) {
    errors.push('Quantity must be a whole number between 1 and 1,000,000.');
  }
  if (!inRange(invoice.unitPriceEur, 0.01, 1_000_000)) {
    errors.push('Unit price must be between €0.01 and €1,000,000.');
  }
  if (!inRange(invoice.amountEur, 0.01, MAX_INVOICE_EUR)) {
    errors.push('Invoice total must be between €0.01 and €100,000,000.');
  } else if (invoice.amountEur !== cents(invoice.amountEur)) {
    errors.push('Invoice total must have no more than two decimal places.');
  } else if (Number.isFinite(invoice.quantity * invoice.unitPriceEur)
    && invoice.amountEur !== cents(invoice.quantity * invoice.unitPriceEur)) {
    errors.push('Invoice total must equal quantity × unit price, rounded to cents.');
  }
  if (!inRange(invoice.revenueCad, 0, MAX_CAD_INPUT)) {
    errors.push('Expected sales must be between C$0 and C$1,000,000,000.');
  }
  if (!inRange(invoice.otherCostsCad, 0, MAX_CAD_INPUT)) {
    errors.push('Other costs must be between C$0 and C$1,000,000,000.');
  }
  if (typeof invoice.dueDate !== 'string' || !isIsoDate(invoice.dueDate)) {
    errors.push('Choose a valid payment due date in YYYY-MM-DD format.');
  }
  return errors;
}

/**
 * Deterministic scenario arithmetic only. Positive fxMovePercent means EUR
 * becomes more expensive in CAD; negative means less expensive. Both reference
 * and customer rates move together, keeping the supplied markup percentage.
 * This is a user-selected sensitivity scenario, not an exchange-rate forecast.
 *
 * Buyer: assumes downstream fees are covered in addition to the invoice.
 * Supplier: assumes downstream fees are deducted from the invoice receipt.
 * No additional fees, taxes, or gross-up-on-gross-up effects are inferred.
 */
export function calculateCosts(
  invoice: Invoice,
  quote: Quote,
  bearer: FeeBearer,
  fxMovePercent = 0,
): CostResult {
  const errors = validateInvoice(invoice);
  if (errors.length) throw new RangeError(errors.join(' '));
  if (bearer !== 'buyer' && bearer !== 'supplier') throw new TypeError('Choose buyer or supplier to cover downstream fees.');
  if (!inRange(fxMovePercent, -10, 10)) throw new RangeError('Choose an exchange-rate scenario from −10% to +10%.');
  if (!inRange(quote.referenceRate, 0.000001, 1000) || !inRange(quote.rateCadPerEur, 0.000001, 1000)) {
    throw new RangeError('Reference and customer rates must be finite and between 0.000001 and 1,000 CAD per EUR.');
  }
  if (!inRange(quote.transferFeeCad, 0, MAX_CAD_INPUT)) throw new RangeError('Transfer fee must be a finite, non-negative CAD amount.');
  if (!quote.downstreamFeeEur
    || !inRange(quote.downstreamFeeEur.min, 0, MAX_INVOICE_EUR)
    || !inRange(quote.downstreamFeeEur.max, quote.downstreamFeeEur.min, MAX_INVOICE_EUR)) {
    throw new RangeError('Downstream fees must be a finite, non-negative range with minimum no greater than maximum.');
  }
  if (bearer === 'supplier' && quote.downstreamFeeEur.max > invoice.amountEur) {
    throw new RangeError('Downstream fees exceed the invoice; choose buyer-paid fees or revise the quote.');
  }

  const shift = 1 + fxMovePercent / 100;
  const referenceRate = quote.referenceRate * shift;
  const customerRate = quote.rateCadPerEur * shift;
  const principalCad = cents(invoice.amountEur * referenceRate);
  const customerPrincipalCad = cents(invoice.amountEur * customerRate);
  // Difference of rounded principals keeps the decomposition exact to a cent.
  const fxMarkupCad = cents(customerPrincipalCad - principalCad);
  const transferFeeCad = cents(quote.transferFeeCad);
  const downstreamMinEur = cents(quote.downstreamFeeEur.min);
  const downstreamMaxEur = cents(quote.downstreamFeeEur.max);
  const reserveMinCad = bearer === 'buyer' ? cents(downstreamMinEur * customerRate) : 0;
  const feeReserveCad = bearer === 'buyer' ? cents(downstreamMaxEur * customerRate) : 0;
  const totalMinCad = cents(customerPrincipalCad + transferFeeCad + reserveMinCad);
  const totalMaxCad = cents(customerPrincipalCad + transferFeeCad + feeReserveCad);
  const revenueCad = cents(invoice.revenueCad);
  const otherCostsCad = cents(invoice.otherCostsCad);

  return {
    principalCad,
    fxMarkupCad,
    transferFeeCad,
    feeReserveCad,
    totalMinCad,
    totalMaxCad,
    recipientMinEur: bearer === 'buyer' ? invoice.amountEur : cents(invoice.amountEur - downstreamMaxEur),
    recipientMaxEur: bearer === 'buyer' ? invoice.amountEur : cents(invoice.amountEur - downstreamMinEur),
    marginMinCad: cents(revenueCad - otherCostsCad - totalMaxCad),
    marginMaxCad: cents(revenueCad - otherCostsCad - totalMinCad),
  };
}

/**
 * Explain the synthetic route within the existing cost totals, without adding
 * its fees a second time. FX stress moves CAD per USD and therefore CAD per EUR;
 * the USD/EUR leg remains fixed. The already quoted CAD network budget is fixed,
 * like every transfer fee in calculateCosts.
 *
 * intermediateUsdc is the indicative cash-out input for the invoice only. It
 * includes the cash-out spread, excludes network/downstream fees, and is not a
 * token balance or a claim that the off-ramp will deliver the invoice amount.
 */
export function calculateUsdcBreakdown(invoice: Invoice, fxMovePercent = 0) {
  const costs = calculateCosts(invoice, USDC_QUOTE, 'buyer', fxMovePercent);
  const intermediateUsdc = invoice.amountEur * USDC_ASSUMPTIONS.usdPerEur
    * (1 + USDC_ASSUMPTIONS.cashoutSpreadPercent / 100);
  const scenarioCadPerUsd = USDC_ASSUMPTIONS.cadPerUsd * (1 + fxMovePercent / 100);
  const cashoutPrincipalCad = cents(intermediateUsdc * scenarioCadPerUsd);
  const cashoutSpreadCad = cents(cashoutPrincipalCad - costs.principalCad);
  // A difference of rounded boundaries allocates the composed spread and keeps
  // the two line items equal to the existing FX markup, even for small invoices.
  const fundingSpreadCad = cents(costs.fxMarkupCad - cashoutSpreadCad);
  const networkFeeCad = cents(USDC_ASSUMPTIONS.networkFeeUsdc * USDC_ASSUMPTIONS.cadPerUsd);

  return {
    fundingSpreadCad,
    cashoutSpreadCad,
    networkFeeCad,
    fundingFeeCad: cents(costs.transferFeeCad - networkFeeCad),
    totalConversionMarkupCad: costs.fxMarkupCad,
    intermediateUsdc,
  };
}

/** A buyer-country to seller-country lane, with the routes quoted for it. */
export type Corridor = {
  id: string;
  buyerCountry: string;
  sellerCountry: string;
  /** ISO code for the ...Cad fields. */
  buyerCurrency: string;
  /** ISO code for the ...Eur fields. */
  sellerCurrency: string;
  quotes: Quote[];
};

export const CANADA_TUNISIA: Corridor = {
  id: 'ca-tn',
  buyerCountry: 'Canada',
  sellerCountry: 'Tunisia',
  buyerCurrency: 'CAD',
  sellerCurrency: 'EUR',
  quotes: DEMO_QUOTES,
};

// Same synthetic method as the Canadian lane, re-quoted around a 0.85 GBP/EUR
// reference. Invented inputs; no option represents a real company or market quote.
export const UK_TUNISIA: Corridor = {
  id: 'gb-tn',
  buyerCountry: 'United Kingdom',
  sellerCountry: 'Tunisia',
  buyerCurrency: 'GBP',
  sellerCurrency: 'EUR',
  quotes: [
    {
      id: 'bank-wire',
      name: 'Bank wire',
      description: 'Synthetic bank-style quote · 2.60% FX markup',
      rateCadPerEur: 0.8721,
      referenceRate: 0.85,
      transferFeeCad: 25,
      downstreamFeeEur: { min: 15, max: 35 },
      delivery: '2–4 business days · demo assumption',
      source: 'Synthetic demo assumptions; not a live quote or provider offer. Reference 0.85 GBP per EUR.',
      asOf: '2026-09-05',
    },
    {
      id: 'specialist-transfer',
      name: 'Specialist transfer',
      description: 'Synthetic specialist-style quote · 0.55% FX markup',
      rateCadPerEur: 0.8546750,
      referenceRate: 0.85,
      transferFeeCad: 6,
      downstreamFeeEur: { min: 5, max: 15 },
      delivery: '1–2 business days · demo assumption',
      source: 'Synthetic demo assumptions; not a live quote or provider offer. Reference 0.85 GBP per EUR.',
      asOf: '2026-09-05',
    },
    {
      id: 'usdc-direct',
      name: 'USDC direct',
      description: 'GBP → USDC, supplier holds USDC · no cash-out leg',
      rateCadPerEur: 0.8551,
      referenceRate: 0.85,
      transferFeeCad: 3.25,
      downstreamFeeEur: { min: 0, max: 0 },
      delivery: 'On-chain settlement, typically seconds',
      source: 'Synthetic demo assumptions; not a live quote or provider offer. Reference 0.85 GBP per EUR; '
        + '0.6% funding spread; no cash-out spread, because the supplier is paid in USDC and holds it; '
        + 'no intermediary bank deduction. Excludes any later conversion into local currency.',
      asOf: '2026-09-05',
    },
  ],
};

export const CORRIDORS: Corridor[] = [CANADA_TUNISIA, UK_TUNISIA];

export type RouteOption = {
  quote: Quote;
  bearer: FeeBearer;
  costs: CostResult;
  /**
   * Everything the two businesses lose to intermediaries, in the buyer's currency:
   * what the buyer pays out, less what the supplier can rely on receiving, valued at
   * the mid-market reference rate. Independent of who was made to bear the fees, so
   * it is the only figure that cannot be improved by pushing cost onto the other side.
   */
  frictionCad: number;
};
export type Recommendation = {
  options: RouteOption[];
  /** Least total cost to the two businesses together. This is the arrangement to propose. */
  lowestTotalCost: RouteOption;
  /** Lowest worst-case outlay for the buyer, breaking ties toward the supplier's receipt. */
  cheapestForBuyer: RouteOption;
  /** Largest guaranteed receipt for the supplier, breaking ties toward the buyer's outlay. */
  bestForSupplier: RouteOption;
  /** The bank-wire baseline these are measured against, when the corridor quotes one. */
  baseline: RouteOption | null;
  /** Friction avoided against that baseline, in the buyer's currency. */
  savingCad: number;
};

/**
 * Scores every route and fee-bearer combination the corridor allows, so the interface
 * can show which arrangement actually costs least rather than asserting it.
 *
 * Comparisons use each side's worst case — the buyer's totalMaxCad and the supplier's
 * recipientMinEur — because that is the figure each party can rely on. A route whose
 * inputs are invalid for this invoice is skipped rather than guessed at.
 */
export function recommendRoute(invoice: Invoice, corridor: Corridor): Recommendation {
  const options: RouteOption[] = [];
  for (const quote of corridor.quotes) {
    for (const bearer of ['buyer', 'supplier'] as const) {
      try {
        const costs = calculateCosts(invoice, quote, bearer);
        options.push({
          quote,
          bearer,
          costs,
          frictionCad: cents(costs.totalMaxCad - costs.recipientMinEur * quote.referenceRate),
        });
      } catch {
        // Downstream fees can exceed a very small invoice; that pairing is simply unavailable.
      }
    }
  }
  if (!options.length) throw new RangeError('No quoted route in this corridor can carry this invoice.');

  const best = (isBetter: (candidate: RouteOption, incumbent: RouteOption) => boolean) =>
    options.reduce((incumbent, candidate) => (isBetter(candidate, incumbent) ? candidate : incumbent));

  const lowestTotalCost = best((candidate, incumbent) => candidate.frictionCad < incumbent.frictionCad);
  // Ties are common once fees reach zero, so each view falls back to the other side's interest.
  const cheapestForBuyer = best((candidate, incumbent) =>
    candidate.costs.totalMaxCad !== incumbent.costs.totalMaxCad
      ? candidate.costs.totalMaxCad < incumbent.costs.totalMaxCad
      : candidate.costs.recipientMinEur > incumbent.costs.recipientMinEur);
  const bestForSupplier = best((candidate, incumbent) =>
    candidate.costs.recipientMinEur !== incumbent.costs.recipientMinEur
      ? candidate.costs.recipientMinEur > incumbent.costs.recipientMinEur
      : candidate.costs.totalMaxCad < incumbent.costs.totalMaxCad);
  const baseline = options.find((option) => option.quote.id === 'bank-wire' && option.bearer === 'supplier') ?? null;

  return {
    options,
    lowestTotalCost,
    cheapestForBuyer,
    bestForSupplier,
    baseline,
    savingCad: baseline ? cents(baseline.frictionCad - lowestTotalCost.frictionCad) : 0,
  };
}

export function money(value: number, currency = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
