import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { colors } from '../theme';
import { T } from '../components/T';
import { PrimaryButton } from '../components/Button';
import { Field } from '../components/Field';
import { Sheet } from '../components/Sheet';
import { eur } from '../format';
import type { Deal } from '../state/useDeal';
import { sheetColors, sheetStyles } from './GuideSheet';

function parseNumber(value: string): number {
  const trimmed = value.trim().replace(',', '.');
  return trimmed === '' ? Number.NaN : Number(trimmed);
}

export function EditInvoiceSheet({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const { invoice, agreement, saveInvoice } = deal;
  const frozen = !!agreement;
  const [form, setForm] = useState({
    goods: invoice.goods,
    quantity: String(invoice.quantity),
    unitPriceEur: String(invoice.unitPriceEur),
    revenueCad: String(invoice.revenueCad),
    otherCostsCad: String(invoice.otherCostsCad),
    dueDate: invoice.dueDate,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const total = parseNumber(form.quantity) * parseNumber(form.unitPriceEur);
  const update = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  function submit() {
    setErrors(saveInvoice({
      ...invoice,
      goods: form.goods.trim(),
      quantity: parseNumber(form.quantity),
      unitPriceEur: parseNumber(form.unitPriceEur),
      revenueCad: parseNumber(form.revenueCad),
      otherCostsCad: parseNumber(form.otherCostsCad),
      dueDate: form.dueDate.trim(),
    }));
  }

  return (
    <Sheet title={frozen ? 'Invoice in this agreement' : 'Make it your sample deal.'} onClose={onClose}>
      <T size={14} color={sheetColors.intro} lineHeight={26} style={{ marginBottom: 22 }}>Edit the illustrative invoice. Costs update from the same three sample quotes.</T>
      <View style={{ gap: 17 }}>
        <Field label="Goods" value={form.goods} maxLength={120} editable={!frozen} onChangeText={update('goods')} />
        <View style={styles.row}>
          <Field label="Quantity · bottles" value={form.quantity} keyboardType="number-pad" editable={!frozen} onChangeText={update('quantity')} />
          <Field label="Unit price · EUR" value={form.unitPriceEur} keyboardType="decimal-pad" editable={!frozen} onChangeText={update('unitPriceEur')} />
        </View>
        <View style={styles.total}>
          <T size={14}>Invoice total</T>
          <T weight="bold" size={14} tabular>{Number.isFinite(total) ? eur(total) : '—'}</T>
        </View>
        <View style={styles.row}>
          <Field label="Expected sales · CAD" value={form.revenueCad} keyboardType="decimal-pad" editable={!frozen} onChangeText={update('revenueCad')} />
          <Field label="Other costs · CAD" value={form.otherCostsCad} keyboardType="decimal-pad" editable={!frozen} onChangeText={update('otherCostsCad')} />
        </View>
        <Field label="Payment due · YYYY-MM-DD" value={form.dueDate} placeholder="2026-09-18" autoCapitalize="none" autoCorrect={false} editable={!frozen} onChangeText={update('dueDate')} />
        {errors.length > 0 && (
          <View accessibilityRole="alert" style={{ gap: 4 }}>
            {errors.map((issue) => <T key={issue} size={12} color={colors.danger} lineHeight={20}>{'•'}  {issue}</T>)}
          </View>
        )}
        {frozen ? (
          <View style={sheetStyles.note}>
            <T size={12} color="#577346" lineHeight={22}>This invoice is in a frozen agreement. Choose “Revise terms” in the agreement to start a new draft.</T>
          </View>
        ) : (
          <PrimaryButton label="Update invoice" icon={ArrowRight} onPress={submit} fullWidth />
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  total: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, backgroundColor: '#eaf2dd', borderRadius: 7, padding: 14 },
});
