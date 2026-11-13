/**
 * Detalhe de um alerta: o que foi previsto, por quê, com que confiança, quais as limitações
 * e que opções o gestor tem. A tela termina no botão de registrar a decisão — humana.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Aviso, EstadoVazio, ListaTopicos, Secao } from '@/componentes/Blocos';
import { Botao } from '@/componentes/Botao';
import { Cartao } from '@/componentes/Cartao';
import { prazoDoAlerta } from '@/componentes/CartaoAlerta';
import { CartaoDecisao } from '@/componentes/CartaoDecisao';
import { CartaoGrafico, TabelaDeSerie } from '@/componentes/graficos/CartaoGrafico';
import { GraficoSerie } from '@/componentes/graficos/GraficoSerie';
import { MedidorConfianca } from '@/componentes/graficos/Marcas';
import { Icone } from '@/componentes/Icone';
import { Etiqueta, SeloImpacto, SeloOrigem, SeloSituacao } from '@/componentes/Selos';
import { Tela } from '@/componentes/Tela';
import { Texto } from '@/componentes/Texto';
import { INDICADORES, TEMAS } from '@/dados/catalogo';
import { useAlerta, useDecisoesDoAlerta, useHoje, usePainel } from '@/estado/painel';
import { esp } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';
import { formatarVariacao } from '@/utils/numeros';

export default function TelaAlerta() {
  const { chave } = useLocalSearchParams<{ chave: string }>();
  const router = useRouter();
  const { cores } = useTema();
  const painel = usePainel();
  const alerta = useAlerta(chave);
  const decisoes = useDecisoesDoAlerta(chave);
  const hoje = useHoje();

  if (!alerta) {
    // O alerta pode ter deixado de existir: os dados mudaram ou os limites foram ajustados.
    return (
      <Tela>
        <Stack.Screen options={{ title: 'Alerta' }} />
        <EstadoVazio
          icone="check-circle-outline"
          titulo="Este alerta não está mais ativo"
          texto="Os dados ou os limites mudaram desde que ele foi gerado. As decisões já registradas continuam no diário."
          acao={{ titulo: 'Ver alertas ativos', aoPressionar: () => router.dismissTo('/alertas') }}
        />
        {decisoes.map((decisao) => (
          <CartaoDecisao key={decisao.id} decisao={decisao} />
        ))}
      </Tela>
    );
  }

  const definicao = INDICADORES[alerta.indicadorId];
  const serie = painel.series.find(
    (s) => s.definicao.id === alerta.indicadorId && (s.setor?.id ?? null) === alerta.setorId,
  );
  const ehClima = alerta.metodo === 'modelo_meteorologico';
  const rotuloDaPrevisao = ehClima ? 'Previsão do modelo' : 'Projeção do painel';
  const hojeDaSerie = ehClima && serie && serie.previsao.length > 0 ? serie.previsao[0].data : hoje;
  const temAltoImpacto = alerta.opcoes.some((o) => o.impacto === 'alto');

  const abrirFormulario = () => router.push({ pathname: '/decisao/[chave]', params: { chave: alerta.chave } });

  return (
    <Tela
      testID="tela-alerta"
      rodape={
        <Botao
          titulo={decisoes.length > 0 ? 'Registrar nova decisão' : 'Registrar decisão'}
          icone="notebook-check-outline"
          largo
          aoPressionar={abrirFormulario}
          testID="botao-registrar-decisao"
        />
      }>
      <Stack.Screen options={{ title: TEMAS[alerta.tema].nome }} />

      {/* 1. O alerta em uma frase */}
      <Cartao faixa={alerta.nivel}>
        <View style={estilos.selos}>
          <SeloSituacao situacao={alerta.nivel} />
          <Etiqueta
            texto={prazoDoAlerta(alerta)}
            icone={alerta.tipo === 'em_curso' ? 'clock-outline' : 'calendar-clock'}
          />
          <SeloOrigem origem={alerta.origem} />
        </View>
        <Texto variante="titulo2" cabecalho style={estilos.titulo}>
          {alerta.titulo}
        </Texto>
        <Texto variante="corpo" cor="secundario">
          {alerta.resumo}
        </Texto>
      </Cartao>

      {decisoes.length > 0 ? (
        <Aviso
          tom="sucesso"
          titulo="Decisão registrada"
          texto="Este alerta já tem decisão no diário. Se a situação mudar, registre uma nova decisão."
        />
      ) : null}

      {/* 2. Os dados */}
      {serie && !serie.protegido ? (
        <CartaoGrafico
          titulo="O que os dados mostram"
          subtitulo={`${definicao.nome}${alerta.setorNome ? ` · ${alerta.setorNome}` : ''}`}
          tabela={
            <TabelaDeSerie
              definicao={definicao}
              historico={serie.historico}
              previsao={serie.previsao}
              rotuloDaPrevisao={rotuloDaPrevisao}
            />
          }>
          <GraficoSerie
            definicao={definicao}
            historico={serie.historico}
            previsao={serie.previsao}
            limiares={serie.limiares}
            hoje={hojeDaSerie}
            forma={definicao.id === 'chuva_diaria' ? 'colunas' : 'linha'}
            rotuloDaPrevisao={rotuloDaPrevisao}
            descricaoAcessivel={`Gráfico de ${definicao.nome}. ${alerta.resumo}`}
          />
        </CartaoGrafico>
      ) : null}

      {/* 3. Justificativa */}
      <Secao titulo="Por que este alerta foi gerado">
        <Cartao>
          <ListaTopicos itens={alerta.justificativa} icone="check" corDoIcone={cores.primaria} />
        </Cartao>
      </Secao>

      {/* 4. Confiança */}
      <Secao titulo="Nível de confiança">
        <Cartao>
          <MedidorConfianca pontuacao={alerta.confianca.pontuacao} nivel={alerta.confianca.nivel} />
          <Texto variante="rotulo" style={estilos.subtitulo}>
            O que pesou nesta pontuação
          </Texto>
          <View style={estilos.fatores}>
            {alerta.confianca.fatores.map((fator, indice) => {
              const aumenta = fator.efeito > 0;
              const neutro = fator.efeito === 0;
              return (
                <View
                  key={indice}
                  style={estilos.fator}
                  accessible
                  accessibilityLabel={`${fator.descricao}: ${neutro ? 'não altera a confiança' : `${aumenta ? 'aumenta' : 'diminui'} a confiança em ${Math.abs(fator.efeito)} pontos`}`}>
                  <Icone
                    nome={neutro ? 'minus' : aumenta ? 'arrow-up' : 'arrow-down'}
                    tamanho={18}
                    cor={neutro ? cores.textoSuave : aumenta ? cores.sucesso : cores.erro}
                    style={estilos.iconeDoFator}
                  />
                  <Texto variante="rotulo" cor="secundario" style={estilos.flex}>
                    {fator.descricao}
                  </Texto>
                  <Texto variante="rotulo" style={estilos.pontos}>
                    {neutro ? '0' : formatarVariacao(fator.efeito, 0)}
                  </Texto>
                </View>
              );
            })}
          </View>
          <Texto variante="legenda" cor="suave" style={estilos.nota}>
            A confiança mede a consistência dos dados e do método — não é a probabilidade de o evento acontecer. A
            pontuação parte de 35 e fica sempre entre 5 e 95: nenhuma previsão é certa.
          </Texto>
        </Cartao>
      </Secao>

      {/* 5. Limitações */}
      <Secao titulo="Limitações" descricao="O que os dados e o método não enxergam.">
        <Cartao>
          <ListaTopicos itens={alerta.limitacoes} icone="alert-circle-outline" corDoIcone={cores.textoSecundario} />
        </Cartao>
      </Secao>

      {/* 6. Opções — nunca executadas pelo app */}
      <Secao titulo="Opções para a sua decisão">
        <Aviso
          tom="informacao"
          icone="robot-off-outline"
          texto="O painel não executa nenhuma destas medidas. São sugestões para a sua análise, classificadas pelo impacto na população."
        />
        <Cartao semPreenchimento>
          {alerta.opcoes.map((opcao, indice) => (
            <View
              key={opcao.id}
              style={[
                estilos.opcao,
                indice < alerta.opcoes.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth * 2,
                  borderBottomColor: cores.borda,
                },
              ]}>
              <Texto variante="corpo">{opcao.titulo}</Texto>
              <SeloImpacto impacto={opcao.impacto} />
            </View>
          ))}
        </Cartao>
        {temAltoImpacto ? (
          <Texto variante="legenda" cor="secundario">
            Medidas de impacto alto afetam diretamente a rotina das pessoas: ao registrá-las, o painel pede uma
            justificativa mais completa e a confirmação de que foram validadas pela equipe responsável.
          </Texto>
        ) : null}
      </Secao>

      {/* 7. Decisões já registradas */}
      {decisoes.length > 0 ? (
        <Secao titulo="Decisões registradas para este alerta">
          {decisoes.map((decisao) => (
            <CartaoDecisao key={decisao.id} decisao={decisao} semAlerta />
          ))}
        </Secao>
      ) : null}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  selos: { flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm },
  titulo: { marginTop: esp.md, marginBottom: esp.xs },
  subtitulo: { marginTop: esp.lg, marginBottom: esp.sm },
  fatores: { gap: esp.sm },
  fator: { flexDirection: 'row', gap: esp.sm },
  iconeDoFator: { marginTop: 1 },
  pontos: { fontVariant: ['tabular-nums'], minWidth: 30, textAlign: 'right' },
  nota: { marginTop: esp.md },
  opcao: { padding: esp.lg, gap: esp.sm },
});
