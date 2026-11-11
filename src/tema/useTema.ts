/**
 * Tema visual em uso: claro ou escuro, seguindo o sistema ou a escolha feita em Ajustes.
 */
import { useColorScheme } from 'react-native';

import { useConfiguracoes } from '@/estado/configuracoes';

import { paletas, type EsquemaCor, type Paleta } from './cores';

export interface TemaVisual {
  esquema: EsquemaCor;
  cores: Paleta;
}

const TEMAS: Record<EsquemaCor, TemaVisual> = {
  claro: { esquema: 'claro', cores: paletas.claro },
  escuro: { esquema: 'escuro', cores: paletas.escuro },
};

export function useTema(): TemaVisual {
  const aparencia = useConfiguracoes((s) => s.aparencia);
  const doSistema = useColorScheme();
  const esquema: EsquemaCor = aparencia === 'sistema' ? (doSistema === 'dark' ? 'escuro' : 'claro') : aparencia;
  // Objetos fixos: a referência só muda quando o esquema muda (evita renderizações à toa).
  return TEMAS[esquema];
}
