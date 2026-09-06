import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ArrowUpRight, ChevronRight, FileCheck, LockKeyhole, MessageSquare } from 'lucide-react-native';
import { colors, NAV_HEIGHT } from '../theme';
import { T } from '../components/T';
import { IconButton, TextButton } from '../components/Button';
import type { Deal } from '../state/useDeal';
import { Avatar, Counterseal } from './ChatScreen';
import { CompareSheet } from './CompareSheet';
import { AgreementSheet } from './AgreementSheet';

type StepState = 'todo' | 'current' | 'done';

function Steps({ agreement, sealed }: { agreement: boolean; sealed: boolean }) {
  const steps: { label: string; state: StepState }[] = [
    { label: 'Compare', state: !agreement ? 'current' : 'done' },
    { label: 'Agree', state: agreement && !sealed ? 'current' : sealed ? 'done' : 'todo' },
    { label: 'Keep record', state: sealed ? 'current' : 'todo' },
  ];
  return (
    <View style={styles.steps} accessibilityRole="list">
      {steps.map((step, index) => (
        <View key={step.label} style={styles.step} accessibilityLabel={`Step ${index + 1}: ${step.label}, ${step.state === 'current' ? 'current' : step.state}`}>
          <View style={[styles.stepMark, step.state === 'current' && styles.stepCurrent, step.state === 'done' && styles.stepDone]}>
            <Counterseal state={index === 0 ? 'open' : index === 1 ? 'aligned' : 'closed'} size={20} />
          </View>
          <T weight={step.state === 'current' ? 'bold' : 'regular'} size={11} color={step.state === 'current' ? colors.greenDeep : '#777080'}>{step.label}</T>
        </View>
      ))}
    </View>
  );
}

export function FinanceScreen({ deal }: { deal: Deal }) {
  const { agreement, sealed, setScreen, openVerifier, setModal, error, setError } = deal;
  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingBottom: NAV_HEIGHT + 24 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <T serif size={34} lineHeight={41} style={{ letterSpacing: -1 }} accessibilityRole="header">Finance</T>
          <T size={14} color={colors.muted} style={{ marginTop: 6 }}>One invoice. Every cost in view.</T>
        </View>
        <IconButton icon={FileCheck} label="Verify an agreement" onPress={openVerifier} size={23} />
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Open the conversation" onPress={() => setScreen('chat')} style={({ pressed }) => [styles.linked, pressed && { opacity: 0.85 }]}>
        <Avatar />
        <View style={{ flex: 1 }}>
          <T weight="semibold" size={13} lineHeight={19}>September olive oil shipment</T>
          <T size={11} color={colors.muted} lineHeight={16} style={{ marginTop: 3 }}>Amira · Sfax, Tunisia</T>
        </View>
        <MessageSquare size={19} color="#6750a8" strokeWidth={1.7} />
        <ChevronRight size={17} color="#6750a8" strokeWidth={1.8} style={{ marginLeft: -7 }} />
      </Pressable>

      <Steps agreement={!!agreement} sealed={!!sealed} />

      <View style={styles.sheet} accessibilityLabel={agreement ? 'Trade agreement' : 'Review payment costs'}>
        {agreement ? <AgreementSheet deal={deal} /> : <CompareSheet deal={deal} />}
        {!!error && (
          <View accessibilityRole="alert" style={styles.error}>
            <T size={13} color={colors.danger} lineHeight={21}>{error}</T>
            <TextButton label="Dismiss" onPress={() => setError('')} />
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TextButton label="Local demo · See assumptions" icon={LockKeyhole} onPress={() => setModal('sources')} size={11} center />
        <ArrowUpRight size={13} color={colors.green} strokeWidth={1.8} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(253,252,249,0.78)' },
  content: { paddingTop: 25, paddingHorizontal: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 22 },
  linked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 16,
    shadowColor: '#3a294a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 1,
  },
  steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 19 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  stepMark: { width: 30, height: 30, borderRadius: 11, borderWidth: 1, borderColor: '#ddd3e7', backgroundColor: '#f7f3fa', alignItems: 'center', justifyContent: 'center' },
  stepCurrent: { backgroundColor: '#fdfbf8', borderColor: '#9b78df' },
  stepDone: { backgroundColor: '#eaf8f3', borderColor: '#9bd9cf' },
  sheet: { paddingTop: 22, paddingHorizontal: 16, paddingBottom: 17, backgroundColor: 'rgba(253,251,248,0.96)', borderRadius: 16, shadowColor: '#33213f', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.08, shadowRadius: 28, elevation: 3 },
  error: { backgroundColor: colors.dangerBg, padding: 14, borderRadius: 14, marginTop: 18 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 16 },
});
