/**
 * Opções de decisão sugeridas para cada indicador.
 *
 * O painel NÃO executa nenhuma destas medidas: ele apenas as apresenta como opções para a
 * análise do gestor. Cada opção traz o impacto estimado sobre a população:
 *  - baixo: verificação ou comunicação, fácil de desfazer;
 *  - médio: mobiliza equipes ou recursos;
 *  - alto: afeta diretamente a rotina das pessoas (abrigos, interdições, restrições).
 * Medidas de ALTO impacto exigem, no formulário de decisão, justificativa mais longa e a
 * confirmação de que foram validadas por pessoas — nunca são automatizadas.
 */
import { ORDEM_SITUACAO } from './limiares';
import type { ImpactoMedida, IndicadorId, NivelAlerta, OpcaoDecisao } from './tipos';

interface OpcaoCatalogada {
  titulo: string;
  impacto: ImpactoMedida;
  /** A opção passa a ser sugerida a partir deste nível de alerta. */
  aPartirDe: NivelAlerta;
}

const CATALOGO: Record<IndicadorId, OpcaoCatalogada[]> = {
  chuva_diaria: [
    {
      titulo: 'Acompanhar os boletins da Defesa Civil e do INMET ao longo do dia',
      impacto: 'baixo',
      aPartirDe: 'atencao',
    },
    { titulo: 'Vistoriar os pontos que costumam alagar', impacto: 'baixo', aPartirDe: 'atencao' },
    {
      titulo: 'Antecipar a limpeza de bocas de lobo e deixar equipes de plantão',
      impacto: 'medio',
      aPartirDe: 'alerta',
    },
    { titulo: 'Avisar os moradores das áreas de risco pelos canais oficiais', impacto: 'medio', aPartirDe: 'alerta' },
    {
      titulo: 'Avaliar com a Defesa Civil a abertura de abrigos e a remoção preventiva de moradores',
      impacto: 'alto',
      aPartirDe: 'critico',
    },
    { titulo: 'Avaliar a interdição de vias e passagens sujeitas a inundação', impacto: 'alto', aPartirDe: 'critico' },
  ],
  sensacao_termica: [
    { titulo: 'Divulgar orientações de hidratação e proteção contra o calor', impacto: 'baixo', aPartirDe: 'atencao' },
    {
      titulo: 'Conferir o abastecimento de água em escolas e unidades de saúde',
      impacto: 'baixo',
      aPartirDe: 'atencao',
    },
    {
      titulo: 'Ampliar pontos de hidratação e o horário de espaços climatizados',
      impacto: 'medio',
      aPartirDe: 'alerta',
    },
    { titulo: 'Reforçar as equipes de saúde para atender idosos e crianças', impacto: 'medio', aPartirDe: 'alerta' },
    {
      titulo: 'Avaliar a suspensão de atividades ao ar livre em escolas e eventos',
      impacto: 'alto',
      aPartirDe: 'critico',
    },
  ],
  nivel_reservatorio: [
    { titulo: 'Conferir a leitura do nível em campo e procurar vazamentos', impacto: 'baixo', aPartirDe: 'atencao' },
    { titulo: 'Lançar campanha de uso consciente da água no setor', impacto: 'medio', aPartirDe: 'atencao' },
    { titulo: 'Pedir à concessionária um plano de reforço do abastecimento', impacto: 'medio', aPartirDe: 'alerta' },
    {
      titulo: 'Avaliar com a concessionária manobras de rede ou redução de pressão à noite',
      impacto: 'alto',
      aPartirDe: 'alerta',
    },
    { titulo: 'Avaliar rodízio de abastecimento e apoio com caminhões-pipa', impacto: 'alto', aPartirDe: 'critico' },
  ],
  consumo_agua: [
    {
      titulo: 'Investigar a causa do aumento (calor, vazamentos, novas ligações)',
      impacto: 'baixo',
      aPartirDe: 'atencao',
    },
    { titulo: 'Lançar campanha de uso consciente da água no setor', impacto: 'medio', aPartirDe: 'atencao' },
    { titulo: 'Pedir à concessionária uma varredura de vazamentos', impacto: 'medio', aPartirDe: 'alerta' },
    { titulo: 'Avaliar com a concessionária medidas de restrição de consumo', impacto: 'alto', aPartirDe: 'critico' },
  ],
  carga_rede: [
    { titulo: 'Pedir à distribuidora a confirmação das medições', impacto: 'baixo', aPartirDe: 'atencao' },
    {
      titulo: 'Orientar o deslocamento do consumo para fora do horário de pico',
      impacto: 'medio',
      aPartirDe: 'atencao',
    },
    {
      titulo: 'Acordar com a distribuidora um plano de contingência para o setor',
      impacto: 'medio',
      aPartirDe: 'alerta',
    },
    {
      titulo: 'Avaliar geradores de apoio para unidades de saúde e bombeamento de água',
      impacto: 'alto',
      aPartirDe: 'alerta',
    },
    {
      titulo: 'Avaliar com a distribuidora o remanejamento de carga entre alimentadores',
      impacto: 'alto',
      aPartirDe: 'critico',
    },
  ],
  ocupacao_ecoponto: [
    { titulo: 'Conferir a ocupação do ecoponto em campo', impacto: 'baixo', aPartirDe: 'atencao' },
    { titulo: 'Antecipar a coleta do ecoponto', impacto: 'medio', aPartirDe: 'atencao' },
    { titulo: 'Disponibilizar caçamba extra e sinalizar pontos alternativos', impacto: 'medio', aPartirDe: 'alerta' },
    {
      titulo: 'Avaliar o fechamento temporário do ecoponto, redirecionando o descarte',
      impacto: 'alto',
      aPartirDe: 'critico',
    },
  ],
  demandas_abertas: [
    { titulo: 'Revisar a priorização da fila do setor', impacto: 'baixo', aPartirDe: 'atencao' },
    { titulo: 'Remanejar uma equipe de outro setor por alguns dias', impacto: 'medio', aPartirDe: 'atencao' },
    { titulo: 'Organizar um mutirão de zeladoria no setor', impacto: 'medio', aPartirDe: 'alerta' },
    { titulo: 'Avaliar contratação emergencial ou realocação de orçamento', impacto: 'alto', aPartirDe: 'critico' },
  ],
};

export const ROTULO_IMPACTO: Record<ImpactoMedida, string> = {
  baixo: 'Impacto baixo',
  medio: 'Impacto médio',
  alto: 'Impacto alto',
};

/** Opções sugeridas para um indicador no nível de alerta informado (inclui as dos níveis abaixo). */
export function opcoesPara(indicadorId: IndicadorId, nivel: NivelAlerta): OpcaoDecisao[] {
  return CATALOGO[indicadorId]
    .map((opcao, indice) => ({ opcao, indice }))
    .filter(({ opcao }) => ORDEM_SITUACAO[opcao.aPartirDe] <= ORDEM_SITUACAO[nivel])
    .map(({ opcao, indice }) => ({
      // O identificador usa a posição no catálogo, então não muda quando o nível muda.
      id: `${indicadorId}-${indice}`,
      titulo: opcao.titulo,
      impacto: opcao.impacto,
    }));
}
