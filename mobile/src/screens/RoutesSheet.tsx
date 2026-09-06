import { Pressable, StyleSheet, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Check, Coins, FlaskConical, SlidersHorizontal, Sparkles, TriangleAlert } from 'lucide-react-native';
import { colors } from '../theme';
import { T } from '../components/T';
import { Disclosure } from '../components/Disclosure';
import { Segmented } from '../components/Segmented';
import { markupPercent } from '../format';
import {
  calculateCosts, corridorOf, money, recommendRoute, roleInThread,
  type FeeBearer, type Quote,
} from '../shared';
import type { Workspace } from '../state/useWorkspace';

function Row({ label, hint, value, valueHint, total = false }: { label: string; hint?: string; value: string; valueHint?: string; total?: boolean }) {
  return (
    <View style={[s.row, total && s.totalRow]}>
      <View style={{ flex: 1 }}>
        <T weight={total ? 'bold' : 'regular'} size={13} color={total ? colors.ink : '#716879'} lineHeight={20}>{label}</T>
        {hint && <T size={10} color="#7a7282" lineHeight={14} style={{ marginTop: 3 }}>{hint}</T>}
      </View>
      <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <T weight={total ? 'bold' : 'regular'} size={13} lineHeight={20} tabular>{value}</T>
        {valueHint && <T size={10} color="#7a7282" lineHeight={14} style={{ marginTop: 3 }}>{valueHint}</T>}
      </View>
    </View>
  );
}

