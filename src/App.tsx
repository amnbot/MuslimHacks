import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronRight, Copy, ExternalLink,
  FileText, Fingerprint, FlaskConical, LockKeyhole, MessagesSquare, Plus, RefreshCw, Scale,
  Send, ShieldCheck, Sparkles, Trash2, TriangleAlert, Wallet, X,
} from 'lucide-react';
import {
  buildSolanaPayUri, CLUSTER_LABEL, CLUSTER_SHORT_LABEL, createBusinessSigner, createInvoice,
  createInvoiceRecord, exportInvoiceRecord, formatUsdc, invoiceStatus, parseInvoiceRecord,
  parseUsdc, pinInvoiceRecord, signInvoiceRecord, totalUsdc,
  type BusinessSigner, type InvoiceLine, type InvoiceRecord,
} from './lib/business';
import { encryptRecord } from './lib/envelope';
import { NETWORK_FEE_NOTE } from './lib/funding';
import { calculateCosts, money, recommendRoute, type FeeBearer } from './lib/costs';
import {
  addressExplorerUrl, BASE_FEE_LAMPORTS, explorerUrl, FAUCET_SOL_URL, FAUCET_USDC_URL,
  getSolBalance, getUsdcBalance, LAMPORTS_PER_SOL, payUsdc, PaymentTimeoutError, TOKEN_ACCOUNT_RENT_LAMPORTS,
} from './lib/solana';
import {
  corridorOf, counterpartOf, DEMO_SETTLEMENT_MICROS, DEMO_SETTLEMENT_NOTE, DEMO_THREADS,
  DEVNET_NOTICE, lastMessagePreview, PARTICIPANTS, PROFILE_IDS, PROFILES, roleInThread, STAGE_LABEL,
  type DemoMessage, type DemoThread, type ProfileId,
} from './lib/demo';
import { markupPercent } from './lib/format';

type Tab = 'chats' | 'invoices' | 'wallet';
type Route = 'list' | 'thread' | 'create' | 'detail';
type Overlay = 'profile' | 'security' | 'routes' | 'share' | 'payment' | null;

