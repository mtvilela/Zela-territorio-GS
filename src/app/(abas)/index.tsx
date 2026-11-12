/**
 * Painel: a visão geral do território. Mostra quantos alertas aguardam decisão, os mais
 * urgentes e um cartão por tema (clima, água, energia, resíduos e serviços).
 */
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Aviso, Secao } from '@/componentes/Blocos';
import { Botao } from '@/componentes/Botao';
import { Cartao } from '@/componentes/Cartao';
import { CartaoAlerta } from '@/componentes/CartaoAlerta';
import { CartaoTema } from '@/componentes/CartaoTema';
import { CabecalhoDaMarca } from '@/componentes/Marca';
import { SeloSituacao } from '@/componentes/Selos';
import { Tela } from '@/componentes/Tela';
import { Texto } from '@/componentes/Texto';
import { ORDEM_TEMAS } from '@/dados/catalogo';
import { resumirTema } from '@/dados/painel';
import { NIVEIS_ALERTA } from '@/dominio/limiares';
import type { NivelAlerta } from '@/dominio/tipos';
import { climaEstaVencido, useClima } from '@/estado/clima';
import { useConfiguracoes } from '@/estado/configuracoes';
import { useAlertasPorSituacao, usePainel } from '@/estado/painel';
import { esp } from '@/tema/medidas';
import { formatarDataHora, formatarHora } from '@/utils/datas';
import { plural } from '@/utils/numeros';

const TEXTO_DO_NIVEL: Record<NivelAlerta, [string, string]> = {
  critico: ['crítico', 'críticos'],
  alerta: ['de alerta', 'de alerta'],
  atencao: ['de atenção', 'de atenção'],
};

export default function TelaPainel() {
  const router = useRouter();
  const painel = usePainel();
  const { pendentes, decididos } = useAlertasPorSituacao();
  const territorio = useConfiguracoes((s) => s.territorio);
  const avisoVisto = useConfiguracoes((s) => s.avisoInicialVisto);
  const marcarAvisoVisto = useConfiguracoes((s) => s.marcarAvisoVisto);
  const clima = useClima();

  const carregandoClima = clima.situacao === 'carregando';
  const atualizarClima = () => clima.carregar(territorio, { forcar: true });

  const abrirAlerta = (chave: string) => router.push({ pathname: '/alerta/[chave]', params: { chave } });

  // Texto sobre a idade dos dados de clima — sempre visível, para ninguém decidir com dado velho sem saber.
  let situacaoDoClima: string;
  if (clima.dados) {
    situacaoDoClima = climaEstaVencido(clima.dados)
      ? `Clima consultado em ${formatarDataHora(clima.dados.obtidoEm)} (pode estar desatualizado).`
      : `Clima atualizado às ${formatarHora(clima.dados.obtidoEm)}.`;
  } else {
    situacaoDoClima = carregandoClima ? 'Consultando o clima…' : 'Clima ainda não consultado.';
  }

  const avisoDoClima = carregandoClima
    ? 'Consultando a previsão do tempo…'
    : (clima.erro ?? 'Previsão do tempo ainda não disponível.');

  return (
    <Tela aba atualizacao={{ atualizando: carregandoClima, aoAtualizar: atualizarClima }} testID="tela-painel">
      <CabecalhoDaMarca territorio={territorio.nome} />

      {!avisoVisto ? (
        <Aviso
          tom="informacao"
          titulo="O painel apoia a decisão. Quem decide é você."
          texto="Os dados de clima são públicos e reais (Open-Meteo). Água, energia, resíduos e serviços usam dados sintéticos, gerados para demonstração. Nenhuma medida é executada pelo aplicativo."
          acao={{ titulo: 'Entendi', aoPressionar: marcarAvisoVisto }}
        />
      ) : null}

      {clima.situacao === 'erro' && clima.erro ? (
        <Aviso
          tom="atencao"
          titulo={clima.dados ? 'Mostrando a última previsão guardada' : 'Sem dados de clima'}
          texto={clima.erro}
          icone="cloud-off-outline"
          acao={{ titulo: 'Tentar de novo', aoPressionar: atualizarClima, carregando: carregandoClima }}
        />
      ) : null}

      {/* Número principal do painel: quantos alertas ainda esperam uma decisão humana. */}
      <Cartao testID="cartao-resumo">
        <Texto variante="rotulo" cor="secundario">
          Alertas aguardando decisão
        </Texto>
        <Texto
          variante="heroi"
          accessibilityLabel={plural(pendentes.length, 'alerta aguardando decisão', 'alertas aguardando decisão')}>
          {pendentes.length}
        </Texto>
        {pendentes.length > 0 ? (
          <View style={estilos.niveis}>
            {[...NIVEIS_ALERTA].reverse().map((nivel) => {
              const quantidade = pendentes.filter((a) => a.nivel === nivel).length;
              if (quantidade === 0) return null;
              const [singular, pluralTexto] = TEXTO_DO_NIVEL[nivel];
              return <SeloSituacao key={nivel} situacao={nivel} texto={plural(quantidade, singular, pluralTexto)} />;
            })}
          </View>
        ) : (
          <Texto variante="rotulo" cor="secundario">
            Nenhum alerta pendente. O painel continua acompanhando os indicadores.
          </Texto>
        )}
        {decididos.length > 0 ? (
          <Texto variante="legenda" cor="secundario" style={estilos.decididos}>
            {plural(decididos.length, 'alerta ativo já tem', 'alertas ativos já têm')} decisão registrada.
          </Texto>
        ) : null}
        <Botao
          titulo="Ver todos os alertas"
          icone="arrow-right"
          variante="secundario"
          aoPressionar={() => router.navigate('/alertas')}
          style={estilos.botaoAlertas}
        />
      </Cartao>

      {pendentes.length > 0 ? (
        <Secao titulo="Pede atenção primeiro" descricao="Os alertas mais graves e de prazo mais curto.">
          {pendentes.slice(0, 2).map((alerta) => (
            <CartaoAlerta
              key={alerta.chave}
              alerta={alerta}
              decidido={false}
              aoPressionar={() => abrirAlerta(alerta.chave)}
            />
          ))}
        </Secao>
      ) : null}

      <Secao titulo="Temas do território" descricao="Toque em um tema para ver os gráficos e a situação por setor.">
        {ORDEM_TEMAS.map((tema) => (
          <CartaoTema
            key={tema}
            resumo={resumirTema(tema, painel)}
            avisoSemDados={tema === 'clima' ? avisoDoClima : undefined}
            aoPressionar={() => router.push({ pathname: '/tema/[tema]', params: { tema } })}
            testID={`cartao-tema-${tema}`}
          />
        ))}
      </Secao>

      <Texto variante="legenda" cor="suave" centralizado>
        {situacaoDoClima} Dados de clima: Open-Meteo.com. Puxe a tela para baixo para atualizar.
      </Texto>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  niveis: { flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm, marginTop: esp.xs },
  decididos: { marginTop: esp.sm },
  botaoAlertas: { marginTop: esp.lg },
});
