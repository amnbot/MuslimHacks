import { Pressable, StyleSheet, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Coins, FlaskConical, Leaf, SlidersHorizontal, TriangleAlert } from 'lucide-react-native';
import { colors } from '../theme';
import { T } from '../components/T';
import { IconButton, PrimaryButton, TextButton } from '../components/Button';
import { Disclosure } from '../components/Disclosure';
import { Segmented } from '../components/Segmented';
import { cad, eur, markupPercent, range } from '../format';
import { calculateCosts, DEMO_QUOTES, USDC_ASSUMPTIONS, type FeeBearer } from '../shared';
import type { Deal } from '../state/useDeal';

function Row({ label, hint, value, valueHint, total = false }: { label: string; hint?: string; value: string; valueHint?: string; total?: boolean }) {
  return (
    <View style={[styles.row, total && styles.totalRow]}>
      <View style={{ flex: 1 }}>
        <T weight={total ? 'bold' : 'regular'} size={13} color={total ? colors.ink : '#5e7053'} lineHeight={20}>{label}</T>
        {hint && <T size={10} color="#647955" lineHeight={14} style={{ marginTop: 3 }}>{hint}</T>}
      </View>
      <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <T weight={total ? 'bold' : 'regular'} size={13} lineHeight={20} tabular>{value}</T>
        {valueHint && <T size={10} color="#647955" lineHeight={14} style={{ marginTop: 3 }}>{valueHint}</T>}
      </View>
    </View>
  );
}

