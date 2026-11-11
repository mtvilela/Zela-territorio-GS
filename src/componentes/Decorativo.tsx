/**
 * Envolve um desenho puramente decorativo (símbolo da marca, minigráfico) para que leitores
 * de tela o ignorem. Cada plataforma usa uma propriedade diferente para isso.
 */
import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

const OCULTO_PARA_LEITORES: ViewProps =
  Platform.OS === 'web'
    ? { 'aria-hidden': true }
    : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' };

export function Decorativo({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style} {...OCULTO_PARA_LEITORES}>
      {children}
    </View>
  );
}
