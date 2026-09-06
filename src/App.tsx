import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronDown, ChevronRight, CircleHelp, Coins, Download, ExternalLink, FileCheck2, FileText, Fingerprint, FlaskConical, Globe2, Leaf, LockKeyhole, MessageSquare, RotateCcw, Send, ShieldCheck, SlidersHorizontal, Users, X, AlertTriangle, Printer, Upload } from 'lucide-react';
import { calculateCosts, calculateUsdcBreakdown, DEMO_INVOICE, DEMO_QUOTES, USDC_ASSUMPTIONS, money, validateInvoice, type FeeBearer, type Invoice } from './lib/costs';
import { createAgreement, createSigner, exportAgreement, mergeAgreements, signAgreement, verifyAgreement, type Agreement, type PartyId, type Signer } from './lib/agreement';

type ChatMessage = { id: string; from: PartyId; text: string; time: string };
type Screen = 'chat' | 'finance';
type ModalKind = 'guide' | 'sources' | 'verify' | 'edit' | 'reset' | 'revise' | 'usdc' | null;
const names = { buyer: 'Bilal Mansouri', supplier: 'Amira Ben Youssef' };
const initialMessages: ChatMessage[] = [
  { id: 'seed-1', from: 'supplier', text: 'Salam Bilal! Your September harvest order is ready. Here is the invoice for the 480 bottles.', time: '10:24' },
  { id: 'seed-2', from: 'buyer', text: 'Wa alaykum salam, Amira. Looks good. I’ll arrange the €6,000 payment before Friday.', time: '10:26' },
  { id: 'seed-3', from: 'supplier', text: 'Perfect. Just one thing — we need the full €6,000 to arrive. Last time the bank deducted fees.', time: '10:27' },
];
const eur = (value: number) => money(value, 'EUR');
const cad = (value: number) => money(value, 'CAD');
const range = (low: number, high: number, currency = 'CAD') => low === high ? money(low, currency) : `${money(low, currency)} – ${money(high, currency)}`;

function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className={`dialog ${wide ? 'dialog-wide' : ''}`} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="dialog-head"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>
    <div className="dialog-content">{children}</div>
  </dialog>;
}

function Counterseal({ state = 'open', size = 28 }: { state?: 'open' | 'aligned' | 'closed'; size?: number }) {
  return <svg className={`counterseal counterseal-${state}`} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <path strokeDasharray={state === 'open' ? '6 4' : state === 'aligned' ? '14 2' : undefined} d="M16 2 20 8 27 5 24 12 30 16 24 20 27 27 20 24 16 30 12 24 5 27 8 20 2 16 8 12 5 5 12 8Z" />
    <path strokeDasharray={state === 'open' ? '4 5' : state === 'aligned' ? '11 2' : undefined} d="M16 7 21 11 25 16 21 21 16 25 11 21 7 16 11 11ZM8 16h4l4-4 4 4h4M8 16h4l4 4 4-4h4" />
    <path opacity={state === 'open' ? .45 : state === 'aligned' ? .75 : 1} d="m16 12 4 4-4 4-4-4Z" />
  </svg>;
}

