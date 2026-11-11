/**
 * Loja de configurações do gestor: território, limites dos alertas, aparência e cenário sintético.
 * Persistida no aparelho, para o app abrir do jeito que foi deixado.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { TERRITORIO_PADRAO } from '@/dados/catalogo';
import type { LimiaresPersonalizados } from '@/dados/painel';
import type { IndicadorId, Limiares, Territorio } from '@/dominio/tipos';

import { armazenamentoJson, CHAVES } from './armazenamento';

export type Aparencia = 'sistema' | 'claro' | 'escuro';

interface DadosConfiguracoes {
  territorio: Territorio;
  /** Só os indicadores cujos limites o gestor alterou; os demais usam o padrão do catálogo. */
  limiares: LimiaresPersonalizados;
  aparencia: Aparencia;
  /** Número do cenário sintético (0 = cenário padrão da demonstração). */
  cenario: number;
  /** Último cargo informado em uma decisão, para pré-preencher a próxima. */
  responsavel: string;
  /** O aviso inicial (dados sintéticos + papel do painel) já foi lido? */
  avisoInicialVisto: boolean;
}

interface AcoesConfiguracoes {
  definirTerritorio: (territorio: Territorio) => void;
  definirLimiares: (id: IndicadorId, limiares: Limiares) => void;
  restaurarLimiares: (id: IndicadorId) => void;
  definirAparencia: (aparencia: Aparencia) => void;
  proximoCenario: () => void;
  restaurarCenario: () => void;
  lembrarResponsavel: (responsavel: string) => void;
  marcarAvisoVisto: () => void;
  restaurarPadroes: () => void;
}

export type EstadoConfiguracoes = DadosConfiguracoes & AcoesConfiguracoes;

const PADRAO: DadosConfiguracoes = {
  territorio: TERRITORIO_PADRAO,
  limiares: {},
  aparencia: 'sistema',
  cenario: 0,
  responsavel: '',
  avisoInicialVisto: false,
};

export const useConfiguracoes = create<EstadoConfiguracoes>()(
  persist(
    (set) => ({
      ...PADRAO,

      definirTerritorio: (territorio) => set({ territorio }),

      definirLimiares: (id, limiares) => set((estado) => ({ limiares: { ...estado.limiares, [id]: limiares } })),

      restaurarLimiares: (id) =>
        set((estado) => {
          const restantes = { ...estado.limiares };
          delete restantes[id];
          return { limiares: restantes };
        }),

      definirAparencia: (aparencia) => set({ aparencia }),

      proximoCenario: () => set((estado) => ({ cenario: estado.cenario + 1 })),

      restaurarCenario: () => set({ cenario: 0 }),

      lembrarResponsavel: (responsavel) => set({ responsavel: responsavel.trim() }),

      marcarAvisoVisto: () => set({ avisoInicialVisto: true }),

      restaurarPadroes: () => set({ ...PADRAO }),
    }),
    {
      name: CHAVES.configuracoes,
      storage: armazenamentoJson,
      version: 1,
      // Guarda só os dados (as funções são recriadas a cada abertura do app).
      partialize: (estado) => ({
        territorio: estado.territorio,
        limiares: estado.limiares,
        aparencia: estado.aparencia,
        cenario: estado.cenario,
        responsavel: estado.responsavel,
        avisoInicialVisto: estado.avisoInicialVisto,
      }),
    },
  ),
);
