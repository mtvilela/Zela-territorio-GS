/**
 * Formas simples de comparação, desenhadas com Views:
 *  - BarrasHorizontais: ordena categorias da maior para a menor (uma cor só);
 *  - ListaMedidores: uma razão por setor, cada uma contra o seu limite;
 *  - BarraSegmentada: um total dividido em etapas (aberta → em andamento → resolvida);
 *  - MedidorConfianca: a pontuação de confiança de um alerta.
 *
 * Em todas, o número aparece escrito ao lado da marca: a leitura nunca depende só do desenho.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ROTULO_CONFIANCA } from '@/dominio/confianca';
import { ROTULO_SITUACAO } from '@/dominio/limiares';
import type { NivelConfianca, Situacao } from '@/dominio/tipos';
import { esp, raio, TOQUE_MINIMO } from '@/tema/medidas';
import { useTema } from '@/tema/useTema';
import { formatarNumero } from '@/utils/numeros';

import { Icone, ICONE_DA_SITUACAO } from '../Icone';
import { Texto } from '../Texto';

// ---------------------------------------------------------------------------------------------
// Barras horizontais ordenadas
// ---------------------------------------------------------------------------------------------

export interface ItemDeBarra {
  chave: string;
  rotulo: string;
  valor: number;
  /** Valor já formatado, mostrado à direita. */
  texto: string;
}

