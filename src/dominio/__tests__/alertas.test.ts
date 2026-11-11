import { INDICADORES, SETORES } from '@/dados/catalogo';
import type { DadosClima, DiaClima } from '@/dados/openMeteo';
import { montarSerieDeSetor, montarSeriesDeClima } from '@/dados/painel';
import { gerarAlertaDeClima, gerarAlertaDeTendencia, gerarAlertas, ordenarAlertas } from '@/dominio/alertas';
import type { PontoSerie } from '@/dominio/tipos';
import { somarDias } from '@/utils/datas';

const HOJE = '2026-11-11';
const centro = SETORES.find((s) => s.id === 'centro')!;
const palmeiras = SETORES.find((s) => s.id === 'palmeiras')!;

function historico(valores: number[]): PontoSerie[] {
  return valores.map((valor, i) => ({ data: somarDias(HOJE, i - (valores.length - 1)), valor }));
}

/** Série que sobe `passo` por dia até chegar a `ultimo` hoje. */
function subindo(ultimo: number, passo: number, dias = 30): number[] {
  return Array.from({ length: dias }, (_, i) => ultimo - passo * (dias - 1 - i));
}

describe('alertas de tendência', () => {
  const ecoponto = INDICADORES.ocupacao_ecoponto; // limites 70 / 85 / 95, maior é pior

  test('alerta PREDITIVO quando a projeção cruza um limite que hoje ainda não foi atingido', () => {
    // Hoje 64,5%, subindo 2 p.p. por dia: passa de 70% em 3 dias.
    const serie = montarSerieDeSetor(ecoponto, centro, historico(subindo(64.5, 2)), ecoponto.limiaresPadrao);
    const alerta = gerarAlertaDeTendencia(serie, HOJE);

    expect(alerta).not.toBeNull();
    expect(alerta!.tipo).toBe('preditivo');
    expect(alerta!.nivel).toBe('atencao');
    expect(alerta!.diasAte).toBe(3);
    expect(alerta!.dataPrevista).toBe('2026-11-14');
    expect(alerta!.titulo).toBe('Ecoponto — Centro: deve chegar a 70% em 3 dias');
    expect(alerta!.chave).toBe('ocupacao_ecoponto--centro--atencao');
  });

  test('todo alerta traz justificativa, confiança, limitações e opções de decisão', () => {
    const serie = montarSerieDeSetor(ecoponto, centro, historico(subindo(64.5, 2)), ecoponto.limiaresPadrao);
    const alerta = gerarAlertaDeTendencia(serie, HOJE)!;

    expect(alerta.justificativa).toHaveLength(4);
    expect(alerta.justificativa[0]).toBe('Hoje, a ocupação do ecoponto no Centro está em 64,5%.');
    expect(alerta.justificativa[1]).toContain('+2,0 p.p. por dia');
    expect(alerta.justificativa[3]).toBe('O limite de atenção configurado para este indicador é 70%.');

    expect(alerta.confianca.pontuacao).toBeGreaterThanOrEqual(5);
    expect(alerta.confianca.pontuacao).toBeLessThanOrEqual(95);
    expect(alerta.confianca.fatores.length).toBeGreaterThanOrEqual(3);

    // Limitações do indicador + do método + aviso de dado sintético + aviso geral.
    expect(alerta.limitacoes.length).toBeGreaterThanOrEqual(4);
    expect(alerta.limitacoes.some((l) => l.includes('sintética'))).toBe(true);
    expect(alerta.limitacoes.some((l) => l.includes('não a substitui'))).toBe(true);

    // No nível de atenção, só opções de impacto baixo e médio.
    expect(alerta.opcoes.length).toBeGreaterThan(0);
    expect(alerta.opcoes.every((o) => o.impacto !== 'alto')).toBe(true);
  });

  test('o nível do alerta é o mais grave atingido dentro do horizonte', () => {
    // Hoje 86,5% (alerta), subindo 3 p.p. por dia: passa de 95% (crítico) em 3 dias.
    const serie = montarSerieDeSetor(ecoponto, centro, historico(subindo(86.5, 3)), ecoponto.limiaresPadrao);
    const alerta = gerarAlertaDeTendencia(serie, HOJE)!;
    expect(alerta.nivel).toBe('critico');
    expect(alerta.tipo).toBe('preditivo');
    expect(alerta.diasAte).toBe(3);
    // No nível crítico aparecem também as medidas de alto impacto.
    expect(alerta.opcoes.some((o) => o.impacto === 'alto')).toBe(true);
  });

  test('alerta EM CURSO quando o limite já foi ultrapassado e a projeção não piora o nível', () => {
    const valores = [74, 76, 75, 77, 74, 76, 75, 77, 74, 76, 75, 77, 74, 76];
    const serie = montarSerieDeSetor(ecoponto, centro, historico(valores), ecoponto.limiaresPadrao);
    const alerta = gerarAlertaDeTendencia(serie, HOJE)!;
    expect(alerta.tipo).toBe('em_curso');
    expect(alerta.nivel).toBe('atencao');
    expect(alerta.diasAte).toBe(0);
    expect(alerta.metodo).toBe('media_movel');
    expect(alerta.titulo).toBe('Ecoponto — Centro: 76,0%, acima do limite de atenção');
    expect(alerta.justificativa[1]).toContain('não mostram tendência consistente');
  });

  test('indicador em que valor baixo é ruim usa o verbo "cair"', () => {
    const reservatorio = INDICADORES.nivel_reservatorio; // limites 50 / 35 / 20, menor é pior
    const valores = subindo(55, -1.5); // caindo 1,5 p.p. por dia
    const serie = montarSerieDeSetor(reservatorio, centro, historico(valores), reservatorio.limiaresPadrao);
    const alerta = gerarAlertaDeTendencia(serie, HOJE)!;
    expect(alerta.nivel).toBe('atencao');
    expect(alerta.titulo).toBe('Reservatório — Centro: deve cair a 50% em 4 dias');
    expect(alerta.justificativa[1]).toContain('−1,5 p.p. por dia');
  });

  test('não há alerta quando tudo está e continuará normal', () => {
    const serie = montarSerieDeSetor(ecoponto, centro, historico(subindo(40, 0.2)), ecoponto.limiaresPadrao);
    expect(gerarAlertaDeTendencia(serie, HOJE)).toBeNull();
  });

  test('o painel se cala quando o histórico é curto demais para prever', () => {
    // Seis leituras subindo rápido: daria alerta, mas não há base para projetar.
    const serie = montarSerieDeSetor(ecoponto, centro, historico([40, 46, 52, 58, 64, 69]), ecoponto.limiaresPadrao);
    expect(serie.previsao).toHaveLength(0);
    expect(gerarAlertaDeTendencia(serie, HOJE)).toBeNull();
  });

  test('série protegida por privacidade nunca gera alerta', () => {
    const consumo = INDICADORES.consumo_agua;
    const serie = montarSerieDeSetor(consumo, palmeiras, historico(subindo(250, 5)), consumo.limiaresPadrao);
    expect(serie.protegido).toBe(true);
    expect(serie.historico).toHaveLength(0);
    expect(gerarAlertaDeTendencia(serie, HOJE)).toBeNull();
  });

  test('limites personalizados pelo gestor mudam o resultado', () => {
    const valores = historico(subindo(64.5, 2));
    const comPadrao = montarSerieDeSetor(ecoponto, centro, valores, ecoponto.limiaresPadrao);
    const maisTolerante = montarSerieDeSetor(ecoponto, centro, valores, { atencao: 90, alerta: 95, critico: 99 });
    expect(gerarAlertaDeTendencia(comPadrao, HOJE)).not.toBeNull();
    expect(gerarAlertaDeTendencia(maisTolerante, HOJE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------

/** Monta uma resposta de clima com 3 dias passados e os dias futuros informados. */
function clima(futuros: Partial<DiaClima>[], passados: Partial<DiaClima>[] = [{}, {}, {}]): DadosClima {
  const dia = (data: string, d: Partial<DiaClima>): DiaClima => ({
    data,
    chuva: 0,
    probabilidadeChuva: 20,
    sensacaoMaxima: 26,
    temperaturaMaxima: 25,
    temperaturaMinima: 17,
    ...d,
  });
  return {
    dias: [
      ...passados.map((d, i) => dia(somarDias(HOJE, i - passados.length), d)),
      ...futuros.map((d, i) => dia(somarDias(HOJE, i), d)),
    ],
    hoje: HOJE,
    latitude: -23.55,
    longitude: -46.63,
    fuso: 'America/Sao_Paulo',
    obtidoEm: '2026-11-11T12:00:00.000Z',
  };
}

describe('alertas de clima', () => {
  test('chuva forte prevista gera alerta com probabilidade e chuva antecedente', () => {
    const dados = clima(
      [{ chuva: 2 }, { chuva: 12 }, { chuva: 64, probabilidadeChuva: 90 }, { chuva: 5 }],
      [{ chuva: 0 }, { chuva: 3 }, { chuva: 20 }],
    );
    const [chuva] = montarSeriesDeClima(dados, {});
    const alerta = gerarAlertaDeClima(chuva, HOJE)!;

    expect(alerta.nivel).toBe('alerta'); // 64\u00A0mm ≥ 50\u00A0mm
    expect(alerta.tipo).toBe('preditivo');
    expect(alerta.diasAte).toBe(2);
    expect(alerta.titulo).toBe('Chuva forte prevista para sexta, 13/11: 64,0\u00A0mm');
    expect(alerta.chave).toBe('chuva_diaria--territorio--alerta--2026-11-13');
    expect(alerta.metodo).toBe('modelo_meteorologico');
    expect(alerta.justificativa.some((j) => j.includes('90%'))).toBe(true);
    // 3 dias anteriores a 13/11: 20 (10/11) + 2 (11/11) + 12 (12/11) = 34\u00A0mm → solo encharcado.
    expect(alerta.justificativa.some((j) => j.includes('34,0\u00A0mm') && j.includes('encharcado'))).toBe(true);
    // Dado público: não leva o aviso de série sintética.
    expect(alerta.limitacoes.some((l) => l.includes('sintética'))).toBe(false);
    expect(alerta.limitacoes.some((l) => l.includes('Defesa Civil'))).toBe(true);
  });

  test('sem chuva relevante prevista, não há alerta', () => {
    const [chuva] = montarSeriesDeClima(clima([{ chuva: 4 }, { chuva: 11 }, { chuva: 29.9 }]), {});
    expect(gerarAlertaDeClima(chuva, HOJE)).toBeNull();
  });

  test('entre dias do mesmo nível, o alerta aponta o de maior valor e cita os outros', () => {
    const [chuva] = montarSeriesDeClima(clima([{ chuva: 35 }, { chuva: 0 }, { chuva: 44 }, { chuva: 31 }]), {});
    const alerta = gerarAlertaDeClima(chuva, HOJE)!;
    expect(alerta.nivel).toBe('atencao');
    expect(alerta.dataPrevista).toBe('2026-11-13');
    expect(alerta.justificativa[alerta.justificativa.length - 1]).toContain(
      '11/11 (35,0\u00A0mm), 14/11 (31,0\u00A0mm)',
    );
  });

  test('chuva prevista para hoje aparece como "hoje"', () => {
    const [chuva] = montarSeriesDeClima(clima([{ chuva: 120, probabilidadeChuva: 95 }, { chuva: 3 }]), {});
    const alerta = gerarAlertaDeClima(chuva, HOJE)!;
    expect(alerta.nivel).toBe('critico');
    expect(alerta.diasAte).toBe(0);
    expect(alerta.titulo).toBe('Chuva extrema prevista para hoje: 120,0\u00A0mm');
    expect(alerta.confianca.nivel).toBe('alta');
  });

  test('calor: conta os dias seguidos acima do limite de atenção', () => {
    const dados = clima([
      { sensacaoMaxima: 30 },
      { sensacaoMaxima: 33 },
      { sensacaoMaxima: 37.5 },
      { sensacaoMaxima: 34 },
      { sensacaoMaxima: 29 },
    ]);
    const [, calor] = montarSeriesDeClima(dados, {});
    const alerta = gerarAlertaDeClima(calor, HOJE)!;
    expect(alerta.nivel).toBe('alerta'); // 37,5 °C ≥ 36 °C
    expect(alerta.titulo).toContain('Calor muito intenso previsto');
    expect(alerta.justificativa.some((j) => j.startsWith('São 3 dias seguidos'))).toBe(true);
    expect(alerta.confianca.fatores.some((f) => f.descricao.includes('3 dias seguidos'))).toBe(true);
  });

  test('dia sem valor de sensação térmica é ignorado, não tratado como zero', () => {
    const dados = clima([{ sensacaoMaxima: null }, { sensacaoMaxima: 28 }]);
    const [, calor] = montarSeriesDeClima(dados, {});
    expect(calor.previsao).toHaveLength(1);
    expect(calor.valorAtual).toBe(28);
  });
});

// ---------------------------------------------------------------------------------------------

test('alertas são ordenados por gravidade, depois por prazo', () => {
  const ecoponto = INDICADORES.ocupacao_ecoponto;
  const series = [
    montarSerieDeSetor(ecoponto, centro, historico(subindo(64.5, 2)), ecoponto.limiaresPadrao), // atenção em 3 dias
    montarSerieDeSetor(ecoponto, SETORES[1], historico(subindo(86.5, 3)), ecoponto.limiaresPadrao), // crítico em 3 dias
    montarSerieDeSetor(ecoponto, SETORES[2], historico(subindo(68.5, 2)), ecoponto.limiaresPadrao), // atenção amanhã
    montarSerieDeSetor(ecoponto, SETORES[3], historico(subindo(30, 0.1)), ecoponto.limiaresPadrao), // normal
  ];
  const alertas = gerarAlertas(series, HOJE);
  expect(alertas.map((a) => `${a.nivel}:${a.diasAte}`)).toEqual(['critico:3', 'atencao:1', 'atencao:3']);
  // ordenarAlertas não altera a lista original.
  const invertida = [...alertas].reverse();
  expect(ordenarAlertas(invertida).map((a) => a.chave)).toEqual(alertas.map((a) => a.chave));
  expect(invertida[0].nivel).toBe('atencao');
});
