import { INDICADORES } from '@/dados/catalogo';
import type { OpcaoDecisao } from '@/dominio/tipos';
import {
  impactoDaDecisao,
  temErros,
  normalizarBusca,
  validarBusca,
  validarCamposLimiares,
  validarDecisao,
  validarDemanda,
  type CamposDecisao,
  type CamposDemanda,
} from '@/dominio/validacao';

const SETORES_VALIDOS = ['centro', 'baixada'];

const demandaValida: CamposDemanda = {
  titulo: 'Poste apagado na praça',
  categoria: 'iluminacao',
  prioridade: 'media',
  setorId: 'centro',
  descricao: 'Poste sem luz há uma semana, rua escura à noite.',
};

describe('validarDemanda', () => {
  test('aceita uma solicitação completa', () => {
    expect(temErros(validarDemanda(demandaValida, SETORES_VALIDOS))).toBe(false);
  });

  test('aponta cada campo com problema', () => {
    const erros = validarDemanda(
      { titulo: 'Oi', categoria: null, prioridade: null, setorId: 'inexistente', descricao: 'curta' },
      SETORES_VALIDOS,
    );
    expect(erros.titulo).toMatch(/pelo menos 5/);
    expect(erros.categoria).toBeDefined();
    expect(erros.prioridade).toBeDefined();
    expect(erros.setorId).toBeDefined();
    expect(erros.descricao).toMatch(/pelo menos 10/);
  });

  test('espaços nas pontas não contam para o tamanho mínimo', () => {
    const erros = validarDemanda({ ...demandaValida, titulo: '   abc   ' }, SETORES_VALIDOS);
    expect(erros.titulo).toMatch(/faltam 2/);
  });

  test('recusa textos longos demais', () => {
    const erros = validarDemanda({ ...demandaValida, titulo: 'a'.repeat(81) }, SETORES_VALIDOS);
    expect(erros.titulo).toMatch(/no máximo 80/);
  });

  test('barra dados pessoais nos textos livres', () => {
    const erros = validarDemanda(
      { ...demandaValida, descricao: 'Falar com o morador pelo telefone (11) 98765-4321.' },
      SETORES_VALIDOS,
    );
    expect(erros.descricao).toMatch(/telefone/);
  });
});

const OPCOES: OpcaoDecisao[] = [
  { id: 'op-baixo', titulo: 'Conferir em campo', impacto: 'baixo' },
  { id: 'op-alto', titulo: 'Avaliar rodízio de abastecimento', impacto: 'alto' },
];

const decisaoValida: CamposDecisao = {
  tipo: 'adotar_recomendacao',
  opcaoId: 'op-baixo',
  outraMedida: '',
  impactoOutra: null,
  justificativa: 'Equipe disponível amanhã cedo.',
  responsavel: 'Coordenação de Zeladoria',
  validacaoHumana: false,
};

describe('validarDecisao', () => {
  test('aceita uma decisão de baixo impacto bem preenchida', () => {
    expect(temErros(validarDecisao(decisaoValida, OPCOES))).toBe(false);
  });

  test('exige tipo, justificativa e responsável', () => {
    const erros = validarDecisao({ ...decisaoValida, tipo: null, justificativa: '', responsavel: '' }, OPCOES);
    expect(erros.tipo).toBeDefined();
    expect(erros.justificativa).toMatch(/Informe/);
    expect(erros.responsavel).toMatch(/Informe/);
  });

  test('ao adotar uma recomendação, é preciso escolher qual', () => {
    const erros = validarDecisao({ ...decisaoValida, opcaoId: null }, OPCOES);
    expect(erros.opcaoId).toBeDefined();
  });

  test('medida de alto impacto exige justificativa maior e confirmação humana', () => {
    const erros = validarDecisao({ ...decisaoValida, opcaoId: 'op-alto' }, OPCOES);
    expect(erros.justificativa).toMatch(/pelo menos 40/);
    expect(erros.validacaoHumana).toBeDefined();

    const completa = validarDecisao(
      {
        ...decisaoValida,
        opcaoId: 'op-alto',
        justificativa: 'Validado com a concessionária e a Defesa Civil em reunião desta manhã.',
        validacaoHumana: true,
      },
      OPCOES,
    );
    expect(temErros(completa)).toBe(false);
  });

  test('"outra medida" pede a descrição e o impacto informado pelo gestor', () => {
    const erros = validarDecisao({ ...decisaoValida, tipo: 'outra_medida', opcaoId: null }, OPCOES);
    expect(erros.outraMedida).toBeDefined();
    expect(erros.impactoOutra).toBeDefined();

    const altoImpacto = validarDecisao(
      {
        ...decisaoValida,
        tipo: 'outra_medida',
        opcaoId: null,
        outraMedida: 'Interditar a ponte do córrego',
        impactoOutra: 'alto',
      },
      OPCOES,
    );
    expect(altoImpacto.validacaoHumana).toBeDefined();
  });

  test('monitorar e descartar não exigem medida nem confirmação', () => {
    expect(temErros(validarDecisao({ ...decisaoValida, tipo: 'monitorar', opcaoId: null }, OPCOES))).toBe(false);
    expect(temErros(validarDecisao({ ...decisaoValida, tipo: 'descartar', opcaoId: null }, OPCOES))).toBe(false);
  });

  test('o responsável é um cargo, não um contato pessoal', () => {
    const erros = validarDecisao({ ...decisaoValida, responsavel: 'joao@prefeitura.gov.br' }, OPCOES);
    expect(erros.responsavel).toMatch(/e-mail/);
  });

  test('impactoDaDecisao reflete a medida escolhida', () => {
    expect(impactoDaDecisao(decisaoValida, OPCOES)).toBe('baixo');
    expect(impactoDaDecisao({ ...decisaoValida, opcaoId: 'op-alto' }, OPCOES)).toBe('alto');
    expect(impactoDaDecisao({ ...decisaoValida, tipo: 'monitorar' }, OPCOES)).toBeNull();
    expect(impactoDaDecisao({ ...decisaoValida, tipo: 'outra_medida', impactoOutra: 'medio' }, OPCOES)).toBe('medio');
  });
});

