/**
 * Hooks que derivam o painel a partir das lojas. As telas não guardam cópias dos dados:
 * elas leem o estado global e recalculam séries e alertas só quando alguma entrada muda.
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { combinarDemandas, type AjusteDeStatus } from '@/dados/demandas';
import type { DadosClima } from '@/dados/openMeteo';
import { montarPainel, type LimiaresPersonalizados, type Painel } from '@/dados/painel';
import { gerarDemandasSinteticas } from '@/dados/sintetico';
import type { Alerta, Decisao, Demanda } from '@/dominio/tipos';
import { hojeISO } from '@/utils/datas';

import { chaveDoLocal, useClima } from './clima';
import { useConfiguracoes } from './configuracoes';
import { useDecisoes } from './decisoes';
import { useDemandasLocais } from './demandas';

/** Guarda o último resultado: se os argumentos forem os mesmos, não recalcula. */
function memorizarUltimo<A extends unknown[], R>(calcular: (...args: A) => R): (...args: A) => R {
  let ultimosArgs: A | null = null;
  let ultimoResultado: R;
  return (...args: A): R => {
    const iguais = ultimosArgs !== null && args.every((arg, i) => Object.is(arg, ultimosArgs![i]));
    if (!iguais) {
      ultimoResultado = calcular(...args);
      ultimosArgs = args;
    }
    return ultimoResultado;
  };
}

const combinarMemorizado = memorizarUltimo(
  (hoje: string, cenario: number, ajustes: Record<string, AjusteDeStatus>, locais: Demanda[]) =>
    combinarDemandas(gerarDemandasSinteticas(hoje, cenario), ajustes, locais),
);

/** Um dado de clima guardado há mais tempo que isto pode estar com o "hoje" desatualizado. */
const SEIS_HORAS_MS = 6 * 60 * 60 * 1000;

const montarMemorizado = memorizarUltimo(
  (
    hoje: string,
    clima: DadosClima | null,
    demandas: Demanda[],
    limiares: LimiaresPersonalizados,
    cenario: number,
  ): Painel => {
    // Clima guardado de dias anteriores (aparelho sem internet): o que era "previsto para ontem"
    // passa a contar como passado, para nenhum alerta apontar para uma data que já ficou para trás.
    let climaAjustado = clima;
    if (clima && clima.hoje < hoje && Date.now() - new Date(clima.obtidoEm).getTime() > SEIS_HORAS_MS) {
      climaAjustado = { ...clima, hoje };
    }
    return montarPainel({ hoje, clima: climaAjustado, demandas, limiares, cenario });
  },
);

/** Data de hoje (ISO). Atualiza quando o app volta para o primeiro plano. */
export function useHoje(): string {
  const [hoje, setHoje] = useState(() => hojeISO());
  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') setHoje(hojeISO());
    });
    return () => assinatura.remove();
  }, []);
  return hoje;
}

/** Todas as solicitações: sintéticas (com ajustes de status) + registradas no aparelho. */
export function useDemandas(): Demanda[] {
  const hoje = useHoje();
  const cenario = useConfiguracoes((s) => s.cenario);
  const ajustes = useDemandasLocais((s) => s.ajustes);
  const locais = useDemandasLocais((s) => s.locais);
  return combinarMemorizado(hoje, cenario, ajustes, locais);
}

/** Séries e alertas do painel, recalculados só quando uma das entradas muda. */
export function usePainel(): Painel {
  const hoje = useHoje();
  const territorio = useConfiguracoes((s) => s.territorio);
  const limiares = useConfiguracoes((s) => s.limiares);
  const cenario = useConfiguracoes((s) => s.cenario);
  const clima = useClima((s) => s.dados);
  const localDoClima = useClima((s) => s.local);
  const demandas = useDemandas();

  // Clima guardado de outro território nunca entra no painel.
  const climaDoTerritorio = localDoClima === chaveDoLocal(territorio) ? clima : null;
  return montarMemorizado(hoje, climaDoTerritorio, demandas, limiares, cenario);
}

export function useAlerta(chave: string | undefined): Alerta | undefined {
  const painel = usePainel();
  return painel.alertas.find((alerta) => alerta.chave === chave);
}

/** Decisões já registradas para um alerta, da mais recente para a mais antiga. */
export function useDecisoesDoAlerta(chave: string | undefined): Decisao[] {
  const decisoes = useDecisoes((s) => s.decisoes);
  return decisoes.filter((decisao) => decisao.chaveAlerta === chave);
}

/** Separa os alertas entre os que aguardam decisão e os que já têm decisão registrada. */
export function useAlertasPorSituacao(): { pendentes: Alerta[]; decididos: Alerta[] } {
  const { alertas } = usePainel();
  const decisoes = useDecisoes((s) => s.decisoes);
  const decididas = new Set(decisoes.map((d) => d.chaveAlerta));
  return {
    pendentes: alertas.filter((a) => !decididas.has(a.chave)),
    decididos: alertas.filter((a) => decididas.has(a.chave)),
  };
}

// ---------------------------------------------------------------------------------------------
// Hidratação e limpeza
// ---------------------------------------------------------------------------------------------

const LOJAS_PERSISTIDAS = [useConfiguracoes, useClima, useDemandasLocais, useDecisoes];

function todasHidratadas(): boolean {
  return LOJAS_PERSISTIDAS.every((loja) => loja.persist.hasHydrated());
}

/**
 * `true` quando os dados salvos no aparelho já foram carregados para as lojas.
 * Enquanto isso, o app mantém a tela de abertura, para não "piscar" valores padrão.
 */
export function useHidratado(): boolean {
  const [pronto, setPronto] = useState(todasHidratadas);

  useEffect(() => {
    const conferir = () => {
      if (todasHidratadas()) setPronto(true);
    };
    const cancelamentos = LOJAS_PERSISTIDAS.map((loja) => loja.persist.onFinishHydration(conferir));
    conferir();
    // Rede de segurança: se o armazenamento falhar, o app abre com os valores padrão.
    const limite = setTimeout(() => setPronto(true), 3000);
    return () => {
      cancelamentos.forEach((cancelar) => cancelar());
      clearTimeout(limite);
    };
  }, []);

  return pronto;
}

/** Apaga tudo o que o app guardou no aparelho e volta às configurações iniciais. */
export function apagarDadosLocais(): void {
  useDemandasLocais.getState().limpar();
  useDecisoes.getState().limpar();
  useClima.getState().limpar();
  useConfiguracoes.getState().restaurarPadroes();
}
