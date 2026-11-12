/**
 * Componentes de formulário reutilizáveis: campo de texto, seletor em "pílulas",
 * grupo de opções (rádio) e interruptor.
 *
 * Acessibilidade:
 *  - todo campo tem rótulo visível (não só "placeholder");
 *  - o erro aparece em texto, com ícone, e é anunciado por leitores de tela;
 *  - a opção escolhida ganha um ícone de "marcado", além da cor;
 *  - o estado (marcado, inválido) é informado com propriedades aria-*, entendidas por
 *    TalkBack, VoiceOver e leitores de tela da web;
 *  - as áreas de toque têm pelo menos 44–48 pontos.
 */
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { esp, fontes, raio, TOQUE_MINIMO } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';

import { Decorativo } from './Decorativo';
import { Icone, type NomeIcone } from './Icone';
import { Texto } from './Texto';

// ---------------------------------------------------------------------------------------------
// Mensagem de erro de um campo
// ---------------------------------------------------------------------------------------------

export function ErroDoCampo({ mensagem }: { mensagem?: string }) {
  const { cores } = useTema();
  if (!mensagem) return null;
  return (
    <View style={estilos.erro} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icone nome="alert-circle-outline" tamanho={16} cor={cores.erro} style={estilos.iconeErro} />
      <Texto variante="legenda" cor="erro" style={estilos.flex}>
        {mensagem}
      </Texto>
    </View>
  );
}

function RotuloDoCampo({ rotulo, obrigatorio }: { rotulo: string; obrigatorio?: boolean }) {
  return (
    <Texto variante="rotulo">
      {rotulo}
      {obrigatorio ? (
        <Texto variante="rotulo" cor="suave">
          {' '}
          (obrigatório)
        </Texto>
      ) : null}
    </Texto>
  );
}

// ---------------------------------------------------------------------------------------------
// Campo de texto
// ---------------------------------------------------------------------------------------------

