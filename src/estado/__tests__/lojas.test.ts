/**
 * Testes das lojas de estado (Zustand): ações, persistência no AsyncStorage (simulado em
 * memória) e o comportamento da loja do clima diante de sucesso, erro e troca de território.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { TERRITORIO_PADRAO } from '@/dados/catalogo';
import { buscarClima, ErroDeApi, type DadosClima } from '@/dados/openMeteo';
import type { Demanda, Territorio } from '@/dominio/tipos';
import { CHAVES } from '@/estado/armazenamento';
import { chaveDoLocal, climaEstaVencido, useClima, VALIDADE_DO_CLIMA_MS } from '@/estado/clima';
import { useConfiguracoes } from '@/estado/configuracoes';
import { useDecisoes, type NovaDecisao } from '@/estado/decisoes';
import { useDemandasLocais } from '@/estado/demandas';
import { apagarDadosLocais } from '@/estado/painel';

// A consulta à API é substituída por uma função controlada pelo teste; o resto do módulo é o real.
jest.mock('@/dados/openMeteo', () => ({
  ...jest.requireActual('@/dados/openMeteo'),
  buscarClima: jest.fn(),
}));
const buscarClimaFalso = buscarClima as jest.MockedFunction<typeof buscarClima>;

const HOJE = '2026-11-11';
const CAMPINAS: Territorio = { nome: 'Campinas', estado: 'São Paulo', latitude: -22.90556, longitude: -47.06083 };

function climaDe(local: string, obtidoEm = new Date().toISOString()): DadosClima {
  return {
    dias: [
      {
        data: HOJE,
        chuva: local === 'campinas' ? 9 : 1,
        probabilidadeChuva: 50,
        sensacaoMaxima: 27,
        temperaturaMaxima: 26,
        temperaturaMinima: 18,
      },
    ],
    hoje: HOJE,
    latitude: 0,
    longitude: 0,
    fuso: 'America/Sao_Paulo',
    obtidoEm,
  };
}

/** Espera as gravações assíncronas do armazenamento terminarem. */
const aguardarGravacao = () => new Promise((resolver) => setTimeout(resolver, 0));

beforeEach(async () => {
  apagarDadosLocais();
  await aguardarGravacao();
  buscarClimaFalso.mockReset();
});

describe('configurações', () => {
  test('limites personalizados podem ser definidos e restaurados por indicador', () => {
    const { definirLimiares, restaurarLimiares } = useConfiguracoes.getState();
    definirLimiares('ocupacao_ecoponto', { atencao: 60, alerta: 80, critico: 90 });
    definirLimiares('carga_rede', { atencao: 75, alerta: 85, critico: 95 });
    expect(Object.keys(useConfiguracoes.getState().limiares)).toEqual(['ocupacao_ecoponto', 'carga_rede']);

    restaurarLimiares('ocupacao_ecoponto');
    expect(useConfiguracoes.getState().limiares).toEqual({ carga_rede: { atencao: 75, alerta: 85, critico: 95 } });
  });

  test('cenário, aparência, responsável e aviso inicial', () => {
    const estado = useConfiguracoes.getState();
    estado.proximoCenario();
    estado.proximoCenario();
    expect(useConfiguracoes.getState().cenario).toBe(2);
    estado.restaurarCenario();
    expect(useConfiguracoes.getState().cenario).toBe(0);

    estado.definirAparencia('escuro');
    estado.lembrarResponsavel('  Coordenação da Defesa Civil ');
    estado.marcarAvisoVisto();
    expect(useConfiguracoes.getState()).toMatchObject({
      aparencia: 'escuro',
      responsavel: 'Coordenação da Defesa Civil',
      avisoInicialVisto: true,
    });
  });

  test('as configurações são gravadas no aparelho e lidas de volta', async () => {
    useConfiguracoes.getState().definirTerritorio(CAMPINAS);
    await aguardarGravacao();

    const gravado = JSON.parse((await AsyncStorage.getItem(CHAVES.configuracoes)) as string);
    expect(gravado.state.territorio.nome).toBe('Campinas');
    // Só os dados são gravados, não as funções.
    expect(gravado.state.definirTerritorio).toBeUndefined();

    // Simula o app sendo reaberto: o estado em memória volta ao padrão e é recarregado do aparelho.
    useConfiguracoes.setState({ territorio: TERRITORIO_PADRAO });
    await AsyncStorage.setItem(CHAVES.configuracoes, JSON.stringify(gravado));
    await useConfiguracoes.persist.rehydrate();
    expect(useConfiguracoes.getState().territorio.nome).toBe('Campinas');
  });
});

