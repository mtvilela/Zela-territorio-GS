/**
 * Escolha do território: busca um município brasileiro na API pública de geocodificação
 * (Open-Meteo) e passa a usar a coordenada dele na consulta do clima.
 *
 * A tela trata todos os estados de uma consulta: validação do termo, carregando, erro
 * (com tentar de novo), nenhum resultado e lista de resultados.
 */
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';

import { Aviso, EstadoVazio, Secao } from '@/componentes/Blocos';
import { Botao } from '@/componentes/Botao';
import { Cartao } from '@/componentes/Cartao';
import { CampoTexto } from '@/componentes/Formulario';
import { Icone } from '@/componentes/Icone';
import { Tela } from '@/componentes/Tela';
import { Texto } from '@/componentes/Texto';
import { TERRITORIO_PADRAO } from '@/dados/catalogo';
import { buscarMunicipios, mensagemDeErro, type LocalEncontrado } from '@/dados/openMeteo';
import { LIMITES, validarBusca } from '@/dominio/validacao';
import { useConfiguracoes } from '@/estado/configuracoes';
import { esp, TOQUE_MINIMO } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';
import { formatarNumero, plural } from '@/utils/numeros';

type Consulta =
  | { situacao: 'inicial' }
  | { situacao: 'carregando' }
  | { situacao: 'erro'; mensagem: string }
  | { situacao: 'sucesso'; locais: LocalEncontrado[]; termo: string };

