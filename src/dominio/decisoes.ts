/**
 * Registro de decisões do gestor.
 *
 * O painel sugere opções, mas quem decide é sempre uma pessoa: este módulo só transforma o
 * formulário preenchido em um registro do diário de decisões. Nada aqui executa medida alguma.
 */
import type { Alerta, Decisao, ImpactoMedida, OpcaoDecisao, TipoDecisao } from './tipos';
import { impactoDaDecisao, type CamposDecisao } from './validacao';

export const ROTULO_TIPO_DECISAO: Record<TipoDecisao, string> = {
  adotar_recomendacao: 'Adotar uma medida sugerida',
  outra_medida: 'Adotar outra medida',
  monitorar: 'Apenas monitorar',
  descartar: 'Descartar o alerta',
};

export const DESCRICAO_TIPO_DECISAO: Record<TipoDecisao, string> = {
  adotar_recomendacao: 'Escolher uma das opções apresentadas pelo painel.',
  outra_medida: 'Registrar uma medida diferente das sugeridas.',
  monitorar: 'Acompanhar a evolução sem agir por enquanto.',
  descartar: 'O alerta não procede (ex.: leitura errada, situação já resolvida).',
};

const MEDIDA_PADRAO: Partial<Record<TipoDecisao, string>> = {
  monitorar: 'Monitorar a evolução, sem medida adicional por enquanto',
  descartar: 'Alerta descartado após análise',
};

/** Texto da medida que vai para o diário, conforme o tipo de decisão. */
export function medidaDaDecisao(campos: CamposDecisao, opcoes: OpcaoDecisao[]): string {
  if (campos.tipo === 'adotar_recomendacao') {
    return opcoes.find((o) => o.id === campos.opcaoId)?.titulo ?? '';
  }
  if (campos.tipo === 'outra_medida') return campos.outraMedida.trim();
  return campos.tipo ? (MEDIDA_PADRAO[campos.tipo] ?? '') : '';
}

/**
 * Monta o registro de decisão a partir do alerta e do formulário já validado.
 * Guarda uma fotografia do alerta: se os dados mudarem amanhã, o diário continua mostrando
 * em que contexto a decisão foi tomada.
 */
export function montarDecisao(alerta: Alerta, campos: CamposDecisao): Omit<Decisao, 'id' | 'registradaEm'> {
  if (!campos.tipo) throw new Error('A decisão precisa de um tipo.');
  const impacto: ImpactoMedida | null = impactoDaDecisao(campos, alerta.opcoes);

  return {
    chaveAlerta: alerta.chave,
    alerta: {
      titulo: alerta.titulo,
      resumo: alerta.resumo,
      nivel: alerta.nivel,
      tema: alerta.tema,
      setorNome: alerta.setorNome,
      confianca: alerta.confianca.pontuacao,
      nivelConfianca: alerta.confianca.nivel,
    },
    tipo: campos.tipo,
    medida: medidaDaDecisao(campos, alerta.opcoes),
    impacto,
    justificativa: campos.justificativa.trim(),
    responsavel: campos.responsavel.trim(),
    // Só faz sentido em medidas de alto impacto; nas demais fica falso.
    validacaoHumanaConfirmada: impacto === 'alto' && campos.validacaoHumana,
  };
}