describe('solicitações', () => {
  const nova = {
    titulo: '  Poste apagado na praça  ',
    categoria: 'iluminacao' as const,
    prioridade: 'media' as const,
    setorId: 'centro',
    descricao: ' Poste sem luz há uma semana. ',
  };

  test('registrar cria uma solicitação local, aberta, com os textos limpos', () => {
    const criada = useDemandasLocais.getState().registrar(nova, HOJE);
    expect(criada).toMatchObject({
      titulo: 'Poste apagado na praça',
      descricao: 'Poste sem luz há uma semana.',
      status: 'aberta',
      criadaEm: HOJE,
      resolvidaEm: null,
      origem: 'local',
    });
    expect(useDemandasLocais.getState().locais).toEqual([criada]);
  });

  test('as mais novas entram no começo e os identificadores não se repetem', () => {
    const { registrar } = useDemandasLocais.getState();
    const primeira = registrar(nova, HOJE);
    const segunda = registrar({ ...nova, titulo: 'Buraco na via principal' }, HOJE);
    expect(useDemandasLocais.getState().locais.map((d) => d.id)).toEqual([segunda.id, primeira.id]);
    expect(primeira.id).not.toBe(segunda.id);
  });

  test('mudar o status de uma solicitação local registra (ou limpa) a data de resolução', () => {
    const { registrar, alterarStatus } = useDemandasLocais.getState();
    const criada = registrar(nova, '2026-11-09');

    alterarStatus(criada, 'resolvida', HOJE);
    expect(useDemandasLocais.getState().locais[0]).toMatchObject({ status: 'resolvida', resolvidaEm: HOJE });

    alterarStatus(criada, 'aberta', HOJE);
    expect(useDemandasLocais.getState().locais[0]).toMatchObject({ status: 'aberta', resolvidaEm: null });
  });

  test('em solicitações sintéticas, só o ajuste de status é guardado', () => {
    const sintetica: Demanda = {
      id: 'sintetica-0-centro-3-0',
      titulo: 'Buraco na pista',
      categoria: 'buraco',
      prioridade: 'baixa',
      setorId: 'centro',
      descricao: 'Registro sintético.',
      status: 'aberta',
      criadaEm: '2026-11-08',
      resolvidaEm: null,
      origem: 'sintetica',
    };
    useDemandasLocais.getState().alterarStatus(sintetica, 'em_andamento', HOJE);
    expect(useDemandasLocais.getState().locais).toHaveLength(0);
    expect(useDemandasLocais.getState().ajustes).toEqual({
      'sintetica-0-centro-3-0': { status: 'em_andamento', resolvidaEm: null },
    });
  });
});

describe('diário de decisões', () => {
  const nova: NovaDecisao = {
    chaveAlerta: 'ocupacao_ecoponto--baixada--critico',
    alerta: {
      titulo: 'Ecoponto — Baixada do Córrego Verde: deve chegar a 95% em 2 dias',
      resumo: 'Hoje está em 89,3%.',
      nivel: 'critico',
      tema: 'residuos',
      setorNome: 'Baixada do Córrego Verde',
      confianca: 89,
      nivelConfianca: 'alta',
    },
    tipo: 'adotar_recomendacao',
    medida: ' Antecipar a coleta do ecoponto ',
    impacto: 'medio',
    justificativa: ' Equipe disponível amanhã cedo. ',
    responsavel: ' Coordenação de Limpeza Urbana ',
    validacaoHumanaConfirmada: false,
  };

  test('registrar guarda a decisão com data, identificador e textos limpos', () => {
    const agora = new Date('2026-11-11T15:30:00Z');
    const registrada = useDecisoes.getState().registrar(nova, agora);
    expect(registrada.registradaEm).toBe('2026-11-11T15:30:00.000Z');
    expect(registrada.id).toMatch(/^decisao-/);
    expect(registrada).toMatchObject({
      medida: 'Antecipar a coleta do ecoponto',
      justificativa: 'Equipe disponível amanhã cedo.',
      responsavel: 'Coordenação de Limpeza Urbana',
    });
  });

  test('a decisão mais recente fica no topo e o diário sobrevive ao reinício do app', async () => {
    const { registrar } = useDecisoes.getState();
    registrar(nova, new Date('2026-11-10T10:00:00Z'));
    const segunda = registrar({ ...nova, tipo: 'monitorar', impacto: null }, new Date('2026-11-11T10:00:00Z'));
    expect(useDecisoes.getState().decisoes[0].id).toBe(segunda.id);
    await aguardarGravacao();

    const gravado = await AsyncStorage.getItem(CHAVES.decisoes);
    useDecisoes.setState({ decisoes: [] });
    await AsyncStorage.setItem(CHAVES.decisoes, gravado as string);
    await useDecisoes.persist.rehydrate();
    expect(useDecisoes.getState().decisoes).toHaveLength(2);
    expect(useDecisoes.getState().decisoes[0].tipo).toBe('monitorar');
  });
});