export function BarrasHorizontais({ itens }: { itens: ItemDeBarra[] }) {
  const { cores } = useTema();
  const maior = Math.max(1, ...itens.map((item) => item.valor));
  return (
    <View style={estilos.lista}>
      {itens.map((item) => (
        <View
          key={item.chave}
          accessible
          accessibilityLabel={`${item.rotulo}: ${item.texto}`}
          style={estilos.linhaDeBarra}>
          <View style={estilos.cabecalhoDaLinha}>
            <Texto variante="rotulo" style={estilos.flex} numberOfLines={1}>
              {item.rotulo}
            </Texto>
            <Texto variante="rotulo" style={estilos.numero}>
              {item.texto}
            </Texto>
          </View>
          {/* A barra cresce a partir da esquerda (base reta) e tem a ponta arredondada. */}
          <View style={estilos.trilhoDeBarra}>
            {item.valor > 0 ? (
              <View
                style={[
                  estilos.barra,
                  { width: `${Math.max(1.5, (item.valor / maior) * 100)}%`, backgroundColor: cores.serie1 },
                ]}
              />
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Lista de medidores (um por setor)
// ---------------------------------------------------------------------------------------------

export interface ItemDeMedidor {
  chave: string;
  rotulo: string;
  /** Valor já formatado ("89,6%"). */
  texto: string;
  /** Preenchimento do medidor, de 0 a 1. */
  fracao: number;
  situacao: Situacao;
  /** Série ocultada pela regra de privacidade. */
  protegido?: boolean;
}

interface PropsMedidores {
  itens: ItemDeMedidor[];
  selecionado?: string;
  aoSelecionar?: (chave: string) => void;
}

export function ListaMedidores({ itens, selecionado, aoSelecionar }: PropsMedidores) {
  const { cores } = useTema();
  return (
    <View style={estilos.lista}>
      {itens.map((item) => {
        const ativo = item.chave === selecionado;
        const tons = cores.situacao[item.situacao];
        const fracao = Math.min(1, Math.max(0, item.fracao));

        const conteudo = (
          <>
            <View style={estilos.cabecalhoDaLinha}>
              <Texto variante={ativo ? 'corpoForte' : 'rotulo'} style={estilos.flex} numberOfLines={2}>
                {item.rotulo}
              </Texto>
              {item.protegido ? (
                <>
                  <Icone nome="lock-outline" tamanho={16} cor={cores.textoSuave} />
                  <Texto variante="rotulo" cor="suave">
                    Protegido
                  </Texto>
                </>
              ) : (
                <>
                  <Icone nome={ICONE_DA_SITUACAO[item.situacao]} tamanho={16} cor={tons.icone} />
                  <Texto variante="rotulo" style={estilos.numero}>
                    {item.texto}
                  </Texto>
                </>
              )}
            </View>
            {item.protegido ? (
              <View style={[estilos.trilhoDeMedidor, { backgroundColor: cores.superficieSuave }]} />
            ) : (
              <View style={[estilos.trilhoDeMedidor, { backgroundColor: tons.fundo }]}>
                <View style={[estilos.preenchimento, { width: `${fracao * 100}%`, backgroundColor: tons.cor }]} />
                {/* Marcador escuro no fim do preenchimento: visível mesmo quando a cor é clara (amarelo). */}
                <View style={[estilos.marcador, { left: `${fracao * 100}%`, backgroundColor: cores.texto }]} />
              </View>
            )}
          </>
        );

        const rotuloAcessivel = item.protegido
          ? `${item.rotulo}: dado protegido por privacidade`
          : `${item.rotulo}: ${item.texto}, situação ${ROTULO_SITUACAO[item.situacao].toLowerCase()}`;

        if (!aoSelecionar) {
          return (
            <View key={item.chave} accessible accessibilityLabel={rotuloAcessivel} style={estilos.linhaDeMedidor}>
              {conteudo}
            </View>
          );
        }
        return (
          <Pressable
            key={item.chave}
            onPress={() => aoSelecionar(item.chave)}
            accessibilityRole="button"
            accessibilityLabel={rotuloAcessivel}
            accessibilityHint="Mostra o gráfico deste setor."
            aria-selected={ativo}
            style={({ pressed }) => [
              estilos.linhaDeMedidor,
              estilos.linhaSelecionavel,
              {
                borderColor: ativo ? cores.primaria : 'transparent',
                backgroundColor: ativo ? cores.primariaSuave : 'transparent',
              },
              pressed && { opacity: 0.75 },
            ]}>
            {conteudo}
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Barra segmentada (um total dividido em até 3 etapas)
// ---------------------------------------------------------------------------------------------

export interface ParteDaBarra {
  chave: string;
  rotulo: string;
  valor: number;
}

export function BarraSegmentada({ partes, descricao }: { partes: ParteDaBarra[]; descricao: string }) {
  const { cores } = useTema();
  const total = partes.reduce((soma, parte) => soma + parte.valor, 0);
  const resumo = partes
    .map(
      (parte) =>
        `${parte.rotulo}: ${formatarNumero(parte.valor)} (${total > 0 ? Math.round((parte.valor / total) * 100) : 0}%)`,
    )
    .join('; ');

  return (
    <View style={estilos.segmentada}>
      <View style={estilos.blocos} accessible accessibilityRole="image" accessibilityLabel={`${descricao}. ${resumo}.`}>
        {total === 0 ? (
          <View style={[estilos.bloco, estilos.flex, { backgroundColor: cores.superficieSuave }]} />
        ) : (
          partes.map((parte, indice) => {
            if (parte.valor <= 0) return null;
            const fatia = parte.valor / total;
            return (
              <View
                key={parte.chave}
                style={[
                  estilos.bloco,
                  { flexGrow: parte.valor, flexBasis: 0, backgroundColor: cores.ordinal[indice] },
                ]}>
                {/* O número só é escrito quando cabe no bloco; os demais ficam na legenda acessível. */}
                {fatia >= 0.1 ? (
                  <Texto
                    variante="micro"
                    maxFontSizeMultiplier={1.2}
                    numberOfLines={1}
                    style={{ color: cores.sobreOrdinal[indice] }}>
                    {formatarNumero(parte.valor)}
                  </Texto>
                ) : null}
              </View>
            );
          })
        )}
      </View>
      <View style={estilos.legendaDaBarra}>
        {partes.map((parte, indice) => (
          <View key={parte.chave} style={estilos.itemDaLegenda}>
            <View style={[estilos.amostra, { backgroundColor: cores.ordinal[indice] }]} />
            <Texto variante="micro" cor="secundario">
              {parte.rotulo}
            </Texto>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Medidor de confiança
// ---------------------------------------------------------------------------------------------

export function MedidorConfianca({ pontuacao, nivel }: { pontuacao: number; nivel: NivelConfianca }) {
  const { cores } = useTema();
  const fracao = Math.min(100, Math.max(0, pontuacao));
  return (
    <View
      style={estilos.confianca}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${ROTULO_CONFIANCA[nivel]}: ${pontuacao} de 100`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pontuacao}>
      <View style={estilos.cabecalhoDaLinha}>
        <Texto variante="titulo3" style={estilos.flex}>
          {ROTULO_CONFIANCA[nivel]}
        </Texto>
        <Texto variante="titulo3">{pontuacao}</Texto>
        <Texto variante="rotulo" cor="suave">
          de 100
        </Texto>
      </View>
      <View style={[estilos.trilhoDeConfianca, { backgroundColor: cores.primariaSuave }]}>
        <View style={[estilos.preenchimento, { width: `${fracao}%`, backgroundColor: cores.primaria }]} />
        {/* Divisas entre baixa (até 44), média (45 a 69) e alta (70 ou mais). */}
        <View style={[estilos.divisa, { left: '45%', backgroundColor: cores.superficie }]} />
        <View style={[estilos.divisa, { left: '70%', backgroundColor: cores.superficie }]} />
      </View>
      <View style={estilos.zonas}>
        <Texto variante="micro" cor="suave" style={{ width: '45%' }}>
          baixa
        </Texto>
        <Texto variante="micro" cor="suave" style={{ width: '25%' }}>
          média
        </Texto>
        <Texto variante="micro" cor="suave" style={{ width: '30%' }}>
          alta
        </Texto>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  lista: { gap: esp.md },
  numero: { fontVariant: ['tabular-nums'] },
  cabecalhoDaLinha: { flexDirection: 'row', alignItems: 'center', gap: esp.xs },
  linhaDeBarra: { gap: esp.xs },
  trilhoDeBarra: { height: 10, justifyContent: 'center' },
  barra: {
    height: 10,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  linhaDeMedidor: { gap: esp.sm },
  linhaSelecionavel: {
    minHeight: TOQUE_MINIMO,
    justifyContent: 'center',
    marginHorizontal: -esp.sm,
    paddingHorizontal: esp.sm,
    paddingVertical: esp.sm,
    borderRadius: raio.md,
    borderWidth: 1.5,
  },
  trilhoDeMedidor: {
    height: 10,
    borderRadius: 5,
  },
  preenchimento: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 5,
  },
  marcador: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    width: 3,
    marginLeft: -2,
    borderRadius: 1.5,
  },
  segmentada: { gap: esp.sm },
  blocos: { flexDirection: 'row', height: 28, gap: 2 },
  bloco: {
    borderRadius: 4,
    justifyContent: 'center',
    paddingHorizontal: esp.sm,
    minWidth: 4,
  },
  legendaDaBarra: { flexDirection: 'row', flexWrap: 'wrap', columnGap: esp.lg, rowGap: esp.xs },
  itemDaLegenda: { flexDirection: 'row', alignItems: 'center', gap: esp.xs },
  amostra: { width: 12, height: 12, borderRadius: 3 },
  confianca: { gap: esp.sm },
  trilhoDeConfianca: { height: 12, borderRadius: 6, overflow: 'hidden' },
  divisa: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1 },
  zonas: { flexDirection: 'row' },
});
