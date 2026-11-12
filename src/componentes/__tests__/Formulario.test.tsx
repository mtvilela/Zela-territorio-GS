/**
 * Testes de componente (React Native Testing Library): conferem o que o usuário vê e o que o
 * leitor de tela ouve nos componentes de formulário e nos botões.
 */
import { render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';

import { Botao } from '@/componentes/Botao';
import { CampoTexto, GrupoRadio, Interruptor, SeletorOpcoes } from '@/componentes/Formulario';
import { SeloImpacto, SeloSituacao } from '@/componentes/Selos';

describe('CampoTexto', () => {
  test('mostra o rótulo, a ajuda e o contador de caracteres', async () => {
    await render(
      <CampoTexto
        rotulo="Título"
        valor="abc"
        aoMudar={() => {}}
        ajuda="De 5 a 80 caracteres."
        maximo={80}
        obrigatorio
      />,
    );
    expect(screen.getByText('De 5 a 80 caracteres.')).toBeOnTheScreen();
    expect(screen.getByText('3/80')).toBeOnTheScreen();
    // O leitor de tela ouve o rótulo e que o campo é obrigatório.
    expect(screen.getByLabelText('Título, obrigatório')).toBeOnTheScreen();
  });

  test('com erro, a mensagem substitui a ajuda e entra no rótulo lido pelo leitor de tela', async () => {
    await render(
      <CampoTexto
        rotulo="Título"
        valor="ab"
        aoMudar={() => {}}
        ajuda="De 5 a 80 caracteres."
        erro="Use pelo menos 5 caracteres (faltam 3)."
        obrigatorio
      />,
    );
    expect(screen.getByText('Use pelo menos 5 caracteres (faltam 3).')).toBeOnTheScreen();
    expect(screen.queryByText('De 5 a 80 caracteres.')).toBeNull();
    expect(
      screen.getByLabelText('Título, obrigatório. Erro: Use pelo menos 5 caracteres (faltam 3).'),
    ).toBeOnTheScreen();
  });

  test('digitar atualiza o valor e o contador', async () => {
    function Exemplo() {
      const [valor, setValor] = useState('');
      return <CampoTexto rotulo="Descrição" valor={valor} aoMudar={setValor} maximo={500} />;
    }
    const usuario = userEvent.setup();
    await render(<Exemplo />);

    await usuario.type(screen.getByLabelText('Descrição'), 'Poste apagado');
    expect(screen.getByDisplayValue('Poste apagado')).toBeOnTheScreen();
    expect(screen.getByText('13/500')).toBeOnTheScreen();
  });
});

describe('SeletorOpcoes', () => {
  const opcoes = [
    { valor: 'baixa', rotulo: 'Baixa' },
    { valor: 'media', rotulo: 'Média' },
    { valor: 'alta', rotulo: 'Alta' },
  ];

  test('informa qual opção está marcada e avisa quando outra é escolhida', async () => {
    const aoMudar = jest.fn();
    const usuario = userEvent.setup();
    await render(<SeletorOpcoes rotulo="Prioridade" opcoes={opcoes} valor="media" aoMudar={aoMudar} />);

    expect(screen.getByRole('radio', { name: 'Média', checked: true })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Alta', checked: false })).toBeOnTheScreen();

    await usuario.press(screen.getByRole('radio', { name: 'Alta' }));
    expect(aoMudar).toHaveBeenCalledWith('alta');
  });

  test('mostra o erro de campo obrigatório', async () => {
    await render(
      <SeletorOpcoes
        rotulo="Prioridade"
        opcoes={opcoes}
        valor={null}
        aoMudar={() => {}}
        erro="Escolha uma prioridade."
        obrigatorio
      />,
    );
    expect(screen.getByText('Escolha uma prioridade.')).toBeOnTheScreen();
    expect(screen.getAllByRole('radio', { checked: false })).toHaveLength(3);
  });
});

describe('GrupoRadio', () => {
  test('lê título, complemento e descrição de cada opção e marca a escolhida', async () => {
    function Exemplo() {
      const [valor, setValor] = useState<string | null>(null);
      return (
        <GrupoRadio
          rotulo="Qual medida será adotada?"
          valor={valor}
          aoMudar={setValor}
          opcoes={[
            { valor: 'a', titulo: 'Conferir em campo', complementoAcessivel: 'Impacto baixo' },
            {
              valor: 'b',
              titulo: 'Avaliar rodízio de abastecimento',
              complementoAcessivel: 'Impacto alto',
              acessorio: <SeloImpacto impacto="alto" />,
            },
          ]}
        />
      );
    }
    const usuario = userEvent.setup();
    await render(<Exemplo />);

    const altoImpacto = screen.getByRole('radio', { name: 'Avaliar rodízio de abastecimento. Impacto alto' });
    expect(altoImpacto).not.toBeChecked();
    // O selo de impacto aparece escrito, não só em cor.
    expect(screen.getByText('Impacto alto')).toBeOnTheScreen();

    await usuario.press(altoImpacto);
    expect(
      screen.getByRole('radio', { name: 'Avaliar rodízio de abastecimento. Impacto alto', checked: true }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Conferir em campo. Impacto baixo', checked: false })).toBeOnTheScreen();
  });
});

describe('Interruptor', () => {
  test('alterna ao ser pressionado e informa o estado', async () => {
    function Exemplo() {
      const [valor, setValor] = useState(false);
      return <Interruptor rotulo="Confirmo a validação humana" valor={valor} aoMudar={setValor} />;
    }
    const usuario = userEvent.setup();
    await render(<Exemplo />);

    const chave = screen.getByRole('switch', { name: 'Confirmo a validação humana' });
    expect(chave).not.toBeChecked();
    await usuario.press(chave);
    expect(screen.getByRole('switch', { name: 'Confirmo a validação humana' })).toBeChecked();
  });
});

describe('Botao', () => {
  test('chama a ação ao ser pressionado', async () => {
    const aoPressionar = jest.fn();
    const usuario = userEvent.setup();
    await render(<Botao titulo="Salvar decisão" aoPressionar={aoPressionar} />);
    await usuario.press(screen.getByRole('button', { name: 'Salvar decisão' }));
    expect(aoPressionar).toHaveBeenCalledTimes(1);
  });

  test('desabilitado ou carregando, não chama a ação e informa o estado', async () => {
    const aoPressionar = jest.fn();
    const usuario = userEvent.setup();
    await render(
      <>
        <Botao titulo="Buscar" aoPressionar={aoPressionar} carregando />
        <Botao titulo="Apagar" aoPressionar={aoPressionar} desabilitado />
      </>,
    );
    const buscando = screen.getByRole('button', { name: 'Buscar' });
    const apagar = screen.getByRole('button', { name: 'Apagar' });
    expect(buscando).toBeBusy();
    expect(buscando).toBeDisabled();
    expect(apagar).toBeDisabled();

    await usuario.press(buscando);
    await usuario.press(apagar);
    expect(aoPressionar).not.toHaveBeenCalled();
  });
});

test('o selo de situação sempre traz o nome escrito, além do ícone e da cor', async () => {
  await render(
    <>
      <SeloSituacao situacao="normal" />
      <SeloSituacao situacao="atencao" />
      <SeloSituacao situacao="alerta" />
      <SeloSituacao situacao="critico" texto="Crítico em 2 dias" />
    </>,
  );
  for (const texto of ['Normal', 'Atenção', 'Alerta', 'Crítico em 2 dias']) {
    expect(screen.getByText(texto)).toBeOnTheScreen();
  }
});
