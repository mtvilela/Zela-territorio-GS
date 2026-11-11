/**
 * Blocos de layout usados em várias telas: título de seção, aviso, estado vazio,
 * item de lista e lista de tópicos.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { esp, raio, TOQUE_MINIMO } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';

import { Botao } from './Botao';
import { Icone, type NomeIcone } from './Icone';
import { Texto } from './Texto';

// ---------------------------------------------------------------------------------------------

interface PropsSecao {
  titulo: string;
  descricao?: string;
  /** Elemento alinhado à direita do título (ex.: botão "Ver todos"). */
  acao?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Agrupa um trecho da tela sob um título (anunciado como título para leitores de tela). */
export function Secao({ titulo, descricao, acao, children, style }: PropsSecao) {
  return (
    <View style={[estilos.secao, style]}>
      <View style={estilos.linhaTitulo}>
        <View style={estilos.flex}>
          <Texto variante="titulo2" cabecalho>
            {titulo}
          </Texto>
          {descricao ? (
            <Texto variante="legenda" cor="secundario">
              {descricao}
            </Texto>
          ) : null}
        </View>
        {acao}
      </View>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------

type TomAviso = 'informacao' | 'atencao' | 'erro' | 'sucesso';

interface PropsAviso {
  tom?: TomAviso;
  titulo?: string;
  texto: string;
  icone?: NomeIcone;
  acao?: { titulo: string; aoPressionar: () => void; carregando?: boolean };
  style?: StyleProp<ViewStyle>;
}

/** Faixa de aviso com ícone, texto e ação opcional. Erros são anunciados por leitores de tela. */
export function Aviso({ tom = 'informacao', titulo, texto, icone, acao, style }: PropsAviso) {
  const { cores } = useTema();
  const aparencia = {
    informacao: { fundo: cores.primariaSuave, cor: cores.primariaForte, icone: 'information-outline' as NomeIcone },
    atencao: {
      fundo: cores.situacao.atencao.fundo,
      cor: cores.situacao.atencao.icone,
      icone: 'alert-outline' as NomeIcone,
    },
    erro: { fundo: cores.erroFundo, cor: cores.erro, icone: 'alert-circle-outline' as NomeIcone },
    sucesso: { fundo: cores.sucessoFundo, cor: cores.sucesso, icone: 'check-circle-outline' as NomeIcone },
  }[tom];

  return (
    <View
      style={[estilos.aviso, { backgroundColor: aparencia.fundo }, style]}
      accessibilityRole={tom === 'erro' ? 'alert' : undefined}
      accessibilityLiveRegion={tom === 'erro' || tom === 'sucesso' ? 'polite' : 'none'}>
      <Icone nome={icone ?? aparencia.icone} tamanho={22} cor={aparencia.cor} style={estilos.iconeAviso} />
      <View style={estilos.flex}>
        {titulo ? <Texto variante="corpoForte">{titulo}</Texto> : null}
        <Texto variante="rotulo" cor="secundario">
          {texto}
        </Texto>
        {acao ? (
          <Botao
            titulo={acao.titulo}
            aoPressionar={acao.aoPressionar}
            carregando={acao.carregando}
            variante="secundario"
            compacto
            style={estilos.acaoAviso}
          />
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------

interface PropsVazio {
  icone: NomeIcone;
  titulo: string;
  texto: string;
  acao?: { titulo: string; aoPressionar: () => void; icone?: NomeIcone };
}

/** Mostrado quando uma lista não tem itens — sempre explica o porquê e o que fazer. */
export function EstadoVazio({ icone, titulo, texto, acao }: PropsVazio) {
  const { cores } = useTema();
  return (
    <View style={estilos.vazio}>
      <View style={[estilos.circuloVazio, { backgroundColor: cores.primariaSuave }]}>
        <Icone nome={icone} tamanho={30} cor={cores.primaria} />
      </View>
      <Texto variante="titulo3" centralizado>
        {titulo}
      </Texto>
      <Texto variante="rotulo" cor="secundario" centralizado>
        {texto}
      </Texto>
      {acao ? (
        <Botao
          titulo={acao.titulo}
          icone={acao.icone}
          aoPressionar={acao.aoPressionar}
          variante="secundario"
          style={estilos.acaoVazio}
        />
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------

interface PropsItem {
  icone: NomeIcone;
  titulo: string;
  descricao?: string;
  /** Valor exibido à direita (ex.: território atual). */
  valor?: string;
  aoPressionar?: () => void;
  /** Último item do grupo não desenha a linha divisória. */
  ultimo?: boolean;
  testID?: string;
}

/** Linha de lista com ícone, título, descrição e seta — usada em Ajustes. */
export function ItemLista({ icone, titulo, descricao, valor, aoPressionar, ultimo = false, testID }: PropsItem) {
  const { cores } = useTema();
  const conteudo = (
    <>
      <View style={[estilos.iconeItem, { backgroundColor: cores.primariaSuave }]}>
        <Icone nome={icone} tamanho={20} cor={cores.primaria} />
      </View>
      <View style={estilos.flex}>
        <Texto variante="corpoForte">{titulo}</Texto>
        {descricao ? (
          <Texto variante="legenda" cor="secundario">
            {descricao}
          </Texto>
        ) : null}
        {valor ? (
          <Texto variante="rotulo" cor="primaria">
            {valor}
          </Texto>
        ) : null}
      </View>
      {aoPressionar ? <Icone nome="chevron-right" tamanho={24} cor={cores.textoSuave} /> : null}
    </>
  );

  const estilo = [
    estilos.item,
    !ultimo && { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: cores.borda },
  ];

  if (!aoPressionar) return <View style={estilo}>{conteudo}</View>;

  return (
    <Pressable
      onPress={aoPressionar}
      accessibilityRole="button"
      accessibilityLabel={[titulo, valor, descricao].filter(Boolean).join('. ')}
      testID={testID}
      style={({ pressed }) => [estilo, pressed && { backgroundColor: cores.superficieSuave }]}>
      {conteudo}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------------------------

interface PropsTopicos {
  itens: string[];
  icone?: NomeIcone;
  corDoIcone?: string;
}

/** Lista de tópicos com marcador — usada na justificativa e nas limitações dos alertas. */
export function ListaTopicos({ itens, icone = 'circle-medium', corDoIcone }: PropsTopicos) {
  const { cores } = useTema();
  return (
    <View style={estilos.topicos}>
      {itens.map((item, indice) => (
        <View key={indice} style={estilos.topico}>
          <Icone nome={icone} tamanho={18} cor={corDoIcone ?? cores.textoSuave} style={estilos.iconeTopico} />
          <Texto variante="rotulo" cor="secundario" style={estilos.flex}>
            {item}
          </Texto>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------

/** Linha "rótulo: valor" usada em resumos. */
export function LinhaDado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={estilos.linhaDado}>
      <Texto variante="rotulo" cor="secundario" style={estilos.flex}>
        {rotulo}
      </Texto>
      <Texto variante="rotulo" style={estilos.valorDado}>
        {valor}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  secao: { gap: esp.md },
  linhaTitulo: { flexDirection: 'row', alignItems: 'flex-end', gap: esp.md },
  aviso: {
    flexDirection: 'row',
    gap: esp.md,
    padding: esp.md,
    borderRadius: raio.md,
  },
  iconeAviso: { marginTop: 1 },
  acaoAviso: { marginTop: esp.sm },
  vazio: {
    alignItems: 'center',
    gap: esp.sm,
    paddingVertical: esp.xxxl,
    paddingHorizontal: esp.lg,
  },
  circuloVazio: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: esp.sm,
  },
  acaoVazio: { alignSelf: 'center', marginTop: esp.md },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: esp.md,
    minHeight: TOQUE_MINIMO + 8,
    paddingVertical: esp.md,
    paddingHorizontal: esp.lg,
  },
  iconeItem: {
    width: 36,
    height: 36,
    borderRadius: raio.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicos: { gap: esp.sm },
  topico: { flexDirection: 'row', gap: esp.xs },
  iconeTopico: { marginTop: 1 },
  linhaDado: { flexDirection: 'row', gap: esp.md, alignItems: 'baseline' },
  valorDado: { textAlign: 'right', flexShrink: 1 },
});
