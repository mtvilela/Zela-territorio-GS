/**
 * Botão do app, em quatro variações. Área de toque mínima de 48 pontos e estados
 * (desabilitado, carregando) anunciados para leitores de tela.
 */
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { esp, raio, TOQUE_MINIMO } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';

import { Icone, type NomeIcone } from './Icone';
import { Texto } from './Texto';

export type VarianteBotao = 'primario' | 'secundario' | 'fantasma' | 'perigo';

interface Props {
  titulo: string;
  aoPressionar: () => void;
  variante?: VarianteBotao;
  icone?: NomeIcone;
  carregando?: boolean;
  desabilitado?: boolean;
  /** Ocupa toda a largura disponível. */
  largo?: boolean;
  compacto?: boolean;
  dicaAcessivel?: string;
  /** Rótulo para leitores de tela, quando o título sozinho não basta. */
  rotuloAcessivel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Botao({
  titulo,
  aoPressionar,
  variante = 'primario',
  icone,
  carregando = false,
  desabilitado = false,
  largo = false,
  compacto = false,
  dicaAcessivel,
  rotuloAcessivel,
  style,
  testID,
}: Props) {
  const { cores } = useTema();
  const inativo = desabilitado || carregando;

  const aparencia = {
    primario: { fundo: cores.primaria, texto: cores.sobrePrimaria, borda: cores.primaria },
    secundario: { fundo: 'transparent', texto: cores.primaria, borda: cores.primaria },
    fantasma: { fundo: 'transparent', texto: cores.primaria, borda: 'transparent' },
    perigo: { fundo: 'transparent', texto: cores.erro, borda: cores.erro },
  }[variante];

  return (
    <Pressable
      onPress={aoPressionar}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel ?? titulo}
      accessibilityHint={dicaAcessivel}
      aria-disabled={inativo}
      aria-busy={carregando}
      // Em botões compactos, a área de toque continua com 48 pontos de altura.
      hitSlop={compacto ? { top: 6, bottom: 6 } : undefined}
      testID={testID}
      style={({ pressed }) => [
        estilos.botao,
        compacto && estilos.compacto,
        largo && estilos.largo,
        { backgroundColor: aparencia.fundo, borderColor: aparencia.borda },
        pressed && { opacity: 0.75 },
        inativo && { opacity: 0.5 },
        style,
      ]}>
      <View style={estilos.conteudo}>
        {carregando ? (
          <ActivityIndicator size="small" color={aparencia.texto} />
        ) : icone ? (
          <Icone nome={icone} tamanho={compacto ? 18 : 20} cor={aparencia.texto} />
        ) : null}
        <Texto variante={compacto ? 'rotulo' : 'corpoForte'} style={{ color: aparencia.texto }} numberOfLines={2}>
          {titulo}
        </Texto>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: {
    minHeight: TOQUE_MINIMO,
    paddingHorizontal: esp.xl,
    paddingVertical: esp.sm,
    borderRadius: raio.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  compacto: {
    minHeight: 36,
    paddingHorizontal: esp.md,
    paddingVertical: esp.xs,
  },
  largo: {
    alignSelf: 'stretch',
  },
  conteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: esp.sm,
  },
});
