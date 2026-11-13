/**
 * Diário de decisões: tudo o que o gestor decidiu a partir dos alertas, com a justificativa.
 * É a memória e a prestação de contas do painel — e fica salvo no aparelho.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Aviso, EstadoVazio } from '@/componentes/Blocos';
import { Cartao } from '@/componentes/Cartao';
import { CartaoDecisao } from '@/componentes/CartaoDecisao';
import { SeletorOpcoes } from '@/componentes/Formulario';
import { TituloDaTela } from '@/componentes/Marca';
import { Tela } from '@/componentes/Tela';
import { Texto } from '@/componentes/Texto';
import { useDecisoes } from '@/estado/decisoes';
import { esp } from '@/tema/medidas';
import { formatarNumero, plural } from '@/utils/numeros';

type Filtro = 'todas' | 'com_medida' | 'sem_medida';

export default function TelaDecisoes() {
  const router = useRouter();
  const decisoes = useDecisoes((s) => s.decisoes);
  const [filtro, setFiltro] = useState<Filtro>('todas');

  const comMedida = decisoes.filter((d) => d.tipo === 'adotar_recomendacao' || d.tipo === 'outra_medida');
  const semMedida = decisoes.filter((d) => d.tipo === 'monitorar' || d.tipo === 'descartar');
  const altoImpacto = decisoes.filter((d) => d.impacto === 'alto');
  const visiveis = filtro === 'com_medida' ? comMedida : filtro === 'sem_medida' ? semMedida : decisoes;

  return (
    <Tela aba testID="tela-decisoes">
      <TituloDaTela
        titulo="Diário de decisões"
        descricao="O registro do que foi decidido por pessoas a partir dos alertas, e por quê."
      />

      {decisoes.length === 0 ? (
        <EstadoVazio
          icone="notebook-check-outline"
          titulo="Nenhuma decisão registrada"
          texto="Abra um alerta, analise a justificativa e as limitações e registre o que foi decidido. O registro fica salvo neste aparelho."
          acao={{ titulo: 'Ver alertas', icone: 'alert-outline', aoPressionar: () => router.navigate('/alertas') }}
        />
      ) : (
        <>
          <Cartao>
            <View
              style={estilos.resumo}
              accessible
              accessibilityLabel={`${plural(decisoes.length, 'decisão registrada', 'decisões registradas')}. ${formatarNumero(comMedida.length)} com medida adotada, ${formatarNumero(semMedida.length)} de monitorar ou descartar, ${formatarNumero(altoImpacto.length)} de alto impacto.`}>
              <Numero valor={decisoes.length} rotulo="registradas" />
              <Numero valor={comMedida.length} rotulo="com medida" />
              <Numero valor={semMedida.length} rotulo="monitorar ou descartar" />
              <Numero valor={altoImpacto.length} rotulo="de alto impacto" />
            </View>
          </Cartao>

          <SeletorOpcoes<Filtro>
            rotuloAcessivel="Filtrar decisões"
            valor={filtro}
            aoMudar={setFiltro}
            opcoes={[
              { valor: 'todas', rotulo: `Todas (${decisoes.length})` },
              { valor: 'com_medida', rotulo: `Com medida (${comMedida.length})` },
              { valor: 'sem_medida', rotulo: `Monitorar ou descartar (${semMedida.length})` },
            ]}
          />

          {visiveis.length === 0 ? (
            <EstadoVazio
              icone="filter-variant"
              titulo="Nada neste filtro"
              texto="Nenhuma decisão corresponde ao filtro escolhido."
            />
          ) : (
            visiveis.map((decisao) => <CartaoDecisao key={decisao.id} decisao={decisao} />)
          )}
        </>
      )}

      <Aviso
        tom="informacao"
        icone="account-check-outline"
        texto="O aplicativo registra decisões, mas não as executa: cada medida depende das equipes e dos órgãos responsáveis."
      />
    </Tela>
  );
}

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <View style={estilos.numero}>
      <Texto variante="titulo2">{formatarNumero(valor)}</Texto>
      <Texto variante="micro" cor="secundario">
        {rotulo}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  resumo: { flexDirection: 'row', flexWrap: 'wrap', rowGap: esp.md, columnGap: esp.lg },
  numero: { minWidth: 96, flexGrow: 1 },
});
