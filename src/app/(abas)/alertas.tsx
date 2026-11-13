/**
 * Lista de alertas preditivos, do mais grave para o menos grave.
 * O filtro separa os que ainda aguardam decisão dos que já têm decisão registrada.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Aviso, EstadoVazio } from '@/componentes/Blocos';
import { CartaoAlerta } from '@/componentes/CartaoAlerta';
import { SeletorOpcoes } from '@/componentes/Formulario';
import { TituloDaTela } from '@/componentes/Marca';
import { Tela } from '@/componentes/Tela';
import { useClima } from '@/estado/clima';
import { useConfiguracoes } from '@/estado/configuracoes';
import { useAlertasPorSituacao } from '@/estado/painel';

type Filtro = 'pendentes' | 'decididos' | 'todos';

export default function TelaAlertas() {
  const router = useRouter();
  const { pendentes, decididos } = useAlertasPorSituacao();
  const [filtro, setFiltro] = useState<Filtro>('pendentes');
  const territorio = useConfiguracoes((s) => s.territorio);
  const situacaoDoClima = useClima((s) => s.situacao);
  const carregarClima = useClima((s) => s.carregar);

  const chavesDecididas = new Set(decididos.map((a) => a.chave));
  const visiveis =
    filtro === 'pendentes' ? pendentes : filtro === 'decididos' ? decididos : [...pendentes, ...decididos];

  return (
    <Tela
      aba
      atualizacao={{
        atualizando: situacaoDoClima === 'carregando',
        aoAtualizar: () => carregarClima(territorio, { forcar: true }),
      }}
      testID="tela-alertas">
      <TituloDaTela
        titulo="Alertas"
        descricao="Cada alerta traz a justificativa, o nível de confiança, as limitações e opções para a sua decisão."
      />

      <SeletorOpcoes<Filtro>
        rotuloAcessivel="Filtrar alertas"
        valor={filtro}
        aoMudar={setFiltro}
        opcoes={[
          { valor: 'pendentes', rotulo: `Aguardando decisão (${pendentes.length})` },
          { valor: 'decididos', rotulo: `Com decisão (${decididos.length})` },
          { valor: 'todos', rotulo: `Todos (${pendentes.length + decididos.length})` },
        ]}
      />

      {visiveis.length === 0 ? (
        <EstadoVazio
          icone={filtro === 'decididos' ? 'notebook-check-outline' : 'check-circle-outline'}
          titulo={
            filtro === 'decididos'
              ? 'Nenhum alerta ativo com decisão'
              : filtro === 'pendentes'
                ? 'Nenhum alerta aguardando decisão'
                : 'Nenhum alerta ativo'
          }
          texto={
            filtro === 'decididos'
              ? 'Quando você registrar a decisão de um alerta, ele aparece aqui enquanto continuar ativo.'
              : 'Os indicadores estão dentro dos limites configurados ou não há dados suficientes para prever. O painel prefere se calar a alertar sem base.'
          }
        />
      ) : (
        visiveis.map((alerta) => (
          <CartaoAlerta
            key={alerta.chave}
            alerta={alerta}
            decidido={chavesDecididas.has(alerta.chave)}
            aoPressionar={() => router.push({ pathname: '/alerta/[chave]', params: { chave: alerta.chave } })}
            testID={`alerta-${alerta.chave}`}
          />
        ))
      )}

      <Aviso
        tom="informacao"
        icone="robot-off-outline"
        texto="O painel não executa nenhuma medida. Ele antecipa riscos, explica o motivo e registra a decisão tomada por você."
      />
    </Tela>
  );
}
