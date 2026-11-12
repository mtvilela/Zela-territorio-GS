/**
 * Cartão de uma solicitação de zeladoria, com os botões para mudar o status.
 * Não mostra endereço nem nome de quem pediu: a localização é só o setor.
 */
import { StyleSheet, View } from 'react-native';

import { buscarSetor, ROTULO_CATEGORIA, ROTULO_PRIORIDADE, ROTULO_STATUS } from '@/dados/catalogo';
import { ehAtrasada } from '@/dados/demandas';
import type { CategoriaDemanda, Demanda, StatusDemanda } from '@/dominio/tipos';
import { esp } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';
import { descreverIdade, diferencaDias } from '@/utils/datas';

import { Botao } from './Botao';
import { Cartao } from './Cartao';
import { Icone, type NomeIcone } from './Icone';
import { Etiqueta } from './Selos';
import { Texto } from './Texto';

export const ICONE_DA_CATEGORIA: Record<CategoriaDemanda, NomeIcone> = {
  iluminacao: 'lightbulb-outline',
  buraco: 'road-variant',
  lixo: 'trash-can-outline',
  calcada: 'walk',
  alagamento: 'waves',
  arvore: 'tree-outline',
  outro: 'dots-horizontal',
};

const ICONE_DO_STATUS: Record<StatusDemanda, NomeIcone> = {
  aberta: 'circle-outline',
  em_andamento: 'progress-clock',
  resolvida: 'check-circle-outline',
};

interface Props {
  demanda: Demanda;
  hoje: string;
  aoAlterarStatus: (status: StatusDemanda) => void;
}

export function CartaoDemanda({ demanda, hoje, aoAlterarStatus }: Props) {
  const { cores } = useTema();
  const setor = buscarSetor(demanda.setorId);
  const idade = descreverIdade(diferencaDias(demanda.criadaEm, hoje));
  const atrasada = ehAtrasada(demanda, hoje);

  return (
    <Cartao>
      <View style={estilos.topo}>
        <View style={[estilos.icone, { backgroundColor: cores.superficieSuave }]}>
          <Icone nome={ICONE_DA_CATEGORIA[demanda.categoria]} tamanho={20} cor={cores.textoSecundario} />
        </View>
        <View style={estilos.flex}>
          <Texto variante="corpoForte">{demanda.titulo}</Texto>
          <Texto variante="legenda" cor="secundario">
            {ROTULO_CATEGORIA[demanda.categoria]} · {setor?.nome ?? 'Setor não informado'} · registrada {idade}
          </Texto>
        </View>
      </View>

      <View style={estilos.etiquetas}>
        <Etiqueta
          texto={ROTULO_STATUS[demanda.status]}
          icone={ICONE_DO_STATUS[demanda.status]}
          tom={demanda.status === 'resolvida' ? 'sucesso' : 'neutro'}
        />
        <Etiqueta
          texto={`Prioridade ${ROTULO_PRIORIDADE[demanda.prioridade].toLowerCase()}`}
          icone={demanda.prioridade === 'alta' ? 'flag-outline' : undefined}
          tom={demanda.prioridade === 'alta' && demanda.status !== 'resolvida' ? 'aviso' : 'neutro'}
        />
        {atrasada ? <Etiqueta texto="Atrasada" icone="clock-outline" tom="aviso" /> : null}
        <Etiqueta
          texto={demanda.origem === 'local' ? 'Registrada no app' : 'Sintética'}
          icone={demanda.origem === 'local' ? 'pencil-outline' : 'flask-outline'}
          tom={demanda.origem === 'local' ? 'primario' : 'neutro'}
        />
      </View>

      {demanda.origem === 'local' ? (
        <Texto variante="rotulo" cor="secundario" style={estilos.descricao}>
          {demanda.descricao}
        </Texto>
      ) : null}

      <View style={estilos.acoes}>
        {demanda.status === 'aberta' ? (
          <Botao
            titulo="Iniciar atendimento"
            variante="secundario"
            compacto
            aoPressionar={() => aoAlterarStatus('em_andamento')}
            rotuloAcessivel={`Iniciar atendimento de ${demanda.titulo}`}
          />
        ) : null}
        {demanda.status !== 'resolvida' ? (
          <Botao
            titulo="Marcar resolvida"
            icone="check"
            variante="secundario"
            compacto
            aoPressionar={() => aoAlterarStatus('resolvida')}
            rotuloAcessivel={`Marcar ${demanda.titulo} como resolvida`}
          />
        ) : (
          <Botao
            titulo="Reabrir"
            icone="restore"
            variante="fantasma"
            compacto
            aoPressionar={() => aoAlterarStatus('aberta')}
            rotuloAcessivel={`Reabrir ${demanda.titulo}`}
          />
        )}
      </View>
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  topo: { flexDirection: 'row', gap: esp.md },
  icone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm, marginTop: esp.md },
  descricao: { marginTop: esp.md },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm, marginTop: esp.md },
});
