import { Pressable, StyleSheet, View } from 'react-native';
import Checkbox from 'expo-checkbox';
import { ArrowRight, Check, CheckCheck, Copy, FileText, FingerprintPattern, RotateCcw, Share2, ShieldCheck, Users } from 'lucide-react-native';
import { colors } from '../theme';
import { T } from '../components/T';
import { PrimaryButton, SecondaryButton, TextButton } from '../components/Button';
import { Disclosure } from '../components/Disclosure';
import { cad, eur, range, shortTime } from '../format';
import type { PartyId } from '../shared';
import { firstName, names, otherParty, type Deal } from '../state/useDeal';

function Term({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.term}>
      <Check size={14} color="#5f824a" strokeWidth={2} style={{ marginTop: 5 }} />
      <T size={13} color="#526e45" lineHeight={24} style={{ flex: 1 }}>{children}</T>
    </View>
  );
}

function Cell({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={{ flex: 1, minWidth: '45%' }}>
      <T size={12} color="#60774f" style={{ marginBottom: 6 }}>{label}</T>
      <T weight="semibold" size={18} lineHeight={27} tabular>{value}</T>
      <T size={11} color="#5f7851" lineHeight={16} style={{ marginTop: 5 }}>{hint}</T>
    </View>
  );
}

export function AgreementSheet({ deal }: { deal: Deal }) {
  const { agreement, sealed, role, setRole, selectedSigned, consent, setConsent, busy, sign, shareRecord, copyRecord, copyHash, openVerifier, requestRevise } = deal;
  if (!agreement) return null;
  const { snapshot } = agreement;
  const buyerCovers = snapshot.feeBearer === 'buyer';

  return (
    <View>
      <View style={styles.heading}>
        <View style={{ flex: 1 }}>
          <T weight="semibold" size={21} lineHeight={29} style={{ letterSpacing: -0.5 }} accessibilityRole="header">{sealed ? 'Agreed. And worth keeping.' : 'A clear agreement, for both of you.'}</T>
          <T size={13} color={colors.muted} lineHeight={22} style={{ marginTop: 6 }}>{sealed ? 'The same terms. Two signatures. Your shared record.' : 'Review the snapshot, then add your signature.'}</T>
        </View>
        <View style={[styles.status, sealed && styles.statusSealed]}>
          {sealed ? <ShieldCheck size={13} color="#54753d" strokeWidth={2} /> : <FileText size={13} color={colors.statusText} strokeWidth={2} />}
          <T size={9} lineHeight={12} color={sealed ? '#54753d' : colors.statusText}>{sealed ? 'Sealed' : 'Awaiting'}</T>
        </View>
      </View>

      {sealed && (
        <View style={styles.seal}>
          <View style={styles.sealIcon}><CheckCheck size={26} color="#537840" strokeWidth={1.8} /></View>
          <View style={{ flex: 1 }}>
            <T weight="bold" size={14} color={colors.sealText} lineHeight={22}>Both signatures verified</T>
            <T size={11} color="#5a764a" lineHeight={19} style={{ marginTop: 3 }}>Changes to these signed terms fail verification.</T>
          </View>
        </View>
      )}

      <View style={styles.document}>
        <View style={styles.documentTop}>
          <T size={10} color="#657a55">Trade cost agreement</T>
          <T mono size={10} color="#657a55">{snapshot.id}</T>
        </View>
        <T serif size={26} lineHeight={36} style={{ marginTop: 17, letterSpacing: -0.6 }}>{snapshot.invoice.goods}</T>
        <T size={11} color="#657b55" style={{ marginTop: 10 }}>{names.buyer}  ↔  {names.supplier}</T>
        <View style={styles.grid}>
          <Cell label="Invoice" value={eur(snapshot.invoice.amountEur)} hint={`${snapshot.invoice.quantity} bottles × ${eur(snapshot.invoice.unitPriceEur)}`} />
          <Cell label="Selected route" value={snapshot.quote.name} hint={snapshot.quote.id === 'usdc-route' ? 'Simulated CAD → USDC → EUR' : 'Synthetic quote · CAD → EUR'} />
          <Cell label="Buyer budgets" value={range(snapshot.costs.totalMinCad, snapshot.costs.totalMaxCad)} hint="Estimated CAD outlay" />
          <Cell label="Supplier expects" value={range(snapshot.costs.recipientMinEur, snapshot.costs.recipientMaxEur, 'EUR')} hint={buyerCovers ? 'Full invoice target · not guaranteed' : 'After estimated deductions'} />
        </View>
        <View style={styles.terms}>
          <Term><T weight="bold" size={13} color="#526e45">{buyerCovers ? 'Bilal (buyer)' : 'Amira (supplier)'}</T> covers downstream fees, estimated at {range(snapshot.quote.downstreamFeeEur.min, snapshot.quote.downstreamFeeEur.max, 'EUR')}.</Term>
          <Term>Payment due <T weight="bold" size={13} color="#526e45">{snapshot.invoice.dueDate}</T>. Delivery: {snapshot.terms.deliveryWindow}.</Term>
          <Term>{snapshot.terms.note}</Term>
        </View>
        <Disclosure label="Rate, fee assumptions & record details" size={12} weight="regular" style={{ marginTop: 6 }} contentStyle={{ gap: 10, paddingBottom: 8 }}>
          <T size={11} color="#5f7650" lineHeight={21}>Reference: {snapshot.quote.referenceRate.toFixed(4)} CAD/EUR. Customer rate: {snapshot.quote.rateCadPerEur.toFixed(5)} CAD/EUR. Transfer fee: {cad(snapshot.quote.transferFeeCad)}.</T>
          <T size={11} color="#5f7650" lineHeight={21}>{snapshot.quote.source} · {snapshot.quote.asOf}</T>
          <T size={11} color="#5f7650" lineHeight={21}>Created {new Date(snapshot.createdAt).toLocaleString()}. The displayed signature times come from this device.</T>
          <T size={11} color="#5f7650" lineHeight={21}>{snapshot.disclosure}</T>
        </Disclosure>
      </View>

      <View style={styles.signatures}>
        {(['buyer', 'supplier'] as PartyId[]).map((party) => {
          const signature = agreement.signatures.find((entry) => entry.partyId === party);
          return (
            <View key={party} style={styles.slot} accessibilityLabel={`${party} signature: ${signature ? 'signed' : 'pending'}`}>
              <View style={styles.slotLabel}>
                <T size={10} color="#677b58">{party === 'buyer' ? 'Buyer' : 'Supplier'}</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  {signature && <Check size={12} color="#4e773b" strokeWidth={2.2} />}
                  <T size={10} color={signature ? '#4e773b' : '#677b58'}>{signature ? 'Signed' : 'Pending'}</T>
                </View>
              </View>
              {signature
                ? <T serif size={18} lineHeight={26} color="#3a6235" style={{ minHeight: 40 }}>{names[party]}</T>
                : <T weight="medium" size={13} lineHeight={21} style={{ minHeight: 40 }}>{names[party]}</T>}
              <T size={10} color="#637d51" style={{ marginTop: 8 }}>{signature ? `Verified · ${shortTime(signature.signedAt)}` : 'Ready to review and sign'}</T>
            </View>
          );
        })}
      </View>

      {!sealed ? (
        <View style={styles.signing}>
          {selectedSigned ? (
            <>
              <View style={styles.signedWait}>
                <Check size={18} color="#526f41" strokeWidth={2} style={{ marginTop: 3 }} />
                <T size={14} color="#526f41" lineHeight={25} style={{ flex: 1 }}>Your signature is recorded. The other party can now review.</T>
              </View>
              <PrimaryButton label={`Review as ${firstName(otherParty(role))}`} icon={ArrowRight} onPress={() => setRole(otherParty(role))} fullWidth />
              <T size={11} color="#627d50" lineHeight={21} center style={{ marginTop: 10 }}>Switching fictional roles on this device for the demo.</T>
            </>
          ) : (
            <>
              <View style={styles.signingAs}>
                <Users size={15} color="#617b51" strokeWidth={1.8} />
                <T size={13} color="#617b51">You’re reviewing as <T weight="bold" size={13} color="#3d6034">{names[role]}</T></T>
                <TextButton label="Switch role" onPress={() => setRole(otherParty(role))} style={{ minHeight: 32, paddingVertical: 0 }} />
              </View>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consent }} onPress={() => setConsent(!consent)} style={styles.consent}>
                <Checkbox value={consent} onValueChange={setConsent} color={consent ? '#315e34' : undefined} style={styles.checkbox} />
                <T size={14} color="#516e42" lineHeight={25} style={{ flex: 1 }}>I agree to these terms and understand the costs are illustrative estimates, not a payment or rate guarantee.</T>
              </Pressable>
              <PrimaryButton label={busy ? 'Signing & verifying…' : `Sign as ${firstName(role)}`} icon={FingerprintPattern} iconPosition="left" onPress={() => { void sign(); }} disabled={!consent || busy} fullWidth />
              <T size={11} color="#627d50" lineHeight={21} center style={{ marginTop: 10 }}>Real cryptographic signature · fictional, unverified identity</T>
            </>
          )}
        </View>
      ) : (
        <View style={styles.sealedActions}>
          <PrimaryButton label="Share signed record" icon={Share2} iconPosition="left" onPress={() => { void shareRecord(); }} fullWidth />
          <SecondaryButton label="Copy record as JSON" icon={Copy} iconPosition="left" onPress={() => { void copyRecord(); }} fullWidth />
          <TextButton label="Verify or test a change" icon={ShieldCheck} onPress={openVerifier} center style={{ alignSelf: 'stretch' }} />
        </View>
      )}

      <Pressable accessibilityRole="button" accessibilityLabel="Copy content fingerprint" onPress={() => { void copyHash(); }} style={({ pressed }) => [styles.hash, pressed && { opacity: 0.8 }]}>
        <FingerprintPattern size={16} color="#6d8857" strokeWidth={1.7} />
        <View style={{ flex: 1 }}>
          <T size={10} color="#6d8857" style={{ marginBottom: 4 }}>SHA-256 content fingerprint · tap to copy</T>
          <T mono size={9} lineHeight={15} color={colors.hashText}>{agreement.hash}</T>
        </View>
      </Pressable>

      <View style={styles.recordFooter}>
        <TextButton label="Revise terms" icon={RotateCcw} onPress={requestRevise} size={11} center />
      </View>
      <T size={11} color="#60744f" lineHeight={21} center style={{ marginTop: 6 }}>Keys and messages stay in memory. Share the record before closing the app.</T>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.statusBg, borderRadius: 5, paddingVertical: 7, paddingHorizontal: 8 },
  statusSealed: { backgroundColor: '#e3edcf' },
  seal: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.sealBg, paddingVertical: 16, paddingHorizontal: 13, borderRadius: 10, marginTop: 21 },
  sealIcon: { width: 43, height: 43, borderRadius: 22, borderWidth: 1, borderColor: '#a6bf8c', alignItems: 'center', justifyContent: 'center' },
  document: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, marginTop: 25, paddingVertical: 18 },
  documentTop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginVertical: 24 },
  terms: { gap: 13, borderTopWidth: 1, borderTopColor: '#ccdabd', borderStyle: 'dashed', paddingTop: 18 },
  term: { flexDirection: 'row', gap: 8 },
  signatures: { flexDirection: 'row', gap: 14, marginTop: 22 },
  slot: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#c6d6b7', paddingBottom: 16 },
  slotLabel: { flexDirection: 'row', justifyContent: 'space-between', gap: 5, marginBottom: 13 },
  signing: { paddingTop: 23, paddingBottom: 5 },
  signedWait: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 18 },
  signingAs: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  consent: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginTop: 14, marginBottom: 19, minHeight: 44 },
  checkbox: { width: 21, height: 21, marginTop: 3, borderRadius: 4 },
  sealedActions: { gap: 10, marginTop: 23 },
  hash: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 13, paddingHorizontal: 11, backgroundColor: colors.hashBg, borderRadius: 8, marginTop: 22 },
  recordFooter: { alignItems: 'center', marginTop: 8 },
});
