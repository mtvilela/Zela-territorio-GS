/**
 * Testes da moldura das telas, no que depende do aparelho e por isso não aparece nos testes feitos
 * no navegador: a faixa da barra de status, o gesto de puxar para atualizar e o rodapé com o teclado.
 */
import { act, render, screen } from '@testing-library/react-native';
import { DeviceEventEmitter, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Tela } from '@/componentes/Tela';
import { Texto } from '@/componentes/Texto';
import { esp } from '@/tema/medidas';

/** Medidas de um celular com recorte no topo e barra de gestos embaixo. */
const APARELHO = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function noAparelho(tela: React.ReactElement) {
  return <SafeAreaProvider initialMetrics={APARELHO}>{tela}</SafeAreaProvider>;
}

const rolagem = () => screen.getByTestId('tela-rolagem');
const margemDoConteudo = () => StyleSheet.flatten(rolagem().props.contentContainerStyle).paddingTop;

describe('faixa da barra de status', () => {
  test('nas abas, fica fora da área de rolagem: o conteúdo não passa por baixo do relógio', async () => {
    await render(
      noAparelho(
        <Tela aba testID="tela">
          <Texto>Conteúdo</Texto>
        </Tela>,
      ),
    );
    expect(screen.getByTestId('tela')).toHaveStyle({ paddingTop: APARELHO.insets.top });
    expect(margemDoConteudo()).toBe(esp.lg);
    // Sem cabeçalho do navegador, o iOS não deve somar uma segunda margem por conta própria.
    expect(rolagem().props.contentInsetAdjustmentBehavior).toBe('never');
  });

  test('nas telas com cabeçalho, quem reserva o topo é o próprio cabeçalho', async () => {
    await render(
      noAparelho(
        <Tela testID="tela">
          <Texto>Conteúdo</Texto>
        </Tela>,
      ),
    );
    expect(screen.getByTestId('tela')).toHaveStyle({ paddingTop: 0 });
    expect(margemDoConteudo()).toBe(esp.lg);
    expect(rolagem().props.contentInsetAdjustmentBehavior).toBe('automatic');
  });
});

describe('puxar para atualizar', () => {
  test('o indicador só gira quando a pessoa puxou, não nas atualizações automáticas', async () => {
    const aoAtualizar = jest.fn();
    const tela = (atualizando: boolean) =>
      noAparelho(
        <Tela aba testID="tela" atualizacao={{ atualizando, aoAtualizar }}>
          <Texto>Conteúdo</Texto>
        </Tela>,
      );
    const controle = () => rolagem().props.refreshControl.props;

    // O app abriu e já está consultando o clima sozinho: nada de indicador (e de conteúdo pulando).
    const { rerender } = await render(tela(true));
    expect(controle().refreshing).toBe(false);
    await rerender(tela(false));

    // A pessoa puxa: a atualização é pedida e o indicador acompanha até ela terminar.
    await act(async () => controle().onRefresh());
    expect(aoAtualizar).toHaveBeenCalledTimes(1);
    await rerender(tela(true));
    expect(controle().refreshing).toBe(true);
    await rerender(tela(false));
    expect(controle().refreshing).toBe(false);

    // Uma nova atualização automática volta a não mostrar o indicador.
    await rerender(tela(true));
    expect(controle().refreshing).toBe(false);
  });

  test('telas sem atualização não têm o gesto', async () => {
    await render(
      noAparelho(
        <Tela testID="tela">
          <Texto>Conteúdo</Texto>
        </Tela>,
      ),
    );
    expect(rolagem().props.refreshControl).toBeUndefined();
  });
});

describe('rodapé fixo dos formulários', () => {
  // O iOS avisa com "will" e o Android com "did"; o teste emite os dois para valer em qualquer um.
  const teclado = (acao: 'Show' | 'Hide') =>
    act(async () => {
      DeviceEventEmitter.emit(`keyboardWill${acao}`, {});
      DeviceEventEmitter.emit(`keyboardDid${acao}`, {});
    });

  test('respeita a barra de gestos e encosta no teclado quando ele abre', async () => {
    await render(
      noAparelho(
        <Tela testID="tela" rodape={<Texto>Salvar</Texto>}>
          <Texto>Formulário</Texto>
        </Tela>,
      ),
    );
    const rodape = () => screen.getByTestId('tela-rodape');

    expect(rodape()).toHaveStyle({ paddingBottom: APARELHO.insets.bottom });
    await teclado('Show');
    expect(rodape()).toHaveStyle({ paddingBottom: esp.md });
    await teclado('Hide');
    expect(rodape()).toHaveStyle({ paddingBottom: APARELHO.insets.bottom });
  });

  test('telas sem rodapé não desenham a faixa', async () => {
    await render(
      noAparelho(
        <Tela testID="tela">
          <Texto>Conteúdo</Texto>
        </Tela>,
      ),
    );
    expect(screen.queryByTestId('tela-rodape')).toBeNull();
  });
});
