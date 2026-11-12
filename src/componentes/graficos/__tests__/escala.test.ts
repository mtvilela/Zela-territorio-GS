import {
  calcularEixo,
  casasDasMarcas,
  escalaLinear,
  limitesVisiveis,
  passoAgradavel,
  posicionarRotulos,
} from '@/componentes/graficos/escala';

test('passoAgradavel escolhe passos redondos', () => {
  expect(passoAgradavel(100, 4)).toBe(25);
  expect(passoAgradavel(60, 4)).toBe(20);
  expect(passoAgradavel(7, 4)).toBe(2);
  expect(passoAgradavel(0.9, 4)).toBeCloseTo(0.25, 10);
  expect(passoAgradavel(0, 4)).toBe(1);
});

describe('calcularEixo', () => {
  test('envolve os dados com marcas redondas', () => {
    const eixo = calcularEixo([46.2, 61, 89.6, 100]);
    expect(eixo.minimo).toBe(40);
    expect(eixo.maximo).toBe(100);
    expect(eixo.marcas).toEqual([40, 60, 80, 100]);
  });

  test('colunas incluem o zero', () => {
    const eixo = calcularEixo([0.7, 12.8, 21.1, 30], { incluirZero: true });
    expect(eixo.minimo).toBe(0);
    expect(eixo.marcas[0]).toBe(0);
    expect(eixo.maximo).toBeGreaterThanOrEqual(30);
  });

  test('respeita piso e teto físicos', () => {
    const eixo = calcularEixo([2, 3, 98, 99.5], { piso: 0, teto: 100 });
    expect(eixo.minimo).toBe(0);
    expect(eixo.maximo).toBe(100);
  });

  test('série constante ou vazia ainda produz um eixo válido', () => {
    const constante = calcularEixo([50, 50, 50]);
    expect(constante.maximo).toBeGreaterThan(constante.minimo);
    expect(constante.marcas.length).toBeGreaterThanOrEqual(2);

    const vazio = calcularEixo([]);
    expect(vazio.maximo).toBeGreaterThan(vazio.minimo);
  });

  test('marcas não acumulam erro de ponto flutuante', () => {
    const eixo = calcularEixo([0.1, 0.35, 0.72]);
    for (const marca of eixo.marcas) {
      expect(String(marca).length).toBeLessThanOrEqual(5);
    }
  });
});

describe('limitesVisiveis', () => {
  const ecoponto = { atencao: 70, alerta: 85, critico: 95 };

  test('o limite de atenção sempre aparece', () => {
    expect(limitesVisiveis([20, 25, 27], ecoponto)).toEqual(['atencao']);
  });

  test('os demais aparecem quando estão perto dos dados', () => {
    expect(limitesVisiveis([46, 70, 89, 100], ecoponto)).toEqual(['atencao', 'alerta', 'critico']);
    expect(limitesVisiveis([60, 66, 72], ecoponto)).toEqual(['atencao']);
  });

  test('funciona para indicadores em que valor baixo é ruim', () => {
    const reservatorio = { atencao: 50, alerta: 35, critico: 20 };
    expect(limitesVisiveis([64, 52, 40, 31], reservatorio)).toEqual(['atencao', 'alerta', 'critico']);
    expect(limitesVisiveis([72, 73, 71], reservatorio)).toEqual(['atencao']);
  });
});

test('escalaLinear mapeia o domínio para pixels (inclusive eixo invertido)', () => {
  const y = escalaLinear(0, 100, 180, 0); // 0 embaixo, 100 em cima
  expect(y(0)).toBe(180);
  expect(y(100)).toBe(0);
  expect(y(50)).toBe(90);
  // Domínio degenerado não gera divisão por zero.
  expect(Number.isFinite(escalaLinear(5, 5, 0, 100)(5))).toBe(true);
});

test('casasDasMarcas usa o mínimo de casas decimais', () => {
  expect(casasDasMarcas([0, 20, 40])).toBe(0);
  expect(casasDasMarcas([0, 2.5, 5])).toBe(1);
  expect(casasDasMarcas([0, 0.25, 0.5])).toBe(2);
});

describe('posicionarRotulos', () => {
  const candidatos = (centros: number[]) =>
    centros.map((centro, i) => ({ indice: i, texto: i === 0 ? 'hoje' : '18/11', centro }));

  test('mantém todos quando há espaço', () => {
    const rotulos = posicionarRotulos(candidatos([200, 20, 280]), 320);
    expect(rotulos.map((r) => r.indice)).toEqual([0, 1, 2]);
  });

  test('o primeiro (maior prioridade) sempre entra; quem encosta nele é omitido', () => {
    // "hoje" em 200 e a data final em 222: ficariam embolados.
    const rotulos = posicionarRotulos(candidatos([200, 20, 222]), 320);
    expect(rotulos.map((r) => r.indice)).toEqual([0, 1]);
  });

  test('os rótulos nunca saem da largura do gráfico', () => {
    const rotulos = posicionarRotulos(candidatos([2, 318]), 320);
    for (const rotulo of rotulos) {
      expect(rotulo.esquerda).toBeGreaterThanOrEqual(0);
      expect(rotulo.esquerda + rotulo.largura).toBeLessThanOrEqual(320);
    }
  });

  test('o mesmo ponto não recebe dois rótulos', () => {
    const rotulos = posicionarRotulos(
      [
        { indice: 5, texto: 'hoje', centro: 100 },
        { indice: 5, texto: '11/11', centro: 100 },
      ],
      320,
    );
    expect(rotulos).toHaveLength(1);
    expect(rotulos[0].texto).toBe('hoje');
  });
});
