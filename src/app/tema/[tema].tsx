/**
 * Detalhe de um tema: para cada indicador, o gráfico (histórico + projeção + limites),
 * a comparação entre setores, a fonte e as limitações do dado, e os alertas do tema.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Aviso, EstadoVazio, LinhaDado, ListaTopicos, Secao } from '@/componentes/Blocos';
import { Botao } from '@/componentes/Botao';
import { Cartao } from '@/componentes/Cartao';
import { CartaoAlerta } from '@/componentes/CartaoAlerta';
import { CartaoGrafico, TabelaDeSerie } from '@/componentes/graficos/CartaoGrafico';
import { GraficoSerie } from '@/componentes/graficos/GraficoSerie';
import { ListaMedidores, type ItemDeMedidor } from '@/componentes/graficos/Marcas';
import { SeloOrigem, SeloSituacao } from '@/componentes/Selos';
import { Tela } from '@/componentes/Tela';
import { Texto } from '@/componentes/Texto';
import { indicadoresDoTema, ORDEM_TEMAS, TEMAS } from '@/dados/catalogo';
import { serieEmPiorSituacao, seriesDoIndicador } from '@/dados/painel';
import { limiteDoIndicador, valorDoIndicador } from '@/dominio/alertas';
import { ROTULO_SITUACAO } from '@/dominio/limiares';
import { MINIMO_PONTOS } from '@/dominio/previsao';
import { MINIMO_DOMICILIOS } from '@/dominio/privacidade';
import type { DefinicaoIndicador, SerieIndicador, TemaId } from '@/dominio/tipos';
import { useClima } from '@/estado/clima';
import { useConfiguracoes } from '@/estado/configuracoes';
import { useDecisoes } from '@/estado/decisoes';
import { useHoje, usePainel } from '@/estado/painel';
import { esp } from '@/tema/medidas';
import { formatarNumero } from '@/utils/numeros';

function ehTema(valor: unknown): valor is TemaId {
  return typeof valor === 'string' && (ORDEM_TEMAS as string[]).includes(valor);
}

export default function TelaTema() {
  const { tema: parametro } = useLocalSearchParams<{ tema: string }>();
  const router = useRouter();
  const painel = usePainel();
  const hoje = useHoje();
  const clima = useClima();
  const territorio = useConfiguracoes((s) => s.territorio);
  const decisoes = useDecisoes((s) => s.decisoes);

  if (!ehTema(parametro)) {
    return (
      <Tela>
        <Stack.Screen options={{ title: 'Tema não encontrado' }} />
        <EstadoVazio
          icone="help-circle-outline"
          titulo="Tema não encontrado"
          texto="O endereço aberto não corresponde a nenhum tema do painel."
          acao={{ titulo: 'Voltar ao painel', aoPressionar: () => router.dismissTo('/') }}
        />
      </Tela>
    );
  }

  const tema = TEMAS[parametro];
  const indicadores = indicadoresDoTema(parametro);
  const alertas = painel.alertas.filter((a) => a.tema === parametro);
  const chavesDecididas = new Set(decisoes.map((d) => d.chaveAlerta));
  const ehClima = parametro === 'clima';
  const semClima = ehClima && seriesDoIndicador(painel.series, 'chuva_diaria').length === 0;

  return (
    <Tela
      atualizacao={
        ehClima
          ? {
              atualizando: clima.situacao === 'carregando',
              aoAtualizar: () => clima.carregar(territorio, { forcar: true }),
            }
          : undefined
      }
      testID={`tela-tema-${parametro}`}>
      <Stack.Screen options={{ title: tema.nome }} />

      {/* O nome do tema já está no cabeçalho da navegação; aqui fica só a descrição. */}
      <Texto variante="rotulo" cor="secundario">
        {tema.descricao}
        {ehClima ? ` Local: ${territorio.nome}.` : ''}
      </Texto>

      {semClima ? (
        <Aviso
          tom={clima.situacao === 'erro' ? 'atencao' : 'informacao'}
          icone="cloud-off-outline"
          titulo={clima.situacao === 'carregando' ? 'Consultando a previsão do tempo…' : 'Sem dados de clima'}
          texto={
            clima.erro ??
            'A previsão ainda não foi carregada. Verifique a conexão e tente de novo: o painel não inventa valores quando a fonte está indisponível.'
          }
          acao={{
            titulo: 'Tentar de novo',
            aoPressionar: () => clima.carregar(territorio, { forcar: true }),
            carregando: clima.situacao === 'carregando',
          }}
        />
      ) : (
        indicadores.map((definicao) => (
          <BlocoDoIndicador
            key={definicao.id}
            definicao={definicao}
            series={seriesDoIndicador(painel.series, definicao.id)}
            hoje={hoje}
            aoAjustarLimites={() => router.push({ pathname: '/limiares', params: { indicador: definicao.id } })}
          />
        ))
      )}

      {parametro === 'servicos' ? (
        <Botao
          titulo="Ver as solicitações"
          icone="clipboard-list-outline"
          variante="secundario"
          largo
          // Fecha esta tela e mostra a aba Serviços (sem empilhar outra cópia das abas).
          aoPressionar={() => router.dismissTo('/demandas')}
        />
      ) : null}

      <Secao titulo="Alertas deste tema">
        {alertas.length === 0 ? (
          <Texto variante="rotulo" cor="secundario">
            Nenhum alerta ativo neste tema.
          </Texto>
        ) : (
          alertas.map((alerta) => (
            <CartaoAlerta
              key={alerta.chave}
              alerta={alerta}
              decidido={chavesDecididas.has(alerta.chave)}
              aoPressionar={() => router.push({ pathname: '/alerta/[chave]', params: { chave: alerta.chave } })}
            />
          ))
        )}
      </Secao>
    </Tela>
  );
}

