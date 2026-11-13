/**
 * Formulário de nova solicitação de zeladoria (mesmas regras do Zela Bairro).
 * Privacidade: não há campo de nome, contato ou endereço — a localização é só o setor —
 * e os textos livres são verificados para barrar CPF, telefone e e-mail.
 */
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { Aviso } from '@/componentes/Blocos';
import { Botao } from '@/componentes/Botao';
import { ICONE_DA_CATEGORIA } from '@/componentes/CartaoDemanda';
import { CampoTexto, SeletorOpcoes } from '@/componentes/Formulario';
import { Tela } from '@/componentes/Tela';
import { Texto } from '@/componentes/Texto';
import { ROTULO_CATEGORIA, ROTULO_PRIORIDADE, SETORES } from '@/dados/catalogo';
import type { CategoriaDemanda, Demanda, PrioridadeDemanda } from '@/dominio/tipos';
import { CATEGORIAS, LIMITES, PRIORIDADES, temErros, validarDemanda, type CamposDemanda } from '@/dominio/validacao';
import { useDemandasLocais } from '@/estado/demandas';
import { useHoje } from '@/estado/painel';
import { esp } from '@/tema/medidas';
import { useVoltarPara } from '@/utils/navegacao';
import { plural } from '@/utils/numeros';

const CAMPOS_VAZIOS: CamposDemanda = {
  titulo: '',
  categoria: null,
  prioridade: null,
  setorId: null,
  descricao: '',
};

const IDS_DOS_SETORES = SETORES.map((setor) => setor.id);

