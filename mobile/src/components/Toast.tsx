import { StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, NAV_HEIGHT } from '../theme';
import { T } from './T';

export function Toast({ message, bottomInset }: { message: string; bottomInset: number }) {
  if (!message) return null;
  return (
    <View pointerEvents="none" accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.toast, { bottom: NAV_HEIGHT + bottomInset + 12 }]}>
      <Check size={17} color={colors.toastText} strokeWidth={1.8} />
      <T size={12} color={colors.toastText} style={{ flex: 1 }}>{message}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.toastBg,
    shadowColor: '#271f40',
    shadowOpacity: 0.15,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
});
