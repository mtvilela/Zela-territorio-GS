/**
 * Montagem do painel: junta as três fontes de dados (clima público, séries sintéticas e
 * solicitações), projeta cada série e gera os alertas. É uma função pura, testável sem tela.
 */
import { gerarAlertas, ordenarAlertas } from '@/dominio/alertas';
import { classificar, ORDEM_SITUACAO } from '@/dominio/limiares';
import { preverSerie } from '@/dominio/previsao';
import { podeExibir } from '@/dominio/privacidade';
import type {
  Alerta,
  DefinicaoIndicador,
  IndicadorId,
  Limiares,
  PontoPrevisto,
  PontoSerie,
  SerieIndicador,
  Setor,
  Situacao,
  TemaId,
  Demanda,
} from '@/dominio/tipos';

import { INDICADORES, indicadoresDoTema, SETORES } from './catalogo';
import { serieDemandasAbertas } from './demandas';
import type { DadosClima } from './openMeteo';
import { gerarSerieSintetica, INDICADORES_SINTETICOS } from './sintetico';

export type LimiaresPersonalizados = Partial<Record<IndicadorId, Limiares>>;

export interface EntradaDoPainel {
  /** Data de hoje no aparelho (ISO `aaaa-mm-dd`). */
  hoje: string;
  /** Última resposta da API de clima, ou `null` se ainda não houver. */
  clima: DadosClima | null;
  /** Solicitações já combinadas (sintéticas + registradas no aparelho). */
  demandas: Demanda[];
  limiares: LimiaresPersonalizados;
  cenario: number;
}

export interface Painel {
  series: SerieIndicador[];
  alertas: Alerta[];
}

/** Limiares em vigor: os personalizados pelo gestor ou, na falta deles, os padrões. */
export function limiaresEmVigor(id: IndicadorId, personalizados: LimiaresPersonalizados): Limiares {
  return personalizados[id] ?? INDICADORES[id].limiaresPadrao;
}

/** Série de um setor, com a projeção calculada pelo app (tendência ou média móvel). */
export function montarSerieDeSetor(
  definicao: DefinicaoIndicador,
  setor: Setor,
  historico: PontoSerie[],
  limiares: Limiares,
): SerieIndicador {
  // Regra de privacidade: indicador sensível não aparece em setor com poucos domicílios.
  if (!podeExibir(definicao, setor)) {
    return {
      definicao,
      setor,
      limiares,
      historico: [],
      previsao: [],
      metodo: null,
      valorAtual: null,
      situacao: 'normal',
      protegido: true,
      ajuste: null,
    };
  }

  // A projeção respeita os limites físicos: nada abaixo de zero, nem acima do teto do indicador.
  const resultado = preverSerie(historico, {
    minimo: 0,
    maximo: definicao.maximoFisico ?? undefined,
  });
  const valorAtual = historico.length > 0 ? historico[historico.length - 1].valor : null;

  return {
    definicao,
    setor,
    limiares,
    historico,
    previsao: resultado?.pontos ?? [],
    metodo: resultado?.metodo ?? null,
    valorAtual,
    situacao: valorAtual === null ? 'normal' : classificar(valorAtual, limiares, definicao.sentido),
    protegido: false,
    ajuste: resultado?.ajuste ?? null,
  };
}

/** Séries de clima do território: o "previsto" vem do modelo meteorológico, não do app. */
export function montarSeriesDeClima(clima: DadosClima, personalizados: LimiaresPersonalizados): SerieIndicador[] {
  const montar = (
    id: 'chuva_diaria' | 'sensacao_termica',
    valorDe: (dia: DadosClima['dias'][number]) => number | null,
  ): SerieIndicador => {
    const definicao = INDICADORES[id];
    const limiares = limiaresEmVigor(id, personalizados);
    const historico: PontoSerie[] = [];
    const previsao: PontoPrevisto[] = [];
    const probabilidadePorData: Record<string, number | null> = {};

    for (const dia of clima.dias) {
      const valor = valorDe(dia);
      if (valor === null) continue;
      if (dia.data < clima.hoje) {
        historico.push({ data: dia.data, valor });
      } else {
        // O modelo não informa faixa de incerteza por dia: a "faixa" coincide com o valor.
        previsao.push({ data: dia.data, valor, inferior: valor, superior: valor });
        probabilidadePorData[dia.data] = dia.probabilidadeChuva;
      }
    }

    const valorAtual = previsao.length > 0 ? previsao[0].valor : null;
    return {
      definicao,
      setor: null,
      limiares,
      historico,
      previsao,
      metodo: 'modelo_meteorologico',
      valorAtual,
      situacao: valorAtual === null ? 'normal' : classificar(valorAtual, limiares, definicao.sentido),
      protegido: false,
      ajuste: null,
      probabilidadePorData: id === 'chuva_diaria' ? probabilidadePorData : undefined,
    };
  };

  return [montar('chuva_diaria', (dia) => dia.chuva), montar('sensacao_termica', (dia) => dia.sensacaoMaxima)];
}

