/**
 * Moldura de todas as telas: fundo do tema, rolagem, largura máxima (tablets e web),
 * "puxar para atualizar" e um rodapé fixo opcional para os botões dos formulários.
 */
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { esp, LARGURA_MAXIMA } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';

interface Props {
  children: ReactNode;
  /**
   * Tela de aba: não tem cabeçalho do navegador (a própria tela reserva a faixa da barra de status)
   * e tem a barra de abas embaixo (que já cuida da margem segura inferior).
   */
  aba?: boolean;
  /**
   * Ativa o gesto de puxar para atualizar. O indicador só gira quando a pessoa puxou: nas
   * atualizações automáticas, a tela deve avisar em texto que está consultando.
   */
  atualizacao?: { atualizando: boolean; aoAtualizar: () => void };
  /** Conteúdo fixo no rodapé (ex.: botão "Salvar" de um formulário). */
  rodape?: ReactNode;
  estiloDoConteudo?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Tela({ children, aba = false, atualizacao, rodape, estiloDoConteudo, testID }: Props) {
  const { cores } = useTema();
  const margens = useSafeAreaInsets();

  // Para subir o conteúdo na medida certa quando o teclado abre, o React Native precisa saber onde
  // esta tela começa na janela (logo abaixo do cabeçalho, quando ele não é translúcido). Medimos
  // em vez de supor: assim vale para iOS e Android, com ou sem cabeçalho.
  const raiz = useRef<ComponentRef<typeof View>>(null);
  const [topoNaJanela, setTopoNaJanela] = useState(0);
  const medirPosicao = () => {
    if (Platform.OS === 'web') return;
    raiz.current?.measureInWindow((_x, y) => {
      if (Number.isFinite(y)) setTopoNaJanela(Math.max(0, y));
    });
  };

  // Espaço no fim do conteúdo. Nas abas e nas telas com rodapé fixo, a margem segura de baixo já
  // está coberta. Nas demais, o iOS a acrescenta sozinho (ajuste automático); o Android, não.
  const margemInferior = aba || rodape || Platform.OS === 'ios' ? 0 : margens.bottom;

  // O indicador de "puxar para atualizar" só gira quando a pessoa puxou. Nas atualizações automáticas
  // (abrir o app, voltar do segundo plano), acioná-lo faria o conteúdo descer e subir sozinho no iOS.
  const atualizando = atualizacao?.atualizando ?? false;
  const [puxou, setPuxou] = useState(false);
  const [atualizandoAntes, setAtualizandoAntes] = useState(atualizando);
  if (atualizandoAntes !== atualizando) {
    // Ajuste de estado durante a renderização (o padrão do React para reagir à troca de uma
    // propriedade): quando a atualização termina, a marca de "puxou" é desfeita.
    setAtualizandoAntes(atualizando);
    if (!atualizando) setPuxou(false);
  }

  return (
    <View
      ref={raiz}
      onLayout={medirPosicao}
      // Nas abas, a faixa da barra de status fica FORA da área de rolagem: o conteúdo some ao chegar
      // nela, em vez de passar por baixo do relógio e da bateria.
      style={[estilos.raiz, { backgroundColor: cores.fundo, paddingTop: aba ? margens.top : 0 }]}
      testID={testID}>
      <KeyboardAvoidingView
        style={estilos.raiz}
        // "padding" acrescenta só o trecho que o teclado realmente cobre (zero se a janela já encolheu).
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
        keyboardVerticalOffset={topoNaJanela}>
        <ScrollView
          style={estilos.raiz}
          // Telas com cabeçalho: no iOS recente ele é translúcido, e o ajuste automático faz o conteúdo
          // começar abaixo dele. Nas abas não há cabeçalho: a margem do topo é a da moldura (acima).
          contentInsetAdjustmentBehavior={aba ? 'never' : 'automatic'}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            estilos.conteudo,
            { paddingBottom: margemInferior + (rodape ? esp.xxl : esp.xxxl) },
            estiloDoConteudo,
          ]}
          refreshControl={
            atualizacao ? (
              <RefreshControl
                refreshing={puxou && atualizando}
                onRefresh={() => {
                  setPuxou(true);
                  atualizacao.aoAtualizar();
                }}
                tintColor={cores.primaria}
                colors={[cores.primaria]}
              />
            ) : undefined
          }
          testID={testID ? `${testID}-rolagem` : undefined}>
          <View style={estilos.coluna}>{children}</View>
        </ScrollView>

        {rodape ? <Rodape testID={testID ? `${testID}-rodape` : undefined}>{rodape}</Rodape> : null}
      </KeyboardAvoidingView>
    </View>
  );
}

/** Rodapé fixo dos formulários. Fica em um componente próprio para só ele reagir ao teclado. */
function Rodape({ children, testID }: { children: ReactNode; testID?: string }) {
  const { cores } = useTema();
  const margens = useSafeAreaInsets();
  const tecladoAberto = useTecladoAberto();

  return (
    <View
      testID={testID}
      style={[
        estilos.rodape,
        {
          backgroundColor: cores.superficie,
          borderTopColor: cores.borda,
          // Com o teclado aberto, o rodapé encosta nele: a margem segura (barra de gestos) fica
          // coberta pelo teclado e viraria uma faixa vazia entre os botões e as teclas.
          paddingBottom: tecladoAberto ? esp.md : Math.max(margens.bottom, esp.md),
        },
      ]}>
      <View style={estilos.coluna}>{children}</View>
    </View>
  );
}

/** Informa se o teclado virtual está aberto. Na web é sempre falso: o navegador cuida do teclado. */
function useTecladoAberto(): boolean {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    // O iOS avisa antes da animação do teclado ("will"); o Android só avisa depois ("did").
    const noIos = Platform.OS === 'ios';
    const aoAbrir = Keyboard.addListener(noIos ? 'keyboardWillShow' : 'keyboardDidShow', () => setAberto(true));
    const aoFechar = Keyboard.addListener(noIos ? 'keyboardWillHide' : 'keyboardDidHide', () => setAberto(false));
    return () => {
      aoAbrir.remove();
      aoFechar.remove();
    };
  }, []);
  return aberto;
}

const estilos = StyleSheet.create({
  raiz: {
    flex: 1,
  },
  conteudo: {
    paddingHorizontal: esp.lg,
    paddingTop: esp.lg,
    paddingBottom: esp.xxl,
  },
  coluna: {
    width: '100%',
    maxWidth: LARGURA_MAXIMA,
    alignSelf: 'center',
    gap: esp.lg,
  },
  rodape: {
    paddingHorizontal: esp.lg,
    paddingTop: esp.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
});
