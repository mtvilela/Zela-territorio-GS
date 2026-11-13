/**
 * Ajustes: território, limites dos alertas, aparência, cenário de demonstração,
 * privacidade, fontes de dados e informações sobre o projeto.
 */
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ItemLista, Secao } from '@/componentes/Blocos';
import { Botao } from '@/componentes/Botao';
import { Cartao } from '@/componentes/Cartao';
import { SeletorOpcoes } from '@/componentes/Formulario';
import { TituloDaTela } from '@/componentes/Marca';
import { Tela } from '@/componentes/Tela';
import { Texto } from '@/componentes/Texto';
import { useConfiguracoes, type Aparencia } from '@/estado/configuracoes';
import { esp } from '@/tema/medidas';
import { plural } from '@/utils/numeros';

const EQUIPE = [
  { nome: 'Matheus Vilela Silveira', rm: '564989' },
  { nome: 'Maria Eduarda de Aquila Amaral', rm: '563783' },
  { nome: 'Daniel Castro Sanches', rm: '563333' },
];

export default function TelaAjustes() {
  const router = useRouter();
  const territorio = useConfiguracoes((s) => s.territorio);
  const limiares = useConfiguracoes((s) => s.limiares);
  const aparencia = useConfiguracoes((s) => s.aparencia);
  const definirAparencia = useConfiguracoes((s) => s.definirAparencia);
  const cenario = useConfiguracoes((s) => s.cenario);
  const proximoCenario = useConfiguracoes((s) => s.proximoCenario);
  const restaurarCenario = useConfiguracoes((s) => s.restaurarCenario);

  const personalizados = Object.keys(limiares).length;

  return (
    <Tela aba testID="tela-ajustes">
      <TituloDaTela titulo="Ajustes" descricao="Calibre o painel para o seu território." />

      <Secao titulo="Painel">
        <Cartao semPreenchimento>
          <ItemLista
            icone="map-marker-outline"
            titulo="Território"
            descricao="Município usado na consulta do clima"
            valor={territorio.estado ? `${territorio.nome} — ${territorio.estado}` : territorio.nome}
            aoPressionar={() => router.push('/territorio')}
            testID="item-territorio"
          />
          <ItemLista
            icone="tune-variant"
            titulo="Limites dos alertas"
            descricao="Quando cada indicador entra em atenção, alerta ou crítico"
            valor={
              personalizados === 0
                ? 'Usando os limites padrão'
                : plural(personalizados, 'indicador personalizado', 'indicadores personalizados')
            }
            aoPressionar={() => router.push('/limiares')}
            ultimo
            testID="item-limiares"
          />
        </Cartao>
      </Secao>

      <Secao titulo="Aparência">
        <Cartao>
          <SeletorOpcoes<Aparencia>
            rotulo="Tema de cores"
            valor={aparencia}
            aoMudar={definirAparencia}
            opcoes={[
              { valor: 'sistema', rotulo: 'Seguir o sistema', icone: 'theme-light-dark' },
              { valor: 'claro', rotulo: 'Claro', icone: 'weather-sunny' },
              { valor: 'escuro', rotulo: 'Escuro', icone: 'weather-night' },
            ]}
          />
          <Texto variante="legenda" cor="suave" style={estilos.nota}>
            O tamanho do texto acompanha a configuração de fonte do aparelho.
          </Texto>
        </Cartao>
      </Secao>

      <Secao
        titulo="Dados de demonstração"
        descricao="Água, energia, resíduos e serviços usam séries sintéticas. Trocar o cenário mostra como os alertas reagem a outros dados.">
        <Cartao>
          <Texto variante="corpoForte">{cenario === 0 ? 'Cenário padrão' : `Cenário alternativo nº ${cenario}`}</Texto>
          <Texto variante="legenda" cor="secundario">
            {cenario === 0
              ? 'É o cenário usado na apresentação do projeto.'
              : 'Os perfis foram redistribuídos entre os setores e o ruído mudou.'}
          </Texto>
          <View style={estilos.botoes}>
            <Botao
              titulo="Gerar outro cenário"
              icone="shuffle-variant"
              variante="secundario"
              compacto
              aoPressionar={proximoCenario}
            />
            {cenario !== 0 ? (
              <Botao
                titulo="Voltar ao padrão"
                icone="restore"
                variante="fantasma"
                compacto
                aoPressionar={restaurarCenario}
              />
            ) : null}
          </View>
        </Cartao>
      </Secao>

      <Secao titulo="Transparência">
        <Cartao semPreenchimento>
          <ItemLista
            icone="shield-lock-outline"
            titulo="Privacidade e dados"
            descricao="O que fica guardado no aparelho e como apagar"
            aoPressionar={() => router.push('/privacidade')}
            testID="item-privacidade"
          />
          <ItemLista
            icone="database-outline"
            titulo="Fontes de dados e limitações"
            descricao="De onde vem cada número e o que ele não mostra"
            aoPressionar={() => router.push('/fontes')}
            ultimo
            testID="item-fontes"
          />
        </Cartao>
      </Secao>

      <Secao titulo="Sobre">
        <Cartao>
          <Texto variante="corpoForte">Zela Território · versão 1.0.0</Texto>
          <Texto variante="rotulo" cor="secundario">
            Painel de Inteligência Territorial desenvolvido para a Global Solution 2026.2 da FIAP (desafio CitizenTech),
            disciplina Cross-Platform Application Development, 2º ano de Ciência da Computação.
          </Texto>
          <View style={estilos.equipe}>
            {EQUIPE.map((pessoa) => (
              <Texto key={pessoa.rm} variante="rotulo">
                {pessoa.nome}{' '}
                <Texto variante="rotulo" cor="suave">
                  · RM {pessoa.rm}
                </Texto>
              </Texto>
            ))}
          </View>
          <Texto variante="legenda" cor="suave">
            Objetivos de Desenvolvimento Sustentável relacionados: 11 (cidades e comunidades sustentáveis), 13 (ação
            contra a mudança global do clima), 9 (indústria, inovação e infraestrutura) e 10 (redução das
            desigualdades).
          </Texto>
        </Cartao>
      </Secao>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  nota: { marginTop: esp.md },
  botoes: { flexDirection: 'row', flexWrap: 'wrap', gap: esp.sm, marginTop: esp.md },
  equipe: { gap: esp.xs, marginVertical: esp.md },
});
