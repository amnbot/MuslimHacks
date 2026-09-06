import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { T } from './T';

export type SegmentOption<V extends string> = { value: V; label: string; caption?: string };

/** A labeled radio group that replaces the web app's native <select>. */
export function Segmented<V extends string>({ options, value, onChange, label, stacked = false }: { options: SegmentOption<V>[]; value: V; onChange: (value: V) => void; label: string; stacked?: boolean }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.group, stacked && styles.stacked]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.option, selected && styles.selected, pressed && { opacity: 0.8 }]}
          >
            <T weight={selected ? 'bold' : 'medium'} size={13} color={selected ? colors.greenDeep : colors.muted} lineHeight={18}>{option.label}</T>
            {option.caption && <T size={11} color={selected ? colors.greenText : colors.muted} lineHeight={16}>{option.caption}</T>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.secondaryBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: 4,
  },
  stacked: { flexDirection: 'column' },
  option: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  selected: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.selectedBorder },
});
