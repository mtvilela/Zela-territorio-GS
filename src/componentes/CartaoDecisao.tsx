/**
 * Cartão de uma decisão no diário: o que foi decidido, por quê, por quem (cargo) e em que
 * contexto (alerta e confiança no momento da decisão).
 */
import { StyleSheet, View } from 'react-native';

import { ROTULO_TIPO_DECISAO } from '@/dominio/decisoes';
import type { Decisao, TipoDecisao } from '@/dominio/tipos';
import { esp } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';
import { formatarDataHora } from '@/utils/datas';

import { Cartao } from './Cartao';
import { Icone, type NomeIcone } from './Icone';
import { Etiqueta, SeloConfianca, SeloImpacto, SeloSituacao } from './Selos';
import { Texto } from './Texto';

const ICONE_DO_TIPO: Record<TipoDecisao, NomeIcone> = {
  adotar_recomendacao: 'check-circle-outline',
  outra_medida: 'pencil-outline',
  monitorar: 'eye-outline',
  descartar: 'close-circle-outline',
};

interface Props {
  decisao: Decisao;
  /** Na tela do alerta o título do alerta já está visível, então pode ser omitido. */
  semAlerta?: boolean;
}

export function CartaoDecisao({ decisao, semAlerta = false }: Props) {
  const { cores } = useTema();
  return (
    <Cartao>
      <View style={estilos.topo}>
        <Icone nome={ICONE_DO_TIPO[decisao.tipo]} tamanho={22} cor={cores.primaria} />
        <View style={estilos.flex}>
          <Texto variante="corpoForte">{ROTULO_TIPO_DECISAO[decisao.tipo]}</Texto>
          <Texto variante="legenda" cor="secundario">
            {formatarDataHora(decisao.registradaEm)} · {decisao.responsavel}
          </Texto>
        </View>
      </View>

      <Texto variante="corpo" style={estilos.medida}>
        {decisao.medida}
      </Texto>

      <View style={estilos.etiquetas}>
        {decisao.impacto ? <SeloImpacto impacto={decisao.impacto} /> : null}
        {decisao.validacaoHumanaConfirmada ? (
          <Etiqueta texto="Validação humana confirmada" icone="account-check-outline" tom="sucesso" />
        ) : null}
      </View>

      <View style={[estilos.bloco, { borderLeftColor: cores.borda }]}>
        <Texto variante="micro" cor="suave">
          JUSTIFICATIVA
        </Texto>
        <Texto variante="rotulo" cor="secundario">
          {decisao.justificativa}
        </Texto>
      </View>

      {semAlerta ? null : (
        <View style={[estilos.alerta, { backgroundColor: cores.superficieSuave }]}>
          <Texto variante="micro" cor="suave">
            ALERTA NO MOMENTO DA DECISÃO
          </Texto>
          <Texto variante="rotulo">{decisao.alerta.titulo}</Texto>
          <View style={estilos.etiquetas}>
            <SeloSituacao situacao={decisao.alerta.nivel} />
            <SeloConfianca nivel={decisao.alerta.nivelConfianca} pontuacao={decisao.alerta.confianca} />
          </View>
        </View>
      )}
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  topo: { flexDirection: 'row', gap: esp.md, alignItems: 'flex-start' },
  medida: { marginTop: esp.md },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm, marginTop: esp.sm },
  bloco: { marginTop: esp.md, paddingLeft: esp.md, borderLeftWidth: 3, gap: esp.xxs },
  alerta: { marginTop: esp.md, padding: esp.md, borderRadius: 10, gap: esp.xs },
});
