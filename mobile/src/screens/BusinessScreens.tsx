import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { ArrowDownToLine, ArrowLeft, ArrowUpRight, CheckCheck, ChevronRight, Copy, FilePlus2, FileText, Fingerprint, FlaskConical, LockKeyhole, Plus, RefreshCw, Send, ShieldCheck, Trash2, TriangleAlert, Wallet } from 'lucide-react-native';
import { buildSolanaPayUri, CLUSTER_LABEL, CLUSTER_SHORT_LABEL, formatUsdc, invoiceStatus, parseUsdc, totalUsdc, type BusinessInvoice, type InvoiceLine } from '../../../src/lib/business';
import { NETWORK_FEE_NOTE } from '../../../src/lib/funding';
import { isEncryptedEnvelope } from '../crypto/envelope';
import {
  addressExplorerUrl, BASE_FEE_LAMPORTS, corridorOf, DEMO_SETTLEMENT_MICROS, DEMO_SETTLEMENT_NOTE, DEVNET_NOTICE,
  FAUCET_SOL_URL, FAUCET_USDC_URL, LAMPORTS_PER_SOL, PARTICIPANTS, PROFILE_IDS, PROFILES,
  TOKEN_ACCOUNT_RENT_LAMPORTS,
} from '../shared';
import { colors, fonts } from '../theme';
import { T } from '../components/T';
import { IconButton, PrimaryButton, SecondaryButton, TextButton } from '../components/Button';
import { Sheet } from '../components/Sheet';
import type { Workspace } from '../state/useWorkspace';

/** Kept as the local alias so the screens below read unchanged. */
type Business = Workspace;

const displayDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const today = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; };

function Field({ label, helper, multiline, ...props }: TextInputProps & { label: string; helper?: string }) {
  const [focused, setFocused] = useState(false);
  return <View style={s.field}>
    <T weight="semibold" size={13}>{label}</T>
    <TextInput {...props} accessibilityLabel={label} placeholderTextColor={colors.muted} selectionColor={colors.selectedBorder} multiline={multiline} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={[s.input, multiline && s.multiline, focused && s.inputFocused, props.style]} />
    {!!helper && <T size={12} color={colors.muted}>{helper}</T>}
  </View>;
}

export function ErrorNote({ error }: { error: string }) {
  if (!error) return null;
  return <View style={s.error} accessibilityRole="alert" accessibilityLiveRegion="assertive"><T size={13} color={colors.danger}>{error}</T></View>;
}

/** Names the network the invoice actually pins, rather than assuming mainnet. */
function NetworkLabel({ invoice }: { invoice?: BusinessInvoice }) {
  const network = invoice?.payment.network ?? 'solana-devnet';
  return <View style={s.network}><View style={s.networkDot} /><T size={12} weight="semibold" color={colors.tintText}>{CLUSTER_LABEL[network]}</T></View>;
}

function Page({ children }: { children: React.ReactNode }) {
  return <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.page}>{children}</ScrollView>;
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <View style={s.detailRow}><T size={12} color={colors.muted}>{label}</T><T selectable size={mono ? 11 : 14} mono={mono} style={{ flexShrink: 1 }}>{value}</T></View>;
}

