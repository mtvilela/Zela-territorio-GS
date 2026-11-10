/**
 * Consumo da API pública Open-Meteo (https://open-meteo.com) — sem chave e sem cadastro.
 *
 *  - Previsão: chuva, probabilidade de chuva e temperaturas diárias (14 dias passados + 7 futuros).
 *  - Geocodificação: busca de municípios brasileiros pelo nome (para escolher o território).
 *
 * Privacidade: a única informação enviada é a coordenada do TERRITÓRIO, arredondada (~1 km).
 * Nenhum dado de pessoa ou do aparelho é incluído na requisição.
 *
 * Atribuição exigida pela licença CC BY 4.0: "Weather data by Open-Meteo.com".
 */
import { arredondarCoordenada } from '@/dominio/privacidade';
import { normalizarBusca } from '@/dominio/validacao';

const URL_PREVISAO = 'https://api.open-meteo.com/v1/forecast';
const URL_GEOCODIFICACAO = 'https://geocoding-api.open-meteo.com/v1/search';

export const DIAS_PASSADOS = 14;
export const DIAS_PREVISTOS = 7;
const TEMPO_LIMITE_MS = 12000;

export type TipoErroDeApi = 'rede' | 'tempo_esgotado' | 'servidor' | 'resposta_invalida';

/** Erro com mensagem pronta para ser mostrada ao usuário. */
export class ErroDeApi extends Error {
  readonly tipo: TipoErroDeApi;

  constructor(tipo: TipoErroDeApi, mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeApi';
    this.tipo = tipo;
  }
}

/** Mensagem amigável para qualquer falha (inclusive as que não vieram da API). */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof Error && erro.name === 'ErroDeApi') return erro.message;
  return 'Não foi possível concluir a consulta. Tente de novo em instantes.';
}

export interface DiaClima {
  /** Data ISO `aaaa-mm-dd` no fuso horário do território. */
  data: string;
  chuva: number;
  probabilidadeChuva: number | null;
  sensacaoMaxima: number | null;
  temperaturaMaxima: number | null;
  temperaturaMinima: number | null;
}

export interface DadosClima {
  dias: DiaClima[];
  /** "Hoje" no fuso horário do território (pode diferir do aparelho). */
  hoje: string;
  latitude: number;
  longitude: number;
  fuso: string;
  /** Momento da consulta (ISO completo), para mostrar a idade do dado. */
  obtidoEm: string;
}

export interface LocalEncontrado {
  id: number;
  nome: string;
  estado: string | null;
  latitude: number;
  longitude: number;
  populacao: number | null;
}

type Buscar = typeof fetch;

interface OpcoesDeConsulta {
  /** Permite injetar um `fetch` falso nos testes. */
  buscar?: Buscar;
  agora?: Date;
}

