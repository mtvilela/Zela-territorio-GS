/**
 * Cartão de um tema no painel (clima, água, energia, resíduos, serviços): mostra o indicador
 * principal no setor em pior situação, a variação em 7 dias, um minigráfico e a situação.
 */
import { StyleSheet, View } from 'react-native';

import { TEMAS } from '@/dados/catalogo';
import type { ResumoDoTema } from '@/dados/painel';
import { valorDoIndicador } from '@/dominio/alertas';
import { ROTULO_SITUACAO } from '@/dominio/limiares';
import type { SerieIndicador } from '@/dominio/tipos';
import { esp, raio } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';
import { descreverPrazo, formatarDiaEData } from '@/utils/datas';
import { formatarVariacao, plural } from '@/utils/numeros';

import { Cartao } from './Cartao';
import { MiniGrafico } from './graficos/MiniGrafico';
import { Icone, ICONE_DO_TEMA, type NomeIcone } from './Icone';
import { SeloOrigem, SeloSituacao } from './Selos';
import { Texto } from './Texto';

interface Props {
  resumo: ResumoDoTema;
  aoPressionar: () => void;
  /** Mensagem quando o tema ainda não tem dados (ex.: clima carregando ou sem conexão). */
  avisoSemDados?: string;
  testID?: string;
}

interface Destaque {
  valor: string;
  legenda: string;
  variacao: { texto: string; icone: NomeIcone } | null;
}

/** Decide o que o cartão mostra em destaque para a série do tema. */
export function destaqueDaSerie(serie: SerieIndicador): Destaque {
  const def = serie.definicao;

  // Clima: o que importa é o pico previsto para a semana, não o valor de hoje.
  if (serie.metodo === 'modelo_meteorologico' && serie.previsao.length > 0) {
    const pico = serie.previsao.reduce((maior, p) => (p.valor > maior.valor ? p : maior));
    return {
      valor: valorDoIndicador(def, pico.valor),
      legenda: `${def.nomeCurto}: pico previsto para ${formatarDiaEData(pico.data)}`,
      variacao: null,
    };
  }

  let variacao: Destaque['variacao'] = null;
  const haUmaSemana = serie.historico[serie.historico.length - 8];
  if (serie.valorAtual !== null && haUmaSemana) {
    const diferenca = serie.valorAtual - haUmaSemana.valor;
    const unidade = def.unidade === '%' ? 'p.p.' : def.unidade === 'solicitações' ? '' : def.unidade;
    const casas = def.unidade === 'solicitações' ? 0 : 1;
    variacao = {
      texto: `${formatarVariacao(diferenca, casas)}${unidade ? ` ${unidade}` : ''} em 7 dias`,
      icone: Math.abs(diferenca) < 0.05 ? 'minus' : diferenca > 0 ? 'arrow-top-right' : 'arrow-bottom-right',
    };
  }

  return {
    valor: valorDoIndicador(def, serie.valorAtual),
    legenda: serie.setor ? `${def.nomeCurto} · ${serie.setor.nome}` : def.nomeCurto,
    variacao,
  };
}

export function CartaoTema({ resumo, aoPressionar, avisoSemDados, testID }: Props) {
  const { cores } = useTema();
  const tema = TEMAS[resumo.tema];
  const serie = resumo.destaque;
  const alertaPrincipal = resumo.alertas[0];

  const textoDaSituacao = !alertaPrincipal
    ? ROTULO_SITUACAO.normal
    : alertaPrincipal.tipo === 'em_curso'
      ? `${ROTULO_SITUACAO[alertaPrincipal.nivel]} agora`
      : `${ROTULO_SITUACAO[alertaPrincipal.nivel]} ${descreverPrazo(alertaPrincipal.diasAte)}`;

  const destaque = serie ? destaqueDaSerie(serie) : null;
  const totalDeAlertas = resumo.alertas.length;

  const rotuloAcessivel = destaque
    ? `${tema.nome}. ${destaque.legenda}: ${destaque.valor}${destaque.variacao ? `, ${destaque.variacao.texto}` : ''}. Situação: ${textoDaSituacao}. ${plural(totalDeAlertas, 'alerta', 'alertas')}.`
    : `${tema.nome}. ${avisoSemDados ?? 'Sem dados.'}`;

  return (
    <Cartao
      aoPressionar={aoPressionar}
      rotuloAcessivel={rotuloAcessivel}
      dicaAcessivel="Abre os gráficos e os setores deste tema."
      testID={testID}>
      <View style={estilos.topo}>
        <View style={[estilos.icone, { backgroundColor: cores.primariaSuave }]}>
          <Icone nome={ICONE_DO_TEMA[resumo.tema]} tamanho={22} cor={cores.primaria} />
        </View>
        <Texto variante="titulo3" style={estilos.flex} numberOfLines={1}>
          {tema.nome}
        </Texto>
        {destaque ? <SeloSituacao situacao={resumo.situacao} texto={textoDaSituacao} /> : null}
      </View>

      {destaque && serie ? (
        <>
          <View style={estilos.meio}>
            <View style={estilos.flex}>
              <Texto variante="legenda" cor="secundario" numberOfLines={2}>
                {destaque.legenda}
              </Texto>
              <Texto variante="numero">{destaque.valor}</Texto>
              {destaque.variacao ? (
                <View style={estilos.variacao}>
                  <Icone nome={destaque.variacao.icone} tamanho={16} cor={cores.textoSecundario} />
                  <Texto variante="legenda" cor="secundario">
                    {destaque.variacao.texto}
                  </Texto>
                </View>
              ) : null}
            </View>
            <MiniGrafico
              historico={serie.historico.slice(-14).map((p) => p.valor)}
              previsao={serie.previsao.map((p) => p.valor)}
            />
          </View>
          <View style={estilos.rodape}>
            <SeloOrigem origem={serie.definicao.origem} />
            <View style={estilos.flex} />
            <Texto variante="micro" cor="secundario">
              {totalDeAlertas === 0 ? 'Sem alertas' : plural(totalDeAlertas, 'alerta', 'alertas')}
            </Texto>
            <Icone nome="chevron-right" tamanho={18} cor={cores.textoSuave} />
          </View>
        </>
      ) : (
        <Texto variante="rotulo" cor="secundario" style={estilos.semDados}>
          {avisoSemDados ?? 'Sem dados para este tema.'}
        </Texto>
      )}
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: esp.md },
  icone: {
    width: 38,
    height: 38,
    borderRadius: raio.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meio: { flexDirection: 'row', alignItems: 'flex-end', gap: esp.md, marginTop: esp.md },
  variacao: { flexDirection: 'row', alignItems: 'center', gap: esp.xs },
  rodape: { flexDirection: 'row', alignItems: 'center', gap: esp.xs, marginTop: esp.md },
  semDados: { marginTop: esp.md },
});