export function InvoiceList({ business }: { business: Business }) {
  const [filter, setFilter] = useState<'all' | 'issued' | 'received'>('all');
  const name = business.profile.businessName;
  const visible = business.records.filter((record) => filter === 'all' || (filter === 'issued' ? record.invoice.issuer === name : record.invoice.customer === name && record.invoice.issuer !== name));
  return <Page>
    <View style={s.pageHead}>
      <T serif size={32} lineHeight={42}>Invoices</T>
      <T size={14} color={colors.muted}>Business terms, signed and ready to share.</T>
    </View>
    <ErrorNote error={business.error} />
    <PrimaryButton label="Create invoice" icon={Plus} onPress={() => { business.setError(''); business.setRoute('create'); }} />
    <View style={s.listToolbar}>
      <View style={s.filters}>
        {(['all', 'issued', 'received'] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={[s.filter, filter === value && s.filterActive]}><T size={12} weight={filter === value ? 'bold' : 'medium'} color={filter === value ? colors.ink : colors.muted}>{value === 'all' ? 'All' : value === 'issued' ? 'Issued' : 'Received'}</T></Pressable>)}
      </View>
      <IconButton icon={ArrowDownToLine} label="Import signed invoice" onPress={() => business.openModal('import')} />
    </View>
    {visible.length === 0 ? <View style={s.empty}>
      <FilePlus2 size={40} color={colors.green} strokeWidth={1.25} />
      <T serif size={25} lineHeight={34}>{filter === 'received' ? 'Ready for your next invoice' : filter === 'issued' ? 'Make your first invoice' : 'Your next agreement starts here'}</T>
      <T size={14} color={colors.muted}>{filter === 'received' ? 'Import a signed record from a supplier to review the details and add your acknowledgement.' : 'Add a customer, your goods or services, and a Solana wallet for payment. Each invoice gets your digital signature.'}</T>
      <TextButton label="Import an invoice" icon={ArrowDownToLine} size={14} onPress={() => business.openModal('import')} />
    </View> : <View style={s.invoiceList}>
      {visible.map((record) => {
        const issued = record.invoice.issuer === name;
        const acknowledged = invoiceStatus(record) === 'acknowledged';
        return <Pressable key={record.invoice.id} accessibilityRole="button" accessibilityLabel={`${record.invoice.reference}, ${formatUsdc(record.invoice.totalMicros)} USDC, ${acknowledged ? 'Acknowledged' : 'Awaiting acknowledgement'}`} onPress={() => business.openInvoice(record)} style={({ pressed }) => [s.invoiceRow, pressed && { backgroundColor: colors.pale }]}>
          <View style={s.rowBetween}><T weight="semibold" size={16} style={{ flex: 1 }}>{issued ? record.invoice.customer : record.invoice.issuer}</T><ChevronRight size={19} color={colors.muted} /></View>
          <T size={12} color={colors.muted}>{issued ? 'Issued' : 'Received'} · {record.invoice.reference}</T>
          <View style={s.rowBetween}><T size={20} serif tabular>{formatUsdc(record.invoice.totalMicros)} <T size={12}>USDC</T></T><T size={11} color={acknowledged ? colors.tintText : colors.statusText}>{acknowledged ? 'Acknowledged' : 'Awaiting acknowledgement'}</T></View>
          <T size={11} color={colors.muted}>{CLUSTER_SHORT_LABEL[record.invoice.payment.network]} · Due {displayDate(record.invoice.dueDate)}</T>
        </Pressable>;
      })}
    </View>}
    <View style={s.quietLine}><ShieldCheck size={17} color={colors.green} /><T size={12} color={colors.muted} style={{ flex: 1 }}>Signed here. Shared on your terms.</T><TextButton label="How it works" onPress={() => business.openModal('security')} /></View>
  </Page>;
}

type DraftLine = { id: number; description: string; quantity: string; price: string };

