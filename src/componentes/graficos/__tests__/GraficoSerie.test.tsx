/**
 * Testes do gráfico de série no ambiente nativo: a leitura para leitores de tela (gesto de
 * "ajustar"), o toque e o que acontece quando os dados mudam com um dia selecionado.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { GraficoSerie } from '@/componentes/graficos/GraficoSerie';
import { INDICADORES } from '@/dados/catalogo';
import type { PontoPrevisto, PontoSerie } from '@/dominio/tipos';
import { somarDias } from '@/utils/datas';

const HOJE = '2026-03-10';
const definicao = INDICADORES.ocupacao_ecoponto;

/** `dias` leituras terminando hoje, subindo um ponto por dia: 60, 61, 62… */
function historicoAte(dias: number): PontoSerie[] {
  return Array.from({ length: dias }, (_, i) => ({ data: somarDias(HOJE, i - (dias - 1)), valor: 60 + i }));
}

/** Projeção para os próximos `dias`, a partir de amanhã: 70, 71… com faixa de ±2. */
function previsaoDe(dias: number): PontoPrevisto[] {
  return Array.from({ length: dias }, (_, i) => ({
    data: somarDias(HOJE, i + 1),
    valor: 70 + i,
    inferior: 68 + i,
    superior: 72 + i,
  }));
}

function grafico(historico: PontoSerie[], previsao: PontoPrevisto[]) {
  return (
    <GraficoSerie
      definicao={definicao}
      historico={historico}
      previsao={previsao}
      limiares={definicao.limiaresPadrao}
      hoje={HOJE}
      rotuloDaPrevisao="Projeção do painel"
      descricaoAcessivel="Ocupação do ecoponto no setor de teste."
    />
  );
}

const area = () => screen.getByRole('adjustable');
const ajustar = (acao: 'increment' | 'decrement') =>
  fireEvent(area(), 'accessibilityAction', { nativeEvent: { actionName: acao } });
async function repetir(vezes: number, acao: 'increment' | 'decrement') {
  for (let i = 0; i < vezes; i++) await ajustar(acao);
}
/** Dá ao gráfico uma largura de tela de celular, o que faz o desenho (SVG) ser montado. */
const medir = () => fireEvent(area(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 340, height: 200 } } });

describe('leitura por leitor de tela', () => {
  test('anuncia a descrição do gráfico e começa pelo valor de hoje', async () => {
    await render(grafico(historicoAte(10), previsaoDe(7)));
    expect(screen.getByLabelText('Ocupação do ecoponto no setor de teste.')).toBe(area());
    expect(area()).toHaveAccessibilityValue({ text: /^Hoje, 10\/03, 69,0%$/ });
  });

  test('o gesto de ajustar percorre os dias, do observado à projeção, sem passar das pontas', async () => {
    await render(grafico(historicoAte(10), previsaoDe(7)));

    await ajustar('increment');
    expect(area()).toHaveAccessibilityValue({
      text: /^Projeção do painel · .+, 11\/03, 70,0%, faixa provável: 68,0 a 72,0%$/,
    });

    await repetir(2, 'decrement');
    expect(area()).toHaveAccessibilityValue({ text: /^Observado · .+, 09\/03, 68,0%$/ });

    await repetir(40, 'decrement');
    expect(area()).toHaveAccessibilityValue({ text: /^Observado · .+, 01\/03, 60,0%$/ });

    await repetir(40, 'increment');
    expect(area()).toHaveAccessibilityValue({ text: /^Projeção do painel · .+, 17\/03, 76,0%/ });
  });
});

describe('toque', () => {
  test('escolhe o dia mais próximo do dedo e segura nas bordas', async () => {
    await render(grafico(historicoAte(10), previsaoDe(7)));
    await medir();
    const toque = screen.getByTestId('grafico-area-de-toque');
    const tocarEm = (x: number) => fireEvent(toque, 'responderGrant', { nativeEvent: { locationX: x } });

    // Com 340 de largura, a área dos dados vai de x = 38 (primeiro dia) a x = 256 (último dia).
    await tocarEm(256);
    expect(area()).toHaveAccessibilityValue({ text: /17\/03, 76,0%/ });
    await tocarEm(147);
    expect(area()).toHaveAccessibilityValue({ text: /^Observado · .+, 09\/03, 68,0%$/ });
    await tocarEm(2);
    expect(area()).toHaveAccessibilityValue({ text: /01\/03, 60,0%$/ });
    await tocarEm(999);
    expect(area()).toHaveAccessibilityValue({ text: /17\/03, 76,0%/ });

    // Arrastar o dedo atualiza a leitura sem precisar soltar.
    await fireEvent(toque, 'responderMove', { nativeEvent: { locationX: 38 } });
    expect(area()).toHaveAccessibilityValue({ text: /01\/03, 60,0%$/ });
    expect(screen.getByText('Toque em “hoje” no gráfico para voltar ao valor atual.')).toBeOnTheScreen();
  });
});

describe('dados que mudam com um dia selecionado', () => {
  test('série mais curta: a seleção fica no último dia que existe, sem quebrar a tela', async () => {
    const { rerender } = await render(grafico(historicoAte(10), previsaoDe(7)));
    await medir();
    await repetir(7, 'increment');
    expect(area()).toHaveAccessibilityValue({ text: /17\/03, 76,0%/ });

    // A atualização do clima voltou com menos dias de previsão.
    await rerender(grafico(historicoAte(10), previsaoDe(3)));
    expect(area()).toHaveAccessibilityValue({ text: /^Projeção do painel · .+, 13\/03, 72,0%/ });

    // Só restou o histórico curto.
    await rerender(grafico(historicoAte(4), []));
    expect(area()).toHaveAccessibilityValue({ text: /^Hoje, 10\/03, 63,0%$/ });
  });

  test('sem nenhum dado, mostra o aviso em vez do gráfico', async () => {
    const { rerender } = await render(grafico(historicoAte(10), previsaoDe(7)));
    await repetir(7, 'increment');
    await rerender(grafico([], []));
    expect(screen.getByText('Ainda não há dados para este gráfico.')).toBeOnTheScreen();
    expect(screen.queryByRole('adjustable')).toBeNull();
  });
});
