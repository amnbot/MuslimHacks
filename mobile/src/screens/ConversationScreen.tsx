import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronRight, ExternalLink,
  FileText, Scale, Send, Sparkles, Wallet,
} from 'lucide-react-native';
import { colors, fonts } from '../theme';
import { T } from '../components/T';
import { IconButton, PrimaryButton } from '../components/Button';
import {
  DEMO_SETTLEMENT_MICROS, DEMO_SETTLEMENT_NOTE, PARTICIPANTS, PROFILES, calculateCosts, corridorOf, counterpartOf,
  explorerUrl, money, recommendRoute, roleInThread,
  type DemoMessage, type DemoThread, type FeeBearer,
} from '../shared';
import { formatUsdc } from '../../../src/lib/business';
import type { Workspace } from '../state/useWorkspace';

function Bubble({ outgoing, children }: { outgoing: boolean; children: React.ReactNode }) {
  return (
    <View style={[s.group, outgoing && s.groupOut]}>
      <View style={[s.bubble, outgoing ? s.bubbleOut : s.bubbleIn]}>{children}</View>
    </View>
  );
}

/** A card that sits in the timeline, full width, for anything richer than text. */
function CardRow({ icon: Icon, title, caption, action, onPress, tone = colors.green }: {
  icon: typeof FileText; title: string; caption: string; action?: string; onPress?: () => void; tone?: string;
}) {
  const body = (
    <>
      <View style={[s.cardIcon, { backgroundColor: colors.greenSoft }]}><Icon size={20} color={tone} strokeWidth={1.7} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T weight="bold" size={14} lineHeight={20}>{title}</T>
        <T size={12} color={colors.muted} lineHeight={18} style={{ marginTop: 3 }}>{caption}</T>
        {action && <T weight="semibold" size={12} color={tone} style={{ marginTop: 7 }}>{action}</T>}
      </View>
      {onPress && <ChevronRight size={18} color={tone} strokeWidth={1.8} />}
    </>
  );
  if (!onPress) return <View style={s.card}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${action ?? caption}`} onPress={onPress} style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}>
      {body}
    </Pressable>
  );
}

/**
 * The fee-responsibility decision, taken inside the conversation. Each side sees the
 * consequence in its own terms: the buyer's outlay, or what actually reaches the supplier.
 */
function FeePollCard({ message, thread, workspace }: { message: Extract<DemoMessage, { kind: 'feePoll' }>; thread: DemoThread; workspace: Workspace }) {
  const corridor = corridorOf(thread);
  const quote = corridor.quotes.find((option) => option.id === thread.quoteId) ?? corridor.quotes[0];
  const role = roleInThread(thread, workspace.profileId);
  const myVote = message.votes[workspace.profileId];
  const other = counterpartOf(thread, workspace.profileId);
  const otherVote = message.votes[other.id];

  const outcome = (bearer: FeeBearer) => {
    const costs = calculateCosts(thread.invoice, quote, bearer);
    return role === 'seller'
      ? `You receive ${money(costs.recipientMinEur, corridor.sellerCurrency)}`
      : `You pay up to ${money(costs.totalMaxCad, corridor.buyerCurrency)}`;
  };

  return (
    <View style={s.poll}>
      <View style={s.pollHead}>
        <Scale size={18} color={colors.green} strokeWidth={1.7} />
        <T weight="bold" size={14} lineHeight={20} style={{ flex: 1 }}>{message.question}</T>
      </View>
      <T size={12} color={colors.muted} lineHeight={19}>
        A correspondent bank can take {money(quote.downstreamFeeEur.min, corridor.sellerCurrency)}–{money(quote.downstreamFeeEur.max, corridor.sellerCurrency)} out of this transfer. Deciding now means neither side discovers it later.
      </T>
      <View style={s.pollOptions} accessibilityRole="radiogroup" accessibilityLabel={message.question}>
        {(['buyer', 'supplier'] as FeeBearer[]).map((bearer) => {
          const chosen = myVote === bearer;
          return (
            <Pressable
              key={bearer}
              accessibilityRole="radio"
              accessibilityState={{ checked: chosen }}
              accessibilityLabel={`${bearer === 'buyer' ? 'The buyer covers them' : 'The supplier absorbs them'}. ${outcome(bearer)}`}
              onPress={() => workspace.voteFeeBearer(message.id, bearer)}
              style={({ pressed }) => [s.pollOption, chosen && s.pollOptionOn, pressed && { opacity: 0.85 }]}
            >
              <View style={[s.radio, chosen && { borderColor: colors.selectedBorder }]}>{chosen && <View style={s.radioDot} />}</View>
              <View style={{ flex: 1 }}>
                <T weight="semibold" size={13} lineHeight={19}>{bearer === 'buyer' ? 'The buyer covers them' : 'The supplier absorbs them'}</T>
                <T size={12} color={colors.muted} lineHeight={18} tabular style={{ marginTop: 2 }}>{outcome(bearer)}</T>
              </View>
              {otherVote === bearer && (
                <View style={s.voteChip}><T size={9} color={colors.tintText}>{PARTICIPANTS[other.id].personName.split(' ')[0]}</T></View>
              )}
            </Pressable>
          );
        })}
      </View>
      <View style={[s.pollResult, message.resolved ? s.pollAgreed : s.pollPending]}>
        {message.resolved ? <Check size={16} color={colors.resolvedText} strokeWidth={2} /> : null}
        <T size={12} color={message.resolved ? colors.resolvedText : colors.warningText} lineHeight={19} style={{ flex: 1 }}>
          {message.resolved
            ? `Agreed — ${message.resolved === 'buyer' ? 'the buyer covers downstream fees, so the invoice arrives in full' : 'the supplier absorbs downstream fees'}.`
            : 'Waiting for both sides to choose the same option.'}
        </T>
      </View>
    </View>
  );
}

function Message({ message, thread, workspace }: { message: DemoMessage; thread: DemoThread; workspace: Workspace }) {
  const corridor = corridorOf(thread);
  const outgoing = 'from' in message && message.from === workspace.profileId;

  switch (message.kind) {
    case 'system':
      return <T size={11} color={colors.muted} center style={{ marginVertical: 14 }}>{message.text}</T>;

    case 'text':
      return (
        <Bubble outgoing={outgoing}>
          <T size={15} lineHeight={25}>{message.text}</T>
          <View style={s.timeRow}>
            <T size={10} color={colors.muted} lineHeight={14}>{message.time}</T>
            {outgoing && <CheckCheck size={13} color={colors.muted} strokeWidth={1.8} />}
          </View>
        </Bubble>
      );

    case 'feePoll':
      return <FeePollCard message={message} thread={thread} workspace={workspace} />;

    case 'comparison': {
      const best = recommendRoute(thread.invoice, corridor);
      return (
        <CardRow
          icon={Sparkles}
          title="Payment routes compared"
          caption={`${best.lowestTotalCost.quote.name} costs the least overall — ${money(best.savingCad, corridor.buyerCurrency)} less than a bank wire.`}
          action="Open the full comparison"
          onPress={() => workspace.openModal('routes')}
        />
      );
    }

    case 'invoice':
      return (
        <CardRow
          icon={FileText}
          title={`Invoice ${message.reference}`}
          caption={`${money(thread.invoice.amountEur, corridor.sellerCurrency)} · ${thread.invoice.goods}`}
          action="Open the signed invoice"
          onPress={() => workspace.openThreadInvoice(thread)}
        />
      );

    case 'agreement':
      return (
        <CardRow
          icon={Check}
          title={thread.stage === 'agreed' || thread.stage === 'paid' ? 'Agreement signed' : 'Agreement ready to sign'}
          caption="Both businesses sign the same amount, terms, wallet and network."
          action="Review and sign"
          onPress={() => workspace.openThreadInvoice(thread)}
        />
      );

    case 'payment':
      return (
        <View style={s.card}>
          <View style={[s.cardIcon, { backgroundColor: colors.tint }]}><Wallet size={20} color={colors.tintText} strokeWidth={1.7} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T weight="bold" size={14} lineHeight={20}>{formatUsdc(message.amountMicros)} USDC sent</T>
            <T size={12} color={colors.muted} lineHeight={18} style={{ marginTop: 3 }}>
              {message.signature ? 'Confirmed on Solana devnet.' : 'Recorded in this demo conversation.'}
            </T>
            {message.signature && (
              <Pressable accessibilityRole="link" accessibilityLabel="View this transaction on the Solana explorer" onPress={() => void workspace.openLink(explorerUrl(message.signature!))} style={s.explorer}>
                <T mono size={10} color={colors.green} numberOfLines={1} style={{ flex: 1 }}>{message.signature}</T>
                <ExternalLink size={14} color={colors.green} strokeWidth={1.8} />
              </Pressable>
            )}
          </View>
        </View>
      );
  }
}

export function ConversationScreen({ workspace }: { workspace: Workspace }) {
  const thread = workspace.activeThread;
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollView>(null);
  const settled = useRef(false);

  useEffect(() => { settled.current = false; }, [thread?.id]);

  if (!thread) return null;
  const other = counterpartOf(thread, workspace.profileId);
  const corridor = corridorOf(thread);
  const role = roleInThread(thread, workspace.profileId);
  const recommendation = recommendRoute(thread.invoice, corridor);
  const quote = corridor.quotes.find((option) => option.id === thread.quoteId) ?? corridor.quotes[0];
  const costs = calculateCosts(thread.invoice, quote, thread.bearer);
  // Only a counterparty with a demo wallet can receive a live devnet transfer.
  const canPay = role === 'buyer' && thread.sellerId in PROFILES && thread.stage !== 'paid';

  function send() {
    if (workspace.sendMessage(draft)) {
      setDraft('');
      requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.head} accessibilityRole="header">
        <IconButton icon={ArrowLeft} label="Back to conversations" size={20} onPress={() => workspace.setRoute('list')} />
        <View style={s.avatar}><T weight="bold" size={12} color={colors.avatarText}>{other.initials}</T></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T weight="bold" size={15} lineHeight={21} numberOfLines={1}>{other.businessName}</T>
          <T size={11} color={colors.muted} lineHeight={16}>{other.personName} · {other.country}</T>
        </View>
        <IconButton icon={Scale} label="Compare payment routes" size={19} onPress={() => workspace.openModal('routes')} />
      </View>

      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={s.timeline}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (settled.current) return;
          settled.current = true;
          scroll.current?.scrollToEnd({ animated: false });
        }}
      >
        <T size={11} color={colors.muted} center style={{ marginBottom: 20 }}>{thread.subject} · synthetic demo conversation</T>
        {thread.messages.map((message) => (
          <Message key={message.id} message={message} thread={thread} workspace={workspace} />
        ))}
      </ScrollView>

      <View style={s.hinge}>
        <View style={s.hingeRow}>
          <View style={{ flex: 1 }}>
            <T size={11} color={colors.muted}>{role === 'seller' ? 'You receive, at least' : 'You pay, at most'}</T>
            <T weight="semibold" size={23} tabular style={{ letterSpacing: -0.6, marginTop: 2 }}>
              {role === 'seller'
                ? money(costs.recipientMinEur, corridor.sellerCurrency)
                : money(costs.totalMaxCad, corridor.buyerCurrency)}
            </T>
            <T size={11} color={colors.muted} lineHeight={16} style={{ marginTop: 2 }}>
              via {quote.name} · fees on the {thread.bearer === 'buyer' ? 'buyer' : 'supplier'}
            </T>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Compare payment routes" onPress={() => workspace.openModal('routes')} style={({ pressed }) => [s.hingeAction, pressed && { opacity: 0.85 }]}>
            <T weight="semibold" size={13} color={colors.greenDeep}>Compare</T>
            <ArrowRight size={17} color={colors.greenDeep} strokeWidth={1.8} />
          </Pressable>
        </View>
        {quote.id !== recommendation.lowestTotalCost.quote.id && (
          <Pressable accessibilityRole="button" onPress={() => workspace.openModal('routes')} style={s.nudge}>
            <Sparkles size={14} color={colors.tintText} strokeWidth={1.8} />
            <T size={11} color={colors.tintText} lineHeight={17} style={{ flex: 1 }}>
              {recommendation.lowestTotalCost.quote.name} would cost {money(recommendation.savingCad, corridor.buyerCurrency)} less overall.
            </T>
          </Pressable>
        )}
        {thread.stage === 'negotiating' && role === 'seller' && (
          <PrimaryButton label="Create the invoice" icon={FileText} iconPosition="left" fullWidth onPress={() => { workspace.setTab('invoices'); workspace.setRoute('create'); }} />
        )}
        {canPay && (
          <>
            <PrimaryButton
              label={workspace.paying ? 'Confirming on devnet…' : `Pay ${formatUsdc(DEMO_SETTLEMENT_MICROS)} USDC on devnet`}
              icon={ArrowUpRight}
              fullWidth
              disabled={workspace.paying}
              onPress={() => void workspace.payThread(thread)}
            />
            <T size={10} color={colors.muted} lineHeight={16} center>{DEMO_SETTLEMENT_NOTE}</T>
          </>
        )}
      </View>

      <View style={s.compose}>
        <View style={s.inputRow}>
          <TextInput
            accessibilityLabel={`Message ${other.personName}`}
            placeholder={`Message ${other.personName.split(' ')[0]}…`}
            placeholderTextColor="#817a86"
            value={draft}
            maxLength={1500}
            onChangeText={setDraft}
            onSubmitEditing={send}
            returnKeyType="send"
            blurOnSubmit={false}
            style={s.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !draft.trim() }}
            disabled={!draft.trim()}
            onPress={send}
            style={[s.send, !draft.trim() && { opacity: 0.48 }]}
          >
            <Send size={17} color={colors.paper} strokeWidth={1.8} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(253,252,249,0.76)' },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingLeft: 6, paddingRight: 6,
    backgroundColor: 'rgba(253,251,248,0.9)', borderWidth: 1, borderColor: colors.line, borderRadius: 16,
    marginHorizontal: 12, marginTop: 10,
  },
  avatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.avatarBg, alignItems: 'center', justifyContent: 'center' },
  timeline: { paddingVertical: 18, paddingHorizontal: 16 },
  group: { alignItems: 'flex-start', marginBottom: 16 },
  groupOut: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '90%', paddingTop: 12, paddingHorizontal: 14, paddingBottom: 7, borderRadius: 15,
    shadowColor: '#382849', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 1,
  },
  bubbleIn: { backgroundColor: colors.bubbleIn, borderTopLeftRadius: 3 },
  bubbleOut: { backgroundColor: colors.bubbleOut, borderTopRightRadius: 3 },
  timeRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 5, marginTop: 5 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, padding: 14,
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 15,
  },
  cardIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  explorer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7, minHeight: 32 },
  poll: {
    marginBottom: 16, padding: 15, gap: 12, backgroundColor: colors.paper,
    borderWidth: 1, borderColor: colors.selectedBorder, borderRadius: 15,
  },
  pollHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  pollOptions: { gap: 8 },
  pollOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 11,
    borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.inputBg, minHeight: 58,
  },
  pollOptionOn: { borderColor: colors.selectedBorder, backgroundColor: colors.greenSoft },
  radio: { height: 16, width: 16, borderRadius: 8, borderWidth: 1, borderColor: '#a795ba', alignItems: 'center', justifyContent: 'center' },
  radioDot: { height: 8, width: 8, borderRadius: 4, backgroundColor: colors.selectedBorder },
  voteChip: { backgroundColor: colors.tint, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 7 },
  pollResult: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 11, paddingVertical: 10, paddingHorizontal: 11 },
  pollAgreed: { backgroundColor: colors.resolvedBg },
  pollPending: { backgroundColor: colors.warning },
  hinge: {
    marginHorizontal: 12, borderWidth: 1, borderColor: '#d9ccef', borderRadius: 16, padding: 12, gap: 10,
    backgroundColor: 'rgba(253,251,248,0.96)', shadowColor: '#352342', shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.09, shadowRadius: 24, elevation: 4,
  },
  hingeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hingeAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 46, paddingHorizontal: 14,
    borderRadius: 13, borderWidth: 1, borderColor: '#d7c7ee', backgroundColor: '#f1eaff',
  },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.tint, borderRadius: 11, paddingVertical: 9, paddingHorizontal: 10 },
  compose: { backgroundColor: 'rgba(253,251,248,0.96)', paddingTop: 8, paddingHorizontal: 14, paddingBottom: 10 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e3dce6',
    borderRadius: 16, padding: 5, backgroundColor: colors.inputBg,
  },
  input: { flex: 1, minWidth: 0, fontFamily: fonts.sans, fontSize: 16, paddingVertical: 9, paddingHorizontal: 6, color: colors.ink },
  send: { height: 44, width: 44, borderRadius: 12, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
});
