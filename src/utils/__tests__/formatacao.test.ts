import {
  descreverIdade,
  descreverPrazo,
  diaDaSemana,
  diferencaDias,
  formatarDataCompleta,
  formatarDataCurta,
  formatarDataLonga,
  formatarDiaEData,
  hojeISO,
  numeroDoDia,
  somarDias,
} from '@/utils/datas';
import {
  arredondar,
  formatarNumero,
  formatarValor,
  formatarVariacao,
  lerNumero,
  limitar,
  plural,
} from '@/utils/numeros';

describe('datas', () => {
  test('hojeISO usa a data local do aparelho, não a de UTC', () => {
    // 23h30 no horário local: em UTC já seria o dia seguinte no Brasil.
    expect(hojeISO(new Date(2026, 10, 11, 23, 30))).toBe('2026-11-11');
    expect(hojeISO(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
  });

  test('somarDias atravessa meses, anos e anos bissextos', () => {
    expect(somarDias('2026-11-11', 7)).toBe('2026-11-18');
    expect(somarDias('2026-11-28', 5)).toBe('2026-12-03');
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(somarDias('2028-03-01', -1)).toBe('2028-02-29');
  });

  test('diferencaDias e numeroDoDia são coerentes', () => {
    expect(diferencaDias('2026-11-11', '2026-11-18')).toBe(7);
    expect(diferencaDias('2026-11-18', '2026-11-11')).toBe(-7);
    expect(diferencaDias('2026-10-15', '2026-11-11')).toBe(27);
    expect(numeroDoDia('1970-01-02')).toBe(1);
  });

  test('dia da semana', () => {
    expect(diaDaSemana('2026-11-11')).toBe(3); // quarta-feira
    expect(diaDaSemana('2026-11-15')).toBe(0); // domingo
  });

  test('formatos de exibição em português', () => {
    expect(formatarDataCurta('2026-11-03')).toBe('03/11');
    expect(formatarDataLonga('2026-11-03')).toBe('3 de novembro');
    expect(formatarDataLonga('2026-03-21')).toBe('21 de março');
    expect(formatarDiaEData('2026-11-13')).toBe('sexta, 13/11');
    expect(formatarDataCompleta('2026-11-13')).toBe('13/11/2026');
  });

  test('prazos e idades em linguagem natural', () => {
    expect(descreverPrazo(0)).toBe('hoje');
    expect(descreverPrazo(1)).toBe('amanhã');
    expect(descreverPrazo(5)).toBe('em 5 dias');
    expect(descreverIdade(0)).toBe('hoje');
    expect(descreverIdade(1)).toBe('ontem');
    expect(descreverIdade(9)).toBe('há 9 dias');
  });
});

describe('números', () => {
  test('formatarNumero usa vírgula decimal e ponto de milhar', () => {
    expect(formatarNumero(1234.5, 1)).toBe('1.234,5');
    expect(formatarNumero(18400)).toBe('18.400');
    expect(formatarNumero(0.126, 2)).toBe('0,13');
    expect(formatarNumero(-3.2, 1)).toBe('−3,2');
    expect(formatarNumero(-0.04, 1)).toBe('0,0'); // sem "-0"
    expect(formatarNumero(NaN)).toBe('—');
  });

  test('formatarValor cola o % e separa as outras unidades', () => {
    expect(formatarValor(43.25, '%', 1)).toBe('43,3%');
    expect(formatarValor(12.8, 'mm', 1)).toBe('12,8 mm');
    expect(formatarValor(36, '°C', 1)).toBe('36,0 °C');
    expect(formatarValor(7, '')).toBe('7');
    expect(formatarValor(null, '%')).toBe('—');
  });

  test('formatarVariacao sempre mostra o sinal', () => {
    expect(formatarVariacao(1.26)).toBe('+1,3');
    expect(formatarVariacao(-0.84)).toBe('−0,8');
    expect(formatarVariacao(0.02)).toBe('0,0');
  });

  test('lerNumero aceita vírgula ou ponto e recusa texto', () => {
    expect(lerNumero('35')).toBe(35);
    expect(lerNumero(' 35,5 ')).toBe(35.5);
    expect(lerNumero('35.5')).toBe(35.5);
    expect(lerNumero('-2')).toBe(-2);
    expect(lerNumero('')).toBeNull();
    expect(lerNumero('trinta')).toBeNull();
    expect(lerNumero('3,5,1')).toBeNull();
    expect(lerNumero('1e3')).toBeNull();
  });

  test('arredondar, limitar e plural', () => {
    expect(arredondar(2.346, 2)).toBe(2.35);
    expect(arredondar(2.5)).toBe(3);
    expect(limitar(120, 0, 100)).toBe(100);
    expect(limitar(-5, 0, 100)).toBe(0);
    expect(plural(1, 'alerta', 'alertas')).toBe('1 alerta');
    expect(plural(3, 'alerta', 'alertas')).toBe('3 alertas');
    expect(plural(0, 'alerta', 'alertas')).toBe('0 alertas');
  });
});
