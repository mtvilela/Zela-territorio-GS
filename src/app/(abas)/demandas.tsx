/**
 * Serviços urbanos: indicadores da fila de solicitações de zeladoria e a lista das solicitações,
 * com filtros e mudança de status. As solicitações registradas aqui ficam salvas no aparelho.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EstadoVazio, Secao } from '@/componentes/Blocos';
import { Botao } from '@/componentes/Botao';
import { Cartao } from '@/componentes/Cartao';
import { CartaoDemanda } from '@/componentes/CartaoDemanda';
import { SeletorOpcoes } from '@/componentes/Formulario';
import { BarraSegmentada, BarrasHorizontais } from '@/componentes/graficos/Marcas';
import { TituloDaTela } from '@/componentes/Marca';
import { SeloOrigem } from '@/componentes/Selos';
import { Tela } from '@/componentes/Tela';
import { Texto } from '@/componentes/Texto';
import { ROTULO_CATEGORIA, SETORES } from '@/dados/catalogo';
import { DIAS_PARA_ATRASO, estaAberta, resumirDemandas } from '@/dados/demandas';
import { useDemandasLocais } from '@/estado/demandas';
import { useDemandas, useHoje } from '@/estado/painel';
import { esp } from '@/tema/medidas';
import { formatarNumero, plural } from '@/utils/numeros';

type FiltroDeStatus = 'pendentes' | 'resolvidas' | 'todas';

const TAMANHO_DA_PAGINA = 12;

export default function TelaDemandas() {
  const router = useRouter();
  const hoje = useHoje();
  const demandas = useDemandas();
  const alterarStatus = useDemandasLocais((s) => s.alterarStatus);

  const [status, setStatus] = useState<FiltroDeStatus>('pendentes');
  const [setor, setSetor] = useState<string>('todos');
  const [limite, setLimite] = useState(TAMANHO_DA_PAGINA);

  const resumo = useMemo(() => resumirDemandas(demandas, hoje), [demandas, hoje]);

  const filtradas = useMemo(
    () =>
      demandas.filter((d) => {
        if (setor !== 'todos' && d.setorId !== setor) return false;
        if (status === 'pendentes') return estaAberta(d);
        if (status === 'resolvidas') return !estaAberta(d);
        return true;
      }),
    [demandas, setor, status],
  );
  const visiveis = filtradas.slice(0, limite);

  const mudarStatus = (valor: FiltroDeStatus) => {
    setStatus(valor);
    setLimite(TAMANHO_DA_PAGINA);
  };
  const mudarSetor = (valor: string) => {
    setSetor(valor);
    setLimite(TAMANHO_DA_PAGINA);
  };

  const pendentes = resumo.abertas + resumo.emAndamento;

  return (
    <Tela aba testID="tela-demandas">
      <TituloDaTela
        titulo="Solicitações de zeladoria"
        descricao="A fila de serviços por setor, com as mesmas categorias do Zela Bairro."
      />

      <Botao
        titulo="Registrar solicitação"
        icone="plus"
        largo
        aoPressionar={() => router.push('/demanda/nova')}
        testID="botao-nova-demanda"
      />

      {/* Números principais da fila */}
      <View style={estilos.grade}>
        <Indicador
          rotulo="Pendentes"
          valor={formatarNumero(pendentes)}
          detalhe={`${formatarNumero(resumo.emAndamento)} em andamento`}
        />
        <Indicador
          rotulo="Críticas"
          valor={formatarNumero(resumo.criticas)}
          detalhe="prioridade alta, não resolvidas"
        />
        <Indicador
          rotulo="Atrasadas"
          valor={formatarNumero(resumo.atrasadas)}
          detalhe={`há mais de ${DIAS_PARA_ATRASO} dias`}
        />
        <Indicador
          rotulo="Taxa de resolução"
          valor={`${formatarNumero(resumo.taxaDeResolucao * 100)}%`}
          detalhe={
            resumo.tempoMedioDeResolucao === null
              ? 'sem resolvidas ainda'
              : `${formatarNumero(resumo.tempoMedioDeResolucao, 1)} dias em média`
          }
        />
      </View>

      <Cartao>
        <Texto variante="titulo3" cabecalho>
          Andamento das solicitações
        </Texto>
        <Texto variante="legenda" cor="secundario" style={estilos.legendaDoCartao}>
          {plural(resumo.total, 'solicitação nos últimos 50 dias', 'solicitações nos últimos 50 dias')}
        </Texto>
        <BarraSegmentada
          descricao="Solicitações por etapa"
          partes={[
            { chave: 'aberta', rotulo: 'Abertas', valor: resumo.abertas },
            { chave: 'em_andamento', rotulo: 'Em andamento', valor: resumo.emAndamento },
            { chave: 'resolvida', rotulo: 'Resolvidas', valor: resumo.resolvidas },
          ]}
        />
        <SeloOrigem origem="mista" style={estilos.origem} />
      </Cartao>

      {resumo.pendentesPorCategoria.length > 0 ? (
        <Cartao>
          <Texto variante="titulo3" cabecalho>
            Pendentes por categoria
          </Texto>
          <Texto variante="legenda" cor="secundario" style={estilos.legendaDoCartao}>
            Onde a fila está concentrada
          </Texto>
          <BarrasHorizontais
            itens={resumo.pendentesPorCategoria.map((item) => ({
              chave: item.categoria,
              rotulo: ROTULO_CATEGORIA[item.categoria],
              valor: item.quantidade,
              texto: formatarNumero(item.quantidade),
            }))}
          />
        </Cartao>
      ) : null}

      <Secao titulo="Lista de solicitações">
        <SeletorOpcoes<FiltroDeStatus>
          rotulo="Situação"
          valor={status}
          aoMudar={mudarStatus}
          opcoes={[
            { valor: 'pendentes', rotulo: 'Pendentes' },
            { valor: 'resolvidas', rotulo: 'Resolvidas' },
            { valor: 'todas', rotulo: 'Todas' },
          ]}
        />
        <SeletorOpcoes<string>
          rotulo="Setor"
          valor={setor}
          aoMudar={mudarSetor}
          opcoes={[{ valor: 'todos', rotulo: 'Todos' }, ...SETORES.map((s) => ({ valor: s.id, rotulo: s.nome }))]}
        />

        <Texto variante="legenda" cor="secundario" accessibilityLiveRegion="polite">
          {plural(filtradas.length, 'solicitação encontrada', 'solicitações encontradas')}
        </Texto>

        {filtradas.length === 0 ? (
          <EstadoVazio
            icone="clipboard-check-outline"
            titulo="Nada por aqui"
            texto="Nenhuma solicitação corresponde aos filtros escolhidos."
            acao={{ titulo: 'Registrar solicitação', icone: 'plus', aoPressionar: () => router.push('/demanda/nova') }}
          />
        ) : (
          visiveis.map((demanda) => (
            <CartaoDemanda
              key={demanda.id}
              demanda={demanda}
              hoje={hoje}
              aoAlterarStatus={(novo) => alterarStatus(demanda, novo, hoje)}
            />
          ))
        )}

        {filtradas.length > visiveis.length ? (
          <Botao
            titulo={`Mostrar mais (${formatarNumero(filtradas.length - visiveis.length)} restantes)`}
            variante="secundario"
            largo
            aoPressionar={() => setLimite((atual) => atual + TAMANHO_DA_PAGINA)}
          />
        ) : null}
      </Secao>
    </Tela>
  );
}

/** Bloco de número: rótulo, valor e um detalhe curto. */
function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe: string }) {
  return (
    <Cartao style={estilos.indicador}>
      <View accessible accessibilityLabel={`${rotulo}: ${valor}, ${detalhe}`}>
        <Texto variante="legenda" cor="secundario">
          {rotulo}
        </Texto>
        <Texto variante="numero">{valor}</Texto>
        <Texto variante="legenda" cor="suave">
          {detalhe}
        </Texto>
      </View>
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: esp.md },
  // Dois cartões por linha; em telas largas, os quatro cabem na mesma linha.
  indicador: { flexGrow: 1, flexBasis: '45%', minWidth: 128, padding: esp.md },
  legendaDoCartao: { marginBottom: esp.md },
  origem: { marginTop: esp.md },
});