export function CreateInvoice({ business }: { business: Business }) {
  // A conversation parked before invoicing seeds the form with the terms already agreed there.
  const thread = business.activeThread;
  const draft = thread?.draft;
  const counterpart = thread ? PARTICIPANTS[thread.buyerId] : undefined;
  const [customer, setCustomer] = useState(counterpart?.businessName ?? '');
  const [reference, setReference] = useState(draft?.reference ?? `INV-${String(business.records.filter((record) => record.invoice.issuer === business.profile.businessName).length + 1).padStart(3, '0')}`);
  const [dueDate, setDueDate] = useState(draft?.dueDate ?? today());
  const [wallet, setWallet] = useState(business.profile.wallet.address);
  // Binding the agreed route and fee bearer into the note puts the negotiated
  // decision inside the signed record, not just in the conversation around it.
  const [note, setNote] = useState(() => {
    if (!thread) return '';
    const quote = corridorOf(thread).quotes.find((option) => option.id === thread.quoteId);
    const terms = `Agreed route: ${quote?.name ?? thread.quoteId}. Downstream fees are covered by the ${thread.bearer === 'buyer' ? 'buyer, so the invoiced amount arrives in full' : 'supplier, and are deducted on arrival'}.`;
    return draft?.note ? `${draft.note}\n${terms}` : terms;
  });
  const [lines, setLines] = useState<DraftLine[]>(
    draft?.lines.map((line, index) => ({ id: index + 1, description: line.description, quantity: String(line.quantity), price: line.unitPriceUsdc }))
      ?? [{ id: 1, description: '', quantity: '1', price: '' }],
  );
  const [localError, setLocalError] = useState('');
  const updateLine = (id: number, key: keyof Omit<DraftLine, 'id'>, value: string) => setLines((current) => current.map((line) => line.id === id ? { ...line, [key]: value } : line));
  const parseLines = (): InvoiceLine[] => lines.map((line) => ({ description: line.description.trim(), quantity: Number(line.quantity), unitPriceMicros: parseUsdc(line.price) }));
  let total = '—';
  try { total = formatUsdc(totalUsdc(parseLines())); } catch { /* Incomplete amount fields have no total yet. */ }
  async function save() {
    setLocalError('');
    try {
      await business.saveInvoice({ issuer: business.profile.businessName, customer: customer.trim(), reference: reference.trim(), dueDate: dueDate.trim(), note: note.trim(), recipientWallet: wallet.trim(), lines: parseLines() });
    } catch (caught) { setLocalError(caught instanceof Error ? caught.message : 'Check your invoice fields and try again.'); }
  }
  return <Page>
    <TextButton label="Invoices" icon={ArrowLeft} size={14} onPress={() => business.setRoute('list')} />
    <T serif size={30} lineHeight={40}>Create invoice</T>
    <T size={14} color={colors.muted}>Issued by {business.profile.businessName}{counterpart ? ` · for ${counterpart.businessName}` : ''}</T>
    {!!draft && <T size={12} color={colors.tintText}>Prefilled from the terms agreed in your conversation. Check every figure before signing.</T>}
    <View style={s.formSection}>
      <Field label="Customer business name" value={customer} onChangeText={setCustomer} placeholder="Who is this invoice for?" maxLength={120} helper="Use the same business name your customer uses in SANAD." />
      <View style={s.fieldColumns}><View style={s.column}><Field label="Invoice reference" value={reference} onChangeText={setReference} maxLength={80} /></View><View style={s.column}><Field label="Due date" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" autoCapitalize="none" maxLength={10} /></View></View>
    </View>
    <View style={s.sectionHeading}><T serif size={23}>Goods & services</T><T size={12} color={colors.muted}>Prices in USDC</T></View>
    <View>
      {lines.map((line, index) => <View key={line.id} style={s.lineEditor}>
        <View style={s.rowBetween}><T weight="semibold" size={13}>Item {index + 1}</T>{lines.length > 1 && <IconButton icon={Trash2} label={`Remove item ${index + 1}`} size={17} onPress={() => setLines((current) => current.filter((item) => item.id !== line.id))} />}</View>
        <Field label="Description" placeholder="Product, service or project milestone" value={line.description} onChangeText={(value) => updateLine(line.id, 'description', value)} maxLength={300} />
        <View style={s.fieldColumns}><View style={s.column}><Field label="Quantity" value={line.quantity} onChangeText={(value) => updateLine(line.id, 'quantity', value)} keyboardType="decimal-pad" /></View><View style={s.column}><Field label="Unit price · USDC" placeholder="0.00" value={line.price} onChangeText={(value) => updateLine(line.id, 'price', value)} keyboardType="decimal-pad" /></View></View>
      </View>)}
      <TextButton label="Add line item" icon={Plus} size={14} disabled={lines.length >= 50} onPress={() => setLines((current) => [...current, { id: Math.max(...current.map((line) => line.id)) + 1, description: '', quantity: '1', price: '' }])} />
    </View>
    <View style={s.totalRow}><T weight="semibold" size={15}>Invoice total</T><T serif size={25} tabular>{total} <T size={13}>USDC</T></T></View>
    <View style={s.formSection}>
      <Field label="Your receiving Solana wallet" placeholder="Solana wallet address" value={wallet} onChangeText={setWallet} autoCapitalize="none" autoCorrect={false} maxLength={44} helper="Your customer pays native USDC on Solana devnet to this address. Check it carefully before signing." />
      <Field label="Terms & context (optional)" placeholder="Delivery details, scope, or agreed payment terms" value={note} onChangeText={setNote} multiline maxLength={2000} />
      <NetworkLabel />
      <ErrorNote error={localError || business.error} />
      <PrimaryButton label={business.busy ? 'Creating & signing…' : 'Create & sign invoice'} onPress={() => void save()} disabled={business.busy} icon={Fingerprint} />
      <T size={12} color={colors.muted}>Signing binds the invoice details to your device’s signing key. Share the record for your customer’s acknowledgement. It does not move money.</T>
    </View>
  </Page>;
}

