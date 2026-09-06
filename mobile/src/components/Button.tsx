import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius } from '../theme';
import { T } from './T';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

function BaseButton({ label, onPress, disabled, icon: Icon, iconPosition = 'right', fullWidth, style, accessibilityLabel, background, border, color }: ButtonProps & { background: string; border: string; color: string }) {
  const iconNode = Icon ? <Icon size={17} color={color} strokeWidth={1.8} /> : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, { backgroundColor: background, borderColor: border }, fullWidth && styles.fullWidth, disabled && styles.disabled, pressed && !disabled && styles.pressed, style]}
    >
      {iconPosition === 'left' && iconNode}
      <T weight="semibold" size={15} color={color} lineHeight={22}>{label}</T>
      {iconPosition === 'right' && iconNode}
    </Pressable>
  );
}

export function PrimaryButton(props: ButtonProps) {
  return <BaseButton {...props} background={colors.forest} border="transparent" color={colors.paper} />;
}

export function SecondaryButton(props: ButtonProps) {
  return <BaseButton {...props} background={colors.secondaryBg} border={colors.secondaryBorder} color={colors.secondaryText} />;
}

export function TextButton({ label, onPress, disabled, icon: Icon, iconPosition = 'left', style, size = 12, center = false }: ButtonProps & { size?: number; center?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.text, center && styles.center, disabled && styles.disabled, pressed && !disabled && { opacity: 0.7 }, style]}
    >
      {iconPosition === 'left' && Icon && <Icon size={size + 3} color={colors.green} strokeWidth={1.8} />}
      <T weight="semibold" size={size} color={colors.green}>{label}</T>
      {iconPosition === 'right' && Icon && <Icon size={size + 3} color={colors.green} strokeWidth={1.8} />}
    </Pressable>
  );
}

export function IconButton({ icon: Icon, label, onPress, size = 21, color = colors.ink, style }: { icon: LucideIcon; label: string; onPress: () => void; size?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.icon, pressed && { backgroundColor: '#f1eaf7' }, style]}
    >
      <Icon size={size} color={color} strokeWidth={1.7} />
    </Pressable>
  );
}

/** A pressable card region with the standard press feedback. */
export function Card({ children, onPress, style, accessibilityLabel, accessibilityRole = 'button', accessibilityState }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; accessibilityLabel?: string; accessibilityRole?: 'button' | 'radio'; accessibilityState?: { selected?: boolean; checked?: boolean } }) {
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable accessibilityRole={accessibilityRole} accessibilityLabel={accessibilityLabel} accessibilityState={accessibilityState} onPress={onPress} style={({ pressed }) => [style, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: radius.control,
    borderWidth: 1,
  },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.88 },
  text: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 44,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  center: { alignSelf: 'center', justifyContent: 'center' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
