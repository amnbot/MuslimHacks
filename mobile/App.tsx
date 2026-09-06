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
import { FileText, MessagesSquare, ShieldCheck, Wallet } from 'lucide-react-native';
import { colors, NAV_HEIGHT } from './src/theme';
import { T } from './src/components/T';
import { IconButton } from './src/components/Button';
import { Sheet } from './src/components/Sheet';
import { Toast } from './src/components/Toast';
import { useWorkspace, type WorkspaceTab } from './src/state/useWorkspace';
import { ConversationList } from './src/screens/ConversationList';
import { ConversationScreen } from './src/screens/ConversationScreen';
import { RoutesSheet } from './src/screens/RoutesSheet';
import { InvoiceList, CreateInvoice, InvoiceDetail, WalletScreen, BusinessSheets } from './src/screens/BusinessScreens';

const TABS: { value: WorkspaceTab; label: string; icon: typeof FileText }[] = [
  { value: 'chats', label: 'Chats', icon: MessagesSquare },
  { value: 'invoices', label: 'Invoices', icon: FileText },
  { value: 'wallet', label: 'Wallet', icon: Wallet },
];

function Root() {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Lora_400Regular, Lora_500Medium });
  const insets = useSafeAreaInsets();
  const workspace = useWorkspace();
  const { modal, openModal, route, setRoute, tab, setTab } = workspace;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (modal) { openModal(null); return true; }
      if (route !== 'list') { setRoute('list'); return true; }
      if (tab !== 'chats') { setTab('chats'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [modal, route, tab]);

  if (!fontsLoaded || !workspace.ready) {
    return <View style={styles.loading}><ActivityIndicator color={colors.forest} accessibilityLabel="Opening your workspace" /></View>;
  }

  const go = (next: WorkspaceTab) => { setTab(next); setRoute('list'); workspace.setError(''); };

  const screen = tab === 'wallet' ? <WalletScreen business={workspace} />
    : tab === 'invoices' ? (route === 'create' ? <CreateInvoice business={workspace} />
      : route === 'detail' && workspace.selected ? <InvoiceDetail key={workspace.selected.invoice.id} business={workspace} />
        : <InvoiceList business={workspace} />)
    : route === 'thread' && workspace.activeThread ? <ConversationScreen workspace={workspace} />
      : <ConversationList workspace={workspace} />;

  return <View style={[styles.app, { paddingTop: insets.top }]}>
    <Image source={require('./assets/mashrabiya-daylight.png')} resizeMode="cover" style={styles.daylight} accessibilityIgnoresInvertColors />
    <StatusBar style="dark" />
    <View style={styles.topbar}>
      <View style={styles.wordmark}>
        <T serif weight="medium" size={22} lineHeight={32} style={{ letterSpacing: 1.2 }}>SANAD</T>
        <T serif size={25} lineHeight={32}>سند</T>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Signed in as ${workspace.profile.personName}. Switch demo profile.`}
        onPress={() => openModal('profile')}
        style={({ pressed }) => [styles.profile, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.profileAvatar}><T weight="bold" size={11} color={colors.avatarText}>{workspace.profile.initials}</T></View>
        <View>
          <T size={12} weight="semibold" lineHeight={16}>{workspace.profile.personName.split(' ')[0]}</T>
          <T size={10} color={colors.tintText} lineHeight={14}>{workspace.profile.role === 'seller' ? 'Seller' : 'Importer'}</T>
        </View>
      </Pressable>
      <IconButton icon={ShieldCheck} label="Business profile and privacy" onPress={() => openModal('security')} size={21} />
    </View>

    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{screen}</KeyboardAvoidingView>

    <View style={[styles.nav, { height: NAV_HEIGHT + insets.bottom, paddingBottom: 6 + insets.bottom }]} accessibilityRole="tablist">
      {TABS.map(({ value, label, icon: Icon }) => {
        const active = tab === value;
        return <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => go(value)} style={[styles.navButton, active && styles.navActive]}>
          <Icon size={22} color={active ? colors.chipText : colors.muted} />
          <T weight={active ? 'bold' : 'regular'} size={12} color={active ? colors.chipText : colors.muted}>{label}</T>
        </Pressable>;
      })}
    </View>

    <Toast message={workspace.notice} bottomInset={insets.bottom} />
    {modal === 'routes' && <Sheet title="Payment routes" onClose={() => openModal(null)}><RoutesSheet workspace={workspace} /></Sheet>}
    <BusinessSheets business={workspace} />
  </View>;
}

export default function App() { return <SafeAreaProvider><Root /></SafeAreaProvider>; }

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.canvas },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
  daylight: { position: 'absolute', top: 0, right: 0, width: '100%', height: 430, opacity: 0.66 },
  topbar: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 9, paddingLeft: 16, paddingRight: 6, backgroundColor: 'rgba(253,251,248,0.94)', borderBottomWidth: 1, borderBottomColor: colors.line },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto', paddingVertical: 6, paddingHorizontal: 9, borderRadius: 12, backgroundColor: colors.chip, minHeight: 44 },
  profileAvatar: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.avatarBg, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', gap: 8, paddingTop: 6, paddingHorizontal: 18, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.paper },
  navButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 14, minHeight: 58 },
  navActive: { backgroundColor: colors.chip },
});