export function InvoiceDetail({ business }: { business: Business }) {
  const [consent, setConsent] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(false);
  const [signatureDetails, setSignatureDetails] = useState(false);
  const record = business.selected;
  if (!record) return null;
  const invoice = record.invoice;
  const acknowledged = invoiceStatus(record) === 'acknowledged';
  const isIssuer = invoice.issuer === business.profile.businessName;
  const isCustomer = invoice.customer === business.profile.businessName && !isIssuer;
  return <Page>
    <TextButton label="All invoices" icon={ArrowLeft} size={14} onPress={() => business.setRoute('list')} />
    <View style={s.rowBetween}><T serif size={30} lineHeight={40} style={{ flex: 1 }}>{invoice.reference}</T><View style={[s.status, acknowledged && s.statusAgreed]}>{acknowledged ? <CheckCheck size={15} color={colors.tintText} /> : <Fingerprint size={15} color={colors.statusText} />}<T size={11} weight="semibold" color={acknowledged ? colors.tintText : colors.statusText}>{acknowledged ? 'Acknowledged' : 'Issuer signed'}</T></View></View>
    <NetworkLabel invoice={invoice} />
    <ErrorNote error={business.error} />
    <View style={s.invoicePaper}>
      <View style={s.parties}><DetailRow label="From" value={invoice.issuer} /><DetailRow label="Bill to" value={invoice.customer} /></View>
      <View style={s.parties}><DetailRow label="Issued" value={new Date(invoice.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} /><DetailRow label="Due" value={displayDate(invoice.dueDate)} /></View>
      {invoice.lines.map((line, index) => <View key={index} style={s.invoiceItem}><View style={{ flex: 1, gap: 3 }}><T weight="semibold" size={14}>{line.description}</T><T size={12} color={colors.muted}>{line.quantity} × {formatUsdc(line.unitPriceMicros)} USDC</T></View><T size={15} tabular>{formatUsdc(totalUsdc([line]))}</T></View>)}
      <View style={s.invoiceTotal}><T weight="semibold" size={14}>Total due</T><T serif size={27} tabular>{formatUsdc(invoice.totalMicros)} <T size={13}>USDC</T></T></View>
      {!!invoice.note && <View style={s.terms}><T size={12} weight="semibold">Terms & context</T><T selectable size={14}>{invoice.note}</T></View>}
    </View>
    <View style={s.formSection}>
      <T serif size={23}>A shared, signed record</T>
      <T size={14} color={colors.muted}>{acknowledged ? 'Both signatures verify against these invoice details. Keep a copy with your business records.' : isCustomer ? 'Review the invoice, then add your business acknowledgement and return the signed record to the issuer.' : isIssuer ? 'Your invoice is signed. Share it with your customer, then import their acknowledgement.' : `This invoice is addressed to ${invoice.customer}. You can verify and keep the record.`}</T>
      {isCustomer && !acknowledged && <>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consent }} accessibilityLabel="I have reviewed and acknowledge this invoice" onPress={() => setConsent((current) => !current)} style={s.consent}><View style={[s.checkbox, consent && s.checkboxChecked]}>{consent && <CheckCheck size={16} color={colors.paper} />}</View><T size={14} style={{ flex: 1 }}>I have reviewed and acknowledge this invoice.</T></Pressable>
        <PrimaryButton label={business.busy ? 'Signing acknowledgement…' : 'Sign acknowledgement'} icon={Fingerprint} onPress={() => void business.acknowledge()} disabled={business.busy || !consent} />
      </>}
      <SecondaryButton label="Share encrypted record" icon={LockKeyhole} onPress={() => void business.prepareExport()} disabled={business.busy} />
      <TextButton label={signatureDetails ? 'Hide signature details' : 'View signature details'} icon={ShieldCheck} size={13} onPress={() => setSignatureDetails((current) => !current)} />
      {signatureDetails && <View style={s.technical}>
        <T size={12}>SHA-256 fingerprint</T><T selectable mono size={10}>{record.hash}</T>
        <T size={12} color={colors.muted}>ECDSA P-256 signatures: {record.signatures.length} of 2. Signatures establish possession of a signing key; names and wallets are self-declared. Verify your counterparty separately.</T>
        <TextButton label="Copy fingerprint" icon={Copy} onPress={() => void business.copy(record.hash, 'Invoice fingerprint copied.')} />
        <TextButton label="Test a tampered copy" icon={ShieldCheck} onPress={() => void business.checkAlteredCopy()} />
        <T size={12} color={colors.muted}>Raises one line price on a throwaway copy and re-verifies it. The saved record is never touched.</T>
      </View>}
    </View>
    <View style={s.paymentSection}>
      <T serif size={23}>Payment</T>
      <NetworkLabel invoice={invoice} />
      <T size={14} color={colors.muted}>Invoice total: {formatUsdc(invoice.totalMicros)} USDC to {invoice.issuer}. SANAD charges no payment fee.</T>
      <T size={12} color={colors.muted}>{NETWORK_FEE_NOTE}</T>
      {isCustomer && <>
        <PrimaryButton label={business.paying ? 'Confirming on devnet…' : `Pay ${formatUsdc(DEMO_SETTLEMENT_MICROS)} USDC on devnet`} icon={ArrowUpRight} onPress={() => void business.payInvoice()} disabled={business.busy || business.paying} />
        <T size={12} color={colors.muted}>{DEMO_SETTLEMENT_NOTE}</T>
        <T size={12} color={colors.muted}>Nothing is marked paid until the network confirms the transaction.</T>
      </>}
      {!isCustomer && <T size={12} color={colors.muted}>Check your wallet balance to confirm what arrived. Opening a request never marks an invoice paid.</T>}
      <TextButton label={paymentDetails ? 'Hide payment details' : 'View payment details'} icon={Wallet} size={13} onPress={() => setPaymentDetails((current) => !current)} />
      {paymentDetails && <View style={s.technical}>
        <DetailRow label="Blockchain" value={CLUSTER_SHORT_LABEL[invoice.payment.network]} />
        <DetailRow label="Asset" value="Native USDC · 6 decimals" />
        <DetailRow label="Recipient wallet" value={invoice.payment.recipientWallet} mono />
        <DetailRow label="USDC mint" value={invoice.payment.mint} mono />
        <TextButton label="Copy payment request" icon={Copy} onPress={() => void business.copy(buildSolanaPayUri(invoice), 'Solana Pay request copied.')} />
        <TextButton label="View receiving wallet on the explorer" icon={ArrowUpRight} onPress={() => void business.openLink(addressExplorerUrl(invoice.payment.recipientWallet))} />
        <T size={12} color={colors.warningText}>{DEVNET_NOTICE}</T>
      </View>}
    </View>
  </Page>;
}

