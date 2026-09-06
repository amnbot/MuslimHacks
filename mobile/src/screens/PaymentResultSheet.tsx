import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { CheckCircle2, Copy, ExternalLink, TriangleAlert } from 'lucide-react-native';
import { colors } from '../theme';
import { T } from '../components/T';
import { PrimaryButton, SecondaryButton, TextButton } from '../components/Button';
import { explorerUrl, addressExplorerUrl } from '../shared';
import { formatUsdc } from '../../../src/lib/business';
import type { Workspace } from '../state/useWorkspace';

const short = (value: string) => `${value.slice(0, 6)}…${value.slice(-6)}`;

/**
 * The full result of a devnet transfer: pending the instant it starts, then either a
 * confirmed signature with the recipient's live balance, or the real failure reason.
 * Nothing here is inferred — every field comes straight from the devnet RPC response.
 */
export function PaymentResultSheet({ workspace }: { workspace: Workspace }) {
  const result = workspace.paymentResult;
  if (!result) return null;

  return (
    <View style={s.wrap}>
      <View style={[s.statusRow, result.status === 'confirmed' && s.statusConfirmed, result.status === 'failed' && s.statusFailed]}>
        {result.status === 'pending' && <ActivityIndicator color={colors.statusText} />}
        {result.status === 'confirmed' && <CheckCircle2 size={22} color={colors.tintText} strokeWidth={1.8} />}
        {result.status === 'failed' && <TriangleAlert size={22} color={colors.warningText} strokeWidth={1.8} />}
        <View style={{ flex: 1 }}>
          <T weight="bold" size={16} color={result.status === 'confirmed' ? colors.tintText : result.status === 'failed' ? colors.warningText : colors.statusText}>
            {result.status === 'pending' ? 'Submitting to Solana devnet…' : result.status === 'confirmed' ? 'Confirmed on Solana devnet' : 'Payment did not confirm'}
          </T>
          <T size={12} color={colors.muted} style={{ marginTop: 2 }}>
            {result.status === 'pending' ? 'Building, signing and broadcasting the transaction.' : result.status === 'confirmed' ? 'The transfer landed on chain and was verified.' : 'See the details below.'}
          </T>
        </View>
      </View>

      <View style={s.amountBlock}>
        <T size={12} color={colors.muted}>Amount</T>
        <T serif size={32} lineHeight={40} tabular>{formatUsdc(result.amountMicros)} <T size={14}>USDC</T></T>
      </View>

      <View style={s.partyRow}>
        <View style={{ flex: 1 }}>
          <T size={11} color={colors.muted}>From</T>
          <T weight="semibold" size={14}>{result.fromLabel}</T>
          <T selectable mono size={10} color={colors.muted}>{short(result.fromAddress)}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T size={11} color={colors.muted}>To</T>
          <T weight="semibold" size={14}>{result.toLabel}</T>
          <T selectable mono size={10} color={colors.muted}>{short(result.toAddress)}</T>
        </View>
      </View>

      {result.signature && (
        <View style={s.detailBlock}>
          <T size={12} weight="semibold">Transaction signature</T>
          <T selectable mono size={10} color={colors.muted}>{result.signature}</T>
          <Pressable accessibilityRole="link" accessibilityLabel="View this transaction on the Solana explorer" onPress={() => void workspace.openLink(explorerUrl(result.signature!))} style={s.explorerLink}>
            <T weight="semibold" size={13} color={colors.green}>View on Solana Explorer</T>
            <ExternalLink size={15} color={colors.green} strokeWidth={1.8} />
          </Pressable>
          <TextButton label="Copy signature" icon={Copy} size={12} onPress={() => void workspace.copy(result.signature!, 'Transaction signature copied.')} />
        </View>
      )}

      {result.status === 'confirmed' && (
        <View style={s.balanceBlock}>
          <T size={12} weight="semibold" color={colors.tintText}>{result.toLabel}'s wallet</T>
          <T size={12} color={colors.tintText} style={{ marginTop: 2 }}>
            {result.recipientBalanceMicros === null
              ? 'Balance could not be read right now — check the Wallet tab after switching profile.'
              : `Now holds ${formatUsdc(result.recipientBalanceMicros)} USDC on devnet.`}
          </T>
          <Pressable accessibilityRole="link" onPress={() => void workspace.openLink(addressExplorerUrl(result.toAddress))} style={s.explorerLink}>
            <T weight="semibold" size={12} color={colors.tintText}>View recipient wallet</T>
            <ExternalLink size={13} color={colors.tintText} strokeWidth={1.8} />
          </Pressable>
        </View>
      )}

      {result.status === 'failed' && (
        <View style={s.errorBlock}>
          <T size={13} color={colors.danger}>{result.error}</T>
          {result.signature && <T size={11} color={colors.muted} style={{ marginTop: 6 }}>The transaction was broadcast before this failure. It may still confirm later — check the explorer link above.</T>}
        </View>
      )}

      <View style={s.actions}>
        {result.status !== 'pending' && (
          <SecondaryButton
            label="Refresh my balance"
            onPress={() => void workspace.refreshBalances()}
            disabled={workspace.loadingBalances}
          />
        )}
        <PrimaryButton label={result.status === 'pending' ? 'Waiting…' : 'Done'} onPress={workspace.closePaymentModal} disabled={result.status === 'pending'} />
      </View>
      <T size={10} color={colors.muted} center style={{ marginTop: 4 }}>Solana devnet · test tokens have no financial value.</T>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.statusBg },
  statusConfirmed: { backgroundColor: colors.tint },
  statusFailed: { backgroundColor: colors.warning },
  amountBlock: { alignItems: 'center', paddingVertical: 6 },
  partyRow: { flexDirection: 'row', gap: 14 },
  detailBlock: { gap: 8, padding: 14, borderRadius: 13, backgroundColor: colors.hashBg },
  explorerLink: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, marginTop: 2 },
  balanceBlock: { padding: 14, borderRadius: 13, backgroundColor: colors.tint },
  errorBlock: { padding: 14, borderRadius: 13, backgroundColor: colors.dangerBg },
  actions: { gap: 10 },
});
