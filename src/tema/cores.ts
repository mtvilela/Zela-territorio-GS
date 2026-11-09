/**
 * Paleta do Zela Território.
 *
 * Decisões:
 * - A cor da marca (verde-petróleo) vem da família do Zela Bairro e aparece só em navegação e ações.
 * - Os DADOS usam azul, para nunca se confundirem com as cores de SITUAÇÃO (verde/amarelo/laranja/vermelho).
 * - As cores de situação são fixas e sempre acompanhadas de ícone + texto: cor nunca é a única pista.
 * - Todos os pares texto/fundo abaixo foram conferidos por cálculo de contraste (WCAG AA: pelo menos
 *   4,5:1), nos temas claro e escuro. O amarelo e o laranja de situação têm contraste baixo sobre
 *   fundo claro: por isso existe o tom `icone`, mais escuro, e eles nunca aparecem sem texto ao lado.
 */
import type { Situacao } from '@/dominio/tipos';

export type EsquemaCor = 'claro' | 'escuro';

export interface CoresSituacao {
  /** Cor das marcas gráficas (barra, preenchimento de medidor, linha de limite). */
  cor: string;
  /** Fundo suave para selos e trilhos de medidor. */
  fundo: string;
  /** Cor do ícone quando desenhado sobre `cor`. */
  sobre: string;
  /** Tom legível para ícones pequenos sobre `fundo` ou sobre a superfície (contraste ≥ 4,5:1). */
  icone: string;
}

export interface Paleta {
  fundo: string;
  superficie: string;
  superficieSuave: string;
  texto: string;
  textoSecundario: string;
  textoSuave: string;
  primaria: string;
  primariaForte: string;
  primariaSuave: string;
  sobrePrimaria: string;
  borda: string;
  bordaControle: string;
  erro: string;
  erroFundo: string;
  sucesso: string;
  sucessoFundo: string;
  /** Série principal dos gráficos (azul). */
  serie1: string;
  serie2: string;
  serie3: string;
  /** Cinza de contexto (dados que não são o foco). */
  deEnfase: string;
  grade: string;
  eixo: string;
  /** Rampa de um só tom para etapas em sequência (aberta → em andamento → resolvida). */
  ordinal: [string, string, string];
  /** Cor do rótulo escrito dentro de cada passo da rampa. */
  sobreOrdinal: [string, string, string];
  situacao: Record<Situacao, CoresSituacao>;
  /** Película atrás de folhas e modais. */
  pelicula: string;
}

const claro: Paleta = {
  fundo: '#f9f9f7',
  superficie: '#fcfcfb',
  superficieSuave: '#f0efec',
  texto: '#0b0b0b',
  textoSecundario: '#52514e',
  textoSuave: '#6b6a65',
  primaria: '#0f766e',
  primariaForte: '#115e59',
  primariaSuave: '#e1f1ee',
  sobrePrimaria: '#ffffff',
  borda: '#e1e0d9',
  bordaControle: '#898781',
  erro: '#b42318',
  erroFundo: '#fdecea',
  sucesso: '#006300',
  sucessoFundo: '#e6f4e6',
  serie1: '#2a78d6',
  serie2: '#eb6834',
  serie3: '#1baf7a',
  deEnfase: '#898781',
  grade: '#e1e0d9',
  eixo: '#c3c2b7',
  ordinal: ['#86b6ef', '#3987e5', '#184f95'],
  sobreOrdinal: ['#0b0b0b', '#ffffff', '#ffffff'],
  situacao: {
    normal: { cor: '#0ca30c', fundo: '#e2f4e2', sobre: '#ffffff', icone: '#006300' },
    atencao: { cor: '#fab219', fundo: '#fdf1d3', sobre: '#0b0b0b', icone: '#8a5a00' },
    alerta: { cor: '#ec835a', fundo: '#fce8de', sobre: '#0b0b0b', icone: '#a8431a' },
    critico: { cor: '#d03b3b', fundo: '#fae1e1', sobre: '#ffffff', icone: '#a52a2a' },
  },
  pelicula: 'rgba(11, 11, 11, 0.45)',
};

const escuro: Paleta = {
  fundo: '#0d0d0d',
  superficie: '#1a1a19',
  superficieSuave: '#2c2c2a',
  texto: '#f0efec',
  textoSecundario: '#c3c2b7',
  textoSuave: '#a3a199',
  primaria: '#4cc4b4',
  primariaForte: '#7fdccf',
  primariaSuave: '#12332f',
  sobrePrimaria: '#04221f',
  borda: '#2c2c2a',
  bordaControle: '#898781',
  erro: '#ff8a80',
  erroFundo: '#3a1716',
  sucesso: '#5fd35f',
  sucessoFundo: '#10301a',
  serie1: '#3987e5',
  serie2: '#d95926',
  serie3: '#199e70',
  deEnfase: '#7a7872',
  grade: '#2c2c2a',
  eixo: '#383835',
  ordinal: ['#9ec5f4', '#3987e5', '#184f95'],
  sobreOrdinal: ['#0b0b0b', '#ffffff', '#ffffff'],
  situacao: {
    normal: { cor: '#0ca30c', fundo: '#10301a', sobre: '#ffffff', icone: '#5fd35f' },
    atencao: { cor: '#fab219', fundo: '#3a2c08', sobre: '#0b0b0b', icone: '#fab219' },
    alerta: { cor: '#ec835a', fundo: '#3f2216', sobre: '#0b0b0b', icone: '#f09a78' },
    critico: { cor: '#d03b3b', fundo: '#401a1a', sobre: '#ffffff', icone: '#f08a8a' },
  },
  pelicula: 'rgba(0, 0, 0, 0.6)',
};

export const paletas: Record<EsquemaCor, Paleta> = { claro, escuro };

/** Aplica transparência a uma cor hexadecimal (#rrggbb) — usado nas áreas e faixas dos gráficos. */
export function comOpacidade(hex: string, opacidade: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacidade})`;
}
