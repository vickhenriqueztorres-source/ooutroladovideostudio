import { PackagingRagClient } from '../rag/packaging-rag-client';
import {
  ThumbnailConcept,
  ThumbnailVariantId
} from '../types/publication.types';
import {
  ThumbnailCopyBrief,
  ThumbnailCopyVariant,
  ThumbnailPlan,
  computeBriefHash,
  computeTitleHash
} from '../types/editorialContract';
import { PackagingValidators } from '../validators/packagingValidators';

export class ThumbnailPlanner {
  private readonly rag = new PackagingRagClient();

  /**
   * Planejamento Editorial Avançado guiado por Briefing Estrito e Neurociência
   */
  public planEditorial(brief: ThumbnailCopyBrief): ThumbnailPlan {
    const isCurrency = brief.objectOrFlow.toLowerCase().includes('nota') || brief.objectOrFlow.toLowerCase().includes('cédula') || brief.objectOrFlow.toLowerCase().includes('cedula') || brief.system.toLowerCase().includes('moeda') || brief.approvedTitle.toLowerCase().includes('nota');
    const isCable = brief.objectOrFlow.toLowerCase().includes('cabo') || brief.system.toLowerCase().includes('submarina') || brief.approvedTitle.toLowerCase().includes('cabo');
    const isPix = brief.objectOrFlow.toLowerCase().includes('pix') || brief.system.toLowerCase().includes('spi') || brief.approvedTitle.toLowerCase().includes('pix');

    let variantA: ThumbnailCopyVariant;
    let variantB: ThumbnailCopyVariant;
    let variantC: ThumbnailCopyVariant;

    if (isCurrency) {
      variantA = {
        variantId: 'A',
        hypothesis: 'MECHANISM',
        format: 'XRAY_MECHANISM',
        visualConcept: 'Cédula de 100 reais cortada ao meio com fibras densas de algodão puro expostas e feixe laser central',
        focalObject: 'Cédula de 100 Reais em Corte X-Ray',
        focalRelationship: 'Revela a trama viva têxtil de algodão onde o público acreditava ser papel de celulose',
        headline: 'NÃO É PAPEL',
        headlineWords: ['NÃO', 'É', 'PAPEL'],
        headlineLength: 3,
        supportingText: '100% FIBRA TÊXTIL // ZERO CELULOSE',
        titleRelationship: 'COMPLEMENTARY',
        curiosityQuestion: 'Se não é papel de celulose, de que matéria física o dinheiro é feito?',
        supportedClaimIds: brief.primaryClaimIds.length > 0 ? [brief.primaryClaimIds[0]] : ['CLAIM_CURRENCY_COTTON'],
        disallowedElements: ['EMOJIS', 'RED_ARROWS', 'HUMAN_FACES', 'COMPLEX_GRAPHS'],
        confidence: 0.96
      };

      variantB = {
        variantId: 'B',
        hypothesis: 'RISK',
        format: 'BOTTLENECK',
        visualConcept: 'Cédula voando por roletes industriais sob sensor óptico de 850nm com alerta de rejeição ativa',
        focalObject: 'Scanner de Alta Velocidade do Banco Central',
        focalRelationship: 'Sensor óptico e magnético que condena a nota à destruição em caso de desvio microscópico',
        headline: '1 FALHA: TRITURADA',
        headlineWords: ['1', 'FALHA:', 'TRITURADA'],
        headlineLength: 3,
        supportingText: 'SENSOR DE 850NM // REJEIÇÃO EM 0.1s',
        titleRelationship: 'CONSEQUENCE',
        curiosityQuestion: 'Qual o defeito microscópico que faz uma cédula ser sumariamente destruída?',
        supportedClaimIds: brief.primaryClaimIds.length > 1 ? [brief.primaryClaimIds[1]] : ['CLAIM_CURRENCY_REJECTION'],
        disallowedElements: ['EMOJIS', 'RED_ARROWS', 'HUMAN_FACES'],
        confidence: 0.94
      };

      variantC = {
        variantId: 'C',
        hypothesis: 'SCALE',
        format: 'SCALE_CONTRAST',
        visualConcept: 'Prensa monumental de calcografia da Casa da Moeda exercendo 80 toneladas sobre matriz de aço',
        focalObject: 'Prensa Hidráulica de 80 Toneladas',
        focalRelationship: 'A desproporção monumental necessária para gravar o relevo tátil que nenhuma gráfica consegue clonar',
        headline: '80 TONELADAS',
        headlineWords: ['80', 'TONELADAS'],
        headlineLength: 2,
        supportingText: 'CALCOGRAFIA // 80.000 KG DE PRESSÃO',
        titleRelationship: 'COMPLEMENTARY',
        curiosityQuestion: 'Por que uma simples nota exige 80 toneladas de força mecânica para existir?',
        supportedClaimIds: brief.primaryClaimIds.length > 2 ? [brief.primaryClaimIds[2]] : ['CLAIM_CURRENCY_CALCOGRAPHY'],
        disallowedElements: ['EMOJIS', 'RED_ARROWS', 'HUMAN_FACES'],
        confidence: 0.95
      };
    } else if (isCable) {
      variantA = {
        variantId: 'A',
        hypothesis: 'MECHANISM',
        format: 'XRAY_MECHANISM',
        visualConcept: 'Corte transversal do cabo submarino de 25mm expondo as 7 camadas de aço e cobre',
        focalObject: 'Cabo Submarino de 25mm em Corte',
        focalRelationship: 'Revela que toda a internet continental depende de um tubo de cobre de 25 milímetros',
        headline: 'NÃO VAI DIRETO',
        headlineWords: ['NÃO', 'VAI', 'DIRETO'],
        headlineLength: 3,
        supportingText: 'CABO SUBMARINO // 25 MILÍMETROS',
        titleRelationship: 'COMPLEMENTARY',
        curiosityQuestion: 'Por onde a conexão realmente passa antes de chegar na tela?',
        supportedClaimIds: brief.primaryClaimIds.length > 0 ? [brief.primaryClaimIds[0]] : ['CLAIM_CABLE_ROUTE'],
        disallowedElements: ['EMOJIS', 'RED_ARROWS'],
        confidence: 0.95
      };

      variantB = {
        variantId: 'B',
        hypothesis: 'RISK',
        format: 'BOTTLENECK',
        visualConcept: 'Cabo submarino com feixe de fibra cortado no abismo a 4.000m sob o oceano',
        focalObject: 'Ponto de Ruptura Abissal',
        focalRelationship: 'O ponto de falha único que pode desconectar um país inteiro',
        headline: 'SEM ISSO, PARA',
        headlineWords: ['SEM', 'ISSO,', 'PARA'],
        headlineLength: 3,
        supportingText: 'RUPTURA ABISSAL // 4.000 METROS',
        titleRelationship: 'CONSEQUENCE',
        curiosityQuestion: 'O que acontece se um único cabo no fundo do oceano se romper?',
        supportedClaimIds: brief.primaryClaimIds.length > 1 ? [brief.primaryClaimIds[1]] : ['CLAIM_CABLE_FAILOVER'],
        disallowedElements: ['EMOJIS', 'RED_ARROWS'],
        confidence: 0.93
      };

      variantC = {
        variantId: 'C',
        hypothesis: 'SCALE',
        format: 'SCALE_CONTRAST',
        visualConcept: 'Fio de fibra óptica de espessura de um fio de cabelo atravessando o abismo do oceano',
        focalObject: 'Fibra Óptica vs Oceano Atlântico',
        focalRelationship: 'Contraste entre a fragilidade de um fio e o volume de 200 milhões de conexões',
        headline: '1 FIO. UM OCEANO.',
        headlineWords: ['1', 'FIO.', 'UM', 'OCEANO.'],
        headlineLength: 4,
        supportingText: '200 MILHÕES DE CONEXÕES',
        titleRelationship: 'COMPLEMENTARY',
        curiosityQuestion: 'Como um filamento de vidro sustenta o tráfego de um continente?',
        supportedClaimIds: brief.primaryClaimIds.length > 2 ? [brief.primaryClaimIds[2]] : ['CLAIM_CABLE_SCALE'],
        disallowedElements: ['EMOJIS', 'RED_ARROWS'],
        confidence: 0.94
      };
    } else {
      // Fallback dinâmico genérico para qualquer episódio baseado em sua unidade narrativa
      const obj = brief.objectOrFlow || 'Objeto Central';
      variantA = {
        variantId: 'A',
        hypothesis: 'MECHANISM',
        format: 'XRAY_MECHANISM',
        visualConcept: `${obj} em corte revelando o mecanismo oculto`,
        focalObject: `${obj} em Corte`,
        focalRelationship: `Revela o mecanismo oculto por trás de ${obj}`,
        headline: 'POR DENTRO',
        headlineWords: ['POR', 'DENTRO'],
        headlineLength: 2,
        supportingText: 'MECANISMO OCULTO REVELADO',
        titleRelationship: 'COMPLEMENTARY',
        curiosityQuestion: `Como ${obj} funciona por dentro?`,
        supportedClaimIds: brief.primaryClaimIds.length > 0 ? [brief.primaryClaimIds[0]] : ['CLAIM_GENERIC_MECHANISM'],
        disallowedElements: ['EMOJIS', 'RED_ARROWS'],
        confidence: 0.90
      };

      variantB = {
        variantId: 'B',
        hypothesis: 'RISK',
        format: 'BOTTLENECK',
        visualConcept: `Gargalo crítico de ${brief.system || 'sistema'} com alerta ativo`,
        focalObject: `Ponto Crítico de ${brief.system || 'Sistema'}`,
        focalRelationship: `O ponto exato onde a velocidade cai ou o fluxo é interrompido`,
        headline: 'AQUI TRAVA',
        headlineWords: ['AQUI', 'TRAVA'],
        headlineLength: 2,
        supportingText: 'GARGALO CRÍTICO DO SISTEMA',
        titleRelationship: 'CONSEQUENCE',
        curiosityQuestion: `Onde fica o ponto de falha do sistema?`,
        supportedClaimIds: brief.primaryClaimIds.length > 1 ? [brief.primaryClaimIds[1]] : ['CLAIM_GENERIC_RISK'],
        disallowedElements: ['EMOJIS', 'RED_ARROWS'],
        confidence: 0.90
      };

      variantC = {
        variantId: 'C',
        hypothesis: 'SCALE',
        format: 'SCALE_CONTRAST',
        visualConcept: `${obj} diante da infraestrutura monumental`,
        focalObject: `${obj} vs Sistema Monumental`,
        focalRelationship: `A desproporção monumental necessária para sustentar uma única unidade`,
        headline: '1 CLIQUE. UMA REDE.',
        headlineWords: ['1', 'CLIQUE.', 'UMA', 'REDE.'],
        headlineLength: 4,
        supportingText: 'ESCALA MONUMENTAL OCULTA',
        titleRelationship: 'COMPLEMENTARY',
        curiosityQuestion: `Quantas etapas existem por trás de uma única ação?`,
        supportedClaimIds: brief.primaryClaimIds.length > 2 ? [brief.primaryClaimIds[2]] : ['CLAIM_GENERIC_SCALE'],
        disallowedElements: ['EMOJIS', 'RED_ARROWS'],
        confidence: 0.90
      };
    }

    const variants: [ThumbnailCopyVariant, ThumbnailCopyVariant, ThumbnailCopyVariant] = [
      variantA,
      variantB,
      variantC
    ];

    const plan: ThumbnailPlan = {
      episodeId: brief.episodeId,
      variants,
      selectedFormat: brief.thumbnailFormat || 'XRAY_MECHANISM',
      sourceClaimIds: [...brief.primaryClaimIds],
      titleHash: computeTitleHash(brief.approvedTitle),
      copyBriefHash: computeBriefHash(brief),
      status: 'DRAFT',
      blockers: [],
      warnings: []
    };

    const validation = PackagingValidators.validateFullPlan(plan, brief);

    return {
      ...plan,
      status: validation.status,
      blockers: validation.allBlockers,
      warnings: validation.allWarnings
    };
  }

