import { INDICADORES, ORDEM_TEMAS, SETORES } from '@/dados/catalogo';
import { combinarDemandas } from '@/dados/demandas';
import type { DadosClima } from '@/dados/openMeteo';
import { limiaresEmVigor, montarPainel, resumirTema, serieEmPiorSituacao, seriesDoIndicador } from '@/dados/painel';
import { gerarDemandasSinteticas } from '@/dados/sintetico';
import type { Demanda } from '@/dominio/tipos';
import { somarDias } from '@/utils/datas';

const HOJE = '2026-11-11';

function painelPadrao(hoje = HOJE, extras: Demanda[] = []) {
  const demandas = combinarDemandas(gerarDemandasSinteticas(hoje), {}, extras);
  return montarPainel({ hoje, clima: null, demandas, limiares: {}, cenario: 0 });
}

function climaDeTeste(chuvas: number[]): DadosClima {
  return {
    dias: chuvas.map((chuva, i) => ({
      data: somarDias(HOJE, i - 2),
      chuva,
      probabilidadeChuva: 85,
      sensacaoMaxima: 27,
      temperaturaMaxima: 26,
      temperaturaMinima: 18,
    })),
    hoje: HOJE,
    latitude: -23.55,
    longitude: -46.63,
    fuso: 'America/Sao_Paulo',
    obtidoEm: '2026-11-11T12:00:00.000Z',
  };
}

describe('cenário padrão de demonstração', () => {
  const painel = painelPadrao();

  test('sem clima, há uma série por setor para cada um dos 5 indicadores calculados', () => {
    expect(painel.series).toHaveLength(5 * SETORES.length);
    expect(painel.series.every((s) => s.setor !== null)).toBe(true);
  });

  test('produz exatamente os alertas que a apresentação vai mostrar', () => {
    // Este teste é o "contrato" da demonstração: se alguém mexer no gerador sintético ou nas
    // regras de alerta e a história mudar, ele avisa.
    expect(painel.alertas.map((a) => `${a.chave} ${a.tipo} +${a.diasAte}d`)).toEqual([
      'ocupacao_ecoponto--baixada--critico preditivo +2d',
      'demandas_abertas--baixada--alerta preditivo +3d',
      'nivel_reservatorio--esperanca--alerta preditivo +4d',
      'carga_rede--centro--alerta preditivo +4d',
      'nivel_reservatorio--ribeirao--atencao em_curso +0d',
      'consumo_agua--acacias--atencao preditivo +4d',
      'carga_rede--esperanca--atencao preditivo +6d',
    ]);
  });

  test('os alertas cobrem os três níveis de confiança', () => {
    const niveis = new Set(painel.alertas.map((a) => a.confianca.nivel));
    expect(niveis).toEqual(new Set(['alta', 'media', 'baixa']));
  });

  test('a demonstração é a mesma em qualquer data', () => {
    const outroDia = painelPadrao('2026-11-27');
    expect(outroDia.alertas.map((a) => a.chave)).toEqual(painel.alertas.map((a) => a.chave));
    expect(outroDia.alertas.map((a) => a.confianca.pontuacao)).toEqual(
      painel.alertas.map((a) => a.confianca.pontuacao),
    );
  });

  test('o consumo de água do setor pequeno fica protegido', () => {
    const consumo = seriesDoIndicador(painel.series, 'consumo_agua');
    const protegidas = consumo.filter((s) => s.protegido);
    expect(protegidas.map((s) => s.setor!.id)).toEqual(['palmeiras']);
    expect(protegidas[0].historico).toHaveLength(0);
    expect(painel.alertas.some((a) => a.setorId === 'palmeiras' && a.indicadorId === 'consumo_agua')).toBe(false);
  });
});

