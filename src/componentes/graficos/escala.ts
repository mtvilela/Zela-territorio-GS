/**
 * Cálculos de eixo dos gráficos (funções puras, testadas em separado).
 * O eixo vertical sempre usa marcas "redondas" (0, 20, 40…), mais fáceis de ler do que
 * valores quebrados.
 */
import type { Limiares, NivelAlerta } from '@/dominio/tipos';

/** Menor passo "redondo" (1, 2, 2,5, 5 ou 10 × potência de 10) que cobre a amplitude pedida. */
export function passoAgradavel(amplitude: number, quantidadeDeMarcas: number): number {
  if (!(amplitude > 0) || quantidadeDeMarcas < 1) return 1;
  const bruto = amplitude / quantidadeDeMarcas;
  const magnitude = 10 ** Math.floor(Math.log10(bruto));
  const residuo = bruto / magnitude;
  const fator = residuo <= 1 ? 1 : residuo <= 2 ? 2 : residuo <= 2.5 ? 2.5 : residuo <= 5 ? 5 : 10;
  return fator * magnitude;
}

export interface Eixo {
  minimo: number;
  maximo: number;
  marcas: number[];
}

interface OpcoesDeEixo {
  /** Barras e colunas crescem a partir do zero, então o eixo precisa incluí-lo. */
  incluirZero?: boolean;
  quantidadeDeMarcas?: number;
  /** Piso físico (ex.: 0 para grandezas que não ficam negativas). */
  piso?: number;
  /** Teto físico (ex.: 100 para porcentagens de ocupação). */
  teto?: number;
}

/** Eixo com limites e marcas redondas que cobrem todos os valores informados. */
export function calcularEixo(valores: number[], opcoes: OpcoesDeEixo = {}): Eixo {
  const finitos = valores.filter((v) => Number.isFinite(v));
  let menor = finitos.length > 0 ? Math.min(...finitos) : 0;
  let maior = finitos.length > 0 ? Math.max(...finitos) : 1;
  if (opcoes.incluirZero) {
    menor = Math.min(menor, 0);
    maior = Math.max(maior, 0);
  }
  if (menor === maior) {
    // Série constante: abre um pouco de espaço para a linha não colar na borda.
    const folga = Math.abs(menor) > 0 ? Math.abs(menor) * 0.1 : 1;
    menor -= folga;
    maior += folga;
  }

  const passo = passoAgradavel(maior - menor, opcoes.quantidadeDeMarcas ?? 4);
  let minimo = Math.floor(menor / passo) * passo;
  let maximo = Math.ceil(maior / passo) * passo;
  if (opcoes.piso !== undefined) minimo = Math.max(minimo, opcoes.piso);
  if (opcoes.teto !== undefined) maximo = Math.min(maximo, opcoes.teto);
  if (maximo <= minimo) maximo = minimo + passo;

  const marcas: number[] = [];
  const primeira = Math.ceil(minimo / passo - 1e-9) * passo;
  for (let marca = primeira; marca <= maximo + passo * 1e-9; marca += passo) {
    // Arredonda para evitar ruído de ponto flutuante (0,30000000000000004); "+ 0" troca -0 por 0.
    marcas.push(Math.round(marca * 1e6) / 1e6 + 0);
  }
  return { minimo, maximo, marcas };
}

/**
 * Quais limites desenhar no gráfico: o de atenção sempre (é a referência); os outros só quando
 * estão perto dos dados — mostrar um limite muito distante achataria a curva.
 */
export function limitesVisiveis(valores: number[], limiares: Limiares): NivelAlerta[] {
  const finitos = valores.filter((v) => Number.isFinite(v));
  if (finitos.length === 0) return ['atencao'];
  const menor = Math.min(...finitos);
  const maior = Math.max(...finitos);
  // "Perto" = até meia amplitude dos dados para cima ou para baixo.
  const folga = (maior - menor) * 0.5;
  const visiveis: NivelAlerta[] = ['atencao'];
  for (const nivel of ['alerta', 'critico'] as const) {
    if (limiares[nivel] >= menor - folga && limiares[nivel] <= maior + folga) visiveis.push(nivel);
  }
  return visiveis;
}

/** Converte um valor do domínio [minimo, maximo] para a posição em pixels [inicio, fim]. */
export function escalaLinear(minimo: number, maximo: number, inicio: number, fim: number) {
  const amplitude = maximo - minimo || 1;
  return (valor: number): number => inicio + ((valor - minimo) / amplitude) * (fim - inicio);
}

/** Casas decimais necessárias para escrever as marcas do eixo sem repetir rótulos. */
export function casasDasMarcas(marcas: number[]): number {
  for (let casas = 0; casas <= 2; casas++) {
    if (marcas.every((m) => Math.abs(m - Number(m.toFixed(casas))) < 1e-9)) return casas;
  }
  return 2;
}

export interface RotuloPosicionado {
  indice: number;
  texto: string;
  esquerda: number;
  largura: number;
}

/**
 * Escolhe quais rótulos do eixo horizontal cabem sem se sobrepor.
 * Os candidatos vêm em ordem de prioridade: o primeiro sempre entra; os seguintes só entram se
 * não encostarem em um rótulo já colocado. Em telas estreitas, é melhor omitir uma data do
 * que mostrar duas emboladas.
 */
export function posicionarRotulos(
  candidatos: { indice: number; texto: string; centro: number }[],
  larguraTotal: number,
  larguraPorCaractere = 6.6,
  folga = 6,
): RotuloPosicionado[] {
  const colocados: RotuloPosicionado[] = [];
  for (const candidato of candidatos) {
    if (colocados.some((r) => r.indice === candidato.indice)) continue;
    const largura = candidato.texto.length * larguraPorCaractere + 6;
    const esquerda = Math.min(Math.max(candidato.centro - largura / 2, 0), Math.max(0, larguraTotal - largura));
    const sobrepoe = colocados.some(
      (r) => esquerda < r.esquerda + r.largura + folga && r.esquerda < esquerda + largura + folga,
    );
    if (!sobrepoe) colocados.push({ indice: candidato.indice, texto: candidato.texto, esquerda, largura });
  }
  return colocados;
}
