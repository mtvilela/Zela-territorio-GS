/**
 * Motor de alertas preditivos.
 *
 * Todo alerta sai daqui com as quatro coisas que o enunciado pede:
 *  - JUSTIFICATIVA: os dados e o método que levaram ao alerta;
 *  - NÍVEL DE CONFIANÇA: pontuação com os fatores que a aumentam ou diminuem;
 *  - LIMITAÇÕES: o que os dados e o método não enxergam;
 *  - OPÇÕES DE DECISÃO: sugestões classificadas por impacto — o app nunca as executa.
 *
 * As funções são puras (recebem dados, devolvem alertas), o que permite testá-las sem tela.
 */
import { descreverPrazo, diferencaDias, formatarDataCurta, formatarDataLonga, formatarDiaEData } from '@/utils/datas';
import { formatarNumero, formatarValor, formatarVariacao } from '@/utils/numeros';

import { confiancaClima, confiancaTendencia } from './confianca';
import { classificar, ORDEM_SITUACAO } from './limiares';
import { desvioPadrao, JANELA_TENDENCIA, media } from './previsao';
import { opcoesPara } from './recomendacoes';
import type { Alerta, DefinicaoIndicador, NivelAlerta, PontoPrevisto, SerieIndicador, Situacao } from './tipos';

const LIMITACAO_GERAL =
  'O alerta apoia a decisão, mas não a substitui: confirme a situação em campo e com os órgãos responsáveis antes de agir.';

const LIMITACAO_SINTETICA =
  'Esta série é sintética, gerada para demonstração: os valores não são medições reais deste território.';

const LIMITACAO_TENDENCIA =
  'A projeção supõe que o ritmo dos últimos dias continua. Chuva, manutenção, feriados ou uma ação da prefeitura mudam esse ritmo.';

const LIMITACAO_MEDIA_MOVEL = 'Sem tendência clara, a projeção repete a média recente e não antecipa mudanças bruscas.';

/** Chuva acumulada nos 3 dias anteriores a partir da qual consideramos o solo encharcado. */
const CHUVA_ANTECEDENTE_RELEVANTE_MM = 30;

const NOME_DO_LIMITE: Record<NivelAlerta, string> = {
  atencao: 'limite de atenção',
  alerta: 'limite de alerta',
  critico: 'limite crítico',
};

/** "89,6%", "155 L/hab/dia", "1 solicitação". */
export function valorDoIndicador(def: DefinicaoIndicador, valor: number | null): string {
  if (valor !== null && def.unidade === 'solicitações') {
    const inteiro = Math.round(valor);
    return `${formatarNumero(inteiro)} ${inteiro === 1 ? 'solicitação' : 'solicitações'}`;
  }
  return formatarValor(valor, def.unidade, def.casasDecimais);
}

/** Limites aparecem sem casas decimais quando são inteiros: "95%", não "95,0%". */
export function limiteDoIndicador(def: DefinicaoIndicador, valor: number): string {
  if (def.unidade === 'solicitações') return valorDoIndicador(def, valor);
  return formatarValor(valor, def.unidade, Number.isInteger(valor) ? 0 : def.casasDecimais);
}

/** "de 94,4 a 98,0%" — a unidade aparece uma vez só. */
function faixaDoIndicador(def: DefinicaoIndicador, inferior: number, superior: number): string {
  const casas = def.unidade === 'solicitações' ? 0 : def.casasDecimais;
  return `de ${formatarNumero(inferior, casas)} a ${valorDoIndicador(def, superior)}`;
}

/** Unidade da variação diária: porcentagens variam em "pontos percentuais" (p.p.). */
function unidadeDaVariacao(def: DefinicaoIndicador): string {
  return def.unidade === '%' ? 'p.p.' : def.unidade;
}

function limitacoesDaSerie(serie: SerieIndicador): string[] {
  const lista = [...serie.definicao.limitacoes];
  if (serie.metodo === 'tendencia') lista.push(LIMITACAO_TENDENCIA);
  if (serie.metodo === 'media_movel') lista.push(LIMITACAO_MEDIA_MOVEL);
  if (serie.definicao.origem !== 'publica') lista.push(LIMITACAO_SINTETICA);
  lista.push(LIMITACAO_GERAL);
  return lista;
}

// ---------------------------------------------------------------------------------------------
// Alertas de tendência (água, energia, resíduos, serviços)
// ---------------------------------------------------------------------------------------------

/**
 * Gera o alerta de uma série projetada pelo próprio app.
 * Retorna `null` quando não há o que alertar ou quando não há dados suficientes para prever.
 */
