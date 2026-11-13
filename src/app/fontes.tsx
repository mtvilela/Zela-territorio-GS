/**
 * Fontes de dados e limitações: de onde vem cada número do painel, como as projeções e a
 * confiança são calculadas e o que nada disso consegue enxergar.
 */
import { Stack } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { ListaTopicos, Secao } from '@/componentes/Blocos';
import { Botao } from '@/componentes/Botao';
import { Cartao } from '@/componentes/Cartao';
import { Icone, ICONE_DO_TEMA } from '@/componentes/Icone';
import { SeloOrigem } from '@/componentes/Selos';
import { Tela } from '@/componentes/Tela';
import { Texto } from '@/componentes/Texto';
import { INDICADORES, ORDEM_INDICADORES, TEMAS } from '@/dados/catalogo';
import { DIAS_PASSADOS, DIAS_PREVISTOS } from '@/dados/openMeteo';
import { DIAS_DE_HISTORICO } from '@/dados/sintetico';
import { PONTUACAO_BASE, PONTUACAO_MAXIMA, PONTUACAO_MINIMA } from '@/dominio/confianca';
import {
  HORIZONTE_PADRAO,
  JANELA_MEDIA_MOVEL,
  JANELA_TENDENCIA,
  MINIMO_PONTOS,
  R2_MINIMO_TENDENCIA,
} from '@/dominio/previsao';
import { esp } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';
import { formatarNumero } from '@/utils/numeros';

const LINKS = [
  { titulo: 'Open-Meteo: documentação da API', url: 'https://open-meteo.com/en/docs' },
  { titulo: 'Open-Meteo: licença dos dados (CC BY 4.0)', url: 'https://open-meteo.com/en/license' },
  { titulo: 'INMET: avisos meteorológicos', url: 'https://avisos.inmet.gov.br/' },
  { titulo: 'ONU: ODS 11 — cidades e comunidades sustentáveis', url: 'https://sdgs.un.org/goals/goal11' },
];

