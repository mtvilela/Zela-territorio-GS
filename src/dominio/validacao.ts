/**
 * Validação dos formulários. Funções puras: recebem os campos e devolvem as mensagens de erro,
 * o que permite testar as regras sem montar telas.
 *
 * As regras da solicitação (tamanhos, categorias, prioridades) são as mesmas do Zela Bairro.
 */
import { lerNumero } from '@/utils/numeros';

import { validarLimiares } from './limiares';
import { mensagemDadosPessoais } from './privacidade';
import type {
  CategoriaDemanda,
  DefinicaoIndicador,
  ImpactoMedida,
  Limiares,
  OpcaoDecisao,
  PrioridadeDemanda,
  TipoDecisao,
} from './tipos';

export const LIMITES = {
  titulo: { minimo: 5, maximo: 80 },
  descricao: { minimo: 10, maximo: 500 },
  justificativa: { minimo: 20, minimoAltoImpacto: 40, maximo: 500 },
  responsavel: { minimo: 3, maximo: 60 },
  medida: { minimo: 5, maximo: 120 },
  busca: { minimo: 3, maximo: 60 },
} as const;

export const CATEGORIAS: CategoriaDemanda[] = [
  'iluminacao',
  'buraco',
  'lixo',
  'calcada',
  'alagamento',
  'arvore',
  'outro',
];

export const PRIORIDADES: PrioridadeDemanda[] = ['baixa', 'media', 'alta'];

export const TIPOS_DECISAO: TipoDecisao[] = ['adotar_recomendacao', 'outra_medida', 'monitorar', 'descartar'];

/** Verdadeiro se o objeto de erros tem pelo menos uma mensagem. */
export function temErros(erros: object): boolean {
  return Object.values(erros).some((mensagem) => Boolean(mensagem));
}

/** Confere tamanho e ausência de dados pessoais em um texto obrigatório. */
function validarTexto(valor: string, nome: string, minimo: number, maximo: number): string | undefined {
  const texto = valor.trim();
  if (texto.length === 0) return `Informe ${nome}.`;
  if (texto.length < minimo) return `Use pelo menos ${minimo} caracteres (faltam ${minimo - texto.length}).`;
  if (texto.length > maximo) return `Use no máximo ${maximo} caracteres.`;
  return mensagemDadosPessoais(texto) ?? undefined;
}

// ---------------------------------------------------------------------------------------------
// Solicitação de serviço
// ---------------------------------------------------------------------------------------------

export interface CamposDemanda {
  titulo: string;
  categoria: CategoriaDemanda | null;
  prioridade: PrioridadeDemanda | null;
  setorId: string | null;
  descricao: string;
}

export type ErrosDemanda = Partial<Record<keyof CamposDemanda, string>>;

export function validarDemanda(campos: CamposDemanda, setoresValidos: string[]): ErrosDemanda {
  const erros: ErrosDemanda = {};

  const erroTitulo = validarTexto(campos.titulo, 'um título', LIMITES.titulo.minimo, LIMITES.titulo.maximo);
  if (erroTitulo) erros.titulo = erroTitulo;

  if (!campos.categoria || !CATEGORIAS.includes(campos.categoria)) {
    erros.categoria = 'Escolha uma categoria.';
  }
  if (!campos.prioridade || !PRIORIDADES.includes(campos.prioridade)) {
    erros.prioridade = 'Escolha uma prioridade.';
  }
  if (!campos.setorId || !setoresValidos.includes(campos.setorId)) {
    erros.setorId = 'Escolha o setor do território.';
  }

  const erroDescricao = validarTexto(
    campos.descricao,
    'uma descrição',
    LIMITES.descricao.minimo,
    LIMITES.descricao.maximo,
  );
  if (erroDescricao) erros.descricao = erroDescricao;

  return erros;
}

// ---------------------------------------------------------------------------------------------
// Decisão do gestor
// ---------------------------------------------------------------------------------------------

export interface CamposDecisao {
  tipo: TipoDecisao | null;
  /** Opção sugerida escolhida (quando o tipo é "adotar recomendação"). */
  opcaoId: string | null;
  /** Descrição da medida (quando o tipo é "outra medida"). */
  outraMedida: string;
  /** Impacto informado pelo gestor para a "outra medida". */
  impactoOutra: ImpactoMedida | null;
  justificativa: string;
  responsavel: string;
  validacaoHumana: boolean;
}

export type ErrosDecisao = Partial<Record<keyof CamposDecisao, string>>;

/** Impacto da medida escolhida, ou `null` quando a decisão não envolve uma medida. */
export function impactoDaDecisao(campos: CamposDecisao, opcoes: OpcaoDecisao[]): ImpactoMedida | null {
  if (campos.tipo === 'adotar_recomendacao') {
    return opcoes.find((o) => o.id === campos.opcaoId)?.impacto ?? null;
  }
  if (campos.tipo === 'outra_medida') return campos.impactoOutra;
  return null;
}