type PaymentResult = {
  status: 'pending' | 'confirmed' | 'failed';
  amountMicros: number;
  fromLabel: string;
  fromAddress: string;
  toLabel: string;
  toAddress: string;
  signature: string | null;
  error: string | null;
  /** The recipient's live USDC balance, fetched right after confirmation. */
  recipientBalanceMicros: number | null;
  threadId: string | null;
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const clockTime = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
const sol = (lamports: number) => (lamports / LAMPORTS_PER_SOL).toFixed(6);
const displayDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const today = () => new Date().toISOString().slice(0, 10);

const CEDAR_LINES: InvoiceLine[] = [{ description: 'Organic extra virgin olive oil, 750ml', quantity: 480, unitPriceMicros: 13_890_000 }];

/**
 * The web twin of mobile/src/state/useWorkspace.ts. Same shared arithmetic, signing
 * and Solana client; only the platform APIs differ. Deliberately not persisted, so
 * every reload restores the seeded walkthrough.
 */
function useWorkspace() {
  const [ready, setReady] = useState(false);
  const [profileId, setProfileId] = useState<ProfileId>('amira');
  const [threads, setThreads] = useState<DemoThread[]>(() => clone(DEMO_THREADS));
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [recordsByProfile, setRecordsByProfile] = useState<Record<ProfileId, InvoiceRecord[]>>({ amira: [], bilal: [] });
  const [tab, setTab] = useState<Tab>('chats');
  const [route, setRoute] = useState<Route>('list');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [stress, setStress] = useState(0);
  const [balances, setBalances] = useState<{ sol: number; usdc: number; at: string } | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [encryptedExport, setEncryptedExport] = useState<{ envelope: string; key: string } | null>(null);

  const signers = useRef<Record<string, BusinessSigner>>({});
  const operation = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const profile = PROFILES[profileId];
  const records = recordsByProfile[profileId];
  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? null;
  const selected = records.find((record) => record.invoice.id === selectedId) ?? null;
  const visibleThreads = threads.filter((thread) => thread.visibleTo.includes(profileId));

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const getSigner = useCallback(async (name: string) => {
    signers.current[name] ??= await createBusinessSigner(name);
    return signers.current[name];
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const cedar = DEMO_THREADS.find((thread) => thread.id === 'cedar-sfax')!;
        const invoice = createInvoice({
          id: 'demo-cedar-sfax', createdAt: '2026-09-06T11:02:00.000Z',
          issuer: PROFILES.amira.businessName, customer: PROFILES.bilal.businessName,
          reference: cedar.invoice.id, dueDate: cedar.invoice.dueDate,
          note: 'Delivery 21–25 September, ex-works Sfax. Fees on the buyer, so the invoiced amount arrives in full.',
          recipientWallet: PROFILES.amira.wallet.address, network: 'solana-devnet', lines: CEDAR_LINES,
        });
        const signed = await signInvoiceRecord(await createInvoiceRecord(invoice), await getSigner(PROFILES.amira.businessName), 'issuer');
        if (alive.current) setRecordsByProfile({ amira: [signed], bilal: [clone(signed)] });
      } catch (caught) {
        if (alive.current) setError(messageOf(caught));
      } finally {
        if (alive.current) setReady(true);
      }
    })();
  }, [getSigner]);

  async function run(action: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true); setError('');
    try { await action(); } catch (caught) { setError(messageOf(caught)); }
    finally { operation.current = false; setBusy(false); }
  }

  const setRecords = (update: (current: InvoiceRecord[]) => InvoiceRecord[]) =>
    setRecordsByProfile((current) => ({ ...current, [profileId]: update(current[profileId]) }));

  const updateThread = (id: string, update: (thread: DemoThread) => DemoThread) =>
    setThreads((current) => current.map((thread) => thread.id === id ? update(thread) : thread));

  const appendMessage = (id: string, message: DemoMessage) =>
    updateThread(id, (thread) => ({ ...thread, messages: [...thread.messages, message] }));

  function switchProfile(next: ProfileId) {
    setProfileId(next); setTab('chats'); setRoute('list'); setActiveThreadId(null);
    setSelectedId(null); setOverlay(null); setError(''); setBalances(null); setStress(0); setPaymentResult(null);
    setNotice(`Now viewing as ${PROFILES[next].personName}.`);
  }

  function sendMessage(text: string) {
    const trimmed = text.trim().slice(0, 1500);
    if (!trimmed || !activeThreadId) return false;
    appendMessage(activeThreadId, { kind: 'text', id: crypto.randomUUID(), from: profileId, time: clockTime(), text: trimmed });
    return true;
  }

  function voteFeeBearer(messageId: string, bearer: FeeBearer) {
    if (!activeThreadId) return;
    updateThread(activeThreadId, (thread) => {
      const messages = thread.messages.map((message) => {
        if (message.kind !== 'feePoll' || message.id !== messageId) return message;
        const votes = { ...message.votes, [profileId]: bearer };
        const cast = Object.values(votes);
        const agreed = cast.length >= 2 && cast.every((value) => value === cast[0]);
        return { ...message, votes, resolved: agreed ? cast[0]! : null };
      });
      const poll = messages.find((message) => message.kind === 'feePoll' && message.id === messageId);
      const resolved = poll && poll.kind === 'feePoll' ? poll.resolved : null;
      return { ...thread, messages, bearer: resolved ?? thread.bearer };
    });
    setNotice(bearer === 'buyer' ? 'Recorded: the buyer covers downstream fees.' : 'Recorded: the supplier absorbs downstream fees.');
  }

  async function saveInvoice(input: Parameters<typeof createInvoice>[0]) {
    await run(async () => {
      const invoice = createInvoice({ ...input, network: 'solana-devnet' });
      const signed = await signInvoiceRecord(await createInvoiceRecord(invoice), await getSigner(profile.businessName), 'issuer');
      setRecords((current) => [signed, ...current]);
      if (activeThreadId) {
        appendMessage(activeThreadId, { kind: 'invoice', id: crypto.randomUUID(), from: profileId, time: clockTime(), reference: signed.invoice.reference });
        updateThread(activeThreadId, (thread) => ({ ...thread, stage: 'invoiced' }));
      }
      setSelectedId(signed.invoice.id); setTab('invoices'); setRoute('detail');
      setNotice('Invoice created and signed. Its fingerprint now binds these exact terms.');
    });
  }

  async function acknowledge() {
    if (!selected) return;
    await run(async () => {
      const signed = await signInvoiceRecord(selected, await getSigner(profile.businessName), 'customer');
      const pinned = await pinInvoiceRecord(records.find((record) => record.invoice.id === signed.invoice.id), signed);
      setRecords((current) => current.map((record) => record.invoice.id === pinned.invoice.id ? pinned : record));
      const thread = threads.find((entry) => entry.invoice.id === pinned.invoice.reference);
      if (thread) {
        appendMessage(thread.id, { kind: 'agreement', id: crypto.randomUUID(), from: profileId, time: clockTime() });
        updateThread(thread.id, (entry) => ({ ...entry, stage: 'agreed' }));
      }
      setNotice('Acknowledgement signed. Both signatures now verify against the same terms.');
    });
  }

  async function prepareExport() {
    if (!selected) return;
    await run(async () => {
      const verified = await parseInvoiceRecord(selected);
      setEncryptedExport(await encryptRecord(exportInvoiceRecord(verified)));
      setOverlay('share');
    });
  }

  async function checkAlteredCopy() {
    if (!selected) return;
    await run(async () => {
      const altered = clone(selected);
      altered.invoice.lines[0].unitPriceMicros += 1_000_000;
      altered.invoice.totalMicros += altered.invoice.lines[0].quantity * 1_000_000;
      try {
        await parseInvoiceRecord(altered);
        throw new Error('A tampered record was accepted. Do not trust this build.');
      } catch (caught) {
        setNotice(`Tampering rejected: ${messageOf(caught)}`);
      }
    });
  }

  const copy = (value: string, confirmation: string) =>
    run(async () => { await navigator.clipboard.writeText(value); setNotice(confirmation); });

  const refreshBalances = useCallback(async () => {
    setLoadingBalances(true);
    try {
      const [lamports, micros] = await Promise.all([getSolBalance(profile.wallet.address), getUsdcBalance(profile.wallet.address)]);
      if (!alive.current) return;
      setBalances({ sol: lamports, usdc: micros, at: clockTime() }); setError('');
    } catch (caught) {
      if (alive.current) setError(`Could not read the devnet balance. ${messageOf(caught)}`);
    } finally {
      if (alive.current) setLoadingBalances(false);
    }
  }, [profile.wallet.address]);

  useEffect(() => { if (ready && tab === 'wallet') void refreshBalances(); }, [ready, tab, refreshBalances]);

  /**
   * Submits a real devnet transfer and tracks it as a PaymentResult the whole way:
   * pending the instant it starts, then confirmed with a signature and the
   * recipient's live balance, or failed with the actual error. The modal opens
   * immediately so the button click is never followed by silence.
   */
  async function pay(recipientWallet: string, toLabel: string, threadId: string | null) {
    if (paying) return;
    setPaying(true); setError('');
    setPaymentResult({
      status: 'pending', amountMicros: DEMO_SETTLEMENT_MICROS,
      fromLabel: profile.personName, fromAddress: profile.wallet.address,
      toLabel, toAddress: recipientWallet, signature: null, error: null, recipientBalanceMicros: null, threadId,
    });
    setOverlay('payment');
    try {
      const result = await payUsdc({ from: profile.wallet, to: recipientWallet, amountMicros: DEMO_SETTLEMENT_MICROS });
      if (!alive.current) return;
      let recipientBalanceMicros: number | null = null;
      try { recipientBalanceMicros = await getUsdcBalance(recipientWallet); } catch { /* the balance is a bonus, not required to show the result */ }
      if (!alive.current) return;
      setPaymentResult((current) => current ? { ...current, status: 'confirmed', signature: result.signature, recipientBalanceMicros } : current);
      if (threadId) {
        appendMessage(threadId, { kind: 'payment', id: crypto.randomUUID(), from: profileId, time: clockTime(), amountMicros: DEMO_SETTLEMENT_MICROS, signature: result.signature });
        updateThread(threadId, (thread) => ({ ...thread, stage: 'paid' }));
      }
      setNotice('Confirmed on Solana devnet.');
      await refreshBalances();
    } catch (caught) {
      // A transaction that was broadcast but timed out while confirming still carries
      // a real signature; show it so the explorer link works even in that case.
      const signature = caught instanceof PaymentTimeoutError ? caught.signature : null;
      if (alive.current) {
        setError(messageOf(caught));
        setPaymentResult((current) => current ? { ...current, status: 'failed', error: messageOf(caught), signature } : current);
      }
    } finally {
      if (alive.current) setPaying(false);
    }
  }

  function closePaymentModal() {
    setOverlay(null);
  }

  function resetDemo() {
    setThreads(clone(DEMO_THREADS)); setActiveThreadId(null); setSelectedId(null);
    setOverlay(null); setRoute('list'); setTab('chats'); setStress(0); setError(''); setBalances(null); setPaymentResult(null);
    setNotice('Seeded conversations restored. Ready for another walkthrough.');
  }

  return {
    ready, profileId, profile, switchProfile, resetDemo, threads: visibleThreads, activeThread,
    setActiveThreadId, tab, setTab, route, setRoute, overlay, setOverlay, selected, setSelectedId,
    records, busy, paying, error, setError, notice, stress, setStress, balances, loadingBalances,
    sendMessage, voteFeeBearer, updateThread, saveInvoice, acknowledge, prepareExport,
    checkAlteredCopy, copy, refreshBalances, pay, encryptedExport, paymentResult, closePaymentModal,
  };
}
type Workspace = ReturnType<typeof useWorkspace>;

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={onClose} onClick={(event) => { if (event.target === ref.current) onClose(); }}>
    <div className="dialog-head"><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={21} /></button></div>
    <div className="dialog-body">{children}</div>
  </dialog>;
}

function NetworkTag({ network = 'solana-devnet' as const }: { network?: 'solana-mainnet-beta' | 'solana-devnet' }) {
  return <span className="network-tag"><span className="network-dot" />{CLUSTER_LABEL[network]}</span>;
}