export function montarPainel(entrada: EntradaDoPainel): Painel {
  const series: SerieIndicador[] = [];

  if (entrada.clima) {
    series.push(...montarSeriesDeClima(entrada.clima, entrada.limiares));
  }

  for (const id of INDICADORES_SINTETICOS) {
    const definicao = INDICADORES[id];
    const limiares = limiaresEmVigor(id, entrada.limiares);
    for (const setor of SETORES) {
      const historico = podeExibir(definicao, setor)
        ? gerarSerieSintetica(id, setor.id, entrada.hoje, entrada.cenario)
        : [];
      series.push(montarSerieDeSetor(definicao, setor, historico, limiares));
    }
  }

  const definicaoFila = INDICADORES.demandas_abertas;
  const limiaresFila = limiaresEmVigor('demandas_abertas', entrada.limiares);
  for (const setor of SETORES) {
    const historico = serieDemandasAbertas(entrada.demandas, setor.id, entrada.hoje);
    series.push(montarSerieDeSetor(definicaoFila, setor, historico, limiaresFila));
  }

  // Os alertas de clima usam o "hoje" do território; os demais, o do aparelho.
  const alertas = gerarAlertas(
    series.filter((s) => s.metodo !== 'modelo_meteorologico'),
    entrada.hoje,
  );
  if (entrada.clima) {
    alertas.push(
      ...gerarAlertas(
        series.filter((s) => s.metodo === 'modelo_meteorologico'),
        entrada.clima.hoje,
      ),
    );
  }

  return { series, alertas: ordenarAlertas(alertas) };
}

// ---------------------------------------------------------------------------------------------
// Consultas usadas pelas telas
// ---------------------------------------------------------------------------------------------

export function seriesDoIndicador(series: SerieIndicador[], id: IndicadorId): SerieIndicador[] {
  return series.filter((s) => s.definicao.id === id);
}

/** Série em pior situação (em empate, a de valor mais extremo no sentido "ruim"). */
export function serieEmPiorSituacao(series: SerieIndicador[]): SerieIndicador | null {
  const visiveis = series.filter((s) => !s.protegido && s.valorAtual !== null);
  if (visiveis.length === 0) return null;
  return visiveis.reduce((pior, atual) => {
    const diferenca = ORDEM_SITUACAO[atual.situacao] - ORDEM_SITUACAO[pior.situacao];
    if (diferenca !== 0) return diferenca > 0 ? atual : pior;
    const maisExtremo =
      atual.definicao.sentido === 'maior_pior'
        ? (atual.valorAtual as number) > (pior.valorAtual as number)
        : (atual.valorAtual as number) < (pior.valorAtual as number);
    return maisExtremo ? atual : pior;
  });
}

export interface ResumoDoTema {
  tema: TemaId;
  /** Série de destaque do indicador principal (a de pior situação). */
  destaque: SerieIndicador | null;
  /** Nível do alerta mais grave do tema, ou "normal" se não houver alerta. */
  situacao: Situacao;
  alertas: Alerta[];
  /** Verdadeiro quando os dados do tema ainda não chegaram (clima sem conexão). */
  semDados: boolean;
}

export function resumirTema(tema: TemaId, painel: Painel): ResumoDoTema {
  const principal = indicadoresDoTema(tema)[0];
  const seriesPrincipais = seriesDoIndicador(painel.series, principal.id);
  const alertas = painel.alertas.filter((a) => a.tema === tema);

  // Se o tema tem alerta, o destaque é a série do alerta mais grave: assim o número mostrado
  // e o selo de situação falam da mesma coisa. Sem alerta, é o setor em pior situação.
  const doAlerta =
    alertas.length > 0
      ? painel.series.find(
          (s) => s.definicao.id === alertas[0].indicadorId && (s.setor?.id ?? null) === alertas[0].setorId,
        )
      : undefined;

  return {
    tema,
    destaque: doAlerta ?? serieEmPiorSituacao(seriesPrincipais),
    situacao: alertas.length > 0 ? alertas[0].nivel : 'normal',
    alertas,
    semDados: seriesPrincipais.length === 0,
  };
}
