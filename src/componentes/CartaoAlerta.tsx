/**
 * Cartão de um alerta na lista: nível, prazo, título, resumo, confiança e se já há decisão.
 * O leitor de tela lê tudo isso como uma frase só.
 */
import { StyleSheet, View } from 'react-native';

import { ROTULO_CONFIANCA } from '@/dominio/confianca';
import { ROTULO_SITUACAO } from '@/dominio/limiares';
import type { Alerta } from '@/dominio/tipos';
import { esp } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';
import { descreverPrazo } from '@/utils/datas';

import { Cartao } from './Cartao';
import { Icone, ICONE_DO_TEMA } from './Icone';
import { Etiqueta, SeloConfianca, SeloSituacao } from './Selos';
import { Texto } from './Texto';

interface Props {
  alerta: Alerta;
  /** Já existe decisão registrada para este alerta? */
  decidido: boolean;
  aoPressionar: () => void;
  testID?: string;
}

/** "Previsto em 3 dias", "Previsto para amanhã", "Em curso". */
export function prazoDoAlerta(alerta: Alerta): string {
  if (alerta.tipo === 'em_curso') return 'Em curso';
  const prazo = descreverPrazo(alerta.diasAte);
  return alerta.diasAte <= 1 ? `Previsto para ${prazo}` : `Previsto ${prazo}`;
}

export function CartaoAlerta({ alerta, decidido, aoPressionar, testID }: Props) {
  const { cores } = useTema();
  const prazo = prazoDoAlerta(alerta);
  const situacaoDaDecisao = decidido ? 'Decisão registrada' : 'Aguardando decisão';

  return (
    <Cartao
      faixa={alerta.nivel}
      aoPressionar={aoPressionar}
      testID={testID}
      rotuloAcessivel={`Alerta de nível ${ROTULO_SITUACAO[alerta.nivel].toLowerCase()}. ${alerta.titulo}. ${prazo}. ${ROTULO_CONFIANCA[alerta.confianca.nivel]}. ${situacaoDaDecisao}.`}
      dicaAcessivel="Abre a justificativa, a confiança, as limitações e as opções de decisão.">
      <View style={estilos.topo}>
        {/* Os selos quebram de linha entre si; o ícone do tema fica sempre no canto direito. */}
        <View style={estilos.selos}>
          <SeloSituacao situacao={alerta.nivel} />
          <Etiqueta texto={prazo} icone={alerta.tipo === 'em_curso' ? 'clock-outline' : 'calendar-clock'} />
        </View>
        <Icone nome={ICONE_DO_TEMA[alerta.tema]} tamanho={22} cor={cores.textoSuave} />
      </View>

      <Texto variante="titulo3" style={estilos.titulo}>
        {alerta.titulo}
      </Texto>
      <Texto variante="rotulo" cor="secundario">
        {alerta.resumo}
      </Texto>

      <View style={estilos.rodape}>
        <SeloConfianca nivel={alerta.confianca.nivel} pontuacao={alerta.confianca.pontuacao} />
        <View style={estilos.flex} />
        <View style={estilos.decisao}>
          <Icone
            nome={decidido ? 'check-circle-outline' : 'progress-clock'}
            tamanho={16}
            cor={decidido ? cores.sucesso : cores.textoSecundario}
          />
          <Texto variante="micro" cor={decidido ? 'sucesso' : 'secundario'}>
            {situacaoDaDecisao}
          </Texto>
        </View>
      </View>
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  topo: { flexDirection: 'row', alignItems: 'flex-start', gap: esp.sm },
  selos: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm },
  titulo: { marginTop: esp.md, marginBottom: esp.xs },
  rodape: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: esp.sm, marginTop: esp.md },
  decisao: { flexDirection: 'row', alignItems: 'center', gap: esp.xs },
});
