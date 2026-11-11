import { INDICADORES, SETORES } from '@/dados/catalogo';
import { montarSerieDeSetor } from '@/dados/painel';
import { gerarAlertaDeTendencia } from '@/dominio/alertas';
import { medidaDaDecisao, montarDecisao } from '@/dominio/decisoes';
import type { CamposDecisao } from '@/dominio/validacao';
import { somarDias } from '@/utils/datas';

const HOJE = '2026-11-11';

/** Alerta crítico de ecoponto (tem opções de impacto baixo, médio e alto). */
function alertaCritico() {
  const ecoponto = INDICADORES.ocupacao_ecoponto;
  const historico = Array.from({ length: 30 }, (_, i) => ({
    data: somarDias(HOJE, i - 29),
    valor: 86.5 - 3 * (29 - i),
  }));
  const serie = montarSerieDeSetor(ecoponto, SETORES[3], historico, ecoponto.limiaresPadrao);
  return gerarAlertaDeTendencia(serie, HOJE)!;
}

const base: CamposDecisao = {
  tipo: 'adotar_recomendacao',
  opcaoId: null,
  outraMedida: '',
  impactoOutra: null,
  justificativa: '  Equipe disponível amanhã cedo.  ',
  responsavel: '  Coordenação de Zeladoria ',
  validacaoHumana: false,
};

describe('montarDecisao', () => {
  const alerta = alertaCritico();
  const opcaoBaixa = alerta.opcoes.find((o) => o.impacto === 'baixo')!;
  const opcaoAlta = alerta.opcoes.find((o) => o.impacto === 'alto')!;

  test('guarda uma fotografia do alerta e os textos sem espaços nas pontas', () => {
    const decisao = montarDecisao(alerta, { ...base, opcaoId: opcaoBaixa.id });
    expect(decisao.chaveAlerta).toBe(alerta.chave);
    expect(decisao.alerta).toEqual({
      titulo: alerta.titulo,
      resumo: alerta.resumo,
      nivel: 'critico',
      tema: 'residuos',
      setorNome: 'Baixada do Córrego Verde',
      confianca: alerta.confianca.pontuacao,
      nivelConfianca: alerta.confianca.nivel,
    });
    expect(decisao.medida).toBe(opcaoBaixa.titulo);
    expect(decisao.impacto).toBe('baixo');
    expect(decisao.justificativa).toBe('Equipe disponível amanhã cedo.');
    expect(decisao.responsavel).toBe('Coordenação de Zeladoria');
  });

  test('a confirmação de validação humana só é registrada em medidas de alto impacto', () => {
    const baixa = montarDecisao(alerta, { ...base, opcaoId: opcaoBaixa.id, validacaoHumana: true });
    expect(baixa.validacaoHumanaConfirmada).toBe(false);

    const alta = montarDecisao(alerta, { ...base, opcaoId: opcaoAlta.id, validacaoHumana: true });
    expect(alta.impacto).toBe('alto');
    expect(alta.validacaoHumanaConfirmada).toBe(true);
  });

  test('outra medida usa o texto e o impacto informados pelo gestor', () => {
    const decisao = montarDecisao(alerta, {
      ...base,
      tipo: 'outra_medida',
      outraMedida: ' Instalar contêiner provisório ',
      impactoOutra: 'medio',
    });
    expect(decisao.medida).toBe('Instalar contêiner provisório');
    expect(decisao.impacto).toBe('medio');
  });

  test('monitorar e descartar não têm impacto e recebem um texto padrão', () => {
    const monitorar = montarDecisao(alerta, { ...base, tipo: 'monitorar' });
    expect(monitorar.impacto).toBeNull();
    expect(monitorar.medida).toMatch(/Monitorar/);

    const descartar = montarDecisao(alerta, { ...base, tipo: 'descartar' });
    expect(descartar.medida).toMatch(/descartado/);
  });

  test('sem tipo não há decisão', () => {
    expect(() => montarDecisao(alerta, { ...base, tipo: null })).toThrow();
    expect(medidaDaDecisao({ ...base, tipo: null }, alerta.opcoes)).toBe('');
  });
});
