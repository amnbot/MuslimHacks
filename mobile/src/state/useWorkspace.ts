import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { randomUUID } from 'expo-crypto';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import {
  createBusinessSigner, createInvoice, createInvoiceRecord, exportInvoiceRecord,
  parseInvoiceRecord, pinInvoiceRecord, signInvoiceRecord,
  type BusinessSigner, type InvoiceRecord,
} from '../../../src/lib/business';
import { decryptRecord, encryptRecord, isEncryptedEnvelope } from '../crypto/envelope';
import {
  DEMO_SETTLEMENT_MICROS, DEMO_THREADS, PARTICIPANTS, PROFILES, PaymentTimeoutError, calculateCosts,
  corridorOf, getSolBalance, getUsdcBalance, payUsdc, recommendRoute, requestAirdrop, roleInThread,
  type DemoMessage, type DemoThread, type FeeBearer, type ProfileId,
} from '../shared';

export type WorkspaceTab = 'chats' | 'invoices' | 'wallet';
export type WorkspaceRoute = 'list' | 'thread' | 'create' | 'detail';
export type WorkspaceModal = 'import' | 'export' | 'security' | 'routes' | 'agreement' | 'profile' | 'payment' | null;

export type PaymentResult = {
  status: 'pending' | 'confirmed' | 'failed';
  amountMicros: number;
  fromLabel: string;
  fromAddress: string;
  toLabel: string;
  toAddress: string;
  fromCountry: string;
  toCountry: string;
  signature: string | null;
  error: string | null;
  /** The recipient's live USDC balance, fetched right after confirmation. */
  recipientBalanceMicros: number | null;
  threadId: string | null;
};

export type ShippingContext = { fromCountry: string; toCountry: string };

const MAX_FILE_BYTES = 300_000;
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
const clockTime = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** The seeded invoice for the shared thread, expressed in USDC at the agreed rate. */
const CEDAR_LINES = [{ description: 'Organic extra virgin olive oil, 750ml', quantity: 480, unitPriceMicros: 13_890_000 }];

export type Balances = { sol: number; usdc: number; at: string };

/**
 * The single hook the app runs on. It owns the switchable demo profile, the seeded
 * conversations, the per-thread cost negotiation, the real signed invoice records and
 * the devnet wallet.
 *
 * Deliberately not persisted: every launch restores the seeded demo, which is what a
 * repeated walkthrough needs and avoids a half-finished run leaking into the next one.
 */
