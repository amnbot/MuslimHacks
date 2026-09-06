import { Text, type TextProps } from 'react-native';
import { colors, fonts } from '../theme';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

export type TProps = TextProps & {
  weight?: Weight;
  serif?: boolean;
  mono?: boolean;
  size?: number;
  color?: string;
  lineHeight?: number;
  /** Tabular numerals keep money columns aligned. */
  tabular?: boolean;
  center?: boolean;
};

const sansByWeight: Record<Weight, string> = {
  regular: fonts.sans,
  medium: fonts.sansMedium,
  semibold: fonts.sansSemi,
  bold: fonts.sansBold,
};

/** Typography primitive: custom fonts need an explicit family per weight in React Native. */
export function T({ weight = 'regular', serif = false, mono = false, size = 14, color = colors.ink, lineHeight, tabular = false, center = false, style, ...rest }: TProps) {
  const fontFamily = mono ? fonts.mono : serif ? (weight === 'regular' ? fonts.serif : fonts.serifMedium) : sansByWeight[weight];
  return (
    <Text
      {...rest}
      style={[
        { fontFamily, fontSize: size, color, lineHeight: lineHeight ?? Math.round(size * 1.6) },
        tabular && { fontVariant: ['tabular-nums'] },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}
