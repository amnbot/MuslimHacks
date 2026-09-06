/** Eligibility links only: no provider checkout is connected. */
export const FUNDING_PROVIDERS = [
  { id: 'moonpay', name: 'MoonPay', url: 'https://www.moonpay.com/buy/usdc', description: 'Buy USDC through a supported funding method.', eligibility: 'Confirm Solana and business eligibility. Canadian Interac excludes business bank accounts.' },
  { id: 'banxa', name: 'Banxa', url: 'https://banxa.com/', description: 'Check regional USDC and payment-method availability.', eligibility: 'Canada is currently restricted for USDC on Solana. Availability differs by country.' },
  { id: 'stripe', name: 'Stripe', url: 'https://docs.stripe.com/crypto/onramp', description: 'Crypto onramp for an approved platform integration.', eligibility: 'Embedded onramp is limited to the US and EU. SANAD has no Stripe checkout integration.' },
  { id: 'transak', name: 'Transak', url: 'https://transak.com/', description: 'Check a supported USDC purchase route.', eligibility: 'Confirm Solana, business onboarding and your country. Eligibility and fees vary.' },
] as const;
export const NETWORK_FEE_NOTE = 'Solana charges 0.000005 SOL per signature, plus any priority fee. A new token account may require an additional SOL deposit. The wallet shows the final network cost.';
