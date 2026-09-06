import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts } from '../theme';
import { T } from './T';

export function Field({ label, style, editable = true, ...rest }: TextInputProps & { label: string }) {
  return (
    <View style={[styles.wrap, style]}>
      <T weight="semibold" size={12} color={colors.greenText}>{label}</T>
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        placeholderTextColor="#817a86"
        {...rest}
        style={[styles.input, !editable && styles.disabled]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, flex: 1 },
  input: {
    minHeight: 49,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
  },
  disabled: { opacity: 0.6 },
});