const shortAddress = (value: string) => `${value.slice(0, 6)}…${value.slice(-6)}`;

/**
 * The full result of a devnet transfer: pending the instant it starts, then either a
 * confirmed signature with the recipient's live balance, or the real failure reason.
 * Nothing here is inferred — every field comes straight from the devnet RPC response.
 */
function PaymentModal({ workspace }: { workspace: Workspace }) {
  const result = workspace.paymentResult;
  if (!result) return null;
  return <Modal
    title={result.status === 'pending' ? 'Sending payment' : result.status === 'confirmed' ? 'Payment confirmed' : 'Payment failed'}
    onClose={workspace.closePaymentModal}
  >
    <div className={`payment-status is-${result.status}`}>
      {result.status === 'pending' && <RefreshCw size={20} className="spin" />}
      {result.status === 'confirmed' && <Check size={20} />}
      {result.status === 'failed' && <TriangleAlert size={20} />}
      <span>
        <strong>{result.status === 'pending' ? 'Submitting to Solana devnet…' : result.status === 'confirmed' ? 'Confirmed on Solana devnet' : 'Payment did not confirm'}</strong>
        <small>{result.status === 'pending' ? 'Building, signing and broadcasting the transaction.' : result.status === 'confirmed' ? 'The transfer landed on chain and was verified.' : 'See the details below.'}</small>
      </span>
    </div>

    <div className="payment-amount">
      <small>Amount</small>
      <strong>{formatUsdc(result.amountMicros)} <small>USDC</small></strong>
    </div>

    <div className="payment-parties">
      <div><small>From</small><strong>{result.fromLabel}</strong><code>{shortAddress(result.fromAddress)}</code></div>
      <div><small>To</small><strong>{result.toLabel}</strong><code>{shortAddress(result.toAddress)}</code></div>
    </div>

    {result.signature && <div className="payment-details">
      <p><strong>Transaction signature</strong></p>
      <code className="hash-line">{result.signature}</code>
      <a className="text-button" href={explorerUrl(result.signature)} target="_blank" rel="noreferrer">View on Solana Explorer <ExternalLink size={13} /></a>
      <button className="text-button" onClick={() => void workspace.copy(result.signature!, 'Transaction signature copied.')}><Copy size={14} /> Copy signature</button>
    </div>}

    {result.status === 'confirmed' && <div className="payment-recipient">
      <strong>{result.toLabel}'s wallet</strong>
      <p>{result.recipientBalanceMicros === null
        ? 'Balance could not be read right now — check the Wallet tab after switching profile.'
        : `Now holds ${formatUsdc(result.recipientBalanceMicros)} USDC on devnet.`}</p>
      <a className="text-button" href={addressExplorerUrl(result.toAddress)} target="_blank" rel="noreferrer">View recipient wallet <ExternalLink size={13} /></a>
    </div>}

    {result.status === 'failed' && <div className="error-banner" role="alert">
      <span>{result.error}{result.signature && ' The transaction was broadcast before this failure. It may still confirm later — check the explorer link above.'}</span>
    </div>}

    <div className="button-row">
      {result.status !== 'pending' && <button className="secondary" disabled={workspace.loadingBalances} onClick={() => void workspace.refreshBalances()}>Refresh my balance</button>}
      <button className="primary" disabled={result.status === 'pending'} onClick={workspace.closePaymentModal}>{result.status === 'pending' ? 'Waiting…' : 'Done'}</button>
    </div>
    <p className="fine">Solana devnet · test tokens have no financial value.</p>
  </Modal>;
}

function ErrorBanner({ error }: { error: string }) {
  return error ? <p className="error-banner" role="alert">{error}</p> : null;
}

// --- conversations ----------------------------------------------------------

function ThreadList({ workspace }: { workspace: Workspace }) {
  const open = workspace.threads.filter((thread) => thread.stage !== 'paid');
  const partners = new Set(workspace.threads.map((thread) => counterpartOf(thread, workspace.profileId).id));
  const savings = open.reduce((total, thread) => total + recommendRoute(thread.invoice, corridorOf(thread)).savingCad, 0);

  return <>
    <header className="page-heading">
      <h1>Conversations</h1>
      <p>{workspace.profile.role === 'seller' ? 'Your buyers, invoices and agreements.' : 'Your suppliers, invoices and agreements.'}</p>
    </header>
    <div className="tile-row">
      <div className="tile"><span>Open deals</span><strong>{open.length}</strong><small>{partners.size} trading partner{partners.size === 1 ? '' : 's'}</small></div>
      <div className="tile"><span>Avoidable fees</span><strong>{money(savings, 'CAD')}</strong><small>vs bank wire, across open deals</small></div>
    </div>
    <ul className="thread-list">
      {workspace.threads.map((thread) => {
        const other = counterpartOf(thread, workspace.profileId);
        const corridor = corridorOf(thread);
        return <li key={thread.id}>
          <button className="thread-row" onClick={() => { workspace.setActiveThreadId(thread.id); workspace.setRoute('thread'); }}>
            <span className="avatar" aria-hidden="true">{other.initials}</span>
            <span className="thread-main">
              <span className="thread-top"><strong>{other.businessName}</strong><span className={`status stage-${thread.stage}`}>{STAGE_LABEL[thread.stage]}</span></span>
              <small>{other.country} · {thread.sellerId === workspace.profileId ? 'You are selling' : 'You are buying'} · {corridor.buyerCurrency} → {corridor.sellerCurrency}</small>
              <span className="thread-preview">{lastMessagePreview(thread)}</span>
              <strong className="thread-amount">{money(thread.invoice.amountEur, corridor.sellerCurrency)}</strong>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </li>;
      })}
    </ul>
    <p className="fine"><FlaskConical size={15} aria-hidden="true" /> Synthetic demo conversations. The signatures, encryption and devnet settlement inside them are real.</p>
  </>;
}

function FeePoll({ message, thread, workspace }: { message: Extract<DemoMessage, { kind: 'feePoll' }>; thread: DemoThread; workspace: Workspace }) {
  const corridor = corridorOf(thread);
  const quote = corridor.quotes.find((option) => option.id === thread.quoteId) ?? corridor.quotes[0];
  const role = roleInThread(thread, workspace.profileId);
  const other = counterpartOf(thread, workspace.profileId);
  const outcome = (bearer: FeeBearer) => {
    const costs = calculateCosts(thread.invoice, quote, bearer);
    return role === 'seller'
      ? `You receive ${money(costs.recipientMinEur, corridor.sellerCurrency)}`
      : `You pay up to ${money(costs.totalMaxCad, corridor.buyerCurrency)}`;
  };
  return <div className="poll">
    <h3><Scale size={17} aria-hidden="true" /> {message.question}</h3>
    <p>A correspondent bank can take {money(quote.downstreamFeeEur.min, corridor.sellerCurrency)}–{money(quote.downstreamFeeEur.max, corridor.sellerCurrency)} out of this transfer. Deciding now means neither side discovers it later.</p>
    <div role="radiogroup" aria-label={message.question} className="poll-options">
      {(['buyer', 'supplier'] as FeeBearer[]).map((bearer) => {
        const chosen = message.votes[workspace.profileId] === bearer;
        return <button key={bearer} role="radio" aria-checked={chosen} className={`poll-option${chosen ? ' is-chosen' : ''}`} onClick={() => workspace.voteFeeBearer(message.id, bearer)}>
          <span className="radio" aria-hidden="true" />
          <span>
            <strong>{bearer === 'buyer' ? 'The buyer covers them' : 'The supplier absorbs them'}</strong>
            <small>{outcome(bearer)}</small>
          </span>
          {message.votes[other.id] === bearer && <span className="vote-chip">{PARTICIPANTS[other.id].personName.split(' ')[0]}</span>}
        </button>;
      })}
    </div>
    <p className={message.resolved ? 'poll-result is-agreed' : 'poll-result is-pending'}>
      {message.resolved
        ? <><Check size={15} aria-hidden="true" /> Agreed — {message.resolved === 'buyer' ? 'the buyer covers downstream fees, so the invoice arrives in full' : 'the supplier absorbs downstream fees'}.</>
        : 'Waiting for both sides to choose the same option.'}
    </p>
  </div>;
}

