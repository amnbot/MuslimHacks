import { useEffect } from 'react';
import { BackHandler, Image, Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
// Per-weight imports keep the unused weights out of the bundle.
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Lora_400Regular } from '@expo-google-fonts/lora/400Regular';
import { Lora_500Medium } from '@expo-google-fonts/lora/500Medium';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeftRight, CircleQuestionMark, MessageSquare, RotateCcw } from 'lucide-react-native';
import { colors, NAV_HEIGHT, TOPBAR_HEIGHT } from './src/theme';
import { T } from './src/components/T';
import { IconButton } from './src/components/Button';
import { Toast } from './src/components/Toast';
import { useDeal, type Screen } from './src/state/useDeal';
import { ChatScreen } from './src/screens/ChatScreen';
import { FinanceScreen } from './src/screens/FinanceScreen';
import { GuideSheet } from './src/modals/GuideSheet';
import { SourcesSheet } from './src/modals/SourcesSheet';
import { EditInvoiceSheet } from './src/modals/EditInvoiceSheet';
import { VerifySheet } from './src/modals/VerifySheet';
import { UsdcSheet } from './src/modals/UsdcSheet';
import { ConfirmSheet } from './src/modals/ConfirmSheet';

function NavButton({ label, icon: Icon, active, onPress, badge = false }: { label: string; icon: typeof MessageSquare; active: boolean; onPress: () => void; badge?: boolean }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={onPress} style={[styles.navButton, active && styles.navActive]}>
      <View>
        <Icon size={22} color={active ? colors.chipText : '#777080'} strokeWidth={1.7} />
        {badge && <View style={styles.navDot} />}
      </View>
      <T weight={active ? 'bold' : 'regular'} size={12} lineHeight={16} color={active ? colors.chipText : '#777080'}>{label}</T>
    </Pressable>
  );
}

function Root() {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Lora_400Regular, Lora_500Medium });
  const insets = useSafeAreaInsets();
  const deal = useDeal();
  const { screen, setScreen, modal, setModal, agreement, sealed } = deal;

  // Android back: close an open sheet, then return from Finance to Chat, then exit.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (modal) { setModal(null); return true; }
      if (screen === 'finance') { setScreen('chat'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [modal, screen, setModal, setScreen]);

  if (!fontsLoaded) return <View style={styles.app} />;

  const goTo = (next: Screen) => setScreen(next);

  return (
    <View style={[styles.app, { paddingTop: insets.top }]}>
      <Image source={require('./assets/mashrabiya-daylight.png')} resizeMode="cover" style={styles.daylight} accessibilityIgnoresInvertColors />
      <StatusBar style="dark" />
      <View style={styles.topbar}>
        <View style={styles.wordmark}>
          <T serif weight="medium" size={22} lineHeight={32} color="#241d3e" style={{ letterSpacing: 1.2 }}>SANAD</T>
          <T serif size={25} lineHeight={32} color="#241d3e">سند</T>
        </View>
        <View style={styles.pill}>
          <View style={styles.dot} />
          <T weight="medium" size={10} lineHeight={14} color="#6b607a">Local prototype</T>
        </View>
        <View style={{ flexDirection: 'row', marginLeft: 'auto' }}>
          <IconButton icon={CircleQuestionMark} label="Demo guide" onPress={() => setModal('guide')} />
          <IconButton icon={RotateCcw} label="Reset demo" onPress={() => setModal('reset')} size={19} />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {screen === 'chat' ? <ChatScreen deal={deal} /> : <FinanceScreen deal={deal} />}
      </View>

      <View style={[styles.nav, { height: NAV_HEIGHT + insets.bottom, paddingBottom: 6 + insets.bottom }]} accessibilityRole="tablist">
        <NavButton label="Chat" icon={MessageSquare} active={screen === 'chat'} onPress={() => goTo('chat')} />
        <NavButton label="Finance" icon={ArrowLeftRight} active={screen === 'finance'} onPress={() => goTo('finance')} badge={!!agreement && !sealed} />
      </View>

      <Toast message={deal.notice} bottomInset={insets.bottom} />

      {modal === 'guide' && <GuideSheet onClose={() => setModal(null)} />}
      {modal === 'sources' && <SourcesSheet onClose={() => setModal(null)} />}
      {modal === 'edit' && <EditInvoiceSheet deal={deal} onClose={() => setModal(null)} />}
      {modal === 'verify' && <VerifySheet deal={deal} onClose={() => setModal(null)} />}
      {modal === 'usdc' && <UsdcSheet deal={deal} onClose={() => setModal(null)} />}
      {(modal === 'reset' || modal === 'revise') && <ConfirmSheet kind={modal} onClose={() => setModal(null)} onConfirm={modal === 'reset' ? deal.reset : deal.revise} />}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.canvas, overflow: 'hidden' },
  daylight: { position: 'absolute', top: 0, right: 0, width: '100%', height: 430, opacity: 0.66 },
  topbar: {
    height: TOPBAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
    paddingRight: 8,
    backgroundColor: 'rgba(253,251,248,0.88)',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 9, backgroundColor: '#f5f0fa', borderRadius: 999, borderWidth: 1, borderColor: '#e8dff0' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#20b9a0' },
  nav: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 6,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: 'rgba(253,251,248,0.96)',
  },
  navButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 14, minHeight: 58 },
  navActive: { backgroundColor: colors.chip },
  navDot: { position: 'absolute', right: -5, top: -1, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.navBg },
});
