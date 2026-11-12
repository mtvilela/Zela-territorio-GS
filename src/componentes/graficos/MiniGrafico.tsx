/**
 * Minigráfico (sparkline) dos cartões do painel: o passado em cinza discreto e a projeção
 * em azul tracejado, terminando em um ponto. É decorativo para leitores de tela — o cartão
 * já descreve a tendência em texto.
 */
import Svg, { Circle, Path } from 'react-native-svg';

import { useTema } from '@/tema/useTema';

import { Decorativo } from '../Decorativo';

interface Props {
  historico: number[];
  previsao: number[];
  largura?: number;
  altura?: number;
}

const FOLGA = 5;

export function MiniGrafico({ historico, previsao, largura = 104, altura = 36 }: Props) {
  const { cores } = useTema();
  const valores = [...historico, ...previsao];
  if (valores.length < 2) return null;

  const menor = Math.min(...valores);
  const maior = Math.max(...valores);
  const amplitude = maior - menor || 1;
  const x = (i: number) => FOLGA + (i / (valores.length - 1)) * (largura - 2 * FOLGA);
  const y = (v: number) => FOLGA + (1 - (v - menor) / amplitude) * (altura - 2 * FOLGA);
  const caminho = (inicio: number, fim: number) =>
    valores
      .slice(inicio, fim + 1)
      .map((v, k) => `${k === 0 ? 'M' : 'L'}${x(inicio + k).toFixed(1)},${y(v).toFixed(1)}`)
      .join(' ');

  const ultimoObservado = historico.length - 1;
  const ultimo = valores.length - 1;

  return (
    <Decorativo>
      <Svg width={largura} height={altura}>
        {historico.length > 1 ? (
          <Path
            d={caminho(0, ultimoObservado)}
            stroke={cores.deEnfase}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />
        ) : null}
        {previsao.length > 0 ? (
          <>
            <Path
              d={caminho(Math.max(0, ultimoObservado), ultimo)}
              stroke={cores.serie1}
              strokeWidth={2}
              strokeDasharray="4 4"
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />
            <Circle
              cx={x(ultimo)}
              cy={y(valores[ultimo])}
              r={4}
              fill={cores.serie1}
              stroke={cores.superficie}
              strokeWidth={2}
            />
          </>
        ) : (
          <Circle
            cx={x(ultimo)}
            cy={y(valores[ultimo])}
            r={4}
            fill={cores.deEnfase}
            stroke={cores.superficie}
            strokeWidth={2}
          />
        )}
      </Svg>
    </Decorativo>
  );
}