function ThreadMessage({ message, thread, workspace }: { message: DemoMessage; thread: DemoThread; workspace: Workspace }) {
  const corridor = corridorOf(thread);
  const outgoing = 'from' in message && message.from === workspace.profileId;
  const openInvoice = () => {
    const record = workspace.records.find((entry) => entry.invoice.reference === thread.invoice.id);
    if (record) { workspace.setSelectedId(record.invoice.id); workspace.setTab('invoices'); workspace.setRoute('detail'); }
    else workspace.setError('This conversation has no signed invoice yet.');
  };

  switch (message.kind) {
    case 'system': return <p className="timeline-note">{message.text}</p>;
    case 'text': return <div className={`bubble-row${outgoing ? ' is-out' : ''}`}>
      <div className="bubble"><p>{message.text}</p><small>{message.time}{outgoing && <CheckCheck size={12} aria-hidden="true" />}</small></div>
    </div>;
    case 'feePoll': return <FeePoll message={message} thread={thread} workspace={workspace} />;
    case 'comparison': {
      const best = recommendRoute(thread.invoice, corridor);
      return <button className="thread-card" onClick={() => workspace.setOverlay('routes')}>
        <span className="thread-card-icon"><Sparkles size={19} aria-hidden="true" /></span>
        <span><strong>Payment routes compared</strong><small>{best.lowestTotalCost.quote.name} costs the least overall — {money(best.savingCad, corridor.buyerCurrency)} less than a bank wire.</small></span>
        <ChevronRight size={18} aria-hidden="true" />
      </button>;
    }
    case 'invoice': return <button className="thread-card" onClick={openInvoice}>
      <span className="thread-card-icon"><FileText size={19} aria-hidden="true" /></span>
      <span><strong>Invoice {message.reference}</strong><small>{money(thread.invoice.amountEur, corridor.sellerCurrency)} · {thread.invoice.goods}</small></span>
      <ChevronRight size={18} aria-hidden="true" />
    </button>;
    case 'agreement': return <button className="thread-card" onClick={openInvoice}>
      <span className="thread-card-icon"><Check size={19} aria-hidden="true" /></span>
      <span><strong>{thread.stage === 'agreed' || thread.stage === 'paid' ? 'Agreement signed' : 'Agreement ready to sign'}</strong><small>Both businesses sign the same amount, terms, wallet and network.</small></span>
      <ChevronRight size={18} aria-hidden="true" />
    </button>;
    case 'payment': return <div className="thread-card is-static">
      <span className="thread-card-icon"><Wallet size={19} aria-hidden="true" /></span>
      <span>
        <strong>{formatUsdc(message.amountMicros)} USDC sent</strong>
        <small>{message.signature ? 'Confirmed on Solana devnet.' : 'Recorded in this demo conversation.'}</small>
        {message.signature && <a className="text-button" href={explorerUrl(message.signature)} target="_blank" rel="noreferrer">View on the explorer <ExternalLink size={13} /></a>}
      </span>
    </div>;
  }
}

function ThreadView({ workspace }: { workspace: Workspace }) {
  const thread = workspace.activeThread;
  const [draft, setDraft] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView(); }, [thread?.id, thread?.messages.length]);
  if (!thread) return null;

  const other = counterpartOf(thread, workspace.profileId);
  const corridor = corridorOf(thread);
  const role = roleInThread(thread, workspace.profileId);
  const recommendation = recommendRoute(thread.invoice, corridor);
  const quote = corridor.quotes.find((option) => option.id === thread.quoteId) ?? corridor.quotes[0];
  const costs = calculateCosts(thread.invoice, quote, thread.bearer);
  const canPay = role === 'buyer' && thread.sellerId in PROFILES && thread.stage !== 'paid';

  return <div className="thread-view">
    <header className="thread-head">
      <button className="icon-button" aria-label="Back to conversations" onClick={() => workspace.setRoute('list')}><ArrowLeft size={19} /></button>
      <span className="avatar" aria-hidden="true">{other.initials}</span>
      <span><strong>{other.businessName}</strong><small>{other.personName} · {other.country}</small></span>
      <button className="icon-button" aria-label="Compare payment routes" onClick={() => workspace.setOverlay('routes')}><Scale size={19} /></button>
    </header>

    <ErrorBanner error={workspace.error} />

    <div className="timeline">
      <p className="timeline-note">{thread.subject} · synthetic demo conversation</p>
      {thread.messages.map((message) => <ThreadMessage key={message.id} message={message} thread={thread} workspace={workspace} />)}
      <div ref={bottom} />
    </div>

    <div className="thread-hinge">
      <div className="hinge-row">
        <span>
          <small>{role === 'seller' ? 'You receive, at least' : 'You pay, at most'}</small>
          <strong>{role === 'seller' ? money(costs.recipientMinEur, corridor.sellerCurrency) : money(costs.totalMaxCad, corridor.buyerCurrency)}</strong>
          <small>via {quote.name} · fees on the {thread.bearer === 'buyer' ? 'buyer' : 'supplier'}</small>
        </span>
        <button className="secondary" onClick={() => workspace.setOverlay('routes')}>Compare <ArrowRight size={16} /></button>
      </div>
      {quote.id !== recommendation.lowestTotalCost.quote.id && (
        <p className="hinge-nudge"><Sparkles size={14} aria-hidden="true" /> {recommendation.lowestTotalCost.quote.name} would cost {money(recommendation.savingCad, corridor.buyerCurrency)} less overall.</p>
      )}
      {thread.stage === 'negotiating' && role === 'seller' && (
        <button className="primary" onClick={() => { workspace.setTab('invoices'); workspace.setRoute('create'); }}><FileText size={17} /> Create the invoice</button>
      )}
      {canPay && <>
        <button className="primary" disabled={workspace.paying} onClick={() => void workspace.pay(PROFILES[thread.sellerId as ProfileId].wallet.address, PROFILES[thread.sellerId as ProfileId].personName, thread.id)}>
          <ArrowUpRight size={17} /> {workspace.paying ? 'Confirming on devnet…' : `Pay ${formatUsdc(DEMO_SETTLEMENT_MICROS)} USDC on devnet`}
        </button>
        <p className="fine">{DEMO_SETTLEMENT_NOTE}</p>
      </>}
    </div>

    <form className="composer" onSubmit={(event) => { event.preventDefault(); if (workspace.sendMessage(draft)) setDraft(''); }}>
      <input aria-label={`Message ${other.personName}`} placeholder={`Message ${other.personName.split(' ')[0]}…`} value={draft} maxLength={1500} onChange={(event) => setDraft(event.target.value)} />
      <button className="primary" type="submit" disabled={!draft.trim()} aria-label="Send message"><Send size={17} /></button>
    </form>
  </div>;
}

