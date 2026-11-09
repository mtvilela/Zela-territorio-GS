/**
 * Limiares: os valores que separam "normal" de "atenção", "alerta" e "crítico".
 * São configuráveis pelo gestor — quem conhece o território calibra o painel.
 */
import type { Limiares, NivelAlerta, Sentido, Situacao } from './tipos';

export const ORDEM_SITUACAO: Record<Situacao, number> = {
  normal: 0,
  atencao: 1,
  alerta: 2,
  critico: 3,
};

export const NIVEIS_ALERTA: NivelAlerta[] = ['atencao', 'alerta', 'critico'];

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  normal: 'Normal',
  atencao: 'Atenção',
  alerta: 'Alerta',
  critico: 'Crítico',
};

/** Classifica um valor de acordo com os limiares e o sentido do indicador. */
export function classificar(valor: number, limiares: Limiares, sentido: Sentido): Situacao {
  if (sentido === 'maior_pior') {
    if (valor >= limiares.critico) return 'critico';
    if (valor >= limiares.alerta) return 'alerta';
    if (valor >= limiares.atencao) return 'atencao';
    return 'normal';
  }
  if (valor <= limiares.critico) return 'critico';
  if (valor <= limiares.alerta) return 'alerta';
  if (valor <= limiares.atencao) return 'atencao';
  return 'normal';
}

/** Retorna a situação mais grave entre duas. */
export function piorSituacao(a: Situacao, b: Situacao): Situacao {
  return ORDEM_SITUACAO[a] >= ORDEM_SITUACAO[b] ? a : b;
}

export function ehAlerta(situacao: Situacao): situacao is NivelAlerta {
  return situacao !== 'normal';
}

/**
 * Confere se os três limiares estão na faixa permitida e na ordem certa.
 * Retorna a mensagem de erro, ou `null` quando está tudo certo.
 */
export function validarLimiares(
  limiares: Limiares,
  sentido: Sentido,
  faixa: { minimo: number; maximo: number },
): string | null {
  const valores = [limiares.atencao, limiares.alerta, limiares.critico];
  if (valores.some((v) => !Number.isFinite(v))) {
    return 'Informe um número em cada limiar.';
  }
  if (valores.some((v) => v < faixa.minimo || v > faixa.maximo)) {
    return `Os limiares devem ficar entre ${faixa.minimo} e ${faixa.maximo}.`;
  }
  if (sentido === 'maior_pior') {
    if (!(limiares.atencao < limiares.alerta && limiares.alerta < limiares.critico)) {
      return 'Use valores crescentes: atenção menor que alerta, e alerta menor que crítico.';
    }
  } else if (!(limiares.atencao > limiares.alerta && limiares.alerta > limiares.critico)) {
    return 'Use valores decrescentes: atenção maior que alerta, e alerta maior que crítico.';
  }
  return null;
}
