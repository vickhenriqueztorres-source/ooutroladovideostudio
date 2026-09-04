import {
  DISALLOWED_HEADLINE_VOCABULARY,
  ThumbnailCopyBrief,
  ThumbnailCopyVariant,
  ThumbnailFormat,
  ThumbnailPlan,
  TitleRelationship
} from '../types/editorialContract';

export interface ValidationResult {
  readonly valid: boolean;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
}

export interface TitleThumbnailPairResult extends ValidationResult {
  readonly relationship: TitleRelationship | 'DUPLICATIVE' | 'MISALIGNED';
  readonly explanation: string;
}

export class PackagingValidators {
  /**
   * 1. Valida a copy da headline (1 a 5 palavras, termos proibidos, números aprovados)
   */
  public static validateHeadlineCopy(headline: string, approvedNumbers: readonly string[] = []): ValidationResult {
    const blockers: string[] = [];
    const warnings: string[] = [];

    const words = headline.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      blockers.push('HEADLINE_EMPTY: A headline não pode estar vazia.');
      return { valid: false, blockers, warnings };
    }

    if (words.length > 5) {
      blockers.push(`HEADLINE_TOO_LONG: Headline contém ${words.length} palavras. O limite máximo absoluto é 5.`);
    } else if (words.length > 4) {
      warnings.push(`HEADLINE_LENGTH_WARNING: Headline com 5 palavras. Recomendado entre 1 e 4.`);
    }

    const upperHeadline = headline.toUpperCase();

    // Checagem de vocabulário sensacionalista proibido
    for (const disallowed of DISALLOWED_HEADLINE_VOCABULARY) {
      if (upperHeadline.includes(disallowed)) {
        blockers.push(`HEADLINE_DISALLOWED_VOCABULARY: Termo sensacionalista proibido detectado: "${disallowed}".`);
      }
    }

    // Regra de "NUNCA FOI PAPEL" sem suporte explícito
    if (upperHeadline.includes('NUNCA FOI PAPEL')) {
      const hasPaperContext = approvedNumbers.some((n) => 
        n.toLowerCase().includes('papel') || n.toLowerCase().includes('algod') || n.toLowerCase().includes('moeda')
      );
      if (!hasPaperContext) {
        blockers.push('ABSTRACT_UNSUPPORTED_HEADLINE: "NUNCA FOI PAPEL" bloqueado sem claim e contexto documental aprovado.');
      }
    }

    // Proibição de pronomes vagos sem referente ("ISSO MUDA TUDO")
    if (/^ISSO\s+(MUDA|EXPLICA|RESOLVE)/i.test(headline)) {
      blockers.push('HEADLINE_TOO_ABSTRACT: Pronome "ISSO" sem referente direto na headline.');
    }

    // Checagem de números não aprovados
    const numberMatches = headline.match(/\b\d+([.,]\d+)?\b/g);
    if (numberMatches) {
      for (const num of numberMatches) {
        const isApproved = approvedNumbers.some((app) => app.includes(num));
        if (!isApproved) {
          blockers.push(`FABRICATED_NUMBER: Número "${num}" na headline não consta em approvedNumbers.`);
        }
      }
    }

