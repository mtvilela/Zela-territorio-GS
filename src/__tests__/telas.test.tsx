/**
 * Teste de fumaça das telas. Monta as ROTAS REAIS do app (pasta src/app) com o utilitário de testes
 * do Expo Router, no ambiente nativo do Jest — o mesmo conjunto de componentes do Android e do iOS.
 * Pega erros que não aparecem na web, como texto solto fora de <Text> ou uma tela que quebra ao abrir.
 */
import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { buscarClima, buscarMunicipios, ErroDeApi, type DadosClima } from '@/dados/openMeteo';
import { useConfiguracoes } from '@/estado/configuracoes';
import { useDecisoes } from '@/estado/decisoes';
import { useDemandasLocais } from '@/estado/demandas';
import { apagarDadosLocais } from '@/estado/painel';
import { hojeISO, somarDias } from '@/utils/datas';

// As chamadas à API pública são trocadas por respostas fixas: os testes não dependem de internet.
jest.mock('@/dados/openMeteo', () => ({
  ...jest.requireActual('@/dados/openMeteo'),
  buscarClima: jest.fn(),
  buscarMunicipios: jest.fn(),
}));
const buscarClimaFalso = buscarClima as jest.MockedFunction<typeof buscarClima>;
const buscarMunicipiosFalso = buscarMunicipios as jest.MockedFunction<typeof buscarMunicipios>;

/** 14 dias passados + 7 previstos, com chuva forte daqui a 2 dias (gera um alerta de clima). */
function climaDeTeste(): DadosClima {
  const hoje = hojeISO();
  return {
    dias: Array.from({ length: 21 }, (_, i) => ({
      data: somarDias(hoje, i - 14),
      chuva: i === 16 ? 68 : (i * 7) % 11,
      probabilidadeChuva: i === 16 ? 90 : 40,
      sensacaoMaxima: 24 + (i % 5),
      temperaturaMaxima: 23 + (i % 5),
      temperaturaMinima: 15,
    })),
    hoje,
    latitude: -23.55,
    longitude: -46.63,
    fuso: 'America/Sao_Paulo',
    obtidoEm: new Date().toISOString(),
  };
}

// A primeira tela carrega o app inteiro; em máquina lenta ou sem cache isso passa do limite padrão de 5 s.
jest.setTimeout(30_000);

const ALERTA = 'ocupacao_ecoponto--baixada--critico';

async function abrir(rota: string, testID: string) {
  const resultado = await renderRouter('src/app', { initialUrl: rota });
  await waitFor(() => expect(screen.getByTestId(testID)).toBeOnTheScreen(), { timeout: 20_000 });
  return resultado;
}

beforeEach(() => {
  apagarDadosLocais();
  buscarClimaFalso.mockReset();
  buscarClimaFalso.mockResolvedValue(climaDeTeste());
  buscarMunicipiosFalso.mockReset();
});

describe('todas as rotas abrem sem erro', () => {
  test.each([
    ['/', 'tela-painel'],
    ['/alertas', 'tela-alertas'],
    ['/demandas', 'tela-demandas'],
    ['/decisoes', 'tela-decisoes'],
    ['/ajustes', 'tela-ajustes'],
    ['/tema/clima', 'tela-tema-clima'],
    ['/tema/agua', 'tela-tema-agua'],
    ['/tema/energia', 'tela-tema-energia'],
    ['/tema/residuos', 'tela-tema-residuos'],
    ['/tema/servicos', 'tela-tema-servicos'],
    [`/alerta/${ALERTA}`, 'tela-alerta'],
    [`/decisao/${ALERTA}`, 'tela-decisao'],
    ['/demanda/nova', 'tela-nova-demanda'],
    ['/territorio', 'tela-territorio'],
    ['/limiares', 'tela-limiares'],
    ['/privacidade', 'tela-privacidade'],
    ['/fontes', 'tela-fontes'],
  ])('%s', async (rota, testID) => {
    await abrir(rota, testID);
  });

  test('endereços inválidos caem em telas de aviso, sem quebrar', async () => {
    await renderRouter('src/app', { initialUrl: '/tema/inexistente' });
    expect(await screen.findByText('Tema não encontrado')).toBeOnTheScreen();
  });

  test('alerta que não existe mais mostra a explicação', async () => {
    await renderRouter('src/app', { initialUrl: '/alerta/nao-existe' });
    expect(await screen.findByText('Este alerta não está mais ativo')).toBeOnTheScreen();
  });
});