function App() {
  const [screen, setScreen] = useState<Screen>(() => location.hash === '#finance' ? 'finance' : 'chat');
  const [room] = useState(() => new URLSearchParams(location.search).get('room') || crypto.randomUUID());
  const [role, setRole] = useState<PartyId>(() => new URLSearchParams(location.search).get('role') === 'supplier' ? 'supplier' : 'buyer');
  const [invoice, setInvoice] = useState<Invoice>({ ...DEMO_INVOICE });
  const [quoteId, setQuoteId] = useState(DEMO_QUOTES[0].id);
  const [bearer, setBearer] = useState<FeeBearer>('supplier');
  const [stress, setStress] = useState(0);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [messages, setMessages] = useState(initialMessages);
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [consent, setConsent] = useState(false);
  const [verifyResult, setVerifyResult] = useState<Awaited<ReturnType<typeof verifyAgreement>> | null>(null);
  const [verifyText, setVerifyText] = useState('');
  const [verifyLabel, setVerifyLabel] = useState('');
  const [editInvoice, setEditInvoice] = useState<Invoice>({ ...DEMO_INVOICE });
  const [editErrors, setEditErrors] = useState<string[]>([]);
  const [deliveryWindow, setDeliveryWindow] = useState('21–25 September 2026');
  const [termsNote, setTermsNote] = useState('Confirm the final provider quote before sending. Any charges beyond this estimate require a new conversation.');
  const keys = useRef<Partial<Record<PartyId, Signer>>>({});
  const generation = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);
  const latest = useRef({ agreement, messages });
  latest.current = { agreement, messages };
  const chatEnd = useRef<HTMLDivElement>(null);
  const chatTimeline = useRef<HTMLDivElement>(null);
  const chatScroll = useRef<number | null>(null);
  const quote = agreement?.snapshot.quote || DEMO_QUOTES.find(q => q.id === quoteId) || DEMO_QUOTES[0];
  const costs = agreement?.snapshot.costs || calculateCosts(invoice, quote, bearer);
  const scenario = agreement ? costs : calculateCosts(invoice, quote, bearer, stress);
  const bank = agreement ? costs : calculateCosts(invoice, DEMO_QUOTES[0], bearer);
  const specialist = agreement ? costs : calculateCosts(invoice, DEMO_QUOTES[1], bearer);
  const sealed = agreement?.signatures.length === 2;
  const selectedSigned = agreement?.signatures.some(s => s.partyId === role);
  const usdcBreakdown = calculateUsdcBreakdown(invoice);

  function goTo(next: Screen) {
    if (next === screen) return;
    history.pushState(null, '', `#${next}`);
    setScreen(next);
  }
  useEffect(() => {
    const onBack = () => setScreen(location.hash === '#finance' ? 'finance' : 'chat');
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (screen === 'chat' && chatTimeline.current) chatTimeline.current.scrollTop = chatScroll.current ?? chatTimeline.current.scrollHeight;
  }, [screen]);

  useEffect(() => { setConsent(false); }, [role, agreement?.hash]);
  useEffect(() => { if (messages.length > initialMessages.length) chatEnd.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [messages.length]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!('BroadcastChannel' in window)) return;
    const bus = new BroadcastChannel(`sanad-${room}`);
    channel.current = bus;
    let pending = Promise.resolve();
    bus.onmessage = ({ data }) => {
      if (data?.type === 'reset') { resetLocal(); return; }
      if (data?.type === 'revise') { generation.current++; latest.current.agreement = null; setAgreement(null); setConsent(false); return; }
      const started = generation.current;
      pending = pending.then(async () => {
      if (started !== generation.current) return;
      if (data?.type === 'hello') bus.postMessage({ type: 'sync', ...latest.current });
      if (data?.type === 'sync' || data?.type === 'agreement') {
        if (data.agreement && (await verifyAgreement(data.agreement)).valid) {
          if (started !== generation.current) return;
          const incoming = data.agreement as Agreement; if (incoming.snapshot.invoice.amountEur < 35) return;
          const current = latest.current.agreement;
          if (!current || (current.snapshot.id === incoming.snapshot.id && current.hash === incoming.hash)) {
            const next = current ? await mergeAgreements(current, incoming) : incoming;
            if (started !== generation.current) return;
            latest.current.agreement = next;
            setAgreement(next);
            setInvoice(next.snapshot.invoice);
            setQuoteId(next.snapshot.quote.id);
            setBearer(next.snapshot.feeBearer);
            if (next.signatures.length > incoming.signatures.length) bus.postMessage({ type: 'agreement', agreement: next });
          }
        }
        if (data.type === 'sync' && Array.isArray(data.messages)) setMessages(data.messages);
      }
      if (data?.type === 'message' && typeof data.message?.text === 'string' && ['buyer', 'supplier'].includes(data.message.from)) {
        setMessages(current => current.some(m => m.id === data.message.id) ? current : [...current, data.message]);
      }
      }).catch(() => setError('A conflicting demo record was ignored. Keep the current record or start a new draft.'));
    };
    bus.postMessage({ type: 'hello' });
    return () => { bus.close(); channel.current = null; };
  }, [room]);

  function resetLocal() {
    generation.current++; latest.current.agreement = null;
    setAgreement(null); setInvoice({ ...DEMO_INVOICE }); setQuoteId(DEMO_QUOTES[0].id); setBearer('supplier'); setStress(0); setMessages(initialMessages); setMessage(''); setError(''); setConsent(false); setVerifyResult(null); setVerifyText(''); setDeliveryWindow('21–25 September 2026'); setTermsNote('Confirm the final provider quote before sending. Any charges beyond this estimate require a new conversation.'); keys.current = {};
  }
  function reset() { resetLocal(); channel.current?.postMessage({ type: 'reset' }); setModal(null); setRole('buyer'); setNotice('Sample deal restored. Ready for another walkthrough.'); }
  function sendMessage(e: React.FormEvent) {
    e.preventDefault(); if (!message.trim()) return;
    const item = { id: crypto.randomUUID(), from: role, text: message.trim().slice(0, 1500), time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) };
    setMessages(current => [...current, item]); channel.current?.postMessage({ type: 'message', message: item }); setMessage('');
  }
  async function reviewAgreement() {
    const started = generation.current;
    setBusy(true); setError('');
    try {
      const next = await createAgreement({ version: 1, id: `SND-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, createdAt: new Date().toISOString(), invoice: { ...invoice }, quote: { ...quote }, feeBearer: bearer, costs, terms: { deliveryWindow, note: termsNote }, parties: names, disclosure: 'Synthetic demo invoice, parties, rates and fees. Cost ranges are assumptions, not guarantees. Signing does not lock a rate, move money, authenticate legal identity or establish legal enforceability.' });
      if (started !== generation.current) return;
      latest.current.agreement = next; setAgreement(next); setConsent(false); channel.current?.postMessage({ type: 'agreement', agreement: next });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not prepare this agreement. Please try again.'); }
    finally { setBusy(false); }
  }
  async function sign() {
    if (!agreement || !consent || busy) return;
    const started = generation.current;
    setBusy(true); setError('');
    try {
      const signer = keys.current[role] || await createSigner(role); keys.current[role] = signer;
      const signed = await signAgreement(agreement, signer);
      if (started !== generation.current || !latest.current.agreement) return;
      const next = await mergeAgreements(latest.current.agreement, signed);
      const result = await verifyAgreement(next);
      if (!result.valid) throw new Error(result.message);
      if (started !== generation.current) return;
      latest.current.agreement = next; setAgreement(next); channel.current?.postMessage({ type: 'agreement', agreement: next }); setConsent(false);
      setNotice(next.signatures.length === 2 ? 'Both signatures verified. Your agreement is sealed.' : `${names[role].split(' ')[0]} signed. Ready for the other party.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Signature failed. Please try again.'); }
    finally { setBusy(false); }
  }
  async function download() {
    if (!agreement) return;
    const result = await verifyAgreement(agreement);
    if (!result.valid || !result.complete) { setError('Both valid signatures are needed before exporting a sealed record.'); return; }
    const blob = new Blob([exportAgreement(agreement)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${agreement.snapshot.id}.sanad.json`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Record downloaded, including terms, public keys and both signatures.');
  }
  async function checkRecord(value: unknown, label: string) {
    setBusy(true); setVerifyLabel(label); setVerifyResult(null);
    try { setVerifyResult(await verifyAgreement(value)); }
    catch { setVerifyResult({ valid: false, hashMatches: false, signaturesValid: false, complete: false, message: 'This record could not be read. Upload a SANAD JSON export.' }); }
    finally { setBusy(false); }
  }
  function openVerifier() { setVerifyResult(null); setVerifyText(''); setVerifyLabel(''); setModal('verify'); }
  function openOtherTab() {
    const url = new URL(location.href); url.searchParams.set('room', room); url.searchParams.set('role', role === 'buyer' ? 'supplier' : 'buyer');
    url.hash = 'finance'; window.open(url.toString(), '_blank', 'noopener');
  }
  function saveInvoice(e: React.FormEvent) {
    e.preventDefault(); const next = { ...editInvoice, amountEur: Math.round(editInvoice.quantity * editInvoice.unitPriceEur * 100) / 100 };
    const issues = validateInvoice(next); setEditErrors(issues);
    if (issues.length) return;
    if (next.amountEur < Math.max(...DEMO_QUOTES.map(q => q.downstreamFeeEur.max))) {
      setEditErrors(['Use an invoice of at least €35 for these sample fee bands.']); return;
    }
    setInvoice(next); setModal(null); setNotice('Invoice updated. All cost estimates have been recalculated.');
  }
  function revise() { generation.current++; latest.current.agreement = null; setAgreement(null); setConsent(false); setModal(null); channel.current?.postMessage({ type: 'revise' }); setNotice('New draft started. Both parties will need to sign the revised terms.'); }

  return <div className={`app-shell screen-${screen}`}>
    <aside className="desktop-nav" aria-label="Workspace navigation">
      <div className="desktop-brand"><Counterseal state={sealed ? 'closed' : agreement ? 'aligned' : 'open'} size={40} /><span>SANAD <b lang="ar">سند</b></span></div>
      <p>Trade, on the same page.</p>
      <button aria-label="Chat" aria-current={screen === 'chat' ? 'page' : undefined} onClick={() => goTo('chat')}><MessageSquare size={21} />Chat</button>
      <button aria-label="Finance" aria-current={screen === 'finance' ? 'page' : undefined} onClick={() => goTo('finance')}><ArrowLeftRight size={21} />Finance</button>
      <div className="desktop-nav-bottom"><button onClick={openVerifier}><FileCheck2 size={19} />Verify a record</button><button onClick={() => setModal('sources')}><LockKeyhole size={19} />About the prototype</button><span>MuslimHacks · Challenge 02</span></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="wordmark">SANAD<span lang="ar">سند</span></div><span className="demo-pill"><span className="status-dot" />Local prototype</span><div className="topbar-actions"><button className="icon-button" aria-label="Demo guide" onClick={() => setModal('guide')}><CircleHelp size={21} /></button><button className="icon-button" aria-label="Reset demo" onClick={() => setModal('reset')}><RotateCcw size={19} /></button></div></header>
      <main id="workspace">
        {screen === 'chat' ? <section className="conversation" aria-label="Trade conversation">
          <div className="conversation-head"><div className="avatar supplier-avatar">AB</div><div><h1>Amira Ben Youssef</h1><p>Sfax Olive Co. · Tunisia</p></div><button className="icon-button" aria-label="Conversation privacy" onClick={() => setModal('sources')}><LockKeyhole size={19} /></button></div>
          <div className="chat-timeline" ref={chatTimeline} onScroll={e => { chatScroll.current = e.currentTarget.scrollTop; }}><div className="chat-date">5 September · Sample conversation</div>
            {messages.map((item) => <div key={item.id} className={`message-group ${item.from === 'buyer' ? 'outgoing' : 'incoming'}`}><div className="message-bubble">{item.text}<span className="message-time">{item.time}{item.from === 'buyer' && <CheckCheck size={13} />}</span></div></div>)}
              <div className="chat-insight"><div className="mini-brand"><Leaf size={14} /></div><p>{sealed ? 'Same terms. Both signatures. A record you can each keep.' : agreement ? 'Your cost decision is ready for both parties to review.' : 'A small detail worth agreeing on. Let’s check what actually arrives.'}</p></div>
              {sealed && <button className="sealed-chat-card" onClick={() => goTo('finance')}><ShieldCheck size={20} /><span><strong>Agreement sealed</strong><small>Open your shared record</small></span><Download size={16} /></button>}<div ref={chatEnd} />
            </div>
            <div className="chat-invoice-hinge">
              <button className="hinge-invoice" onClick={() => { setEditInvoice({ ...invoice }); setEditErrors([]); setModal('edit'); }} aria-label="View sample invoice"><span className="invoice-file-icon"><FileText size={23} /></span><span className="hinge-copy"><strong>Invoice {invoice.id}</strong><small>{invoice.quantity} bottles · Organic olive oil</small><b>{eur(invoice.amountEur)}</b></span><Counterseal state={sealed ? 'closed' : agreement ? 'aligned' : 'open'} size={58} /><ChevronRight size={18} /></button>
              <button className="hinge-action" onClick={() => goTo('finance')} aria-label={sealed ? 'View signed agreement' : agreement ? 'Review shared agreement' : 'Review payment options'}><span className="bridge-icon"><Counterseal state={sealed ? 'closed' : agreement ? 'aligned' : 'open'} size={26} /></span><strong>{sealed ? 'View signed agreement' : agreement ? 'Review shared agreement' : 'Review payment options'}</strong><ArrowRight size={20} /></button>
            </div>
            <div className="chat-compose"><div className="role-control"><span>Demo role</span><div><button className={role === 'buyer' ? 'selected' : ''} onClick={() => setRole('buyer')}>Bilal · buyer</button><button className={role === 'supplier' ? 'selected' : ''} onClick={() => setRole('supplier')}>Amira · supplier</button></div></div><form onSubmit={sendMessage} className="message-input"><input aria-label={`Message as ${names[role]}`} placeholder={`Message as ${role === 'buyer' ? 'Bilal' : 'Amira'}…`} value={message} maxLength={1500} onChange={e => setMessage(e.target.value)} /><button type="submit" aria-label="Send message" disabled={!message.trim()}><Send size={17} /></button></form><span className="compose-footnote">Fictional participants · session only</span></div>
          </section> : <div className="finance-screen">
          <div className="finance-screen-head"><div><h1>Finance</h1><p>One invoice. Every cost in view.</p></div><button className="icon-button" aria-label="Verify an agreement" onClick={openVerifier}><FileCheck2 size={23} /></button></div>
          <button className="linked-conversation" onClick={() => goTo('chat')}><span className="avatar supplier-avatar">AB</span><span><strong>September olive oil shipment</strong><small>Amira · Sfax, Tunisia</small></span><MessageSquare size={19} /><ChevronRight size={17} /></button>
          <ol className="steps"><li className={!agreement ? 'current' : 'done'}><span><Counterseal state="open" size={21} /></span>Compare</li><li className={agreement && !sealed ? 'current' : sealed ? 'done' : ''}><span><Counterseal state="aligned" size={21} /></span>Agree</li><li className={sealed ? 'current' : ''}><span><Counterseal state="closed" size={21} /></span>Keep record</li></ol>
          <section className="decision-sheet" aria-label={agreement ? 'Trade agreement' : 'Review payment costs'}>
          {!agreement ? <>
            <div className="sheet-heading"><div><h2>How should this invoice be paid?</h2><p>{eur(invoice.amountEur)} due · Compare buyer outlay in CAD.</p></div><button className="icon-button" aria-label="Edit invoice" title="Edit invoice" onClick={() => { setEditInvoice({ ...invoice }); setEditErrors([]); setModal('edit'); }}><SlidersHorizontal size={18} /></button></div>
            <button className="data-note" onClick={() => setModal('sources')}><FlaskConical size={14} /><span>Illustrative rates & fees · see assumptions</span><ArrowUpRight size={14} /></button>
            <div className="quote-options" role="radiogroup" aria-label="Payment route">
              {DEMO_QUOTES.map((option, index) => { const result = calculateCosts(invoice, option, bearer); const active = quote.id === option.id;
                const isUsdc = option.id === 'usdc-route';
                return <button key={option.id} role="radio" aria-checked={active} className={`quote-option ${active ? 'selected' : ''}`} onClick={() => setQuoteId(option.id)}><span className="radio-mark">{active && <span />}</span><span className="quote-main"><span className="quote-title"><strong>{option.name}</strong>{index === 1 && <span className="low-cost-label">Lowest estimate</span>}{isUsdc && <span className="simulation-tag">Simulation</span>}</span><span className="quote-amount">{cad(result.totalMaxCad)}<small>CAD</small></span><span className="quote-caption">{bearer === 'buyer' ? 'Includes estimated fee reserve' : 'Estimated buyer outlay'}</span><span className="quote-meta">{isUsdc ? 'CAD → USDC → EUR · FX still applies' : `${option.delivery.split(' ·')[0]} · ${(((option.rateCadPerEur / option.referenceRate) - 1) * 100).toFixed(2)}% FX markup`}</span></span>{active && <Check size={20} className="quote-check" />}</button>;
              })}
            </div>
            {quote.id === 'usdc-route' && <div className="usdc-context"><Coins size={21} /><div><strong>Digital dollars. Still two currency conversions.</strong><p>The buyer pays CAD and Amira receives EUR. USDC changes the route, not the invoice currency.</p><button className="text-button" onClick={() => setModal('usdc')}>See the full USDC path<ArrowRight size={16} /></button></div></div>}
            {quote.id !== 'usdc-route' && <button className="usdc-learn" onClick={() => setModal('usdc')}><Coins size={18} /><span>Would USDC remove the FX cost?</span><ChevronRight size={17} /></button>}
            <div className={`receipt-callout ${bearer === 'buyer' ? 'resolved' : ''}`}><div className="callout-icon">{bearer === 'buyer' ? <Check size={19} /> : <AlertTriangle size={19} />}</div><div><strong>{bearer === 'buyer' ? 'You’ve accounted for the supplier’s full invoice.' : `The supplier could receive ${eur(costs.recipientMinEur)}.`}</strong><p>{bearer === 'buyer' ? `The buyer allows up to ${cad(costs.feeReserveCad)} for downstream fees. Final charges still need confirmation.` : `That’s up to ${eur(invoice.amountEur - costs.recipientMinEur)} short. Who covers the difference?`}</p></div></div>
            <div className="fee-choice"><div><h3>Who covers downstream fees?</h3><p>{quote.id === 'usdc-route' ? 'Cash-out provider and receiving-bank charges.' : 'Intermediary and receiving-bank charges.'}</p></div><select aria-label="Who covers downstream fees?" value={bearer} onChange={e => setBearer(e.target.value as FeeBearer)}><option value="supplier">Supplier · deducted on arrival</option><option value="buyer">Buyer · budget for full invoice</option></select></div>
            <details className="cost-breakdown"><summary><span>Where every dollar goes</span><ChevronDown size={16} /></summary><div className="breakdown-rows"><div><span>Invoice at reference rate <small>1 EUR = {quote.referenceRate.toFixed(4)} CAD</small></span><span>{cad(costs.principalCad)}</span></div>{quote.id === 'usdc-route' ? <><div><span>Buy USDC · conversion spread<small>{USDC_ASSUMPTIONS.fundingSpreadPercent}% funding spread</small></span><span>{cad(usdcBreakdown.fundingSpreadCad)}</span></div><div><span>Cash out to EUR · conversion spread<small>{USDC_ASSUMPTIONS.cashoutSpreadPercent}% cash-out spread</small></span><span>{cad(usdcBreakdown.cashoutSpreadCad)}</span></div><div><span>Funding fee</span><span>{cad(usdcBreakdown.fundingFeeCad)}</span></div><div><span>Network fee budget<small>{USDC_ASSUMPTIONS.networkFeeUsdc} USDC equivalent · synthetic</small></span><span>{cad(usdcBreakdown.networkFeeCad)}</span></div></> : <><div><span>Exchange-rate markup <small>{(((quote.rateCadPerEur / quote.referenceRate) - 1) * 100).toFixed(2)}%</small></span><span>{cad(costs.fxMarkupCad)}</span></div><div><span>Transfer fee</span><span>{cad(costs.transferFeeCad)}</span></div></>}<div><span>Downstream fees <span className="estimate-tag">estimated</span></span><span>{range(quote.downstreamFeeEur.min, quote.downstreamFeeEur.max, 'EUR')}<small>{bearer === 'supplier' ? 'deducted from supplier' : 'covered by buyer'}</small></span></div><div className="breakdown-total"><strong>Buyer total outlay</strong><strong>{range(costs.totalMinCad, costs.totalMaxCad)}</strong></div></div></details>
            <details className="stress-panel"><summary><span><SlidersHorizontal size={16} />What if the exchange rate changes?</span><span>Explore<ChevronDown size={15} /></span></summary><div className="stress-content"><p>A scenario, never a forecast. Positive values mean the euro costs more Canadian dollars. This does not change your agreement.</p><div className="slider-label"><label htmlFor="fx-scenario">Change in CAD cost per euro</label><output htmlFor="fx-scenario">{stress > 0 ? '+' : ''}{stress}%</output></div><input id="fx-scenario" type="range" min="-10" max="10" step="1" value={stress} onChange={e => setStress(Number(e.target.value))} /><div className="slider-ends"><span>−10% · cheaper</span><span>+10% · more expensive</span></div><div className="scenario-result"><div><span>Buyer outlay, upper estimate</span><strong>{cad(scenario.totalMaxCad)}</strong></div><div><span>Estimated shipment margin</span><strong className={scenario.marginMinCad < 0 ? 'text-danger' : ''}>{cad(scenario.marginMinCad)}</strong></div></div><p className="scenario-caption">Margin = {cad(invoice.revenueCad)} expected sales − {cad(invoice.otherCostsCad)} other costs − payment outlay.</p></div></details>
            <div className="decision-footer"><div className="savings-note"><Leaf size={18} /><span>{quote.id === DEMO_QUOTES[1].id ? <><strong>{cad(bank.totalMaxCad - specialist.totalMaxCad)} less</strong> than the sample bank route</> : <>There’s a lower-cost sample route. <br /><strong>Compare before you agree.</strong></>}</span></div><button className="primary-button" onClick={reviewAgreement} disabled={busy}>{busy ? 'Preparing…' : 'Review agreement'}<Counterseal state="aligned" size={22} /></button></div>
            <p className="sheet-footnote">Estimates are synthetic. No money moves, and no exchange rate is locked.</p>
          </> : <>
            <div className="sheet-heading"><div><h2>{sealed ? 'Agreed. And worth keeping.' : 'A clear agreement, for both of you.'}</h2><p>{sealed ? 'The same terms. Two signatures. Your shared record.' : 'Review the snapshot, then add your signature.'}</p></div><span className={`agreement-status ${sealed ? 'sealed' : ''}`}>{sealed ? <ShieldCheck size={15} /> : <FileText size={15} />}{sealed ? 'Sealed' : 'Awaiting signatures'}</span></div>
            {sealed && <div className="seal-moment"><div className="seal-icon"><Counterseal state="closed" size={31} /></div><div><strong>Both signatures verified</strong><span>Changes to these signed terms fail verification.</span></div></div>}
            <div className="agreement-document"><div className="document-top"><span>Trade cost agreement</span><code>{agreement.snapshot.id}</code></div><h3>{agreement.snapshot.invoice.goods}</h3><p className="document-parties">{names.buyer}<span>↔</span>{names.supplier}</p><dl className="agreement-grid"><div><dt>Invoice</dt><dd>{eur(agreement.snapshot.invoice.amountEur)}<small>{agreement.snapshot.invoice.quantity} bottles × {eur(agreement.snapshot.invoice.unitPriceEur)}</small></dd></div><div><dt>Selected route</dt><dd>{agreement.snapshot.quote.name}<small>{agreement.snapshot.quote.id === 'usdc-route' ? 'Simulated CAD → USDC → EUR' : 'Synthetic quote · CAD → EUR'}</small></dd></div><div><dt>Buyer budgets</dt><dd>{range(agreement.snapshot.costs.totalMinCad, agreement.snapshot.costs.totalMaxCad)}<small>Estimated CAD outlay</small></dd></div><div><dt>Supplier expects</dt><dd>{range(agreement.snapshot.costs.recipientMinEur, agreement.snapshot.costs.recipientMaxEur, 'EUR')}<small>{agreement.snapshot.feeBearer === 'buyer' ? 'Full invoice target · not guaranteed' : 'After estimated deductions'}</small></dd></div></dl><div className="agreed-terms"><p><Check size={14} /><span><strong>{agreement.snapshot.feeBearer === 'buyer' ? 'Bilal (buyer)' : 'Amira (supplier)'}</strong> covers downstream fees, estimated at {range(agreement.snapshot.quote.downstreamFeeEur.min, agreement.snapshot.quote.downstreamFeeEur.max, 'EUR')}.</span></p><p><Check size={14} /><span>Payment due <strong>{agreement.snapshot.invoice.dueDate}</strong>. Delivery: {agreement.snapshot.terms.deliveryWindow}.</span></p><p><Check size={14} /><span>{agreement.snapshot.terms.note}</span></p></div><details className="snapshot-details"><summary>Rate, fee assumptions & record details<ChevronDown size={14} /></summary><p>Reference: {agreement.snapshot.quote.referenceRate.toFixed(4)} CAD/EUR. Customer rate: {agreement.snapshot.quote.rateCadPerEur.toFixed(5)} CAD/EUR. Transfer fee: {cad(agreement.snapshot.quote.transferFeeCad)}.</p><p>{agreement.snapshot.quote.source} · {agreement.snapshot.quote.asOf}</p><p>Created {new Date(agreement.snapshot.createdAt).toLocaleString()}. The displayed signature times come from this device.</p><p>{agreement.snapshot.disclosure}</p></details></div>
            <div className="signature-grid">{(['buyer', 'supplier'] as PartyId[]).map(party => { const signature = agreement.signatures.find(s => s.partyId === party); return <div key={party} className={`signature-slot ${signature ? 'signed' : ''}`}><div className="signature-label"><span>{party === 'buyer' ? 'Buyer' : 'Supplier'}</span>{signature ? <span><Check size={13} />Signed</span> : <span>Pending</span>}</div><strong className={signature ? 'signature-name' : ''}>{names[party]}</strong><small>{signature ? `Verified · ${new Date(signature.signedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'Ready to review and sign'}</small></div>; })}</div>
            {!sealed ? <div className="signing-area">{selectedSigned ? <><p className="signed-wait"><Check size={18} />Your signature is recorded. The other party can now review.</p><button className="primary-button" onClick={() => setRole(role === 'buyer' ? 'supplier' : 'buyer')}>Review as {role === 'buyer' ? 'Amira' : 'Bilal'}<ArrowRight size={17} /></button><span className="demo-explanation">Switching fictional roles on this device for the demo.</span></> : <><div className="signing-as"><Users size={15} />You’re reviewing as <strong>{names[role]}</strong><button className="text-button" onClick={() => setRole(role === 'buyer' ? 'supplier' : 'buyer')}>Switch role</button></div><label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>I agree to these terms and understand the costs are illustrative estimates, not a payment or rate guarantee.</span></label><button className="primary-button sign-button" disabled={!consent || busy} onClick={sign}><Fingerprint size={18} />{busy ? 'Signing & verifying…' : `Sign as ${role === 'buyer' ? 'Bilal' : 'Amira'}`}</button><span className="demo-explanation">Real cryptographic signature · fictional, unverified identity</span></>}</div> : <div className="sealed-actions"><button className="primary-button" onClick={download}><Download size={17} />Download signed record</button><button className="secondary-button" onClick={() => window.print()}><Printer size={16} />Print</button><button className="text-button" onClick={openVerifier}><ShieldCheck size={16} />Verify or test a change<ArrowRight size={15} /></button></div>}
            <div className="hash-strip"><Fingerprint size={16} /><div><span>SHA-256 content fingerprint</span><code>{agreement.hash}</code></div></div><div className="record-footer"><button className="text-button" onClick={() => agreement.signatures.length ? setModal('revise') : revise()}><RotateCcw size={14} />Revise terms</button><button className="text-button" onClick={openOtherTab}><ExternalLink size={14} />Open other party in a tab</button></div><p className="sheet-footnote">Keys and messages stay in memory. Download the record before refreshing.</p>
          </>}
          {error && <div role="alert" className="error-message">{error}<button className="text-button" onClick={() => setError('')}>Dismiss</button></div>}
          </section>
          <footer className="workspace-footer"><button onClick={() => setModal('sources')}><LockKeyhole size={14} />Local demo · See assumptions<ArrowUpRight size={14} /></button></footer>
        </div>}
      </main>
    </div>
    <nav className="bottom-nav" aria-label="Main navigation"><button aria-label="Chat" aria-current={screen === 'chat' ? 'page' : undefined} onClick={() => goTo('chat')}><MessageSquare size={22} /><span>Chat</span></button><button aria-label="Finance" aria-current={screen === 'finance' ? 'page' : undefined} onClick={() => goTo('finance')}><span className="nav-icon"><ArrowLeftRight size={23} />{agreement && !sealed && <span className="nav-dot" />}</span><span>Finance</span></button></nav>
    {notice && <div className="toast" role="status"><Check size={17} />{notice}</div>}
    {modal === 'guide' && <Modal title="One deal. A 90-second story." onClose={() => setModal(null)}><p className="dialog-intro">SANAD helps trading partners agree on the real cost of a cross-border invoice before anyone sends money.</p><ol className="guide-steps"><li><span>1</span><div><strong>Find the missing €35.</strong><p>Amira needs €6,000. In the sample bank route, deductions could leave her short.</p></div></li><li><span>2</span><div><strong>Make one better decision.</strong><p>Open Finance from the invoice. Compare all three routes, including the full USDC path, then choose Buyer to cover downstream fees. Open the exchange-rate scenario to see how a 5% change affects the margin.</p></div></li><li><span>3</span><div><strong>Agree together.</strong><p>Review the agreement and sign as Bilal. Switch to Amira, review, and sign the very same terms.</p></div></li><li><span>4</span><div><strong>Keep something verifiable.</strong><p>Download the signed record. Verify it, then test a changed amount and watch verification fail.</p></div></li></ol><div className="plain-note">The people, conversation and quotes are fictional. The cost calculations, signatures, verification and file export work in your browser.</div><button className="primary-button full-width" onClick={() => setModal(null)}>Explore the sample deal<ArrowRight size={17} /></button></Modal>}
    {modal === 'sources' && <Modal title="Transparent by design." onClose={() => setModal(null)} wide><p className="dialog-intro">This is a decision prototype. It does not send money or obtain a bank quote.</p><div className="source-columns"><div><h3>Real in this demo</h3><ul><li>Cost, receipt and margin calculations.</li><li>FX stress scenarios that you control.</li><li>SHA-256 and two ECDSA P-256 signatures.</li><li>Record download, import and verification.</li><li>Same-browser tabs can share a demo room.</li></ul></div><div><h3>Clearly simulated</h3><ul><li>Bilal, Amira and their conversation.</li><li>The invoice, sale proceeds and other costs.</li><li>All three routes, exchange rates and fee bands.</li><li>Delivery estimates and participant identities.</li></ul></div></div><h3>Where the numbers come from</h3><p>All values are authored scenario inputs dated 5 September 2026. The reference rate is 1.5000 CAD per EUR. Bank wire adds 2.60% and a CA$35 transfer fee; Specialist transfer adds 0.55% and CA$8. Downstream fee ranges are assumptions, not historical observations or guaranteed bounds. These are fictional routes, not recommendations of real providers.</p><p>Buyer coverage adds an estimated fee reserve to outlay and targets the full invoice receipt. Supplier coverage deducts estimated fees from receipt. Neither proves what a provider will deliver. Compare identical invoices and fee responsibilities.</p><h3>Privacy, precisely</h3><p>No account, analytics, external runtime API or message upload. Data and signing keys live in this page’s memory; refreshing clears them unless another open demo tab shares its state. Tabs communicate locally through BroadcastChannel. This is not a production encrypted messenger or verified digital identity system. Exported records include deal details and public keys; private keys are never exported.</p><h3>Why these costs matter</h3><p>Real international transfers can involve intermediary and receiving-bank deductions. The following primary sources explain the mechanism; they do not supply our demo prices.</p><p>USDC route assumptions: 1 USDC = 1 USD, 1 USD = 1.35 CAD, and 1 EUR = 1.111111 USD. Funding adds 0.6%, cash-out adds 1%, funding costs CA$4 and the network budget is 0.25 USDC equivalent. Cash-out/receiving fees are estimated at €3–10. Neither route availability in Tunisia nor these prices has been verified. FX, issuer/peg and provider risks remain. No wallet or blockchain is connected.</p><div className="source-links"><a href="https://www.circle.com/usdc" target="_blank" rel="noreferrer">Circle · USDC is a US-dollar stablecoin<ArrowUpRight size={15} /></a><a href="https://www.ofx.com/en-ca/faqs/are-there-any-transfer-fees/" target="_blank" rel="noreferrer">OFX · Third-party bank deductions<ArrowUpRight size={15} /></a><a href="https://www.bankofcanada.ca/rates/exchange/background-information-on-foreign-exchange-rates/" target="_blank" rel="noreferrer">Bank of Canada · Indicative reference rates<ArrowUpRight size={15} /></a><a href="https://www.swift.com/products/swift-go" target="_blank" rel="noreferrer">Swift Go · Existing solutions for predictable fees<ArrowUpRight size={15} /></a></div><p className="small-copy">No claim of FX prediction, Sharia certification, legal enforceability or real customer validation.</p></Modal>}
    {modal === 'edit' && <Modal title={agreement ? 'Invoice in this agreement' : 'Make it your sample deal.'} onClose={() => setModal(null)}><p className="dialog-intro">Edit the illustrative invoice. Costs update from the same three sample quotes.</p><form className="invoice-form" onSubmit={saveInvoice}><label>Goods<input required maxLength={120} value={editInvoice.goods} disabled={!!agreement} onChange={e => setEditInvoice({ ...editInvoice, goods: e.target.value })} /></label><div className="form-row"><label>Quantity · bottles<input type="number" min="1" max="1000000" step="1" required value={editInvoice.quantity || ''} disabled={!!agreement} onChange={e => setEditInvoice({ ...editInvoice, quantity: Number(e.target.value) })} /></label><label>Unit price · EUR<input type="number" min="0.01" max="1000000" step="0.01" required value={editInvoice.unitPriceEur || ''} disabled={!!agreement} onChange={e => setEditInvoice({ ...editInvoice, unitPriceEur: Number(e.target.value) })} /></label></div><div className="form-total"><span>Invoice total</span><strong>{eur(editInvoice.quantity * editInvoice.unitPriceEur)}</strong></div><div className="form-row"><label>Expected sales · CAD<input type="number" min="0" max="1000000000" step="0.01" required value={editInvoice.revenueCad} disabled={!!agreement} onChange={e => setEditInvoice({ ...editInvoice, revenueCad: Number(e.target.value) })} /></label><label>Other costs · CAD<input type="number" min="0" max="1000000000" step="0.01" required value={editInvoice.otherCostsCad} disabled={!!agreement} onChange={e => setEditInvoice({ ...editInvoice, otherCostsCad: Number(e.target.value) })} /></label></div><label>Payment due<input type="date" required value={editInvoice.dueDate} disabled={!!agreement} onChange={e => setEditInvoice({ ...editInvoice, dueDate: e.target.value })} /></label>{editErrors.length > 0 && <ul role="alert" className="form-errors">{editErrors.map(err => <li key={err}>{err}</li>)}</ul>}{agreement ? <div className="plain-note">This invoice is in a frozen agreement. Choose “Revise terms” in the agreement to start a new draft.</div> : <button type="submit" className="primary-button full-width">Update invoice<ArrowRight size={16} /></button>}</form></Modal>}
    {modal === 'verify' && <Modal title="Trust the record. Check the proof." onClose={() => setModal(null)} wide><p className="dialog-intro">Verify a downloaded SANAD record, or test this agreement. Checks run locally on your device.</p><div className="verification-tools"><label className="upload-button"><Upload size={18} /><strong>Choose a signed record</strong><span>.json · up to 200 KB</span><input type="file" aria-label="Upload signed record" accept=".json,application/json" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 200000) { setVerifyResult({ valid: false, complete: false, hashMatches: false, signaturesValid: false, message: 'This file is too large. Choose a SANAD JSON record smaller than 200 KB.' }); return; } const text = await file.text(); setVerifyText(text); void checkRecord(text, file.name); }} /></label><details className="paste-record"><summary>Or paste a JSON record<ChevronDown size={14} /></summary><textarea aria-label="JSON record to verify" value={verifyText} maxLength={200000} onChange={e => setVerifyText(e.target.value)} placeholder="Paste the full contents of a SANAD export" /><button className="secondary-button" disabled={!verifyText.trim() || busy} onClick={() => checkRecord(verifyText, 'Pasted record')}>Verify pasted record</button></details></div>{agreement && <div className="test-buttons"><button className="secondary-button" disabled={busy} onClick={() => checkRecord(agreement, 'Original agreement')}><ShieldCheck size={16} />Check original</button><button className="secondary-button" disabled={busy} onClick={() => { const altered = structuredClone(agreement); altered.snapshot.invoice.amountEur += 1; altered.snapshot.invoice.unitPriceEur = altered.snapshot.invoice.amountEur / altered.snapshot.invoice.quantity; altered.snapshot.costs = calculateCosts(altered.snapshot.invoice, altered.snapshot.quote, altered.snapshot.feeBearer); void checkRecord(altered, 'Test copy: invoice increased by €1'); }}><FlaskConical size={16} />Test a changed amount</button></div>}{busy && <p role="status">Checking the fingerprint and signatures…</p>}{verifyResult && <div role="status" className={`verification-result ${verifyResult.valid && verifyResult.complete ? 'pass' : 'fail'}`}><div className="verification-result-title">{verifyResult.valid && verifyResult.complete ? <ShieldCheck size={25} /> : <AlertTriangle size={25} />}<div><h3>{verifyResult.valid ? verifyResult.complete ? 'Record intact. Both signatures valid.' : 'Intact draft. Still needs signatures.' : 'This record did not pass verification.'}</h3><span>{verifyLabel}</span></div></div><p>{verifyResult.message}</p><ul><li>{verifyResult.hashMatches ? <Check size={15} /> : <X size={15} />}Content fingerprint matches</li><li>{verifyResult.signaturesValid ? <Check size={15} /> : <X size={15} />}Included signatures are valid</li><li>{verifyResult.complete ? <Check size={15} /> : <X size={15} />}Both distinct parties have signed</li></ul></div>}<p className="small-copy">The change test alters a copy; your original stays intact. Verification proves consistency with the included keys, not a signer’s real-world identity. A malicious actor replacing the entire record and both keys requires an independent trusted copy to detect.</p></Modal>}
    {modal === 'usdc' && <Modal title="USDC changes the route. Not the FX." onClose={() => setModal(null)} wide><p className="dialog-intro">USDC tracks the US dollar. Your sample invoice is in euros and the buyer starts with Canadian dollars. Both conversions still matter.</p><ol className="usdc-path"><li><span>1</span><div><strong>Buy USDC with CAD</strong><p>A funding provider converts CAD into dollar-linked USDC. This scenario adds a 0.6% conversion spread and a CA$4 funding fee.</p></div></li><li><span>2</span><div><strong>Transfer USDC</strong><p>The network budget is 0.25 USDC equivalent, or {cad(usdcBreakdown.networkFeeCad)} here. That small network fee is only one part of the cost.</p></div></li><li><span>3</span><div><strong>Cash out to EUR</strong><p>Amira still needs euros. The scenario adds a 1% conversion spread plus €3–10 in possible cash-out and receiving fees.</p></div></li></ol><div className="plain-note"><strong>Could it help?</strong><p>Possibly, if both businesses already use USDC or a supported route reduces the total cost. For this sample, the specialist route is cheaper. A dollar peg does not fix a CAD/EUR rate.</p></div><p className="small-copy">This is a hypothetical cost comparison. No wallet, balance, transfer or blockchain transaction is created. Route availability in Tunisia is unverified. Peg, issuer and cash-out provider risks remain; no Sharia-compliance claim is made.</p><a className="source-link" href="https://www.circle.com/usdc" target="_blank" rel="noreferrer">Source: Circle’s USDC description<ArrowUpRight size={16} /></a><button className="primary-button full-width" onClick={() => { setModal(null); goTo('finance'); if (!agreement) setQuoteId('usdc-route'); }}>{agreement ? 'Back to your agreement' : 'Compare the USDC estimate'}<ArrowRight size={17} /></button></Modal>}
    {(modal === 'reset' || modal === 'revise') && <Modal title={modal === 'reset' ? 'Start the sample deal again?' : 'Create a fresh agreement?'} onClose={() => setModal(null)}><p className="dialog-intro">{modal === 'reset' ? 'This clears messages, edits and signatures in this demo room. Download a sealed record first if you want to keep it.' : 'Changing the terms starts a new draft. Existing signatures cannot carry over. Download the current record first if you need it.'}</p><div className="dialog-actions"><button className="secondary-button" onClick={() => setModal(null)}>Keep working</button><button className="primary-button" onClick={modal === 'reset' ? reset : revise}>{modal === 'reset' ? 'Reset demo' : 'Start new draft'}<RotateCcw size={15} /></button></div></Modal>}
  </div>;
}

export default App;
