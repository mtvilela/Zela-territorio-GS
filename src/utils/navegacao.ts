/**
 * Ajuda de navegação compartilhada pelas telas de formulário.
 */
import { useRouter, type Href } from 'expo-router';

/**
 * Devolve uma função que fecha a tela atual e volta para `destino`.
 *
 * Usa `dismissTo`: se `destino` já está no histórico, as telas acima dele são fechadas; se não
 * está — o app foi aberto direto nesta tela por um link, ou a página foi recarregada na web —,
 * o roteador abre `destino` no lugar da tela atual. Nos dois casos o usuário chega ao mesmo lugar.
 */
export function useVoltarPara(destino: Href): () => void {
  const router = useRouter();
  return () => router.dismissTo(destino);
}