export function gerarAlertaDeTendencia(serie: SerieIndicador, hoje: string): Alerta | null {
  const { definicao: def, limiares, ajuste } = serie;
  if (serie.protegido || serie.valorAtual === null || !ajuste || serie.previsao.length === 0) return null;
  if (serie.metodo !== 'tendencia' && serie.metodo !== 'media_movel') return null;

  // Primeiro dia da projeção que atinge o nível mais grave do horizonte.
  let piorProjetada: Situacao = 'normal';
  let pontoDoPior: PontoPrevisto | null = null;
  for (const ponto of serie.previsao) {
    const situacao = classificar(ponto.valor, limiares, def.sentido);
    if (ORDEM_SITUACAO[situacao] > ORDEM_SITUACAO[piorProjetada]) {
      piorProjetada = situacao;
      pontoDoPior = ponto;
    }
  }

  const atual = serie.situacao;
  const vaiPiorar = ORDEM_SITUACAO[piorProjetada] > ORDEM_SITUACAO[atual];
  const nivel = vaiPiorar ? piorProjetada : atual;
  if (nivel === 'normal') return null;

  const tipo = vaiPiorar ? 'preditivo' : 'em_curso';
  const fimDoHorizonte = serie.previsao[serie.previsao.length - 1];
  const pontoReferencia = vaiPiorar && pontoDoPior ? pontoDoPior : fimDoHorizonte;
  const dataPrevista = vaiPiorar ? pontoReferencia.data : hoje;
  const diasAte = vaiPiorar ? Math.max(0, diferencaDias(hoje, pontoReferencia.data)) : 0;
  const limite = limiares[nivel];
  const local = serie.setor ? serie.setor.nome : 'Território';
  const onde = serie.setor ? serie.setor.onde : 'no território';

  // A ponta mais favorável da faixa ainda ultrapassa o limite?
  //  - alerta previsto: olhamos o fim do horizonte (o cruzamento "se sustenta" em qualquer cenário?);
  //  - alerta em curso: olhamos amanhã (a situação continua, mesmo no melhor caso?).
  const pontoDaFaixa = vaiPiorar ? fimDoHorizonte : serie.previsao[0];
  const faixaInteiraAlemDoLimite =
    def.sentido === 'maior_pior' ? pontoDaFaixa.inferior >= limite : pontoDaFaixa.superior <= limite;

  const recentes = serie.historico.slice(-JANELA_TENDENCIA).map((p) => p.valor);
  const mediaRecentes = media(recentes);
  const coeficienteVariacao = mediaRecentes === 0 ? 0 : desvioPadrao(recentes) / Math.abs(mediaRecentes);

  const confianca = confiancaTendencia({
    pontosNoHistorico: serie.historico.length,
    metodo: serie.metodo,
    r2: ajuste.r2,
    coeficienteVariacao,
    tipo,
    diasAte,
    faixaInteiraAlemDoLimite,
  });

  // ----- Textos -----
  const piora = def.sentido === 'maior_pior' ? ajuste.inclinacao > 0 : ajuste.inclinacao < 0;
  const direcao =
    serie.metodo === 'media_movel' || ajuste.inclinacao === 0 ? 'estável' : piora ? 'em piora' : 'em melhora';
  const verbo = def.sentido === 'maior_pior' ? 'chegar a' : 'cair a';
  const lado = def.sentido === 'maior_pior' ? 'acima' : 'abaixo';
  const valorAtual = valorDoIndicador(def, serie.valorAtual);
  const valorLimite = limiteDoIndicador(def, limite);

  const titulo =
    tipo === 'preditivo'
      ? `${def.nomeCurto} — ${local}: deve ${verbo} ${valorLimite} ${descreverPrazo(diasAte)}`
      : `${def.nomeCurto} — ${local}: ${valorAtual}, ${lado} do ${NOME_DO_LIMITE[nivel]}`;

  const resumo =
    tipo === 'preditivo'
      ? `Hoje está em ${valorAtual}. Mantido o ritmo recente, chega a ${valorDoIndicador(def, pontoReferencia.valor)} em ${formatarDataCurta(pontoReferencia.data)} (${NOME_DO_LIMITE[nivel]}: ${valorLimite}).`
      : `Leitura atual de ${valorAtual} (${NOME_DO_LIMITE[nivel]}: ${valorLimite}). Projeção para ${formatarDataCurta(fimDoHorizonte.data)}: ${valorDoIndicador(def, fimDoHorizonte.valor)}, ${direcao}.`;

  const justificativa: string[] = [`Hoje, ${def.nomeNaFrase} ${onde} está em ${valorAtual}.`];
  if (serie.metodo === 'tendencia') {
    justificativa.push(
      `Tendência dos últimos ${ajuste.pontosUsados} dias: ${formatarVariacao(ajuste.inclinacao, 1)} ${unidadeDaVariacao(def)} por dia (reta ajustada aos dados, R² = ${formatarNumero(ajuste.r2, 2)}).`,
    );
  } else {
    justificativa.push(
      `Os últimos ${ajuste.pontosUsados} dias não mostram tendência consistente (R² = ${formatarNumero(ajuste.r2, 2)}). Por isso o painel projeta a média recente, ${valorDoIndicador(def, ajuste.mediaRecente)}, em vez de extrapolar.`,
    );
  }
  justificativa.push(
    `Projeção para ${formatarDataLonga(pontoReferencia.data)}: ${valorDoIndicador(def, pontoReferencia.valor)} (faixa provável ${faixaDoIndicador(def, pontoReferencia.inferior, pontoReferencia.superior)}).`,
  );
  justificativa.push(`O ${NOME_DO_LIMITE[nivel]} configurado para este indicador é ${valorLimite}.`);

  return {
    chave: `${def.id}--${serie.setor?.id ?? 'territorio'}--${nivel}`,
    indicadorId: def.id,
    tema: def.tema,
    setorId: serie.setor?.id ?? null,
    setorNome: serie.setor?.nome ?? null,
    nivel,
    tipo,
    titulo,
    resumo,
    valorAtual: serie.valorAtual,
    valorPrevisto: pontoReferencia.valor,
    limiar: limite,
    dataPrevista,
    diasAte,
    justificativa,
    confianca,
    limitacoes: limitacoesDaSerie(serie),
    opcoes: opcoesPara(def.id, nivel),
    origem: def.origem,
    metodo: serie.metodo,
  };
}

