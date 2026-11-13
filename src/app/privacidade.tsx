/**
 * Privacidade e dados: explica, em linguagem direta, o que o app guarda, o que sai do aparelho
 * e as regras que protegem os cidadãos — e permite apagar tudo.
 */
import { Stack } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { Aviso, LinhaDado, ListaTopicos, Secao } from '@/componentes/Blocos';
import { Botao } from '@/componentes/Botao';
import { Cartao } from '@/componentes/Cartao';
import { Tela } from '@/componentes/Tela';
import { Texto } from '@/componentes/Texto';
import { MINIMO_DOMICILIOS } from '@/dominio/privacidade';
import { useClima } from '@/estado/clima';
import { useConfiguracoes } from '@/estado/configuracoes';
import { useDecisoes } from '@/estado/decisoes';
import { useDemandasLocais } from '@/estado/demandas';
import { apagarDadosLocais } from '@/estado/painel';
import { esp } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';
import { formatarDataHora } from '@/utils/datas';
import { plural } from '@/utils/numeros';

export default function TelaPrivacidade() {
  const { cores } = useTema();
  const decisoes = useDecisoes((s) => s.decisoes);
  const locais = useDemandasLocais((s) => s.locais);
  const ajustes = useDemandasLocais((s) => s.ajustes);
  const limiares = useConfiguracoes((s) => s.limiares);
  const territorio = useConfiguracoes((s) => s.territorio);
  const clima = useClima((s) => s.dados);

  // Confirmação em dois passos, na própria tela (funciona igual em Android, iOS e web).
  const [confirmando, setConfirmando] = useState(false);
  const [apagado, setApagado] = useState(false);

  const apagar = () => {
    apagarDadosLocais();
    setConfirmando(false);
    setApagado(true);
    AccessibilityInfo.announceForAccessibility('Todos os dados deste aparelho foram apagados.');
  };

  return (
    <Tela testID="tela-privacidade">
      <Stack.Screen options={{ title: 'Privacidade e dados' }} />

      <Texto variante="rotulo" cor="secundario">
        O painel foi desenhado para decidir sobre o território sem precisar saber quem são as pessoas. Ele trabalha com
        dados agregados por setor e não tem cadastro, login, rastreamento ou anúncios.
      </Texto>

      <Secao titulo="Como os cidadãos são protegidos">
        <Cartao>
          <ListaTopicos
            icone="shield-check-outline"
            corDoIcone={cores.primaria}
            itens={[
              'Só dados agregados: todos os indicadores são por setor, nunca por pessoa, domicílio ou endereço.',
              `Agregação mínima: o consumo de água não é exibido nem projetado em setores com menos de ${MINIMO_DOMICILIOS} domicílios, onde a média poderia revelar hábitos de famílias identificáveis.`,
              'Formulários sem dados pessoais: não há campos de nome, contato ou endereço, e os textos livres são verificados para barrar CPF, telefone e e-mail.',
              'Decisões por cargo: o diário registra a função de quem decidiu, não o nome.',
              'Sem localização do aparelho: o app não pede acesso ao GPS, à câmera, aos contatos ou a qualquer outra permissão.',
            ]}
          />
        </Cartao>
      </Secao>

      <Secao titulo="O que sai do aparelho">
        <Cartao>
          <ListaTopicos
            icone="earth"
            itens={[
              'Consulta do clima: a coordenada do território, arredondada para cerca de 1 km, é enviada à Open-Meteo. É a coordenada do município, não a sua.',
              'Busca de município: apenas o nome digitado é enviado à Open-Meteo.',
              'Mais nada: decisões, solicitações e ajustes nunca são enviados a servidores.',
            ]}
          />
        </Cartao>
      </Secao>

      <Secao titulo="O que está guardado neste aparelho">
        <Cartao>
          <View style={estilos.linhas}>
            <LinhaDado rotulo="Decisões no diário" valor={plural(decisoes.length, 'registro', 'registros')} />
            <LinhaDado rotulo="Solicitações registradas aqui" valor={plural(locais.length, 'registro', 'registros')} />
            <LinhaDado
              rotulo="Status alterados em solicitações sintéticas"
              valor={plural(Object.keys(ajustes).length, 'alteração', 'alterações')}
            />
            <LinhaDado
              rotulo="Limites personalizados"
              valor={plural(Object.keys(limiares).length, 'indicador', 'indicadores')}
            />
            <LinhaDado rotulo="Território escolhido" valor={territorio.nome} />
            <LinhaDado
              rotulo="Última previsão do tempo"
              valor={clima ? formatarDataHora(clima.obtidoEm) : 'nenhuma guardada'}
            />
          </View>
          <Texto variante="legenda" cor="suave" style={estilos.nota}>
            Esses dados ficam no armazenamento local do aplicativo e são removidos se ele for desinstalado.
          </Texto>
        </Cartao>
      </Secao>

      <Secao titulo="Apagar os dados">
        {apagado ? (
          <Aviso
            tom="sucesso"
            titulo="Dados apagados"
            texto="O diário de decisões, as solicitações registradas e os ajustes foram removidos. O painel voltou às configurações iniciais e consultou o clima de novo."
          />
        ) : null}

        {confirmando ? (
          <Cartao>
            <Texto variante="corpoForte">Apagar tudo deste aparelho?</Texto>
            <Texto variante="rotulo" cor="secundario">
              O diário de decisões e as solicitações registradas aqui serão perdidos. Não é possível desfazer.
            </Texto>
            <View style={estilos.botoes}>
              <Botao titulo="Cancelar" variante="secundario" aoPressionar={() => setConfirmando(false)} />
              <Botao
                titulo="Apagar definitivamente"
                icone="delete-outline"
                variante="perigo"
                aoPressionar={apagar}
                testID="botao-confirmar-apagar"
              />
            </View>
          </Cartao>
        ) : (
          <Botao
            titulo="Apagar todos os dados deste aparelho"
            icone="delete-outline"
            variante="perigo"
            largo
            aoPressionar={() => {
              setApagado(false);
              setConfirmando(true);
            }}
            testID="botao-apagar"
          />
        )}
      </Secao>

      <Texto variante="legenda" cor="suave">
        Em um uso real, com dados de concessionárias e da prefeitura, o tratamento teria de seguir a Lei Geral de
        Proteção de Dados (LGPD): base legal definida, dados mínimos, acesso controlado e registro de quem consultou.
      </Texto>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  linhas: { gap: esp.sm },
  nota: { marginTop: esp.md },
  botoes: { flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm, marginTop: esp.lg },
});
