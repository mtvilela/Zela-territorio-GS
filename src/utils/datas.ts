/**
 * Datas em formato ISO (`aaaa-mm-dd`) e textos em português.
 * A formatação é feita "na mão" para dar o mesmo resultado em Android, iOS, web e nos testes.
 */

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const MS_POR_DIA = 24 * 60 * 60 * 1000;

function doisDigitos(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function partes(iso: string): { ano: number; mes: number; dia: number } {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  return { ano, mes, dia };
}

/** Data de hoje no fuso do aparelho (não em UTC, que "vira o dia" às 21h no Brasil). */
export function hojeISO(agora: Date = new Date()): string {
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

/** Número de dias desde 1970-01-01 — identifica um dia do calendário sem depender de fuso. */
export function numeroDoDia(iso: string): number {
  const { ano, mes, dia } = partes(iso);
  return Math.round(Date.UTC(ano, mes - 1, dia) / MS_POR_DIA);
}

export function somarDias(iso: string, dias: number): string {
  const { ano, mes, dia } = partes(iso);
  const data = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return `${data.getUTCFullYear()}-${doisDigitos(data.getUTCMonth() + 1)}-${doisDigitos(data.getUTCDate())}`;
}

/** Quantos dias vão de `inicio` até `fim` (negativo se `fim` for anterior). */
export function diferencaDias(inicio: string, fim: string): number {
  return numeroDoDia(fim) - numeroDoDia(inicio);
}

/** 0 = domingo … 6 = sábado. */
export function diaDaSemana(iso: string): number {
  const { ano, mes, dia } = partes(iso);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

/** "13/11" */
export function formatarDataCurta(iso: string): string {
  const { mes, dia } = partes(iso);
  return `${doisDigitos(dia)}/${doisDigitos(mes)}`;
}

/** "13 de novembro" */
export function formatarDataLonga(iso: string): string {
  const { mes, dia } = partes(iso);
  return `${dia} de ${MESES[mes - 1]}`;
}

/** "sexta, 13/11" */
export function formatarDiaEData(iso: string): string {
  return `${DIAS_SEMANA[diaDaSemana(iso)]}, ${formatarDataCurta(iso)}`;
}

/** "13/11/2026" */
export function formatarDataCompleta(iso: string): string {
  const { ano, mes, dia } = partes(iso);
  return `${doisDigitos(dia)}/${doisDigitos(mes)}/${ano}`;
}

/** "13/11/2026 às 14:32" a partir de uma data e hora ISO completa. */
export function formatarDataHora(isoCompleto: string): string {
  const data = new Date(isoCompleto);
  if (Number.isNaN(data.getTime())) return '';
  const dia = `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()}`;
  return `${dia} às ${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
}

/** "14:32" a partir de uma data e hora ISO completa. */
export function formatarHora(isoCompleto: string): string {
  const data = new Date(isoCompleto);
  if (Number.isNaN(data.getTime())) return '';
  return `${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
}

/** "hoje", "amanhã", "em 3 dias" — usado nos prazos dos alertas. */
export function descreverPrazo(dias: number): string {
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  return `em ${dias} dias`;
}

/** "há 3 dias", "ontem", "hoje" — usado na idade das solicitações. */
export function descreverIdade(dias: number): string {
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}
