import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ArrowLeft, Check, CheckCircle2, ChevronRight, Minus, Package, Plane, Plus, Star } from 'lucide-react-native';
import { colors } from '../theme';
import { T } from '../components/T';
import { IconButton, PrimaryButton } from '../components/Button';
import { Toast } from '../components/Toast';
import { ITEM_CATEGORIES, ridersFor, type Rider } from '../shared';
import type { Workspace } from '../state/useWorkspace';

type Step = 'options' | 'riders' | 'confirm';

/**
 * The purely illustrative "how would you like to receive it?" mockup shown after a
 * confirmed payment. Nothing here is wired to anything real: riders, ratings, trip
 * dates and prices are all mock data, and selecting one only ends this screen.
 */
export function ShippingScreen({ workspace }: { workspace: Workspace }) {
  const context = workspace.shipping;
  const [step, setStep] = useState<Step>('options');
  const [selected, setSelected] = useState<Rider | null>(null);
  const [kg, setKg] = useState(1);
  const [item, setItem] = useState<string | null>(null);

  if (!context) return null;
  const riders = ridersFor(context.fromCountry, context.toCountry);

  function selectRider(rider: Rider) {
    setSelected(rider);
    setKg(1);
    setItem(rider.acceptedItems[0] ?? null);
  }

  function done() {
    setStep('confirm');
  }

  function close() {
    setStep('options');
    setSelected(null);
    workspace.closeShipping();
  }

  return (
    <View style={s.root}>
      <View style={s.head}>
        <IconButton
          icon={ArrowLeft}
          label="Back"
          onPress={() => (step === 'options' ? close() : selected ? setSelected(null) : setStep('options'))}
        />
        <T weight="semibold" size={16} style={{ flex: 1 }}>
          {step === 'options' ? 'Next steps' : step === 'confirm' ? 'Request sent' : 'Riders on this route'}
        </T>
      </View>

      {step === 'options' && (
        <ScrollView contentContainerStyle={s.page}>
          <T serif size={26} lineHeight={34} style={{ marginTop: 6 }}>How would you like to receive it?</T>
          <T size={14} color={colors.muted} lineHeight={22} style={{ marginTop: 8 }}>
            {context.fromCountry} to {context.toCountry}. Choose a way to bring your goods home.
          </T>
          <View style={s.optionGrid}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose from certified brokers"
              onPress={() => workspace.setNotice('Certified broker directory — coming soon.')}
              style={({ pressed }) => [s.optionCard, pressed && { opacity: 0.85 }]}
            >
              <View style={[s.optionIcon, { backgroundColor: colors.chip }]}><CheckCircle2 size={30} color={colors.avatarText} strokeWidth={1.6} /></View>
              <T weight="bold" size={15} center>Certified brokers</T>
              <T size={12} color={colors.muted} center lineHeight={18}>Licensed customs brokers for formal shipping</T>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Find a rider"
              onPress={() => setStep('riders')}
              style={({ pressed }) => [s.optionCard, s.optionCardAccent, pressed && { opacity: 0.85 }]}
            >
              <View style={[s.optionIcon, { backgroundColor: colors.tint }]}><Plane size={28} color={colors.tintText} strokeWidth={1.6} /></View>
              <T weight="bold" size={15} center>Find a rider</T>
              <T size={12} color={colors.muted} center lineHeight={18}>Travellers already making the trip</T>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {step === 'riders' && !selected && (
        <ScrollView contentContainerStyle={s.page}>
          <T size={13} color={colors.muted} lineHeight={20}>
            {riders.length} rider{riders.length === 1 ? '' : 's'} travelling {context.fromCountry} → {context.toCountry}
          </T>
          <View style={{ gap: 12, marginTop: 14 }}>
            {riders.map((rider) => (
              <Pressable key={rider.id} accessibilityRole="button" accessibilityLabel={`${rider.name}, rated ${rider.rating}`} onPress={() => selectRider(rider)} style={({ pressed }) => [s.riderCard, pressed && { opacity: 0.9 }]}>
                <View style={s.riderAvatar}><T weight="bold" size={14} color={colors.avatarText}>{rider.initials}</T></View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={s.riderTop}>
                    <T weight="bold" size={15}>{rider.name}</T>
                    <View style={s.ratingChip}><Star size={11} color="#c9891b" fill="#c9891b" /><T size={11} weight="semibold" color="#8a5f10">{rider.rating.toFixed(1)}</T></View>
                  </View>
                  <T size={12} color={colors.muted}>{rider.trips} trips · Departs {rider.departure} · Arrives {rider.arrival}</T>
                  <T size={12} color={colors.tintText}>Up to {rider.maxKg}kg · ${rider.pricePerKg}/kg</T>
                  <View style={s.itemRow}>
                    {rider.acceptedItems.slice(0, 3).map((accepted) => <View key={accepted} style={s.itemChip}><T size={10} color={colors.greenText}>{accepted}</T></View>)}
                    {rider.acceptedItems.length > 3 && <T size={10} color={colors.muted}>+{rider.acceptedItems.length - 3} more</T>}
                  </View>
                </View>
                <ChevronRight size={18} color={colors.muted} />
              </Pressable>
            ))}
            {riders.length === 0 && (
              <View style={s.empty}>
                <Package size={32} color={colors.muted} strokeWidth={1.3} />
                <T size={13} color={colors.muted} center>No riders on this route yet. Check back soon.</T>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {step === 'riders' && selected && (
        <ScrollView contentContainerStyle={s.page}>
          <View style={s.riderCard}>
            <View style={s.riderAvatar}><T weight="bold" size={14} color={colors.avatarText}>{selected.initials}</T></View>
            <View style={{ flex: 1, gap: 3 }}>
              <T weight="bold" size={15}>{selected.name}</T>
              <T size={12} color={colors.muted}>Departs {selected.departure} · Arrives {selected.arrival}</T>
            </View>
          </View>

          <T weight="semibold" size={14} style={{ marginTop: 22 }}>How many kilograms?</T>
          <View style={s.stepper}>
            <IconButton icon={Minus} label="Fewer kilograms" onPress={() => setKg((value) => Math.max(1, value - 1))} />
            <T weight="bold" size={28} tabular style={{ minWidth: 70, textAlign: 'center' }}>{kg} kg</T>
            <IconButton icon={Plus} label="More kilograms" onPress={() => setKg((value) => Math.min(selected.maxKg, value + 1))} />
          </View>
          <T size={12} color={colors.muted} center>Up to {selected.maxKg}kg available</T>

          <T weight="semibold" size={14} style={{ marginTop: 22 }}>What are you sending?</T>
          <View style={s.itemGrid}>
            {ITEM_CATEGORIES.filter((category) => selected.acceptedItems.includes(category)).map((category) => {
              const active = item === category;
              return (
                <Pressable key={category} accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={() => setItem(category)} style={[s.itemOption, active && s.itemOptionActive]}>
                  {active && <Check size={13} color={colors.tintText} strokeWidth={2.2} />}
                  <T size={12} weight={active ? 'bold' : 'medium'} color={active ? colors.tintText : colors.ink}>{category}</T>
                </Pressable>
              );
            })}
          </View>

          <View style={s.totalRow}>
            <T size={13} color={colors.muted}>Estimated cost</T>
            <T weight="bold" size={20} tabular>${(kg * selected.pricePerKg).toFixed(0)}</T>
          </View>

          <PrimaryButton label="Done" onPress={done} disabled={!item} fullWidth style={{ marginTop: 18 }} />
        </ScrollView>
      )}

      {step === 'confirm' && selected && (
        <View style={s.confirm}>
          <View style={s.confirmSeal}><CheckCircle2 size={48} color={colors.tintText} strokeWidth={1.5} /></View>
          <T serif size={24} lineHeight={32} center style={{ marginTop: 18 }}>Rider notified</T>
          <T size={14} color={colors.muted} center lineHeight={22} style={{ marginTop: 8, maxWidth: 280 }}>
            {selected.name} has been notified about {kg}kg of {item}. You'll coordinate pickup details together.
          </T>
          <View style={s.confirmSummary}>
            <T size={12} color={colors.muted}>Rider</T><T weight="semibold" size={14}>{selected.name}</T>
            <T size={12} color={colors.muted} style={{ marginTop: 8 }}>Weight & item</T><T weight="semibold" size={14}>{kg}kg · {item}</T>
            <T size={12} color={colors.muted} style={{ marginTop: 8 }}>Estimated cost</T><T weight="semibold" size={14}>${(kg * selected.pricePerKg).toFixed(0)}</T>
          </View>
          <PrimaryButton label="Back to conversations" onPress={close} fullWidth style={{ marginTop: 28 }} />
        </View>
      )}
      <Toast message={workspace.notice} bottomInset={0} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 54, paddingHorizontal: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.paper },
  page: { padding: 20, paddingBottom: 60 },
  optionGrid: { flexDirection: 'row', gap: 14, marginTop: 30 },
  optionCard: { flex: 1, aspectRatio: 0.95, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  optionCardAccent: { borderColor: colors.selectedBorder },
  optionIcon: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  riderCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  riderAvatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.avatarBg, alignItems: 'center', justifyContent: 'center' },
  riderTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  ratingChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fdf3e0', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  itemRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  itemChip: { backgroundColor: colors.greenSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 12 },
  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  itemOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.inputBg },
  itemOptionActive: { borderColor: colors.selectedBorder, backgroundColor: colors.tint },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line },
  confirm: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  confirmSeal: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  confirmSummary: { width: '100%', marginTop: 26, padding: 18, borderRadius: 16, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
});