describe('efeito das ações do gestor', () => {
  test('registrar solicitações novas aumenta a fila do setor', () => {
    const base = painelPadrao();
    const novas: Demanda[] = Array.from({ length: 5 }, (_, i) => ({
      id: `local-${i}`,
      titulo: 'Buraco na via',
      categoria: 'buraco' as const,
      prioridade: 'media' as const,
      setorId: 'centro',
      descricao: 'Registro de teste.',
      status: 'aberta' as const,
      criadaEm: HOJE,
      resolvidaEm: null,
      origem: 'local' as const,
    }));
    const comNovas = painelPadrao(HOJE, novas);

    const filaAntes = seriesDoIndicador(base.series, 'demandas_abertas').find((s) => s.setor!.id === 'centro')!;
    const filaDepois = seriesDoIndicador(comNovas.series, 'demandas_abertas').find((s) => s.setor!.id === 'centro')!;
    expect(filaDepois.valorAtual).toBe((filaAntes.valorAtual as number) + 5);
  });

  test('limites personalizados valem no lugar dos padrões', () => {
    const personalizados = { ocupacao_ecoponto: { atencao: 97, alerta: 98, critico: 99.9 } };
    expect(limiaresEmVigor('ocupacao_ecoponto', personalizados)).toEqual(personalizados.ocupacao_ecoponto);
    expect(limiaresEmVigor('carga_rede', personalizados)).toEqual(INDICADORES.carga_rede.limiaresPadrao);

    const demandas = combinarDemandas(gerarDemandasSinteticas(HOJE), {}, []);
    const painel = montarPainel({ hoje: HOJE, clima: null, demandas, limiares: personalizados, cenario: 0 });
    const doEcoponto = painel.alertas.filter((a) => a.indicadorId === 'ocupacao_ecoponto');
    // Com limites tão altos, o ecoponto da Baixada deixa de ser "crítico em 2 dias".
    expect(doEcoponto.some((a) => a.chave === 'ocupacao_ecoponto--baixada--critico' && a.diasAte === 2)).toBe(false);
  });

  test('outro cenário sintético conta outra história', () => {
    const demandas = combinarDemandas(gerarDemandasSinteticas(HOJE, 2), {}, []);
    const outro = montarPainel({ hoje: HOJE, clima: null, demandas, limiares: {}, cenario: 2 });
    expect(outro.alertas.map((a) => a.chave)).not.toEqual(painelPadrao().alertas.map((a) => a.chave));
    expect(outro.alertas.length).toBeGreaterThan(0);
  });
});

describe('clima', () => {
  test('com dados da API, entram as duas séries do território e seus alertas', () => {
    const demandas = combinarDemandas(gerarDemandasSinteticas(HOJE), {}, []);
    const painel = montarPainel({
      hoje: HOJE,
      clima: climaDeTeste([5, 0, 3, 72, 10]),
      demandas,
      limiares: {},
      cenario: 0,
    });
    const chuva = seriesDoIndicador(painel.series, 'chuva_diaria');
    expect(chuva).toHaveLength(1);
    expect(chuva[0].setor).toBeNull();
    expect(chuva[0].historico.map((p) => p.valor)).toEqual([5, 0]);
    expect(chuva[0].previsao.map((p) => p.valor)).toEqual([3, 72, 10]);
    expect(chuva[0].metodo).toBe('modelo_meteorologico');

    const alertaDeChuva = painel.alertas.find((a) => a.indicadorId === 'chuva_diaria')!;
    expect(alertaDeChuva.nivel).toBe('alerta');
    expect(alertaDeChuva.dataPrevista).toBe('2026-11-12');
    expect(alertaDeChuva.origem).toBe('publica');
  });
});

describe('consultas das telas', () => {
  const painel = painelPadrao();

  test('serieEmPiorSituacao escolhe o setor em pior estado', () => {
    const ecopontos = seriesDoIndicador(painel.series, 'ocupacao_ecoponto');
    expect(serieEmPiorSituacao(ecopontos)!.setor!.id).toBe('baixada');

    // Em indicador "menor é pior", o destaque é o menor valor entre os de mesma situação.
    const reservatorios = seriesDoIndicador(painel.series, 'nivel_reservatorio');
    expect(serieEmPiorSituacao(reservatorios)!.setor!.id).toBe('esperanca');
    expect(serieEmPiorSituacao([])).toBeNull();
  });

  test('resumirTema traz o destaque e o alerta mais grave de cada tema', () => {
    const residuos = resumirTema('residuos', painel);
    expect(residuos.situacao).toBe('critico');
    expect(residuos.destaque!.setor!.id).toBe('baixada');
    expect(residuos.alertas).toHaveLength(1);

    const clima = resumirTema('clima', painel);
    expect(clima.semDados).toBe(true);
    expect(clima.situacao).toBe('normal');

    expect(ORDEM_TEMAS.map((tema) => resumirTema(tema, painel).tema)).toEqual(ORDEM_TEMAS);
  });
});
