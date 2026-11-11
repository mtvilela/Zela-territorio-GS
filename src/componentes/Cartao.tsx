/**
 * Cartão: a superfície básica onde ficam indicadores, alertas e formulários.
 * Quando recebe `aoPressionar`, vira um botão acessível (com papel, rótulo e dica).
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Situacao } from '@/dominio/tipos';
import { esp, raio } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';

interface Props {
  children: ReactNode;
  aoPressionar?: () => void;
  /** Texto lido pelo leitor de tela quando o cartão é pressionável. */
  rotuloAcessivel?: string;
  dicaAcessivel?: string;
  /** Desenha uma faixa lateral na cor da situação (sempre junto de um selo com texto). */
  faixa?: Situacao;
  /** Remove o preenchimento interno (para conteúdo que encosta nas bordas). */
  semPreenchimento?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Cartao({
  children,
  aoPressionar,
  rotuloAcessivel,
  dicaAcessivel,
  faixa,
  semPreenchimento = false,
  style,
  testID,
}: Props) {
  const { cores } = useTema();

  const base: StyleProp<ViewStyle> = [
    estilos.cartao,
    { backgroundColor: cores.superficie, borderColor: cores.borda },
    !semPreenchimento && estilos.preenchimento,
    faixa && { borderLeftWidth: 5, borderLeftColor: cores.situacao[faixa].cor },
    style,
  ];

  if (!aoPressionar) {
    return (
      <View style={base} testID={testID}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      onPress={aoPressionar}
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel}
      accessibilityHint={dicaAcessivel}
      testID={testID}
      style={({ pressed }) => [base, pressed && { backgroundColor: cores.superficieSuave }]}>
      {children}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    borderRadius: raio.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  preenchimento: {
    padding: esp.lg,
  },
});