// ---------------------------------------------------------------------------------------------
// Alertas de clima (previsão do modelo meteorológico)
// ---------------------------------------------------------------------------------------------

const TITULO_CHUVA: Record<NivelAlerta, string> = {
  atencao: 'Chuva significativa prevista',
  alerta: 'Chuva forte prevista',
  critico: 'Chuva extrema prevista',
};

const TITULO_CALOR: Record<NivelAlerta, string> = {
  atencao: 'Calor intenso previsto',
  alerta: 'Calor muito intenso previsto',
  critico: 'Calor extremo previsto',
};

/** Soma a chuva dos `dias` dias anteriores a `data` (observada ou prevista). */
function chuvaAntecedente(serie: SerieIndicador, data: string, dias: number): number {
  const todos = [...serie.historico, ...serie.previsao];
  return todos
    .filter((p) => {
      const distancia = diferencaDias(p.data, data);
      return distancia >= 1 && distancia <= dias;
    })
    .reduce((soma, p) => soma + p.valor, 0);
}

/** Tamanho da sequência de dias seguidos em alerta que contém a data informada. */
function diasConsecutivosEmAlerta(serie: SerieIndicador, data: string): number {
  const dias = serie.previsao;
  const indice = dias.findIndex((p) => p.data === data);
  if (indice < 0) return 0;
  const emAlerta = (p: PontoPrevisto) => classificar(p.valor, serie.limiares, serie.definicao.sentido) !== 'normal';
  let inicio = indice;
  while (inicio > 0 && emAlerta(dias[inicio - 1])) inicio--;
  let fim = indice;
  while (fim < dias.length - 1 && emAlerta(dias[fim + 1])) fim++;
  return fim - inicio + 1;
}

/**
 * Gera o alerta de um indicador de clima a partir da previsão do modelo meteorológico.
 * Considera o dia de pior situação dentro do horizonte (e, entre eles, o de maior valor).
 */
