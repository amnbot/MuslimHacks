import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronRight, FileText, Users } from 'lucide-react-native';
import { colors } from '../theme';
import { T } from '../components/T';
import { cad } from '../format';
import {
  STAGE_LABEL, counterpartOf, corridorOf, lastMessagePreview, money, recommendRoute,
  type DemoThread, type ThreadStage,
} from '../shared';
import type { Workspace } from '../state/useWorkspace';

const STAGE_TONE: Record<ThreadStage, { background: string; text: string }> = {
  negotiating: { background: colors.stressBg, text: colors.estimateText },
  invoiced: { background: colors.statusBg, text: colors.statusText },
  agreed: { background: colors.chip, text: colors.avatarText },
  paid: { background: colors.tint, text: colors.tintText },
};

function Avatar({ initials }: { initials: string }) {
  return (
    <View style={s.avatar}>
      <T weight="bold" size={13} color={colors.avatarText}>{initials}</T>
    </View>
  );
}

function Tile({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <View style={s.tile}>
      <T size={11} color={colors.muted}>{label}</T>
      <T weight="semibold" size={20} tabular style={{ marginTop: 4, letterSpacing: -0.4 }}>{value}</T>
      <T size={11} color={colors.muted} lineHeight={16} style={{ marginTop: 2 }}>{caption}</T>
    </View>
  );
}

function ThreadRow({ thread, workspace }: { thread: DemoThread; workspace: Workspace }) {
  const other = counterpartOf(thread, workspace.profileId);
  const corridor = corridorOf(thread);
  const tone = STAGE_TONE[thread.stage];
  const selling = thread.sellerId === workspace.profileId;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${other.businessName}, ${STAGE_LABEL[thread.stage]}`}
      onPress={() => workspace.openThread(thread.id)}
      style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.pale }]}
    >
      <Avatar initials={other.initials} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={s.rowTop}>
          <T weight="semibold" size={15} style={{ flex: 1 }} numberOfLines={1}>{other.businessName}</T>
          <View style={[s.chip, { backgroundColor: tone.background }]}>
            <T size={10} weight="semibold" color={tone.text}>{STAGE_LABEL[thread.stage]}</T>
          </View>
        </View>
        <T size={11} color={colors.muted}>
          {other.country} · {selling ? 'You are selling' : 'You are buying'} · {corridor.buyerCurrency} → {corridor.sellerCurrency}
        </T>
        <T size={13} color={colors.muted} numberOfLines={1} lineHeight={19}>{lastMessagePreview(thread)}</T>
        <T weight="semibold" size={14} tabular style={{ marginTop: 2 }}>
          {money(thread.invoice.amountEur, corridor.sellerCurrency)}
        </T>
      </View>
      <ChevronRight size={18} color={colors.muted} />
    </Pressable>
  );
}

export function ConversationList({ workspace }: { workspace: Workspace }) {
  const { threads, profile } = workspace;
  const partners = new Set(threads.map((thread) => counterpartOf(thread, workspace.profileId).id));
  const open = threads.filter((thread) => thread.stage !== 'paid');
  // What this profile stands to save if every open deal takes its best route.
  const savings = open.reduce((total, thread) => total + recommendRoute(thread.invoice, corridorOf(thread)).savingCad, 0);

  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.head}>
        <T serif size={32} lineHeight={42}>Conversations</T>
        <T size={14} color={colors.muted}>
          {profile.role === 'seller' ? 'Your buyers, invoices and agreements.' : 'Your suppliers, invoices and agreements.'}
        </T>
      </View>

      <View style={s.tiles}>
        <Tile label="Open deals" value={String(open.length)} caption={`${partners.size} trading partner${partners.size === 1 ? '' : 's'}`} />
        <Tile label="Avoidable fees" value={cad(savings)} caption="vs bank wire, across open deals" />
      </View>

      <View style={s.list}>
        {threads.map((thread) => <ThreadRow key={thread.id} thread={thread} workspace={workspace} />)}
      </View>

      <View style={s.footer}>
        <Users size={17} color={colors.green} strokeWidth={1.7} />
        <T size={12} color={colors.muted} style={{ flex: 1 }} lineHeight={19}>
          Synthetic demo conversations. The signatures, encryption and devnet settlement inside them are real.
        </T>
      </View>
      <View style={s.footer}>
        <FileText size={17} color={colors.green} strokeWidth={1.7} />
        <T size={12} color={colors.muted} style={{ flex: 1 }} lineHeight={19}>
          Signed invoices from every conversation also appear under Invoices.
        </T>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flexGrow: 1, width: '100%', maxWidth: 700, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, gap: 14 },
  head: { gap: 6 },
  tiles: { flexDirection: 'row', gap: 12, marginTop: 4 },
  tile: { flex: 1, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14 },
  list: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.avatarBg, alignItems: 'center', justifyContent: 'center' },
  chip: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4 },
});
