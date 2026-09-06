import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { T } from '../components/T';
import { Sheet } from '../components/Sheet';
import { sheetColors, sheetStyles } from './GuideSheet';

const links = [
  { label: 'Circle · USDC is a US-dollar stablecoin', url: 'https://www.circle.com/usdc' },
  { label: 'OFX · Third-party bank deductions', url: 'https://www.ofx.com/en-ca/faqs/are-there-any-transfer-fees/' },
  { label: 'Bank of Canada · Indicative reference rates', url: 'https://www.bankofcanada.ca/rates/exchange/background-information-on-foreign-exchange-rates/' },
  { label: 'Swift Go · Existing solutions for predictable fees', url: 'https://www.swift.com/products/swift-go' },
];

function H3({ children }: { children: string }) {
  return <T weight="semibold" size={16} lineHeight={22} style={sheetStyles.h3}>{children}</T>;
}

function P({ children }: { children: React.ReactNode }) {
  return <T size={13} color={sheetColors.copy} lineHeight={24} style={sheetStyles.copy}>{children}</T>;
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={{ gap: 4 }}>
      {items.map((item) => <T key={item} size={13} color="#6f6678" lineHeight={24}>{'•'}  {item}</T>)}
    </View>
  );
}

export function SourceLink({ label, url, style }: { label: string; url: string; style?: object }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={() => { void Linking.openURL(url); }} style={({ pressed }) => [styles.link, pressed && { opacity: 0.8 }, style]}>
      <T size={12} color="#6750a8" lineHeight={20} style={{ flex: 1 }}>{label}</T>
      <ArrowUpRight size={15} color="#6750a8" strokeWidth={1.8} />
    </Pressable>
  );
}

export function SourcesSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Transparent by design." onClose={onClose}>
      <T size={14} color={sheetColors.intro} lineHeight={26} style={{ marginBottom: 22 }}>This is a decision prototype. It does not send money or obtain a bank quote.</T>
      <View style={styles.columns}>
        <View style={{ gap: 8 }}>
          <T weight="semibold" size={15}>Real in this demo</T>
          <Bullets items={['Cost, receipt and margin calculations.', 'FX stress scenarios that you control.', 'SHA-256 and two ECDSA P-256 signatures.', 'Record export, import and verification.', 'Both demo roles on one device.']} />
        </View>
        <View style={{ gap: 8 }}>
          <T weight="semibold" size={15}>Clearly simulated</T>
          <Bullets items={['Bilal, Amira and their conversation.', 'The invoice, sale proceeds and other costs.', 'All three routes, exchange rates and fee bands.', 'Delivery estimates and participant identities.']} />
        </View>
      </View>
      <H3>Where the numbers come from</H3>
      <P>All values are authored scenario inputs dated 5 September 2026. The reference rate is 1.5000 CAD per EUR. Bank wire adds 2.60% and a CA$35 transfer fee; Specialist transfer adds 0.55% and CA$8. Downstream fee ranges are assumptions, not historical observations or guaranteed bounds. These are fictional routes, not recommendations of real providers.</P>
      <P>Buyer coverage adds an estimated fee reserve to outlay and targets the full invoice receipt. Supplier coverage deducts estimated fees from receipt. Neither proves what a provider will deliver. Compare identical invoices and fee responsibilities.</P>
      <H3>Privacy, precisely</H3>
      <P>No account, analytics, external runtime API or message upload. Data and signing keys live in this app’s memory; closing the app clears them. This is not a production encrypted messenger or verified digital identity system. Exported records include deal details and public keys; private keys are never exported.</P>
      <H3>Why these costs matter</H3>
      <P>Real international transfers can involve intermediary and receiving-bank deductions. The following primary sources explain the mechanism; they do not supply our demo prices.</P>
      <P>USDC route assumptions: 1 USDC = 1 USD, 1 USD = 1.35 CAD, and 1 EUR = 1.111111 USD. Funding adds 0.6%, cash-out adds 1%, funding costs CA$4 and the network budget is 0.25 USDC equivalent. Cash-out/receiving fees are estimated at €3–10. Neither route availability in Tunisia nor these prices has been verified. FX, issuer/peg and provider risks remain. No wallet or blockchain is connected.</P>
      <View style={{ gap: 10, marginTop: 20 }}>
        {links.map((link) => <SourceLink key={link.url} {...link} />)}
      </View>
      <T size={11} color={sheetColors.small} lineHeight={21} style={sheetStyles.smallCopy}>No claim of FX prediction, Sharia certification, legal enforceability or real customer validation.</T>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  columns: { gap: 19, borderBottomWidth: 1, borderBottomColor: '#e8e1eb', paddingBottom: 15 },
  link: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 9, backgroundColor: '#f3eef8', borderRadius: 7, padding: 12, minHeight: 44 },
});
