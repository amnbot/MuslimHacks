import { StyleSheet, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { T } from '../components/T';
import { PrimaryButton } from '../components/Button';
import { Sheet } from '../components/Sheet';
import { cad } from '../format';
import type { Deal } from '../state/useDeal';
import { sheetColors, sheetStyles } from './GuideSheet';
import { SourceLink } from './SourcesSheet';

export function UsdcSheet({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const { agreement, usdcBreakdown, setModal, setScreen, setQuoteId } = deal;
  const steps = [
    { title: 'Buy USDC with CAD', body: 'A funding provider converts CAD into dollar-linked USDC. This scenario adds a 0.6% conversion spread and a CA$4 funding fee.' },
    { title: 'Transfer USDC', body: `The network budget is 0.25 USDC equivalent, or ${cad(usdcBreakdown.networkFeeCad)} here. That small network fee is only one part of the cost.` },
    { title: 'Cash out to EUR', body: 'Amira still needs euros. The scenario adds a 1% conversion spread plus €3–10 in possible cash-out and receiving fees.' },
  ];
  return (
    <Sheet title="USDC changes the route. Not the FX." onClose={onClose}>
      <T size={14} color={sheetColors.intro} lineHeight={26} style={{ marginBottom: 22 }}>USDC tracks the US dollar. Your sample invoice is in euros and the buyer starts with Canadian dollars. Both conversions still matter.</T>
      <View style={{ gap: 23 }}>
        {steps.map((step, index) => (
          <View key={step.title} style={styles.step}>
            <View style={styles.number}><T size={12} lineHeight={16} color="#6750a8">{index + 1}</T></View>
            <View style={{ flex: 1 }}>
              <T weight="bold" size={14} lineHeight={21}>{step.title}</T>
              <T size={13} color="#6f6678" lineHeight={24} style={{ marginTop: 6 }}>{step.body}</T>
            </View>
          </View>
        ))}
      </View>
      <View style={sheetStyles.note}>
        <T weight="bold" size={12} color="#6750a8" lineHeight={22}>Could it help?</T>
        <T size={12} color="#6750a8" lineHeight={22} style={{ marginTop: 7 }}>Possibly, if both businesses already use USDC or a supported route reduces the total cost. For this sample, the specialist route is cheaper. A dollar peg does not fix a CAD/EUR rate.</T>
      </View>
      <T size={11} color={sheetColors.small} lineHeight={21}>This is a hypothetical cost comparison. No wallet, balance, transfer or blockchain transaction is created. Route availability in Tunisia is unverified. Peg, issuer and cash-out provider risks remain; no Sharia-compliance claim is made.</T>
      <SourceLink label="Source: Circle’s USDC description" url="https://www.circle.com/usdc" style={{ marginTop: 15, marginBottom: 19 }} />
      <PrimaryButton
        label={agreement ? 'Back to your agreement' : 'Compare the USDC estimate'}
        icon={ArrowRight}
        fullWidth
        onPress={() => {
          setModal(null);
          setScreen('finance');
          if (!agreement) setQuoteId('usdc-route');
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: 12 },
  number: { height: 29, width: 29, borderRadius: 15, backgroundColor: '#eee7fb', alignItems: 'center', justifyContent: 'center' },
});
