import { StyleSheet, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { colors } from '../theme';
import { T } from '../components/T';
import { PrimaryButton } from '../components/Button';
import { Sheet } from '../components/Sheet';

const steps = [
  { title: 'Find the missing €35.', body: 'Amira needs €6,000. In the sample bank route, deductions could leave her short.' },
  { title: 'Make one better decision.', body: 'Open Finance from the invoice. Compare all three routes, including the full USDC path, then choose Buyer to cover downstream fees. Open the exchange-rate scenario to see how a 5% change affects the margin.' },
  { title: 'Agree together.', body: 'Review the agreement and sign as Bilal. Switch to Amira, review, and sign the very same terms.' },
  { title: 'Keep something verifiable.', body: 'Share the signed record. Verify it, then test a changed amount and watch verification fail.' },
];

export function GuideSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="One deal. A 90-second story." onClose={onClose}>
      <T size={14} color="#5c7450" lineHeight={26} style={{ marginBottom: 22 }}>SANAD helps trading partners agree on the real cost of a cross-border invoice before anyone sends money.</T>
      <View style={{ gap: 23 }}>
        {steps.map((step, index) => (
          <View key={step.title} style={styles.step}>
            <View style={styles.number}><T size={12} lineHeight={16} color="#4b6b36">{index + 1}</T></View>
            <View style={{ flex: 1 }}>
              <T weight="bold" size={14} lineHeight={21}>{step.title}</T>
              <T size={13} color="#5f7750" lineHeight={24} style={{ marginTop: 6 }}>{step.body}</T>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.note}>
        <T size={12} color="#577346" lineHeight={22}>The people, conversation and quotes are fictional. The cost calculations, signatures, verification and record export work on your device.</T>
      </View>
      <PrimaryButton label="Explore the sample deal" icon={ArrowRight} onPress={onClose} fullWidth />
    </Sheet>
  );
}

export const sheetStyles = StyleSheet.create({
  note: { backgroundColor: '#eff4e5', paddingVertical: 16, paddingHorizontal: 13, borderRadius: 8, marginVertical: 23 },
  h3: { marginTop: 25, marginBottom: 11 },
  copy: { marginTop: 12 },
  smallCopy: { marginTop: 20 },
});

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: 12 },
  number: { height: 29, width: 29, borderRadius: 15, backgroundColor: '#e1eccf', alignItems: 'center', justifyContent: 'center' },
  note: sheetStyles.note,
});

export const sheetColors = { intro: '#5c7450', copy: '#5f7752', small: '#617b50', canvas: colors.canvas };
