/**
 * Nível de confiança de um alerta.
 *
 * A confiança é uma pontuação transparente: começa em 35 e cada fator soma ou subtrai pontos.
 * Os fatores são devolvidos junto com o resultado, para a tela mostrar POR QUE a confiança
 * é alta, média ou baixa. A pontuação fica sempre entre 5 e 95: nenhuma previsão é certa.
 *
 * Importante: a confiança mede a consistência dos dados e do método, não a "verdade" do mundo.
 * Um alerta de confiança alta ainda pode errar — por isso a decisão continua com as pessoas.
 */
import { formatarNumero } from '@/utils/numeros';

import type { Confianca, FatorConfianca, NivelConfianca, TipoAlerta } from './tipos';

export const PONTUACAO_BASE = 35;
export const PONTUACAO_MINIMA = 5;
export const PONTUACAO_MAXIMA = 95;

export const ROTULO_CONFIANCA: Record<NivelConfianca, string> = {
  baixa: 'Confiança baixa',
  media: 'Confiança média',
  alta: 'Confiança alta',
};

export function nivelDeConfianca(pontuacao: number): NivelConfianca {
  if (pontuacao >= 70) return 'alta';
  if (pontuacao >= 45) return 'media';
  return 'baixa';
}

function montar(fatores: FatorConfianca[]): Confianca {
  const soma = fatores.reduce((total, f) => total + f.efeito, PONTUACAO_BASE);
  const pontuacao = Math.round(Math.min(PONTUACAO_MAXIMA, Math.max(PONTUACAO_MINIMA, soma)));
  return { pontuacao, nivel: nivelDeConfianca(pontuacao), fatores };
}

export interface EntradaConfiancaTendencia {
  /** Quantidade total de leituras disponíveis no histórico. */
  pontosNoHistorico: number;
  metodo: 'tendencia' | 'media_movel';
  r2: number;
  /** Desvio-padrão dividido pela média dos valores recentes (0,05 = 5%). */
  coeficienteVariacao: number;
  tipo: TipoAlerta;
  diasAte: number;
  /** Verdadeiro se até a ponta mais favorável da faixa provável ultrapassa o limite. */
  faixaInteiraAlemDoLimite: boolean;
}

/** Confiança de um alerta calculado pelo próprio app (tendência ou média móvel). */
export function confiancaTendencia(e: EntradaConfiancaTendencia): Confianca {
  const fatores: FatorConfianca[] = [];

  if (e.pontosNoHistorico >= 28) {
    fatores.push({ descricao: `${e.pontosNoHistorico} dias de histórico disponíveis`, efeito: 10 });
  } else if (e.pontosNoHistorico >= 14) {
    fatores.push({ descricao: `${e.pontosNoHistorico} dias de histórico disponíveis`, efeito: 4 });
  } else {
    fatores.push({ descricao: `Histórico curto (${e.pontosNoHistorico} leituras)`, efeito: -12 });
  }

  if (e.metodo === 'tendencia') {
    const r2 = formatarNumero(e.r2, 2);
    if (e.r2 >= 0.8) {
      fatores.push({ descricao: `Tendência muito consistente (R² = ${r2})`, efeito: 18 });
    } else if (e.r2 >= 0.6) {
      fatores.push({ descricao: `Tendência consistente (R² = ${r2})`, efeito: 10 });
    } else {
      fatores.push({ descricao: `Tendência fraca (R² = ${r2})`, efeito: 2 });
    }
  } else {
    const variacao = formatarNumero(e.coeficienteVariacao * 100, 0);
    if (e.coeficienteVariacao <= 0.05) {
      fatores.push({ descricao: `Valores estáveis nos últimos dias (variação de ${variacao}%)`, efeito: 10 });
    } else if (e.coeficienteVariacao <= 0.1) {
      fatores.push({ descricao: `Valores pouco variáveis (variação de ${variacao}%)`, efeito: 4 });
    } else {
      fatores.push({ descricao: `Valores oscilando bastante (variação de ${variacao}%)`, efeito: -8 });
    }
  }

  if (e.tipo === 'em_curso') {
    fatores.push({ descricao: 'O limite já foi ultrapassado nas leituras observadas', efeito: 18 });
  } else if (e.diasAte <= 2) {
    fatores.push({ descricao: 'Cruzamento previsto para os próximos 2 dias', efeito: 14 });
  } else if (e.diasAte <= 4) {
    fatores.push({ descricao: 'Cruzamento previsto em 3 a 4 dias', efeito: 7 });
  } else {
    fatores.push({
      descricao: 'Cruzamento previsto só em 5 dias ou mais: projeções distantes erram mais',
      efeito: -5,
    });
  }

  if (e.faixaInteiraAlemDoLimite) {
    fatores.push({
      descricao: 'Mesmo na ponta mais favorável da faixa provável, o limite é ultrapassado',
      efeito: 12,
    });
  } else {
    fatores.push({
      descricao: 'Na ponta mais favorável da faixa provável, o limite não é ultrapassado',
      efeito: -8,
    });
  }

  return montar(fatores);
}

export interface EntradaConfiancaClima {
  diasAte: number;
  /** Probabilidade de precipitação informada pelo modelo (só para chuva). */
  probabilidade: number | null;
  /** Valor previsto dividido pelo limite (1,25 = 25% acima). */
  razaoSobreLimite: number;
  /** Dias seguidos acima do limite (só para calor). */
  diasConsecutivos?: number;
}

/** Confiança de um alerta baseado na previsão do modelo meteorológico. */
export function confiancaClima(e: EntradaConfiancaClima): Confianca {
  const fatores: FatorConfianca[] = [];

  if (e.diasAte <= 1) {
    fatores.push({ descricao: 'Previsão para as próximas 48 horas', efeito: 25 });
  } else if (e.diasAte <= 3) {
    fatores.push({ descricao: 'Previsão para daqui a 2 ou 3 dias', efeito: 12 });
  } else if (e.diasAte <= 5) {
    fatores.push({ descricao: 'Previsão para daqui a 4 ou 5 dias: pode mudar até lá', efeito: 0 });
  } else {
    fatores.push({
      descricao: 'Previsão para daqui a 6 dias ou mais: previsões longas erram mais',
      efeito: -10,
    });
  }

  if (e.probabilidade !== null) {
    const p = formatarNumero(e.probabilidade, 0);
    if (e.probabilidade >= 80) {
      fatores.push({ descricao: `Probabilidade de chuva de ${p}% segundo o modelo`, efeito: 20 });
    } else if (e.probabilidade >= 60) {
      fatores.push({ descricao: `Probabilidade de chuva de ${p}% segundo o modelo`, efeito: 10 });
    } else if (e.probabilidade >= 40) {
      fatores.push({ descricao: `Probabilidade de chuva de ${p}%: pode não chover`, efeito: 0 });
    } else {
      fatores.push({ descricao: `Probabilidade de chuva de apenas ${p}%`, efeito: -12 });
    }
  }

  if (e.razaoSobreLimite >= 1.25) {
    fatores.push({ descricao: 'Valor previsto bem acima do limite (25% ou mais)', efeito: 10 });
  } else if (e.razaoSobreLimite < 1.1) {
    fatores.push({
      descricao: 'Valor previsto muito próximo do limite: uma pequena mudança cancela o alerta',
      efeito: -8,
    });
  }

  if (e.diasConsecutivos !== undefined && e.diasConsecutivos >= 2) {
    fatores.push({ descricao: `${e.diasConsecutivos} dias seguidos acima do limite`, efeito: 8 });
  }

  return montar(fatores);
}