export function validarDecisao(campos: CamposDecisao, opcoes: OpcaoDecisao[]): ErrosDecisao {
  const erros: ErrosDecisao = {};

  if (!campos.tipo || !TIPOS_DECISAO.includes(campos.tipo)) {
    erros.tipo = 'Escolha o tipo de decisão.';
  }

  if (campos.tipo === 'adotar_recomendacao' && !opcoes.some((o) => o.id === campos.opcaoId)) {
    erros.opcaoId = 'Escolha qual das medidas sugeridas será adotada.';
  }

  if (campos.tipo === 'outra_medida') {
    const erroMedida = validarTexto(campos.outraMedida, 'a medida', LIMITES.medida.minimo, LIMITES.medida.maximo);
    if (erroMedida) erros.outraMedida = erroMedida;
    if (!campos.impactoOutra) erros.impactoOutra = 'Informe o impacto da medida para a população.';
  }

  const altoImpacto = impactoDaDecisao(campos, opcoes) === 'alto';

  // Medidas de alto impacto pedem uma justificativa mais completa.
  const minimoJustificativa = altoImpacto ? LIMITES.justificativa.minimoAltoImpacto : LIMITES.justificativa.minimo;
  const erroJustificativa = validarTexto(
    campos.justificativa,
    'a justificativa',
    minimoJustificativa,
    LIMITES.justificativa.maximo,
  );
  if (erroJustificativa) erros.justificativa = erroJustificativa;

  const erroResponsavel = validarTexto(
    campos.responsavel,
    'o cargo ou a função de quem decide',
    LIMITES.responsavel.minimo,
    LIMITES.responsavel.maximo,
  );
  if (erroResponsavel) erros.responsavel = erroResponsavel;

  // O app nunca decide sozinho: em medidas de alto impacto, o gestor confirma a validação humana.
  if (altoImpacto && !campos.validacaoHumana) {
    erros.validacaoHumana = 'Confirme que a medida foi validada pela equipe responsável.';
  }

  return erros;
}

// ---------------------------------------------------------------------------------------------
// Limiares
// ---------------------------------------------------------------------------------------------

export interface CamposLimiares {
  atencao: string;
  alerta: string;
  critico: string;
}

export interface ResultadoLimiares {
  erros: Partial<Record<keyof CamposLimiares | 'geral', string>>;
  /** Preenchido só quando não há erros. */
  valores: Limiares | null;
}

export function validarCamposLimiares(campos: CamposLimiares, definicao: DefinicaoIndicador): ResultadoLimiares {
  const erros: ResultadoLimiares['erros'] = {};
  const lidos: Partial<Limiares> = {};

  for (const chave of ['atencao', 'alerta', 'critico'] as const) {
    const numero = lerNumero(campos[chave]);
    if (numero === null) {
      erros[chave] = 'Digite um número (use vírgula para decimais).';
    } else {
      lidos[chave] = numero;
    }
  }
  if (temErros(erros)) return { erros, valores: null };

  const valores = lidos as Limiares;
  const erroGeral = validarLimiares(valores, definicao.sentido, definicao.faixa);
  if (erroGeral) return { erros: { geral: erroGeral }, valores: null };

  return { erros: {}, valores };
}

// ---------------------------------------------------------------------------------------------
// Busca de município
// ---------------------------------------------------------------------------------------------

/**
 * Prepara o termo da busca: tira os espaços das pontas e troca por apóstrofo reto (') as variações
 * que os teclados produzem. O iPhone troca sozinho o apóstrofo pelo curvo (’), e no teclado
 * brasileiro é comum sair o acento agudo solto (´) em nomes como "Santa Bárbara d'Oeste".
 */
export function normalizarBusca(termo: string): string {
  return termo.trim().replace(/[‘’´`]/g, "'");
}

/** Mensagem de erro da busca, ou `null` quando o termo pode ser enviado à API. */
export function validarBusca(termo: string): string | null {
  const texto = normalizarBusca(termo);
  if (texto.length < LIMITES.busca.minimo) {
    return `Digite pelo menos ${LIMITES.busca.minimo} letras do nome do município.`;
  }
  if (texto.length > LIMITES.busca.maximo) {
    return `Use no máximo ${LIMITES.busca.maximo} caracteres.`;
  }
  // Letras com acentos do português (faixa Latin-1), sem depender de recursos novos de regex.
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s.'-]+$/.test(texto)) {
    return 'Use apenas letras, espaços, hífen e apóstrofo.';
  }
  return null;
}
