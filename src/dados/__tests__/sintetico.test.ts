import { INDICADORES, SETORES } from '@/dados/catalogo';
import {
  aleatorio,
  DIAS_DE_HISTORICO,
  gerarDemandasSinteticas,
  gerarSerieSintetica,
  INDICADORES_SINTETICOS,
} from '@/dados/sintetico';
import { detectarDadosPessoais } from '@/dominio/privacidade';
import { diferencaDias, somarDias } from '@/utils/datas';

const HOJE = '2026-11-11';

describe('números pseudoaleatórios', () => {
  test('a mesma semente sempre dá o mesmo valor, entre 0 e 1', () => {
    expect(aleatorio('zela')).toBe(aleatorio('zela'));
    expect(aleatorio('zela')).not.toBe(aleatorio('zelb'));
    for (let i = 0; i < 200; i++) {
      const valor = aleatorio(`semente-${i}`);
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThan(1);
    }
  });

  test('os valores se espalham pelo intervalo (não ficam presos em uma faixa)', () => {
    const valores = Array.from({ length: 500 }, (_, i) => aleatorio(`espalhar-${i}`));
    const mediaDosValores = valores.reduce((s, v) => s + v, 0) / valores.length;
    expect(mediaDosValores).toBeGreaterThan(0.4);
    expect(mediaDosValores).toBeLessThan(0.6);
  });
});

describe('séries sintéticas', () => {
  test('têm 30 dias, terminam hoje e respeitam a faixa do indicador', () => {
    for (const id of INDICADORES_SINTETICOS) {
      for (const setor of SETORES) {
        const serie = gerarSerieSintetica(id, setor.id, HOJE);
        expect(serie).toHaveLength(DIAS_DE_HISTORICO);
        expect(serie[serie.length - 1].data).toBe(HOJE);
        expect(serie[0].data).toBe(somarDias(HOJE, -(DIAS_DE_HISTORICO - 1)));
        for (const ponto of serie) {
          expect(ponto.valor).toBeGreaterThanOrEqual(INDICADORES[id].faixa.minimo);
          expect(ponto.valor).toBeLessThanOrEqual(INDICADORES[id].faixa.maximo);
        }
      }
    }
  });

  test('são determinísticas: gerar de novo dá exatamente os mesmos valores', () => {
    const a = gerarSerieSintetica('carga_rede', 'centro', HOJE);
    const b = gerarSerieSintetica('carga_rede', 'centro', HOJE);
    expect(a).toEqual(b);
  });

  test('o cenário é ancorado em hoje: outro dia, mesmos valores, datas deslocadas', () => {
    const hoje = gerarSerieSintetica('nivel_reservatorio', 'esperanca', HOJE);
    const semanaQueVem = gerarSerieSintetica('nivel_reservatorio', 'esperanca', somarDias(HOJE, 7));
    expect(semanaQueVem.map((p) => p.valor)).toEqual(hoje.map((p) => p.valor));
    expect(semanaQueVem[semanaQueVem.length - 1].data).toBe('2026-11-18');
  });

  test('trocar o cenário muda os valores', () => {
    const padrao = gerarSerieSintetica('ocupacao_ecoponto', 'baixada', HOJE, 0);
    const outro = gerarSerieSintetica('ocupacao_ecoponto', 'baixada', HOJE, 1);
    expect(outro.map((p) => p.valor)).not.toEqual(padrao.map((p) => p.valor));
  });

  test('setor desconhecido é um erro explícito', () => {
    expect(() => gerarSerieSintetica('carga_rede', 'nao-existe', HOJE)).toThrow(/Setor desconhecido/);
  });
});

describe('solicitações sintéticas', () => {
  const demandas = gerarDemandasSinteticas(HOJE);

  test('são determinísticas e têm identificadores únicos', () => {
    expect(gerarDemandasSinteticas(HOJE)).toEqual(demandas);
    expect(new Set(demandas.map((d) => d.id)).size).toBe(demandas.length);
    expect(demandas.length).toBeGreaterThan(50);
  });

  test('cobrem todos os setores maiores e nunca ficam no futuro', () => {
    const setores = new Set(demandas.map((d) => d.setorId));
    for (const id of ['centro', 'acacias', 'esperanca', 'baixada']) {
      expect(setores.has(id)).toBe(true);
    }
    for (const demanda of demandas) {
      expect(diferencaDias(demanda.criadaEm, HOJE)).toBeGreaterThanOrEqual(0);
      expect(demanda.origem).toBe('sintetica');
    }
  });

  test('status e data de resolução são coerentes', () => {
    for (const demanda of demandas) {
      if (demanda.status === 'resolvida') {
        expect(demanda.resolvidaEm).not.toBeNull();
        expect(demanda.resolvidaEm! >= demanda.criadaEm).toBe(true);
        expect(demanda.resolvidaEm! <= HOJE).toBe(true);
      } else {
        expect(demanda.resolvidaEm).toBeNull();
      }
    }
    expect(demandas.some((d) => d.status === 'aberta')).toBe(true);
    expect(demandas.some((d) => d.status === 'em_andamento')).toBe(true);
    expect(demandas.some((d) => d.status === 'resolvida')).toBe(true);
  });

  test('nenhum texto gerado contém dados pessoais', () => {
    for (const demanda of demandas) {
      expect(detectarDadosPessoais(`${demanda.titulo} ${demanda.descricao}`)).toEqual([]);
    }
  });

  test('os ajustes de status continuam valendo em outro dia (identificadores estáveis)', () => {
    const amanha = gerarDemandasSinteticas(somarDias(HOJE, 1));
    expect(amanha.map((d) => d.id)).toEqual(demandas.map((d) => d.id));
  });
});
