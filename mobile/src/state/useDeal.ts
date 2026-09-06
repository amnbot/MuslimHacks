import { useCallback, useEffect, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import {
  calculateCosts, calculateUsdcBreakdown, DEMO_INVOICE, DEMO_QUOTES, validateInvoice,
  createAgreement, createSigner, exportAgreement, mergeAgreements, signAgreement, verifyAgreement,
  type Agreement, type FeeBearer, type Invoice, type PartyId, type Signer, type VerificationResult,
} from '../shared';

export type ChatMessage = { id: string; from: PartyId; text: string; time: string };
export type Screen = 'chat' | 'finance';
export type ModalKind = 'guide' | 'sources' | 'verify' | 'edit' | 'reset' | 'revise' | 'usdc' | null;

export const names: Record<PartyId, string> = { buyer: 'Bilal Mansouri', supplier: 'Amira Ben Youssef' };
export const firstName = (party: PartyId) => (party === 'buyer' ? 'Bilal' : 'Amira');
export const otherParty = (party: PartyId): PartyId => (party === 'buyer' ? 'supplier' : 'buyer');

export const initialMessages: ChatMessage[] = [
  { id: 'seed-1', from: 'supplier', text: 'Salam Bilal! Your September harvest order is ready. Here is the invoice for the 480 bottles.', time: '10:24' },
  { id: 'seed-2', from: 'buyer', text: 'Wa alaykum salam, Amira. Looks good. I’ll arrange the €6,000 payment before Friday.', time: '10:26' },
  { id: 'seed-3', from: 'supplier', text: 'Perfect. Just one thing — we need the full €6,000 to arrive. Last time the bank deducted fees.', time: '10:27' },
];

const DEFAULT_DELIVERY = '21–25 September 2026';
const DEFAULT_NOTE = 'Confirm the final provider quote before sending. Any charges beyond this estimate require a new conversation.';
const DISCLOSURE = 'Synthetic demo invoice, parties, rates and fees. Cost ranges are assumptions, not guarantees. Signing does not lock a rate, move money, authenticate legal identity or establish legal enforceability.';
const MAX_RECORD_BYTES = 200_000;

/** The sample fee bands need an invoice at least as large as the biggest downstream fee. */
export const MIN_INVOICE_EUR = Math.max(...DEMO_QUOTES.map((quote) => quote.downstreamFeeEur.max));

function unreadable(message: string): VerificationResult {
  return { valid: false, hashMatches: false, signaturesValid: false, complete: false, message };
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function clockTime(): string {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function useDeal() {
  const [screen, setScreen] = useState<Screen>('chat');
  const [role, setRole] = useState<PartyId>('buyer');
  const [invoice, setInvoice] = useState<Invoice>({ ...DEMO_INVOICE });
  const [quoteId, setQuoteId] = useState(DEMO_QUOTES[0].id);
  const [bearer, setBearer] = useState<FeeBearer>('supplier');
  const [stress, setStress] = useState(0);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [modal, setModal] = useState<ModalKind>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [consent, setConsent] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);
  const [verifyText, setVerifyText] = useState('');
  const [verifyLabel, setVerifyLabel] = useState('');
  const [deliveryWindow] = useState(DEFAULT_DELIVERY);
  const [termsNote] = useState(DEFAULT_NOTE);

  // Ephemeral demo keys live only in memory for the life of the app process.
  const keys = useRef<Partial<Record<PartyId, Signer>>>({});
  // Incremented on reset or revision so in-flight async work is discarded.
  const generation = useRef(0);
  const latestAgreement = useRef<Agreement | null>(null);
  latestAgreement.current = agreement;

  const quote = agreement?.snapshot.quote ?? DEMO_QUOTES.find((option) => option.id === quoteId) ?? DEMO_QUOTES[0];
  const costs = agreement?.snapshot.costs ?? calculateCosts(invoice, quote, bearer);
  const scenario = agreement ? costs : calculateCosts(invoice, quote, bearer, stress);
  const bank = agreement ? costs : calculateCosts(invoice, DEMO_QUOTES[0], bearer);
  const specialist = agreement ? costs : calculateCosts(invoice, DEMO_QUOTES[1], bearer);
  const sealed = agreement?.signatures.length === 2;
  const selectedSigned = agreement?.signatures.some((signature) => signature.partyId === role) ?? false;
  const usdcBreakdown = calculateUsdcBreakdown(invoice);

  useEffect(() => { setConsent(false); }, [role, agreement?.hash]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const resetLocal = useCallback(() => {
    generation.current++;
    latestAgreement.current = null;
    setAgreement(null); setInvoice({ ...DEMO_INVOICE }); setQuoteId(DEMO_QUOTES[0].id); setBearer('supplier'); setStress(0);
    setMessages(initialMessages); setError(''); setConsent(false); setVerifyResult(null); setVerifyText(''); setVerifyLabel('');
    keys.current = {};
  }, []);

  function reset() {
    resetLocal();
    setModal(null);
    setRole('buyer');
    setScreen('chat');
    setNotice('Sample deal restored. Ready for another walkthrough.');
  }

  function sendMessage(text: string): boolean {
    const trimmed = text.trim().slice(0, 1500);
    if (!trimmed) return false;
    setMessages((current) => [...current, { id: randomUUID(), from: role, text: trimmed, time: clockTime() }]);
    return true;
  }

  async function reviewAgreement() {
    const started = generation.current;
    setBusy(true); setError('');
    try {
      const next = await createAgreement({
        version: 1,
        id: `SND-${randomUUID().slice(0, 8).toUpperCase()}`,
        createdAt: new Date().toISOString(),
        invoice: { ...invoice },
        quote: { ...quote },
        feeBearer: bearer,
        costs,
        terms: { deliveryWindow, note: termsNote },
        parties: names,
        disclosure: DISCLOSURE,
      });
      if (started !== generation.current) return;
      latestAgreement.current = next;
      setAgreement(next);
      setConsent(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not prepare this agreement. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function sign() {
    if (!agreement || !consent || busy) return;
    const started = generation.current;
    setBusy(true); setError('');
    try {
      const signer = keys.current[role] ?? await createSigner(role);
      keys.current[role] = signer;
      const signed = await signAgreement(agreement, signer);
      if (started !== generation.current || !latestAgreement.current) return;
      const next = await mergeAgreements(latestAgreement.current, signed);
      const result = await verifyAgreement(next);
      if (!result.valid) throw new Error(result.message);
      if (started !== generation.current) return;
      latestAgreement.current = next;
      setAgreement(next);
      setConsent(false);
      setNotice(next.signatures.length === 2 ? 'Both signatures verified. Your agreement is sealed.' : `${firstName(role)} signed. Ready for the other party.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Signature failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  /** Writes the sealed record to the cache directory and opens the system share sheet. */
  async function shareRecord() {
    if (!agreement) return;
    const result = await verifyAgreement(agreement);
    if (!result.valid || !result.complete) {
      setError('Both valid signatures are needed before exporting a sealed record.');
      return;
    }
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setError('Sharing is not available on this device. Copy the record from the verifier instead.');
        return;
      }
      const file = new File(Paths.cache, `${agreement.snapshot.id}.sanad.json`);
      if (file.exists) file.delete();
      file.create();
      file.write(exportAgreement(agreement));
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save or send the signed SANAD record' });
      setNotice('Record shared, including terms, public keys and both signatures.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The record could not be shared.');
    }
  }

  async function copyRecord() {
    if (!agreement) return;
    const result = await verifyAgreement(agreement);
    if (!result.valid || !result.complete) {
      setError('Both valid signatures are needed before exporting a sealed record.');
      return;
    }
    await Clipboard.setStringAsync(exportAgreement(agreement));
    setNotice('Signed record copied as JSON. Paste it anywhere to keep it.');
  }

  async function copyHash() {
    if (!agreement) return;
    await Clipboard.setStringAsync(agreement.hash);
    setNotice('Content fingerprint copied.');
  }

  async function checkRecord(value: unknown, label: string) {
    setBusy(true); setVerifyLabel(label); setVerifyResult(null);
    try {
      setVerifyResult(await verifyAgreement(value));
    } catch {
      setVerifyResult(unreadable('This record could not be read. Choose a SANAD JSON export.'));
    } finally {
      setBusy(false);
    }
  }

  async function pickRecord() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
      if (picked.canceled || !picked.assets[0]) return;
      const asset = picked.assets[0];
      if ((asset.size ?? 0) > MAX_RECORD_BYTES) {
        setVerifyResult(unreadable('This file is too large. Choose a SANAD JSON record smaller than 200 KB.'));
        return;
      }
      const text = await new File(asset.uri).text();
      if (text.length > MAX_RECORD_BYTES) {
        setVerifyResult(unreadable('This file is too large. Choose a SANAD JSON record smaller than 200 KB.'));
        return;
      }
      setVerifyText(text);
      await checkRecord(text, asset.name);
    } catch {
      setVerifyResult(unreadable('The file could not be opened. Choose a SANAD JSON export.'));
    }
  }

  async function pasteFromClipboard() {
    const text = (await Clipboard.getStringAsync()).slice(0, MAX_RECORD_BYTES);
    setVerifyText(text);
    if (text.trim()) await checkRecord(text, 'Pasted record');
  }

  /** Verifies a copy with the invoice raised by €1; the original is never touched. */
  function checkAlteredCopy() {
    if (!agreement) return;
    const altered = cloneJson(agreement);
    altered.snapshot.invoice.amountEur += 1;
    altered.snapshot.invoice.unitPriceEur = altered.snapshot.invoice.amountEur / altered.snapshot.invoice.quantity;
    altered.snapshot.costs = calculateCosts(altered.snapshot.invoice, altered.snapshot.quote, altered.snapshot.feeBearer);
    void checkRecord(altered, 'Test copy: invoice increased by €1');
  }

  function openVerifier() {
    setVerifyResult(null); setVerifyText(''); setVerifyLabel('');
    setModal('verify');
  }

  /** Returns validation issues; an empty list means the invoice was applied. */
  function saveInvoice(candidate: Invoice): string[] {
    const next = { ...candidate, amountEur: Math.round(candidate.quantity * candidate.unitPriceEur * 100) / 100 };
    const issues = validateInvoice(next);
    if (issues.length) return issues;
    if (next.amountEur < MIN_INVOICE_EUR) return [`Use an invoice of at least €${MIN_INVOICE_EUR} for these sample fee bands.`];
    setInvoice(next);
    setModal(null);
    setNotice('Invoice updated. All cost estimates have been recalculated.');
    return [];
  }

  function revise() {
    generation.current++;
    latestAgreement.current = null;
    setAgreement(null); setConsent(false); setModal(null);
    setNotice('New draft started. Both parties will need to sign the revised terms.');
  }

  function requestRevise() {
    if (agreement?.signatures.length) setModal('revise');
    else revise();
  }

  return {
    screen, setScreen, role, setRole, invoice, quote, quoteId, setQuoteId, bearer, setBearer, stress, setStress,
    agreement, messages, modal, setModal, busy, error, setError, notice, setNotice, consent, setConsent,
    verifyResult, verifyText, setVerifyText, verifyLabel,
    costs, scenario, bank, specialist, sealed, selectedSigned, usdcBreakdown,
    reset, sendMessage, reviewAgreement, sign, shareRecord, copyRecord, copyHash, checkRecord, pickRecord, pasteFromClipboard,
    checkAlteredCopy, openVerifier, saveInvoice, revise, requestRevise,
  };
}

export type Deal = ReturnType<typeof useDeal>;
