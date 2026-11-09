/**
 * Números no padrão brasileiro (vírgula decimal, ponto de milhar), sem depender de `Intl`.
 */

export function arredondar(valor: number, casas = 0): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

/** 1234.5 → "1.234,5" */
export function formatarNumero(valor: number, casas = 0): string {
  if (!Number.isFinite(valor)) return '—';
  const fixo = Math.abs(valor).toFixed(casas);
  const [inteiro, decimal] = fixo.split('.');
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  // Evita "-0" quando o valor arredonda para zero.
  const ehZero = Number(fixo) === 0;
  const sinal = valor < 0 && !ehZero ? '−' : '';
  return decimal ? `${sinal}${comMilhar},${decimal}` : `${sinal}${comMilhar}`;
}

/** "43%", "12,8 mm", "36,5 °C" — o símbolo de porcentagem fica colado ao número. */
export function formatarValor(valor: number | null, unidade: string, casas = 0): string {
  if (valor === null || !Number.isFinite(valor)) return '—';
  const numero = formatarNumero(valor, casas);
  if (!unidade) return numero;
  // Espaço "duro" (não quebra a linha entre o número e a unidade).
  return unidade === '%' ? `${numero}%` : `${numero} ${unidade}`;
}

/** "+1,3" / "−0,8" — variação com sinal explícito. */
export function formatarVariacao(valor: number, casas = 1): string {
  const numero = formatarNumero(Math.abs(valor), casas);
  if (Number(Math.abs(valor).toFixed(casas)) === 0) return numero;
  return valor > 0 ? `+${numero}` : `−${numero}`;
}

/** Converte texto digitado ("35", "35,5", " 35.5 ") em número. Retorna `null` se não for número. */
export function lerNumero(texto: string): number | null {
  const limpo = texto.trim().replace(',', '.');
  if (limpo === '' || !/^-?\d+(\.\d+)?$/.test(limpo)) return null;
  const valor = Number(limpo);
  return Number.isFinite(valor) ? valor : null;
}

/** Limita `valor` ao intervalo [minimo, maximo]. */
export function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

/** "1 alerta" / "3 alertas" */
export function plural(quantidade: number, singular: string, pluralTexto: string): string {
  return `${formatarNumero(quantidade)} ${quantidade === 1 ? singular : pluralTexto}`;
}
