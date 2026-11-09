/**
 * Tipos do domínio do painel. Nenhum deles guarda dado pessoal: tudo é agregado por setor.
 */

export type TemaId = 'clima' | 'agua' | 'energia' | 'residuos' | 'servicos';

export type IndicadorId =
  | 'chuva_diaria'
  | 'sensacao_termica'
  | 'nivel_reservatorio'
  | 'consumo_agua'
  | 'carga_rede'
  | 'ocupacao_ecoponto'
  | 'demandas_abertas';

export type NivelAlerta = 'atencao' | 'alerta' | 'critico';

/** Situação de um indicador: normal ou um dos três níveis de alerta. */
export type Situacao = 'normal' | NivelAlerta;

/** `maior_pior`: valor alto é ruim (chuva, carga). `menor_pior`: valor baixo é ruim (reservatório). */
export type Sentido = 'maior_pior' | 'menor_pior';

/** De onde vem o dado. Aparece como selo ao lado de cada indicador. */
export type OrigemDado = 'publica' | 'sintetica' | 'mista';

export type MetodoPrevisao = 'modelo_meteorologico' | 'tendencia' | 'media_movel';

export type ImpactoMedida = 'baixo' | 'medio' | 'alto';

export type NivelConfianca = 'baixa' | 'media' | 'alta';

/** Um ponto de série diária. `data` no formato ISO `aaaa-mm-dd`. */
export interface PontoSerie {
  data: string;
  valor: number;
}

/** Valor projetado com a faixa provável (intervalo de 80%). */
export interface PontoPrevisto extends PontoSerie {
  inferior: number;
  superior: number;
}

export interface Limiares {
  atencao: number;
  alerta: number;
  critico: number;
}

export interface Tema {
  id: TemaId;
  nome: string;
  descricao: string;
}

export interface Setor {
  id: string;
  nome: string;
  /** Nome com preposição, para as frases dos alertas: "no Centro", "na Vila Esperança". */
  onde: string;
  tipo: 'urbano' | 'rural';
  /** População e domicílios são números agregados (sintéticos), nunca cadastros de pessoas. */
  populacao: number;
  domicilios: number;
}

export interface DefinicaoIndicador {
  id: IndicadorId;
  tema: TemaId;
  nome: string;
  nomeCurto: string;
  /** Texto usado nas frases dos alertas, com artigo: "o nível do reservatório". */
  nomeNaFrase: string;
  unidade: string;
  casasDecimais: number;
  sentido: Sentido;
  limiaresPadrao: Limiares;
  /** Faixa plausível, usada para validar os limiares digitados pelo gestor. */
  faixa: { minimo: number; maximo: number };
  /** Teto físico do valor (100 para ocupação e nível). `null` quando não há teto. O piso é sempre 0. */
  maximoFisico: number | null;
  origem: OrigemDado;
  fonte: string;
  descricao: string;
  limitacoes: string[];
  /** `false` para indicadores do território inteiro (clima). */
  porSetor: boolean;
  /**
   * Indicador derivado de medição por domicílio. Não é exibido em setores com poucos
   * domicílios, para não expor hábitos de famílias identificáveis.
   */
  sensivel: boolean;
}

/** Série pronta para exibir: histórico, projeção e situação. */
export interface SerieIndicador {
  definicao: DefinicaoIndicador;
  /** `null` quando o indicador vale para o território inteiro. */
  setor: Setor | null;
  limiares: Limiares;
  historico: PontoSerie[];
  previsao: PontoPrevisto[];
  metodo: MetodoPrevisao | null;
  valorAtual: number | null;
  situacao: Situacao;
  /** Verdadeiro quando a série foi ocultada pela regra de agregação mínima (privacidade). */
  protegido: boolean;
  /** Detalhes do ajuste estatístico, quando a projeção é calculada pelo app. */
  ajuste: AjusteTendencia | null;
  /** Dados extras do clima, por data (ex.: probabilidade de chuva). */
  probabilidadePorData?: Record<string, number | null>;
}

