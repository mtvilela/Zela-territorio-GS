import {
  combinarDemandas,
  DIAS_PARA_ATRASO,
  ehAtrasada,
  ehCritica,
  resumirDemandas,
  serieDemandasAbertas,
} from '@/dados/demandas';
import type { Demanda } from '@/dominio/tipos';

const HOJE = '2026-11-11';

function demanda(parcial: Partial<Demanda> & { id: string }): Demanda {
  return {
    titulo: 'Poste apagado',
    categoria: 'iluminacao',
    prioridade: 'media',
    setorId: 'centro',
    descricao: 'Descrição de teste.',
    status: 'aberta',
    criadaEm: HOJE,
    resolvidaEm: null,
    origem: 'sintetica',
    ...parcial,
  };
}

describe('combinarDemandas', () => {
  const sinteticas = [demanda({ id: 's1', criadaEm: '2026-11-05' }), demanda({ id: 's2', criadaEm: '2026-11-08' })];
  const locais = [demanda({ id: 'l1', criadaEm: '2026-11-10', origem: 'local' })];

  test('junta as duas origens, das mais recentes para as mais antigas', () => {
    const todas = combinarDemandas(sinteticas, {}, locais);
    expect(todas.map((d) => d.id)).toEqual(['l1', 's2', 's1']);
  });

  test('aplica o ajuste de status feito pelo usuário a uma solicitação sintética', () => {
    const todas = combinarDemandas(sinteticas, { s1: { status: 'resolvida', resolvidaEm: HOJE } }, locais);
    const s1 = todas.find((d) => d.id === 's1')!;
    expect(s1.status).toBe('resolvida');
    expect(s1.resolvidaEm).toBe(HOJE);
    // A lista original não é alterada.
    expect(sinteticas[0].status).toBe('aberta');
  });
});

test('regras de crítica e atrasada (as mesmas do Zela Bairro)', () => {
  const alta = demanda({ id: 'a', prioridade: 'alta' });
  const altaResolvida = demanda({ id: 'b', prioridade: 'alta', status: 'resolvida', resolvidaEm: HOJE });
  expect(ehCritica(alta)).toBe(true);
  expect(ehCritica(altaResolvida)).toBe(false);
  expect(ehCritica(demanda({ id: 'c', prioridade: 'media' }))).toBe(false);

  expect(DIAS_PARA_ATRASO).toBe(7);
  expect(ehAtrasada(demanda({ id: 'd', criadaEm: '2026-11-03' }), HOJE)).toBe(true); // 8 dias
  expect(ehAtrasada(demanda({ id: 'e', criadaEm: '2026-11-04' }), HOJE)).toBe(false); // 7 dias
  expect(ehAtrasada(demanda({ id: 'f', criadaEm: '2026-10-01', status: 'resolvida', resolvidaEm: HOJE }), HOJE)).toBe(
    false,
  );
});

test('serieDemandasAbertas conta a fila ao fim de cada dia', () => {
  const demandas = [
    demanda({ id: '1', criadaEm: '2026-11-09' }),
    demanda({ id: '2', criadaEm: '2026-11-09', status: 'resolvida', resolvidaEm: '2026-11-11' }),
    demanda({ id: '3', criadaEm: '2026-11-10', status: 'em_andamento' }),
    demanda({ id: '4', criadaEm: '2026-11-10', setorId: 'baixada' }),
  ];
  const serie = serieDemandasAbertas(demandas, 'centro', HOJE, 4);
  expect(serie).toEqual([
    { data: '2026-11-08', valor: 0 },
    { data: '2026-11-09', valor: 2 },
    { data: '2026-11-10', valor: 3 },
    { data: '2026-11-11', valor: 2 }, // a nº 2 foi resolvida hoje
  ]);
});

test('resumirDemandas calcula os indicadores da fila', () => {
  const demandas = [
    demanda({ id: '1', categoria: 'buraco', prioridade: 'alta', criadaEm: '2026-11-01' }),
    demanda({ id: '2', categoria: 'buraco', status: 'em_andamento', criadaEm: '2026-11-09' }),
    demanda({ id: '3', categoria: 'lixo', setorId: 'baixada', criadaEm: '2026-11-10' }),
    demanda({ id: '4', status: 'resolvida', criadaEm: '2026-11-01', resolvidaEm: '2026-11-05' }),
  ];
  const resumo = resumirDemandas(demandas, HOJE);

  expect(resumo.total).toBe(4);
  expect(resumo.abertas).toBe(2);
  expect(resumo.emAndamento).toBe(1);
  expect(resumo.resolvidas).toBe(1);
  expect(resumo.taxaDeResolucao).toBe(0.25);
  expect(resumo.criticas).toBe(1);
  expect(resumo.atrasadas).toBe(1);
  expect(resumo.tempoMedioDeResolucao).toBe(4);
  expect(resumo.pendentesPorCategoria).toEqual([
    { categoria: 'buraco', quantidade: 2 },
    { categoria: 'lixo', quantidade: 1 },
  ]);
  expect(resumo.pendentesPorSetor[0]).toEqual({ setorId: 'centro', nome: 'Centro', quantidade: 2 });
  expect(resumo.pendentesPorSetor[1]).toEqual({
    setorId: 'baixada',
    nome: 'Baixada do Córrego Verde',
    quantidade: 1,
  });
});

test('resumo de lista vazia não divide por zero', () => {
  const resumo = resumirDemandas([], HOJE);
  expect(resumo.total).toBe(0);
  expect(resumo.taxaDeResolucao).toBe(0);
  expect(resumo.tempoMedioDeResolucao).toBeNull();
});