interface PropsCampo extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> {
  rotulo: string;
  valor: string;
  aoMudar: (texto: string) => void;
  erro?: string;
  /** Texto de apoio abaixo do campo (some quando há erro). */
  ajuda?: string;
  /** Mostra o contador "n/máximo" e limita a digitação. */
  maximo?: number;
  obrigatorio?: boolean;
  multilinha?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function CampoTexto({
  rotulo,
  valor,
  aoMudar,
  erro,
  ajuda,
  maximo,
  obrigatorio = false,
  multilinha = false,
  style,
  ...resto
}: PropsCampo) {
  const { cores } = useTema();
  const [focado, setFocado] = useState(false);
  const corDaBorda = erro ? cores.erro : focado ? cores.primaria : cores.bordaControle;

  return (
    <View style={[estilos.campo, style]}>
      <RotuloDoCampo rotulo={rotulo} obrigatorio={obrigatorio} />
      <TextInput
        value={valor}
        onChangeText={aoMudar}
        onFocus={() => setFocado(true)}
        onBlur={() => setFocado(false)}
        maxLength={maximo}
        multiline={multilinha}
        textAlignVertical={multilinha ? 'top' : 'center'}
        placeholderTextColor={cores.textoSuave}
        selectionColor={cores.primaria}
        // O leitor de tela lê o rótulo, se é obrigatório e, quando existe, o erro.
        accessibilityLabel={`${rotulo}${obrigatorio ? ', obrigatório' : ''}${erro ? `. Erro: ${erro}` : ''}`}
        accessibilityHint={ajuda}
        aria-invalid={Boolean(erro)}
        {...resto}
        style={[
          estilos.entrada,
          multilinha && estilos.entradaMultilinha,
          {
            color: cores.texto,
            backgroundColor: cores.superficie,
            borderColor: corDaBorda,
            borderWidth: focado || erro ? 2 : 1,
            // Compensa a borda mais grossa para o texto não "pular".
            paddingHorizontal: focado || erro ? esp.md - 1 : esp.md,
            // Na web, o contorno de foco do navegador usa a cor da marca (visível para quem navega por teclado).
            outlineColor: cores.primaria,
          },
        ]}
      />
      <View style={estilos.rodapeDoCampo}>
        <View style={estilos.flex}>
          {erro ? (
            <ErroDoCampo mensagem={erro} />
          ) : ajuda ? (
            <Texto variante="legenda" cor="suave">
              {ajuda}
            </Texto>
          ) : null}
        </View>
        {maximo ? (
          <Texto variante="legenda" cor="suave" accessibilityLabel={`${valor.length} de ${maximo} caracteres`}>
            {valor.length}/{maximo}
          </Texto>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Seletor em pílulas (escolha única)
// ---------------------------------------------------------------------------------------------

export interface OpcaoDoSeletor<T extends string> {
  valor: T;
  rotulo: string;
  icone?: NomeIcone;
}

interface PropsSeletor<T extends string> {
  rotulo?: string;
  opcoes: OpcaoDoSeletor<T>[];
  valor: T | null;
  aoMudar: (valor: T) => void;
  erro?: string;
  obrigatorio?: boolean;
  /** Nome do grupo para leitores de tela, quando não há rótulo visível. */
  rotuloAcessivel?: string;
  style?: StyleProp<ViewStyle>;
}

export function SeletorOpcoes<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
  erro,
  obrigatorio = false,
  rotuloAcessivel,
  style,
}: PropsSeletor<T>) {
  const { cores } = useTema();
  return (
    <View style={[estilos.campo, style]}>
      {rotulo ? <RotuloDoCampo rotulo={rotulo} obrigatorio={obrigatorio} /> : null}
      <View style={estilos.pilulas} accessibilityRole="radiogroup" accessibilityLabel={rotuloAcessivel ?? rotulo}>
        {opcoes.map((opcao) => {
          const marcada = opcao.valor === valor;
          return (
            <Pressable
              key={opcao.valor}
              onPress={() => aoMudar(opcao.valor)}
              accessibilityRole="radio"
              accessibilityLabel={opcao.rotulo}
              aria-checked={marcada}
              style={({ pressed }) => [
                estilos.pilula,
                {
                  backgroundColor: marcada ? cores.primaria : cores.superficie,
                  borderColor: marcada ? cores.primaria : cores.bordaControle,
                },
                pressed && { opacity: 0.75 },
              ]}>
              {marcada ? (
                <Icone nome="check" tamanho={16} cor={cores.sobrePrimaria} />
              ) : opcao.icone ? (
                <Icone nome={opcao.icone} tamanho={16} cor={cores.textoSecundario} />
              ) : null}
              <Texto variante="rotulo" style={{ color: marcada ? cores.sobrePrimaria : cores.texto }}>
                {opcao.rotulo}
              </Texto>
            </Pressable>
          );
        })}
      </View>
      <ErroDoCampo mensagem={erro} />
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Grupo de opções em lista (rádio), com descrição e um acessório à direita
// ---------------------------------------------------------------------------------------------

export interface OpcaoDoGrupo<T extends string> {
  valor: T;
  titulo: string;
  descricao?: string;
  /** Elemento extra abaixo do título (ex.: selo de impacto). */
  acessorio?: ReactNode;
  /** Complemento lido pelo leitor de tela (ex.: "Impacto alto"). */
  complementoAcessivel?: string;
}

interface PropsGrupo<T extends string> {
  rotulo: string;
  opcoes: OpcaoDoGrupo<T>[];
  valor: T | null;
  aoMudar: (valor: T) => void;
  erro?: string;
  obrigatorio?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GrupoRadio<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
  erro,
  obrigatorio = false,
  style,
}: PropsGrupo<T>) {
  const { cores } = useTema();
  return (
    <View style={[estilos.campo, style]}>
      <RotuloDoCampo rotulo={rotulo} obrigatorio={obrigatorio} />
      <View style={estilos.grupo} accessibilityRole="radiogroup" accessibilityLabel={rotulo}>
        {opcoes.map((opcao) => {
          const marcada = opcao.valor === valor;
          return (
            <Pressable
              key={opcao.valor}
              onPress={() => aoMudar(opcao.valor)}
              accessibilityRole="radio"
              accessibilityLabel={[opcao.titulo, opcao.complementoAcessivel, opcao.descricao]
                .filter(Boolean)
                .join('. ')}
              aria-checked={marcada}
              style={({ pressed }) => [
                estilos.opcaoDoGrupo,
                {
                  backgroundColor: marcada ? cores.primariaSuave : cores.superficie,
                  borderColor: marcada ? cores.primaria : cores.bordaControle,
                  borderWidth: marcada ? 2 : 1,
                  padding: marcada ? esp.md - 1 : esp.md,
                },
                pressed && { opacity: 0.8 },
              ]}>
              <Icone
                nome={marcada ? 'radiobox-marked' : 'radiobox-blank'}
                tamanho={22}
                cor={marcada ? cores.primaria : cores.bordaControle}
                style={estilos.iconeRadio}
              />
              <View style={estilos.textoDoGrupo}>
                <Texto variante="corpoForte">{opcao.titulo}</Texto>
                {opcao.descricao ? (
                  <Texto variante="legenda" cor="secundario">
                    {opcao.descricao}
                  </Texto>
                ) : null}
                {opcao.acessorio}
              </View>
            </Pressable>
          );
        })}
      </View>
      <ErroDoCampo mensagem={erro} />
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Interruptor com rótulo
// ---------------------------------------------------------------------------------------------

interface PropsInterruptor {
  rotulo: string;
  descricao?: string;
  valor: boolean;
  aoMudar: (valor: boolean) => void;
  erro?: string;
  style?: StyleProp<ViewStyle>;
}

export function Interruptor({ rotulo, descricao, valor, aoMudar, erro, style }: PropsInterruptor) {
  const { cores } = useTema();
  return (
    <View style={[estilos.campo, style]}>
      <Pressable
        onPress={() => aoMudar(!valor)}
        accessibilityRole="switch"
        accessibilityLabel={rotulo}
        accessibilityHint={descricao}
        aria-checked={valor}
        style={[
          estilos.interruptor,
          { borderColor: erro ? cores.erro : cores.bordaControle, backgroundColor: cores.superficie },
        ]}>
        <View style={estilos.flex}>
          <Texto variante="corpoForte">{rotulo}</Texto>
          {descricao ? (
            <Texto variante="legenda" cor="secundario">
              {descricao}
            </Texto>
          ) : null}
        </View>
        {/* Chave desenhada pelo app: a linha inteira é o controle; isto só mostra o estado. */}
        <Decorativo>
          <View style={[estilos.trilhoDaChave, { backgroundColor: valor ? cores.primaria : cores.bordaControle }]}>
            <View
              style={[
                estilos.botaoDaChave,
                { backgroundColor: cores.superficie, alignSelf: valor ? 'flex-end' : 'flex-start' },
              ]}>
              {valor ? <Icone nome="check" tamanho={14} cor={cores.primaria} /> : null}
            </View>
          </View>
        </Decorativo>
      </Pressable>
      <ErroDoCampo mensagem={erro} />
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  campo: { gap: esp.sm },
  entrada: {
    minHeight: TOQUE_MINIMO,
    borderRadius: raio.md,
    paddingVertical: esp.md,
    fontFamily: fontes.regular,
    // Sem lineHeight de propósito: em campos de uma linha no iOS, ele desloca o texto para baixo.
    fontSize: 16,
  },
  entradaMultilinha: {
    minHeight: 112,
    lineHeight: 22,
  },
  rodapeDoCampo: {
    flexDirection: 'row',
    gap: esp.md,
    minHeight: 18,
  },
  erro: {
    flexDirection: 'row',
    gap: esp.xs,
  },
  iconeErro: { marginTop: 1 },
  pilulas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: esp.sm,
  },
  pilula: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: esp.xs,
    minHeight: 44,
    paddingHorizontal: esp.lg,
    borderRadius: raio.pilula,
    borderWidth: 1,
  },
  grupo: { gap: esp.sm },
  opcaoDoGrupo: {
    flexDirection: 'row',
    gap: esp.md,
    borderRadius: raio.md,
    minHeight: TOQUE_MINIMO,
  },
  iconeRadio: { marginTop: 1 },
  textoDoGrupo: { flex: 1, gap: esp.xs },
  trilhoDaChave: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  botaoDaChave: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interruptor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: esp.md,
    padding: esp.md,
    borderRadius: raio.md,
    borderWidth: 1,
    minHeight: TOQUE_MINIMO,
  },
});
