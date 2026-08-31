import type { AssemblyPack, EvidenceBinding, RenderManifest } from "./final-assembly"

export type DistributionPlatform = "youtube" | "tiktok" | "instagram"
export type ThumbnailRole = "MECHANISM" | "CONSEQUENCE" | "FINAL_HANDOFF"

export type PackagingBlockingError =
  | "PACKAGING_INPUT_INVALID"
  | "MASTER_NOT_APPROVED"
  | "MASTER_RECEIPT_MISSING"
  | "MASTER_RECEIPT_HASH_MISMATCH"
  | "ASSEMBLY_PACK_VERSION_MISMATCH"
  | "ASSEMBLY_PACK_MUTATED"
  | "TOPIC_PROFILE_MISSING"
  | "CHANNEL_PROFILE_MISSING"
  | "PLATFORM_POLICIES_MISSING"
  | "DISTRIBUTION_STRATEGY_MISSING"
  | "TITLE_CANDIDATE_MISSING"
  | "TITLE_OPTIONS_INCOMPLETE"
  | "TITLE_CLAIM_UNSUPPORTED"
  | "TITLE_SENSATIONALIST"
  | "TITLE_LENGTH_INVALID"
  | "TITLE_KEYWORD_MISSING"
  | "TITLE_THUMBNAIL_MISMATCH"
  | "THUMBNAIL_BRIEF_MISSING"
  | "THUMBNAIL_VARIANTS_INCOMPLETE"
  | "THUMBNAIL_CONCEPTS_NOT_DISTINCT"
  | "THUMBNAIL_FABRICATED_EVIDENCE"
  | "THUMBNAIL_TEXT_ILLEGIBLE"
  | "THUMBNAIL_CTR_BELOW_TARGET"
  | "THUMBNAIL_PALETTE_INVALID"
  | "DESCRIPTION_CLAIM_UNSUPPORTED"
  | "DESCRIPTION_SOURCE_MISSING"
  | "DESCRIPTION_CTA_MISSING"
  | "TAGS_INVALID"
  | "CHAPTER_TIMESTAMP_INVALID"
  | "CHAPTER_COVERAGE_INCOMPLETE"
  | "SHORTS_CUTS_INVALID"
  | "SOURCE_DISCLOSURE_MISSING"
  | "SYNTHETIC_DISCLOSURE_MISSING"
  | "LOCALIZATION_MISMATCH"
  | "PLATFORM_POLICY_VIOLATION"
  | "PUBLISHING_MANIFEST_INVALID"
  | "HUMAN_SELECTION_INVALID"
  | "METADATA_HASH_MISSING"
  | "PUBLISH_APPROVAL_MISSING"
  | "PACKAGING_QC_FAILED"

export interface MasterApprovalReceipt {
  episodeId: string
  projectId: string
  assemblyPackId: string
  assemblyPackVersion: string
  state: "MASTER_APPROVED"
  approvedAt: string
  approvedBy: string
  timelineHash: string
  renderManifestHash: string
  captionHash: string
  evidenceManifestHash: string
  qcReportHash: string
  blockers: string[]
  warnings: string[]
  nextAgent: "PACKAGING_AGENT"
}

export type ClaimSupportStatus = "VERIFIED" | "UNCERTAIN" | "UNSUPPORTED"
export interface PackagingClaimRef { claimId: string; status: ClaimSupportStatus; conditionalLanguageApproved: boolean }
export interface PackagingSource { sourceId: string; title: string; url?: string; retrievedAt: string; verified: boolean }

export interface TopicProfile {
  primaryKeyword: string
  secondaryKeywords: string[]
  longTailKeywords: string[]
  hook: string
  promise: string
}

export interface ChannelProfile {
  channelName: string
  palette: ("graphite" | "coldblue" | "mutedred" | "controlledteal")[]
  defaultCta: string
  hashtags: string[]
  channelUrl?: string
  nextVideoUrl?: string
}

export interface PlatformPolicies {
  youtube: {
    maxTitleCharacters: number
    maxDescriptionCharacters: number
    maxTags: number
    minThumbnailContrast: number
    minEstimatedCtr: number
  }
  tiktok?: { minDurationSeconds: number; maxDurationSeconds: number; requiredFormat: "9:16" }
  instagram?: { minDurationSeconds: number; maxDurationSeconds: number; requiredFormat: "9:16"; maxHashtags: number }
}

