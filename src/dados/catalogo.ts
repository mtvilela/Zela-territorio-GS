/**
 * Catálogo do painel: temas, setores do território e definição de cada indicador
 * (unidade, sentido, limiares padrão, fonte e limitações).
 *
 * Os SETORES são fictícios, de propósito: como os dados de água, energia, resíduos e serviços
 * são sintéticos, usar nomes de bairros reais poderia passar a impressão de que os números
 * descrevem lugares de verdade.
 */
import type {
  CategoriaDemanda,
  DefinicaoIndicador,
  IndicadorId,
  OrigemDado,
  PrioridadeDemanda,
  Setor,
  StatusDemanda,
  Tema,
  TemaId,
  Territorio,
} from '@/dominio/tipos';

export const TEMAS: Record<TemaId, Tema> = {
  clima: {
    id: 'clima',
    nome: 'Clima local',
    descricao: 'Chuva e calor previstos para os próximos 7 dias.',
  },
  agua: {
    id: 'agua',
    nome: 'Água',
    descricao: 'Nível dos reservatórios e consumo por habitante.',
  },
  energia: {
    id: 'energia',
    nome: 'Energia',
    descricao: 'Carga da rede elétrica no horário de pico.',
  },
  residuos: {
    id: 'residuos',
    nome: 'Resíduos',
    descricao: 'Ocupação dos ecopontos de cada setor.',
  },
  servicos: {
    id: 'servicos',
    nome: 'Serviços urbanos',
    descricao: 'Fila de solicitações de zeladoria em aberto.',
  },
};

export const ORDEM_TEMAS: TemaId[] = ['clima', 'agua', 'energia', 'residuos', 'servicos'];

export const SETORES: Setor[] = [
  { id: 'centro', nome: 'Centro', onde: 'no Centro', tipo: 'urbano', populacao: 18400, domicilios: 7100 },
  {
    id: 'acacias',
    nome: 'Jardim das Acácias',
    onde: 'no Jardim das Acácias',
    tipo: 'urbano',
    populacao: 12900,
    domicilios: 4300,
  },
  {
    id: 'esperanca',
    nome: 'Vila Esperança',
    onde: 'na Vila Esperança',
    tipo: 'urbano',
    populacao: 9700,
    domicilios: 3000,
  },
  {
    id: 'baixada',
    nome: 'Baixada do Córrego Verde',
    onde: 'na Baixada do Córrego Verde',
    tipo: 'urbano',
    populacao: 6300,
    domicilios: 1900,
  },
  {
    id: 'ribeirao',
    nome: 'Núcleo Rural Ribeirão Claro',
    onde: 'no Núcleo Rural Ribeirão Claro',
    tipo: 'rural',
    populacao: 1150,
    domicilios: 370,
  },
  // Setor pequeno de propósito: demonstra a regra de privacidade (menos de 50 domicílios).
  {
    id: 'palmeiras',
    nome: 'Sítio das Palmeiras',
    onde: 'no Sítio das Palmeiras',
    tipo: 'rural',
    populacao: 96,
    domicilios: 31,
  },
];

export function buscarSetor(id: string | null | undefined): Setor | undefined {
  return SETORES.find((setor) => setor.id === id);
}

/** Território padrão: São Paulo/SP. Pode ser trocado em Ajustes → Território. */
export const TERRITORIO_PADRAO: Territorio = {
  nome: 'São Paulo',
  estado: 'São Paulo',
  latitude: -23.55,
  longitude: -46.63,
};

export const FONTE_OPEN_METEO = 'Open-Meteo (modelos de previsão do tempo, licença CC BY 4.0)';
export const FONTE_SINTETICA = 'Série sintética gerada pelo próprio app para demonstração';

