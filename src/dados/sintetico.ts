/**
 * Gerador de dados SINTÉTICOS (água, energia, resíduos e solicitações de zeladoria).
 *
 * Por que sintéticos? Esses dados reais pertencem a concessionárias e prefeituras e só poderiam
 * ser usados com autorização. O enunciado permite dados sintéticos, então geramos séries
 * plausíveis para demonstrar o painel — e deixamos isso explícito em cada tela.
 *
 * Como funciona:
 *  - Cada setor tem um PERFIL por indicador: valor de hoje, variação por dia e ruído.
 *  - O cenário é ANCORADO EM HOJE: cada valor depende de "há quantos dias" ele ocorreu, e não
 *    do dia do calendário. Assim a demonstração é idêntica em qualquer data (só as datas do
 *    eixo mudam) e os testes conseguem conferir exatamente quais alertas o cenário produz.
 *  - O ruído é determinístico (sem Math.random): abrir o app de novo mostra os mesmos números.
 *  - Trocar o número do cenário redistribui os perfis entre os setores e muda o ruído.
 */
import type { CategoriaDemanda, Demanda, IndicadorId, PontoSerie, PrioridadeDemanda } from '@/dominio/tipos';
import { somarDias } from '@/utils/datas';
import { arredondar, limitar } from '@/utils/numeros';

import { INDICADORES, SETORES } from './catalogo';

export const DIAS_DE_HISTORICO = 30;

export type IndicadorSintetico = Extract<
  IndicadorId,
  'nivel_reservatorio' | 'consumo_agua' | 'carga_rede' | 'ocupacao_ecoponto'
>;

export const INDICADORES_SINTETICOS: IndicadorSintetico[] = [
  'nivel_reservatorio',
  'consumo_agua',
  'carga_rede',
  'ocupacao_ecoponto',
];

// ---------------------------------------------------------------------------------------------
// Números pseudoaleatórios determinísticos
// ---------------------------------------------------------------------------------------------