/** Faz a requisição com tempo limite e converte as falhas em `ErroDeApi`. */
async function requisitarJson(url: string, buscar: Buscar): Promise<unknown> {
  const controle = new AbortController();
  const cronometro = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);

  let resposta: Response;
  try {
    resposta = await buscar(url, { signal: controle.signal, headers: { Accept: 'application/json' } });
  } catch (erro) {
    if (erro instanceof Error && erro.name === 'AbortError') {
      throw new ErroDeApi('tempo_esgotado', 'O serviço de clima demorou demais para responder. Tente de novo.');
    }
    throw new ErroDeApi('rede', 'Sem conexão com o serviço de clima. Verifique a internet e tente de novo.');
  } finally {
    clearTimeout(cronometro);
  }

  let corpo: unknown;
  try {
    corpo = await resposta.json();
  } catch {
    throw new ErroDeApi('resposta_invalida', 'O serviço de clima respondeu em um formato inesperado.');
  }

  if (!resposta.ok) {
    // A Open-Meteo explica o problema no campo "reason".
    const motivo = ehObjeto(corpo) && typeof corpo.reason === 'string' ? ` (${corpo.reason})` : '';
    throw new ErroDeApi('servidor', `O serviço de clima recusou a consulta: erro ${resposta.status}${motivo}.`);
  }
  return corpo;
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function numeroOuNulo(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

// ---------------------------------------------------------------------------------------------
// Previsão
// ---------------------------------------------------------------------------------------------

export function montarUrlPrevisao(latitude: number, longitude: number): string {
  const parametros = [
    `latitude=${arredondarCoordenada(latitude)}`,
    `longitude=${arredondarCoordenada(longitude)}`,
    'daily=precipitation_sum,precipitation_probability_max,apparent_temperature_max,temperature_2m_max,temperature_2m_min',
    `past_days=${DIAS_PASSADOS}`,
    `forecast_days=${DIAS_PREVISTOS}`,
    'timezone=auto',
  ];
  return `${URL_PREVISAO}?${parametros.join('&')}`;
}

/** Converte a resposta da API no formato do app. Lança `ErroDeApi` se algo essencial faltar. */
export function interpretarPrevisao(json: unknown, agora: Date = new Date()): DadosClima {
  const invalida = () => new ErroDeApi('resposta_invalida', 'O serviço de clima respondeu em um formato inesperado.');

  if (!ehObjeto(json) || !ehObjeto(json.daily)) throw invalida();
  const diario = json.daily;
  const datas = diario.time;
  const chuvas = diario.precipitation_sum;
  if (!Array.isArray(datas) || !Array.isArray(chuvas) || datas.length === 0) throw invalida();

  const coluna = (nome: string): unknown[] => (Array.isArray(diario[nome]) ? (diario[nome] as unknown[]) : []);
  const probabilidades = coluna('precipitation_probability_max');
  const sensacoes = coluna('apparent_temperature_max');
  const maximas = coluna('temperature_2m_max');
  const minimas = coluna('temperature_2m_min');

  const dias: DiaClima[] = [];
  datas.forEach((data, i) => {
    const chuva = numeroOuNulo(chuvas[i]);
    // Dias sem valor de chuva são ignorados: melhor um buraco na série do que um zero inventado.
    if (typeof data !== 'string' || chuva === null) return;
    dias.push({
      data,
      chuva,
      probabilidadeChuva: numeroOuNulo(probabilidades[i]),
      sensacaoMaxima: numeroOuNulo(sensacoes[i]),
      temperaturaMaxima: numeroOuNulo(maximas[i]),
      temperaturaMinima: numeroOuNulo(minimas[i]),
    });
  });
  if (dias.length === 0) throw invalida();

  // "Hoje" no fuso do território: soma o deslocamento informado pela API ao horário UTC.
  const deslocamento = numeroOuNulo(json.utc_offset_seconds) ?? 0;
  const hoje = new Date(agora.getTime() + deslocamento * 1000).toISOString().slice(0, 10);

  return {
    dias,
    hoje,
    latitude: numeroOuNulo(json.latitude) ?? 0,
    longitude: numeroOuNulo(json.longitude) ?? 0,
    fuso: typeof json.timezone === 'string' ? json.timezone : 'UTC',
    obtidoEm: agora.toISOString(),
  };
}

export async function buscarClima(
  latitude: number,
  longitude: number,
  opcoes: OpcoesDeConsulta = {},
): Promise<DadosClima> {
  const json = await requisitarJson(montarUrlPrevisao(latitude, longitude), opcoes.buscar ?? fetch);
  return interpretarPrevisao(json, opcoes.agora ?? new Date());
}

// ---------------------------------------------------------------------------------------------
// Busca de municípios
// ---------------------------------------------------------------------------------------------

export function montarUrlBusca(termo: string): string {
  const parametros = [
    // O mesmo preparo usado na validação: as variações de apóstrofo viram o reto. A base não encontra
    // nomes escritos com o acento agudo solto ("d´Oeste"), comum no teclado brasileiro.
    `name=${encodeURIComponent(normalizarBusca(termo))}`,
    'count=8',
    'language=pt',
    'format=json',
    'countryCode=BR',
  ];
  return `${URL_GEOCODIFICACAO}?${parametros.join('&')}`;
}

export function interpretarBusca(json: unknown): LocalEncontrado[] {
  // Quando nada é encontrado, a API responde sem o campo "results".
  if (!ehObjeto(json) || !Array.isArray(json.results)) return [];

  const locais: LocalEncontrado[] = [];
  for (const item of json.results) {
    if (!ehObjeto(item)) continue;
    const latitude = numeroOuNulo(item.latitude);
    const longitude = numeroOuNulo(item.longitude);
    if (typeof item.name !== 'string' || latitude === null || longitude === null) continue;
    locais.push({
      id: numeroOuNulo(item.id) ?? locais.length,
      nome: item.name,
      estado: typeof item.admin1 === 'string' ? item.admin1 : null,
      latitude,
      longitude,
      populacao: numeroOuNulo(item.population),
    });
  }
  return locais;
}

export async function buscarMunicipios(termo: string, opcoes: OpcoesDeConsulta = {}): Promise<LocalEncontrado[]> {
  const json = await requisitarJson(montarUrlBusca(termo), opcoes.buscar ?? fetch);
  return interpretarBusca(json);
}