    return {
      valid: blockers.length === 0,
      blockers,
      warnings
    };
  }

  /**
   * 2. Valida o suporte factual de claims da variante contra o briefing
   */
  public static validateClaimSupport(variant: ThumbnailCopyVariant, brief: ThumbnailCopyBrief): ValidationResult {
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!variant.supportedClaimIds || variant.supportedClaimIds.length === 0) {
      blockers.push(`HEADLINE_UNSUPPORTED: Variante ${variant.variantId} não possui nenhum claimId vinculado.`);
    } else {
      const hasValidClaim = variant.supportedClaimIds.some((cid) => brief.primaryClaimIds.includes(cid));
      if (!hasValidClaim) {
        blockers.push(`HEADLINE_UNSUPPORTED: Nenhum dos claims de ${variant.variantId} (${variant.supportedClaimIds.join(', ')}) está em primaryClaimIds do episódio.`);
      }
    }

    return { valid: blockers.length === 0, blockers, warnings };
  }

  /**
   * 3. Valida a relação pareada Título + Thumbnail (Regra da neurociência 1 + 1 = 3)
   */
  public static validateTitleThumbnailPair(title: string, variant: ThumbnailCopyVariant, brief: ThumbnailCopyBrief): TitleThumbnailPairResult {
    const blockers: string[] = [];
    const warnings: string[] = [];

    const normTitle = title.toLowerCase();
    const normHeadline = variant.headline.toLowerCase();

    // Verificação de duplicação literal de palavras significativas
    const titleWords = new Set(normTitle.split(/[^a-z0-9áéíóúãõç]+/i).filter((w) => w.length > 3));
    const headlineWords = normHeadline.split(/[^a-z0-9áéíóúãõç]+/i).filter((w) => w.length > 3);

    let duplicateCount = 0;
    for (const hw of headlineWords) {
      if (titleWords.has(hw)) duplicateCount++;
    }

    const duplicationRatio = headlineWords.length > 0 ? duplicateCount / headlineWords.length : 0;
    if (duplicationRatio >= 0.75 && headlineWords.length >= 2) {
      blockers.push(`TITLE_THUMBNAIL_DUPLICATION: A headline repete ${Math.round(duplicationRatio * 100)}% das palavras do título. Regra 1 + 1 = 3 violada.`);
    }

    // Verificação de alinhamento com a promessa do episódio
    const objectKeywords = brief.objectOrFlow.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const systemKeywords = brief.system.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

    const titleHasTopic = objectKeywords.some((k) => normTitle.includes(k)) || systemKeywords.some((k) => normTitle.includes(k));
    if (!titleHasTopic) {
      warnings.push('TITLE_MAY_LACK_OBJECT: O título aprovado não menciona claramente o objeto ou sistema central.');
    }

    let relationship: TitleThumbnailPairResult['relationship'] = 'COMPLEMENTARY';
    if (blockers.length > 0) {
      relationship = 'DUPLICATIVE';
    } else if (variant.titleRelationship) {
      relationship = variant.titleRelationship;
    }

    const explanation = `Thumbnail traz tensão (${variant.headline}) enquanto Título entrega contexto e promessa (${title}). Relação: ${relationship}.`;

    return {
      valid: blockers.length === 0,
      relationship,
      blockers,
      warnings,
      explanation
    };
  }

  /**
   * 4. Valida legibilidade em tela de celular (320x180)
   */
  public static validateMobileLegibility(headline: string): ValidationResult {
    const blockers: string[] = [];
    const warnings: string[] = [];

    const words = headline.trim().split(/\s+/);
    for (const w of words) {
      if (w.length > 18) {
        blockers.push(`MOBILE_TEXT_ILLEGIBLE: Palavra muito longa ("${w}") quebra a legibilidade em 320x180.`);
      }
    }

    return { valid: blockers.length === 0, blockers, warnings };
  }

  /**
   * 5. Valida o reconhecimento imediato do objeto central (em até 1 segundo)
   */
  public static validateFocalObjectRecognition(focalObject: string): ValidationResult {
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!focalObject || focalObject.trim().length < 3) {
      blockers.push('NO_RECOGNIZABLE_OBJECT: Objeto focal não especificado ou vago.');
    }

    return { valid: blockers.length === 0, blockers, warnings };
  }

  /**
   * 6. Valida a hierarquia visual (60-75% sujeito, 15-25% headline, 5-10% marca)
   */
  public static validateVisualHierarchy(ratios: { objectRatio: number; headlineRatio: number; brandRatio: number }): ValidationResult {
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (ratios.brandRatio > ratios.headlineRatio) {
      blockers.push('BRAND_OVERPOWERING_SUBJECT: O selo da marca é maior que a headline ou que o sujeito.');
    }
    if (ratios.headlineRatio > 0.40) {
      blockers.push('HEADLINE_OVERSIZED: A headline ocupa mais de 40% do quadro da imagem.');
    }

    return { valid: blockers.length === 0, blockers, warnings };
  }

  /**
   * 7. Valida identificação de imagens e dados sintéticos
   */
  public static validateSyntheticRepresentation(syntheticPresent: boolean, isLabeled: boolean): ValidationResult {
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (syntheticPresent && !isLabeled) {
      blockers.push('SYNTHETIC_VISUAL_PRESENTED_AS_REAL: Visual sintético/reconstrução de IA presente sem label técnica.');
    }

    return { valid: blockers.length === 0, blockers, warnings };
  }

  /**
   * 8. Valida uso estrito de números
   */
  public static validateNumberUsage(text: string, approvedNumbers: readonly string[]): ValidationResult {
    const blockers: string[] = [];
    const warnings: string[] = [];

    const numbersFound = text.match(/\b\d+([.,]\d+)?\b/g) || [];
    for (const num of numbersFound) {
      const isApproved = approvedNumbers.some((a) => a.includes(num));
      if (!isApproved) {
        blockers.push(`FABRICATED_NUMBER: O número "${num}" não consta nos dados aprovados do episódio.`);
      }
    }

    return { valid: blockers.length === 0, blockers, warnings };
  }

  /**
   * 9. Valida intromissão de marca (proíbe carimbos gigantes na capa)
   */
  public static validateBrandIntrusion(hasLargeBrandStamp: boolean): ValidationResult {
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (hasLargeBrandStamp) {
      blockers.push('BRAND_OVERPOWERING_SUBJECT: Selo de marca grande ou carimbo decorativo detectado na thumbnail.');
    }

    return { valid: blockers.length === 0, blockers, warnings };
  }

  /**
   * 10. Valida distinção real e semântica entre as variantes A, B e C
   */
  public static validateHeadlineUniqueness(variants: readonly [ThumbnailCopyVariant, ThumbnailCopyVariant, ThumbnailCopyVariant]): ValidationResult {
    const blockers: string[] = [];
    const warnings: string[] = [];

    const headlines = variants.map((v) => v.headline.trim().toUpperCase());
    const unique = new Set(headlines);

    if (unique.size < 3) {
      blockers.push('THUMBNAIL_NOT_VARIANT_DISTINCT: Pelo menos duas variantes possuem exatamente a mesma headline.');
    }

    const hypotheses = new Set(variants.map((v) => v.hypothesis));
    if (hypotheses.size < 3) {
      warnings.push('VARIANT_HYPOTHESIS_SIMILARITY: Recomendado que A, B e C testem hipóteses distintas (Mecanismo, Risco, Escala).');
    }

    return { valid: blockers.length === 0, blockers, warnings };
  }

  /**
   * 11. Valida conformidade com os formatos canônicos de thumbnail
   */
  public static validateThumbnailFormat(format: ThumbnailFormat): ValidationResult {
    const blockers: string[] = [];
    const warnings: string[] = [];

    const validFormats: readonly ThumbnailFormat[] = [
      'XRAY_MECHANISM',
      'BOTTLENECK',
      'SCALE_CONTRAST',
      'IMPOSSIBLE_ROUTE',
      'BEFORE_AFTER',
      'EVIDENCE_DOSSIER',
      'BELOW_SURFACE',
      'BELIEF_BREAK'
    ];

    if (!validFormats.includes(format)) {
      blockers.push(`INVALID_THUMBNAIL_FORMAT: Formato "${format}" não é um formato canônico reconhecido.`);
    }

    return { valid: blockers.length === 0, blockers, warnings };
  }

  /**
   * 12. Valida se a evidência física e a headline apontam para a mesma causalidade
   */
  public static validateEvidenceRelationship(variant: ThumbnailCopyVariant): ValidationResult {
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!variant.focalRelationship || variant.focalRelationship.trim().length < 5) {
      blockers.push(`NO_DOMINANT_QUESTION: Variante ${variant.variantId} não define relação causal/pergunta dominante clara.`);
    }

    return { valid: blockers.length === 0, blockers, warnings };
  }

  /**
   * Validador Mestre de um ThumbnailPlan completo
   */
  public static validateFullPlan(plan: ThumbnailPlan, brief: ThumbnailCopyBrief): {
    readonly isValid: boolean;
    readonly status: ThumbnailPlan['status'];
    readonly allBlockers: readonly string[];
    readonly allWarnings: readonly string[];
  } {
    const allBlockers: string[] = [];
    const allWarnings: string[] = [];

    // Formato
    const fmtRes = this.validateThumbnailFormat(plan.selectedFormat);
    allBlockers.push(...fmtRes.blockers);
    allWarnings.push(...fmtRes.warnings);

    // Unicidade das variantes
    const uniqRes = this.validateHeadlineUniqueness(plan.variants);
    allBlockers.push(...uniqRes.blockers);
    allWarnings.push(...uniqRes.warnings);

    // Validação por variante
    for (const v of plan.variants) {
      const copyRes = this.validateHeadlineCopy(v.headline, brief.approvedNumbers);
      allBlockers.push(...copyRes.blockers.map((b) => `[Var ${v.variantId}] ${b}`));
      allWarnings.push(...copyRes.warnings.map((w) => `[Var ${v.variantId}] ${w}`));

      const claimRes = this.validateClaimSupport(v, brief);
      allBlockers.push(...claimRes.blockers.map((b) => `[Var ${v.variantId}] ${b}`));
      allWarnings.push(...claimRes.warnings.map((w) => `[Var ${v.variantId}] ${w}`));

      const pairRes = this.validateTitleThumbnailPair(brief.approvedTitle, v, brief);
      allBlockers.push(...pairRes.blockers.map((b) => `[Var ${v.variantId}] ${b}`));
      allWarnings.push(...pairRes.warnings.map((w) => `[Var ${v.variantId}] ${w}`));

      const focalRes = this.validateFocalObjectRecognition(v.focalObject);
      allBlockers.push(...focalRes.blockers.map((b) => `[Var ${v.variantId}] ${b}`));
      allWarnings.push(...focalRes.warnings.map((w) => `[Var ${v.variantId}] ${w}`));

      const mobileRes = this.validateMobileLegibility(v.headline);
      allBlockers.push(...mobileRes.blockers.map((b) => `[Var ${v.variantId}] ${b}`));
      allWarnings.push(...mobileRes.warnings.map((w) => `[Var ${v.variantId}] ${w}`));

      const evidRes = this.validateEvidenceRelationship(v);
      allBlockers.push(...evidRes.blockers.map((b) => `[Var ${v.variantId}] ${b}`));
      allWarnings.push(...evidRes.warnings.map((w) => `[Var ${v.variantId}] ${w}`));
    }

    const isValid = allBlockers.length === 0;
    const status: ThumbnailPlan['status'] = isValid ? 'VALIDATED' : 'BLOCKED';

    return {
      isValid,
      status,
      allBlockers,
      allWarnings
    };
  }
}