export default function TelaFontes() {
  const { cores } = useTema();

  return (
    <Tela testID="tela-fontes">
      <Stack.Screen options={{ title: 'Fontes e limitações' }} />

      <Texto variante="rotulo" cor="secundario">
        Um painel só merece confiança se disser de onde vêm os números e o que eles não mostram. Esta tela reúne essas
        informações.
      </Texto>

      <Secao titulo="Fontes de dados">
        <Cartao>
          <SeloOrigem origem="publica" />
          <Texto variante="titulo3" style={estilos.titulo}>
            Clima: Open-Meteo
          </Texto>
          <Texto variante="rotulo" cor="secundario">
            API pública e gratuita, sem cadastro. O painel consulta a chuva diária, a probabilidade de chuva e a
            sensação térmica do ponto central do território: {DIAS_PASSADOS} dias passados e {DIAS_PREVISTOS} dias de
            previsão. Os valores vêm de modelos meteorológicos de serviços nacionais de meteorologia, combinados pela
            Open-Meteo. Dados sob licença CC BY 4.0 — Weather data by Open-Meteo.com.
          </Texto>
        </Cartao>
        <Cartao>
          <SeloOrigem origem="sintetica" />
          <Texto variante="titulo3" style={estilos.titulo}>
            Água, energia, resíduos e serviços: dados sintéticos
          </Texto>
          <Texto variante="rotulo" cor="secundario">
            São séries de {DIAS_DE_HISTORICO} dias geradas pelo próprio aplicativo para demonstrar o painel. Os setores
            são fictícios. Dados reais desses temas pertencem a concessionárias e prefeituras e só poderiam ser usados
            com autorização. O cenário é ancorado na data de hoje, então a demonstração é a mesma em qualquer dia.
          </Texto>
        </Cartao>
        <Cartao>
          <SeloOrigem origem="mista" />
          <Texto variante="titulo3" style={estilos.titulo}>
            Solicitações de zeladoria
          </Texto>
          <Texto variante="rotulo" cor="secundario">
            A fila soma solicitações sintéticas com as que você registra neste aparelho. As suas ficam salvas localmente
            e entram na hora nos indicadores e nos alertas.
          </Texto>
        </Cartao>
      </Secao>

      <Secao titulo="Como as projeções são feitas">
        <Cartao>
          <ListaTopicos
            icone="chart-line"
            corDoIcone={cores.primaria}
            itens={[
              `Clima: o painel não projeta nada — usa a previsão do modelo meteorológico para os próximos ${DIAS_PREVISTOS} dias.`,
              `Demais indicadores: uma reta é ajustada aos últimos ${JANELA_TENDENCIA} dias (mínimos quadrados) e prolongada por ${HORIZONTE_PADRAO} dias.`,
              `Quando a reta explica pouco dos dados (R² abaixo de ${formatarNumero(R2_MINIMO_TENDENCIA, 1)}), o painel não extrapola: repete a média dos últimos ${JANELA_MEDIA_MOVEL} dias.`,
              `Com menos de ${MINIMO_PONTOS} leituras, não há projeção nem alerta: o painel prefere se calar.`,
              'A faixa provável é o intervalo de 80% da projeção: ela se alarga quanto mais distante é o dia.',
            ]}
          />
        </Cartao>
      </Secao>

      <Secao titulo="Como a confiança é calculada">
        <Cartao>
          <ListaTopicos
            icone="signal-cellular-2"
            corDoIcone={cores.primaria}
            itens={[
              `A pontuação parte de ${PONTUACAO_BASE} e fica sempre entre ${PONTUACAO_MINIMA} e ${PONTUACAO_MAXIMA}: nenhuma previsão é certa.`,
              'Somam pontos: histórico longo, tendência consistente, prazo curto e o limite ultrapassado mesmo na ponta favorável da faixa.',
              'Tiram pontos: histórico curto, valores oscilando, prazo distante e previsão muito próxima do limite.',
              'No clima, pesam o prazo da previsão e a probabilidade de chuva informada pelo modelo.',
              'A tela de cada alerta mostra exatamente quais fatores pesaram, e quanto.',
            ]}
          />
        </Cartao>
      </Secao>

      <Secao titulo="Limitações gerais">
        <Cartao>
          <ListaTopicos
            icone="alert-circle-outline"
            itens={[
              'Tendência não é causa: a reta descreve o ritmo recente, não explica por que ele existe nem quando vai mudar.',
              'Dados sintéticos não validam o método: com dados reais, os limites e as regras precisariam ser recalibrados.',
              'O que não é medido não aparece: problemas não registrados e áreas sem sensor ficam invisíveis.',
              'O painel não substitui vistoria em campo nem os avisos oficiais da Defesa Civil, do INMET e do CEMADEN.',
              'Nenhuma medida é executada pelo aplicativo: decisões de alto impacto dependem sempre de pessoas.',
            ]}
          />
        </Cartao>
      </Secao>

      <Secao titulo="Indicador por indicador">
        {ORDEM_INDICADORES.map((id) => {
          const definicao = INDICADORES[id];
          return (
            <Cartao key={id}>
              <View style={estilos.cabecalho}>
                <Icone nome={ICONE_DO_TEMA[definicao.tema]} tamanho={22} cor={cores.primaria} />
                <View style={estilos.flex}>
                  <Texto variante="corpoForte">{definicao.nome}</Texto>
                  <Texto variante="legenda" cor="secundario">
                    {TEMAS[definicao.tema].nome} · {definicao.fonte}
                  </Texto>
                </View>
              </View>
              <Texto variante="rotulo" cor="secundario" style={estilos.descricao}>
                {definicao.descricao}
              </Texto>
              <ListaTopicos itens={definicao.limitacoes} />
            </Cartao>
          );
        })}
      </Secao>

      <Secao titulo="Referências">
        <View style={estilos.links}>
          {LINKS.map((link) => (
            <Botao
              key={link.url}
              titulo={link.titulo}
              icone="open-in-new"
              variante="fantasma"
              compacto
              aoPressionar={() => Linking.openURL(link.url)}
              dicaAcessivel="Abre no navegador."
            />
          ))}
        </View>
      </Secao>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  titulo: { marginTop: esp.sm, marginBottom: esp.xs },
  cabecalho: { flexDirection: 'row', gap: esp.md, alignItems: 'flex-start' },
  descricao: { marginVertical: esp.sm },
  links: { gap: esp.xs },
});