// --- routes -----------------------------------------------------------------

function RoutesPanel({ workspace }: { workspace: Workspace }) {
  const thread = workspace.activeThread;
  if (!thread) return null;
  const corridor = corridorOf(thread);
  const role = roleInThread(thread, workspace.profileId);
  const recommendation = recommendRoute(thread.invoice, corridor);
  const best = recommendation.lowestTotalCost;
  const quote = corridor.quotes.find((option) => option.id === thread.quoteId) ?? corridor.quotes[0];
  const costs = calculateCosts(thread.invoice, quote, thread.bearer);
  const scenario = calculateCosts(thread.invoice, quote, thread.bearer, workspace.stress);
  const shortfall = thread.invoice.amountEur - costs.recipientMinEur;
  const buyerMoney = (value: number) => money(value, corridor.buyerCurrency);
  const sellerMoney = (value: number) => money(value, corridor.sellerCurrency);

  return <>
    <p>{sellerMoney(thread.invoice.amountEur)} due · {corridor.buyerCountry} to {corridor.sellerCountry}</p>
    <p className="fine"><FlaskConical size={14} aria-hidden="true" /> Synthetic rates and fees, priced end to end. Not a live quote or provider offer.</p>

    <div className="best-route">
      <Sparkles size={18} aria-hidden="true" />
      <span>
        <strong>{best.quote.name} costs the least overall</strong>
        <small>{buyerMoney(recommendation.savingCad)} less lost to intermediaries than a bank wire, and the supplier receives {sellerMoney(best.costs.recipientMinEur)}.</small>
      </span>
    </div>

    <div role="radiogroup" aria-label="Payment route" className="route-options">
      {corridor.quotes.map((option) => {
        const result = calculateCosts(thread.invoice, option, thread.bearer);
        const active = quote.id === option.id;
        return <button key={option.id} role="radio" aria-checked={active} className={`route-option${active ? ' is-chosen' : ''}`}
          onClick={() => workspace.updateThread(thread.id, (entry) => ({ ...entry, quoteId: option.id }))}>
          <span className="radio" aria-hidden="true" />
          <span className="route-body">
            <span className="route-title"><strong>{option.name}</strong>{option.id === best.quote.id && <span className="status">Lowest total cost</span>}</span>
            <span className="route-pair">
              <span><small>Buyer pays</small><strong>{buyerMoney(result.totalMaxCad)}</strong></span>
              <span><small>Supplier receives</small><strong>{sellerMoney(result.recipientMinEur)}</strong></span>
            </span>
            <small>{markupPercent(option)}% FX markup · {option.downstreamFeeEur.max === 0 ? 'no intermediary deduction' : `${sellerMoney(option.downstreamFeeEur.min)} – ${sellerMoney(option.downstreamFeeEur.max)} deducted in transit`}</small>
            <small>{option.delivery}</small>
          </span>
        </button>;
      })}
    </div>

    <div className={shortfall <= 0 ? 'callout is-resolved' : 'callout'}>
      {shortfall <= 0 ? <Check size={18} aria-hidden="true" /> : <TriangleAlert size={18} aria-hidden="true" />}
      <span>
        <strong>{shortfall <= 0 ? `The supplier receives the full ${sellerMoney(thread.invoice.amountEur)}.` : `The supplier could receive ${sellerMoney(costs.recipientMinEur)}.`}</strong>
        <small>{shortfall <= 0
          ? (thread.bearer === 'buyer' && costs.feeReserveCad > 0
            ? `The buyer sets aside up to ${buyerMoney(costs.feeReserveCad)} for downstream fees. Final charges still need confirming.`
            : 'No correspondent bank stands between the two wallets on this route.')
          : `That is up to ${sellerMoney(shortfall)} short of the invoice. Who covers the difference?`}</small>
      </span>
    </div>

    <fieldset className="fee-choice">
      <legend>Who covers downstream fees?</legend>
      {(['supplier', 'buyer'] as FeeBearer[]).map((bearer) => (
        <label key={bearer} className={thread.bearer === bearer ? 'is-chosen' : ''}>
          <input type="radio" name="bearer" checked={thread.bearer === bearer} onChange={() => workspace.updateThread(thread.id, (entry) => ({ ...entry, bearer }))} />
          <span><strong>{bearer === 'buyer' ? 'Buyer' : 'Supplier'}</strong><small>{bearer === 'buyer' ? 'Budget for the full invoice' : 'Deducted on arrival'}</small></span>
        </label>
      ))}
    </fieldset>

    <details className="cost-lines">
      <summary>Where every unit goes</summary>
      <dl>
        <div><dt>Invoice at reference rate<small>1 {corridor.sellerCurrency} = {quote.referenceRate.toFixed(4)} {corridor.buyerCurrency}</small></dt><dd>{buyerMoney(costs.principalCad)}</dd></div>
        <div><dt>Exchange-rate markup<small>{markupPercent(quote)}% above mid-market</small></dt><dd>{buyerMoney(costs.fxMarkupCad)}</dd></div>
        <div><dt>Transfer and network fee</dt><dd>{buyerMoney(costs.transferFeeCad)}</dd></div>
        <div><dt>Downstream fees · estimated<small>{quote.downstreamFeeEur.max === 0 ? 'no bank in the middle' : thread.bearer === 'buyer' ? 'covered by the buyer' : 'deducted from the supplier'}</small></dt>
          <dd>{quote.downstreamFeeEur.max === 0 ? 'None' : `${sellerMoney(quote.downstreamFeeEur.min)} – ${sellerMoney(quote.downstreamFeeEur.max)}`}</dd></div>
        <div className="total"><dt>Buyer total outlay</dt><dd>{buyerMoney(costs.totalMinCad)} – {buyerMoney(costs.totalMaxCad)}</dd></div>
        <div className="total"><dt>Supplier receives</dt><dd>{sellerMoney(costs.recipientMinEur)} – {sellerMoney(costs.recipientMaxEur)}</dd></div>
      </dl>
      <p className="fine">{quote.source}</p>
    </details>

    <details className="cost-lines">
      <summary>What if the exchange rate changes?</summary>
      <p className="fine">A scenario, never a forecast. Positive values mean the {corridor.sellerCurrency} costs more {corridor.buyerCurrency}. This does not change your agreement.</p>
      <label className="stress-label" htmlFor="stress">Change in {corridor.buyerCurrency} cost per {corridor.sellerCurrency}: <strong>{workspace.stress > 0 ? '+' : ''}{workspace.stress}%</strong></label>
      <input id="stress" type="range" min={-10} max={10} step={1} value={workspace.stress} onChange={(event) => workspace.setStress(Number(event.target.value))} />
      <div className="scenario-row">
        <span><small>Buyer outlay, upper estimate</small><strong>{buyerMoney(scenario.totalMaxCad)}</strong></span>
        <span><small>{role === 'seller' ? 'You still receive' : 'Estimated shipment margin'}</small>
          <strong>{role === 'seller' ? sellerMoney(scenario.recipientMinEur) : buyerMoney(scenario.marginMinCad)}</strong></span>
      </div>
    </details>

    <p className="fine">USDC only avoids the second conversion while the supplier is paid in USDC and holds it. Converting later reintroduces a cash-out spread, which the USDC route line prices in.</p>
    <p className="fine">Estimates are synthetic. No exchange rate is locked, and no money moves from this screen.</p>
  </>;
}