export const INDICADORES: Record<IndicadorId, DefinicaoIndicador> = {
  chuva_diaria: {
    id: 'chuva_diaria',
    tema: 'clima',
    nome: 'Chuva acumulada em 24 horas',
    nomeCurto: 'Chuva',
    nomeNaFrase: 'a chuva diária',
    unidade: 'mm',
    casasDecimais: 1,
    sentido: 'maior_pior',
    // Referência inicial: faixas dos avisos de chuvas intensas do INMET (50 e 100 mm por dia).
    limiaresPadrao: { atencao: 30, alerta: 50, critico: 100 },
    faixa: { minimo: 1, maximo: 400 },
    maximoFisico: null,
    origem: 'publica',
    fonte: FONTE_OPEN_METEO,
    descricao:
      'Chuva diária observada nos últimos 14 dias e prevista para os próximos 7, no ponto central do território.',
    limitacoes: [
      'A previsão vale para um ponto de grade de alguns quilômetros: pancadas localizadas podem não aparecer.',
      'O risco de alagamento também depende de drenagem, relevo e ocupação do solo, que o painel não mede.',
      'Não substitui os avisos oficiais da Defesa Civil, do INMET e do CEMADEN.',
    ],
    porSetor: false,
    sensivel: false,
  },
  sensacao_termica: {
    id: 'sensacao_termica',
    tema: 'clima',
    nome: 'Sensação térmica máxima',
    nomeCurto: 'Calor',
    nomeNaFrase: 'a sensação térmica máxima',
    unidade: '°C',
    casasDecimais: 1,
    sentido: 'maior_pior',
    limiaresPadrao: { atencao: 32, alerta: 36, critico: 40 },
    faixa: { minimo: 10, maximo: 60 },
    maximoFisico: null,
    origem: 'publica',
    fonte: FONTE_OPEN_METEO,
    descricao: 'Maior sensação térmica do dia (combina temperatura, umidade, vento e radiação), observada e prevista.',
    limitacoes: [
      'A sensação térmica muda de rua para rua: áreas sem sombra ficam mais quentes do que o valor do modelo.',
      'Não considera quem é mais vulnerável ao calor (idosos, crianças, quem trabalha ao ar livre).',
      'Os limites padrão são um ponto de partida e devem ser calibrados com a Saúde e a Defesa Civil locais.',
    ],
    porSetor: false,
    sensivel: false,
  },
  nivel_reservatorio: {
    id: 'nivel_reservatorio',
    tema: 'agua',
    nome: 'Nível do reservatório',
    nomeCurto: 'Reservatório',
    nomeNaFrase: 'o nível do reservatório',
    unidade: '%',
    casasDecimais: 1,
    sentido: 'menor_pior',
    limiaresPadrao: { atencao: 50, alerta: 35, critico: 20 },
    faixa: { minimo: 0, maximo: 100 },
    maximoFisico: 100,
    origem: 'sintetica',
    fonte: FONTE_SINTETICA,
    descricao: 'Volume armazenado no reservatório que abastece cada setor, em relação à capacidade.',
    limitacoes: [
      'Considera um reservatório por setor; não enxerga interligações nem manobras da rede.',
      'Chuvas e mudanças de operação alteram o ritmo de queda de um dia para o outro.',
    ],
    porSetor: true,
    sensivel: false,
  },
  consumo_agua: {
    id: 'consumo_agua',
    tema: 'agua',
    nome: 'Consumo de água por habitante',
    nomeCurto: 'Consumo de água',
    nomeNaFrase: 'o consumo de água por habitante',
    unidade: 'L/hab/dia',
    casasDecimais: 0,
    sentido: 'maior_pior',
    limiaresPadrao: { atencao: 160, alerta: 180, critico: 200 },
    faixa: { minimo: 50, maximo: 400 },
    maximoFisico: null,
    origem: 'sintetica',
    fonte: FONTE_SINTETICA,
    descricao: 'Média diária de litros consumidos por habitante em cada setor.',
    limitacoes: [
      'É uma média do setor: não distingue residências, comércio e vazamentos na rede.',
      'Setores com menos de 50 domicílios não são exibidos, para proteger a privacidade das famílias.',
    ],
    porSetor: true,
    sensivel: true,
  },
  carga_rede: {
    id: 'carga_rede',
    tema: 'energia',
    nome: 'Carga da rede elétrica no pico',
    nomeCurto: 'Carga da rede',
    nomeNaFrase: 'a carga da rede elétrica no pico',
    unidade: '%',
    casasDecimais: 1,
    sentido: 'maior_pior',
    limiaresPadrao: { atencao: 80, alerta: 90, critico: 100 },
    faixa: { minimo: 0, maximo: 150 },
    maximoFisico: null,
    origem: 'sintetica',
    fonte: FONTE_SINTETICA,
    descricao: 'Maior carga do dia no alimentador que atende o setor, em relação à capacidade nominal.',
    limitacoes: [
      'A capacidade real da rede varia com a temperatura; o percentual usa a capacidade nominal.',
      'Com dados reais, dependeria de um acordo de compartilhamento com a distribuidora.',
    ],
    porSetor: true,
    sensivel: false,
  },
  ocupacao_ecoponto: {
    id: 'ocupacao_ecoponto',
    tema: 'residuos',
    nome: 'Ocupação dos ecopontos',
    nomeCurto: 'Ecoponto',
    nomeNaFrase: 'a ocupação do ecoponto',
    unidade: '%',
    casasDecimais: 1,
    sentido: 'maior_pior',
    limiaresPadrao: { atencao: 70, alerta: 85, critico: 95 },
    faixa: { minimo: 0, maximo: 100 },
    maximoFisico: 100,
    origem: 'sintetica',
    fonte: FONTE_SINTETICA,
    descricao: 'Volume ocupado no ecoponto de cada setor, em relação à capacidade.',
    limitacoes: [
      'Descarte irregular fora do ecoponto não entra na conta.',
      'A ocupação cai de uma vez no dia da coleta, e a projeção não conhece o calendário de coleta.',
    ],
    porSetor: true,
    sensivel: false,
  },
  demandas_abertas: {
    id: 'demandas_abertas',
    tema: 'servicos',
    nome: 'Solicitações de zeladoria em aberto',
    nomeCurto: 'Fila de zeladoria',
    nomeNaFrase: 'a fila de solicitações em aberto',
    unidade: 'solicitações',
    casasDecimais: 0,
    sentido: 'maior_pior',
    limiaresPadrao: { atencao: 12, alerta: 18, critico: 25 },
    faixa: { minimo: 1, maximo: 500 },
    maximoFisico: null,
    origem: 'mista',
    fonte: 'Solicitações sintéticas de demonstração somadas às registradas neste aparelho',
    descricao: 'Quantidade de solicitações ainda não resolvidas em cada setor, dia a dia.',
    limitacoes: [
      'Conta apenas o que foi registrado: problemas não relatados não aparecem.',
      'Setores com menos acesso aos canais de atendimento registram menos — e não por terem menos problemas.',
    ],
    porSetor: true,
    sensivel: false,
  },
};