describe('painel', () => {
  test('mostra os alertas do cenário padrão e os cinco temas', async () => {
    await abrir('/', 'tela-painel');
    expect(screen.getByText('Alertas aguardando decisão')).toBeOnTheScreen();
    // 7 alertas sintéticos do cenário padrão + 1 de chuva forte vindo do clima de teste.
    expect(await screen.findByLabelText('8 alertas aguardando decisão')).toBeOnTheScreen();
    for (const tema of ['clima', 'agua', 'energia', 'residuos', 'servicos']) {
      expect(screen.getByTestId(`cartao-tema-${tema}`)).toBeOnTheScreen();
    }
  });

  test('sem conexão, avisa e continua funcionando com os dados sintéticos', async () => {
    buscarClimaFalso.mockReset();
    buscarClimaFalso.mockRejectedValue(new Error('offline'));
    await abrir('/', 'tela-painel');
    expect(await screen.findByText('Sem dados de clima')).toBeOnTheScreen();
    expect(await screen.findByLabelText('7 alertas aguardando decisão')).toBeOnTheScreen();
  });
});

describe('fluxo de decisão', () => {
  test('do alerta ao diário: valida, registra e confirma', async () => {
    const usuario = userEvent.setup();
    const { getPathname } = await abrir(`/alerta/${ALERTA}`, 'tela-alerta');

    await usuario.press(screen.getByTestId('botao-registrar-decisao'));
    await waitFor(() => expect(screen.getByTestId('tela-decisao')).toBeOnTheScreen());

    // Salvar vazio: nada é registrado e os erros aparecem.
    await usuario.press(screen.getByTestId('botao-salvar-decisao'));
    expect(await screen.findByText('Escolha o tipo de decisão.')).toBeOnTheScreen();
    expect(useDecisoes.getState().decisoes).toHaveLength(0);

    // Medida de alto impacto sem confirmação humana: bloqueado.
    await usuario.press(screen.getByRole('radio', { name: /Adotar uma medida sugerida/ }));
    await usuario.press(screen.getByRole('radio', { name: /fechamento temporário/ }));
    await usuario.type(
      screen.getByTestId('campo-justificativa'),
      'Ocupação projetada acima de 95% em dois dias; a coleta extra não cabe na agenda.',
    );
    await usuario.type(screen.getByTestId('campo-responsavel'), 'Coordenação de Limpeza Urbana');
    await usuario.press(screen.getByTestId('botao-salvar-decisao'));
    expect(await screen.findByText('Confirme que a medida foi validada pela equipe responsável.')).toBeOnTheScreen();
    expect(useDecisoes.getState().decisoes).toHaveLength(0);

    // Com a confirmação, a decisão é registrada e a tela mostra o que foi guardado.
    await usuario.press(screen.getByRole('switch', { name: 'Confirmo a validação humana' }));
    await usuario.press(screen.getByTestId('botao-salvar-decisao'));
    await waitFor(() => expect(screen.getByTestId('tela-decisao-registrada')).toBeOnTheScreen());

    const [decisao] = useDecisoes.getState().decisoes;
    expect(useDecisoes.getState().decisoes).toHaveLength(1);
    expect(decisao).toMatchObject({
      chaveAlerta: ALERTA,
      tipo: 'adotar_recomendacao',
      impacto: 'alto',
      validacaoHumanaConfirmada: true,
      responsavel: 'Coordenação de Limpeza Urbana',
    });

    // Volta para o alerta, que agora mostra a decisão registrada.
    await usuario.press(screen.getByTestId('botao-voltar-ao-alerta'));
    await waitFor(() => expect(getPathname()).toBe(`/alerta/${ALERTA}`));
    expect(await screen.findByText('Decisões registradas para este alerta')).toBeOnTheScreen();
  });
});

