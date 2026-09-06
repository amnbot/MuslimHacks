import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import {
  buildSolanaPayUri, createBusinessSigner, createInvoice, createInvoiceRecord,
  exportInvoiceRecord, parseInvoiceRecord, pinInvoiceRecord, signInvoiceRecord,
  type BusinessSigner, type InvoiceRecord,
} from '../../../src/lib/business';
import { decryptRecord, encryptRecord, isEncryptedEnvelope } from '../crypto/envelope';

type Profile = { businessName: string; wallet: string };
export type BusinessTab = 'invoices' | 'wallet';
export type BusinessRoute = 'list' | 'create' | 'detail';
export type BusinessModal = 'import' | 'export' | 'security' | null;
const MAX_FILE_BYTES = 300_000;
const storageFile = () => new File(Paths.document, 'sanad-business-v1.json');
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';

export function useBusiness() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [records, setRecords] = useState<InvoiceRecord[]>([]);
  const recordsRef = useRef(records);
  const [tab, setTab] = useState<BusinessTab>('invoices');
  const [route, setRoute] = useState<BusinessRoute>('list');
  const [modal, setModal] = useState<BusinessModal>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [importText, setImportText] = useState('');
  const [importKey, setImportKey] = useState('');
  const [encryptedExport, setEncryptedExport] = useState<{ envelope: string; key: string } | null>(null);
  const signer = useRef<BusinessSigner | null>(null);
  const mounted = useRef(true);
  const operation = useRef(false);
  recordsRef.current = records;

  useEffect(() => {
    mounted.current = true;
    void (async () => {
      try {
        const file = storageFile();
        if (!file.exists) return;
        if (file.size > 5_000_000) throw new Error('The saved workspace is too large. Restore a trusted signed backup.');
        const saved: unknown = JSON.parse(await file.text());
        if (!saved || typeof saved !== 'object') throw new Error('Your saved workspace could not be read. Import a signed backup to restore invoices.');
        const data = saved as { profile?: unknown; records?: unknown };
        if (!data.profile || typeof data.profile !== 'object' || !Array.isArray(data.records) || data.records.length > 500) throw new Error('Your saved workspace is incomplete or exceeds 500 invoices.');
        const restored = data.profile as Partial<Profile>;
        if (typeof restored.businessName !== 'string' || !restored.businessName.trim() || restored.businessName.length > 120 || typeof restored.wallet !== 'string') throw new Error('Your saved business profile could not be read.');
        const verified: InvoiceRecord[] = [];
        let rejected = 0;
        for (const value of data.records) {
          try { verified.push(await parseInvoiceRecord(value)); } catch { rejected++; }
        }
        if (!mounted.current) return;
        setProfile({ businessName: restored.businessName, wallet: restored.wallet });
        setRecords(verified);
        if (rejected) setError(`${rejected} saved invoice${rejected === 1 ? '' : 's'} failed verification and could not be loaded. Import a trusted signed backup.`);
      } catch (caught) {
        if (mounted.current) setError(messageOf(caught));
      } finally {
        if (mounted.current) setReady(true);
      }
    })();
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!ready || !profile) return;
    try {
      const saved = JSON.stringify({ profile, records });
      if (new TextEncoder().encode(saved).length > 5_000_000) throw new Error('Storage limit');
      const file = storageFile();
      if (!file.exists) file.create();
      file.write(saved);
    } catch {
      setError('Changes are available for this session, but could not be saved on this device. Export your signed invoices to keep them.');
    }
  }, [ready, profile, records]);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timeout);
  }, [notice]);

  const selected = records.find((record) => record.invoice.id === selectedId) ?? null;

  async function run(action: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true); setError('');
    try { await action(); } catch (caught) { setError(messageOf(caught)); }
    finally { operation.current = false; setBusy(false); }
  }

  async function getSigner() {
    if (!profile) throw new Error('Add your business name first.');
    signer.current ??= await createBusinessSigner(profile.businessName);
    return signer.current;
  }

  function openModal(next: BusinessModal) {
    setError('');
    if (next === 'import') { setImportText(''); setImportKey(''); }
    if (next !== 'export') setEncryptedExport(null);
    setModal(next);
  }

  function saveProfile(businessName: string) {
    const name = businessName.trim();
    if (!name || name.length > 120 || /[\u0000-\u001f\u007f]/.test(name)) { setError('Enter a business name of 1 to 120 characters on one line.'); return; }
    setProfile({ businessName: name, wallet: '' }); setError('');
  }

  function openInvoice(record: InvoiceRecord) {
    setSelectedId(record.invoice.id); setTab('invoices'); setRoute('detail'); setError('');
  }

  async function saveInvoice(input: Parameters<typeof createInvoice>[0]) {
    await run(async () => {
      if (recordsRef.current.length >= 500) throw new Error('This workspace holds up to 500 invoices. Export your records before starting another workspace.');
      const invoice = createInvoice(input);
      const signed = await signInvoiceRecord(await createInvoiceRecord(invoice), await getSigner(), 'issuer');
      setRecords((current) => [signed, ...current]);
      openInvoice(signed);
      setNotice('Invoice created and signed. Share it with your customer.');
    });
  }

  async function acknowledge() {
    if (!selected || !profile) return;
    await run(async () => {
      const signed = await signInvoiceRecord(selected, await getSigner(), 'customer');
      const pinned = await pinInvoiceRecord(recordsRef.current.find((record) => record.invoice.id === signed.invoice.id), signed);
      setRecords((current) => current.map((record) => record.invoice.id === pinned.invoice.id ? pinned : record));
      setNotice('Acknowledgement signed. Share the updated record with the issuer.');
    });
  }

  async function importRecord() {
    await run(async () => {
      const plaintext = isEncryptedEnvelope(importText) ? await decryptRecord(importText, importKey.trim()) : importText;
      const incoming = await parseInvoiceRecord(plaintext);
      if (incoming.invoice.issuer !== profile?.businessName && incoming.invoice.customer !== profile?.businessName) throw new Error('This invoice is addressed to a different business. Check your business name with the sender.');
      if (recordsRef.current.length >= 500 && !recordsRef.current.some((record) => record.invoice.id === incoming.invoice.id)) throw new Error('This workspace holds up to 500 invoices.');
      const next = await pinInvoiceRecord(recordsRef.current.find((record) => record.invoice.id === incoming.invoice.id), incoming);
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
      if (text.length > MAX_FILE_BYTES) throw new Error('The copied record is too large. Choose a SANAD record smaller than 300 KB.');
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
    if (!encryptedExport || !selected) return;
    await run(async () => {
      if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable here. Use Copy encrypted record instead.');
      const file = new File(Paths.cache, 'invoice.sanad.encrypted.json');
      if (!file.exists) file.create();
      file.write(encryptedExport.envelope);
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Share encrypted invoice' });
    });
  }

  async function copy(value: string, confirmation: string) {
    await run(async () => { await Clipboard.setStringAsync(value); setNotice(confirmation); });
  }

  async function payInvoice() {
    if (!selected) return;
    await run(async () => {
      await parseInvoiceRecord(selected);
      const uri = buildSolanaPayUri(selected.invoice);
      try { await Linking.openURL(uri); }
      catch { throw new Error('No compatible wallet opened. Install a wallet that supports Solana Pay, or copy the payment request.'); }
      setNotice('Payment request opened in your wallet. Confirm the network and amount there.');
    });
  }

  async function openLink(url: string) {
    await run(async () => { await Linking.openURL(url); });
  }

  return {
    ready, profile, records, tab, setTab, route, setRoute, modal, openModal, selected, busy, error, setError, notice,
    importText, setImportText, importKey, setImportKey, encryptedExport,
    saveProfile, openInvoice, saveInvoice, acknowledge, importRecord, pickRecord, pasteRecord, prepareExport,
    shareEncrypted, copy, payInvoice, openLink,
    setWallet: (wallet: string) => setProfile((current) => current ? { ...current, wallet } : current),
  };
}

export type Business = ReturnType<typeof useBusiness>;
