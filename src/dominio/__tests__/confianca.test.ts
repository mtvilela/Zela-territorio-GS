import {
  confiancaClima,
  confiancaTendencia,
  nivelDeConfianca,
  PONTUACAO_BASE,
  PONTUACAO_MAXIMA,
  PONTUACAO_MINIMA,
} from '@/dominio/confianca';

test('faixas dos níveis de confiança', () => {
  expect(nivelDeConfianca(44)).toBe('baixa');
  expect(nivelDeConfianca(45)).toBe('media');
  expect(nivelDeConfianca(69)).toBe('media');
  expect(nivelDeConfianca(70)).toBe('alta');
});

describe('confiança de alertas de tendência', () => {
  test('histórico longo, tendência firme e prazo curto dão confiança alta', () => {
    const c = confiancaTendencia({
      pontosNoHistorico: 30,
      metodo: 'tendencia',
      r2: 0.97,
      coeficienteVariacao: 0.1,
      tipo: 'preditivo',
      diasAte: 2,
      faixaInteiraAlemDoLimite: true,
    });
    expect(c.nivel).toBe('alta');
    expect(c.pontuacao).toBe(89); // 35 + 10 + 18 + 14 + 12
  });

  test('histórico curto, tendência fraca e prazo longo dão confiança baixa', () => {
    const c = confiancaTendencia({
      pontosNoHistorico: 9,
      metodo: 'tendencia',
      r2: 0.35,
      coeficienteVariacao: 0.2,
      tipo: 'preditivo',
      diasAte: 6,
      faixaInteiraAlemDoLimite: false,
    });
    expect(c.nivel).toBe('baixa');
    expect(c.pontuacao).toBe(12); // 35 − 12 + 2 − 5 − 8
  });

  test('a pontuação é a base mais a soma dos fatores mostrados ao usuário', () => {
    const c = confiancaTendencia({
      pontosNoHistorico: 20,
      metodo: 'media_movel',
      r2: 0.1,
      coeficienteVariacao: 0.08,
      tipo: 'em_curso',
      diasAte: 0,
      faixaInteiraAlemDoLimite: false,
    });
    const soma = c.fatores.reduce((total, f) => total + f.efeito, PONTUACAO_BASE);
    expect(c.pontuacao).toBe(soma);
    expect(c.fatores).toHaveLength(4);
    for (const fator of c.fatores) {
      expect(fator.descricao.length).toBeGreaterThan(10);
    }
  });

  test('nunca chega a 100 nem a 0: nenhuma previsão é certa', () => {
    const maxima = confiancaTendencia({
      pontosNoHistorico: 365,
      metodo: 'tendencia',
      r2: 1,
      coeficienteVariacao: 0,
      tipo: 'em_curso',
      diasAte: 0,
      faixaInteiraAlemDoLimite: true,
    });
    expect(maxima.pontuacao).toBeLessThanOrEqual(PONTUACAO_MAXIMA);

    const minima = confiancaClima({ diasAte: 6, probabilidade: 10, razaoSobreLimite: 1.01 });
    expect(minima.pontuacao).toBeGreaterThanOrEqual(PONTUACAO_MINIMA);
    expect(minima.nivel).toBe('baixa');
  });
});

describe('confiança de alertas de clima', () => {
  test('chuva para amanhã, provável e bem acima do limite: alta', () => {
    const c = confiancaClima({ diasAte: 1, probabilidade: 90, razaoSobreLimite: 1.4 });
    expect(c.pontuacao).toBe(90); // 35 + 25 + 20 + 10
    expect(c.nivel).toBe('alta');
  });

  test('chuva distante, incerta e rente ao limite: baixa', () => {
    const c = confiancaClima({ diasAte: 5, probabilidade: 49, razaoSobreLimite: 1.02 });
    expect(c.pontuacao).toBe(27); // 35 + 0 + 0 − 8
    expect(c.nivel).toBe('baixa');
  });

  test('calor não tem probabilidade, mas ganha pontos por dias seguidos', () => {
    const isolado = confiancaClima({ diasAte: 2, probabilidade: null, razaoSobreLimite: 1.15, diasConsecutivos: 1 });
    const sequencia = confiancaClima({ diasAte: 2, probabilidade: null, razaoSobreLimite: 1.15, diasConsecutivos: 3 });
    expect(sequencia.pontuacao - isolado.pontuacao).toBe(8);
    expect(isolado.fatores.some((f) => f.descricao.includes('Probabilidade'))).toBe(false);
  });
});
