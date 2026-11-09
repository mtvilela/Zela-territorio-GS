/**
 * Previsão simples e explicável para séries diárias.
 *
 * São os mesmos dois métodos do nosso projeto de POO (Territory Predictive Insights):
 *  1. TENDÊNCIA: reta ajustada por mínimos quadrados aos últimos 14 dias, projetada para frente.
 *  2. MÉDIA MÓVEL: média dos últimos 7 dias, repetida para frente.
 *
 * Regra de escolha ("quando se calar"): só extrapolamos a tendência quando ela é consistente
 * (R² ≥ 0,3). Se os pontos não seguem uma reta, projetar a inclinação seria inventar um padrão
 * que os dados não mostram — então usamos a média recente. Com menos de 7 leituras, não há previsão.
 */
import { somarDias } from '@/utils/datas';
import { limitar } from '@/utils/numeros';

import type { AjusteTendencia, PontoPrevisto, PontoSerie } from './tipos';

export const HORIZONTE_PADRAO = 7;
export const JANELA_TENDENCIA = 14;
export const JANELA_MEDIA_MOVEL = 7;
export const MINIMO_PONTOS = 7;
export const R2_MINIMO_TENDENCIA = 0.3;

/** Quantil da normal para um intervalo de 80% (10% de cada lado). */
const Z_80 = 1.2816;

export function media(valores: number[]): number {
  if (valores.length === 0) throw new Error('Não é possível calcular a média de uma lista vazia.');
  return valores.reduce((soma, v) => soma + v, 0) / valores.length;
}

/** Desvio-padrão amostral (divide por n − 1). Zero quando há menos de 2 valores. */
export function desvioPadrao(valores: number[]): number {
  if (valores.length < 2) return 0;
  const m = media(valores);
  const somaQuadrados = valores.reduce((soma, v) => soma + (v - m) ** 2, 0);
  return Math.sqrt(somaQuadrados / (valores.length - 1));
}

/** Média dos últimos `janela` valores (ou de todos, se houver menos). */
export function mediaMovel(valores: number[], janela: number): number {
  if (janela < 1) throw new Error('A janela da média móvel deve ser de pelo menos 1 dia.');
  return media(valores.slice(-janela));
}

export interface Regressao {
  inclinacao: number;
  intercepto: number;
  r2: number;
  /** Desvio-padrão dos resíduos (o "erro típico" da reta). */
  desvioResidual: number;
  n: number;
  /** Soma dos quadrados de x em torno da média — usada no intervalo de previsão. */
  sxx: number;
  mediaX: number;
}

/** Ajusta y = intercepto + inclinação · x por mínimos quadrados, com x = 0, 1, 2, … */
export function regressaoLinear(valores: number[]): Regressao {
  const n = valores.length;
  if (n < 2) throw new Error('São necessários pelo menos 2 pontos para ajustar uma tendência.');

  const mediaX = (n - 1) / 2;
  const mediaY = media(valores);
  let sxx = 0;
  let sxy = 0;
  for (let x = 0; x < n; x++) {
    sxx += (x - mediaX) ** 2;
    sxy += (x - mediaX) * (valores[x] - mediaY);
  }
  const inclinacao = sxy / sxx;
  const intercepto = mediaY - inclinacao * mediaX;

  let somaResiduos = 0;
  let somaTotal = 0;
  for (let x = 0; x < n; x++) {
    somaResiduos += (valores[x] - (intercepto + inclinacao * x)) ** 2;
    somaTotal += (valores[x] - mediaY) ** 2;
  }
  // Série constante: não há variação a explicar, então não há "tendência".
  const r2 = somaTotal === 0 ? 0 : Math.max(0, 1 - somaResiduos / somaTotal);
  const desvioResidual = n > 2 ? Math.sqrt(somaResiduos / (n - 2)) : 0;

  return { inclinacao, intercepto, r2, desvioResidual, n, sxx, mediaX };
}

export interface OpcoesPrevisao {
  horizonte?: number;
  janela?: number;
  /** Limites físicos do indicador (ex.: 0 a 100 para porcentagens). */
  minimo?: number;
  maximo?: number;
}

export interface ResultadoPrevisao {
  metodo: 'tendencia' | 'media_movel';
  pontos: PontoPrevisto[];
  ajuste: AjusteTendencia;
}

/**
 * Projeta os próximos dias de uma série diária.
 * Retorna `null` quando não há leituras suficientes — o painel prefere não prever a "chutar".
 */
export function preverSerie(historico: PontoSerie[], opcoes: OpcoesPrevisao = {}): ResultadoPrevisao | null {
  const horizonte = opcoes.horizonte ?? HORIZONTE_PADRAO;
  const janela = opcoes.janela ?? JANELA_TENDENCIA;
  const minimo = opcoes.minimo ?? -Infinity;
  const maximo = opcoes.maximo ?? Infinity;

  if (historico.length < MINIMO_PONTOS) return null;

  const ordenado = [...historico].sort((a, b) => a.data.localeCompare(b.data));
  const recorte = ordenado.slice(-janela);
  const valores = recorte.map((p) => p.valor);
  const ultimaData = recorte[recorte.length - 1].data;

  const reg = regressaoLinear(valores);
  const mediaRecente = mediaMovel(valores, JANELA_MEDIA_MOVEL);
  const usarTendencia = reg.r2 >= R2_MINIMO_TENDENCIA;
  const n = reg.n;

  const pontos: PontoPrevisto[] = [];
  for (let h = 1; h <= horizonte; h++) {
    let valor: number;
    let erroPadrao: number;

    if (usarTendencia) {
      const x = n - 1 + h;
      valor = reg.intercepto + reg.inclinacao * x;
      // Intervalo de previsão da regressão: cresce quanto mais longe do centro dos dados.
      erroPadrao = reg.desvioResidual * Math.sqrt(1 + 1 / n + (x - reg.mediaX) ** 2 / reg.sxx);
    } else {
      valor = mediaRecente;
      erroPadrao = desvioPadrao(valores) * Math.sqrt(1 + 1 / n);
    }

    pontos.push({
      data: somarDias(ultimaData, h),
      valor: limitar(valor, minimo, maximo),
      inferior: limitar(valor - Z_80 * erroPadrao, minimo, maximo),
      superior: limitar(valor + Z_80 * erroPadrao, minimo, maximo),
    });
  }

  return {
    metodo: usarTendencia ? 'tendencia' : 'media_movel',
    pontos,
    ajuste: {
      inclinacao: usarTendencia ? reg.inclinacao : 0,
      intercepto: reg.intercepto,
      r2: reg.r2,
      desvioResidual: reg.desvioResidual,
      pontosUsados: n,
      mediaRecente,
    },
  };
}
