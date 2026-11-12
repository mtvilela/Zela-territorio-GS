/**
 * Barra de abas: as cinco áreas do app. A aba "Alertas" mostra quantos aguardam decisão.
 */
import { Tabs } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone, type NomeIcone } from '@/componentes/Icone';
import { useAlertasPorSituacao } from '@/estado/painel';
import { fontes } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';
import { plural } from '@/utils/numeros';

/** Ícone cheio na aba ativa e de contorno nas demais: o formato reforça a cor. */
function iconeDaAba(ativo: NomeIcone, inativo: NomeIcone) {
  function IconeDaAba({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    // A barra de abas informa a cor como texto; qualquer outro formato cai na cor padrão do ícone.
    return (
      <Icone nome={focused ? ativo : inativo} cor={typeof color === 'string' ? color : undefined} tamanho={size} />
    );
  }
  return IconeDaAba;
}

/**
 * Rótulo da aba. Com a fonte do sistema ampliada, ele cresce até 30% (além disso seria cortado
 * pela barra); a barra cresce junto, na função abaixo.
 */
function RotuloDaAba({
  color,
  position,
  children,
}: {
  focused: boolean;
  color: ColorValue;
  position: 'beside-icon' | 'below-icon';
  children: string;
}) {
  return (
    <Text
      maxFontSizeMultiplier={AMPLIACAO_MAXIMA_DO_ROTULO}
      numberOfLines={1}
      style={[estilos.rotulo, { color }, position === 'beside-icon' && estilos.rotuloAoLado]}>
      {children}
    </Text>
  );
}

const ALTURA_DA_BARRA = 60;
const ALTURA_DA_LINHA_DO_ROTULO = 14;
const AMPLIACAO_MAXIMA_DO_ROTULO = 1.3;

export default function LayoutDasAbas() {
  const { cores } = useTema();
  const { pendentes } = useAlertasPorSituacao();
  const margens = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const folgaParaFonteAmpliada =
    (Math.min(Math.max(fontScale, 1), AMPLIACAO_MAXIMA_DO_ROTULO) - 1) * ALTURA_DA_LINHA_DO_ROTULO;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.primaria,
        tabBarInactiveTintColor: cores.textoSecundario,
        // Altura própria: ícone + rótulo de 11 pt não cabem nos 49 pt padrão. Quando a altura é
        // informada, é preciso somar a margem segura de baixo (barra de gestos do aparelho).
        tabBarStyle: {
          backgroundColor: cores.superficie,
          borderTopColor: cores.borda,
          height: ALTURA_DA_BARRA + folgaParaFonteAmpliada + margens.bottom,
        },
        tabBarLabel: RotuloDaAba,
        tabBarBadgeStyle: {
          backgroundColor: cores.situacao.critico.cor,
          color: cores.situacao.critico.sobre,
          fontFamily: fontes.bold,
          fontSize: 11,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Painel',
          tabBarIcon: iconeDaAba('view-dashboard', 'view-dashboard-outline'),
        }}
      />
      <Tabs.Screen
        name="alertas"
        options={{
          title: 'Alertas',
          tabBarIcon: iconeDaAba('alert', 'alert-outline'),
          tabBarBadge: pendentes.length > 0 ? pendentes.length : undefined,
          tabBarAccessibilityLabel: `Alertas: ${plural(pendentes.length, 'aguardando decisão', 'aguardando decisão')}`,
        }}
      />
      <Tabs.Screen
        name="demandas"
        options={{
          title: 'Serviços',
          tabBarIcon: iconeDaAba('clipboard-list', 'clipboard-list-outline'),
          tabBarAccessibilityLabel: 'Serviços: solicitações de zeladoria',
        }}
      />
      <Tabs.Screen
        name="decisoes"
        options={{
          title: 'Decisões',
          tabBarIcon: iconeDaAba('notebook-check', 'notebook-check-outline'),
          tabBarAccessibilityLabel: 'Diário de decisões',
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: 'Ajustes',
          tabBarIcon: iconeDaAba('cog', 'cog-outline'),
        }}
      />
    </Tabs>
  );
}

const estilos = StyleSheet.create({
  rotulo: { fontFamily: fontes.media, fontSize: 11, lineHeight: ALTURA_DA_LINHA_DO_ROTULO },
  // Em telas largas, o rótulo fica ao lado do ícone.
  rotuloAoLado: { fontSize: 13, lineHeight: 18, marginStart: 8 },
});
