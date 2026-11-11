/**
 * Loja das solicitações de zeladoria registradas neste aparelho e dos ajustes de status
 * feitos nas solicitações sintéticas. Persistida no aparelho.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AjusteDeStatus } from '@/dados/demandas';
import type { CategoriaDemanda, Demanda, PrioridadeDemanda, StatusDemanda } from '@/dominio/tipos';

import { armazenamentoJson, CHAVES, novoId } from './armazenamento';

export interface NovaDemanda {
  titulo: string;
  categoria: CategoriaDemanda;
  prioridade: PrioridadeDemanda;
  setorId: string;
  descricao: string;
}

export interface EstadoDemandas {
  /** Solicitações registradas neste aparelho. */
  locais: Demanda[];
  /** Status alterado pelo usuário em solicitações sintéticas, por identificador. */
  ajustes: Record<string, AjusteDeStatus>;
  registrar: (nova: NovaDemanda, hoje: string) => Demanda;
  alterarStatus: (demanda: Demanda, status: StatusDemanda, hoje: string) => void;
  limpar: () => void;
}

export const useDemandasLocais = create<EstadoDemandas>()(
  persist(
    (set) => ({
      locais: [],
      ajustes: {},

      registrar: (nova, hoje) => {
        const demanda: Demanda = {
          id: novoId('local'),
          titulo: nova.titulo.trim(),
          categoria: nova.categoria,
          prioridade: nova.prioridade,
          setorId: nova.setorId,
          descricao: nova.descricao.trim(),
          status: 'aberta',
          criadaEm: hoje,
          resolvidaEm: null,
          origem: 'local',
        };
        set((estado) => ({ locais: [demanda, ...estado.locais] }));
        return demanda;
      },

      alterarStatus: (demanda, status, hoje) => {
        const resolvidaEm = status === 'resolvida' ? hoje : null;
        if (demanda.origem === 'local') {
          set((estado) => ({
            locais: estado.locais.map((d) => (d.id === demanda.id ? { ...d, status, resolvidaEm } : d)),
          }));
        } else {
          // Solicitações sintéticas são geradas a cada abertura; guardamos só a alteração.
          set((estado) => ({ ajustes: { ...estado.ajustes, [demanda.id]: { status, resolvidaEm } } }));
        }
      },

      limpar: () => set({ locais: [], ajustes: {} }),
    }),
    {
      name: CHAVES.demandas,
      storage: armazenamentoJson,
      version: 1,
      partialize: (estado) => ({ locais: estado.locais, ajustes: estado.ajustes }),
    },
  ),
);
