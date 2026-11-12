/**
 * Gráfico de série diária: histórico observado + projeção, com a faixa provável e os limites
 * de alerta. Desenhado com react-native-svg, sem biblioteca de gráficos, para controlar a
 * identidade visual e a acessibilidade.
 *
 * Decisões de visualização:
 *  - UM eixo vertical, com marcas redondas e grade discreta (linhas finas e sólidas);
 *  - o observado é linha cheia; a projeção é tracejada — a diferença não depende da cor;
 *  - a incerteza aparece como uma faixa clara em volta da projeção;
 *  - os limites têm cor de situação E rótulo escrito ao lado;
 *  - dá para tocar ou arrastar no gráfico para ler o valor de cada dia;
 *  - leitores de tela percorrem os dias com o gesto de "ajustar" (deslizar para cima/baixo).
 */
import { useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { limiteDoIndicador, valorDoIndicador } from '@/dominio/alertas';
import { ROTULO_SITUACAO } from '@/dominio/limiares';
import type { DefinicaoIndicador, Limiares, NivelAlerta, PontoPrevisto, PontoSerie } from '@/dominio/tipos';
import { comOpacidade } from '@/tema/cores';
import { esp } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';
import { formatarDataCurta, formatarDiaEData } from '@/utils/datas';
import { formatarNumero } from '@/utils/numeros';

import { Texto } from '../Texto';
import { calcularEixo, casasDasMarcas, escalaLinear, limitesVisiveis, posicionarRotulos } from './escala';

interface Props {
  definicao: DefinicaoIndicador;
  historico: PontoSerie[];
  previsao: PontoPrevisto[];
  limiares: Limiares;
  /** Data de hoje (ISO), para marcar a fronteira entre observado e previsto. */
  hoje: string;
  /** Linha para tendências contínuas; colunas para totais diários (chuva). */
  forma?: 'linha' | 'colunas';
  /** Nome da parte prevista na legenda: "Projeção do painel" ou "Previsão do modelo". */
  rotuloDaPrevisao: string;
  /** Resumo em texto do que o gráfico mostra, para leitores de tela. */
  descricaoAcessivel: string;
  altura?: number;
}

interface PontoDoGrafico {
  data: string;
  valor: number;
  previsto: boolean;
  inferior?: number;
  superior?: number;
}

const MARGEM = { esquerda: 38, topo: 12, base: 24 };
/** Abaixo desta largura, os rótulos dos limites mostram só o nome, para sobrar espaço para o gráfico. */
const LARGURA_COMPACTA = 300;
/** Rótulos de limites mais próximos que isto (em pontos) se sobreporiam. */
const DISTANCIA_MINIMA_ENTRE_ROTULOS = 15;

export function GraficoSerie({
  definicao,
  historico,
  previsao,
  limiares,
  hoje,
  forma = 'linha',
  rotuloDaPrevisao,
  descricaoAcessivel,
  altura = 200,
}: Props) {
  const { cores } = useTema();
  const [largura, setLargura] = useState(0);
  const [selecionado, setSelecionado] = useState<number | null>(null);

  const pontos = useMemo<PontoDoGrafico[]>(
    () => [
      ...historico.map((p) => ({ data: p.data, valor: p.valor, previsto: false })),
      ...previsao.map((p) => ({ ...p, previsto: true })),
    ],
    [historico, previsao],
  );

  const temFaixa = previsao.some((p) => p.superior - p.inferior > 1e-9);
  // Ponto destacado por padrão: hoje. Se os dados forem antigos (sem internet), o mais recente.
  const indiceDeHoje = pontos.findIndex((p) => p.data >= hoje);
  const indicePadrao = Math.max(0, indiceDeHoje >= 0 ? indiceDeHoje : pontos.length - 1);
  // O dia escolhido pela pessoa é mantido quando os dados mudam. Se a série nova vier mais curta
  // (uma atualização do clima com um dia a menos), ele fica preso ao último ponto que existe.
  const indiceAtivo = Math.min(selecionado ?? indicePadrao, Math.max(0, pontos.length - 1));

  const geometria = useMemo(() => {
    const valores = pontos.flatMap((p) => [p.valor, p.inferior ?? p.valor, p.superior ?? p.valor]);
    const niveisVisiveis = limitesVisiveis(valores, limiares);
    const eixo = calcularEixo([...valores, ...niveisVisiveis.map((n) => limiares[n])], {
      incluirZero: forma === 'colunas',
      piso: 0,
      teto: definicao.maximoFisico ?? undefined,
    });
    return { eixo, niveisVisiveis };
  }, [pontos, limiares, forma, definicao.maximoFisico]);

  const aoMedir = (evento: LayoutChangeEvent) => setLargura(evento.nativeEvent.layout.width);

  if (pontos.length === 0) {
    return (
      <View style={[estilos.semDados, { height: altura }]}>
        <Texto variante="rotulo" cor="suave" centralizado>
          Ainda não há dados para este gráfico.
        </Texto>
      </View>
    );
  }

  const { eixo, niveisVisiveis } = geometria;
  const compacto = largura > 0 && largura < LARGURA_COMPACTA;
  const margemDireita = compacto ? 60 : 84;
  const larguraDoPlot = Math.max(0, largura - MARGEM.esquerda - margemDireita);
  const alturaDoPlot = altura - MARGEM.topo - MARGEM.base;
  const n = pontos.length;
  const faixaX = larguraDoPlot / n;

  // Posição horizontal: na linha, os pontos vão de ponta a ponta; nas colunas, ficam no centro de cada dia.
  const x = (i: number): number =>
    forma === 'colunas'
      ? MARGEM.esquerda + (i + 0.5) * faixaX
      : MARGEM.esquerda + (n === 1 ? larguraDoPlot / 2 : (i / (n - 1)) * larguraDoPlot);
  const y = escalaLinear(eixo.minimo, eixo.maximo, MARGEM.topo + alturaDoPlot, MARGEM.topo);
  const base = MARGEM.topo + alturaDoPlot;

  const indicesObservados = pontos.map((p, i) => (p.previsto ? -1 : i)).filter((i) => i >= 0);
  const indicesPrevistos = pontos.map((p, i) => (p.previsto ? i : -1)).filter((i) => i >= 0);
  const ultimoObservado = indicesObservados[indicesObservados.length - 1];

  const caminho = (indices: number[], valorDe: (p: PontoDoGrafico) => number): string =>
    indices.map((i, k) => `${k === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(valorDe(pontos[i])).toFixed(1)}`).join(' ');

  // A projeção começa no último ponto observado, para a linha não ficar interrompida.
  const indicesDaProjecao =
    ultimoObservado !== undefined && indicesPrevistos.length > 0
      ? [ultimoObservado, ...indicesPrevistos]
      : indicesPrevistos;

  let faixa = '';
  if (temFaixa && indicesPrevistos.length > 0) {
    const ida = indicesDaProjecao.map(
      (i, k) => `${k === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(pontos[i].superior ?? pontos[i].valor).toFixed(1)}`,
    );
    const volta = [...indicesDaProjecao]
      .reverse()
      .map((i) => `L${x(i).toFixed(1)},${y(pontos[i].inferior ?? pontos[i].valor).toFixed(1)}`);
    faixa = `${ida.join(' ')} ${volta.join(' ')} Z`;
  }

  let area = '';
  if (forma === 'linha' && indicesObservados.length > 1) {
    const primeiro = indicesObservados[0];
    area = `${caminho(indicesObservados, (p) => p.valor)} L${x(ultimoObservado).toFixed(1)},${base} L${x(primeiro).toFixed(1)},${base} Z`;
  }

  /** Coluna com o topo arredondado e a base reta (a base é a linha de referência). */
  const coluna = (i: number): string => {
    const larguraDaColuna = Math.max(2, Math.min(24, faixaX - 2));
    const esquerda = x(i) - larguraDaColuna / 2;
    const topo = y(pontos[i].valor);
    const r = Math.min(4, larguraDaColuna / 2, Math.max(0, base - topo));
    return `M${esquerda},${base} L${esquerda},${topo + r} Q${esquerda},${topo} ${esquerda + r},${topo} L${esquerda + larguraDaColuna - r},${topo} Q${esquerda + larguraDaColuna},${topo} ${esquerda + larguraDaColuna},${topo + r} L${esquerda + larguraDaColuna},${base} Z`;
  };

  // Rótulos dos limites, na margem direita. Se dois ficarem muito próximos, o segundo é omitido.
  const rotulosDosLimites: { nivel: NivelAlerta; posicao: number; visivel: boolean }[] = [];
  [...niveisVisiveis]
    .sort((a, b) => y(limiares[a]) - y(limiares[b]))
    .forEach((nivel) => {
      const posicao = y(limiares[nivel]);
      const anterior = rotulosDosLimites.filter((r) => r.visivel).pop();
      rotulosDosLimites.push({
        nivel,
        posicao,
        visivel: !anterior || Math.abs(posicao - anterior.posicao) >= DISTANCIA_MINIMA_ENTRE_ROTULOS,
      });
    });

  // Datas no eixo horizontal, por prioridade: hoje, início, fim e meio do histórico.
  // Só entram as que cabem sem encostar em outra (ver posicionarRotulos).
  const rotuloDaData = (i: number) => (pontos[i].data === hoje ? 'hoje' : formatarDataCurta(pontos[i].data));
  const rotulosX = posicionarRotulos(
    [indicePadrao, 0, n - 1, Math.round(indicePadrao / 2)].map((i) => ({
      indice: i,
      texto: rotuloDaData(i),
      centro: x(i),
    })),
    largura,
  );
  const casasDoEixo = casasDasMarcas(eixo.marcas);

  // ----- Leitura do ponto ativo -----
  const ativo = pontos[indiceAtivo];
  const ehHoje = ativo.data === hoje;
  const tituloDaLeitura = ehHoje
    ? `Hoje, ${formatarDataCurta(ativo.data)}`
    : `${ativo.previsto ? rotuloDaPrevisao : 'Observado'} · ${formatarDiaEData(ativo.data)}`;
  const valorDaLeitura = valorDoIndicador(definicao, ativo.valor);
  const faixaDaLeitura =
    ativo.previsto &&
    ativo.inferior !== undefined &&
    ativo.superior !== undefined &&
    ativo.superior - ativo.inferior > 1e-9
      ? `faixa provável: ${formatarNumero(ativo.inferior, definicao.casasDecimais)} a ${valorDoIndicador(definicao, ativo.superior)}`
      : null;
  const leituraAcessivel = [tituloDaLeitura, valorDaLeitura, faixaDaLeitura].filter(Boolean).join(', ');

  // ----- Toque: encontra o dia mais próximo do dedo -----
  const selecionarPelaPosicao = (evento: GestureResponderEvent) => {
    if (larguraDoPlot <= 0) return;
    const posicao = evento.nativeEvent.locationX - MARGEM.esquerda;
    const indice = forma === 'colunas' ? Math.floor(posicao / faixaX) : Math.round((posicao / larguraDoPlot) * (n - 1));
    setSelecionado(Math.min(n - 1, Math.max(0, indice)));
  };

  const aoAjustar = (evento: AccessibilityActionEvent) => {
    const passo = evento.nativeEvent.actionName === 'increment' ? 1 : -1;
    setSelecionado(Math.min(n - 1, Math.max(0, indiceAtivo + passo)));
  };

  const corDoLimite = (nivel: NivelAlerta) => cores.situacao[nivel].cor;

  return (
    <View>
      {/* Leitura: sempre visível, para o valor não depender de tocar no gráfico. */}
      <View style={estilos.leitura}>
        <View style={estilos.flex}>
          <Texto variante="legenda" cor="secundario">
            {tituloDaLeitura}
          </Texto>
          <Texto variante="titulo2">{valorDaLeitura}</Texto>
        </View>
        {faixaDaLeitura ? (
          <Texto variante="legenda" cor="suave" style={estilos.faixaDaLeitura}>
            {faixaDaLeitura}
          </Texto>
        ) : null}
      </View>

      <View
        onLayout={aoMedir}
        style={{ height: altura }}
        accessible
        // No celular, o leitor de tela percorre os dias com o gesto de "ajustar". Na web, o gráfico é
        // uma imagem descrita em texto, e a tabela ao lado dá acesso a todos os valores pelo teclado.
        accessibilityRole={Platform.OS === 'web' ? 'image' : 'adjustable'}
        accessibilityLabel={
          Platform.OS === 'web'
            ? `${descricaoAcessivel} ${leituraAcessivel}. Use o botão Tabela para ver todos os valores.`
            : descricaoAcessivel
        }
        accessibilityHint="Deslize para cima ou para baixo para ouvir o valor de cada dia."
        aria-valuetext={Platform.OS === 'web' ? undefined : leituraAcessivel}
        accessibilityActions={Platform.OS === 'web' ? undefined : [{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={aoAjustar}>
        {largura > 0 ? (
          <>
            <Svg width={largura} height={altura}>
              {/* Grade horizontal */}
              {eixo.marcas.map((marca) => (
                <Line
                  key={`grade-${marca}`}
                  x1={MARGEM.esquerda}
                  x2={MARGEM.esquerda + larguraDoPlot}
                  y1={y(marca)}
                  y2={y(marca)}
                  stroke={marca === eixo.minimo ? cores.eixo : cores.grade}
                  strokeWidth={1}
                />
              ))}

              {/* Faixa provável da projeção */}
              {faixa ? <Path d={faixa} fill={comOpacidade(cores.serie1, 0.16)} /> : null}

              {/* Limites de alerta */}
              {niveisVisiveis.map((nivel) => (
                <Line
                  key={`limite-${nivel}`}
                  x1={MARGEM.esquerda}
                  x2={MARGEM.esquerda + larguraDoPlot}
                  y1={y(limiares[nivel])}
                  y2={y(limiares[nivel])}
                  stroke={corDoLimite(nivel)}
                  strokeWidth={1.5}
                />
              ))}

              {forma === 'linha' ? (
                <>
                  {area ? <Path d={area} fill={comOpacidade(cores.serie1, 0.1)} /> : null}
                  {indicesObservados.length > 1 ? (
                    <Path
                      d={caminho(indicesObservados, (p) => p.valor)}
                      stroke={cores.serie1}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      fill="none"
                    />
                  ) : null}
                  {indicesDaProjecao.length > 1 ? (
                    <Path
                      d={caminho(indicesDaProjecao, (p) => p.valor)}
                      stroke={cores.serie1}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      fill="none"
                    />
                  ) : null}
                  {/* Marcadores nas pontas: último observado (cheio) e fim da projeção (vazado). */}
                  {ultimoObservado !== undefined ? (
                    <Circle
                      cx={x(ultimoObservado)}
                      cy={y(pontos[ultimoObservado].valor)}
                      r={4.5}
                      fill={cores.serie1}
                      stroke={cores.superficie}
                      strokeWidth={2}
                    />
                  ) : null}
                  {indicesPrevistos.length > 0 ? (
                    <Circle
                      cx={x(n - 1)}
                      cy={y(pontos[n - 1].valor)}
                      r={4}
                      fill={cores.superficie}
                      stroke={cores.serie1}
                      strokeWidth={2}
                    />
                  ) : null}
                </>
              ) : (
                pontos.map((ponto, i) =>
                  ponto.valor > 0 ? (
                    <Path
                      key={`coluna-${ponto.data}`}
                      d={coluna(i)}
                      fill={ponto.previsto ? comOpacidade(cores.serie1, 0.45) : cores.serie1}
                    />
                  ) : null,
                )
              )}

              {/* Dia selecionado */}
              <Line
                x1={x(indiceAtivo)}
                x2={x(indiceAtivo)}
                y1={MARGEM.topo}
                y2={base}
                stroke={cores.textoSuave}
                strokeWidth={1}
              />
              <Circle
                cx={x(indiceAtivo)}
                cy={y(ativo.valor)}
                r={5}
                fill={cores.texto}
                stroke={cores.superficie}
                strokeWidth={2}
              />
            </Svg>

            {/* Rótulos como texto do app (mesma fonte, respeitam o tema). */}
            <View style={[StyleSheet.absoluteFill, estilos.semToque]}>
              {eixo.marcas.map((marca) => (
                <Texto
                  key={`marca-${marca}`}
                  variante="micro"
                  cor="suave"
                  maxFontSizeMultiplier={1.2}
                  style={[estilos.rotuloY, { top: y(marca) - 8, width: MARGEM.esquerda - 6 }]}>
                  {formatarNumero(marca, casasDoEixo)}
                </Texto>
              ))}

              {rotulosDosLimites
                .filter((r) => r.visivel)
                .map(({ nivel, posicao }) => (
                  <Texto
                    key={`rotulo-${nivel}`}
                    variante="micro"
                    cor="secundario"
                    maxFontSizeMultiplier={1.2}
                    numberOfLines={1}
                    style={[estilos.rotuloLimite, { top: posicao - 8, width: margemDireita - 6 }]}>
                    {ROTULO_SITUACAO[nivel]}
                    {compacto
                      ? ''
                      : ` ${limiteDoIndicador({ ...definicao, unidade: definicao.unidade === '%' ? '%' : '' }, limiares[nivel])}`}
                  </Texto>
                ))}

              {rotulosX.map((rotulo) => (
                <Texto
                  key={`data-${rotulo.indice}`}
                  variante="micro"
                  cor={rotulo.indice === indicePadrao ? 'secundario' : 'suave'}
                  maxFontSizeMultiplier={1.2}
                  numberOfLines={1}
                  style={[estilos.rotuloX, { left: rotulo.esquerda, width: rotulo.largura, top: base + 5 }]}>
                  {rotulo.texto}
                </Texto>
              ))}
            </View>

            {/* Camada invisível que recebe o toque e o arrasto: a área de toque é o gráfico inteiro. */}
            <View
              style={StyleSheet.absoluteFill}
              // Sem isto, o React Native pode "achatar" uma View vazia e ela deixaria de receber toques.
              collapsable={false}
              testID="grafico-area-de-toque"
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderTerminationRequest={() => true}
              onResponderGrant={selecionarPelaPosicao}
              onResponderMove={selecionarPelaPosicao}
            />
          </>
        ) : null}
      </View>

      {/* Legenda: os estilos de linha, e não só a cor, distinguem observado de previsto. */}
      <View style={estilos.legenda}>
        <ItemDaLegenda rotulo="Observado" forma={forma === 'colunas' ? 'bloco' : 'linha'} cor={cores.serie1} />
        {previsao.length > 0 ? (
          <ItemDaLegenda
            rotulo={rotuloDaPrevisao}
            forma={forma === 'colunas' ? 'bloco' : 'tracejada'}
            cor={forma === 'colunas' ? comOpacidade(cores.serie1, 0.45) : cores.serie1}
          />
        ) : null}
        {temFaixa ? (
          <ItemDaLegenda rotulo="Faixa provável (80%)" forma="bloco" cor={comOpacidade(cores.serie1, 0.3)} />
        ) : null}
      </View>
      {Platform.OS === 'web' || selecionado === null ? (
        <Texto variante="micro" cor="suave" style={estilos.dica}>
          Toque ou arraste no gráfico para ver o valor de cada dia.
        </Texto>
      ) : (
        <Texto variante="micro" cor="suave" style={estilos.dica}>
          Toque em “hoje” no gráfico para voltar ao valor atual.
        </Texto>
      )}
    </View>
  );
}

function ItemDaLegenda({
  rotulo,
  forma,
  cor,
}: {
  rotulo: string;
  forma: 'linha' | 'tracejada' | 'bloco';
  cor: string;
}) {
  return (
    <View style={estilos.itemDaLegenda}>
      {forma === 'bloco' ? (
        <View style={[estilos.blocoDaLegenda, { backgroundColor: cor }]} />
      ) : (
        <Svg width={22} height={8}>
          <Line
            x1={1}
            x2={21}
            y1={4}
            y2={4}
            stroke={cor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={forma === 'tracejada' ? '4 4' : undefined}
          />
        </Svg>
      )}
      <Texto variante="micro" cor="secundario">
        {rotulo}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  semToque: { pointerEvents: 'none' },
  semDados: { alignItems: 'center', justifyContent: 'center' },
  leitura: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: esp.md,
    marginBottom: esp.sm,
    minHeight: 46,
  },
  faixaDaLeitura: { textAlign: 'right', flexShrink: 1, maxWidth: '55%' },
  rotuloY: { position: 'absolute', left: 0, textAlign: 'right' },
  rotuloX: { position: 'absolute', textAlign: 'center' },
  rotuloLimite: { position: 'absolute', right: 0 },
  legenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: esp.lg,
    rowGap: esp.xs,
    marginTop: esp.sm,
  },
  itemDaLegenda: { flexDirection: 'row', alignItems: 'center', gap: esp.xs },
  dica: { marginTop: esp.sm },
  blocoDaLegenda: { width: 14, height: 10, borderRadius: 2 },
});
