/**
 * Solicitações de zeladoria: junta as sintéticas com as registradas no aparelho e calcula os
 * indicadores da fila. As regras de "críticas" e "atrasadas" são as mesmas do Zela Bairro.
 */
import type { CategoriaDemanda, Demanda, PontoSerie, StatusDemanda } from '@/dominio/tipos';
import { diferencaDias, somarDias } from '@/utils/datas';

import { SETORES } from './catalogo';
import { DIAS_DE_HISTORICO } from './sintetico';

/** Uma solicitação não resolvida há mais de 7 dias é considerada atrasada. */
export const DIAS_PARA_ATRASO = 7;

/** Alteração de status feita pelo usuário em uma solicitação sintética. */
export interface AjusteDeStatus {
  status: StatusDemanda;
  resolvidaEm: string | null;
}

/** Aplica os ajustes de status às sintéticas e acrescenta as registradas no aparelho. */
export function combinarDemandas(
  sinteticas: Demanda[],
  ajustes: Record<string, AjusteDeStatus>,
  locais: Demanda[],
): Demanda[] {
  const ajustadas = sinteticas.map((demanda) => {
    const ajuste = ajustes[demanda.id];
    return ajuste ? { ...demanda, status: ajuste.status, resolvidaEm: ajuste.resolvidaEm } : demanda;
  });
  // Mais recentes primeiro; em caso de empate, as registradas no aparelho vêm antes.
  return [...locais, ...ajustadas].sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
}

export function estaAberta(demanda: Demanda): boolean {
  return demanda.status !== 'resolvida';
}

/** Crítica: prioridade alta e ainda não resolvida. */
export function ehCritica(demanda: Demanda): boolean {
  return demanda.prioridade === 'alta' && estaAberta(demanda);
}

/** Atrasada: não resolvida e registrada há mais de 7 dias. */
export function ehAtrasada(demanda: Demanda, hoje: string): boolean {
  return estaAberta(demanda) && diferencaDias(demanda.criadaEm, hoje) > DIAS_PARA_ATRASO;
}

/** Quantas solicitações do setor estavam em aberto ao fim de cada um dos últimos dias. */
export function serieDemandasAbertas(
  demandas: Demanda[],
  setorId: string,
  hoje: string,
  dias = DIAS_DE_HISTORICO,
): PontoSerie[] {
  const doSetor = demandas.filter((d) => d.setorId === setorId);
  const serie: PontoSerie[] = [];
  for (let i = -(dias - 1); i <= 0; i++) {
    const data = somarDias(hoje, i);
    const abertas = doSetor.filter(
      (d) => d.criadaEm <= data && (d.resolvidaEm === null || d.resolvidaEm > data),
    ).length;
    serie.push({ data, valor: abertas });
  }
  return serie;
}

export interface ResumoDemandas {
  total: number;
  abertas: number;
  emAndamento: number;
  resolvidas: number;
  /** Resolvidas ÷ total (0 a 1). */
  taxaDeResolucao: number;
  criticas: number;
  atrasadas: number;
  /** Média de dias entre o registro e a resolução. */
  tempoMedioDeResolucao: number | null;
  /** Não resolvidas, por categoria, da maior para a menor. */
  pendentesPorCategoria: { categoria: CategoriaDemanda; quantidade: number }[];
  /** Não resolvidas, por setor, da maior para a menor. */
  pendentesPorSetor: { setorId: string; nome: string; quantidade: number }[];
}

export function resumirDemandas(demandas: Demanda[], hoje: string): ResumoDemandas {
  const pendentes = demandas.filter(estaAberta);
  const resolvidas = demandas.filter((d) => d.status === 'resolvida');

  const porCategoria = new Map<CategoriaDemanda, number>();
  const porSetor = new Map<string, number>();
  for (const demanda of pendentes) {
    porCategoria.set(demanda.categoria, (porCategoria.get(demanda.categoria) ?? 0) + 1);
    porSetor.set(demanda.setorId, (porSetor.get(demanda.setorId) ?? 0) + 1);
  }

  const prazos = resolvidas
    .filter((d) => d.resolvidaEm !== null)
    .map((d) => diferencaDias(d.criadaEm, d.resolvidaEm as string));

  return {
    total: demandas.length,
    abertas: demandas.filter((d) => d.status === 'aberta').length,
    emAndamento: demandas.filter((d) => d.status === 'em_andamento').length,
    resolvidas: resolvidas.length,
    taxaDeResolucao: demandas.length === 0 ? 0 : resolvidas.length / demandas.length,
    criticas: demandas.filter(ehCritica).length,
    atrasadas: demandas.filter((d) => ehAtrasada(d, hoje)).length,
    tempoMedioDeResolucao: prazos.length === 0 ? null : prazos.reduce((s, p) => s + p, 0) / prazos.length,
    pendentesPorCategoria: [...porCategoria.entries()]
      .map(([categoria, quantidade]) => ({ categoria, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade),
    pendentesPorSetor: SETORES.map((setor) => ({
      setorId: setor.id,
      nome: setor.nome,
      quantidade: porSetor.get(setor.id) ?? 0,
    })).sort((a, b) => b.quantidade - a.quantidade),
  };
}