export function useWorkspace() {
  const [ready, setReady] = useState(false);
  const [profileId, setProfileId] = useState<ProfileId>('amira');
  const [threads, setThreads] = useState<DemoThread[]>(() => clone(DEMO_THREADS));
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [recordsByProfile, setRecordsByProfile] = useState<Record<ProfileId, InvoiceRecord[]>>({ amira: [], bilal: [] });

  const [tab, setTab] = useState<WorkspaceTab>('chats');
  const [route, setRoute] = useState<WorkspaceRoute>('list');
  const [modal, setModal] = useState<WorkspaceModal>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [stress, setStress] = useState(0);
  const [importText, setImportText] = useState('');
  const [importKey, setImportKey] = useState('');
  const [encryptedExport, setEncryptedExport] = useState<{ envelope: string; key: string } | null>(null);

  const [balances, setBalances] = useState<Balances | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [shipping, setShipping] = useState<ShippingContext | null>(null);

  // Ephemeral demo signing keys, one per business name, for this app session only.
  const signers = useRef<Record<string, BusinessSigner>>({});
  const mounted = useRef(true);
  const operation = useRef(false);

  const profile = PROFILES[profileId];
  const records = recordsByProfile[profileId];
  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? null;
  const selected = records.find((record) => record.invoice.id === selectedId) ?? null;
  const visibleThreads = threads.filter((thread) => thread.visibleTo.includes(profileId));

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timeout);
  }, [notice]);

  async function getSigner(businessName: string) {
    signers.current[businessName] ??= await createBusinessSigner(businessName);
    return signers.current[businessName];
  }

  /**
   * Builds the seeded invoice for the shared thread on this device, signed for real.
   * Each phone constructs its own copy: the cryptography is genuine, but the two
   * devices have not exchanged keys, so this is not cross-device verification.
   */
  useEffect(() => {
    void (async () => {
      try {
        const cedar = DEMO_THREADS.find((thread) => thread.id === 'cedar-sfax')!;
        const invoice = createInvoice({
          id: 'demo-cedar-sfax',
          createdAt: '2026-09-06T11:02:00.000Z',
          issuer: PROFILES.amira.businessName,
          customer: PROFILES.bilal.businessName,
          reference: cedar.invoice.id,
          dueDate: cedar.invoice.dueDate,
          note: 'Delivery 21–25 September, ex-works Sfax. Fees on the buyer, so the invoiced amount arrives in full.',
          recipientWallet: PROFILES.amira.wallet.address,
          network: 'solana-devnet',
          lines: CEDAR_LINES,
        });
        const signed = await signInvoiceRecord(
          await createInvoiceRecord(invoice), await getSigner(PROFILES.amira.businessName), 'issuer',
        );
        if (!mounted.current) return;
        setRecordsByProfile({ amira: [signed], bilal: [clone(signed)] });
      } catch (caught) {
        if (mounted.current) setError(messageOf(caught));
      } finally {
        if (mounted.current) setReady(true);
      }
    })();
  }, []);

  async function run(action: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true); setError('');
    try { await action(); } catch (caught) { setError(messageOf(caught)); }
    finally { operation.current = false; setBusy(false); }
  }

  const setRecords = useCallback((update: (current: InvoiceRecord[]) => InvoiceRecord[]) => {
    setRecordsByProfile((current) => ({ ...current, [profileId]: update(current[profileId]) }));
  }, [profileId]);

  // --- profile and navigation ---

  function switchProfile(next: ProfileId) {
    setProfileId(next);
    setTab('chats'); setRoute('list'); setActiveThreadId(null); setSelectedId(null);
    setModal(null); setError(''); setBalances(null); setStress(0); setPaymentResult(null); setShipping(null);
    setNotice(`Now viewing as ${PROFILES[next].personName}.`);
  }

  function openModal(next: WorkspaceModal) {
    setError('');
    if (next === 'import') { setImportText(''); setImportKey(''); }
    if (next !== 'export') setEncryptedExport(null);
    setModal(next);
  }

  function openThread(threadId: string) {
    setActiveThreadId(threadId); setTab('chats'); setRoute('thread'); setError(''); setStress(0);
  }

  function openInvoice(record: InvoiceRecord) {
    setSelectedId(record.invoice.id); setTab('invoices'); setRoute('detail'); setError('');
  }

  /** Opens the invoice attached to a thread, if this device holds it. */
  function openThreadInvoice(thread: DemoThread) {
    const record = records.find((entry) => entry.invoice.reference === thread.invoice.id);
    if (record) openInvoice(record);
    else setError('This conversation has no signed invoice yet.');
  }

  // --- conversation ---

  const updateThread = useCallback((threadId: string, update: (thread: DemoThread) => DemoThread) => {
    setThreads((current) => current.map((thread) => thread.id === threadId ? update(thread) : thread));
  }, []);

  function appendMessage(threadId: string, message: DemoMessage) {
    updateThread(threadId, (thread) => ({ ...thread, messages: [...thread.messages, message] }));
  }

  function sendMessage(text: string): boolean {
    const trimmed = text.trim().slice(0, 1500);
    if (!trimmed || !activeThreadId) return false;
    appendMessage(activeThreadId, { kind: 'text', id: randomUUID(), from: profileId, time: clockTime(), text: trimmed });
    return true;
  }

  /** Records this profile's position on who absorbs the downstream fees. */
  function voteFeeBearer(messageId: string, bearer: FeeBearer) {
    if (!activeThreadId) return;
    updateThread(activeThreadId, (thread) => {
      const messages = thread.messages.map((message) => {
        if (message.kind !== 'feePoll' || message.id !== messageId) return message;
        const votes = { ...message.votes, [profileId]: bearer };
        const cast = Object.values(votes);
        // Agreement means every participant who has voted chose the same side.
        const agreed = cast.length >= 2 && cast.every((value) => value === cast[0]);
        return { ...message, votes, resolved: agreed ? cast[0]! : null };
      });
      const poll = messages.find((message) => message.kind === 'feePoll' && message.id === messageId);
      const resolved = poll && poll.kind === 'feePoll' ? poll.resolved : null;
      return { ...thread, messages, bearer: resolved ?? thread.bearer };
    });
    setNotice(bearer === 'buyer' ? 'Recorded: the buyer covers downstream fees.' : 'Recorded: the supplier absorbs downstream fees.');
  }

  function setThreadQuote(quoteId: string) {
    if (!activeThreadId) return;
    updateThread(activeThreadId, (thread) => ({ ...thread, quoteId }));
  }

  function setThreadBearer(bearer: FeeBearer) {
    if (!activeThreadId) return;
    updateThread(activeThreadId, (thread) => ({ ...thread, bearer }));
  }

  function advanceStage(threadId: string, stage: DemoThread['stage']) {
    updateThread(threadId, (thread) => ({ ...thread, stage }));
  }

  // --- cost view for the open thread ---

  const corridor = activeThread ? corridorOf(activeThread) : corridorOf(threads[0]);
  const quote = activeThread
    ? corridor.quotes.find((option) => option.id === activeThread.quoteId) ?? corridor.quotes[0]
    : corridor.quotes[0];
  const costs = activeThread ? calculateCosts(activeThread.invoice, quote, activeThread.bearer) : null;
  const scenario = activeThread ? calculateCosts(activeThread.invoice, quote, activeThread.bearer, stress) : null;
  const recommendation = activeThread ? recommendRoute(activeThread.invoice, corridor) : null;
  const viewerRole = activeThread ? roleInThread(activeThread, profileId) : 'seller';

  // --- invoices: real signing, encryption and verification ---

  async function saveInvoice(input: Parameters<typeof createInvoice>[0]) {
    await run(async () => {
      const invoice = createInvoice({ ...input, network: 'solana-devnet' });
      const signed = await signInvoiceRecord(
        await createInvoiceRecord(invoice), await getSigner(profile.businessName), 'issuer',
      );
      setRecords((current) => [signed, ...current]);
      if (activeThreadId) {
        appendMessage(activeThreadId, { kind: 'invoice', id: randomUUID(), from: profileId, time: clockTime(), reference: signed.invoice.reference });
        advanceStage(activeThreadId, 'invoiced');
      }
      openInvoice(signed);
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
        appendMessage(thread.id, { kind: 'agreement', id: randomUUID(), from: profileId, time: clockTime() });
        advanceStage(thread.id, 'agreed');
      }
      setNotice('Acknowledgement signed. Both signatures now verify against the same terms.');
    });
  }

  async function importRecord() {
    await run(async () => {
      const plaintext = isEncryptedEnvelope(importText) ? await decryptRecord(importText, importKey.trim()) : importText;
      const incoming = await parseInvoiceRecord(plaintext);
      const next = await pinInvoiceRecord(records.find((record) => record.invoice.id === incoming.invoice.id), incoming);
      setRecords((current) => [next, ...current.filter((record) => record.invoice.id !== next.invoice.id)]);
      openInvoice(next); openModal(null);
      setNotice('Record imported. Content and included signatures verified.');
    });
  }

  async function pickRecord() {
    await run(async () => {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if ((asset.size ?? 0) > MAX_FILE_BYTES) throw new Error('Choose a SANAD record smaller than 300 KB.');
      const text = await new File(asset.uri).text();
      if (text.length > MAX_FILE_BYTES) throw new Error('Choose a SANAD record smaller than 300 KB.');
      setImportText(text);
    });
  }

  async function pasteRecord() {
    await run(async () => {
      const text = await Clipboard.getStringAsync();
      if (text.length > MAX_FILE_BYTES) throw new Error('The copied record is too large.');
      setImportText(text);
    });
  }

  async function prepareExport() {
    if (!selected) return;
    await run(async () => {
      const verified = await parseInvoiceRecord(selected);
      setEncryptedExport(await encryptRecord(exportInvoiceRecord(verified)));
      setModal('export');
    });
  }

  async function shareEncrypted() {
    if (!encryptedExport) return;
    await run(async () => {
      if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable here. Use Copy encrypted record instead.');
      const file = new File(Paths.cache, 'invoice.sanad.encrypted.json');
      if (!file.exists) file.create();
      file.write(encryptedExport.envelope);
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Share encrypted invoice' });
    });
  }

  /** Verifies a copy with one line item raised; the saved record is never touched. */
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

  async function copy(value: string, confirmation: string) {
    await run(async () => { await Clipboard.setStringAsync(value); setNotice(confirmation); });
  }

  async function openLink(url: string) {
    await run(async () => { await Linking.openURL(url); });
  }

  // --- devnet wallet ---

  const refreshBalances = useCallback(async () => {
    setLoadingBalances(true);
    try {
      const [sol, usdc] = await Promise.all([
        getSolBalance(profile.wallet.address), getUsdcBalance(profile.wallet.address),
      ]);
      if (!mounted.current) return;
      setBalances({ sol, usdc, at: clockTime() });
      setError('');
    } catch (caught) {
      if (mounted.current) setError(`Could not read the devnet balance. ${messageOf(caught)}`);
    } finally {
      if (mounted.current) setLoadingBalances(false);
    }
  }, [profile.wallet.address]);

  useEffect(() => { if (ready && tab === 'wallet') void refreshBalances(); }, [ready, tab, refreshBalances]);

  async function requestSol() {
    await run(async () => {
      try {
        await requestAirdrop(profile.wallet.address);
        setNotice('Airdrop requested. Refresh the balance in a moment.');
      } catch (caught) {
        // The public devnet faucet is frequently rate limited; the web faucet is the fallback.
        throw new Error(`${messageOf(caught)} Use the web faucet instead — the button below opens it.`);
      }
      await refreshBalances();
    });
  }

  /**
   * Submits a real devnet transfer and tracks it as a PaymentResult the whole way:
   * pending the instant it starts, then confirmed with a signature and the
   * recipient's live balance, or failed with the actual error. The modal opens
   * immediately so the button tap is never followed by silence.
   */
  async function runPayment(toAddress: string, toLabel: string, toCountry: string, threadId: string | null) {
    if (paying) return;
    setPaying(true); setError('');
    setPaymentResult({
      status: 'pending', amountMicros: DEMO_SETTLEMENT_MICROS,
      fromLabel: profile.personName, fromAddress: profile.wallet.address,
      toLabel, toAddress, fromCountry: profile.country, toCountry,
      signature: null, error: null, recipientBalanceMicros: null, threadId,
    });
    setModal('payment');
    try {
      const result = await payUsdc({ from: profile.wallet, to: toAddress, amountMicros: DEMO_SETTLEMENT_MICROS });
      if (!mounted.current) return;
      let recipientBalanceMicros: number | null = null;
      try { recipientBalanceMicros = await getUsdcBalance(toAddress); } catch { /* the balance is a bonus, not required to show the result */ }
      if (!mounted.current) return;
      setPaymentResult((current) => current ? { ...current, status: 'confirmed', signature: result.signature, recipientBalanceMicros } : current);
      if (threadId) {
        appendMessage(threadId, {
          kind: 'payment', id: randomUUID(), from: profileId, time: clockTime(),
          amountMicros: DEMO_SETTLEMENT_MICROS, signature: result.signature,
        });
        advanceStage(threadId, 'paid');
      }
      setNotice('Confirmed on Solana devnet.');
      await refreshBalances();
    } catch (caught) {
      // A transaction that was broadcast but timed out while confirming still carries
      // a real signature; show it so the explorer link works even in that case.
      const signature = caught instanceof PaymentTimeoutError ? caught.signature : null;
      if (mounted.current) {
        setError(messageOf(caught));
        setPaymentResult((current) => current ? { ...current, status: 'failed', error: messageOf(caught), signature } : current);
      }
    } finally {
      if (mounted.current) setPaying(false);
    }
  }

  /** Submits the real devnet transfer for the open thread. */
  async function payThread(thread: DemoThread) {
    const recipient = PROFILES[thread.sellerId as ProfileId];
    if (!recipient) { setError('This supplier has no demo wallet. Use the Sfax Olive Co. conversation for a live payment.'); return; }
    await runPayment(recipient.wallet.address, recipient.personName, recipient.country, thread.id);
  }

  /** Pays the open invoice's signed recipient wallet, for the demo amount. */
  async function payInvoice() {
    if (!selected) return;
    const thread = threads.find((entry) => entry.invoice.id === selected.invoice.reference);
    const sellerCountry = thread ? PARTICIPANTS[thread.sellerId]?.country ?? 'their country' : 'their country';
    await runPayment(selected.invoice.payment.recipientWallet, selected.invoice.issuer, sellerCountry, thread?.id ?? null);
  }

  function closePaymentModal() {
    setModal(null);
  }

  /** Opens the post-payment "how would you like to receive it?" mockup as its own screen. */
  function openShipping(context: ShippingContext) {
    setModal(null);
    setShipping(context);
  }

  function closeShipping() {
    setShipping(null);
  }

  function resetDemo() {
    setThreads(clone(DEMO_THREADS));
    setActiveThreadId(null); setSelectedId(null); setModal(null); setRoute('list'); setTab('chats');
    setStress(0); setError(''); setBalances(null); setPaymentResult(null); setShipping(null);
    setNotice('Seeded conversations restored. Ready for another walkthrough.');
  }

  return {
    ready, profileId, profile, switchProfile, resetDemo,
    threads: visibleThreads, activeThread, openThread, activeThreadId,
    tab, setTab, route, setRoute, modal, openModal, busy, error, setError, notice, setNotice,
    records, selected, openInvoice, openThreadInvoice,
    sendMessage, voteFeeBearer, setThreadQuote, setThreadBearer, advanceStage,
    corridor, quote, costs, scenario, recommendation, viewerRole, stress, setStress,
    saveInvoice, acknowledge, importRecord, pickRecord, pasteRecord, prepareExport, shareEncrypted,
    checkAlteredCopy, copy, openLink,
    importText, setImportText, importKey, setImportKey, encryptedExport,
    balances, loadingBalances, refreshBalances, requestSol, payThread, payInvoice, paying,
    paymentResult, closePaymentModal, shipping, openShipping, closeShipping,
  };
}

export type Workspace = ReturnType<typeof useWorkspace>;