export function CompareSheet({ deal }: { deal: Deal }) {
  const { invoice, quote, setQuoteId, bearer, setBearer, stress, setStress, costs, scenario, bank, specialist, usdcBreakdown, busy, reviewAgreement, setModal } = deal;
  const isUsdc = quote.id === 'usdc-route';
  const buyerCovers = bearer === 'buyer';

  return (
    <View>
      <View style={styles.heading}>
        <View style={{ flex: 1 }}>
          <T weight="semibold" size={21} lineHeight={29} style={{ letterSpacing: -0.5 }} accessibilityRole="header">How should this invoice be paid?</T>
          <T size={13} color={colors.muted} lineHeight={22} style={{ marginTop: 6 }}>{eur(invoice.amountEur)} due · Compare buyer outlay in CAD.</T>
        </View>
        <IconButton icon={SlidersHorizontal} label="Edit invoice" onPress={() => setModal('edit')} size={18} style={{ marginTop: -6, marginRight: -6 }} />
      </View>

      <Pressable accessibilityRole="button" onPress={() => setModal('sources')} style={styles.dataNote}>
        <FlaskConical size={14} color="#5f734f" strokeWidth={1.8} />
        <T size={11} color="#5f734f" style={{ flex: 1 }}>Illustrative rates & fees · see assumptions</T>
        <ArrowUpRight size={14} color="#5f734f" strokeWidth={1.8} />
      </Pressable>

      <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel="Payment route">
        {DEMO_QUOTES.map((option, index) => {
          const result = calculateCosts(invoice, option, bearer);
          const active = quote.id === option.id;
          const optionIsUsdc = option.id === 'usdc-route';
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${option.name}, ${cad(result.totalMaxCad)}`}
              onPress={() => setQuoteId(option.id)}
              style={({ pressed }) => [styles.option, active && styles.optionSelected, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.radio, active && { borderColor: '#52733d' }]}>{active && <View style={styles.radioDot} />}</View>
              <View style={{ flex: 1 }}>
                <View style={styles.optionTitle}>
                  <T weight="bold" size={14} lineHeight={20}>{option.name}</T>
                  {index === 1 && <View style={styles.tag}><T size={9} lineHeight={12} color={colors.tintText}>Lowest estimate</T></View>}
                  {optionIsUsdc && <View style={[styles.tag, { backgroundColor: '#eaece5' }]}><T size={9} lineHeight={12} color="#596e51">Simulation</T></View>}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 11 }}>
                  <T weight="semibold" size={27} lineHeight={34} tabular style={{ letterSpacing: -0.9 }}>{cad(result.totalMaxCad)}</T>
                  <T weight="medium" size={10} color="#627651">CAD</T>
                </View>
                <T size={10} color="#617351" lineHeight={16} style={{ marginTop: 2 }}>{buyerCovers ? 'Includes estimated fee reserve' : 'Estimated buyer outlay'}</T>
                <T size={11} color="#5c734c" lineHeight={19} style={{ marginTop: 11 }}>
                  {optionIsUsdc ? 'CAD → USDC → EUR · FX still applies' : `${option.delivery.split(' ·')[0]} · ${markupPercent(option)}% FX markup`}
                </T>
              </View>
              {active && <Check size={20} color="#4f6e3d" strokeWidth={2} style={{ marginTop: 2 }} />}
            </Pressable>
          );
        })}
      </View>

      {isUsdc ? (
        <View style={styles.usdcContext}>
          <Coins size={21} color="#49623c" strokeWidth={1.7} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <T weight="bold" size={13} color="#49623c" lineHeight={22}>Digital dollars. Still two currency conversions.</T>
            <T size={12} color="#596e4c" lineHeight={21} style={{ marginTop: 5 }}>The buyer pays CAD and Amira receives EUR. USDC changes the route, not the invoice currency.</T>
            <TextButton label="See the full USDC path" icon={ArrowRight} iconPosition="right" onPress={() => setModal('usdc')} />
          </View>
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setModal('usdc')} style={styles.usdcLearn}>
          <Coins size={18} color="#526f42" strokeWidth={1.7} />
          <T size={12} color="#526f42" style={{ flex: 1 }}>Would USDC remove the FX cost?</T>
          <ChevronRight size={17} color="#526f42" strokeWidth={1.8} />
        </Pressable>
      )}

      <View style={[styles.callout, buyerCovers && styles.calloutResolved]}>
        <View style={{ marginTop: 2 }}>{buyerCovers ? <Check size={19} color={colors.resolvedText} strokeWidth={2} /> : <TriangleAlert size={19} color={colors.warningText} strokeWidth={1.8} />}</View>
        <View style={{ flex: 1 }}>
          <T weight="semibold" size={14} color={buyerCovers ? colors.resolvedText : colors.warningText} lineHeight={23}>
            {buyerCovers ? 'You’ve accounted for the supplier’s full invoice.' : `The supplier could receive ${eur(costs.recipientMinEur)}.`}
          </T>
          <T size={12} color={buyerCovers ? '#58724a' : colors.warningSub} lineHeight={21} style={{ marginTop: 5 }}>
            {buyerCovers
              ? `The buyer allows up to ${cad(costs.feeReserveCad)} for downstream fees. Final charges still need confirmation.`
              : `That’s up to ${eur(invoice.amountEur - costs.recipientMinEur)} short. Who covers the difference?`}
          </T>
        </View>
      </View>

      <View style={styles.feeChoice}>
        <View>
          <T weight="semibold" size={15} lineHeight={22}>Who covers downstream fees?</T>
          <T size={12} color={colors.muted} lineHeight={21} style={{ marginTop: 5 }}>{isUsdc ? 'Cash-out provider and receiving-bank charges.' : 'Intermediary and receiving-bank charges.'}</T>
        </View>
        <Segmented<FeeBearer>
          label="Who covers downstream fees?"
          value={bearer}
          onChange={setBearer}
          stacked
          options={[
            { value: 'supplier', label: 'Supplier', caption: 'Deducted on arrival' },
            { value: 'buyer', label: 'Buyer', caption: 'Budget for full invoice' },
          ]}
        />
      </View>

      <Disclosure label="Where every dollar goes" style={styles.breakdown} contentStyle={{ paddingBottom: 17, gap: 15 }}>
        <Row label="Invoice at reference rate" hint={`1 EUR = ${quote.referenceRate.toFixed(4)} CAD`} value={cad(costs.principalCad)} />
        {isUsdc ? (
          <>
            <Row label="Buy USDC · conversion spread" hint={`${USDC_ASSUMPTIONS.fundingSpreadPercent}% funding spread`} value={cad(usdcBreakdown.fundingSpreadCad)} />
            <Row label="Cash out to EUR · conversion spread" hint={`${USDC_ASSUMPTIONS.cashoutSpreadPercent}% cash-out spread`} value={cad(usdcBreakdown.cashoutSpreadCad)} />
            <Row label="Funding fee" value={cad(usdcBreakdown.fundingFeeCad)} />
            <Row label="Network fee budget" hint={`${USDC_ASSUMPTIONS.networkFeeUsdc} USDC equivalent · synthetic`} value={cad(usdcBreakdown.networkFeeCad)} />
          </>
        ) : (
          <>
            <Row label="Exchange-rate markup" hint={`${markupPercent(quote)}%`} value={cad(costs.fxMarkupCad)} />
            <Row label="Transfer fee" value={cad(costs.transferFeeCad)} />
          </>
        )}
        <Row label="Downstream fees · estimated" value={range(quote.downstreamFeeEur.min, quote.downstreamFeeEur.max, 'EUR')} valueHint={buyerCovers ? 'covered by buyer' : 'deducted from supplier'} />
        <Row label="Buyer total outlay" value={range(costs.totalMinCad, costs.totalMaxCad)} total />
      </Disclosure>

      <Disclosure label="What if the exchange rate changes?" icon={SlidersHorizontal} hint="Explore" size={13} weight="regular">
        <View style={styles.stress}>
          <T size={12} color="#5b714d" lineHeight={22}>A scenario, never a forecast. Positive values mean the euro costs more Canadian dollars. This does not change your agreement.</T>
          <View style={styles.sliderLabel}>
            <T size={12}>Change in CAD cost per euro</T>
            <T weight="semibold" size={21} tabular>{stress > 0 ? '+' : ''}{stress}%</T>
          </View>
          <Slider
            accessibilityLabel="Change in CAD cost per euro"
            minimumValue={-10}
            maximumValue={10}
            step={1}
            value={stress}
            onValueChange={(value) => setStress(Math.round(value))}
            minimumTrackTintColor="#3c673b"
            maximumTrackTintColor="#cad7bb"
            thumbTintColor="#3c673b"
            style={{ width: '100%', height: 44 }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T size={10} color="#607951">−10% · cheaper</T>
            <T size={10} color="#607951">+10% · more expensive</T>
          </View>
          <View style={styles.scenario}>
            <View style={{ flex: 1 }}>
              <T size={11} color="#5b724b" lineHeight={17}>Buyer outlay, upper estimate</T>
              <T weight="semibold" size={21} tabular style={{ marginTop: 7, letterSpacing: -0.4 }}>{cad(scenario.totalMaxCad)}</T>
            </View>
            <View style={{ flex: 1 }}>
              <T size={11} color="#5b724b" lineHeight={17}>Estimated shipment margin</T>
              <T weight="semibold" size={21} tabular color={scenario.marginMinCad < 0 ? colors.danger : colors.ink} style={{ marginTop: 7, letterSpacing: -0.4 }}>{cad(scenario.marginMinCad)}</T>
            </View>
          </View>
          <T size={10} color="#5b714d" lineHeight={16} style={{ marginTop: 15 }}>Margin = {cad(invoice.revenueCad)} expected sales − {cad(invoice.otherCostsCad)} other costs − payment outlay.</T>
        </View>
      </Disclosure>

      <View style={styles.footer}>
        <View style={styles.savings}>
          <Leaf size={18} color={colors.greenText} strokeWidth={1.7} />
          <T size={12} color={colors.greenText} lineHeight={21} style={{ flex: 1 }}>
            {quote.id === DEMO_QUOTES[1].id
              ? <><T weight="bold" size={12} color="#436235">{cad(bank.totalMaxCad - specialist.totalMaxCad)} less</T> than the sample bank route</>
              : <>There’s a lower-cost sample route. <T weight="bold" size={12} color="#436235">Compare before you agree.</T></>}
          </T>
        </View>
        <PrimaryButton label={busy ? 'Preparing…' : 'Review agreement'} icon={ArrowRight} onPress={() => { void reviewAgreement(); }} disabled={busy} fullWidth />
      </View>
      <T size={11} color="#60744f" lineHeight={21} center style={{ marginTop: 14 }}>Estimates are synthetic. No money moves, and no exchange rate is locked.</T>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  dataNote: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, marginTop: 8, marginBottom: 10, minHeight: 44 },
  options: { gap: 11 },
  option: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: '#d0dcc2', borderRadius: 11, paddingVertical: 15, paddingHorizontal: 12 },
  optionSelected: { borderColor: colors.selectedBorder, backgroundColor: colors.greenSoft },
  radio: { height: 16, width: 16, borderRadius: 8, borderWidth: 1, borderColor: '#99ad85', alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  radioDot: { height: 8, width: 8, borderRadius: 4, backgroundColor: '#52733d' },
  optionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tag: { backgroundColor: colors.tint, borderRadius: 4, paddingVertical: 3, paddingHorizontal: 5 },
  usdcContext: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#eef1e7', borderRadius: 10, paddingVertical: 15, paddingHorizontal: 13, marginTop: 16 },
  usdcLearn: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 13, minHeight: 44 },
  callout: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 15, paddingHorizontal: 13, backgroundColor: colors.warning, borderRadius: 9, marginTop: 13 },
  calloutResolved: { backgroundColor: colors.resolvedBg },
  feeChoice: { paddingVertical: 23, gap: 13 },
  breakdown: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  totalRow: { borderTopWidth: 1, borderTopColor: '#cad7bb', borderStyle: 'dashed', paddingTop: 13 },
  stress: { paddingVertical: 16, paddingHorizontal: 12, backgroundColor: colors.stressBg, borderRadius: 9, marginBottom: 17 },
  sliderLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 18 },
  scenario: { flexDirection: 'row', gap: 14, borderTopWidth: 1, borderTopColor: '#d1ddc2', paddingTop: 17, marginTop: 17 },
  footer: { gap: 17, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line },
  savings: { flexDirection: 'row', gap: 9, alignItems: 'center' },
});
