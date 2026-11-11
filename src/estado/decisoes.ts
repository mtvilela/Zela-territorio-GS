/**
 * Loja do diário de decisões. Cada registro guarda uma "fotografia" do alerta, a medida escolhida,
 * a justificativa e o cargo de quem decidiu — o app nunca decide nem executa nada sozinho.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Decisao } from '@/dominio/tipos';

import { armazenamentoJson, CHAVES, novoId } from './armazenamento';

export type NovaDecisao = Omit<Decisao, 'id' | 'registradaEm'>;

export interface EstadoDecisoes {
  /** Da mais recente para a mais antiga. */
  decisoes: Decisao[];
  registrar: (nova: NovaDecisao, agora?: Date) => Decisao;
  limpar: () => void;
}

export const useDecisoes = create<EstadoDecisoes>()(
  persist(
    (set) => ({
      decisoes: [],

      registrar: (nova, agora = new Date()) => {
        const decisao: Decisao = {
          ...nova,
          medida: nova.medida.trim(),
          justificativa: nova.justificativa.trim(),
          responsavel: nova.responsavel.trim(),
          id: novoId('decisao'),
          registradaEm: agora.toISOString(),
        };
        set((estado) => ({ decisoes: [decisao, ...estado.decisoes] }));
        return decisao;
      },

      limpar: () => set({ decisoes: [] }),
    }),
    {
      name: CHAVES.decisoes,
      storage: armazenamentoJson,
      version: 1,
      partialize: (estado) => ({ decisoes: estado.decisoes }),
    },
  ),
);
