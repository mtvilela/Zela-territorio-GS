import { classificar, piorSituacao, validarLimiares } from '@/dominio/limiares';

describe('classificar', () => {
  const chuva = { atencao: 30, alerta: 50, critico: 100 };
  const reservatorio = { atencao: 50, alerta: 35, critico: 20 };

  test('indicador em que valor alto é ruim (inclui as bordas)', () => {
    expect(classificar(29.9, chuva, 'maior_pior')).toBe('normal');
    expect(classificar(30, chuva, 'maior_pior')).toBe('atencao');
    expect(classificar(50, chuva, 'maior_pior')).toBe('alerta');
    expect(classificar(99.9, chuva, 'maior_pior')).toBe('alerta');
    expect(classificar(100, chuva, 'maior_pior')).toBe('critico');
  });

  test('indicador em que valor baixo é ruim (inclui as bordas)', () => {
    expect(classificar(50.1, reservatorio, 'menor_pior')).toBe('normal');
    expect(classificar(50, reservatorio, 'menor_pior')).toBe('atencao');
    expect(classificar(35, reservatorio, 'menor_pior')).toBe('alerta');
    expect(classificar(20, reservatorio, 'menor_pior')).toBe('critico');
    expect(classificar(0, reservatorio, 'menor_pior')).toBe('critico');
  });
});

test('piorSituacao devolve a mais grave', () => {
  expect(piorSituacao('normal', 'atencao')).toBe('atencao');
  expect(piorSituacao('critico', 'alerta')).toBe('critico');
  expect(piorSituacao('alerta', 'alerta')).toBe('alerta');
});

describe('validarLimiares', () => {
  const faixa = { minimo: 0, maximo: 100 };

  test('aceita limiares ordenados dentro da faixa', () => {
    expect(validarLimiares({ atencao: 70, alerta: 85, critico: 95 }, 'maior_pior', faixa)).toBeNull();
    expect(validarLimiares({ atencao: 50, alerta: 35, critico: 20 }, 'menor_pior', faixa)).toBeNull();
  });

  test('recusa ordem errada para o sentido do indicador', () => {
    expect(validarLimiares({ atencao: 85, alerta: 70, critico: 95 }, 'maior_pior', faixa)).toMatch(/crescentes/);
    expect(validarLimiares({ atencao: 20, alerta: 35, critico: 50 }, 'menor_pior', faixa)).toMatch(/decrescentes/);
    expect(validarLimiares({ atencao: 70, alerta: 70, critico: 95 }, 'maior_pior', faixa)).toMatch(/crescentes/);
  });

  test('recusa valores fora da faixa ou que não são números', () => {
    expect(validarLimiares({ atencao: 70, alerta: 85, critico: 120 }, 'maior_pior', faixa)).toMatch(/entre 0 e 100/);
    expect(validarLimiares({ atencao: NaN, alerta: 85, critico: 95 }, 'maior_pior', faixa)).toMatch(/número/);
  });
});