describe('fluxo de solicitação', () => {
  test('barra dados pessoais, registra e entra na fila do setor', async () => {
    const usuario = userEvent.setup();
    await abrir('/demanda/nova', 'tela-nova-demanda');

    await usuario.type(screen.getByTestId('campo-titulo'), 'Boca de lobo entupida');
    await usuario.press(screen.getByRole('radio', { name: 'Alagamento' }));
    await usuario.press(screen.getByRole('radio', { name: 'Alta' }));
    await usuario.press(screen.getByRole('radio', { name: 'Centro' }));
    await usuario.type(screen.getByTestId('campo-descricao'), 'Ligar para (11) 98765-4321 para combinar.');
    await usuario.press(screen.getByTestId('botao-salvar-demanda'));
    expect(await screen.findByText(/O texto parece conter telefone/)).toBeOnTheScreen();
    expect(useDemandasLocais.getState().locais).toHaveLength(0);

    await usuario.clear(screen.getByTestId('campo-descricao'));
    await usuario.type(screen.getByTestId('campo-descricao'), 'Água acumulada cobrindo metade da pista.');
    await usuario.press(screen.getByTestId('botao-salvar-demanda'));
    await waitFor(() => expect(screen.getByTestId('tela-demanda-registrada')).toBeOnTheScreen());

    expect(useDemandasLocais.getState().locais).toHaveLength(1);
    expect(useDemandasLocais.getState().locais[0]).toMatchObject({
      titulo: 'Boca de lobo entupida',
      categoria: 'alagamento',
      prioridade: 'alta',
      setorId: 'centro',
      origem: 'local',
      status: 'aberta',
    });
  });
});

describe('território (consumo da API pública)', () => {
  test('valida o termo, busca, troca o território e consulta o clima do novo local', async () => {
    const usuario = userEvent.setup();
    buscarMunicipiosFalso.mockResolvedValue([
      { id: 1, nome: 'Campinas', estado: 'São Paulo', latitude: -22.91, longitude: -47.06, populacao: 1139047 },
      {
        id: 2,
        nome: 'Campinas do Sul',
        estado: 'Rio Grande do Sul',
        latitude: -27.72,
        longitude: -52.63,
        populacao: null,
      },
    ]);
    await abrir('/territorio', 'tela-territorio');

    // Termo curto demais: a mensagem aparece e nada é enviado.
    await usuario.type(screen.getByTestId('campo-busca'), 'C');
    await usuario.press(screen.getByTestId('botao-buscar'));
    expect(await screen.findByText(/Digite pelo menos 3 letras/)).toBeOnTheScreen();
    expect(buscarMunicipiosFalso).not.toHaveBeenCalled();

    await usuario.type(screen.getByTestId('campo-busca'), 'ampinas');
    await usuario.press(screen.getByTestId('botao-buscar'));
    expect(await screen.findByText('2 resultados')).toBeOnTheScreen();
    expect(buscarMunicipiosFalso).toHaveBeenCalledWith('Campinas');
    expect(screen.getByLabelText('Usar Campinas, São Paulo · 1.139.047 habitantes como território')).toBeOnTheScreen();

    // Escolher um resultado grava o território e dispara a consulta do clima daquele ponto.
    await usuario.press(screen.getByTestId('resultado-0'));
    expect(await screen.findByText('Território alterado')).toBeOnTheScreen();
    expect(useConfiguracoes.getState().territorio).toEqual({
      nome: 'Campinas',
      estado: 'São Paulo',
      latitude: -22.91,
      longitude: -47.06,
    });
    await waitFor(() => expect(buscarClimaFalso).toHaveBeenLastCalledWith(-22.91, -47.06));
  });

  test('falha da API vira aviso com opção de tentar de novo', async () => {
    const usuario = userEvent.setup();
    buscarMunicipiosFalso.mockRejectedValueOnce(new ErroDeApi('rede', 'Sem conexão com a internet.'));
    buscarMunicipiosFalso.mockResolvedValueOnce([]);
    await abrir('/territorio', 'tela-territorio');

    await usuario.type(screen.getByTestId('campo-busca'), 'Xiririca');
    await usuario.press(screen.getByTestId('botao-buscar'));
    expect(await screen.findByText('Não foi possível buscar')).toBeOnTheScreen();
    expect(screen.getByText('Sem conexão com a internet.')).toBeOnTheScreen();

    await usuario.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Nenhum município encontrado')).toBeOnTheScreen();
    // O território não muda quando a busca falha ou não encontra nada.
    expect(useConfiguracoes.getState().territorio.nome).toBe('São Paulo');
  });
});

