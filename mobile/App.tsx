import { useEffect } from 'react';
import { ActivityIndicator, BackHandler, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Lora_400Regular } from '@expo-google-fonts/lora/400Regular';
import { Lora_500Medium } from '@expo-google-fonts/lora/500Medium';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, ShieldCheck, Wallet } from 'lucide-react-native';
import { colors, NAV_HEIGHT } from './src/theme';
import { T } from './src/components/T';
import { IconButton } from './src/components/Button';
import { Toast } from './src/components/Toast';
import { useBusiness, type BusinessTab } from './src/state/useBusiness';
import { BusinessWelcome, InvoiceList, CreateInvoice, InvoiceDetail, WalletScreen, BusinessSheets } from './src/screens/BusinessScreens';

function Root() {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Lora_400Regular, Lora_500Medium });
  const insets = useSafeAreaInsets();
  const business = useBusiness();
  const { modal, openModal, route, setRoute, tab, setTab } = business;
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (modal) { openModal(null); return true; }
      if (route !== 'list') { setRoute('list'); return true; }
      if (tab !== 'invoices') { setTab('invoices'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [modal, route, tab]);
  if (!fontsLoaded || !business.ready) return <View style={styles.loading}><ActivityIndicator color={colors.forest} accessibilityLabel="Opening your workspace" /></View>;
  const go = (next: BusinessTab) => { setTab(next); setRoute('list'); business.setError(''); };
  return <View style={[styles.app, { paddingTop: insets.top }]}>
    <Image source={require('./assets/mashrabiya-daylight.png')} resizeMode="cover" style={styles.daylight} accessibilityIgnoresInvertColors />
    <StatusBar style="dark" />
    <View style={styles.topbar}><View style={styles.wordmark}><T serif weight="medium" size={22} lineHeight={32} style={{ letterSpacing: 1.2 }}>SANAD</T><T serif size={25} lineHeight={32}>سند</T></View><T size={11} color={colors.tintText} style={{ marginLeft: 'auto' }}>USDC · Solana</T><IconButton icon={ShieldCheck} label="Business profile and privacy" onPress={() => openModal('security')} size={21} /></View>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{!business.profile ? <BusinessWelcome business={business} /> : tab === 'wallet' ? <WalletScreen business={business} /> : route === 'create' ? <CreateInvoice business={business} /> : route === 'detail' && business.selected ? <InvoiceDetail key={business.selected.invoice.id} business={business} /> : <InvoiceList business={business} />}</KeyboardAvoidingView>
    {business.profile && <View style={[styles.nav, { height: NAV_HEIGHT + insets.bottom, paddingBottom: 6 + insets.bottom }]} accessibilityRole="tablist">{(['invoices', 'wallet'] as const).map((value) => { const Icon = value === 'invoices' ? FileText : Wallet; const active = tab === value; return <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => go(value)} style={[styles.navButton, active && styles.navActive]}><Icon size={22} color={active ? colors.chipText : colors.muted} /><T weight={active ? 'bold' : 'regular'} size={12} color={active ? colors.chipText : colors.muted}>{value === 'invoices' ? 'Invoices' : 'Wallet'}</T></Pressable>; })}</View>}
    <Toast message={business.notice} bottomInset={insets.bottom} />
    <BusinessSheets business={business} />
  </View>;
}
export default function App() { return <SafeAreaProvider><Root /></SafeAreaProvider>; }
const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.canvas },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
  daylight: { position: 'absolute', top: 0, right: 0, width: '100%', height: 430, opacity: 0.66 },
  topbar: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 9, paddingLeft: 16, paddingRight: 6, backgroundColor: 'rgba(253,251,248,0.94)', borderBottomWidth: 1, borderBottomColor: colors.line },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  nav: { flexDirection: 'row', gap: 8, paddingTop: 6, paddingHorizontal: 24, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.paper },
  navButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 14, minHeight: 58 },
  navActive: { backgroundColor: colors.chip },
});
