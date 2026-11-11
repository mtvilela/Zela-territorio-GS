/**
 * Selos e etiquetas: pequenas marcações com ícone + texto.
 * Regra de acessibilidade do app: a cor NUNCA é a única pista — toda situação tem um ícone de
 * formato próprio e um texto que a nomeia.
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ROTULO_ORIGEM } from '@/dados/catalogo';
import { ROTULO_CONFIANCA } from '@/dominio/confianca';
import { ROTULO_SITUACAO } from '@/dominio/limiares';
import { ROTULO_IMPACTO } from '@/dominio/recomendacoes';
import type { ImpactoMedida, NivelConfianca, OrigemDado, Situacao } from '@/dominio/tipos';
import { esp, raio } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';

import { Icone, ICONE_DA_SITUACAO, type NomeIcone } from './Icone';
import { Texto } from './Texto';

type Tom = 'neutro' | 'primario' | 'aviso' | 'sucesso';

interface PropsEtiqueta {
  texto: string;
  icone?: NomeIcone;
  tom?: Tom;
  style?: StyleProp<ViewStyle>;
}

/** Etiqueta genérica: ícone opcional + texto curto. */
export function Etiqueta({ texto, icone, tom = 'neutro', style }: PropsEtiqueta) {
  const { cores } = useTema();
  const aparencia = {
    neutro: { fundo: cores.superficieSuave, texto: cores.textoSecundario },
    primario: { fundo: cores.primariaSuave, texto: cores.primariaForte },
    aviso: { fundo: cores.situacao.alerta.fundo, texto: cores.situacao.alerta.icone },
    sucesso: { fundo: cores.sucessoFundo, texto: cores.sucesso },
  }[tom];

  return (
    <View style={[estilos.etiqueta, { backgroundColor: aparencia.fundo }, style]}>
      {icone ? <Icone nome={icone} tamanho={14} cor={aparencia.texto} /> : null}
      <Texto variante="micro" style={{ color: aparencia.texto }}>
        {texto}
      </Texto>
    </View>
  );
}

interface PropsSituacao {
  situacao: Situacao;
  /** Texto no lugar do nome padrão da situação (ex.: "Alerta em 3 dias"). */
  texto?: string;
  style?: StyleProp<ViewStyle>;
}

/** Situação de um indicador ou nível de um alerta: formato do ícone + cor + nome. */
export function SeloSituacao({ situacao, texto, style }: PropsSituacao) {
  const { cores } = useTema();
  const tons = cores.situacao[situacao];
  return (
    <View style={[estilos.etiqueta, { backgroundColor: tons.fundo }, style]}>
      <Icone nome={ICONE_DA_SITUACAO[situacao]} tamanho={15} cor={tons.icone} />
      <Texto variante="micro" style={{ color: cores.texto }}>
        {texto ?? ROTULO_SITUACAO[situacao]}
      </Texto>
    </View>
  );
}

const ICONE_DA_ORIGEM: Record<OrigemDado, NomeIcone> = {
  publica: 'earth',
  sintetica: 'flask-outline',
  mista: 'flask-outline',
};

/** De onde vem o dado: público (API) ou sintético (gerado para demonstração). */
export function SeloOrigem({ origem, style }: { origem: OrigemDado; style?: StyleProp<ViewStyle> }) {
  return (
    <Etiqueta
      texto={ROTULO_ORIGEM[origem]}
      icone={ICONE_DA_ORIGEM[origem]}
      tom={origem === 'publica' ? 'primario' : 'neutro'}
      style={style}
    />
  );
}

const ICONE_DO_IMPACTO: Record<ImpactoMedida, NomeIcone> = {
  baixo: 'circle-outline',
  medio: 'circle-slice-4',
  alto: 'circle-slice-8',
};

/** Impacto de uma medida para a população. "Alto" ganha destaque: exige validação humana. */
export function SeloImpacto({ impacto, style }: { impacto: ImpactoMedida; style?: StyleProp<ViewStyle> }) {
  return (
    <Etiqueta
      texto={ROTULO_IMPACTO[impacto]}
      icone={ICONE_DO_IMPACTO[impacto]}
      tom={impacto === 'alto' ? 'aviso' : 'neutro'}
      style={style}
    />
  );
}

const ICONE_DA_CONFIANCA: Record<NivelConfianca, NomeIcone> = {
  baixa: 'signal-cellular-1',
  media: 'signal-cellular-2',
  alta: 'signal-cellular-3',
};

/** Nível de confiança do alerta, com a pontuação. */
export function SeloConfianca({
  nivel,
  pontuacao,
  style,
}: {
  nivel: NivelConfianca;
  pontuacao?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const texto = pontuacao === undefined ? ROTULO_CONFIANCA[nivel] : `${ROTULO_CONFIANCA[nivel]} · ${pontuacao}/100`;
  return <Etiqueta texto={texto} icone={ICONE_DA_CONFIANCA[nivel]} tom="neutro" style={style} />;
}

const estilos = StyleSheet.create({
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: esp.xs,
    paddingHorizontal: esp.sm,
    paddingVertical: 3,
    borderRadius: raio.pilula,
  },
});