export interface DistributionStrategy {
  primaryPlatform: "youtube"
  secondaryPlatforms: Exclude<DistributionPlatform, "youtube">[]
  publishMode: "manual" | "scheduled"
  scheduledTime?: string | null
}

export interface ThumbnailConceptInput {
  conceptId: string
  role: ThumbnailRole
  concept: string
  headline: string
  sourceEvidenceId: string
}

export interface TitleSeed { text: string; claimIds: string[] }

export interface TitleCandidate {
  titleId: string
  text: string
  claimIds: string[]
  rank: number
  sensationalismFlags: string[]
  characterCount: number
  keywordPosition: number
  promiseClarity: number
  curiosityScore: number
  sensationalismRisk: "low" | "medium" | "high"
  ctrEstimate: number
  pairedThumbnailId: string
  status: "APPROVED" | "REJECTED"
}

export interface ThumbnailVariant {
  thumbnailId: string
  role: ThumbnailRole
  concept: string
  sourceFrameId: string
  sourceEvidenceId: string
  overlayText: string
  textPosition: "upperThird"
  contrastRatio: number
  legibilityScore: number
  emotionDetected: "curiosity" | "tension" | "surprise"
  paletteAdherence: number
  estimatedCtr: number
  safeAreaValid: boolean
  representationLabels: string[]
  depictsRealEvidence: boolean
  imagePath: string
  mobilePreviewPath: string
  lineage: { baseImageHash: string; finalImageHash: string; mobilePreviewHash: string }
  status: "APPROVED" | "REJECTED"
}

/** Compatibility view for existing consumers. The recommended A/B/C variant is exposed here. */
export interface ThumbnailBrief {
  briefId: string
  concept: string
  overlayText: string
  overlayCharacterCount: number
  contrastRatio: number
  safeAreaValid: boolean
  representationLabels: string[]
  depictsRealEvidence: boolean
  evidenceIds: string[]
  status: "APPROVED" | "REJECTED"
}

export interface DescriptionLink { text: string; url: string }
export interface DescriptionDraft {
  descriptionId: string
  language: string
  hook: string
  summary: string
  body: string
  claimIds: string[]
  sourceIds: string[]
  links: DescriptionLink[]
  cta: string
  hashtags: string[]
  disclosureIncluded: boolean
  characterCount: number
  status: "APPROVED" | "REJECTED"
}

export interface Chapter { chapterId: string; title: string; startSec: number; endSec: number; blockId: string }
export interface TagBundle { tags: string[]; primaryTags: string[]; secondaryTags: string[]; longTailTags: string[]; tagCount: number; status: "APPROVED" | "REJECTED" }
export interface ShortsCut { cutId: string; title: string; startSec: number; endSec: number; durationSec: number; hook: string; format: "9:16"; caption: "embedded"; platform: DistributionPlatform[]; status: "PLANNED" | "REJECTED" }
export interface ShortsPlan { cuts: ShortsCut[]; cutCount: number; status: "APPROVED" | "REJECTED" }
export interface SourceDisclosure { disclosureId: string; language: string; text: string; sourceIds: string[]; complete: boolean }
export interface SyntheticDisclosure { disclosureId: string; language: string; text: string; representationTypes: string[]; required: boolean; present: boolean }

export interface PolicyValidation {
  youtube: { titleCompliant: boolean; descriptionCompliant: boolean; thumbnailCompliant: boolean; contentGuidelines: "approved" | "blocked"; copyrightRisk: "low" | "high"; misinformationRisk: "low" | "high" }
  tiktok?: { durationCompliant: boolean; formatCompliant: boolean; contentGuidelines: "approved" | "blocked" }
  instagram?: { durationCompliant: boolean; formatCompliant: boolean; captionCompliant: boolean; contentGuidelines: "approved" | "blocked" }
  status: "APPROVED" | "REJECTED"
}

export interface RecommendedSelection {
  titleId: string
  title: string
  thumbnailId: string
  thumbnailHeadline: string
  combination: string
  alternatives: { testId: "A" | "B" | "C"; titleId: string; title: string; thumbnailId: string; thumbnailHeadline: string }[]
}