const sol = (lamports: number) => (lamports / LAMPORTS_PER_SOL).toFixed(6);

/** A live devnet wallet: real derived address, real balances, real faucet links. */
export function WalletScreen({ business }: { business: Business }) {
  const address = business.profile.wallet.address;
  const balances = business.balances;
  const needsSol = !!balances && balances.sol < BASE_FEE_LAMPORTS * 10;
  return <Page>
    <View style={s.pageHead}><T serif size={32} lineHeight={42}>Wallet</T><T size={14} color={colors.muted}>{business.profile.businessName}</T></View>
    <NetworkLabel />
    <View style={s.devnetBanner}><TriangleAlert size={17} color={colors.warningText} /><T size={12} color={colors.warningText} style={{ flex: 1 }}>{DEVNET_NOTICE}</T></View>
    <ErrorNote error={business.error} />

    <View style={s.balanceCard}>
      <T size={12} color={colors.muted}>USDC balance</T>
      <T serif size={40} lineHeight={50} tabular>{balances ? formatUsdc(balances.usdc) : '—'}</T>
      <View style={s.rowBetween}>
        <T size={12} color={colors.muted} tabular>{balances ? `${sol(balances.sol)} SOL for network fees` : 'Not loaded'}</T>
        <T size={11} color={colors.muted}>{balances ? `as of ${balances.at}` : ''}</T>
      </View>
      <SecondaryButton label={business.loadingBalances ? 'Reading devnet…' : 'Refresh from devnet'} icon={RefreshCw} onPress={() => void business.refreshBalances()} disabled={business.loadingBalances} />
    </View>

    <View style={s.formSection}>
      <T serif size={23}>Receiving address</T>
      <T selectable mono size={12}>{address}</T>
      <TextButton label="Copy address" icon={Copy} size={14} onPress={() => void business.copy(address, 'Devnet address copied.')} />
      <TextButton label="View on the Solana explorer" icon={ArrowUpRight} size={14} onPress={() => void business.openLink(addressExplorerUrl(address))} />
      <T size={12} color={colors.muted}>Derived on this device from a published demo label, so both phones agree on it without a server. Never derive a wallet holding real value this way.</T>
    </View>

    <View style={s.formSection}>
      <T serif size={23}>Fund this wallet</T>
      {needsSol && <T size={13} color={colors.warningText}>This wallet has too little SOL to pay a network fee. Fund SOL before paying an invoice.</T>}
      <View style={s.depositNote}>
        <ArrowDownToLine size={19} color={colors.tintText} />
        <View style={{ flex: 1, gap: 4 }}>
          <T size={14} weight="semibold" color={colors.tintText}>Devnet USDC</T>
          <T size={13} color={colors.tintText}>Circle's faucet sends test USDC to any Solana devnet address. Paste the address above.</T>
        </View>
      </View>
      <PrimaryButton label="Open the USDC faucet" icon={ArrowUpRight} onPress={() => void business.openLink(FAUCET_USDC_URL)} />
      <SecondaryButton label="Open the SOL faucet" icon={ArrowUpRight} onPress={() => void business.openLink(FAUCET_SOL_URL)} />
      <TextButton label="Try an in-app SOL airdrop" size={14} onPress={() => void business.requestSol()} disabled={business.busy} />
      <T size={12} color={colors.muted}>The public airdrop endpoint is frequently rate limited; the web faucet is the reliable route.</T>
    </View>

    <View style={s.formSection}>
      <T serif size={23}>What a payment costs</T>
      <View style={s.feeRow}><T size={13} style={{ flex: 1 }}>SANAD fee</T><T size={13} weight="semibold" tabular>0.00</T></View>
      <View style={s.feeRow}><T size={13} style={{ flex: 1 }}>Solana base network fee</T><T size={13} weight="semibold" tabular>{sol(BASE_FEE_LAMPORTS)} SOL</T></View>
      <View style={s.feeRow}><T size={13} style={{ flex: 1 }}>New recipient token account, if needed</T><T size={13} weight="semibold" tabular>{sol(TOKEN_ACCOUNT_RENT_LAMPORTS)} SOL</T></View>
      <T size={12} color={colors.muted}>The token-account deposit is refundable when that account is closed. A priority fee may be added at busy times, so treat these as the floor, not the final cost.</T>
      <T size={12} color={colors.muted}>{NETWORK_FEE_NOTE}</T>
    </View>
  </Page>;
}

