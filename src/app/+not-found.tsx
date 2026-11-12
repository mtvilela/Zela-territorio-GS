/**
 * Tela exibida quando o endereço aberto não corresponde a nenhuma rota do app.
 */
import { Stack, useRouter } from 'expo-router';

import { EstadoVazio } from '@/componentes/Blocos';
import { Tela } from '@/componentes/Tela';

export default function TelaNaoEncontrada() {
  const router = useRouter();
  return (
    <Tela>
      <Stack.Screen options={{ title: 'Tela não encontrada' }} />
      <EstadoVazio
        icone="help-circle-outline"
        titulo="Esta tela não existe"
        texto="O endereço aberto não corresponde a nenhuma tela do Zela Território."
        acao={{
          titulo: 'Ir para o painel',
          icone: 'view-dashboard-outline',
          aoPressionar: () => router.dismissTo('/'),
        }}
      />
    </Tela>
  );
}
