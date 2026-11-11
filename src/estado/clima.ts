/**
 * Loja do clima: consulta a API pública, guarda a última resposta no aparelho e controla
 * os estados de carregamento e erro.
 *
 * - Sem internet, o painel mostra a última resposta guardada, avisando a idade do dado.
 * - Ao trocar de território, os dados antigos são descartados: clima de outro lugar nunca
 *   aparece como se fosse do território atual.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { buscarClima, mensagemDeErro, type DadosClima } from '@/dados/openMeteo';
import { arredondarCoordenada } from '@/dominio/privacidade';
import type { Territorio } from '@/dominio/tipos';

import { armazenamentoJson, CHAVES } from './armazenamento';

export type SituacaoDaConsulta = 'ocioso' | 'carregando' | 'sucesso' | 'erro';

/** Depois deste tempo, o painel busca dados novos ao ser aberto. */
export const VALIDADE_DO_CLIMA_MS = 30 * 60 * 1000;

export interface EstadoClima {
  dados: DadosClima | null;
  /** Território ao qual `dados` se refere ("latitude,longitude" arredondadas). */
  local: string | null;
  situacao: SituacaoDaConsulta;
  erro: string | null;
  carregar: (territorio: Territorio, opcoes?: { forcar?: boolean }) => Promise<void>;
  limpar: () => void;
}

export function chaveDoLocal(territorio: Territorio): string {
  return `${arredondarCoordenada(territorio.latitude)},${arredondarCoordenada(territorio.longitude)}`;
}

export function climaEstaVencido(dados: DadosClima | null, agora: number = Date.now()): boolean {
  if (!dados) return true;
  const obtido = new Date(dados.obtidoEm).getTime();
  return Number.isNaN(obtido) || agora - obtido > VALIDADE_DO_CLIMA_MS;
}

/** Numera as consultas: se o território mudar no meio do caminho, a resposta antiga é ignorada. */
let consultaAtual = 0;

export const useClima = create<EstadoClima>()(
  persist(
    (set, get) => ({
      dados: null,
      local: null,
      situacao: 'ocioso',
      erro: null,

      carregar: async (territorio, opcoes = {}) => {
        const local = chaveDoLocal(territorio);
        const estado = get();
        const mesmoLocal = estado.local === local;

        if (estado.situacao === 'carregando' && mesmoLocal) return;
        if (!opcoes.forcar && mesmoLocal && !climaEstaVencido(estado.dados)) return;

        const consulta = ++consultaAtual;
        // Mantém os dados na tela durante a atualização — a menos que sejam de outro território.
        set({ situacao: 'carregando', erro: null, local, dados: mesmoLocal ? estado.dados : null });

        try {
          const dados = await buscarClima(territorio.latitude, territorio.longitude);
          if (consulta !== consultaAtual) return;
          set({ dados, situacao: 'sucesso', erro: null });
        } catch (erro) {
          if (consulta !== consultaAtual) return;
          set({ situacao: 'erro', erro: mensagemDeErro(erro) });
        }
      },

      limpar: () => {
        consultaAtual++;
        set({ dados: null, local: null, situacao: 'ocioso', erro: null });
      },
    }),
    {
      name: CHAVES.clima,
      storage: armazenamentoJson,
      version: 1,
      // Só a última resposta é guardada; "carregando" e "erro" valem apenas para a sessão atual.
      partialize: (estado) => ({ dados: estado.dados, local: estado.local }),
    },
  ),
);