export const ORDEM_INDICADORES: IndicadorId[] = [
  'chuva_diaria',
  'sensacao_termica',
  'nivel_reservatorio',
  'consumo_agua',
  'carga_rede',
  'ocupacao_ecoponto',
  'demandas_abertas',
];

/** Indicadores de um tema, na ordem de exibição (o primeiro é o principal do tema). */
export function indicadoresDoTema(tema: TemaId): DefinicaoIndicador[] {
  return ORDEM_INDICADORES.map((id) => INDICADORES[id]).filter((def) => def.tema === tema);
}

export const ROTULO_ORIGEM: Record<OrigemDado, string> = {
  publica: 'Dado público',
  sintetica: 'Dado sintético',
  mista: 'Sintético + registros do app',
};

export const ROTULO_CATEGORIA: Record<CategoriaDemanda, string> = {
  iluminacao: 'Iluminação pública',
  buraco: 'Buraco na via',
  lixo: 'Lixo ou entulho',
  calcada: 'Calçada e acessibilidade',
  alagamento: 'Alagamento',
  arvore: 'Árvore ou poda',
  outro: 'Outro',
};

export const ROTULO_PRIORIDADE: Record<PrioridadeDemanda, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

export const ROTULO_STATUS: Record<StatusDemanda, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  resolvida: 'Resolvida',
};
