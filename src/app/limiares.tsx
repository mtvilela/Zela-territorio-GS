/**
 * Limites dos alertas: o gestor define, por indicador, a partir de que valor a situação
 * passa a ser de atenção, alerta ou crítica. Quem conhece o território calibra o painel.
 */
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { Aviso } from '@/componentes/Blocos';
import { Botao } from '@/componentes/Botao';
import { Cartao } from '@/componentes/Cartao';
import { CampoTexto, ErroDoCampo, SeletorOpcoes } from '@/componentes/Formulario';
import { ICONE_DO_TEMA } from '@/componentes/Icone';
import { SeloSituacao } from '@/componentes/Selos';
import { Tela } from '@/componentes/Tela';
import { Texto } from '@/componentes/Texto';
import { INDICADORES, ORDEM_INDICADORES } from '@/dados/catalogo';
import { limiaresEmVigor } from '@/dados/painel';
import { limiteDoIndicador } from '@/dominio/alertas';
import type { IndicadorId, Limiares, NivelAlerta } from '@/dominio/tipos';
import { validarCamposLimiares, type CamposLimiares } from '@/dominio/validacao';
import { useConfiguracoes } from '@/estado/configuracoes';
import { esp } from '@/tema/medidas';
import { formatarNumero } from '@/utils/numeros';

const NIVEIS: { nivel: NivelAlerta; rotulo: string }[] = [
  { nivel: 'atencao', rotulo: 'Limite de atenção' },
  { nivel: 'alerta', rotulo: 'Limite de alerta' },
  { nivel: 'critico', rotulo: 'Limite crítico' },
];

function ehIndicador(valor: unknown): valor is IndicadorId {
  return typeof valor === 'string' && (ORDEM_INDICADORES as string[]).includes(valor);
}

/** Converte os limites em texto para os campos ("35,5"). */
function paraCampos(limiares: Limiares): CamposLimiares {
  const texto = (valor: number) => formatarNumero(valor, Number.isInteger(valor) ? 0 : 1).replace('.', '');
  return { atencao: texto(limiares.atencao), alerta: texto(limiares.alerta), critico: texto(limiares.critico) };
}

export default function TelaLimiares() {
  const { indicador: parametro } = useLocalSearchParams<{ indicador?: string }>();
  const personalizados = useConfiguracoes((s) => s.limiares);
  const definirLimiares = useConfiguracoes((s) => s.definirLimiares);
  const restaurarLimiares = useConfiguracoes((s) => s.restaurarLimiares);

  const [indicador, setIndicador] = useState<IndicadorId>(ehIndicador(parametro) ? parametro : 'chuva_diaria');
  const [campos, setCampos] = useState<CamposLimiares>(() =>
    paraCampos(limiaresEmVigor(ehIndicador(parametro) ? parametro : 'chuva_diaria', personalizados)),
  );
  const [erros, setErros] = useState<ReturnType<typeof validarCamposLimiares>['erros']>({});
  const [mensagem, setMensagem] = useState<string | null>(null);

  const definicao = INDICADORES[indicador];
  const estaPersonalizado = personalizados[indicador] !== undefined;
  const padrao = definicao.limiaresPadrao;

  const trocarIndicador = (id: IndicadorId) => {
    setIndicador(id);
    setCampos(paraCampos(limiaresEmVigor(id, personalizados)));
    setErros({});
    setMensagem(null);
  };

  const alterar = (nivel: NivelAlerta, texto: string) => {
    setCampos((atual) => ({ ...atual, [nivel]: texto }));
    setMensagem(null);
  };

  const salvar = () => {
    const resultado = validarCamposLimiares(campos, definicao);
    setErros(resultado.erros);
    if (!resultado.valores) {
      AccessibilityInfo.announceForAccessibility('Os limites não foram salvos. Corrija os campos indicados.');
      return;
    }
    definirLimiares(indicador, resultado.valores);
    setCampos(paraCampos(resultado.valores));
    setMensagem(`Limites de ${definicao.nomeCurto.toLowerCase()} salvos. Os alertas já foram recalculados.`);
    AccessibilityInfo.announceForAccessibility('Limites salvos.');
  };

  const restaurar = () => {
    restaurarLimiares(indicador);
    setCampos(paraCampos(padrao));
    setErros({});
    setMensagem(`Limites padrão de ${definicao.nomeCurto.toLowerCase()} restaurados.`);
  };

  return (
    <Tela
      testID="tela-limiares"
      rodape={
        <View style={estilos.rodape}>
          {estaPersonalizado ? <Botao titulo="Restaurar padrão" variante="fantasma" aoPressionar={restaurar} /> : null}
          <Botao
            titulo="Salvar limites"
            icone="content-save-outline"
            aoPressionar={salvar}
            style={estilos.botaoSalvar}
            testID="botao-salvar-limiares"
          />
        </View>
      }>
      <Stack.Screen options={{ title: 'Limites dos alertas' }} />

      <Texto variante="rotulo" cor="secundario">
        Os limites definem quando um indicador gera alerta. Os valores iniciais são um ponto de partida: ajuste-os com
        quem conhece o território (Defesa Civil, concessionárias, equipes de campo).
      </Texto>

      <SeletorOpcoes<IndicadorId>
        rotulo="Indicador"
        valor={indicador}
        aoMudar={trocarIndicador}
        opcoes={ORDEM_INDICADORES.map((id) => ({
          valor: id,
          rotulo: INDICADORES[id].nomeCurto,
          icone: ICONE_DO_TEMA[INDICADORES[id].tema],
        }))}
      />

      <Cartao>
        <Texto variante="titulo3" cabecalho>
          {definicao.nome}
        </Texto>
        <Texto variante="legenda" cor="secundario">
          {definicao.unidade ? `Unidade: ${definicao.unidade}. ` : ''}
          {definicao.sentido === 'maior_pior'
            ? 'Quanto MAIOR o valor, pior: use limites crescentes (atenção < alerta < crítico).'
            : 'Quanto MENOR o valor, pior: use limites decrescentes (atenção > alerta > crítico).'}{' '}
          Valores aceitos: de {formatarNumero(definicao.faixa.minimo)} a {formatarNumero(definicao.faixa.maximo)}.
        </Texto>

        <View style={estilos.campos}>
          {NIVEIS.map(({ nivel, rotulo }) => (
            <View key={nivel} style={estilos.campo}>
              <SeloSituacao situacao={nivel} />
              <CampoTexto
                rotulo={rotulo}
                valor={campos[nivel]}
                aoMudar={(texto) => alterar(nivel, texto)}
                erro={erros[nivel]}
                ajuda={`Padrão: ${limiteDoIndicador(definicao, padrao[nivel])}`}
                keyboardType="decimal-pad"
                inputMode="decimal"
                maxLength={8}
                testID={`campo-limite-${nivel}`}
              />
            </View>
          ))}
        </View>

        <ErroDoCampo mensagem={erros.geral} />
      </Cartao>

      {mensagem ? <Aviso tom="sucesso" texto={mensagem} /> : null}

      <Aviso
        tom="informacao"
        texto="Limites mais baixos avisam antes, mas geram mais alarmes falsos; limites mais altos avisam menos, mas podem avisar tarde. Essa escolha é uma decisão de gestão, não do aplicativo."
      />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  rodape: { flexDirection: 'row', justifyContent: 'flex-end', gap: esp.md },
  botaoSalvar: { flexGrow: 1, alignSelf: 'stretch' },
  campos: { gap: esp.lg, marginTop: esp.lg, marginBottom: esp.sm },
  campo: { gap: esp.sm },
});
