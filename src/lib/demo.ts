/**
 * The seeded demo world: two switchable profiles and the conversations between them.
 *
 * Everything here is synthetic and labelled as such — participants, businesses,
 * message history and invoice figures. What is NOT synthetic is the cryptography
 * (real SHA-256 fingerprints, real P-256 signatures, real AES-256-GCM envelopes)
 * and the Solana devnet settlement, which is a real transfer of valueless test tokens.
 *
 * The two wallets are derived from published labels, so both phones compute the same
 * addresses with no server between them. That is only safe because these are devnet
 * keys: never derive a wallet holding real value this way.
 */
import { CANADA_TUNISIA, UK_TUNISIA, DEMO_INVOICE, type Corridor, type FeeBearer, type Invoice } from './costs';
import { keypairFromSeed, seedFromLabel, type Keypair } from './solana';

export const DEMO_DISCLOSURE =
  'Synthetic demo conversation, parties, rates and fees. Cost ranges are assumptions, not guarantees. '
  + 'Signing does not lock a rate, authenticate legal identity or establish legal enforceability.';

export const DEVNET_NOTICE = 'Solana devnet. These USDC test tokens have no financial value.';

/**
 * The on-chain demonstration transfer. Devnet faucets dispense small amounts, so this
 * stands in for the invoice settlement rather than matching it. The interface must always
 * say so rather than implying the invoice total moved on chain.
 */
export const DEMO_SETTLEMENT_MICROS = 1_000_000;
export const DEMO_SETTLEMENT_NOTE =
  'A devnet demonstration transfer stands in for the invoice settlement. It is a real on-chain '
  + 'transaction of valueless test tokens, not a payment of the invoiced amount.';

export type ProfileId = 'amira' | 'bilal';
export type Party = 'seller' | 'buyer';

export type Participant = {
  id: string;
  personName: string;
  businessName: string;
  country: string;
  city: string;
  initials: string;
};

export const PARTICIPANTS: Record<string, Participant> = {
  amira: { id: 'amira', personName: 'Amira Ben Youssef', businessName: 'Sfax Olive Co.', country: 'Tunisia', city: 'Sfax', initials: 'AB' },
  bilal: { id: 'bilal', personName: 'Bilal Mansouri', businessName: 'Cedar Pantry Imports', country: 'Canada', city: 'Montréal', initials: 'BM' },
  nadia: { id: 'nadia', personName: 'Nadia Cheriet', businessName: 'Maghreb Foods Ltd', country: 'United Kingdom', city: 'Manchester', initials: 'NC' },
  karim: { id: 'karim', personName: 'Karim Idrissi', businessName: 'Atlas Argan Coop', country: 'Morocco', city: 'Agadir', initials: 'KI' },
};

export type DemoProfile = Participant & { role: Party; wallet: Keypair };

/** Published, reproducible devnet seeds. Never use this pattern for a funded wallet. */
export const WALLET_SEED_LABELS: Record<ProfileId, string> = {
  amira: 'sanad-demo-devnet-v1:amira',
  bilal: 'sanad-demo-devnet-v1:bilal',
};

export const PROFILES: Record<ProfileId, DemoProfile> = {
  amira: { ...PARTICIPANTS.amira, role: 'seller', wallet: keypairFromSeed(seedFromLabel(WALLET_SEED_LABELS.amira)) },
  bilal: { ...PARTICIPANTS.bilal, role: 'buyer', wallet: keypairFromSeed(seedFromLabel(WALLET_SEED_LABELS.bilal)) },
};

export const PROFILE_IDS: ProfileId[] = ['amira', 'bilal'];

// --- conversations ----------------------------------------------------------

export type ThreadStage = 'negotiating' | 'invoiced' | 'agreed' | 'paid';

export const STAGE_LABEL: Record<ThreadStage, string> = {
  negotiating: 'Negotiating',
  invoiced: 'Invoice sent',
  agreed: 'Agreement signed',
  paid: 'Settled',
};

export type DemoMessage =
  | { kind: 'text'; id: string; from: string; time: string; text: string }
  | { kind: 'system'; id: string; time: string; text: string }
  /** The fee-responsibility decision, taken inside the conversation where the context is. */
  | { kind: 'feePoll'; id: string; from: string; time: string; question: string; votes: Partial<Record<string, FeeBearer>>; resolved: FeeBearer | null }
  /** Opens the full route comparison for this thread's corridor. */
  | { kind: 'comparison'; id: string; from: string; time: string; note: string }
  | { kind: 'invoice'; id: string; from: string; time: string; reference: string }
  | { kind: 'agreement'; id: string; from: string; time: string }
  | { kind: 'payment'; id: string; from: string; time: string; amountMicros: number; signature: string | null };

export type InvoiceDraft = {
  reference: string;
  dueDate: string;
  note: string;
  lines: { description: string; quantity: number; unitPriceUsdc: string }[];
};

export type DemoThread = {
  id: string;
  sellerId: string;
  buyerId: string;
  /** Which switchable profiles can open this thread. */
  visibleTo: ProfileId[];
  corridorId: string;
  stage: ThreadStage;
  subject: string;
  invoice: Invoice;
  quoteId: string;
  bearer: FeeBearer;
  messages: DemoMessage[];
  /** Present when the thread is parked before invoicing, to seed the create-invoice form. */
  draft?: InvoiceDraft;
};