// --- invoices ---------------------------------------------------------------

function InvoiceListPage({ workspace }: { workspace: Workspace }) {
  const name = workspace.profile.businessName;
  return <>
    <header className="page-heading"><h1>Invoices</h1><p>Business terms, signed and ready to share.</p></header>
    <ErrorBanner error={workspace.error} />
    {workspace.records.length === 0
      ? <div className="empty-state"><FileText size={36} /><h2>No invoices yet</h2><p>Open a conversation and create one from the terms you agreed there.</p></div>
      : <ul className="invoice-list">
        {workspace.records.map((record) => {
          const acknowledged = invoiceStatus(record) === 'acknowledged';
          const issued = record.invoice.issuer === name;
          return <li key={record.invoice.id}>
            <button className="invoice-row" onClick={() => { workspace.setSelectedId(record.invoice.id); workspace.setRoute('detail'); }}>
              <span className="invoice-row-main">
                <strong>{issued ? record.invoice.customer : record.invoice.issuer}</strong>
                <small>{issued ? 'Issued' : 'Received'} · {record.invoice.reference}</small>
                <small>{CLUSTER_SHORT_LABEL[record.invoice.payment.network]} · Due {displayDate(record.invoice.dueDate)}</small>
              </span>
              <span className="invoice-row-amount">
                <strong>{formatUsdc(record.invoice.totalMicros)} USDC</strong>
                <small>{acknowledged ? 'Acknowledged' : 'Awaiting acknowledgement'}</small>
              </span>
            </button>
          </li>;
        })}
      </ul>}
  </>;
}

type DraftLine = { id: number; description: string; quantity: string; price: string };

function CreateInvoicePage({ workspace }: { workspace: Workspace }) {
  const thread = workspace.activeThread;
  const draft = thread?.draft;
  const counterpart = thread ? PARTICIPANTS[thread.buyerId] : undefined;
  const [customer, setCustomer] = useState(counterpart?.businessName ?? '');
  const [reference, setReference] = useState(draft?.reference ?? `INV-${String(workspace.records.length + 1).padStart(3, '0')}`);
  const [dueDate, setDueDate] = useState(draft?.dueDate ?? today());
  const [wallet, setWallet] = useState(workspace.profile.wallet.address);
  const [note, setNote] = useState(() => {
    if (!thread) return '';
    const quote = corridorOf(thread).quotes.find((option) => option.id === thread.quoteId);
    const terms = `Agreed route: ${quote?.name ?? thread.quoteId}. Downstream fees are covered by the ${thread.bearer === 'buyer' ? 'buyer, so the invoiced amount arrives in full' : 'supplier, and are deducted on arrival'}.`;
    return draft?.note ? `${draft.note}\n${terms}` : terms;
  });
  const [lines, setLines] = useState<DraftLine[]>(
    draft?.lines.map((line, index) => ({ id: index + 1, description: line.description, quantity: String(line.quantity), price: line.unitPriceUsdc }))
      ?? [{ id: 1, description: '', quantity: '1', price: '' }]);
  const [localError, setLocalError] = useState('');

  const parseLines = (): InvoiceLine[] => lines.map((line) => ({ description: line.description.trim(), quantity: Number(line.quantity), unitPriceMicros: parseUsdc(line.price) }));
  let total = '—';
  try { total = formatUsdc(totalUsdc(parseLines())); } catch { /* incomplete lines have no total yet */ }
  const update = (id: number, key: keyof Omit<DraftLine, 'id'>, value: string) =>
    setLines((current) => current.map((line) => line.id === id ? { ...line, [key]: value } : line));

  return <>
    <button className="back-button" onClick={() => workspace.setRoute('list')}><ArrowLeft size={16} /> Invoices</button>
    <header className="page-heading">
      <h1>Create invoice</h1>
      <p>Issued by {workspace.profile.businessName}{counterpart ? ` · for ${counterpart.businessName}` : ''}</p>
      {!!draft && <p className="fine">Prefilled from the terms agreed in your conversation. Check every figure before signing.</p>}
    </header>
    <form className="invoice-form" onSubmit={async (event) => {
      event.preventDefault(); setLocalError('');
      try {
        await workspace.saveInvoice({ issuer: workspace.profile.businessName, customer: customer.trim(), reference: reference.trim(), dueDate: dueDate.trim(), note: note.trim(), recipientWallet: wallet.trim(), lines: parseLines() });
      } catch (caught) { setLocalError(messageOf(caught)); }
    }}>
      <div className="form-section">
        <label>Customer business name<input value={customer} onChange={(event) => setCustomer(event.target.value)} maxLength={120} required /></label>
        <div className="form-grid">
          <label>Invoice reference<input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={80} required /></label>
          <label>Due date<input value={dueDate} onChange={(event) => setDueDate(event.target.value)} placeholder="YYYY-MM-DD" maxLength={10} required /></label>
        </div>
      </div>
      <h2>Goods &amp; services <small>Prices in USDC</small></h2>
      {lines.map((line, index) => <div key={line.id} className="line-editor">
        <div className="line-header"><strong>Item {index + 1}</strong>
          {lines.length > 1 && <button type="button" className="icon-button" aria-label={`Remove item ${index + 1}`} onClick={() => setLines((current) => current.filter((entry) => entry.id !== line.id))}><Trash2 size={16} /></button>}
        </div>
        <label>Description<input value={line.description} onChange={(event) => update(line.id, 'description', event.target.value)} maxLength={300} required /></label>
        <div className="form-grid">
          <label>Quantity<input value={line.quantity} onChange={(event) => update(line.id, 'quantity', event.target.value)} inputMode="decimal" required /></label>
          <label>Unit price · USDC<input value={line.price} onChange={(event) => update(line.id, 'price', event.target.value)} inputMode="decimal" placeholder="0.00" required /></label>
        </div>
      </div>)}
      <button type="button" className="text-button" disabled={lines.length >= 50} onClick={() => setLines((current) => [...current, { id: Math.max(...current.map((line) => line.id)) + 1, description: '', quantity: '1', price: '' }])}><Plus size={15} /> Add line item</button>
      <div className="invoice-total"><span>Invoice total</span><strong>{total} <small>USDC</small></strong></div>
      <div className="form-section">
        <label>Your receiving Solana wallet<input value={wallet} onChange={(event) => setWallet(event.target.value)} maxLength={44} required /></label>
        <label>Terms &amp; context<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={4} /></label>
        <NetworkTag />
        <ErrorBanner error={localError || workspace.error} />
        <button className="primary" type="submit" disabled={workspace.busy}><Fingerprint size={17} /> {workspace.busy ? 'Creating & signing…' : 'Create & sign invoice'}</button>
        <p className="fine">Signing binds these details to this device's signing key. It does not move money.</p>
      </div>
    </form>
  </>;
}