describe('validarCamposLimiares', () => {
  const ecoponto = INDICADORES.ocupacao_ecoponto; // maior é pior, faixa 0–100
  const reservatorio = INDICADORES.nivel_reservatorio; // menor é pior

  test('converte os textos em números, aceitando vírgula decimal', () => {
    const resultado = validarCamposLimiares({ atencao: '70', alerta: '85,5', critico: ' 95 ' }, ecoponto);
    expect(resultado.erros).toEqual({});
    expect(resultado.valores).toEqual({ atencao: 70, alerta: 85.5, critico: 95 });
  });

  test('aponta o campo que não é número', () => {
    const resultado = validarCamposLimiares({ atencao: 'setenta', alerta: '85', critico: '' }, ecoponto);
    expect(resultado.valores).toBeNull();
    expect(resultado.erros.atencao).toBeDefined();
    expect(resultado.erros.critico).toBeDefined();
    expect(resultado.erros.alerta).toBeUndefined();
  });

  test('confere a ordem de acordo com o sentido do indicador', () => {
    expect(validarCamposLimiares({ atencao: '85', alerta: '70', critico: '95' }, ecoponto).erros.geral).toMatch(
      /crescentes/,
    );
    expect(validarCamposLimiares({ atencao: '20', alerta: '35', critico: '50' }, reservatorio).erros.geral).toMatch(
      /decrescentes/,
    );
    expect(validarCamposLimiares({ atencao: '50', alerta: '35', critico: '20' }, reservatorio).valores).not.toBeNull();
  });

  test('confere a faixa permitida', () => {
    expect(validarCamposLimiares({ atencao: '70', alerta: '85', critico: '130' }, ecoponto).erros.geral).toMatch(
      /entre 0 e 100/,
    );
  });
});

describe('validarBusca', () => {
  test('aceita nomes de municípios, inclusive com acento, hífen e apóstrofo', () => {
    expect(validarBusca('São Paulo')).toBeNull();
    expect(validarBusca('Ji-Paraná')).toBeNull();
    expect(validarBusca("Santa Bárbara d'Oeste")).toBeNull();
  });

  test('aceita os sinais que os teclados colocam no lugar do apóstrofo', () => {
    // O iPhone troca o apóstrofo pelo curvo; no teclado brasileiro é comum sair o acento agudo solto.
    expect(validarBusca('Santa Bárbara d’Oeste')).toBeNull();
    expect(validarBusca('Santa Bárbara d´Oeste')).toBeNull();
    expect(normalizarBusca('  Santa Bárbara d’Oeste ')).toBe("Santa Bárbara d'Oeste");
    expect(normalizarBusca('Olho d´Água')).toBe("Olho d'Água");
    expect(normalizarBusca('Pau d`Arco')).toBe("Pau d'Arco");
    // Nomes sem apóstrofo passam intactos.
    expect(normalizarBusca(' São Paulo ')).toBe('São Paulo');
  });

  test('recusa termos curtos, longos ou com caracteres estranhos', () => {
    expect(validarBusca('  sp ')).toMatch(/pelo menos 3/);
    expect(validarBusca('a'.repeat(61))).toMatch(/no máximo 60/);
    expect(validarBusca('Campinas 123')).toMatch(/apenas letras/);
    expect(validarBusca('<script>')).toMatch(/apenas letras/);
  });
});
