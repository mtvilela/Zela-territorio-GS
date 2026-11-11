/**
 * Identidade do Zela Território: o símbolo (um hexágono — o território — com uma linha de
 * tendência dentro) e os cabeçalhos das telas das abas.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { esp } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';

import { Decorativo } from './Decorativo';
import { Texto } from './Texto';

/** Símbolo do app. Decorativo: o nome escrito ao lado é o que identifica a marca. */
export function Simbolo({ tamanho = 40 }: { tamanho?: number }) {
  const { cores } = useTema();
  return (
    <Decorativo>
      <Svg width={tamanho} height={tamanho} viewBox="0 0 48 48">
        <Rect x={0} y={0} width={48} height={48} rx={13} fill={cores.primaria} />
        {/* Hexágono: o território */}
        <Path
          d="M24 7.5 L38.3 15.75 L38.3 32.25 L24 40.5 L9.7 32.25 L9.7 15.75 Z"
          stroke={cores.sobrePrimaria}
          strokeWidth={2.6}
          strokeLinejoin="round"
          fill="none"
        />
        {/* Linha de tendência: os dados */}
        <Path
          d="M15.5 29 L21 23.5 L25.5 27 L32 18.5"
          stroke={cores.sobrePrimaria}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Circle cx={32} cy={18.5} r={2.9} fill={cores.sobrePrimaria} />
      </Svg>
    </Decorativo>
  );
}

/** Cabeçalho da tela inicial: símbolo, nome do app e o território acompanhado. */
export function CabecalhoDaMarca({ territorio }: { territorio: string }) {
  return (
    <View style={estilos.marca}>
      <Simbolo tamanho={44} />
      <View style={estilos.flex}>
        <Texto variante="titulo2" cabecalho>
          Zela Território
        </Texto>
        <Texto variante="legenda" cor="secundario" numberOfLines={1}>
          Painel de inteligência territorial · {territorio}
        </Texto>
      </View>
    </View>
  );
}

/** Título das demais abas. */
export function TituloDaTela({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <View style={estilos.titulo}>
      <Texto variante="titulo1" cabecalho>
        {titulo}
      </Texto>
      {descricao ? (
        <Texto variante="rotulo" cor="secundario">
          {descricao}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: esp.md },
  titulo: { gap: esp.xs },
});