function InvoiceDetailPage({ workspace }: { workspace: Workspace }) {
  const [consent, setConsent] = useState(false);
  const [details, setDetails] = useState(false);
  const record = workspace.selected;
  if (!record) return null;
  const invoice = record.invoice;
  const acknowledged = invoiceStatus(record) === 'acknowledged';
  const isIssuer = invoice.issuer === workspace.profile.businessName;
  const isCustomer = invoice.customer === workspace.profile.businessName && !isIssuer;

  return <>
    <button className="back-button" onClick={() => workspace.setRoute('list')}><ArrowLeft size={16} /> All invoices</button>
    <header className="record-heading">
      <h1>{invoice.reference}</h1>
      <span className={acknowledged ? 'status is-signed' : 'status'}>{acknowledged ? 'Acknowledged' : 'Issuer signed'}</span>
    </header>
    <NetworkTag network={invoice.payment.network} />
    <ErrorBanner error={workspace.error} />

    <article className="invoice-paper">
      <div className="parties">
        <div><span>From</span><strong>{invoice.issuer}</strong></div>
        <div><span>Bill to</span><strong>{invoice.customer}</strong></div>
        <div><span>Due</span><strong>{displayDate(invoice.dueDate)}</strong></div>
      </div>
      {invoice.lines.map((line, index) => <div key={index} className="line-item">
        <span><strong>{line.description}</strong><small>{line.quantity} × {formatUsdc(line.unitPriceMicros)} USDC</small></span>
        <strong>{formatUsdc(totalUsdc([line]))}</strong>
      </div>)}
      <div className="invoice-total"><span>Total due</span><strong>{formatUsdc(invoice.totalMicros)} <small>USDC</small></strong></div>
      {!!invoice.note && <div className="invoice-note"><strong>Terms &amp; context</strong><p>{invoice.note}</p></div>}
    </article>

    <section className="signature-section">
      <h2>A shared, signed record</h2>
      <p>{acknowledged ? 'Both signatures verify against these invoice details.' : isCustomer ? 'Review the invoice, then add your acknowledgement.' : 'Your invoice is signed and ready to share.'}</p>
      {isCustomer && !acknowledged && <>
        <label className="consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I have reviewed and acknowledge this invoice.</label>
        <button className="primary" disabled={workspace.busy || !consent} onClick={() => void workspace.acknowledge()}><Fingerprint size={17} /> Sign acknowledgement</button>
      </>}
      <button className="secondary" disabled={workspace.busy} onClick={() => void workspace.prepareExport()}><LockKeyhole size={17} /> Share encrypted record</button>
      <button className="text-button" onClick={() => setDetails((value) => !value)}><ShieldCheck size={15} /> {details ? 'Hide' : 'View'} signature details</button>
      {details && <div className="payment-details">
        <p>SHA-256 fingerprint</p><code className="hash-line">{record.hash}</code>
        <p className="fine">ECDSA P-256 signatures: {record.signatures.length} of 2. Signatures establish possession of a signing key; names and wallets are self-declared.</p>
        <button className="text-button" onClick={() => void workspace.copy(record.hash, 'Invoice fingerprint copied.')}><Copy size={15} /> Copy fingerprint</button>
        <button className="text-button" onClick={() => void workspace.checkAlteredCopy()}><ShieldCheck size={15} /> Test a tampered copy</button>
      </div>}
    </section>

    <section className="payment-strip">
      <h2>Payment</h2>
      <NetworkTag network={invoice.payment.network} />
      <p>Invoice total: {formatUsdc(invoice.totalMicros)} USDC to {invoice.issuer}. SANAD charges no payment fee.</p>
      <p className="fine">{NETWORK_FEE_NOTE}</p>
      {isCustomer && <>
        <button className="primary" disabled={workspace.busy || workspace.paying} onClick={() => void workspace.pay(invoice.payment.recipientWallet, invoice.issuer, workspace.threads.find((entry) => entry.invoice.id === invoice.reference)?.id ?? null)}>
          <ArrowUpRight size={17} /> {workspace.paying ? 'Confirming on devnet…' : `Pay ${formatUsdc(DEMO_SETTLEMENT_MICROS)} USDC on devnet`}
        </button>
        <p className="fine">{DEMO_SETTLEMENT_NOTE} Nothing is marked paid until the network confirms it.</p>
      </>}
      <div className="payment-details">
        <div className="address-row"><span>Recipient wallet</span><code>{invoice.payment.recipientWallet}</code></div>
        <div className="address-row"><span>USDC mint</span><code>{invoice.payment.mint}</code></div>
        <button className="text-button" onClick={() => void workspace.copy(buildSolanaPayUri(invoice), 'Solana Pay request copied.')}><Copy size={15} /> Copy payment request</button>
        <a className="text-button" href={addressExplorerUrl(invoice.payment.recipientWallet)} target="_blank" rel="noreferrer">View receiving wallet <ExternalLink size={13} /></a>
        <p className="fine">{DEVNET_NOTICE}</p>
      </div>
    </section>
  </>;
}

function WalletPage({ workspace }: { workspace: Workspace }) {
  const address = workspace.profile.wallet.address;
  const balances = workspace.balances;
  return <>
    <header className="page-heading"><h1>Wallet</h1><p>{workspace.profile.businessName}</p></header>
    <NetworkTag />
    <p className="callout"><TriangleAlert size={17} aria-hidden="true" /> {DEVNET_NOTICE}</p>
    <ErrorBanner error={workspace.error} />

    <div className="balance-card">
      <small>USDC balance</small>
      <strong>{balances ? formatUsdc(balances.usdc) : '—'}</strong>
      <div className="row-network">
        <small>{balances ? `${sol(balances.sol)} SOL for network fees` : 'Not loaded'}</small>
        <small>{balances ? `as of ${balances.at}` : ''}</small>
      </div>
      <button className="secondary" disabled={workspace.loadingBalances} onClick={() => void workspace.refreshBalances()}>
        <RefreshCw size={16} /> {workspace.loadingBalances ? 'Reading devnet…' : 'Refresh from devnet'}
      </button>
    </div>

    <section className="wallet-receive">
      <h2>Receiving address</h2>
      <code className="hash-line">{address}</code>
      <button className="text-button" onClick={() => void workspace.copy(address, 'Devnet address copied.')}><Copy size={15} /> Copy address</button>
      <a className="text-button" href={addressExplorerUrl(address)} target="_blank" rel="noreferrer">View on the Solana explorer <ExternalLink size={13} /></a>
      <p className="fine">Derived on this device from a published demo label, so every device agrees on it without a server. Never derive a wallet holding real value this way.</p>
    </section>

    <section className="funding-section">
      <h2>Fund this wallet</h2>
      <a className="primary" href={FAUCET_USDC_URL} target="_blank" rel="noreferrer">Open the USDC faucet <ArrowUpRight size={16} /></a>
      <a className="secondary" href={FAUCET_SOL_URL} target="_blank" rel="noreferrer">Open the SOL faucet <ArrowUpRight size={16} /></a>
      <p className="fine">Circle's faucet sends test USDC to any Solana devnet address. Paste the address above.</p>
    </section>

    <section className="funding-section">
      <h2>What a payment costs</h2>
      <dl className="cost-lines">
        <div><dt>SANAD fee</dt><dd>0.00</dd></div>
        <div><dt>Solana base network fee</dt><dd>{sol(BASE_FEE_LAMPORTS)} SOL</dd></div>
        <div><dt>New recipient token account, if needed</dt><dd>{sol(TOKEN_ACCOUNT_RENT_LAMPORTS)} SOL</dd></div>
      </dl>
      <p className="fine">The token-account deposit is refundable when that account is closed. A priority fee may be added at busy times, so treat these as the floor, not the final cost.</p>
    </section>
  </>;
}

