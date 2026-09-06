import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ArrowRight, CheckCheck, ChevronRight, Download, FileText, Leaf, LockKeyhole, Send, ShieldCheck } from 'lucide-react-native';
import { colors, fonts } from '../theme';
import { T } from '../components/T';
import { IconButton } from '../components/Button';
import { eur } from '../format';
import { firstName, initialMessages, names, type ChatMessage, type Deal } from '../state/useDeal';
import type { PartyId } from '../shared';

export function Avatar({ size = 42 }: { size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <T weight="bold" size={12} color={colors.avatarText}>AB</T>
    </View>
  );
}

function Message({ item, invoiceAmount, invoiceQuantity, showInvoice, onOpenInvoice }: { item: ChatMessage; invoiceAmount: number; invoiceQuantity: number; showInvoice: boolean; onOpenInvoice: () => void }) {
  const outgoing = item.from === 'buyer';
  return (
    <View style={[styles.group, outgoing && styles.groupOut]}>
      <View style={[styles.bubble, outgoing ? styles.bubbleOut : styles.bubbleIn]}>
        <T size={15} lineHeight={25}>{item.text}</T>
        <View style={styles.timeRow}>
          <T size={10} color="#5b7350" lineHeight={14}>{item.time}</T>
          {outgoing && <CheckCheck size={13} color="#5b7350" strokeWidth={1.8} />}
        </View>
      </View>
      {showInvoice && (
        <Pressable accessibilityRole="button" accessibilityLabel="View sample invoice" onPress={onOpenInvoice} style={({ pressed }) => [styles.invoice, pressed && { backgroundColor: colors.greenSoft }]}>
          <View style={styles.invoiceIcon}><FileText size={23} color="#6e7048" strokeWidth={1.6} /></View>
          <View style={{ flex: 1 }}>
            <T weight="bold" size={12} lineHeight={17}>Invoice SF-1048</T>
            <T size={11} color={colors.muted} lineHeight={16}>{invoiceQuantity} bottles · Organic olive oil</T>
            <T weight="semibold" size={22} lineHeight={30} tabular style={{ marginTop: 6, letterSpacing: -0.4 }}>{eur(invoiceAmount)}</T>
          </View>
          <ChevronRight size={18} color="#5f7850" strokeWidth={1.8} />
        </Pressable>
      )}
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
        <T size={11} color="#66765b" center style={{ marginBottom: 22 }}>5 September · Sample conversation</T>
        {messages.map((item, index) => (
          <Message key={item.id} item={item} invoiceAmount={invoice.amountEur} invoiceQuantity={invoice.quantity} showInvoice={index === 0} onOpenInvoice={() => setModal('edit')} />
        ))}
        <View style={styles.insight}>
          <View style={styles.miniBrand}><Leaf size={14} color="#526f40" strokeWidth={1.8} /></View>
          <T size={12} color="#5b7350" lineHeight={21} style={{ flex: 1 }}>{insight}</T>
        </View>
        {sealed && (
          <Pressable accessibilityRole="button" onPress={() => setScreen('finance')} style={({ pressed }) => [styles.sealedCard, pressed && { opacity: 0.85 }]}>
            <ShieldCheck size={20} color="#4d6c3b" strokeWidth={1.8} />
            <View style={{ flex: 1 }}>
              <T weight="bold" size={14} color="#4d6c3b" lineHeight={20}>Agreement sealed</T>
              <T size={12} color="#4d6c3b" lineHeight={17} style={{ marginTop: 3 }}>Open your shared record</T>
            </View>
            <Download size={16} color="#4d6c3b" strokeWidth={1.8} />
          </Pressable>
        )}
      </ScrollView>

      <Pressable accessibilityRole="button" accessibilityLabel={bridgeLabel} onPress={() => setScreen('finance')} style={({ pressed }) => [styles.bridge, pressed && { opacity: 0.85 }]}>
        {sealed ? <ShieldCheck size={23} color="#5c7746" strokeWidth={1.7} /> : <FileText size={23} color="#5c7746" strokeWidth={1.7} />}
        <View style={{ flex: 1 }}>
          <T size={11} color="#5d7550" lineHeight={15}>Invoice {invoice.id} · {eur(invoice.amountEur)}</T>
          <T weight="bold" size={14} color={colors.greenDeep} lineHeight={20} style={{ marginTop: 3 }}>{bridgeLabel}</T>
        </View>
        <ArrowRight size={20} color={colors.greenDeep} strokeWidth={1.8} />
      </Pressable>

      <View style={styles.compose}>
        <View style={styles.roleRow}>
          <T size={10} color="#68775c">Demo role</T>
          <View style={{ flexDirection: 'row', gap: 2 }} accessibilityRole="radiogroup">
            {(['buyer', 'supplier'] as PartyId[]).map((party) => {
              const selected = role === party;
              return (
                <Pressable key={party} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setRole(party)} style={[styles.roleButton, selected && styles.roleSelected]}>
                  <T weight={selected ? 'bold' : 'regular'} size={11} color={selected ? '#345537' : '#657457'}>{firstName(party)} · {party}</T>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            accessibilityLabel={`Message as ${names[role]}`}
            placeholder={`Message as ${firstName(role)}…`}
            placeholderTextColor="#6a7c5c"
            value={draft}
            maxLength={1500}
            onChangeText={setDraft}
            onSubmitEditing={send}
            returnKeyType="send"
            blurOnSubmit={false}
            style={styles.input}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: !canSend }} disabled={!canSend} onPress={send} style={[styles.send, !canSend && { opacity: 0.48 }]}>
            <Send size={17} color="#f0f5e5" strokeWidth={1.8} />
          </Pressable>
        </View>
        <T size={10} color="#68775c" center style={{ marginTop: 6 }}>Fictional participants · session only</T>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.topbar },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingLeft: 18,
    paddingRight: 10,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  avatar: { backgroundColor: colors.avatarBg, alignItems: 'center', justifyContent: 'center' },
  timeline: { flex: 1 },
  timelineContent: { paddingVertical: 18, paddingHorizontal: 17 },
  group: { alignItems: 'flex-start', marginBottom: 18 },
  groupOut: { alignItems: 'flex-end' },
  bubble: { maxWidth: '90%', paddingTop: 12, paddingHorizontal: 14, paddingBottom: 7, borderRadius: 13 },
  bubbleIn: { backgroundColor: colors.bubbleIn, borderTopLeftRadius: 0 },
  bubbleOut: { backgroundColor: colors.bubbleOut, borderTopRightRadius: 0 },
  timeRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 5, marginTop: 5 },
  invoice: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: '#d4ddc8',
    borderRadius: 11,
    padding: 14,
    width: 300,
    maxWidth: '95%',
  },
  invoiceIcon: { width: 39, height: 46, borderRadius: 6, backgroundColor: '#ececda', alignItems: 'center', justifyContent: 'center' },
  insight: { flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'flex-start' },
  miniBrand: { width: 27, height: 27, borderRadius: 14, backgroundColor: '#e2eacd', alignItems: 'center', justifyContent: 'center' },
  sealedCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#bdd0aa',
    backgroundColor: '#eef5e5',
    borderRadius: 10,
    marginTop: 14,
  },
  bridge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: '#eef4e3',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#d5e1c5',
    minHeight: 78,
  },
  compose: { backgroundColor: colors.paper, paddingTop: 8, paddingHorizontal: 14, paddingBottom: 10 },
  roleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  roleButton: { minHeight: 40, paddingHorizontal: 9, borderRadius: 6, justifyContent: 'center' },
  roleSelected: { backgroundColor: '#edf2e4' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ccd8bd',
    borderRadius: 10,
    padding: 5,
    backgroundColor: '#fafcf4',
  },
  input: { flex: 1, minWidth: 0, fontFamily: fonts.sans, fontSize: 16, paddingVertical: 9, paddingHorizontal: 6, color: colors.ink },
  send: { height: 44, width: 44, borderRadius: 7, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
});
