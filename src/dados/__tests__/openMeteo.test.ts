import {
  buscarClima,
  buscarMunicipios,
  DIAS_PASSADOS,
  DIAS_PREVISTOS,
  ErroDeApi,
  interpretarBusca,
  interpretarPrevisao,
  mensagemDeErro,
  montarUrlBusca,
  montarUrlPrevisao,
} from '@/dados/openMeteo';

/** Resposta real da Open-Meteo para São Paulo, reduzida a 5 dias. */
const RESPOSTA_PREVISAO = {
  latitude: -23.514938,
  longitude: -46.610504,
  utc_offset_seconds: -10800,
  timezone: 'America/Sao_Paulo',
  daily_units: { time: 'iso8601', precipitation_sum: 'mm' },
  daily: {
    time: ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'],
    precipitation_sum: [0.6, 0.3, 0.7, 12.8, 5.3],
    precipitation_probability_max: [18, 48, 73, 100, 99],
    apparent_temperature_max: [15.6, 24.3, 28.8, 26.6, 29.7],
    temperature_2m_max: [17.2, 23.2, 26.8, 25.7, 25.9],
    temperature_2m_min: [12.8, 12.1, 14.9, 17.3, 17.1],
  },
};

const RESPOSTA_BUSCA = {
  results: [
    {
      id: 3467865,
      name: 'Campinas',
      latitude: -22.90556,
      longitude: -47.06083,
      country_code: 'BR',
      admin1: 'São Paulo',
      population: 1031554,
    },
    { id: 3400310, name: 'Campinas', latitude: -3.76559, longitude: -39.72882, admin1: 'Ceará' },
    { id: 1, name: 'Sem coordenada' },
  ],
};

/** Cria um `fetch` falso que responde com o JSON informado. */
function buscarFalso(corpo: unknown, status = 200): jest.Mock {
  return jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  }));
}

describe('URL da previsão', () => {
  const url = montarUrlPrevisao(-23.550519, -46.633309);

  test('envia a coordenada arredondada (privacidade) e pede só dados diários', () => {
    expect(url).toContain('latitude=-23.55&longitude=-46.63');
    expect(url).not.toContain('550519');
    expect(url).toContain('daily=precipitation_sum,precipitation_probability_max,apparent_temperature_max');
  });

  test('pede histórico e previsão no fuso do território', () => {
    expect(url).toContain(`past_days=${DIAS_PASSADOS}`);
    expect(url).toContain(`forecast_days=${DIAS_PREVISTOS}`);
    expect(url).toContain('timezone=auto');
    expect(url.startsWith('https://api.open-meteo.com/v1/forecast?')).toBe(true);
  });
});

describe('interpretarPrevisao', () => {
  test('converte a resposta no formato do app', () => {
    const dados = interpretarPrevisao(RESPOSTA_PREVISAO, new Date('2026-11-11T15:00:00Z'));
    expect(dados.dias).toHaveLength(5);
    expect(dados.dias[3]).toEqual({
      data: '2026-11-12',
      chuva: 12.8,
      probabilidadeChuva: 100,
      sensacaoMaxima: 26.6,
      temperaturaMaxima: 25.7,
      temperaturaMinima: 17.3,
    });
    expect(dados.fuso).toBe('America/Sao_Paulo');
    expect(dados.obtidoEm).toBe('2026-11-11T15:00:00.000Z');
  });

  test('"hoje" é calculado no fuso do território, não em UTC', () => {
    // 01h00 UTC do dia 12 ainda são 22h00 do dia 11 em São Paulo (UTC−3).
    const dados = interpretarPrevisao(RESPOSTA_PREVISAO, new Date('2026-11-12T01:00:00Z'));
    expect(dados.hoje).toBe('2026-11-11');
  });

  test('ignora dias sem valor de chuva e aceita colunas opcionais ausentes', () => {
    const dados = interpretarPrevisao(
      {
        utc_offset_seconds: 0,
        daily: { time: ['2026-11-10', '2026-11-11'], precipitation_sum: [null, 4.2] },
      },
      new Date('2026-11-11T12:00:00Z'),
    );
    expect(dados.dias).toHaveLength(1);
    expect(dados.dias[0]).toMatchObject({
      data: '2026-11-11',
      chuva: 4.2,
      probabilidadeChuva: null,
      sensacaoMaxima: null,
    });
  });

  test('resposta em formato inesperado vira ErroDeApi', () => {
    for (const invalida of [null, 'texto', {}, { daily: {} }, { daily: { time: [], precipitation_sum: [] } }]) {
      expect(() => interpretarPrevisao(invalida)).toThrow(ErroDeApi);
    }
    expect(() => interpretarPrevisao({ daily: { time: ['2026-11-11'], precipitation_sum: [null] } })).toThrow(
      /formato inesperado/,
    );
  });
});

