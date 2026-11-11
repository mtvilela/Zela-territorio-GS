/**
 * Texto do app: aplica a tipografia e as cores do tema.
 * Todas as telas usam este componente em vez do <Text> puro, o que garante a mesma fonte,
 * os mesmos tamanhos e contraste adequado nos temas claro e escuro.
 */
import { Platform, Text, type TextProps } from 'react-native';

import { tipografia, type VarianteTexto } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';

export type CorTexto = 'texto' | 'secundario' | 'suave' | 'primaria' | 'sobrePrimaria' | 'erro' | 'sucesso';

interface Props extends TextProps {
  variante?: VarianteTexto;
  cor?: CorTexto;
  /** Marca o texto como título para leitores de tela (permite navegar de título em título). */
  cabecalho?: boolean;
  centralizado?: boolean;
}

/** Nível do título para leitores de tela na web (h1, h2, h3). */
const NIVEL_DO_TITULO: Partial<Record<VarianteTexto, number>> = {
  titulo1: 1,
  titulo2: 2,
  titulo3: 3,
};

/** Títulos grandes crescem menos com a fonte ampliada do sistema, para não quebrar o layout. */
const LIMITE_DE_AMPLIACAO: Partial<Record<VarianteTexto, number>> = {
  heroi: 1.3,
  titulo1: 1.5,
  numero: 1.5,
};

export function Texto({
  variante = 'corpo',
  cor = 'texto',
  cabecalho = false,
  centralizado = false,
  style,
  ...resto
}: Props) {
  const { cores } = useTema();
  const corDoTexto = {
    texto: cores.texto,
    secundario: cores.textoSecundario,
    suave: cores.textoSuave,
    primaria: cores.primaria,
    sobrePrimaria: cores.sobrePrimaria,
    erro: cores.erro,
    sucesso: cores.sucesso,
  }[cor];

  // Na web, um título precisa informar o nível; no celular, o papel "header" basta.
  const nivel =
    cabecalho && Platform.OS === 'web' ? ({ 'aria-level': NIVEL_DO_TITULO[variante] ?? 2 } as TextProps) : null;

  return (
    <Text
      accessibilityRole={cabecalho ? 'header' : undefined}
      {...nivel}
      maxFontSizeMultiplier={LIMITE_DE_AMPLIACAO[variante] ?? 2}
      {...resto}
      style={[tipografia[variante], { color: corDoTexto }, centralizado && { textAlign: 'center' }, style]}
    />
  );
}
