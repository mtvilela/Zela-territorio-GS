/**
 * Medidas compartilhadas: espaçamento, raios, tipografia e áreas de toque.
 * Mudar um valor aqui muda o app inteiro, o que mantém a identidade visual coerente.
 */
import type { TextStyle } from 'react-native';

export const esp = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const raio = {
  sm: 6,
  md: 10,
  lg: 14,
  pilula: 999,
} as const;

/** Área mínima de toque recomendada (48 dp no Android, 44 pt no iOS). */
export const TOQUE_MINIMO = 48;

/** Largura máxima do conteúdo, para o layout não esticar em tablets e na web. */
export const LARGURA_MAXIMA = 720;

/**
 * Atkinson Hyperlegible Next: tipografia criada pelo Braille Institute para leitores com baixa
 * visão (letras e números difíceis de confundir, como 0/O e 1/l/I). Cada peso é um arquivo de fonte.
 */
export const fontes = {
  regular: 'AtkinsonHyperlegibleNext_400Regular',
  media: 'AtkinsonHyperlegibleNext_500Medium',
  semibold: 'AtkinsonHyperlegibleNext_600SemiBold',
  bold: 'AtkinsonHyperlegibleNext_700Bold',
} as const;

export type VarianteTexto =
  'heroi' | 'titulo1' | 'titulo2' | 'titulo3' | 'numero' | 'corpo' | 'corpoForte' | 'rotulo' | 'legenda' | 'micro';

export const tipografia: Record<VarianteTexto, TextStyle> = {
  heroi: { fontFamily: fontes.bold, fontSize: 48, lineHeight: 54 },
  titulo1: { fontFamily: fontes.bold, fontSize: 26, lineHeight: 32 },
  titulo2: { fontFamily: fontes.bold, fontSize: 20, lineHeight: 26 },
  titulo3: { fontFamily: fontes.semibold, fontSize: 17, lineHeight: 23 },
  numero: { fontFamily: fontes.bold, fontSize: 28, lineHeight: 34 },
  corpo: { fontFamily: fontes.regular, fontSize: 16, lineHeight: 23 },
  corpoForte: { fontFamily: fontes.semibold, fontSize: 16, lineHeight: 23 },
  rotulo: { fontFamily: fontes.media, fontSize: 14, lineHeight: 20 },
  legenda: { fontFamily: fontes.regular, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: fontes.media, fontSize: 12, lineHeight: 16 },
};
