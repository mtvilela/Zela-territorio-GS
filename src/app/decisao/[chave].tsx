/**
 * Formulário de registro de decisão.
 *
 * É aqui que o princípio "apoiar, não decidir" vira regra de interface:
 *  - o gestor escolhe entre adotar uma sugestão, adotar outra medida, monitorar ou descartar;
 *  - toda decisão exige justificativa e o cargo de quem decide;
 *  - medidas de ALTO impacto exigem justificativa maior e a confirmação de validação humana;
 *  - salvar apenas registra a decisão no diário — o app não executa nada.
 *
 * Depois de salvar, a tela confirma o registro e mostra exatamente o que foi guardado.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { Aviso, EstadoVazio } from '@/componentes/Blocos';
import { Botao } from '@/componentes/Botao';
import { Cartao } from '@/componentes/Cartao';
import { CartaoDecisao } from '@/componentes/CartaoDecisao';
import { CampoTexto, GrupoRadio, Interruptor, SeletorOpcoes } from '@/componentes/Formulario';
import { SeloImpacto, SeloSituacao } from '@/componentes/Selos';
import { Tela } from '@/componentes/Tela';
import { Texto } from '@/componentes/Texto';
import { DESCRICAO_TIPO_DECISAO, montarDecisao, ROTULO_TIPO_DECISAO } from '@/dominio/decisoes';
import { ROTULO_IMPACTO } from '@/dominio/recomendacoes';
import type { Decisao, ImpactoMedida, TipoDecisao } from '@/dominio/tipos';
import {
  impactoDaDecisao,
  LIMITES,
  temErros,
  TIPOS_DECISAO,
  validarDecisao,
  type CamposDecisao,
} from '@/dominio/validacao';
import { useConfiguracoes } from '@/estado/configuracoes';
import { useDecisoes } from '@/estado/decisoes';
import { useAlerta } from '@/estado/painel';
import { esp } from '@/tema/medidas';
import { useVoltarPara } from '@/utils/navegacao';
import { plural } from '@/utils/numeros';

const IMPACTOS: ImpactoMedida[] = ['baixo', 'medio', 'alto'];

export default function TelaRegistrarDecisao() {
  const { chave } = useLocalSearchParams<{ chave: string }>();
  const router = useRouter();
  // Ao cancelar ou depois de salvar, volta para a tela do alerta (ver useVoltarPara).
  const voltar = useVoltarPara({ pathname: '/alerta/[chave]', params: { chave: chave ?? '' } });
  const alerta = useAlerta(chave);
  const registrar = useDecisoes((s) => s.registrar);
  const responsavelSalvo = useConfiguracoes((s) => s.responsavel);
  const lembrarResponsavel = useConfiguracoes((s) => s.lembrarResponsavel);

  const [campos, setCampos] = useState<CamposDecisao>({
    tipo: null,
    opcaoId: null,
    outraMedida: '',
    impactoOutra: null,
    justificativa: '',
    // Pré-preenche com o último cargo informado, para não digitar de novo a cada decisão.
    responsavel: responsavelSalvo,
    validacaoHumana: false,
  });
  // Os erros só aparecem depois da primeira tentativa de salvar; daí em diante, somem ao corrigir.
  const [tentouSalvar, setTentouSalvar] = useState(false);
  // Depois de salvar, o formulário dá lugar à confirmação (o que também impede salvar duas vezes).
  const [registrada, setRegistrada] = useState<Decisao | null>(null);

  const opcoes = useMemo(() => alerta?.opcoes ?? [], [alerta]);
  const erros = useMemo(() => (tentouSalvar ? validarDecisao(campos, opcoes) : {}), [tentouSalvar, campos, opcoes]);

  if (registrada) {
    return (
      // A chave faz a moldura ser montada de novo: a confirmação abre no topo, e não na posição de
      // rolagem em que o formulário estava.
      <Tela key="registrada" testID="tela-decisao-registrada">
        <Stack.Screen options={{ title: 'Decisão registrada' }} />
        <Aviso
          tom="sucesso"
          titulo="Decisão registrada"
          texto="A decisão foi guardada no diário deste aparelho, com a justificativa e o alerta no momento. O aplicativo não executa a medida: ela depende das equipes e dos órgãos responsáveis."
        />
        <CartaoDecisao decisao={registrada} />
        <Botao
          titulo="Voltar ao alerta"
          icone="arrow-left"
          largo
          aoPressionar={voltar}
          testID="botao-voltar-ao-alerta"
        />
        <Botao
          titulo="Ver o diário de decisões"
          icone="notebook-check-outline"
          variante="secundario"
          largo
          aoPressionar={() => router.dismissTo('/decisoes')}
        />
      </Tela>
    );
  }

  if (!alerta) {
    return (
      <Tela>
        <Stack.Screen options={{ title: 'Registrar decisão' }} />
        <EstadoVazio
          icone="check-circle-outline"
          titulo="Este alerta não está mais ativo"
          texto="Não é possível registrar decisão para um alerta que deixou de existir."
          acao={{ titulo: 'Ver alertas ativos', aoPressionar: () => router.dismissTo('/alertas') }}
        />
      </Tela>
    );
  }

  const alterar = (parcial: Partial<CamposDecisao>) => setCampos((atual) => ({ ...atual, ...parcial }));
  const altoImpacto = impactoDaDecisao(campos, opcoes) === 'alto';
  const minimoDaJustificativa = altoImpacto ? LIMITES.justificativa.minimoAltoImpacto : LIMITES.justificativa.minimo;
  const quantidadeDeErros = Object.values(erros).filter(Boolean).length;

  const salvar = () => {
    const encontrados = validarDecisao(campos, opcoes);
    if (temErros(encontrados)) {
      setTentouSalvar(true);
      const total = Object.values(encontrados).filter(Boolean).length;
      AccessibilityInfo.announceForAccessibility(
        `${plural(total, 'campo precisa', 'campos precisam')} de correção antes de salvar.`,
      );
      return;
    }
    setRegistrada(registrar(montarDecisao(alerta, campos)));
    lembrarResponsavel(campos.responsavel);
    AccessibilityInfo.announceForAccessibility('Decisão registrada no diário.');
  };

  return (
    <Tela
      testID="tela-decisao"
      rodape={
        <View style={estilos.rodape}>
          <Botao titulo="Cancelar" variante="fantasma" aoPressionar={voltar} />
          <Botao
            titulo="Salvar decisão"
            icone="content-save-outline"
            aoPressionar={salvar}
            style={estilos.botaoSalvar}
            testID="botao-salvar-decisao"
          />
        </View>
      }>
      <Stack.Screen options={{ title: 'Registrar decisão' }} />

      <Cartao faixa={alerta.nivel}>
        <SeloSituacao situacao={alerta.nivel} />
        <Texto variante="titulo3" style={estilos.tituloDoAlerta}>
          {alerta.titulo}
        </Texto>
        <Texto variante="legenda" cor="secundario">
          Confiança {alerta.confianca.pontuacao}/100 · {alerta.resumo}
        </Texto>
      </Cartao>

      {quantidadeDeErros > 0 ? (
        <Aviso
          tom="erro"
          titulo="Revise antes de salvar"
          texto={`${plural(quantidadeDeErros, 'campo precisa', 'campos precisam')} de correção. Veja as mensagens abaixo de cada campo.`}
        />
      ) : null}

      <GrupoRadio<TipoDecisao>
        rotulo="O que foi decidido?"
        obrigatorio
        valor={campos.tipo}
        aoMudar={(tipo) => alterar({ tipo })}
        erro={erros.tipo}
        opcoes={TIPOS_DECISAO.map((tipo) => ({
          valor: tipo,
          titulo: ROTULO_TIPO_DECISAO[tipo],
          descricao: DESCRICAO_TIPO_DECISAO[tipo],
        }))}
      />

      {campos.tipo === 'adotar_recomendacao' ? (
        <GrupoRadio<string>
          rotulo="Qual medida será adotada?"
          obrigatorio
          valor={campos.opcaoId}
          aoMudar={(opcaoId) => alterar({ opcaoId })}
          erro={erros.opcaoId}
          opcoes={opcoes.map((opcao) => ({
            valor: opcao.id,
            titulo: opcao.titulo,
            acessorio: <SeloImpacto impacto={opcao.impacto} />,
            complementoAcessivel: ROTULO_IMPACTO[opcao.impacto],
          }))}
        />
      ) : null}

      {campos.tipo === 'outra_medida' ? (
        <>
          <CampoTexto
            rotulo="Qual medida será adotada?"
            obrigatorio
            valor={campos.outraMedida}
            aoMudar={(outraMedida) => alterar({ outraMedida })}
            erro={erros.outraMedida}
            maximo={LIMITES.medida.maximo}
            placeholder="Ex.: instalar contêiner provisório ao lado do ecoponto"
          />
          <SeletorOpcoes<ImpactoMedida>
            rotulo="Impacto desta medida para a população"
            obrigatorio
            valor={campos.impactoOutra}
            aoMudar={(impactoOutra) => alterar({ impactoOutra })}
            erro={erros.impactoOutra}
            opcoes={IMPACTOS.map((impacto) => ({ valor: impacto, rotulo: ROTULO_IMPACTO[impacto] }))}
          />
        </>
      ) : null}

      {altoImpacto ? (
        <>
          <Aviso
            tom="atencao"
            titulo="Medida de alto impacto"
            texto="Esta medida afeta diretamente a rotina das pessoas. O painel não a automatiza: ela exige uma justificativa completa e a confirmação de que foi validada por pessoas."
          />
          <Interruptor
            rotulo="Confirmo a validação humana"
            descricao="A medida foi analisada pela equipe técnica ou pelo órgão responsável, e a situação foi conferida em campo."
            valor={campos.validacaoHumana}
            aoMudar={(validacaoHumana) => alterar({ validacaoHumana })}
            erro={erros.validacaoHumana}
          />
        </>
      ) : null}

      <CampoTexto
        rotulo="Justificativa"
        obrigatorio
        multilinha
        valor={campos.justificativa}
        aoMudar={(justificativa) => alterar({ justificativa })}
        erro={erros.justificativa}
        maximo={LIMITES.justificativa.maximo}
        ajuda={`Explique o motivo em pelo menos ${minimoDaJustificativa} caracteres. Não inclua dados pessoais de moradores.`}
        placeholder="Por que esta é a decisão adequada agora?"
        testID="campo-justificativa"
      />

      <CampoTexto
        rotulo="Quem decide (cargo ou função)"
        obrigatorio
        valor={campos.responsavel}
        aoMudar={(responsavel) => alterar({ responsavel })}
        erro={erros.responsavel}
        maximo={LIMITES.responsavel.maximo}
        ajuda="Informe o cargo, não o nome: por exemplo, Coordenação da Defesa Civil."
        autoCapitalize="sentences"
        testID="campo-responsavel"
      />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  rodape: { flexDirection: 'row', justifyContent: 'flex-end', gap: esp.md },
  botaoSalvar: { flexGrow: 1, alignSelf: 'stretch' },
  tituloDoAlerta: { marginTop: esp.sm, marginBottom: esp.xs },
});
