import { desvioPadrao, media, mediaMovel, MINIMO_PONTOS, preverSerie, regressaoLinear } from '@/dominio/previsao';
import type { PontoSerie } from '@/dominio/tipos';
import { somarDias } from '@/utils/datas';

/** Monta uma série diária terminando em 2026-11-11 a partir de uma lista de valores. */
function serie(valores: number[]): PontoSerie[] {
  return valores.map((valor, i) => ({ data: somarDias('2026-11-11', i - (valores.length - 1)), valor }));
}

describe('estatísticas básicas', () => {
  test('média e desvio-padrão amostral', () => {
    expect(media([2, 4, 6])).toBe(4);
    expect(desvioPadrao([2, 4, 6])).toBeCloseTo(2, 10);
    expect(desvioPadrao([5])).toBe(0);
  });

  test('média de lista vazia é um erro, não um zero silencioso', () => {
    expect(() => media([])).toThrow();
  });

  test('média móvel usa só os últimos N valores', () => {
    // Mesmo exemplo do teste PrevisaoMediaMovelTest do projeto de POO.
    expect(mediaMovel([10, 20, 30, 40, 50], 3)).toBe(40);
    expect(mediaMovel([10, 20], 5)).toBe(15);
    expect(() => mediaMovel([1, 2, 3], 0)).toThrow();
  });
});

describe('regressão linear', () => {
  test('recupera exatamente uma reta perfeita', () => {
    const reg = regressaoLinear([5, 7, 9, 11, 13]); // y = 5 + 2x
    expect(reg.inclinacao).toBeCloseTo(2, 10);
    expect(reg.intercepto).toBeCloseTo(5, 10);
    expect(reg.r2).toBeCloseTo(1, 10);
    expect(reg.desvioResidual).toBeCloseTo(0, 10);
  });

  test('série constante não tem tendência (R² = 0)', () => {
    const reg = regressaoLinear([8, 8, 8, 8]);
    expect(reg.inclinacao).toBe(0);
    expect(reg.r2).toBe(0);
  });

  test('exige pelo menos dois pontos', () => {
    expect(() => regressaoLinear([1])).toThrow();
  });
});

describe('preverSerie', () => {
  test('se cala quando há menos leituras que o mínimo', () => {
    expect(preverSerie(serie([1, 2, 3, 4, 5, 6]))).toBeNull();
    expect(MINIMO_PONTOS).toBe(7);
  });

  test('extrapola a tendência quando ela é consistente', () => {
    const resultado = preverSerie(serie([10, 12, 14, 16, 18, 20, 22, 24]), { horizonte: 3 });
    expect(resultado).not.toBeNull();
    expect(resultado!.metodo).toBe('tendencia');
    expect(resultado!.pontos.map((p) => p.data)).toEqual(['2026-11-12', '2026-11-13', '2026-11-14']);
    expect(resultado!.pontos.map((p) => Math.round(p.valor))).toEqual([26, 28, 30]);
    expect(resultado!.ajuste.inclinacao).toBeCloseTo(2, 10);
    expect(resultado!.ajuste.pontosUsados).toBe(8);
  });

  test('sem tendência consistente, repete a média recente em vez de extrapolar', () => {
    // Valores oscilando em torno de 50, sem direção.
    const resultado = preverSerie(serie([50, 53, 47, 52, 48, 51, 49, 53, 47, 50]));
    expect(resultado!.metodo).toBe('media_movel');
    expect(resultado!.ajuste.inclinacao).toBe(0);
    const esperado = mediaMovel([52, 48, 51, 49, 53, 47, 50], 7);
    for (const ponto of resultado!.pontos) {
      expect(ponto.valor).toBeCloseTo(esperado, 10);
    }
  });

  test('a faixa provável se alarga quanto mais distante é a projeção', () => {
    const resultado = preverSerie(serie([10, 13, 13, 17, 18, 19, 23, 23, 27, 28]));
    expect(resultado!.metodo).toBe('tendencia');
    const larguras = resultado!.pontos.map((p) => p.superior - p.inferior);
    for (let i = 1; i < larguras.length; i++) {
      expect(larguras[i]).toBeGreaterThan(larguras[i - 1]);
    }
    for (const ponto of resultado!.pontos) {
      expect(ponto.inferior).toBeLessThanOrEqual(ponto.valor);
      expect(ponto.superior).toBeGreaterThanOrEqual(ponto.valor);
    }
  });

  test('respeita os limites físicos do indicador', () => {
    const subindo = preverSerie(serie([80, 83, 86, 89, 92, 95, 98]), { minimo: 0, maximo: 100 });
    expect(Math.max(...subindo!.pontos.map((p) => p.superior))).toBeLessThanOrEqual(100);
    expect(subindo!.pontos[subindo!.pontos.length - 1].valor).toBe(100);

    const caindo = preverSerie(serie([12, 10, 8, 6, 4, 2, 1]), { minimo: 0 });
    expect(Math.min(...caindo!.pontos.map((p) => p.inferior))).toBeGreaterThanOrEqual(0);
  });

  test('usa só a janela mais recente e ordena as leituras por data', () => {
    const valores = [...Array(20).fill(100), 10, 12, 14, 16, 18, 20, 22];
    const embaralhada = serie(valores).reverse();
    const resultado = preverSerie(embaralhada, { janela: 7, horizonte: 1 });
    expect(resultado!.ajuste.pontosUsados).toBe(7);
    expect(resultado!.pontos[0].valor).toBeCloseTo(24, 10);
    expect(resultado!.pontos[0].data).toBe('2026-11-12');
  });
});