export interface PublishingManifest {
  manifestId: string
  projectId: string
  assemblyPackHash: string
  videoPath: string
  videoHash: string
  thumbnailPath: string
  title: string
  description: string
  tags: string[]
  chapters: Chapter[]
  shortsCuts: ShortsCut[]
  platforms: DistributionPlatform[]
  publishMode: DistributionStrategy["publishMode"]
  scheduledTime: string | null
  status: "READY_FOR_REVIEW" | "READY_FOR_PUBLISH" | "BLOCKED"
}

export interface MetadataBundle {
  bundleId: string
  language: string
  selectedTitleId: string
  titleCandidates: TitleCandidate[]
  thumbnailBrief: ThumbnailBrief
  thumbnailOptions: ThumbnailVariant[]
  recommendedSelection: RecommendedSelection
  description: DescriptionDraft
  chapters: Chapter[]
  sourceDisclosure: SourceDisclosure
  syntheticDisclosure: SyntheticDisclosure
  tags: string[]
  tagBundle: TagBundle
  shortsCuts: ShortsPlan
  policyValidation: PolicyValidation
  publishingManifest: PublishingManifest
  metadataHash: string
}

export interface PackagingQC {
  receiptIntegrity: number
  promiseAlignment: number
  titleIntegrity: number
  thumbnailIntegrity: number
  descriptionIntegrity: number
  tagIntegrity: number
  chapterCoverage: number
  shortsIntegrity: number
  disclosureIntegrity: number
  localizationIntegrity: number
  policyIntegrity: number
  manifestIntegrity: number
  metadataReproducibility: number
  overall: number
}

export type PackagingCheckpointStage =
  | "PACKAGING_INPUT_VALIDATED"
  | "THUMBNAIL_GENERATED"
  | "TITLE_COMPILED"
  | "DESCRIPTION_COMPILED"
  | "TAGS_GENERATED"
  | "CHAPTERS_RESOLVED"
  | "SHORTS_PLANNED"
  | "POLICY_VALIDATED"
  | "MANIFEST_BUILT"
  | "DELIVERY_APPROVED"

export interface PackagingCheckpoint { projectId: string; runId: string; packagingPackId: string; stage: PackagingCheckpointStage; inputHash: string; artifactHash?: string; createdAt: string }

export interface PackagingInput {
  schemaVersion: string
  projectId: string
  runId: string
  episodeId: string
  packagingVersion: string
  masterApprovalReceipt: MasterApprovalReceipt
  assemblyPack: AssemblyPack
  renderManifest: RenderManifest
  topicProfile: TopicProfile
  channelProfile: ChannelProfile
  platformPolicies: PlatformPolicies
  distributionStrategy: DistributionStrategy
  claims: PackagingClaimRef[]
  sources: PackagingSource[]
  evidenceMatrix: EvidenceBinding[]
  thumbnailEvidenceIds: string[]
  thumbnailConcepts: ThumbnailConceptInput[]
  titleSeeds: TitleSeed[]
  descriptionSeed: string
  language: string
  forbiddenTitlePatterns: string[]
  qcThreshold: number
  publishApproval?: { approvedBy: string; approvedAt: string; selectedTitleId: string; selectedThumbnailId: string } | null
  checkpoint?: PackagingCheckpoint
}

export interface PackagingPack {
  schemaVersion: string
  projectId: string
  runId: string
  packagingPackId: string
  episodeId: string
  status: "DRAFT" | "NEEDS_REVIEW" | "BLOCKED" | "PACKAGING_READY"
  deliveryStatus: "DELIVERY_APPROVED" | "HUMAN_SELECTION_REQUIRED" | "BLOCKED"
  metadata: MetadataBundle
  packagingQC: PackagingQC
  blockingErrors: PackagingBlockingError[]
  warnings: string[]
  inputHashes: { masterReceipt: string; assemblyPack: string; renderManifest: string; distributionStrategy: string }
  packagingJobKey: string
  checkpoint: PackagingCheckpoint
  checkpointTrail: PackagingCheckpoint[]
  publishAuthorized: boolean
  nextAgent: "PUBLISH_AGENT" | "HUMAN_REVIEW"
}

export interface PackagingAdapter {
  buildThumbnailBrief(concept: string, overlayText: string, role?: ThumbnailRole): {
    contrastRatio: number
    safeAreaValid: boolean
    legibilityScore?: number
    paletteAdherence?: number
    emotionDetected?: ThumbnailVariant["emotionDetected"]
    estimatedCtr?: number
    baseImageHash?: string
    finalImageHash?: string
    mobilePreviewHash?: string
  }
}