/** Transforma um texto em um número entre 0 e 1 (sempre o mesmo para o mesmo texto). */
export function aleatorio(semente: string): number {
  // Hash FNV-1a de 32 bits…
  let h = 0x811c9dc5;
  for (let i = 0; i < semente.length; i++) {
    h ^= semente.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // …seguido de um passo de embaralhamento (mulberry32) para espalhar bem os valores.
  h = (h + 0x6d2b79f5) | 0;
  let t = Math.imul(h ^ (h >>> 15), 1 | h);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Ruído com média 0 e desvio-padrão ≈ 1 (soma de três valores uniformes). */
function ruidoPadrao(semente: string): number {
  return (aleatorio(`${semente}|a`) + aleatorio(`${semente}|b`) + aleatorio(`${semente}|c`) - 1.5) * 2;
}

// ---------------------------------------------------------------------------------------------
// Séries diárias por setor
// ---------------------------------------------------------------------------------------------

interface Perfil {
  /** Valor esperado hoje. */
  hoje: number;
  /** Variação por dia nos últimos `dias` dias. */
  porDia: number;
  /** Há quantos dias o ritmo atual começou (padrão: todo o histórico). */
  dias?: number;
  /** Variação por dia antes disso. */
  porDiaAntes?: number;
  ruido: number;
}

/** Um perfil por setor, na ordem de `SETORES` (cenário padrão). */
const PERFIS: Record<IndicadorSintetico, Perfil[]> = {
  nivel_reservatorio: [
    { hoje: 72, porDia: 0.05, ruido: 0.8 },
    { hoje: 64, porDia: -0.25, ruido: 0.9 },
    // Vila Esperança: queda acelerada há 18 dias → alerta previsto.
    { hoje: 40, porDia: -1.25, dias: 18, porDiaAntes: -0.2, ruido: 0.8 },
    { hoje: 58, porDia: -0.35, ruido: 1.0 },
    // Ribeirão Claro: já abaixo do limite de atenção, sem tendência clara.
    { hoje: 47, porDia: -0.1, ruido: 1.2 },
    { hoje: 66, porDia: 0.1, ruido: 1.0 },
  ],
  consumo_agua: [
    { hoje: 148, porDia: 0.1, ruido: 2.5 },
    // Jardim das Acácias: consumo subindo há duas semanas → atenção prevista.
    { hoje: 159.5, porDia: 0.9, dias: 16, porDiaAntes: 0, ruido: 2.0 },
    { hoje: 131, porDia: -0.2, ruido: 2.5 },
    { hoje: 124, porDia: 0, ruido: 2.5 },
    { hoje: 139, porDia: 0.2, ruido: 3.0 },
    { hoje: 118, porDia: 0, ruido: 4.0 },
  ],
  carga_rede: [
    // Centro: carga subindo → alerta previsto.
    { hoje: 86, porDia: 1.1, dias: 16, porDiaAntes: 0.1, ruido: 1.0 },
    { hoje: 71, porDia: 0.3, ruido: 1.3 },
    // Vila Esperança: subida lenta → atenção só no fim do horizonte (confiança menor).
    { hoje: 77, porDia: 0.5, dias: 20, porDiaAntes: 0.1, ruido: 1.0 },
    { hoje: 64, porDia: 0, ruido: 1.5 },
    { hoje: 58, porDia: -0.1, ruido: 1.8 },
    { hoje: 49, porDia: 0, ruido: 2.0 },
  ],
  ocupacao_ecoponto: [
    { hoje: 52, porDia: 0.9, dias: 16, porDiaAntes: 0.3, ruido: 1.4 },
    { hoje: 61, porDia: 0.5, ruido: 1.4 },
    { hoje: 44, porDia: 0.6, ruido: 1.4 },
    // Baixada: ecoponto enchendo rápido há duas semanas → crítico previsto.
    { hoje: 89, porDia: 3.1, dias: 15, porDiaAntes: 0.5, ruido: 1.2 },
    { hoje: 38, porDia: 0.3, ruido: 1.5 },
    { hoje: 27, porDia: 0.2, ruido: 1.5 },
  ],
};

function perfilDoSetor<T>(perfis: T[], indiceSetor: number, cenario: number): T {
  return perfis[(indiceSetor + cenario) % perfis.length];
}

/** Série diária sintética de um indicador em um setor, terminando em `hoje`. */
export function gerarSerieSintetica(
  indicadorId: IndicadorSintetico,
  setorId: string,
  hoje: string,
  cenario = 0,
  dias = DIAS_DE_HISTORICO,
): PontoSerie[] {
  const indiceSetor = SETORES.findIndex((s) => s.id === setorId);
  if (indiceSetor < 0) throw new Error(`Setor desconhecido: ${setorId}`);

  const definicao = INDICADORES[indicadorId];
  const perfil = perfilDoSetor(PERFIS[indicadorId], indiceSetor, cenario);
  const inicioDoRitmo = perfil.dias ?? dias;

  const serie: PontoSerie[] = [];
  for (let i = -(dias - 1); i <= 0; i++) {
    const data = somarDias(hoje, i);
    // Ritmo atual nos últimos `inicioDoRitmo` dias; ritmo anterior antes disso.
    const base =
      i >= -inicioDoRitmo
        ? perfil.hoje + perfil.porDia * i
        : perfil.hoje - perfil.porDia * inicioDoRitmo + (perfil.porDiaAntes ?? 0) * (i + inicioDoRitmo);
    // A semente usa o deslocamento "i" (há quantos dias), não a data do calendário.
    const ruido = perfil.ruido * ruidoPadrao(`${cenario}|${indicadorId}|${setorId}|${i}`);
    const valor = limitar(base + ruido, definicao.faixa.minimo, definicao.faixa.maximo);
    serie.push({ data, valor: arredondar(valor, definicao.casasDecimais) });
  }
  return serie;
}

// ---------------------------------------------------------------------------------------------
// Solicitações de zeladoria
// ---------------------------------------------------------------------------------------------

interface PerfilDemandas {
  /** Média de solicitações novas por dia. */
  chegadas: number;
  /** Média nos últimos `diasRecentes` dias (para simular uma fila crescendo). */
  chegadasRecentes?: number;
  diasRecentes?: number;
  /** Dias que a equipe leva para resolver (mínimo e máximo). */
  prazoMinimo: number;
  prazoMaximo: number;
  /** Categorias mais frequentes no setor (as demais têm peso 1). */
  pesos: Partial<Record<CategoriaDemanda, number>>;
}

const PERFIS_DEMANDAS: PerfilDemandas[] = [
  { chegadas: 0.9, prazoMinimo: 4, prazoMaximo: 9, pesos: { iluminacao: 3, calcada: 3 } },
  { chegadas: 0.7, prazoMinimo: 4, prazoMaximo: 10, pesos: { arvore: 3, iluminacao: 2 } },
  { chegadas: 0.8, prazoMinimo: 5, prazoMaximo: 12, pesos: { buraco: 3, lixo: 2 } },
  // Baixada: chegadas mais que dobram nos últimos dias e a equipe demora mais → fila crescendo.
  {
    chegadas: 0.3,
    chegadasRecentes: 0.7,
    diasRecentes: 10,
    prazoMinimo: 10,
    prazoMaximo: 18,
    pesos: { alagamento: 4, lixo: 3 },
  },
  { chegadas: 0.25, prazoMinimo: 6, prazoMaximo: 14, pesos: { buraco: 3, arvore: 2 } },
  { chegadas: 0.04, prazoMinimo: 5, prazoMaximo: 10, pesos: { buraco: 2 } },
];

const CATEGORIAS: CategoriaDemanda[] = ['iluminacao', 'buraco', 'lixo', 'calcada', 'alagamento', 'arvore', 'outro'];

const TITULOS: Record<CategoriaDemanda, string[]> = {
  iluminacao: ['Poste apagado', 'Lâmpada piscando em via pública', 'Trecho de rua sem iluminação'],
  buraco: ['Buraco na pista', 'Afundamento do asfalto', 'Buraco próximo à esquina'],
  lixo: ['Entulho acumulado', 'Lixo fora do horário de coleta', 'Ponto de descarte irregular'],
  calcada: ['Calçada quebrada', 'Rampa de acessibilidade danificada', 'Calçada obstruída'],
  alagamento: ['Ponto de alagamento', 'Boca de lobo entupida', 'Água empoçada na via'],
  arvore: ['Galho com risco de queda', 'Árvore encostando na fiação', 'Poda solicitada'],
  outro: ['Sinalização danificada', 'Banco de praça quebrado', 'Mato alto em área pública'],
};

/** Quantos dias para trás geramos solicitações (mais que o histórico, para a fila já começar formada). */
const DIAS_DE_SOLICITACOES = 50;

/** Sorteia uma contagem de Poisson (chegadas por dia) a partir de um número uniforme. */
function poisson(mediaPorDia: number, uniforme: number): number {
  let k = 0;
  let probabilidade = Math.exp(-mediaPorDia);
  let acumulada = probabilidade;
  while (uniforme > acumulada && k < 12) {
    k++;
    probabilidade *= mediaPorDia / k;
    acumulada += probabilidade;
  }
  return k;
}

function sortearCategoria(pesos: Partial<Record<CategoriaDemanda, number>>, uniforme: number): CategoriaDemanda {
  const total = CATEGORIAS.reduce((soma, c) => soma + (pesos[c] ?? 1), 0);
  let alvo = uniforme * total;
  for (const categoria of CATEGORIAS) {
    alvo -= pesos[categoria] ?? 1;
    if (alvo < 0) return categoria;
  }
  return 'outro';
}

function sortearPrioridade(categoria: CategoriaDemanda, uniforme: number): PrioridadeDemanda {
  // Alagamento e iluminação tendem a ser mais urgentes.
  const chanceAlta = categoria === 'alagamento' ? 0.45 : categoria === 'iluminacao' ? 0.25 : 0.15;
  if (uniforme < chanceAlta) return 'alta';
  return uniforme < chanceAlta + 0.45 ? 'media' : 'baixa';
}

/**
 * Solicitações sintéticas de todos os setores. Como o cenário é ancorado em hoje, o identificador
 * usa "há quantos dias" a solicitação foi aberta: assim os ajustes de status feitos pelo usuário
 * continuam valendo quando o app é reaberto.
 */
export function gerarDemandasSinteticas(hoje: string, cenario = 0): Demanda[] {
  const demandas: Demanda[] = [];

  SETORES.forEach((setor, indiceSetor) => {
    const perfil = perfilDoSetor(PERFIS_DEMANDAS, indiceSetor, cenario);

    for (let i = -(DIAS_DE_SOLICITACOES - 1); i <= 0; i++) {
      const data = somarDias(hoje, i);
      const idade = -i;
      const recente = perfil.diasRecentes !== undefined && idade < perfil.diasRecentes;
      const mediaDoDia = recente && perfil.chegadasRecentes ? perfil.chegadasRecentes : perfil.chegadas;
      const semente = `${cenario}|demanda|${setor.id}|${idade}`;
      const quantidade = poisson(mediaDoDia, aleatorio(`${semente}|quantidade`));

      for (let j = 0; j < quantidade; j++) {
        const s = `${semente}|${j}`;
        const categoria = sortearCategoria(perfil.pesos, aleatorio(`${s}|categoria`));
        const prioridade = sortearPrioridade(categoria, aleatorio(`${s}|prioridade`));
        const prazo =
          perfil.prazoMinimo + Math.floor(aleatorio(`${s}|prazo`) * (perfil.prazoMaximo - perfil.prazoMinimo + 1));
        const resolvidaEm = prazo <= idade ? somarDias(data, prazo) : null;
        const titulos = TITULOS[categoria];

        demandas.push({
          id: `sintetica-${cenario}-${setor.id}-${idade}-${j}`,
          titulo: titulos[Math.floor(aleatorio(`${s}|titulo`) * titulos.length)],
          categoria,
          prioridade,
          setorId: setor.id,
          descricao: 'Registro sintético, gerado para demonstrar o painel.',
          status: resolvidaEm ? 'resolvida' : idade >= 2 && aleatorio(`${s}|status`) < 0.55 ? 'em_andamento' : 'aberta',
          criadaEm: data,
          resolvidaEm,
          origem: 'sintetica',
        });
      }
    }
  });

  return demandas;
}
