import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ArrowRight, CheckCheck, ChevronRight, Download, FileText, Leaf, LockKeyhole, Send, ShieldCheck } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts } from '../theme';
import { T } from '../components/T';
import { IconButton } from '../components/Button';
import { eur } from '../format';
import { firstName, initialMessages, names, type ChatMessage, type Deal } from '../state/useDeal';
import type { PartyId } from '../shared';

export function Avatar({ size = 42 }: { size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size * 0.28, transform: [{ rotate: '4deg' }] }]}>
      <T weight="bold" size={12} color={colors.avatarText}>AB</T>
    </View>
  );
}

export function Counterseal({ state = 'open', size = 28 }: { state?: 'open' | 'aligned' | 'closed'; size?: number }) {
  const color = state === 'open' ? '#9069df' : state === 'aligned' ? '#2f9f92' : '#d94f8c';
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" accessibilityElementsHidden>
      <Path fill="none" stroke={color} strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={state === 'open' ? '6 4' : state === 'aligned' ? '14 2' : undefined} d="M16 2 20 8 27 5 24 12 30 16 24 20 27 27 20 24 16 30 12 24 5 27 8 20 2 16 8 12 5 5 12 8Z" />
      <Path fill="none" stroke={color} strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={state === 'open' ? '4 5' : state === 'aligned' ? '11 2' : undefined} d="M16 7 21 11 25 16 21 21 16 25 11 21 7 16 11 11ZM8 16h4l4-4 4 4h4M8 16h4l4 4 4-4h4" />
      <Path fill="none" stroke={color} strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round" opacity={state === 'open' ? 0.45 : state === 'aligned' ? 0.75 : 1} d="m16 12 4 4-4 4-4-4Z" />
    </Svg>
  );
}

function Message({ item }: { item: ChatMessage }) {
  const outgoing = item.from === 'buyer';
  return (
    <View style={[styles.group, outgoing && styles.groupOut]}>
      <View style={[styles.bubble, outgoing ? styles.bubbleOut : styles.bubbleIn]}>
        <T size={15} lineHeight={25}>{item.text}</T>
        <View style={styles.timeRow}>
          <T size={10} color="#6f6878" lineHeight={14}>{item.time}</T>
          {outgoing && <CheckCheck size={13} color="#6f6878" strokeWidth={1.8} />}
        </View>
      </View>
    </View>
  );
}

