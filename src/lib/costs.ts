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

export function money(value: number, currency = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