// --- shell ------------------------------------------------------------------

const TABS: { value: Tab; label: string; icon: typeof FileText }[] = [
  { value: 'chats', label: 'Chats', icon: MessagesSquare },
  { value: 'invoices', label: 'Invoices', icon: FileText },
  { value: 'wallet', label: 'Wallet', icon: Wallet },
];

export default function App() {
  const workspace = useWorkspace();
  if (!workspace.ready) return <div className="loading" role="status">Opening your workspace…</div>;

  const page = workspace.tab === 'wallet' ? <WalletPage workspace={workspace} />
    : workspace.tab === 'invoices'
      ? (workspace.route === 'create' ? <CreateInvoicePage workspace={workspace} />
        : workspace.route === 'detail' && workspace.selected ? <InvoiceDetailPage workspace={workspace} />
          : <InvoiceListPage workspace={workspace} />)
      : workspace.route === 'thread' && workspace.activeThread ? <ThreadView workspace={workspace} />
        : <ThreadList workspace={workspace} />;

  return <div className="app-shell">
    <header className="topbar">
      <span className="wordmark"><strong>SANAD</strong><span>سند</span></span>
      <button className="profile-button" onClick={() => workspace.setOverlay('profile')} aria-label={`Signed in as ${workspace.profile.personName}. Switch demo profile.`}>
        <span className="avatar" aria-hidden="true">{workspace.profile.initials}</span>
        <span><strong>{workspace.profile.personName.split(' ')[0]}</strong><small>{workspace.profile.role === 'seller' ? 'Seller' : 'Importer'}</small></span>
      </button>
      <button className="icon-button" aria-label="Business profile and privacy" onClick={() => workspace.setOverlay('security')}><ShieldCheck size={20} /></button>
    </header>

    <div className="desktop-nav">
      <span className="wordmark"><strong>SANAD</strong><span>سند</span></span>
      <p className="nav-description">Business, in agreement.</p>
      <nav aria-label="Sections">
        {TABS.map(({ value, label, icon: Icon }) => (
          <button key={value} aria-current={workspace.tab === value ? 'page' : undefined} onClick={() => { workspace.setTab(value); workspace.setRoute('list'); workspace.setError(''); }}>
            <Icon size={19} /> {label}
          </button>
        ))}
      </nav>
    </div>

    <div className="main-shell"><main>{page}</main></div>

    <nav className="bottom-nav" aria-label="Sections">
      {TABS.map(({ value, label, icon: Icon }) => (
        <button key={value} aria-current={workspace.tab === value ? 'page' : undefined} onClick={() => { workspace.setTab(value); workspace.setRoute('list'); workspace.setError(''); }}>
          <Icon size={20} /> {label}
        </button>
      ))}
    </nav>

    {workspace.notice && <p className="toast" role="status">{workspace.notice}</p>}

    {workspace.overlay === 'routes' && <Modal title="Payment routes" onClose={() => workspace.setOverlay(null)}><RoutesPanel workspace={workspace} /></Modal>}
    {workspace.overlay === 'profile' && <Modal title="Demo profile" onClose={() => workspace.setOverlay(null)}>
      <p>Both businesses are already signed in for this walkthrough. Switch seats to see the same deal from the other side.</p>
      <div className="profile-options">
        {PROFILE_IDS.map((id) => {
          const option = PROFILES[id];
          return <button key={id} className={`profile-option${workspace.profileId === id ? ' is-chosen' : ''}`} onClick={() => { workspace.switchProfile(id); workspace.setOverlay(null); }}>
            <span className="avatar" aria-hidden="true">{option.initials}</span>
            <span>
              <strong>{option.personName}</strong>
              <small>{option.businessName} · {option.country}</small>
              <small>{option.role === 'seller' ? 'Sells and invoices' : 'Buys and pays'}</small>
              <code>{option.wallet.address}</code>
            </span>
            {workspace.profileId === id && <CheckCheck size={18} />}
          </button>;
        })}
      </div>
      <button className="secondary" onClick={() => { workspace.resetDemo(); }}>Restore the seeded conversations</button>
    </Modal>}
    {workspace.overlay === 'security' && <Modal title="Your records & privacy" onClose={() => workspace.setOverlay(null)}>
      <div className="security-highlight"><FlaskConical size={20} /><span><strong>What is real, and what is staged</strong><p>The conversations, participants, rates and fee estimates are synthetic. The fingerprints, signatures, encryption and the Solana devnet transfer are genuine. Each device builds and signs its own copy of the seeded invoice, so devices have not exchanged or verified each other's keys.</p></span></div>
      <div className="security-highlight"><ShieldCheck size={20} /><span><strong>Changes leave a trace</strong><p>Each invoice has a SHA-256 fingerprint and ECDSA P-256 signatures. Changing a signed amount, name, line item or payment wallet breaks verification.</p></span></div>
      <div className="security-highlight"><LockKeyhole size={20} /><span><strong>Encrypted when you share</strong><p>Shared files use AES-256-GCM with a fresh random key and nonce. The key is never included in the file.</p></span></div>
      <div className="security-highlight"><FileText size={20} /><span><strong>Know what stays public</strong><p>Records live in memory for this session only. Solana transfers, addresses and amounts are public on-chain; file encryption does not hide them.</p></span></div>
      <p className="fine">The demo wallets are derived from labels published in this repository. That is safe only because they are devnet keys with no financial value.</p>
    </Modal>}
    {workspace.overlay === 'share' && workspace.encryptedExport && <Modal title="Share encrypted record" onClose={() => workspace.setOverlay(null)}>
      <p>Your signed invoice is encrypted with AES-256-GCM. Send the encrypted record first, then send its decryption key through a separate trusted channel.</p>
      <button className="secondary" onClick={() => void workspace.copy(workspace.encryptedExport!.envelope, 'Encrypted invoice copied.')}><Copy size={16} /> Copy encrypted record</button>
      <p>Separate decryption key</p>
      <code className="hash-line">{workspace.encryptedExport.key}</code>
      <button className="text-button" onClick={() => void workspace.copy(workspace.encryptedExport!.key, 'Decryption key copied. Share it separately.')}><Copy size={15} /> Copy decryption key</button>
      <p className="fine">Anyone with both the file and the key can read the invoice. Reopening this dialog creates a new encrypted file and key.</p>
    </Modal>}
    {workspace.overlay === 'payment' && <PaymentModal workspace={workspace} />}
  </div>;
}
