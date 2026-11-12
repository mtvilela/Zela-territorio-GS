/**
 * Layout raiz: carrega as fontes, espera os dados salvos no aparelho, aplica o tema e define
 * a pilha de navegação (abas + telas de detalhe e formulários).
 */
import {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_500Medium,
  AtkinsonHyperlegibleNext_600SemiBold,
  AtkinsonHyperlegibleNext_700Bold,
} from '@expo-google-fonts/atkinson-hyperlegible-next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useClima } from '@/estado/clima';
import { useConfiguracoes } from '@/estado/configuracoes';
import { useHidratado } from '@/estado/painel';
import { fontes } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';

// Mostra uma tela de erro amigável se alguma tela falhar ao renderizar.
export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  // Ao abrir o app direto em uma tela interna (link), "voltar" leva para as abas.
  anchor: '(abas)',
};

// Mantém a tela de abertura até as fontes e os dados salvos estarem prontos.
SplashScreen.preventAutoHideAsync();

export default function LayoutRaiz() {
  const [fontesProntas, erroNasFontes] = useFonts({
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_500Medium,
    AtkinsonHyperlegibleNext_600SemiBold,
    AtkinsonHyperlegibleNext_700Bold,
    ...MaterialCommunityIcons.font,
  });
  const hidratado = useHidratado();
  // Se a fonte falhar, o app abre mesmo assim com a fonte do sistema.
  const pronto = (fontesProntas || erroNasFontes !== null) && hidratado;

  useEffect(() => {
    if (pronto) SplashScreen.hideAsync();
  }, [pronto]);

  if (!pronto) return null;
  return <Navegacao />;
}

function Navegacao() {
  const { esquema, cores } = useTema();
  const territorio = useConfiguracoes((s) => s.territorio);
  const carregarClima = useClima((s) => s.carregar);

  // Busca o clima ao abrir, ao trocar de território e quando o app volta ao primeiro plano.
  // A loja só consulta a API de novo se os dados guardados estiverem vencidos.
  useEffect(() => {
    carregarClima(territorio);
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') carregarClima(territorio);
    });
    return () => assinatura.remove();
  }, [territorio, carregarClima]);

  const base = esquema === 'escuro' ? DarkTheme : DefaultTheme;
  const temaDeNavegacao = {
    ...base,
    colors: {
      ...base.colors,
      primary: cores.primaria,
      background: cores.fundo,
      card: cores.fundo,
      text: cores.texto,
      border: cores.borda,
      notification: cores.situacao.critico.cor,
    },
  };

  return (
    <ThemeProvider value={temaDeNavegacao}>
      <Stack
        screenOptions={{
          headerTintColor: cores.primaria,
          headerTitleStyle: { fontFamily: fontes.semibold, color: cores.texto },
          headerStyle: { backgroundColor: cores.fundo },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: cores.fundo },
        }}>
        <Stack.Screen name="(abas)" options={{ headerShown: false }} />
        <Stack.Screen name="tema/[tema]" options={{ title: 'Tema' }} />
        <Stack.Screen name="alerta/[chave]" options={{ title: 'Alerta' }} />
        <Stack.Screen name="decisao/[chave]" options={{ title: 'Registrar decisão' }} />
        <Stack.Screen name="demanda/nova" options={{ title: 'Nova solicitação' }} />
        <Stack.Screen name="territorio" options={{ title: 'Território' }} />
        <Stack.Screen name="limiares" options={{ title: 'Limites dos alertas' }} />
        <Stack.Screen name="privacidade" options={{ title: 'Privacidade e dados' }} />
        <Stack.Screen name="fontes" options={{ title: 'Fontes e limitações' }} />
        <Stack.Screen name="+not-found" options={{ title: 'Tela não encontrada' }} />
      </Stack>
      <StatusBar style={esquema === 'escuro' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