export function BusinessSheets({ business }: { business: Business }) {
  const [copied, setCopied] = useState('');
  if (!business.modal) return null;
  const close = () => { setCopied(''); business.openModal(null); };
  if (business.modal === 'import') return <Sheet title="Import signed invoice" onClose={close}>
    <View style={s.formSection}>
      <T size={14} color={colors.muted}>Open an invoice shared by another business, or bring back a customer’s signed acknowledgement. The record is verified before it enters your workspace.</T>
      <SecondaryButton label="Choose invoice file" icon={ArrowDownToLine} onPress={() => void business.pickRecord()} disabled={business.busy} />
      <TextButton label="Paste from clipboard" icon={Copy} size={14} onPress={() => void business.pasteRecord()} disabled={business.busy} />
      <Field label="Signed record" placeholder="Paste a SANAD record or encrypted envelope" value={business.importText} onChangeText={business.setImportText} multiline autoCapitalize="none" autoCorrect={false} maxLength={300_000} style={{ height: 145, fontFamily: fonts.mono, fontSize: 11 }} />
      {isEncryptedEnvelope(business.importText) && <Field label="Decryption key" placeholder="Paste the key shared separately" value={business.importKey} onChangeText={business.setImportKey} autoCapitalize="none" autoCorrect={false} secureTextEntry helper="Ask the sender for this key through a separate channel." />}
      <ErrorNote error={business.error} />
      <PrimaryButton label={business.busy ? 'Verifying record…' : 'Verify & import'} icon={ShieldCheck} onPress={() => void business.importRecord()} disabled={business.busy || !business.importText.trim() || (isEncryptedEnvelope(business.importText) && !business.importKey.trim())} />
      <T size={12} color={colors.muted}>A valid signature proves that a key signed these details. Confirm the sender’s identity and invoice details through a channel you trust.</T>
    </View>
  </Sheet>;
  if (business.modal === 'export' && business.encryptedExport) return <Sheet title="Share encrypted record" onClose={close}>
    <View style={s.formSection}>
      <View style={s.quietLine}><LockKeyhole size={25} color={colors.green} /><T serif size={24} style={{ flex: 1 }}>Only the key opens it.</T></View>
      <T size={14} color={colors.muted}>Your signed invoice is encrypted with AES-256-GCM. Send the encrypted record first, then send its decryption key through a separate trusted channel.</T>
      <PrimaryButton label="Share encrypted file" icon={Send} onPress={() => void business.shareEncrypted()} disabled={business.busy} />
      <SecondaryButton label="Copy encrypted record" icon={Copy} onPress={() => { void business.copy(business.encryptedExport!.envelope, 'Encrypted invoice copied.'); setCopied('Encrypted record copied.'); }} disabled={business.busy} />
      <View style={s.keySection}><T weight="semibold" size={14}>Separate decryption key</T><T mono selectable size={12}>{business.encryptedExport.key}</T><TextButton label="Copy decryption key" icon={Copy} size={14} onPress={() => { void business.copy(business.encryptedExport!.key, 'Decryption key copied. Share it separately.'); setCopied('Key copied. Share it separately from the record.'); }} disabled={business.busy} /><T size={12} color={colors.muted}>Keep this sheet open until you have shared both. Reopening it creates a new encrypted file and key.</T></View>
      {!!copied && <T accessibilityLiveRegion="polite" size={13} color={colors.tintText}>{copied}</T>}
      <ErrorNote error={business.error} />
      <T size={12} color={colors.muted}>Anyone with both the file and key can read the invoice. The unencrypted record remains in your workspace on this device. Sharing is manual; it does not send or sync the invoice automatically.</T>
    </View>
  </Sheet>;
  if (business.modal === 'profile') return <Sheet title="Demo profile" onClose={close}>
    <View style={s.formSection}>
      <T size={14} color={colors.muted}>Both businesses are already signed in for this walkthrough. Switch seats to see the same deal from the other side.</T>
      {PROFILE_IDS.map((id) => {
        const option = PROFILES[id];
        const active = business.profileId === id;
        return <Pressable key={id} accessibilityRole="radio" accessibilityState={{ checked: active }} accessibilityLabel={`${option.personName}, ${option.businessName}`} onPress={() => { business.switchProfile(id); close(); }} style={({ pressed }) => [s.profileOption, active && s.profileActive, pressed && { opacity: 0.85 }]}>
          <View style={s.profileAvatar}><T weight="bold" size={13} color={colors.avatarText}>{option.initials}</T></View>
          <View style={{ flex: 1, gap: 3 }}>
            <T weight="semibold" size={16}>{option.personName}</T>
            <T size={13} color={colors.muted}>{option.businessName} · {option.country}</T>
            <T size={12} color={colors.tintText}>{option.role === 'seller' ? 'Sells and invoices' : 'Buys and pays'}</T>
            <T selectable mono size={10} color={colors.muted}>{option.wallet.address}</T>
          </View>
          {active && <CheckCheck size={19} color={colors.tintText} />}
        </Pressable>;
      })}
      <SecondaryButton label="Restore the seeded conversations" onPress={() => { business.resetDemo(); close(); }} />
      <T size={12} color={colors.muted}>Resetting clears anything created during a walkthrough and brings back the original threads.</T>
    </View>
  </Sheet>;
  if (business.modal === 'security') return <Sheet title="Your records & privacy" onClose={close}>
    <View style={s.formSection}>
      <T serif size={25}>{business.profile.businessName}</T>
      <T size={13} color={colors.muted}>The business using this device. Names and payment wallet ownership are self-declared.</T>
      <View style={s.securityItem}><FlaskConical size={23} color={colors.green} /><View style={s.column}><T weight="semibold" size={16}>What is real, and what is staged</T><T size={14} color={colors.muted}>The conversations, participants, rates and fee estimates are synthetic. The fingerprints, signatures, encryption and the Solana devnet transfer are genuine. Each phone builds and signs its own copy of the seeded invoice, so the two devices have not exchanged or verified each other's keys.</T></View></View>
      <View style={s.securityItem}><ShieldCheck size={23} color={colors.green} /><View style={s.column}><T weight="semibold" size={16}>Changes leave a trace</T><T size={14} color={colors.muted}>Each invoice has a SHA-256 fingerprint and ECDSA P-256 signatures. Changing a signed amount, business name, line item or payment wallet breaks verification. Imported updates must match the record and signing keys already saved here.</T></View></View>
      <View style={s.securityItem}><LockKeyhole size={23} color={colors.green} /><View style={s.column}><T weight="semibold" size={16}>Encrypted when you share</T><T size={14} color={colors.muted}>Shared files use AES-256-GCM with a fresh random key and nonce. The key is never included in the file. Share the key separately to protect the invoice in transit.</T></View></View>
      <View style={s.securityItem}><Fingerprint size={23} color={colors.green} /><View style={s.column}><T weight="semibold" size={16}>One business, one device</T><T size={14} color={colors.muted}>Your private signing key stays in memory for the current app session and is not exported. Reopening the app creates a new key when you next sign. Existing signed records still verify, but this is not a permanent verified business identity.</T></View></View>
      <View style={s.securityItem}><FileText size={23} color={colors.green} /><View style={s.column}><T weight="semibold" size={16}>Know what stays public</T><T size={14} color={colors.muted}>Invoice records live in memory for this session only. There is no cloud sync or encrypted chat. Solana transfers, addresses and amounts are public on-chain; file encryption does not hide them. Keep invoice text and customer details off-chain.</T></View></View>
      <T size={12} color={colors.muted}>The demo wallets are derived from labels published in this repository. That is safe only because they are devnet keys with no financial value, and it is never an acceptable way to derive a wallet holding real funds.</T>
    </View>
  </Sheet>;
  return null;
}

