/**
 * Ícone do app (Material Community Icons, já incluídos no Expo).
 * Por padrão é decorativo: fica invisível para leitores de tela, porque o texto ao lado já
 * diz o que ele significa. Quando o ícone é a única informação, passe `rotulo`.
 */
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import type { Situacao, TemaId } from '@/dominio/tipos';
import { useTema } from '@/tema/useTema';

export type NomeIcone = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  nome: NomeIcone;
  tamanho?: number;
  cor?: string;
  rotulo?: string;
  style?: StyleProp<TextStyle>;
}

export function Icone({ nome, tamanho = 20, cor, rotulo, style }: Props) {
  const { cores } = useTema();
  const decorativo = !rotulo;
  return (
    <MaterialCommunityIcons
      name={nome}
      size={tamanho}
      color={cor ?? cores.textoSecundario}
      style={style}
      accessible={!decorativo}
      accessibilityRole={decorativo ? undefined : 'image'}
      accessibilityLabel={rotulo}
      accessibilityElementsHidden={decorativo}
      importantForAccessibility={decorativo ? 'no' : 'yes'}
      aria-hidden={decorativo}
    />
  );
}

/** Um formato diferente para cada situação: a cor nunca é a única pista. */
export const ICONE_DA_SITUACAO: Record<Situacao, NomeIcone> = {
  normal: 'check-circle',
  atencao: 'alert',
  alerta: 'alert-rhombus',
  critico: 'alert-octagon',
};

export const ICONE_DO_TEMA: Record<TemaId, NomeIcone> = {
  clima: 'weather-pouring',
  agua: 'water-outline',
  energia: 'lightning-bolt-outline',
  residuos: 'trash-can-outline',
  servicos: 'account-hard-hat-outline',
};