export interface AjusteTendencia {
  /** Variação média por dia (inclinação da reta). */
  inclinacao: number;
  intercepto: number;
  /** Quanto da variação a reta explica (0 a 1). */
  r2: number;
  desvioResidual: number;
  pontosUsados: number;
  mediaRecente: number;
}

export interface FatorConfianca {
  descricao: string;
  /** Pontos somados (positivo) ou subtraídos (negativo) da confiança. */
  efeito: number;
}

export interface Confianca {
  /** 5 a 95. Nunca 0 nem 100: nenhuma previsão é certa. */
  pontuacao: number;
  nivel: NivelConfianca;
  fatores: FatorConfianca[];
}

export interface OpcaoDecisao {
  id: string;
  titulo: string;
  impacto: ImpactoMedida;
}

export type TipoAlerta = 'preditivo' | 'em_curso';

export interface Alerta {
  /** Identifica a situação: indicador + setor + nível (+ data do evento, no clima). */
  chave: string;
  indicadorId: IndicadorId;
  tema: TemaId;
  setorId: string | null;
  setorNome: string | null;
  nivel: NivelAlerta;
  tipo: TipoAlerta;
  titulo: string;
  resumo: string;
  valorAtual: number | null;
  valorPrevisto: number;
  limiar: number;
  /** Data em que o limiar deve ser (ou foi) ultrapassado. */
  dataPrevista: string;
  /** Dias até `dataPrevista` (0 = hoje ou já em curso). */
  diasAte: number;
  justificativa: string[];
  confianca: Confianca;
  limitacoes: string[];
  opcoes: OpcaoDecisao[];
  origem: OrigemDado;
  metodo: MetodoPrevisao;
}

// ---------------------------------------------------------------------------------------------
// Demandas por serviços (zeladoria) — mesmas categorias do Zela Bairro
// ---------------------------------------------------------------------------------------------

export type CategoriaDemanda = 'iluminacao' | 'buraco' | 'lixo' | 'calcada' | 'alagamento' | 'arvore' | 'outro';

export type PrioridadeDemanda = 'baixa' | 'media' | 'alta';

export type StatusDemanda = 'aberta' | 'em_andamento' | 'resolvida';

export interface Demanda {
  id: string;
  titulo: string;
  categoria: CategoriaDemanda;
  prioridade: PrioridadeDemanda;
  setorId: string;
  descricao: string;
  status: StatusDemanda;
  /** Datas no formato ISO `aaaa-mm-dd`. */
  criadaEm: string;
  resolvidaEm: string | null;
  /** `sintetica`: gerada para demonstração. `local`: registrada neste aparelho. */
  origem: 'sintetica' | 'local';
}

// ---------------------------------------------------------------------------------------------
// Decisões registradas pelo gestor
// ---------------------------------------------------------------------------------------------

export type TipoDecisao = 'adotar_recomendacao' | 'outra_medida' | 'monitorar' | 'descartar';

export interface Decisao {
  id: string;
  chaveAlerta: string;
  /** Fotografia do alerta no momento da decisão, para o diário continuar legível depois. */
  alerta: {
    titulo: string;
    resumo: string;
    nivel: NivelAlerta;
    tema: TemaId;
    setorNome: string | null;
    confianca: number;
    nivelConfianca: NivelConfianca;
  };
  tipo: TipoDecisao;
  medida: string;
  impacto: ImpactoMedida | null;
  justificativa: string;
  /** Cargo ou função de quem decidiu — não o nome da pessoa. */
  responsavel: string;
  /** Marcado pelo gestor em medidas de alto impacto. */
  validacaoHumanaConfirmada: boolean;
  /** Data e hora no formato ISO completo. */
  registradaEm: string;
}

export interface Territorio {
  nome: string;
  estado: string | null;
  latitude: number;
  longitude: number;
}