describe('clima', () => {
  test('sucesso: guarda os dados e o território a que se referem', async () => {
    buscarClimaFalso.mockResolvedValueOnce(climaDe('sp'));
    await useClima.getState().carregar(TERRITORIO_PADRAO);

    expect(buscarClimaFalso).toHaveBeenCalledWith(TERRITORIO_PADRAO.latitude, TERRITORIO_PADRAO.longitude);
    expect(useClima.getState()).toMatchObject({ situacao: 'sucesso', erro: null, local: '-23.55,-46.63' });
    expect(useClima.getState().dados?.dias[0].chuva).toBe(1);
  });

  test('dados recentes não são consultados de novo, a menos que se force', async () => {
    buscarClimaFalso.mockResolvedValue(climaDe('sp'));
    const { carregar } = useClima.getState();
    await carregar(TERRITORIO_PADRAO);
    await carregar(TERRITORIO_PADRAO);
    expect(buscarClimaFalso).toHaveBeenCalledTimes(1);

    await carregar(TERRITORIO_PADRAO, { forcar: true });
    expect(buscarClimaFalso).toHaveBeenCalledTimes(2);
  });

  test('erro: avisa e mantém a última previsão do MESMO território', async () => {
    buscarClimaFalso.mockResolvedValueOnce(climaDe('sp'));
    await useClima.getState().carregar(TERRITORIO_PADRAO);

    buscarClimaFalso.mockRejectedValueOnce(new ErroDeApi('rede', 'Sem conexão com o serviço de clima.'));
    await useClima.getState().carregar(TERRITORIO_PADRAO, { forcar: true });

    expect(useClima.getState().situacao).toBe('erro');
    expect(useClima.getState().erro).toBe('Sem conexão com o serviço de clima.');
    expect(useClima.getState().dados?.dias[0].chuva).toBe(1);
  });

  test('ao trocar de território, o clima antigo some antes de a nova consulta terminar', async () => {
    buscarClimaFalso.mockResolvedValueOnce(climaDe('sp'));
    await useClima.getState().carregar(TERRITORIO_PADRAO);

    buscarClimaFalso.mockRejectedValueOnce(new ErroDeApi('rede', 'Sem conexão.'));
    await useClima.getState().carregar(CAMPINAS);

    // Falhou para Campinas: melhor ficar sem clima do que mostrar o de São Paulo como se fosse de lá.
    expect(useClima.getState().dados).toBeNull();
    expect(useClima.getState().local).toBe(chaveDoLocal(CAMPINAS));
  });

  test('a resposta de uma consulta antiga não sobrescreve a do território atual', async () => {
    let responderSaoPaulo: (dados: DadosClima) => void = () => {};
    buscarClimaFalso.mockImplementationOnce(() => new Promise((resolver) => (responderSaoPaulo = resolver)));
    buscarClimaFalso.mockResolvedValueOnce(climaDe('campinas'));

    const consultaAntiga = useClima.getState().carregar(TERRITORIO_PADRAO);
    await useClima.getState().carregar(CAMPINAS);
    responderSaoPaulo(climaDe('sp'));
    await consultaAntiga;

    expect(useClima.getState().local).toBe(chaveDoLocal(CAMPINAS));
    expect(useClima.getState().dados?.dias[0].chuva).toBe(9);
    expect(useClima.getState().situacao).toBe('sucesso');
  });

  test('só a previsão é persistida — "carregando" e "erro" valem para a sessão', async () => {
    buscarClimaFalso.mockResolvedValueOnce(climaDe('sp'));
    await useClima.getState().carregar(TERRITORIO_PADRAO);
    await aguardarGravacao();
    const gravado = JSON.parse((await AsyncStorage.getItem(CHAVES.clima)) as string);
    expect(Object.keys(gravado.state).sort()).toEqual(['dados', 'local']);
  });

  test('validade da previsão guardada', () => {
    const agora = Date.parse('2026-11-11T12:00:00Z');
    expect(climaEstaVencido(null, agora)).toBe(true);
    expect(climaEstaVencido(climaDe('sp', '2026-11-11T11:45:00Z'), agora)).toBe(false);
    expect(climaEstaVencido(climaDe('sp', new Date(agora - VALIDADE_DO_CLIMA_MS - 1000).toISOString()), agora)).toBe(
      true,
    );
    expect(climaEstaVencido(climaDe('sp', 'data inválida'), agora)).toBe(true);
  });
});

test('apagar os dados locais devolve todas as lojas ao estado inicial', async () => {
  useConfiguracoes.getState().definirTerritorio(CAMPINAS);
  useConfiguracoes.getState().definirLimiares('carga_rede', { atencao: 75, alerta: 85, critico: 95 });
  useDemandasLocais.getState().registrar(
    {
      titulo: 'Poste apagado',
      categoria: 'iluminacao',
      prioridade: 'alta',
      setorId: 'centro',
      descricao: 'Sem luz há dias.',
    },
    HOJE,
  );
  buscarClimaFalso.mockResolvedValueOnce(climaDe('campinas'));
  await useClima.getState().carregar(CAMPINAS);

  apagarDadosLocais();
  await aguardarGravacao();

  expect(useConfiguracoes.getState()).toMatchObject({ territorio: TERRITORIO_PADRAO, limiares: {}, cenario: 0 });
  expect(useDemandasLocais.getState()).toMatchObject({ locais: [], ajustes: {} });
  expect(useDecisoes.getState().decisoes).toEqual([]);
  expect(useClima.getState()).toMatchObject({ dados: null, local: null, situacao: 'ocioso' });

  const gravado = JSON.parse((await AsyncStorage.getItem(CHAVES.demandas)) as string);
  expect(gravado.state.locais).toEqual([]);
});
