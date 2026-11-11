/**
 * Persistência local. Tudo o que o app guarda fica no AsyncStorage do próprio aparelho
 * (no navegador, no localStorage): não há servidor, conta de usuário nem sincronização.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** Chaves usadas no armazenamento. Listadas em um só lugar para a tela de privacidade poder apagá-las. */
export const CHAVES = {
  configuracoes: 'zela-territorio/configuracoes',
  clima: 'zela-territorio/clima',
  demandas: 'zela-territorio/demandas',
  decisoes: 'zela-territorio/decisoes',
} as const;

/** Armazenamento em JSON compartilhado pelas lojas do Zustand. */
export const armazenamentoJson = createJSONStorage(() => AsyncStorage);

/** Identificador curto para registros criados no aparelho. */
export function novoId(prefixo: string): string {
  const aleatorio = Math.random().toString(36).slice(2, 8);
  return `${prefixo}-${Date.now().toString(36)}-${aleatorio}`;
}