// ---------------------------------------------------------------------------------------------

interface PropsBloco {
  definicao: DefinicaoIndicador;
  series: SerieIndicador[];
  hoje: string;
  aoAjustarLimites: () => void;
}

/** Posição da barra do medidor: porcentagens usam 0–100; os demais, a distância até o limite crítico. */
function fracaoDoMedidor(serie: SerieIndicador): number {
  if (serie.valorAtual === null) return 0;
  if (serie.definicao.unidade === '%') return serie.valorAtual / 100;
  return serie.valorAtual / serie.limiares.critico;
}

function BlocoDoIndicador({ definicao, series, hoje, aoAjustarLimites }: PropsBloco) {
  const pior = serieEmPiorSituacao(series);
  const [setorEscolhido, setSetorEscolhido] = useState<string | null>(null);

  // Série exibida: a do setor escolhido ou, por padrão, a de pior situação.
  const serie = series.find((s) => s.setor !== null && s.setor.id === setorEscolhido) ?? pior ?? series[0];
  if (!serie) return null;

  const porSetor = definicao.porSetor;
  // No clima, "hoje" é o primeiro dia da previsão (a data do território informada pela API).
  const hojeDaSerie =
    serie.metodo === 'modelo_meteorologico' && serie.previsao.length > 0 ? serie.previsao[0].data : hoje;
  const rotuloDaPrevisao = serie.metodo === 'modelo_meteorologico' ? 'Previsão do modelo' : 'Projeção do painel';
  const limiares = serie.limiares;
  const ordem = definicao.sentido === 'maior_pior' ? 'a partir de' : 'até';

  const medidores: ItemDeMedidor[] = series
    .filter((s) => s.setor !== null)
    .map((s) => ({
      chave: s.setor!.id,
      rotulo: s.setor!.nome,
      texto: valorDoIndicador(definicao, s.valorAtual),
      fracao: fracaoDoMedidor(s),
      situacao: s.situacao,
      protegido: s.protegido,
    }));

  const descricaoAcessivel = serie.protegido
    ? ''
    : `Gráfico de ${definicao.nome}${serie.setor ? `, ${serie.setor.nome}` : ''}. ${serie.historico.length} dias observados e ${serie.previsao.length} dias de ${rotuloDaPrevisao.toLowerCase()}. Valor atual: ${valorDoIndicador(definicao, serie.valorAtual)}.`;

  return (
    <Secao titulo={definicao.nome} descricao={definicao.descricao}>
      {serie.protegido ? (
        <Aviso
          tom="informacao"
          icone="lock-outline"
          titulo={`Dado protegido em ${serie.setor?.nome}`}
          texto={`Este setor tem menos de ${MINIMO_DOMICILIOS} domicílios. Mostrar o consumo médio de um grupo tão pequeno poderia revelar os hábitos de famílias identificáveis, então o painel não exibe nem projeta este indicador aqui.`}
        />
      ) : (
        <CartaoGrafico
          titulo={serie.setor ? serie.setor.nome : 'Território'}
          subtitulo={
            serie.setor
              ? `${formatarNumero(serie.setor.populacao)} habitantes · setor ${serie.setor.tipo}`
              : 'Ponto central do município'
          }
          origem={definicao.origem}
          tabela={
            <TabelaDeSerie
              definicao={definicao}
              historico={serie.historico}
              previsao={serie.previsao}
              rotuloDaPrevisao={rotuloDaPrevisao}
            />
          }
          testID={`grafico-${definicao.id}`}>
          <View style={estilos.situacao}>
            <SeloSituacao situacao={serie.situacao} texto={`Hoje: ${ROTULO_SITUACAO[serie.situacao].toLowerCase()}`} />
          </View>
          <GraficoSerie
            definicao={definicao}
            historico={serie.historico}
            previsao={serie.previsao}
            limiares={limiares}
            hoje={hojeDaSerie}
            forma={definicao.id === 'chuva_diaria' ? 'colunas' : 'linha'}
            rotuloDaPrevisao={rotuloDaPrevisao}
            descricaoAcessivel={descricaoAcessivel}
          />
          {serie.metodo === null ? (
            <Texto variante="legenda" cor="secundario" style={estilos.nota}>
              Menos de {MINIMO_PONTOS} leituras: ainda não há base para projetar os próximos dias.
            </Texto>
          ) : serie.metodo === 'media_movel' ? (
            <Texto variante="legenda" cor="secundario" style={estilos.nota}>
              Sem tendência consistente nos últimos dias: a projeção repete a média recente.
            </Texto>
          ) : null}
        </CartaoGrafico>
      )}

      {porSetor ? (
        <Cartao>
          <Texto variante="titulo3" cabecalho>
            Situação por setor
          </Texto>
          <Texto variante="legenda" cor="secundario" style={estilos.legendaDoCartao}>
            {definicao.unidade === '%'
              ? 'Toque em um setor para ver o gráfico dele.'
              : 'A barra mostra o quanto o valor se aproxima do limite crítico. Toque em um setor para ver o gráfico dele.'}
          </Texto>
          <ListaMedidores itens={medidores} selecionado={serie.setor?.id} aoSelecionar={setSetorEscolhido} />
        </Cartao>
      ) : null}

      <Cartao>
        <Texto variante="titulo3" cabecalho>
          Sobre este dado
        </Texto>
        <View style={estilos.sobre}>
          <SeloOrigem origem={definicao.origem} />
          <Texto variante="rotulo" cor="secundario">
            Fonte: {definicao.fonte}.
          </Texto>
          <View style={estilos.limites}>
            <LinhaDado
              rotulo="Limite de atenção"
              valor={`${ordem} ${limiteDoIndicador(definicao, limiares.atencao)}`}
            />
            <LinhaDado rotulo="Limite de alerta" valor={`${ordem} ${limiteDoIndicador(definicao, limiares.alerta)}`} />
            <LinhaDado rotulo="Limite crítico" valor={`${ordem} ${limiteDoIndicador(definicao, limiares.critico)}`} />
          </View>
          <Texto variante="rotulo">O que este dado não mostra</Texto>
          <ListaTopicos itens={definicao.limitacoes} />
          <Botao
            titulo="Ajustar os limites"
            icone="tune-variant"
            variante="fantasma"
            compacto
            aoPressionar={aoAjustarLimites}
          />
        </View>
      </Cartao>
    </Secao>
  );
}

const estilos = StyleSheet.create({
  situacao: { marginBottom: esp.sm },
  nota: { marginTop: esp.sm },
  legendaDoCartao: { marginBottom: esp.md },
  sobre: { gap: esp.md, marginTop: esp.md },
  limites: { gap: esp.xs },
});