export const CORRIDORS_BY_ID: Record<string, Corridor> = {
  [CANADA_TUNISIA.id]: CANADA_TUNISIA,
  [UK_TUNISIA.id]: UK_TUNISIA,
};

export function corridorOf(thread: DemoThread): Corridor {
  return CORRIDORS_BY_ID[thread.corridorId] ?? CANADA_TUNISIA;
}

/** The €6,000 olive-oil order, already negotiated. Second-person roles resolve per viewer. */
const CEDAR_MESSAGES: DemoMessage[] = [
  { kind: 'text', id: 'm1', from: 'bilal', time: '09:12', text: 'Salam Amira. We would like to repeat the September order — 480 bottles of the organic extra virgin, same 750ml format.' },
  { kind: 'text', id: 'm2', from: 'amira', time: '09:31', text: 'Wa alaykum salam Bilal. Happy to. The harvest was good this year. My price is €13.10 a bottle for this batch.' },
  { kind: 'text', id: 'm3', from: 'bilal', time: '09:40', text: 'That is above what we budgeted. Last season we were at €12.20. Our shelf price cannot absorb the difference.' },
  { kind: 'text', id: 'm4', from: 'amira', time: '09:52', text: 'I can meet you at €12.50 if you keep the full 480 bottles and we settle within 14 days. Below that I am under my cost.' },
  { kind: 'text', id: 'm5', from: 'bilal', time: '10:03', text: '€12.50 × 480 works — €6,000. Agreed on the goods.' },
  { kind: 'text', id: 'm6', from: 'amira', time: '10:09', text: 'Good. Now the part that went wrong last time. I invoiced €6,000 and €5,965 arrived. A correspondent bank took the rest, and I only found out three weeks later.' },
  { kind: 'text', id: 'm7', from: 'bilal', time: '10:14', text: 'I remember. I paid the full amount from my side, so neither of us could see who took it. Let us decide it up front this time.' },
  {
    kind: 'feePoll', id: 'm8', from: 'amira', time: '10:18',
    question: 'Who covers the intermediary deduction on this transfer?',
    votes: { amira: 'buyer', bilal: 'buyer' },
    resolved: 'buyer',
  },
  { kind: 'text', id: 'm9', from: 'bilal', time: '10:26', text: 'Agreed — I will cover it, so you receive the full €6,000. But I want to see what that actually costs me before I commit.' },
  {
    kind: 'comparison', id: 'm10', from: 'bilal', time: '10:27',
    note: 'Same invoice, every route and both fee arrangements, priced end to end.',
  },
  { kind: 'text', id: 'm11', from: 'amira', time: '10:41', text: 'The USDC route is interesting. If you send USDC and I hold it, there is no correspondent bank and no cash-out spread — nothing can be deducted in the middle.' },
  { kind: 'text', id: 'm12', from: 'bilal', time: '10:48', text: 'That is the cheapest line on the comparison, and you receive the full amount. Let us settle that way. Sending the invoice terms now.' },
  { kind: 'invoice', id: 'm13', from: 'amira', time: '11:02', reference: 'SF-1048' },
  { kind: 'text', id: 'm14', from: 'amira', time: '11:03', text: 'Invoice attached — 480 bottles, €12.50 each, €6,000 total, due 18 September. My receiving wallet is in the payment section.' },
  { kind: 'agreement', id: 'm15', from: 'amira', time: '11:05' },
];

const MAGHREB_MESSAGES: DemoMessage[] = [
  { kind: 'text', id: 'n1', from: 'nadia', time: '14:02', text: 'Hello Amira. Manchester distributor here. We are looking for 300 bottles of the 500ml organic for a Ramadan promotion.' },
  { kind: 'text', id: 'n2', from: 'amira', time: '14:20', text: 'Welcome Nadia. The 500ml organic is €9.40 a bottle at 300 units, ex-works Sfax.' },
  { kind: 'text', id: 'n3', from: 'nadia', time: '14:35', text: 'Can you do €9.00 if we add 120 bottles of the 250ml at your list price? That gets us to a full pallet.' },
  { kind: 'text', id: 'n4', from: 'amira', time: '14:51', text: 'Yes — €9.00 for the 500ml at 300 units, and €5.60 for the 250ml at 120 units. Delivery 12–16 October.' },
  { kind: 'text', id: 'n5', from: 'nadia', time: '15:04', text: 'Agreed on both lines. One condition: we pay from a GBP account and we need the amount you receive to be exactly what you invoice. No surprises at your end.' },
  {
    kind: 'feePoll', id: 'n6', from: 'nadia', time: '15:06',
    question: 'Who covers the intermediary deduction on this transfer?',
    votes: { nadia: 'buyer' },
    resolved: null,
  },
  { kind: 'text', id: 'n7', from: 'amira', time: '15:22', text: 'That suits me. Let me put the invoice together and we can both sign the same terms.' },
  { kind: 'system', id: 'n8', time: '15:22', text: 'Terms agreed. No invoice has been issued for this order yet.' },
];