export function RoutesSheet({ workspace }: { workspace: Workspace }) {
  const thread = workspace.activeThread;
  if (!thread) return null;

  const corridor = corridorOf(thread);
  const role = roleInThread(thread, workspace.profileId);
  const recommendation = recommendRoute(thread.invoice, corridor);
  const best = recommendation.lowestTotalCost;
  const quote = corridor.quotes.find((option) => option.id === thread.quoteId) ?? corridor.quotes[0];
  const costs = calculateCosts(thread.invoice, quote, thread.bearer);
  const scenario = calculateCosts(thread.invoice, quote, thread.bearer, workspace.stress);
  const buyerCovers = thread.bearer === 'buyer';
  const shortfall = thread.invoice.amountEur - costs.recipientMinEur;

  const buyerMoney = (value: number) => money(value, corridor.buyerCurrency);
  const sellerMoney = (value: number) => money(value, corridor.sellerCurrency);
  const feeRange = (option: Quote) => option.downstreamFeeEur.max === 0
    ? 'no intermediary deduction'
    : `${sellerMoney(option.downstreamFeeEur.min)} – ${sellerMoney(option.downstreamFeeEur.max)} deducted in transit`;

  return (
    <View>
      <View>
        <T weight="semibold" size={21} lineHeight={29} style={{ letterSpacing: -0.5 }} accessibilityRole="header">How should this invoice be paid?</T>
        <T size={13} color={colors.muted} lineHeight={22} style={{ marginTop: 6 }}>
          {sellerMoney(thread.invoice.amountEur)} due · {corridor.buyerCountry} to {corridor.sellerCountry}
        </T>
      </View>

      <View style={s.dataNote}>
        <FlaskConical size={14} color="#675b73" strokeWidth={1.8} />
        <T size={11} color="#675b73" style={{ flex: 1 }} lineHeight={17}>
          Synthetic rates and fees, priced end to end. Not a live quote or provider offer.
        </T>
      </View>

      <View style={s.best}>
        <Sparkles size={19} color={colors.tintText} strokeWidth={1.7} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <T weight="bold" size={14} color={colors.tintText} lineHeight={21}>
            {best.quote.name} costs the least overall
          </T>
          <T size={12} color={colors.greenText} lineHeight={20} style={{ marginTop: 4 }}>
            {buyerMoney(recommendation.savingCad)} less lost to intermediaries than a bank wire, and the supplier
            receives {sellerMoney(best.costs.recipientMinEur)}.
          </T>
        </View>
      </View>

      <View style={s.options} accessibilityRole="radiogroup" accessibilityLabel="Payment route">
        {corridor.quotes.map((option) => {
          const result = calculateCosts(thread.invoice, option, thread.bearer);
          const active = quote.id === option.id;
          const recommended = option.id === best.quote.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${option.name}, buyer pays ${buyerMoney(result.totalMaxCad)}, supplier receives ${sellerMoney(result.recipientMinEur)}`}
              onPress={() => workspace.setThreadQuote(option.id)}
              style={({ pressed }) => [s.option, active && s.optionSelected, pressed && { opacity: 0.85 }]}
            >
              <View style={[s.radio, active && { borderColor: colors.selectedBorder }]}>{active && <View style={s.radioDot} />}</View>
              <View style={{ flex: 1 }}>
                <View style={s.optionTitle}>
                  <T weight="bold" size={14} lineHeight={20}>{option.name}</T>
                  {recommended && <View style={s.tag}><T size={9} lineHeight={12} color={colors.tintText}>Lowest total cost</T></View>}
                </View>
                <View style={s.pair}>
                  <View style={{ flex: 1 }}>
                    <T size={10} color="#716879" lineHeight={15}>Buyer pays</T>
                    <T weight="semibold" size={19} lineHeight={26} tabular style={{ letterSpacing: -0.5 }}>{buyerMoney(result.totalMaxCad)}</T>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T size={10} color="#716879" lineHeight={15}>Supplier receives</T>
                    <T weight="semibold" size={19} lineHeight={26} tabular style={{ letterSpacing: -0.5 }}>{sellerMoney(result.recipientMinEur)}</T>
                  </View>
                </View>
                <T size={11} color="#716879" lineHeight={17} style={{ marginTop: 9 }}>
                  {markupPercent(option)}% FX markup · {feeRange(option)}
                </T>
                <T size={11} color="#716879" lineHeight={17}>{option.delivery}</T>
              </View>
              {active && <Check size={20} color={colors.selectedBorder} strokeWidth={2} style={{ marginTop: 2 }} />}
            </Pressable>
          );
        })}
      </View>

      <View style={[s.callout, shortfall <= 0 && s.calloutResolved]}>
        <View style={{ marginTop: 2 }}>
          {shortfall <= 0
            ? <Check size={19} color={colors.resolvedText} strokeWidth={2} />
            : <TriangleAlert size={19} color={colors.warningText} strokeWidth={1.8} />}
        </View>
        <View style={{ flex: 1 }}>
          <T weight="semibold" size={14} color={shortfall <= 0 ? colors.resolvedText : colors.warningText} lineHeight={23}>
            {shortfall <= 0
              ? `The supplier receives the full ${sellerMoney(thread.invoice.amountEur)}.`
              : `The supplier could receive ${sellerMoney(costs.recipientMinEur)}.`}
          </T>
          <T size={12} color={shortfall <= 0 ? '#54756f' : colors.warningSub} lineHeight={21} style={{ marginTop: 5 }}>
            {shortfall <= 0
              ? buyerCovers && costs.feeReserveCad > 0
                ? `The buyer sets aside up to ${buyerMoney(costs.feeReserveCad)} for downstream fees. Final charges still need confirming.`
                : 'No correspondent bank stands between the two wallets on this route.'
              : `That is up to ${sellerMoney(shortfall)} short of the invoice. Who covers the difference?`}
          </T>
        </View>
      </View>

      <View style={s.feeChoice}>
        <View>
          <T weight="semibold" size={15} lineHeight={22}>Who covers downstream fees?</T>
          <T size={12} color={colors.muted} lineHeight={21} style={{ marginTop: 5 }}>
            {quote.downstreamFeeEur.max === 0
              ? 'This route has none to assign. The choice still applies if you switch routes.'
              : 'Intermediary and receiving-bank charges.'}
          </T>
        </View>
        <Segmented<FeeBearer>
          label="Who covers downstream fees?"
          value={thread.bearer}
          onChange={workspace.setThreadBearer}
          stacked
          options={[
            { value: 'supplier', label: 'Supplier', caption: 'Deducted on arrival' },
            { value: 'buyer', label: 'Buyer', caption: 'Budget for the full invoice' },
          ]}
        />
      </View>

      <Disclosure label="Where every unit goes" style={s.breakdown} contentStyle={{ paddingBottom: 17, gap: 15 }}>
        <Row label="Invoice at reference rate" hint={`1 ${corridor.sellerCurrency} = ${quote.referenceRate.toFixed(4)} ${corridor.buyerCurrency}`} value={buyerMoney(costs.principalCad)} />
        <Row label="Exchange-rate markup" hint={`${markupPercent(quote)}% above mid-market`} value={buyerMoney(costs.fxMarkupCad)} />
        <Row label="Transfer and network fee" value={buyerMoney(costs.transferFeeCad)} />
        <Row
          label="Downstream fees · estimated"
          value={quote.downstreamFeeEur.max === 0 ? 'None' : `${sellerMoney(quote.downstreamFeeEur.min)} – ${sellerMoney(quote.downstreamFeeEur.max)}`}
          valueHint={quote.downstreamFeeEur.max === 0 ? 'no bank in the middle' : buyerCovers ? 'covered by the buyer' : 'deducted from the supplier'}
        />
        <Row label="Buyer total outlay" value={`${buyerMoney(costs.totalMinCad)} – ${buyerMoney(costs.totalMaxCad)}`} total />
        <Row label="Supplier receives" value={`${sellerMoney(costs.recipientMinEur)} – ${sellerMoney(costs.recipientMaxEur)}`} total />
        <T size={11} color="#6f6678" lineHeight={18}>{quote.source}</T>
      </Disclosure>

      <Disclosure label="What if the exchange rate changes?" icon={SlidersHorizontal} hint="Explore" size={13} weight="regular">
        <View style={s.stress}>
          <T size={12} color="#6f6678" lineHeight={22}>
            A scenario, never a forecast. Positive values mean the {corridor.sellerCurrency} costs more {corridor.buyerCurrency}. This does not change your agreement.
          </T>
          <View style={s.sliderLabel}>
            <T size={12}>Change in {corridor.buyerCurrency} cost per {corridor.sellerCurrency}</T>
            <T weight="semibold" size={21} tabular>{workspace.stress > 0 ? '+' : ''}{workspace.stress}%</T>
          </View>
          <Slider
            accessibilityLabel={`Change in ${corridor.buyerCurrency} cost per ${corridor.sellerCurrency}`}
            minimumValue={-10}
            maximumValue={10}
            step={1}
            value={workspace.stress}
            onValueChange={(value) => workspace.setStress(Math.round(value))}
            minimumTrackTintColor={colors.selectedBorder}
            maximumTrackTintColor="#ddd3e1"
            thumbTintColor={colors.selectedBorder}
            style={{ width: '100%', height: 44 }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T size={10} color="#766f7e">−10% · cheaper</T>
            <T size={10} color="#766f7e">+10% · more expensive</T>
          </View>
          <View style={s.scenario}>
            <View style={{ flex: 1 }}>
              <T size={11} color="#756e7c" lineHeight={17}>Buyer outlay, upper estimate</T>
              <T weight="semibold" size={20} tabular style={{ marginTop: 7, letterSpacing: -0.4 }}>{buyerMoney(scenario.totalMaxCad)}</T>
            </View>
            <View style={{ flex: 1 }}>
              <T size={11} color="#756e7c" lineHeight={17}>{role === 'seller' ? 'You still receive' : 'Estimated shipment margin'}</T>
              <T
                weight="semibold"
                size={20}
                tabular
                color={role === 'buyer' && scenario.marginMinCad < 0 ? colors.danger : colors.ink}
                style={{ marginTop: 7, letterSpacing: -0.4 }}
              >
                {role === 'seller' ? sellerMoney(scenario.recipientMinEur) : buyerMoney(scenario.marginMinCad)}
              </T>
            </View>
          </View>
          <T size={10} color="#6f6678" lineHeight={16} style={{ marginTop: 15 }}>
            {role === 'seller'
              ? 'Your receipt is invoiced in your own currency, so an exchange-rate move lands on the buyer.'
              : `Margin = ${buyerMoney(thread.invoice.revenueCad)} expected sales − ${buyerMoney(thread.invoice.otherCostsCad)} other costs − payment outlay.`}
          </T>
        </View>
      </Disclosure>

      <View style={s.usdcNote}>
        <Coins size={19} color={colors.tintText} strokeWidth={1.7} style={{ marginTop: 2 }} />
        <T size={12} color={colors.greenText} lineHeight={20} style={{ flex: 1 }}>
          USDC only avoids the second conversion while the supplier is paid in USDC and holds it. Converting later
          reintroduces a cash-out spread, which the USDC route line prices in.
        </T>
      </View>

      <T size={11} color="#766f7e" lineHeight={21} center style={{ marginTop: 14 }}>
        Estimates are synthetic. No exchange rate is locked, and no money moves from this screen.
      </T>
    </View>
  );
}

const s = StyleSheet.create({
  dataNote: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 10, marginTop: 6 },
  best: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.tint, borderRadius: 14, padding: 14, marginBottom: 16 },
  options: { gap: 10 },
  option: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: '#e6ddea', borderRadius: 15, paddingVertical: 15, paddingHorizontal: 12, backgroundColor: colors.inputBg },
  optionSelected: { borderColor: colors.selectedBorder, backgroundColor: colors.greenSoft },
  radio: { height: 16, width: 16, borderRadius: 8, borderWidth: 1, borderColor: '#a795ba', alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  radioDot: { height: 8, width: 8, borderRadius: 4, backgroundColor: colors.selectedBorder },
  optionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tag: { backgroundColor: colors.tint, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 7 },
  pair: { flexDirection: 'row', gap: 12, marginTop: 11 },
  callout: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 15, paddingHorizontal: 13, backgroundColor: colors.warning, borderRadius: 14, marginTop: 16 },
  calloutResolved: { backgroundColor: colors.resolvedBg },
  feeChoice: { paddingVertical: 23, gap: 13 },
  breakdown: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  totalRow: { borderTopWidth: 1, borderTopColor: '#ddd3e1', borderStyle: 'dashed', paddingTop: 13 },
  stress: { paddingVertical: 16, paddingHorizontal: 12, backgroundColor: colors.stressBg, borderRadius: 14, marginBottom: 17 },
  sliderLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 18 },
  scenario: { flexDirection: 'row', gap: 14, borderTopWidth: 1, borderTopColor: '#ddd3e1', paddingTop: 17, marginTop: 17 },
  usdcNote: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#f0f8f6', borderRadius: 14, padding: 14, marginTop: 18 },
});
