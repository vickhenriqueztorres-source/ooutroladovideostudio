import { PackagingRagClient } from '../rag/packaging-rag-client';
import { TitleCandidate, ThumbnailConcept } from '../types/publication.types';
import { ThumbnailPlan } from '../types/editorialContract';

export class TitlePlanner {
  private readonly rag = new PackagingRagClient();

  /**
   * Gera títulos pareados que obedecem à regra da neurociência (1 + 1 = 3)
   * A thumbnail gera a tensão visual; o título entrega contexto + promessa, sem duplicação.
   */
  public plan(input: {
    objectOrFlow: string;
    systemBeingAnalyzed: string;
    centralQuestion: string;
    primaryConsequence: string;
    thumbnailConcepts?: readonly ThumbnailConcept[];
    thumbnailPlan?: ThumbnailPlan;
  }): readonly TitleCandidate[] {
    const isCurrency = input.objectOrFlow.toLowerCase().includes('nota') || input.objectOrFlow.toLowerCase().includes('cédula') || input.objectOrFlow.toLowerCase().includes('cedula') || input.systemBeingAnalyzed.toLowerCase().includes('moeda');
    const isCable = input.objectOrFlow.toLowerCase().includes('cabo') || input.systemBeingAnalyzed.toLowerCase().includes('submarina');
    const isPix = input.objectOrFlow.toLowerCase().includes('pix') || input.systemBeingAnalyzed.toLowerCase().includes('spi');

    if (isCurrency) {
      return [
        {
          variant_id: 'A',
          type: 'SEARCH_INTENT',
          title: 'A FÍSICA DA NOTA DE 100: O Que Nenhuma Impressora Consegue Clonar',
          desire_driver: 'Entender a física molecular e a engrenagem oculta de segurança da cédula',
          target_ctr_goal: '9.0% - 11.5% em Busca e Sugeridos'
        },
        {
          variant_id: 'B',
          type: 'PARADOX_CONTRADICTION',
          title: 'O Teste Secreto Que Destrói a Nota de 100 em 0.1 Segundo',
          desire_driver: 'Aversão à perda, vulnerabilidade bancária e o tribunal forense das máquinas',
          target_ctr_goal: '10.5% - 13.0% em Recomendação e Sugeridos'
        },
        {
          variant_id: 'C',
          type: 'BROWSE_CURIOSITY',
          title: 'Por Que a Casa da Moeda Precisa de 80 Toneladas Para Fazer Uma Nota?',
          desire_driver: 'Desproporção monumental e curiosidade de escala industrial da calcografia',
          target_ctr_goal: '11.0% - 14.0% na Página Inicial (Browse)'
        }
      ];
    }

    if (isCable) {
      return [
        {
          variant_id: 'A',
          type: 'SEARCH_INTENT',
          title: 'Como a Internet Chega ao Brasil: Os Cabos Submarinos no Fundo do Oceano',
          desire_driver: 'Entender a rota invisível e a engenharia física das telecomunicações',
          target_ctr_goal: '8.5% - 10.0% em Busca e Sugeridos'
        },
        {
          variant_id: 'B',
          type: 'PARADOX_CONTRADICTION',
          title: 'O Que Acontece Se o Cabo Submarino For Cortado no Fundo do Mar?',
          desire_driver: 'Risco sistêmico de apagão digital e vulnerabilidade de um continente',
          target_ctr_goal: '10.0% - 12.5% em Recomendação e Sugeridos'
        },
        {
          variant_id: 'C',
          type: 'BROWSE_CURIOSITY',
          title: 'O Fio de 25mm no Fundo do Oceano Que Sustenta 200 Milhões de Pessoas',
          desire_driver: 'Curiosidade em escala monumental e fragilidade de infraestrutura',
          target_ctr_goal: '9.5% - 12.0% na Página Inicial (Browse)'
        }
      ];
    }

    if (isPix) {
      return [
        {
          variant_id: 'A',
          type: 'SEARCH_INTENT',
          title: 'Como Funciona o Pix: A Infraestrutura Invisível de 1,4 Segundo',
          desire_driver: 'Entender a criptografia e o caminho invisível do dinheiro instantâneo',
          target_ctr_goal: '8.0% - 9.5% em Busca e Sugeridos'
        },
        {
          variant_id: 'B',
          type: 'PARADOX_CONTRADICTION',
          title: 'O Ponto Crítico do Pix: O Que Acontece Se o Servidor do BACEN Travar?',
          desire_driver: 'Risco sistêmico e aversão à interrupção em um sistema financeiro massivo',
          target_ctr_goal: '9.5% - 12.0% em Recomendação e Sugeridos'
        },
        {
          variant_id: 'C',
          type: 'BROWSE_CURIOSITY',
          title: 'A Máquina Oculta Que Move 140 Milhões de Pagamentos no Brasil',
          desire_driver: 'Escala monumental de processamento e arquitetura de dados',
          target_ctr_goal: '9.0% - 11.5% na Página Inicial (Browse)'
        }
      ];
    }

    // Fallback dinâmico genérico
    const obj = input.objectOrFlow || 'Objeto';
    const sys = input.systemBeingAnalyzed || 'Sistema';

    return [
      {
        variant_id: 'A',
        type: 'SEARCH_INTENT',
        title: `Como ${obj} Atravessa o Sistema de ${sys}: A Rota Oculta`,
        desire_driver: 'Compreensão de bastidores e rota física',
        target_ctr_goal: '8.0% - 9.5%'
      },
      {
        variant_id: 'B',
        type: 'PARADOX_CONTRADICTION',
        title: `O Ponto de Falha em ${sys}: O Que Acontece Se ${obj} Parar?`,
        desire_driver: 'Aversão à perda e vulnerabilidade sistêmica',
        target_ctr_goal: '9.5% - 11.5%'
      },
      {
        variant_id: 'C',
        type: 'BROWSE_CURIOSITY',
        title: `A Infraestrutura Oculta Por Trás de Um Simples ${obj}`,
        desire_driver: 'Curiosidade de escala monumental e descoberta',
        target_ctr_goal: '9.0% - 11.0%'
      }
    ];
  }
}