export default function TelaTerritorio() {
  const { cores } = useTema();
  const territorio = useConfiguracoes((s) => s.territorio);
  const definirTerritorio = useConfiguracoes((s) => s.definirTerritorio);

  const [termo, setTermo] = useState('');
  const [erroDoTermo, setErroDoTermo] = useState<string | null>(null);
  const [consulta, setConsulta] = useState<Consulta>({ situacao: 'inicial' });
  const [alterado, setAlterado] = useState<string | null>(null);

  const ehPadrao =
    territorio.latitude === TERRITORIO_PADRAO.latitude && territorio.longitude === TERRITORIO_PADRAO.longitude;

  const buscar = async () => {
    const erro = validarBusca(termo);
    setErroDoTermo(erro);
    if (erro) return;

    setAlterado(null);
    setConsulta({ situacao: 'carregando' });
    try {
      const locais = await buscarMunicipios(termo);
      setConsulta({ situacao: 'sucesso', locais, termo: termo.trim() });
      AccessibilityInfo.announceForAccessibility(
        plural(locais.length, 'município encontrado', 'municípios encontrados'),
      );
    } catch (falha) {
      setConsulta({ situacao: 'erro', mensagem: mensagemDeErro(falha) });
    }
  };

  const escolher = (local: LocalEncontrado) => {
    // Trocar o território dispara uma nova consulta de clima (ver o layout raiz).
    definirTerritorio({ nome: local.nome, estado: local.estado, latitude: local.latitude, longitude: local.longitude });
    setAlterado(local.estado ? `${local.nome} — ${local.estado}` : local.nome);
    setConsulta({ situacao: 'inicial' });
    setTermo('');
    AccessibilityInfo.announceForAccessibility(`Território alterado para ${local.nome}.`);
  };

  const voltarAoPadrao = () => {
    definirTerritorio(TERRITORIO_PADRAO);
    setAlterado(`${TERRITORIO_PADRAO.nome} — ${TERRITORIO_PADRAO.estado}`);
  };

  return (
    <Tela testID="tela-territorio">
      <Stack.Screen options={{ title: 'Território' }} />

      <Cartao>
        <Texto variante="legenda" cor="secundario">
          Território atual
        </Texto>
        <Texto variante="titulo2">
          {territorio.estado ? `${territorio.nome} — ${territorio.estado}` : territorio.nome}
        </Texto>
        <Texto variante="legenda" cor="suave">
          Coordenada usada na consulta do clima: {formatarNumero(territorio.latitude, 2)}°,{' '}
          {formatarNumero(territorio.longitude, 2)}° (arredondada, cerca de 1 km).
        </Texto>
        {!ehPadrao ? (
          <Botao
            titulo={`Voltar para ${TERRITORIO_PADRAO.nome}`}
            icone="restore"
            variante="fantasma"
            compacto
            aoPressionar={voltarAoPadrao}
            style={estilos.botaoPadrao}
          />
        ) : null}
      </Cartao>

      {alterado ? (
        <Aviso
          tom="sucesso"
          titulo="Território alterado"
          texto={`O clima do painel agora é o de ${alterado}. A previsão está sendo consultada.`}
        />
      ) : null}

      <Secao
        titulo="Buscar município"
        descricao="A busca usa a base pública de localidades da Open-Meteo, restrita ao Brasil.">
        <CampoTexto
          rotulo="Nome do município"
          valor={termo}
          aoMudar={(texto) => {
            setTermo(texto);
            if (erroDoTermo) setErroDoTermo(validarBusca(texto));
          }}
          erro={erroDoTermo ?? undefined}
          maximo={LIMITES.busca.maximo}
          placeholder="Ex.: Campinas"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={buscar}
          testID="campo-busca"
        />
        <Botao
          titulo="Buscar"
          icone="magnify"
          aoPressionar={buscar}
          carregando={consulta.situacao === 'carregando'}
          largo
          testID="botao-buscar"
        />
      </Secao>

      {consulta.situacao === 'carregando' ? (
        <View style={estilos.carregando} accessibilityLiveRegion="polite">
          <ActivityIndicator color={cores.primaria} />
          <Texto variante="rotulo" cor="secundario">
            Buscando municípios…
          </Texto>
        </View>
      ) : null}

      {consulta.situacao === 'erro' ? (
        <Aviso
          tom="erro"
          titulo="Não foi possível buscar"
          texto={consulta.mensagem}
          icone="cloud-off-outline"
          acao={{ titulo: 'Tentar de novo', aoPressionar: buscar }}
        />
      ) : null}

      {consulta.situacao === 'sucesso' && consulta.locais.length === 0 ? (
        <EstadoVazio
          icone="map-marker-outline"
          titulo="Nenhum município encontrado"
          texto={`Não há resultados para "${consulta.termo}". Confira a grafia ou tente só o começo do nome.`}
        />
      ) : null}

      {consulta.situacao === 'sucesso' && consulta.locais.length > 0 ? (
        <Secao
          titulo={plural(consulta.locais.length, 'resultado', 'resultados')}
          descricao="Toque para usar como território.">
          <Cartao semPreenchimento>
            {consulta.locais.map((local, indice) => {
              const detalhe = [local.estado, local.populacao ? `${formatarNumero(local.populacao)} habitantes` : null]
                .filter(Boolean)
                .join(' · ');
              return (
                <Pressable
                  key={local.id}
                  onPress={() => escolher(local)}
                  accessibilityRole="button"
                  accessibilityLabel={`Usar ${local.nome}${detalhe ? `, ${detalhe}` : ''} como território`}
                  testID={`resultado-${indice}`}
                  style={({ pressed }) => [
                    estilos.resultado,
                    indice < consulta.locais.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth * 2,
                      borderBottomColor: cores.borda,
                    },
                    pressed && { backgroundColor: cores.superficieSuave },
                  ]}>
                  <Icone nome="map-marker-outline" tamanho={22} cor={cores.primaria} />
                  <View style={estilos.flex}>
                    <Texto variante="corpoForte">{local.nome}</Texto>
                    {detalhe ? (
                      <Texto variante="legenda" cor="secundario">
                        {detalhe}
                      </Texto>
                    ) : null}
                  </View>
                  <Icone nome="chevron-right" tamanho={22} cor={cores.textoSuave} />
                </Pressable>
              );
            })}
          </Cartao>
        </Secao>
      ) : null}

      <Aviso
        tom="informacao"
        texto="Trocar o território muda apenas os dados de clima, que são públicos. Os setores e os indicadores de água, energia, resíduos e serviços são sintéticos e continuam os mesmos. A busca envia somente o nome digitado."
      />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  botaoPadrao: { marginTop: esp.md },
  carregando: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: esp.md, padding: esp.lg },
  resultado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: esp.md,
    minHeight: TOQUE_MINIMO + 8,
    paddingVertical: esp.md,
    paddingHorizontal: esp.lg,
  },
});
