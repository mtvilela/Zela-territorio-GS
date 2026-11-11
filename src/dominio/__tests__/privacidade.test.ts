import { INDICADORES, SETORES } from '@/dados/catalogo';
import {
  arredondarCoordenada,
  cpfValido,
  detectarDadosPessoais,
  mensagemDadosPessoais,
  MINIMO_DOMICILIOS,
  podeExibir,
} from '@/dominio/privacidade';

describe('cpfValido', () => {
  test('aceita um CPF com dígitos verificadores corretos', () => {
    expect(cpfValido('52998224725')).toBe(true);
  });

  test('recusa dígitos verificadores errados, repetições e tamanhos diferentes', () => {
    expect(cpfValido('52998224724')).toBe(false);
    expect(cpfValido('11111111111')).toBe(false);
    expect(cpfValido('1234567890')).toBe(false);
    expect(cpfValido('529.982.247-25')).toBe(false); // a função espera só dígitos
  });
});

describe('detectarDadosPessoais', () => {
  test('encontra e-mail', () => {
    expect(detectarDadosPessoais('Avisar maria.silva@exemplo.com.br sobre o reparo')).toEqual(['email']);
  });

  test('encontra CPF com e sem pontuação', () => {
    expect(detectarDadosPessoais('Morador de CPF 529.982.247-25 reclamou')).toContain('cpf');
    expect(detectarDadosPessoais('cpf 52998224725')).toContain('cpf');
  });

  test('encontra telefones nos formatos mais comuns', () => {
    expect(detectarDadosPessoais('Ligar para (11) 98765-4321')).toEqual(['telefone']);
    expect(detectarDadosPessoais('Contato: 11 3265-4321')).toEqual(['telefone']);
    expect(detectarDadosPessoais('zap 98765-4321')).toEqual(['telefone']);
    expect(detectarDadosPessoais('fone 11987654321')).toEqual(['telefone']);
    expect(detectarDadosPessoais('+55 11 98765-4321')).toEqual(['telefone']);
  });

  test('encontra mais de um tipo no mesmo texto', () => {
    const tipos = detectarDadosPessoais('Sr. João, CPF 529.982.247-25, tel (21) 99876-5432, joao@exemplo.com');
    expect(tipos.sort()).toEqual(['cpf', 'email', 'telefone']);
  });

  test('não acusa números comuns de um relato de zeladoria', () => {
    expect(detectarDadosPessoais('Poste apagado na altura do número 3500, há 12 dias')).toEqual([]);
    expect(detectarDadosPessoais('Obra prevista no plano 2024-2025')).toEqual([]);
    expect(detectarDadosPessoais('Protocolo 123456, vistoria às 14h30')).toEqual([]);
    expect(detectarDadosPessoais('Cerca de 1500 moradores afetados em 3 quadras')).toEqual([]);
    expect(detectarDadosPessoais('')).toEqual([]);
  });
});

test('mensagemDadosPessoais explica o que foi encontrado', () => {
  expect(mensagemDadosPessoais('Buraco grande na esquina')).toBeNull();
  expect(mensagemDadosPessoais('falar com ana@exemplo.com')).toMatch(/e-mail/);
  expect(mensagemDadosPessoais('CPF 529.982.247-25 e tel (11) 98765-4321')).toMatch(/CPF e telefone/);
});

describe('agregação mínima', () => {
  const pequeno = SETORES.find((s) => s.id === 'palmeiras')!;
  const grande = SETORES.find((s) => s.id === 'centro')!;

  test('o catálogo tem um setor abaixo do mínimo para demonstrar a regra', () => {
    expect(pequeno.domicilios).toBeLessThan(MINIMO_DOMICILIOS);
    expect(grande.domicilios).toBeGreaterThanOrEqual(MINIMO_DOMICILIOS);
  });

  test('indicador sensível fica oculto em setor pequeno', () => {
    expect(podeExibir(INDICADORES.consumo_agua, pequeno)).toBe(false);
    expect(podeExibir(INDICADORES.consumo_agua, grande)).toBe(true);
  });

  test('indicadores não sensíveis e do território inteiro continuam visíveis', () => {
    expect(podeExibir(INDICADORES.ocupacao_ecoponto, pequeno)).toBe(true);
    expect(podeExibir(INDICADORES.chuva_diaria, null)).toBe(true);
  });
});

test('coordenadas são arredondadas antes de sair do aparelho', () => {
  expect(arredondarCoordenada(-23.550519)).toBe(-23.55);
  expect(arredondarCoordenada(-46.633309)).toBe(-46.63);
  expect(arredondarCoordenada(-3.76559, 1)).toBe(-3.8);
});