export function gerarAlertaDeClima(serie: SerieIndicador, hoje: string): Alerta | null {
  const { definicao: def, limiares } = serie;
  if (serie.metodo !== 'modelo_meteorologico' || serie.previsao.length === 0) return null;

  let pico: PontoPrevisto = serie.previsao[0];
  let situacaoDoPico: Situacao = classificar(pico.valor, limiares, def.sentido);
  for (const ponto of serie.previsao.slice(1)) {
    const situacao = classificar(ponto.valor, limiares, def.sentido);
    const maisGrave = ORDEM_SITUACAO[situacao] > ORDEM_SITUACAO[situacaoDoPico];
    const mesmoNivelMaiorValor = situacao === situacaoDoPico && ponto.valor > pico.valor;
    if (maisGrave || mesmoNivelMaiorValor) {
      pico = ponto;
      situacaoDoPico = situacao;
    }
  }
  if (situacaoDoPico === 'normal') return null;

  const nivel: NivelAlerta = situacaoDoPico;
  const limite = limiares[nivel];
  const valorLimite = limiteDoIndicador(def, limite);
  const valorPico = valorDoIndicador(def, pico.valor);
  const diasAte = Math.max(0, diferencaDias(hoje, pico.data));
  const ehChuva = def.id === 'chuva_diaria';
  const dataDoPico = pico.data;
  const outrosDias = serie.previsao.filter(
    (p) => p.data !== dataDoPico && classificar(p.valor, limiares, def.sentido) !== 'normal',
  );

  const justificativa: string[] = [
    `Previsão do modelo meteorológico para ${formatarDataLonga(pico.data)}: ${valorPico}${ehChuva ? ' de chuva em 24 horas' : ' de sensação térmica máxima'}.`,
    `O ${NOME_DO_LIMITE[nivel]} configurado para este indicador é ${valorLimite}.`,
  ];

  let probabilidade: number | null = null;
  let diasConsecutivos: number | undefined;
  let resumo: string;

  if (ehChuva) {
    probabilidade = serie.probabilidadePorData?.[pico.data] ?? null;
    if (probabilidade !== null) {
      justificativa.push(`Probabilidade de precipitação informada pelo modelo: ${formatarNumero(probabilidade, 0)}%.`);
    }
    const antecedente = chuvaAntecedente(serie, pico.data, 3);
    justificativa.push(
      antecedente >= CHUVA_ANTECEDENTE_RELEVANTE_MM
        ? `Chuva acumulada nos 3 dias anteriores: ${valorDoIndicador(def, antecedente)}. O solo já estará encharcado, o que aumenta o risco de alagamento e deslizamento.`
        : `Chuva acumulada nos 3 dias anteriores: ${valorDoIndicador(def, antecedente)}, sem acúmulo relevante no solo.`,
    );
    resumo = `O modelo meteorológico prevê ${valorPico} em 24 horas (${NOME_DO_LIMITE[nivel]}: ${valorLimite}).`;
    if (probabilidade !== null) resumo += ` Probabilidade de chuva: ${formatarNumero(probabilidade, 0)}%.`;
  } else {
    diasConsecutivos = diasConsecutivosEmAlerta(serie, pico.data);
    if (diasConsecutivos >= 2) {
      justificativa.push(
        `São ${diasConsecutivos} dias seguidos com sensação térmica a partir de ${limiteDoIndicador(def, limiares.atencao)}: o calor acumulado desgasta mais do que um dia isolado.`,
      );
    }
    resumo = `O modelo meteorológico prevê sensação térmica máxima de ${valorPico} (${NOME_DO_LIMITE[nivel]}: ${valorLimite}).`;
  }

  if (outrosDias.length > 0) {
    const lista = outrosDias.map((p) => `${formatarDataCurta(p.data)} (${valorDoIndicador(def, p.valor)})`).join(', ');
    justificativa.push(`Outros dias da semana a partir do limite de atenção: ${lista}.`);
  }

  const confianca = confiancaClima({
    diasAte,
    probabilidade,
    razaoSobreLimite: limite === 0 ? 1 : pico.valor / limite,
    diasConsecutivos,
  });

  const rotulo = ehChuva ? TITULO_CHUVA[nivel] : TITULO_CALOR[nivel];
  const quando = diasAte === 0 ? 'hoje' : formatarDiaEData(pico.data);

  return {
    // A data do evento entra na chave: a chuva de sexta e a de domingo são alertas diferentes.
    chave: `${def.id}--territorio--${nivel}--${pico.data}`,
    indicadorId: def.id,
    tema: def.tema,
    setorId: null,
    setorNome: null,
    nivel,
    tipo: 'preditivo',
    titulo: `${rotulo} para ${quando}: ${valorPico}`,
    resumo,
    valorAtual: serie.valorAtual,
    valorPrevisto: pico.valor,
    limiar: limite,
    dataPrevista: pico.data,
    diasAte,
    justificativa,
    confianca,
    limitacoes: limitacoesDaSerie(serie),
    opcoes: opcoesPara(def.id, nivel),
    origem: def.origem,
    metodo: 'modelo_meteorologico',
  };
}

// ---------------------------------------------------------------------------------------------

/** Mais grave primeiro; depois o prazo mais curto; depois a maior confiança. */
export function ordenarAlertas(alertas: Alerta[]): Alerta[] {
  return [...alertas].sort(
    (a, b) =>
      ORDEM_SITUACAO[b.nivel] - ORDEM_SITUACAO[a.nivel] ||
      a.diasAte - b.diasAte ||
      b.confianca.pontuacao - a.confianca.pontuacao,
  );
}

/** Gera e ordena os alertas de todas as séries informadas. */
export function gerarAlertas(series: SerieIndicador[], hoje: string): Alerta[] {
  const alertas: Alerta[] = [];
  for (const serie of series) {
    const alerta =
      serie.metodo === 'modelo_meteorologico' ? gerarAlertaDeClima(serie, hoje) : gerarAlertaDeTendencia(serie, hoje);
    if (alerta) alertas.push(alerta);
  }
  return ordenarAlertas(alertas);
}
