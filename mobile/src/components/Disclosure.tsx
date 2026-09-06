import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronDown, type LucideIcon } from 'lucide-react-native';
import { colors } from '../theme';
import { T } from './T';

/** Stands in for the web app's <details>/<summary> progressive disclosure. */
export function Disclosure({ label, icon: Icon, hint, children, size = 14, weight = 'semibold', style, contentStyle }: {
  label: string;
  icon?: LucideIcon;
  hint?: string;
  children: ReactNode;
  size?: number;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={label}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.summary, pressed && { opacity: 0.7 }]}
      >
        <View style={styles.labelRow}>
          {Icon && <Icon size={16} color={colors.ink} strokeWidth={1.7} />}
          <T weight={weight} size={size} style={{ flexShrink: 1 }}>{label}</T>
        </View>
        <View style={styles.labelRow}>
          {hint && <T size={11} color={colors.greenText}>{hint}</T>}
          <ChevronDown size={16} color={colors.greenText} strokeWidth={1.8} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
        </View>
      </Pressable>
      {open && <View style={contentStyle}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
});