describe('buscarClima', () => {
  test('consulta a URL certa e devolve os dados interpretados', async () => {
    const buscar = buscarFalso(RESPOSTA_PREVISAO);
    const dados = await buscarClima(-23.55, -46.63, { buscar, agora: new Date('2026-11-11T15:00:00Z') });
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(buscar.mock.calls[0][0]).toBe(montarUrlPrevisao(-23.55, -46.63));
    expect(dados.hoje).toBe('2026-11-11');
    expect(dados.dias).toHaveLength(5);
  });

  test('erro do servidor traz o motivo informado pela API', async () => {
    const buscar = buscarFalso({ error: true, reason: 'Latitude must be in range of -90 to 90°.' }, 400);
    await expect(buscarClima(999, 0, { buscar })).rejects.toMatchObject({
      name: 'ErroDeApi',
      tipo: 'servidor',
      message: expect.stringContaining('erro 400 (Latitude must be in range'),
    });
  });

  test('falha de rede vira mensagem amigável', async () => {
    const buscar = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    await expect(buscarClima(-23.55, -46.63, { buscar })).rejects.toMatchObject({ tipo: 'rede' });
  });

  test('requisição cancelada pelo tempo limite é identificada', async () => {
    const buscar = jest.fn(async () => {
      const erro = new Error('Aborted');
      erro.name = 'AbortError';
      throw erro;
    });
    await expect(buscarClima(-23.55, -46.63, { buscar })).rejects.toMatchObject({ tipo: 'tempo_esgotado' });
  });

  test('corpo que não é JSON vira resposta inválida', async () => {
    const buscar = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    }));
    await expect(buscarClima(-23.55, -46.63, { buscar: buscar as unknown as typeof fetch })).rejects.toMatchObject({
      tipo: 'resposta_invalida',
    });
  });
});

describe('busca de municípios', () => {
  test('a URL codifica o termo e restringe ao Brasil', () => {
    const url = montarUrlBusca('  São José dos Campos ');
    expect(url).toContain('name=S%C3%A3o%20Jos%C3%A9%20dos%20Campos');
    expect(url).toContain('countryCode=BR');
    expect(url).toContain('language=pt');
  });

  test('a URL leva o apóstrofo reto, qualquer que seja o sinal digitado no lugar dele', () => {
    const esperado = "name=Santa%20B%C3%A1rbara%20d'Oeste&";
    expect(montarUrlBusca('Santa Bárbara d’Oeste')).toContain(esperado);
    expect(montarUrlBusca('Santa Bárbara d´Oeste')).toContain(esperado);
  });

  test('interpreta os resultados e descarta os que não têm coordenada', () => {
    const locais = interpretarBusca(RESPOSTA_BUSCA);
    expect(locais).toHaveLength(2);
    expect(locais[0]).toEqual({
      id: 3467865,
      nome: 'Campinas',
      estado: 'São Paulo',
      latitude: -22.90556,
      longitude: -47.06083,
      populacao: 1031554,
    });
    expect(locais[1].populacao).toBeNull();
  });

  test('busca sem resultados devolve lista vazia (a API omite o campo "results")', () => {
    expect(interpretarBusca({ generationtime_ms: 0.3 })).toEqual([]);
    expect(interpretarBusca(null)).toEqual([]);
  });

  test('buscarMunicipios usa o fetch informado', async () => {
    const buscar = buscarFalso(RESPOSTA_BUSCA);
    const locais = await buscarMunicipios('Campinas', { buscar });
    expect(buscar.mock.calls[0][0]).toBe(montarUrlBusca('Campinas'));
    expect(locais.map((l) => l.estado)).toEqual(['São Paulo', 'Ceará']);
  });
});

test('mensagemDeErro usa o texto do ErroDeApi e um texto genérico para o resto', () => {
  expect(mensagemDeErro(new ErroDeApi('rede', 'Sem conexão.'))).toBe('Sem conexão.');
  expect(mensagemDeErro(new Error('detalhe técnico'))).toMatch(/Não foi possível concluir/);
  expect(mensagemDeErro('qualquer coisa')).toMatch(/Não foi possível concluir/);
});