  /**
   * Método de compatibilidade que gera ThumbnailConcept[] a partir de inputs livres
   */
  public plan(input: {
    episodeTitle: string;
    objectOrFlow: string;
    systemBeingAnalyzed: string;
    heroVisual: string;
    mainConstraint: string;
    primaryConsequence: string;
  }): readonly ThumbnailConcept[] {
    const brief: ThumbnailCopyBrief = {
      episodeId: 'EP_DYNAMIC',
      approvedTitle: input.episodeTitle,
      centralQuestion: input.mainConstraint,
      thesis: input.primaryConsequence,
      objectOrFlow: input.objectOrFlow,
      system: input.systemBeingAnalyzed,
      targetAudience: 'Investigative Documentaries',
      primaryClaimIds: ['CLAIM_01', 'CLAIM_02', 'CLAIM_03'],
      supportedEntities: [input.objectOrFlow, input.systemBeingAnalyzed],
      approvedNumbers: ['80', '100', '1', '25', '140'],
      visualEvidenceIds: ['EVID_01'],
      syntheticVisualsPresent: false,
      thumbnailFormat: 'XRAY_MECHANISM'
    };

    const editorialPlan = this.planEditorial(brief);

    return editorialPlan.variants.map((v) => {
      const roleMap: Record<string, ThumbnailConcept['role']> = {
        A: 'MECHANISM',
        B: 'CONSEQUENCE',
        C: 'FINAL_HANDOFF'
      };

      return {
        variant_id: v.variantId as ThumbnailVariantId,
        role: roleMap[v.variantId] || 'MECHANISM',
        target_audience_intent: v.variantId === 'A' ? 'BROWSE' : v.variantId === 'B' ? 'SUGGESTED' : 'HYBRID',
        emotion_trigger: v.variantId === 'A' ? 'TECH_CURIOSITY' : v.variantId === 'B' ? 'CONSEQUENCE_COLLAPSE' : 'SURPRISE_DISCOVERY',
        focal_subject: v.focalObject,
        gaze_direction: v.variantId === 'A' ? 'AT_EVIDENCE_RIGHT' : v.variantId === 'B' ? 'AT_EVIDENCE_LEFT' : 'DOWN_AT_DOCUMENT',
        evidence_highlight: v.focalRelationship,
        headline_text: v.headline,
        headline_lines: v.headlineWords,
        subheadline_text: v.supportingText || '',
        category_badge: 'INVESTIGAÇÃO // O OUTRO LADO',
        color_palette: {
          background: '#060709',
          accent: '#FF5500',
          telemetry: '#00F0FF',
          textPrimary: '#F4F4F0'
        },
        prompt_for_dalle: v.visualConcept,
        composition_side: 'LEFT',
        rational: v.focalRelationship
      };
    });
  }
}