export function ChatScreen({ deal }: { deal: Deal }) {
  const { messages, invoice, agreement, sealed, role, setRole, sendMessage, setModal, setScreen } = deal;
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollView>(null);
  const settled = useRef(false);

  useEffect(() => {
    if (messages.length > initialMessages.length) scroll.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  function send() {
    if (sendMessage(draft)) setDraft('');
  }
  const canSend = draft.trim().length > 0;
  const insight = sealed
    ? 'Same terms. Both signatures. A record you can each keep.'
    : agreement ? 'Your cost decision is ready for both parties to review.' : 'A small detail worth agreeing on. Let’s check what actually arrives.';
  const bridgeLabel = sealed ? 'View signed agreement' : agreement ? 'Review shared agreement' : 'Review payment options';

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.head} accessibilityRole="header">
        <Avatar />
        <View style={{ flex: 1 }}>
          <T weight="bold" size={16} lineHeight={22}>{names.supplier}</T>
          <T size={12} color={colors.muted} lineHeight={17} style={{ marginTop: 2 }}>Sfax Olive Co. · Tunisia</T>
        </View>
        <IconButton icon={LockKeyhole} label="Conversation privacy" onPress={() => setModal('sources')} size={19} />
      </View>

      <ScrollView
        ref={scroll}
        style={styles.timeline}
        contentContainerStyle={styles.timelineContent}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (settled.current) return;
          settled.current = true;
          scroll.current?.scrollToEnd({ animated: false });
        }}
      >
        <T size={11} color="#77707d" center style={{ marginBottom: 22 }}>5 September · Sample conversation</T>
        {messages.map((item) => (
          <Message key={item.id} item={item} />
        ))}
        <View style={styles.insight}>
          <View style={styles.miniBrand}><Leaf size={14} color="#337c72" strokeWidth={1.8} /></View>
          <T size={12} color="#6f6878" lineHeight={21} style={{ flex: 1 }}>{insight}</T>
        </View>
        {sealed && (
          <Pressable accessibilityRole="button" onPress={() => setScreen('finance')} style={({ pressed }) => [styles.sealedCard, pressed && { opacity: 0.85 }]}>
            <ShieldCheck size={20} color="#24776b" strokeWidth={1.8} />
            <View style={{ flex: 1 }}>
              <T weight="bold" size={14} color="#24776b" lineHeight={20}>Agreement sealed</T>
              <T size={12} color="#24776b" lineHeight={17} style={{ marginTop: 3 }}>Open your shared record</T>
            </View>
            <Download size={16} color="#24776b" strokeWidth={1.8} />
          </Pressable>
        )}
      </ScrollView>

      <View style={styles.hinge}>
        <Pressable accessibilityRole="button" accessibilityLabel="View sample invoice" onPress={() => setModal('edit')} style={({ pressed }) => [styles.hingeInvoice, pressed && { opacity: 0.82 }]}>
          <View style={styles.invoiceIcon}><FileText size={23} color="#6750a8" strokeWidth={1.6} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T weight="bold" size={12} lineHeight={17}>Invoice {invoice.id}</T>
            <T size={11} color={colors.muted} lineHeight={16}>{invoice.quantity} bottles · Organic olive oil</T>
            <T weight="semibold" size={25} lineHeight={33} tabular style={{ marginTop: 3, letterSpacing: -0.5 }}>{eur(invoice.amountEur)}</T>
          </View>
          <Counterseal state={sealed ? 'closed' : agreement ? 'aligned' : 'open'} size={52} />
          <ChevronRight size={18} color="#6750a8" strokeWidth={1.8} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={bridgeLabel} onPress={() => setScreen('finance')} style={({ pressed }) => [styles.hingeAction, pressed && { opacity: 0.82 }]}>
          <Counterseal state={sealed ? 'closed' : agreement ? 'aligned' : 'open'} size={28} />
          <T weight="bold" size={15} color={colors.greenDeep} lineHeight={21} style={{ flex: 1 }}>{bridgeLabel}</T>
          <ArrowRight size={20} color={colors.greenDeep} strokeWidth={1.8} />
        </Pressable>
      </View>

      <View style={styles.compose}>
        <View style={styles.roleRow}>
          <T size={10} color="#746c7c">Demo role</T>
          <View style={{ flexDirection: 'row', gap: 2 }} accessibilityRole="radiogroup">
            {(['buyer', 'supplier'] as PartyId[]).map((party) => {
              const selected = role === party;
              return (
                <Pressable key={party} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setRole(party)} style={[styles.roleButton, selected && styles.roleSelected]}>
                  <T weight={selected ? 'bold' : 'regular'} size={11} color={selected ? '#4d3b75' : '#746c7c'}>{firstName(party)} · {party}</T>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            accessibilityLabel={`Message as ${names[role]}`}
            placeholder={`Message as ${firstName(role)}…`}
            placeholderTextColor="#817a86"
            value={draft}
            maxLength={1500}
            onChangeText={setDraft}
            onSubmitEditing={send}
            returnKeyType="send"
            blurOnSubmit={false}
            style={styles.input}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: !canSend }} disabled={!canSend} onPress={send} style={[styles.send, !canSend && { opacity: 0.48 }]}>
            <Send size={17} color="#fffefa" strokeWidth={1.8} />
          </Pressable>
        </View>
        <T size={10} color="#817a86" center style={{ marginTop: 6 }}>Fictional participants · session only</T>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(253,252,249,0.76)' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingLeft: 18,
    paddingRight: 10,
    backgroundColor: 'rgba(253,251,248,0.9)',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    marginHorizontal: 14,
    marginTop: 10,
  },
  avatar: { backgroundColor: colors.avatarBg, alignItems: 'center', justifyContent: 'center' },
  timeline: { flex: 1 },
  timelineContent: { paddingVertical: 18, paddingHorizontal: 17 },
  group: { alignItems: 'flex-start', marginBottom: 18 },
  groupOut: { alignItems: 'flex-end' },
  bubble: { maxWidth: '90%', paddingTop: 12, paddingHorizontal: 14, paddingBottom: 7, borderRadius: 15, shadowColor: '#382849', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 1 },
  bubbleIn: { backgroundColor: colors.bubbleIn, borderTopLeftRadius: 3 },
  bubbleOut: { backgroundColor: colors.bubbleOut, borderTopRightRadius: 3 },
  timeRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 5, marginTop: 5 },
  invoiceIcon: { width: 42, height: 48, borderRadius: 12, backgroundColor: '#edf8f5', alignItems: 'center', justifyContent: 'center' },
  insight: { flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'flex-start' },
  miniBrand: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#d9f3ed', alignItems: 'center', justifyContent: 'center' },
  sealedCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfe4dc',
    backgroundColor: '#eef9f6',
    borderRadius: 15,
    marginTop: 14,
  },
  hinge: { marginHorizontal: 14, borderWidth: 1, borderColor: '#d9ccef', borderRadius: 16, padding: 8, backgroundColor: 'rgba(253,251,248,0.96)', shadowColor: '#352342', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.09, shadowRadius: 24, elevation: 4 },
  hingeInvoice: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 5, minHeight: 88 },
  hingeAction: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: '#d7c7ee', backgroundColor: '#f1eaff' },
  compose: { backgroundColor: 'rgba(253,251,248,0.96)', paddingTop: 8, paddingHorizontal: 14, paddingBottom: 10 },
  roleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  roleButton: { minHeight: 40, paddingHorizontal: 9, borderRadius: 10, justifyContent: 'center' },
  roleSelected: { backgroundColor: '#efe8fa' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e3dce6',
    borderRadius: 16,
    padding: 5,
    backgroundColor: '#fffefa',
  },
  input: { flex: 1, minWidth: 0, fontFamily: fonts.sans, fontSize: 16, paddingVertical: 9, paddingHorizontal: 6, color: colors.ink },
  send: { height: 44, width: 44, borderRadius: 12, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
});
