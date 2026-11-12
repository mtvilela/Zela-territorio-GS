/**
 * Cartão que envolve um gráfico: título, origem do dado e o botão que alterna entre o
 * gráfico e a TABELA com os mesmos valores. A tabela é o equivalente acessível do gráfico:
 * quem não enxerga a imagem (ou prefere números) tem acesso a tudo.
 */
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { valorDoIndicador } from '@/dominio/alertas';
import type { DefinicaoIndicador, OrigemDado, PontoPrevisto, PontoSerie } from '@/dominio/tipos';
import { esp } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';
import { formatarDataCurta } from '@/utils/datas';
import { formatarNumero } from '@/utils/numeros';

import { Botao } from '../Botao';
import { Cartao } from '../Cartao';
import { SeloOrigem } from '../Selos';
import { Texto } from '../Texto';

interface Props {
  titulo: string;
  subtitulo?: string;
  origem?: OrigemDado;
  /** O gráfico. */
  children: ReactNode;
  /** A tabela com os mesmos dados; quando informada, aparece o botão de alternar. */
  tabela?: ReactNode;
  testID?: string;
}

export function CartaoGrafico({ titulo, subtitulo, origem, children, tabela, testID }: Props) {
  const [mostrarTabela, setMostrarTabela] = useState(false);
  return (
    <Cartao testID={testID}>
      <View style={estilos.cabecalho}>
        <View style={estilos.flex}>
          <Texto variante="titulo3" cabecalho>
            {titulo}
          </Texto>
          {subtitulo ? (
            <Texto variante="legenda" cor="secundario">
              {subtitulo}
            </Texto>
          ) : null}
        </View>
        {tabela ? (
          <Botao
            titulo={mostrarTabela ? 'Gráfico' : 'Tabela'}
            icone={mostrarTabela ? 'chart-line' : 'table'}
            variante="fantasma"
            compacto
            aoPressionar={() => setMostrarTabela((atual) => !atual)}
            rotuloAcessivel={mostrarTabela ? `Ver gráfico de ${titulo}` : `Ver tabela de ${titulo}`}
          />
        ) : null}
      </View>
      {origem ? <SeloOrigem origem={origem} style={estilos.origem} /> : null}
      <View style={estilos.corpo}>{mostrarTabela && tabela ? tabela : children}</View>
    </Cartao>
  );
}

// ---------------------------------------------------------------------------------------------

interface PropsTabela {
  definicao: DefinicaoIndicador;
  historico: PontoSerie[];
  previsao: PontoPrevisto[];
  rotuloDaPrevisao: string;
  /** Quantos dias do histórico listar (os mais recentes). */
  diasDeHistorico?: number;
}

/** Tabela com os valores do gráfico de série: data, valor, faixa provável e tipo. */
export function TabelaDeSerie({ definicao, historico, previsao, rotuloDaPrevisao, diasDeHistorico = 14 }: PropsTabela) {
  const { cores } = useTema();
  const temFaixa = previsao.some((p) => p.superior - p.inferior > 1e-9);
  const linhas = [
    ...historico.slice(-diasDeHistorico).map((p) => ({ ...p, tipo: 'Observado', faixa: '' })),
    ...previsao.map((p) => ({
      data: p.data,
      valor: p.valor,
      tipo: rotuloDaPrevisao,
      faixa:
        p.superior - p.inferior > 1e-9
          ? `${formatarNumero(p.inferior, definicao.casasDecimais)} a ${formatarNumero(p.superior, definicao.casasDecimais)}`
          : '',
    })),
  ];

  return (
    <View>
      <View style={[estilos.linha, { borderBottomColor: cores.eixo }]}>
        <Texto variante="micro" cor="suave" style={estilos.colunaData}>
          Data
        </Texto>
        <Texto variante="micro" cor="suave" style={estilos.colunaValor}>
          Valor
        </Texto>
        {temFaixa ? (
          <Texto variante="micro" cor="suave" style={estilos.colunaFaixa}>
            Faixa provável
          </Texto>
        ) : null}
        <Texto variante="micro" cor="suave" style={estilos.colunaTipo}>
          Tipo
        </Texto>
      </View>
      {linhas.map((linha) => {
        const valor = valorDoIndicador(definicao, linha.valor);
        return (
          <View
            key={`${linha.data}-${linha.tipo}`}
            accessible
            accessibilityLabel={`${formatarDataCurta(linha.data)}, ${linha.tipo}: ${valor}${linha.faixa ? `, faixa provável de ${linha.faixa}` : ''}`}
            style={[estilos.linha, { borderBottomColor: cores.grade }]}>
            <Texto variante="legenda" style={[estilos.colunaData, estilos.numeros]}>
              {formatarDataCurta(linha.data)}
            </Texto>
            <Texto variante="legenda" style={[estilos.colunaValor, estilos.numeros]}>
              {valor}
            </Texto>
            {temFaixa ? (
              <Texto variante="legenda" cor="secundario" style={[estilos.colunaFaixa, estilos.numeros]}>
                {linha.faixa || '—'}
              </Texto>
            ) : null}
            <Texto variante="legenda" cor="secundario" style={estilos.colunaTipo}>
              {linha.tipo}
            </Texto>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  cabecalho: { flexDirection: 'row', alignItems: 'flex-start', gap: esp.sm },
  origem: { marginTop: esp.sm },
  corpo: { marginTop: esp.md },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: esp.sm,
    paddingVertical: esp.sm,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  // Colunas de números alinham os dígitos verticalmente.
  numeros: { fontVariant: ['tabular-nums'] },
  colunaData: { width: 48 },
  colunaValor: { flex: 1.1 },
  colunaFaixa: { flex: 1.2 },
  colunaTipo: { flex: 1.3 },
});