const ATLAS_MESSAGES: DemoMessage[] = [
  { kind: 'text', id: 'k1', from: 'karim', time: '08:15', text: 'Bilal, the argan oil shipment cleared customs in Casablanca this morning.' },
  { kind: 'text', id: 'k2', from: 'bilal', time: '08:31', text: 'Good news. Settlement went through last week — thank you for accepting USDC, it saved us both the wire charges.' },
  { kind: 'text', id: 'k3', from: 'karim', time: '08:34', text: 'It arrived in full, which is a first. Same arrangement for the winter order.' },
  { kind: 'payment', id: 'k4', from: 'bilal', time: '08:36', amountMicros: DEMO_SETTLEMENT_MICROS, signature: null },
];

/** The €6,000 order shared by both phones. Reuses the invoice the cost tests already cover. */
export const CEDAR_INVOICE: Invoice = { ...DEMO_INVOICE };

/** The UK order, priced but not yet invoiced. */
export const MAGHREB_INVOICE: Invoice = {
  id: 'SF-1052',
  goods: 'Organic extra virgin olive oil, mixed formats',
  quantity: 420,
  unitPriceEur: 8.03,
  amountEur: 3372.6,
  revenueCad: 6100,
  otherCostsCad: 480,
  dueDate: '2026-10-16',
};

const ATLAS_INVOICE: Invoice = {
  id: 'AA-0311',
  goods: 'Cold-pressed culinary argan oil',
  quantity: 240,
  unitPriceEur: 18.4,
  amountEur: 4416,
  revenueCad: 8600,
  otherCostsCad: 700,
  dueDate: '2026-08-28',
};

export const DEMO_THREADS: DemoThread[] = [
  {
    id: 'cedar-sfax',
    sellerId: 'amira',
    buyerId: 'bilal',
    visibleTo: ['amira', 'bilal'],
    corridorId: CANADA_TUNISIA.id,
    stage: 'invoiced',
    subject: 'September harvest · 480 bottles',
    invoice: CEDAR_INVOICE,
    quoteId: 'usdc-direct',
    bearer: 'buyer',
    messages: CEDAR_MESSAGES,
  },
  {
    id: 'maghreb-sfax',
    sellerId: 'amira',
    buyerId: 'nadia',
    visibleTo: ['amira'],
    corridorId: UK_TUNISIA.id,
    stage: 'negotiating',
    subject: 'Ramadan promotion · mixed pallet',
    invoice: MAGHREB_INVOICE,
    quoteId: 'usdc-direct',
    bearer: 'buyer',
    messages: MAGHREB_MESSAGES,
    draft: {
      reference: 'SF-1052',
      dueDate: '2026-10-16',
      note: 'Delivery 12–16 October, ex-works Sfax. Fees on the buyer so the invoiced amount arrives in full.',
      lines: [
        { description: 'Organic extra virgin olive oil, 500ml', quantity: 300, unitPriceUsdc: '10.60' },
        { description: 'Organic extra virgin olive oil, 250ml', quantity: 120, unitPriceUsdc: '6.60' },
      ],
    },
  },
  {
    id: 'atlas-cedar',
    sellerId: 'karim',
    buyerId: 'bilal',
    visibleTo: ['bilal'],
    corridorId: CANADA_TUNISIA.id,
    stage: 'paid',
    subject: 'Winter argan order',
    invoice: ATLAS_INVOICE,
    quoteId: 'usdc-direct',
    bearer: 'buyer',
    messages: ATLAS_MESSAGES,
  },
];

// --- viewer-relative helpers ------------------------------------------------

export function threadsFor(profileId: ProfileId): DemoThread[] {
  return DEMO_THREADS.filter((thread) => thread.visibleTo.includes(profileId));
}

/** The other side of the table, from this viewer's seat. */
export function counterpartOf(thread: DemoThread, profileId: ProfileId): Participant {
  const otherId = thread.sellerId === profileId ? thread.buyerId : thread.sellerId;
  return PARTICIPANTS[otherId];
}

/** Whether this viewer is invoicing or being invoiced in this thread. */
export function roleInThread(thread: DemoThread, profileId: ProfileId): Party {
  return thread.sellerId === profileId ? 'seller' : 'buyer';
}

/** Maps the viewer's seat onto the fee-bearer vocabulary the cost engine uses. */
export function bearerSideOf(role: Party): FeeBearer {
  return role === 'seller' ? 'supplier' : 'buyer';
}

export function lastMessagePreview(thread: DemoThread): string {
  const last = thread.messages[thread.messages.length - 1];
  if (!last) return '';
  switch (last.kind) {
    case 'text': return last.text;
    case 'system': return last.text;
    case 'feePoll': return last.resolved ? 'Fee responsibility agreed' : 'Fee responsibility — awaiting a reply';
    case 'comparison': return 'Route comparison shared';
    case 'invoice': return `Invoice ${last.reference} sent`;
    case 'agreement': return 'Agreement ready to sign';
    case 'payment': return 'Payment recorded';
  }
}