export default function TelaNovaDemanda() {
  // Volta para a lista de solicitações (mesmo que o app tenha sido aberto direto nesta tela).
  const voltar = useVoltarPara('/demandas');
  const hoje = useHoje();
  const registrar = useDemandasLocais((s) => s.registrar);

  const [campos, setCampos] = useState<CamposDemanda>(CAMPOS_VAZIOS);
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [registrada, setRegistrada] = useState<Demanda | null>(null);

  const erros = useMemo(() => (tentouSalvar ? validarDemanda(campos, IDS_DOS_SETORES) : {}), [tentouSalvar, campos]);
  const quantidadeDeErros = Object.values(erros).filter(Boolean).length;
  const alterar = (parcial: Partial<CamposDemanda>) => setCampos((atual) => ({ ...atual, ...parcial }));

  const salvar = () => {
    const encontrados = validarDemanda(campos, IDS_DOS_SETORES);
    if (temErros(encontrados)) {
      setTentouSalvar(true);
      const total = Object.values(encontrados).filter(Boolean).length;
      AccessibilityInfo.announceForAccessibility(
        `${plural(total, 'campo precisa', 'campos precisam')} de correção antes de registrar.`,
      );
      return;
    }
    // A validação garante que categoria, prioridade e setor foram escolhidos.
    const nova = registrar(
      {
        titulo: campos.titulo,
        categoria: campos.categoria as CategoriaDemanda,
        prioridade: campos.prioridade as PrioridadeDemanda,
        setorId: campos.setorId as string,
        descricao: campos.descricao,
      },
      hoje,
    );
    setRegistrada(nova);
    AccessibilityInfo.announceForAccessibility('Solicitação registrada.');
  };

  const registrarOutra = () => {
    setCampos(CAMPOS_VAZIOS);
    setTentouSalvar(false);
    setRegistrada(null);
  };

  // Depois de salvar, a tela confirma o registro e oferece os próximos passos.
  if (registrada) {
    const setor = SETORES.find((s) => s.id === registrada.setorId);
    return (
      // A chave faz a moldura ser montada de novo: a confirmação (e depois o formulário vazio de
      // "Registrar outra") abre no topo, e não na posição de rolagem anterior.
      <Tela key="registrada" testID="tela-demanda-registrada">
        <Stack.Screen options={{ title: 'Solicitação registrada' }} />
        <Aviso
          tom="sucesso"
          titulo="Solicitação registrada"
          texto={`"${registrada.titulo}" entrou na fila ${setor ? `do setor ${setor.nome}` : ''} e já conta nos indicadores do painel. O registro fica salvo neste aparelho.`}
        />
        <Botao titulo="Ver as solicitações" icone="clipboard-list-outline" largo aoPressionar={voltar} />
        <Botao titulo="Registrar outra" icone="plus" variante="secundario" largo aoPressionar={registrarOutra} />
      </Tela>
    );
  }

  return (
    <Tela
      testID="tela-nova-demanda"
      rodape={
        <View style={estilos.rodape}>
          <Botao titulo="Cancelar" variante="fantasma" aoPressionar={voltar} />
          <Botao
            titulo="Registrar solicitação"
            icone="check"
            aoPressionar={salvar}
            style={estilos.botaoSalvar}
            testID="botao-salvar-demanda"
          />
        </View>
      }>
      <Stack.Screen options={{ title: 'Nova solicitação' }} />

      <Texto variante="rotulo" cor="secundario">
        Registre um problema de zeladoria informado à equipe. Ele entra na fila do setor e nos indicadores do tema
        Serviços urbanos.
      </Texto>

      <Aviso
        tom="informacao"
        icone="shield-lock-outline"
        titulo="Sem dados pessoais"
        texto="Não escreva nomes, CPF, telefone, e-mail ou endereço completo. A localização é registrada apenas por setor."
      />

      {quantidadeDeErros > 0 ? (
        <Aviso
          tom="erro"
          titulo="Revise antes de registrar"
          texto={`${plural(quantidadeDeErros, 'campo precisa', 'campos precisam')} de correção. Veja as mensagens abaixo de cada campo.`}
        />
      ) : null}

      <CampoTexto
        rotulo="Título"
        obrigatorio
        valor={campos.titulo}
        aoMudar={(titulo) => alterar({ titulo })}
        erro={erros.titulo}
        maximo={LIMITES.titulo.maximo}
        ajuda={`De ${LIMITES.titulo.minimo} a ${LIMITES.titulo.maximo} caracteres.`}
        placeholder="Ex.: Poste apagado na praça"
        testID="campo-titulo"
      />

      <SeletorOpcoes<CategoriaDemanda>
        rotulo="Categoria"
        obrigatorio
        valor={campos.categoria}
        aoMudar={(categoria) => alterar({ categoria })}
        erro={erros.categoria}
        opcoes={CATEGORIAS.map((categoria) => ({
          valor: categoria,
          rotulo: ROTULO_CATEGORIA[categoria],
          icone: ICONE_DA_CATEGORIA[categoria],
        }))}
      />

      <SeletorOpcoes<PrioridadeDemanda>
        rotulo="Prioridade"
        obrigatorio
        valor={campos.prioridade}
        aoMudar={(prioridade) => alterar({ prioridade })}
        erro={erros.prioridade}
        opcoes={PRIORIDADES.map((prioridade) => ({ valor: prioridade, rotulo: ROTULO_PRIORIDADE[prioridade] }))}
      />

      <SeletorOpcoes<string>
        rotulo="Setor"
        obrigatorio
        valor={campos.setorId}
        aoMudar={(setorId) => alterar({ setorId })}
        erro={erros.setorId}
        opcoes={SETORES.map((setor) => ({ valor: setor.id, rotulo: setor.nome }))}
      />

      <CampoTexto
        rotulo="Descrição"
        obrigatorio
        multilinha
        valor={campos.descricao}
        aoMudar={(descricao) => alterar({ descricao })}
        erro={erros.descricao}
        maximo={LIMITES.descricao.maximo}
        ajuda={`De ${LIMITES.descricao.minimo} a ${LIMITES.descricao.maximo} caracteres. Descreva o problema, não as pessoas.`}
        placeholder="O que está acontecendo e desde quando?"
        testID="campo-descricao"
      />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  rodape: { flexDirection: 'row', justifyContent: 'flex-end', gap: esp.md },
  botaoSalvar: { flexGrow: 1, alignSelf: 'stretch' },
});
