import { money, type Quote } from './shared';

export const eur = (value: number) => money(value, 'EUR');
export const cad = (value: number) => money(value, 'CAD');
export const range = (low: number, high: number, currency = 'CAD') =>
  low === high ? money(low, currency) : `${money(low, currency)} – ${money(high, currency)}`;
export const markupPercent = (quote: Quote) => (((quote.rateCadPerEur / quote.referenceRate) - 1) * 100).toFixed(2);
export const shortTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
