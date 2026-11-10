/**
 * Regras de privacidade do painel ("privacidade desde a concepção").
 *
 * 1. O painel só trabalha com dados AGREGADOS por setor — nunca por pessoa ou domicílio.
 * 2. Indicadores derivados de medição domiciliar não são exibidos em setores pequenos,
 *    onde um número agregado ainda poderia revelar hábitos de famílias identificáveis.
 * 3. Textos livres dos formulários são verificados para barrar CPF, telefone e e-mail.
 * 4. A localização enviada à API de clima é arredondada (~1 km): basta para a previsão
 *    e não identifica um endereço.
 */
import type { DefinicaoIndicador, Setor } from './tipos';

/** Abaixo deste número de domicílios, indicadores sensíveis ficam ocultos. */
export const MINIMO_DOMICILIOS = 50;

export type TipoDadoPessoal = 'cpf' | 'telefone' | 'email';

const ROTULO_DADO: Record<TipoDadoPessoal, string> = {
  cpf: 'CPF',
  telefone: 'telefone',
  email: 'e-mail',
};

/** Códigos de área (DDD) existentes no Brasil — reduz falsos positivos em números comuns. */
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
  49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/** Valida os dois dígitos verificadores de um CPF (11 dígitos, sem pontuação). */
export function cpfValido(digitos: string): boolean {
  if (!/^\d{11}$/.test(digitos)) return false;
  if (/^(\d)\1{10}$/.test(digitos)) return false; // 000.000.000-00, 111.111.111-11…

  const calcularDigito = (quantidade: number): number => {
    let soma = 0;
    for (let i = 0; i < quantidade; i++) {
      soma += Number(digitos[i]) * (quantidade + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcularDigito(9) === Number(digitos[9]) && calcularDigito(10) === Number(digitos[10]);
}

function pareceTelefone(digitos: string): boolean {
  // Com código do país: +55 11 98765-4321
  const semPais = digitos.length >= 12 && digitos.startsWith('55') ? digitos.slice(2) : digitos;
  if (semPais.length !== 10 && semPais.length !== 11) return false;
  if (!DDDS.has(Number(semPais.slice(0, 2)))) return false;
  const primeiro = semPais[2];
  // Celular: 9 dígitos começando com 9. Fixo: 8 dígitos começando com 2 a 5.
  return semPais.length === 11 ? primeiro === '9' : primeiro >= '2' && primeiro <= '5';
}

/**
 * Procura dados pessoais em um texto livre. Devolve os tipos encontrados (sem repetição).
 * É uma verificação por padrões: reduz o risco, mas não substitui o cuidado de quem escreve.
 */
export function detectarDadosPessoais(texto: string): TipoDadoPessoal[] {
  const encontrados = new Set<TipoDadoPessoal>();

  if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+/.test(texto)) {
    encontrados.add('email');
  }

  // CPF com pontuação: 123.456.789-09
  if (/(^|\D)\d{3}\.\d{3}\.\d{3}-\d{2}(\D|$)/.test(texto)) {
    encontrados.add('cpf');
  }

  // Telefone com separadores: (11) 98765-4321, 11 3265-4321, 98765-4321
  if (/(^|\D)\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]\d{4}(\D|$)/.test(texto) || /(^|\D)9\d{4}-\d{4}(\D|$)/.test(texto)) {
    const candidatos = texto.match(/\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]\d{4}|9\d{4}-\d{4}/g) ?? [];
    for (const candidato of candidatos) {
      const digitos = candidato.replace(/\D/g, '');
      // Sem DDD (8 ou 9 dígitos) só aceitamos o formato de celular, já filtrado pela expressão.
      if (digitos.length <= 9 || pareceTelefone(digitos)) encontrados.add('telefone');
    }
  }

  // Sequências só de dígitos: 11 dígitos podem ser CPF ou celular; 10, telefone fixo.
  for (const sequencia of texto.match(/\d+/g) ?? []) {
    if (sequencia.length === 11 && cpfValido(sequencia)) {
      encontrados.add('cpf');
    } else if (pareceTelefone(sequencia)) {
      encontrados.add('telefone');
    }
  }

  return [...encontrados];
}

/** Mensagem de erro para o formulário, ou `null` se o texto não tiver dados pessoais. */
export function mensagemDadosPessoais(texto: string): string | null {
  const tipos = detectarDadosPessoais(texto);
  if (tipos.length === 0) return null;
  const lista = tipos.map((t) => ROTULO_DADO[t]).join(' e ');
  return `O texto parece conter ${lista}. Remova dados pessoais: o painel trabalha só com informações agregadas.`;
}

/** Um indicador sensível só aparece em setores com domicílios suficientes para diluir cada família. */
export function podeExibir(definicao: DefinicaoIndicador, setor: Setor | null): boolean {
  if (!definicao.sensivel || setor === null) return true;
  return setor.domicilios >= MINIMO_DOMICILIOS;
}

/** Arredonda latitude/longitude antes de enviá-las à API (2 casas ≈ 1,1 km). */
export function arredondarCoordenada(valor: number, casas = 2): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}