describe('limites dos alertas (formulário com validação)', () => {
  test('recusa limites fora de ordem, salva os válidos e permite restaurar o padrão', async () => {
    const usuario = userEvent.setup();
    await abrir('/limiares?indicador=ocupacao_ecoponto', 'tela-limiares');
    const preencher = async (nivel: string, valor: string) => {
      await usuario.clear(screen.getByTestId(`campo-limite-${nivel}`));
      await usuario.type(screen.getByTestId(`campo-limite-${nivel}`), valor);
    };

    // Atenção acima do alerta: nada é salvo.
    await preencher('atencao', '90');
    await usuario.press(screen.getByTestId('botao-salvar-limiares'));
    expect(await screen.findByText(/Use valores crescentes/)).toBeOnTheScreen();
    expect(useConfiguracoes.getState().limiares.ocupacao_ecoponto).toBeUndefined();

    // Texto que não é número também é recusado, com a mensagem no próprio campo.
    await preencher('atencao', 'muito');
    await usuario.press(screen.getByTestId('botao-salvar-limiares'));
    expect(await screen.findByText(/Digite um número/)).toBeOnTheScreen();
    expect(useConfiguracoes.getState().limiares.ocupacao_ecoponto).toBeUndefined();

    await preencher('atencao', '75,5');
    await preencher('alerta', '88');
    await preencher('critico', '97');
    await usuario.press(screen.getByTestId('botao-salvar-limiares'));
    expect(await screen.findByText(/salvos\. Os alertas já foram recalculados\./)).toBeOnTheScreen();
    expect(useConfiguracoes.getState().limiares.ocupacao_ecoponto).toEqual({ atencao: 75.5, alerta: 88, critico: 97 });

    await usuario.press(screen.getByRole('button', { name: 'Restaurar padrão' }));
    expect(await screen.findByText(/Limites padrão de .+ restaurados\./)).toBeOnTheScreen();
    expect(useConfiguracoes.getState().limiares.ocupacao_ecoponto).toBeUndefined();
  });
});

describe('gráficos', () => {
  test('o gráfico tem a tabela com os mesmos valores, para quem não pode ler o desenho', async () => {
    const usuario = userEvent.setup();
    await abrir('/tema/residuos', 'tela-tema-residuos');

    // Por padrão o gráfico mostra o setor em pior situação — no cenário padrão, a Baixada do Córrego Verde.
    await usuario.press(screen.getByRole('button', { name: 'Ver tabela de Baixada do Córrego Verde' }));

    expect(screen.getByRole('button', { name: 'Ver gráfico de Baixada do Córrego Verde' })).toBeOnTheScreen();
    expect(screen.queryByRole('adjustable')).toBeNull();
    // 14 dias observados e 7 projetados, cada linha com a descrição completa para o leitor de tela.
    expect(screen.getAllByLabelText(/^\d\d\/\d\d, Observado: /)).toHaveLength(14);
    expect(screen.getAllByLabelText(/^\d\d\/\d\d, Projeção do painel: /)).toHaveLength(7);
  });

  test('tocar em um setor troca o gráfico; o indicador sensível fica oculto onde há poucos domicílios', async () => {
    const usuario = userEvent.setup();
    await abrir('/tema/agua', 'tela-tema-agua');

    // Consumo de água por habitante é o indicador sensível; o Sítio das Palmeiras tem 31 domicílios.
    await usuario.press(screen.getByRole('button', { name: 'Sítio das Palmeiras: dado protegido por privacidade' }));
    expect(await screen.findByText('Dado protegido em Sítio das Palmeiras')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Ver tabela de Sítio das Palmeiras' })).toBeNull();

    // O nível do reservatório não é sensível: o mesmo setor aparece normalmente nesse indicador.
    await usuario.press(screen.getByRole('button', { name: /^Sítio das Palmeiras: \d/ }));
    expect(await screen.findByRole('button', { name: 'Ver tabela de Sítio das Palmeiras' })).toBeOnTheScreen();
  });
});

describe('privacidade', () => {
  test('apagar os dados pede confirmação e limpa tudo o que estava guardado', async () => {
    const usuario = userEvent.setup();
    useConfiguracoes.getState().definirLimiares('chuva_diaria', { atencao: 20, alerta: 40, critico: 80 });
    useDemandasLocais
      .getState()
      .registrar(
        { titulo: 'Bueiro sem tampa', categoria: 'alagamento', prioridade: 'alta', setorId: 'centro', descricao: '' },
        hojeISO(),
      );
    await abrir('/privacidade', 'tela-privacidade');

    // O primeiro toque só abre a confirmação.
    await usuario.press(screen.getByTestId('botao-apagar'));
    expect(useDemandasLocais.getState().locais).toHaveLength(1);

    await usuario.press(screen.getByTestId('botao-confirmar-apagar'));
    expect(await screen.findByText('Dados apagados')).toBeOnTheScreen();
    expect(useDemandasLocais.getState().locais).toHaveLength(0);
    expect(useConfiguracoes.getState().limiares).toEqual({});
  });
});