const s = StyleSheet.create({
  page: { flexGrow: 1, width: '100%', maxWidth: 700, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, gap: 14 },
  pageHead: { gap: 6, marginBottom: 8 },
  welcome: { gap: 20, paddingTop: 16, paddingBottom: 22 },
  largeSeal: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chip, borderRadius: 16 },
  formSection: { gap: 16, marginTop: 12 },
  field: { gap: 7 },
  input: { minHeight: 52, paddingVertical: 12, paddingHorizontal: 13, fontFamily: fonts.sans, fontSize: 16, color: colors.ink, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 13 },
  inputFocused: { borderColor: colors.green, borderWidth: 2, paddingVertical: 11, paddingHorizontal: 12 },
  multiline: { minHeight: 106, textAlignVertical: 'top' },
  fieldColumns: { flexDirection: 'row', gap: 12 },
  column: { flex: 1, gap: 6 },
  error: { padding: 14, borderRadius: 12, backgroundColor: colors.dangerBg },
  network: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.tint, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  networkDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.tintText },
  bottomNote: { marginTop: 12 },
  listToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 },
  filters: { flexDirection: 'row', gap: 2, flex: 1 },
  filter: { minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  filterActive: { backgroundColor: colors.chip },
  empty: { gap: 15, paddingVertical: 32, paddingHorizontal: 6 },
  invoiceList: { borderTopColor: colors.line, borderTopWidth: 1 },
  invoiceRow: { gap: 6, paddingVertical: 20, paddingHorizontal: 2, borderBottomColor: colors.line, borderBottomWidth: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  quietLine: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  sectionHeading: { marginTop: 18, gap: 4 },
  lineEditor: { paddingVertical: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', backgroundColor: colors.pale, borderRadius: 13, padding: 16 },
  status: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.statusBg, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 999 },
  statusAgreed: { backgroundColor: colors.tint },
  invoicePaper: { marginTop: 10, backgroundColor: colors.paper, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.line },
  parties: { flexDirection: 'row', gap: 16, paddingBottom: 18 },
  detailRow: { flex: 1, gap: 4 },
  invoiceItem: { flexDirection: 'row', gap: 14, paddingVertical: 15, borderTopWidth: 1, borderTopColor: colors.line },
  invoiceTotal: { paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  terms: { marginTop: 20, gap: 7 },
  consent: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, minHeight: 48 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.forest },
  technical: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.line, gap: 14 },
  paymentSection: { gap: 14, paddingTop: 24, marginTop: 8, borderTopWidth: 1, borderTopColor: colors.line },
  depositNote: { backgroundColor: colors.tint, borderRadius: 13, padding: 16, gap: 12, flexDirection: 'row' },
  providers: { borderTopWidth: 1, borderTopColor: colors.line },
  provider: { paddingVertical: 19, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 8 },
  keySection: { gap: 10, backgroundColor: colors.pale, borderRadius: 13, padding: 16, marginTop: 10 },
  securityItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderTopColor: colors.line, borderTopWidth: 1, paddingTop: 20, marginTop: 7 },
  devnetBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.warning, borderRadius: 12, padding: 13 },
  balanceCard: { gap: 10, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 18, marginTop: 6 },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  profileOption: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.inputBg },
  profileActive: { borderColor: colors.selectedBorder, backgroundColor: colors.greenSoft },
  profileAvatar: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.avatarBg, alignItems: 'center', justifyContent: 'center' },
});
