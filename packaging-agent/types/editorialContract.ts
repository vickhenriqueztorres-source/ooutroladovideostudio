import crypto from 'crypto';

export type ThumbnailFormat =
  | 'XRAY_MECHANISM'
  | 'BOTTLENECK'
  | 'SCALE_CONTRAST'
  | 'IMPOSSIBLE_ROUTE'
  | 'BEFORE_AFTER'
  | 'EVIDENCE_DOSSIER'
  | 'BELOW_SURFACE'
  | 'BELIEF_BREAK';

export type ThumbnailHypothesis = 'MECHANISM' | 'RISK' | 'SCALE';

export type TitleRelationship = 'COMPLEMENTARY' | 'CONTEXTUAL' | 'CONSEQUENCE';

export type ThumbnailPlanStatus = 'DRAFT' | 'VALIDATED' | 'BLOCKED' | 'HUMAN_REVIEW';

export const DISALLOWED_HEADLINE_VOCABULARY: readonly string[] = [
  'VOCÊ NÃO VAI ACREDITAR',
  'VOCE NAO VAI ACREDITAR',
  'CHOCANTE',
  'INACREDITÁVEL',
  'INACREDITAVEL',
  'SEGREDO PROIBIDO',
  'ELES ESCONDERAM',
  'A VERDADE ABSOLUTA',
  'NINGUÉM CONTA',
  'NINGUEM CONTA',
  'O MAIOR DE TODOS',
  '100% GARANTIDO',
  'REVOLUCIONÁRIO',
  'REVOLUCIONARIO',
  'NUNCA VISTO',
  'ELES NÃO QUEREM',
  'ELES NAO QUEREM',
  'A VERDADE REVELADA'
] as const;

export interface ThumbnailCopyBrief {
  readonly episodeId: string;
  readonly approvedTitle: string;
  readonly centralQuestion: string;
  readonly thesis: string;
  readonly objectOrFlow: string;
  readonly system: string;
  readonly constraint?: string;
  readonly consequence?: string;
  readonly targetAudience: string;
  readonly primaryClaimIds: readonly string[];
  readonly supportedEntities: readonly string[];
  readonly approvedNumbers: readonly string[];
  readonly visualEvidenceIds: readonly string[];
  readonly syntheticVisualsPresent: boolean;
  readonly thumbnailFormat: ThumbnailFormat;
}

export interface ThumbnailCopyVariant {
  readonly variantId: 'A' | 'B' | 'C';
  readonly hypothesis: ThumbnailHypothesis;
  readonly format: ThumbnailFormat;
  readonly visualConcept: string;
  readonly focalObject: string;
  readonly focalRelationship: string;
  readonly headline: string;
  readonly headlineWords: readonly string[];
  readonly headlineLength: number;
  readonly supportingText?: string;
  readonly titleRelationship: TitleRelationship;
  readonly curiosityQuestion: string;
  readonly supportedClaimIds: readonly string[];
  readonly disallowedElements: readonly string[];
  readonly confidence: number;
}

export interface ThumbnailPlan {
  readonly episodeId: string;
  readonly variants: readonly [ThumbnailCopyVariant, ThumbnailCopyVariant, ThumbnailCopyVariant];
  readonly selectedFormat: ThumbnailFormat;
  readonly sourceClaimIds: readonly string[];
  readonly titleHash: string;
  readonly copyBriefHash: string;
  readonly status: ThumbnailPlanStatus;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
}

export function computeBriefHash(brief: ThumbnailCopyBrief): string {
  const payload = JSON.stringify({
    episodeId: brief.episodeId,
    approvedTitle: brief.approvedTitle,
    thesis: brief.thesis,
    objectOrFlow: brief.objectOrFlow,
    system: brief.system,
    primaryClaimIds: [...brief.primaryClaimIds].sort(),
    approvedNumbers: [...brief.approvedNumbers].sort()
  });
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

export function computeTitleHash(title: string): string {
  return crypto.createHash('sha256').update(title.trim().toLowerCase()).digest('hex').slice(0, 16);
}
