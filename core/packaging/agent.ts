import type {
  MetadataBundle,
  PackagingAdapter,
  PackagingBlockingError,
  PackagingCheckpoint,
  PackagingCheckpointStage,
  PackagingInput,
  PackagingPack,
  RecommendedSelection,
  ThumbnailBrief,
} from "../contracts/packaging"
import { PackagingInputSchema } from "../schemas/packaging"
import { compileDescription, resolveChapters } from "./description"
import { buildPublishingManifest, buildRecommendation, buildTags, planShortsCuts, validatePolicies } from "./distribution"
import { resolveDisclosures } from "./disclosure"
import { buildPackagingQC } from "./qc"
import { buildThumbnailBrief } from "./thumbnail"
import { resolveTitles } from "./titles"
import { packagingHash, validatePackagingInput } from "./validation"

const CHECKPOINT_STAGES: PackagingCheckpointStage[] = [
  "PACKAGING_INPUT_VALIDATED",
  "THUMBNAIL_GENERATED",
  "TITLE_COMPILED",
  "DESCRIPTION_COMPILED",
  "TAGS_GENERATED",
  "CHAPTERS_RESOLVED",
  "SHORTS_PLANNED",
  "POLICY_VALIDATED",
  "MANIFEST_BUILT",
  "DELIVERY_APPROVED",
]

export const packagingJobKey = (input: PackagingInput) => packagingHash([
  input.projectId,
  packagingHash(input.assemblyPack),
  packagingHash(input.distributionStrategy),
  input.packagingVersion,
])

const stageFor = (errors: PackagingBlockingError[], deliveryApproved: boolean): PackagingCheckpointStage => {
  if (errors.some((error) => /^(MASTER|ASSEMBLY_PACK|PACKAGING_INPUT|TOPIC_PROFILE|CHANNEL_PROFILE|PLATFORM_POLICIES|DISTRIBUTION_STRATEGY|LOCALIZATION)/.test(error))) return "PACKAGING_INPUT_VALIDATED"
  if (errors.some((error) => error.startsWith("THUMBNAIL"))) return "PACKAGING_INPUT_VALIDATED"
  if (errors.some((error) => error.startsWith("TITLE"))) return "THUMBNAIL_GENERATED"
  if (errors.some((error) => error.startsWith("DESCRIPTION") || error.includes("DISCLOSURE"))) return "TITLE_COMPILED"
  if (errors.some((error) => error.startsWith("TAGS"))) return "DESCRIPTION_COMPILED"
  if (errors.some((error) => error.startsWith("CHAPTER"))) return "TAGS_GENERATED"
  if (errors.some((error) => error.startsWith("SHORTS"))) return "CHAPTERS_RESOLVED"
  if (errors.some((error) => error.startsWith("PLATFORM_POLICY"))) return "SHORTS_PLANNED"
  if (errors.some((error) => error.startsWith("PUBLISHING_MANIFEST"))) return "POLICY_VALIDATED"
  if (errors.some((error) => error === "HUMAN_SELECTION_INVALID")) return "MANIFEST_BUILT"
  if (errors.length) return "POLICY_VALIDATED"
  return deliveryApproved ? "DELIVERY_APPROVED" : "MANIFEST_BUILT"
}

const checkpointTrail = (input: PackagingInput, packagingPackId: string, key: string, metadataHash: string, finalStage: PackagingCheckpointStage) => {
  const finalIndex = CHECKPOINT_STAGES.indexOf(finalStage)
  return CHECKPOINT_STAGES.slice(0, finalIndex + 1).map<PackagingCheckpoint>((stage) => ({
    projectId: input.projectId,
    runId: input.runId,
    packagingPackId,
    stage,
    inputHash: key,
    artifactHash: stage === "MANIFEST_BUILT" || stage === "DELIVERY_APPROVED" ? metadataHash : undefined,
    createdAt: new Date(0).toISOString(),
  }))
}

const applyHumanSelection = (recommendation: RecommendedSelection, input: PackagingInput, valid: boolean): RecommendedSelection => {
  if (!valid || !input.publishApproval) return recommendation
  const selected = recommendation.alternatives.find((option) => option.titleId === input.publishApproval!.selectedTitleId && option.thumbnailId === input.publishApproval!.selectedThumbnailId)
  return selected ? {
    ...recommendation,
    titleId: selected.titleId,
    title: selected.title,
    thumbnailId: selected.thumbnailId,
    thumbnailHeadline: selected.thumbnailHeadline,
    combination: `${selected.title} + ${selected.thumbnailHeadline}`,
  } : recommendation
}

export function runPackaging(raw: PackagingInput, adapter: PackagingAdapter): PackagingPack {
  PackagingInputSchema.parse(raw)
  const input = raw
  const key = packagingJobKey(input)
  const packagingPackId = `packaging-${key.slice(7, 19)}`
  const warnings: string[] = []
  const inputHashes = {
    masterReceipt: packagingHash(input.masterApprovalReceipt),
    assemblyPack: packagingHash(input.assemblyPack),
    renderManifest: packagingHash(input.renderManifest),
    distributionStrategy: packagingHash(input.distributionStrategy),
  }

  const inputErrors = validatePackagingInput(input)
  const thumbnails = buildThumbnailBrief(input, adapter)
  const titles = resolveTitles(input, thumbnails.options)
  const disclosures = resolveDisclosures(input)
  const chapters = resolveChapters(input)
  const description = compileDescription(input, chapters.chapters, disclosures.disclosureText)
  const tags = buildTags(input)
  const shorts = planShortsCuts(input, chapters.chapters)
  const contentErrors = [...new Set<PackagingBlockingError>([
    ...inputErrors,
    ...thumbnails.errors,
    ...titles.errors,
    ...description.errors,
    ...tags.errors,
    ...chapters.errors,
    ...shorts.errors,
    ...disclosures.errors,
  ])]

  let recommendation = buildRecommendation(titles.candidates, thumbnails.options)
  const selectedTitle = titles.candidates.find((candidate) => candidate.titleId === recommendation.titleId)
  const policy = validatePolicies(input, selectedTitle, description.description, thumbnails.options, shorts.plan, contentErrors)
  const approval = input.publishApproval
  const selectedApprovalTitle = titles.candidates.find((candidate) => candidate.titleId === approval?.selectedTitleId && candidate.status === "APPROVED")
  const selectedApprovalThumbnail = thumbnails.options.find((variant) => variant.thumbnailId === approval?.selectedThumbnailId && variant.status === "APPROVED")
  const approvalValid = Boolean(approval && selectedApprovalTitle && selectedApprovalThumbnail && selectedApprovalTitle.pairedThumbnailId === selectedApprovalThumbnail.thumbnailId)
  const approvalErrors: PackagingBlockingError[] = approval && !approvalValid ? ["HUMAN_SELECTION_INVALID"] : []
  recommendation = applyHumanSelection(recommendation, input, approvalValid)

  const preManifestErrors = [...new Set<PackagingBlockingError>([...contentErrors, ...policy.errors, ...approvalErrors])]
  const initialManifest = buildPublishingManifest(input, recommendation, description.description, tags.bundle, chapters.chapters, shorts.plan, preManifestErrors.length > 0, false)
  const errors = [...new Set<PackagingBlockingError>([...preManifestErrors, ...initialManifest.errors])]

  const brief: ThumbnailBrief = thumbnails.brief ?? {
    briefId: `THB-${packagingPackId}`,
    concept: "",
    overlayText: "",
    overlayCharacterCount: 0,
    contrastRatio: 0,
    safeAreaValid: false,
    representationLabels: [],
    depictsRealEvidence: false,
    evidenceIds: [],
    status: "REJECTED",
  }

  const counts = {
    totalTitles: titles.candidates.length,
    approvedTitles: titles.candidates.filter((candidate) => candidate.status === "APPROVED").length,
    totalThumbnails: thumbnails.options.length,
    approvedThumbnails: thumbnails.options.filter((variant) => variant.status === "APPROVED").length,
    chapters: chapters.chapters.length,
    validChapters: chapters.chapters.filter((chapter) => chapter.endSec > chapter.startSec).length,
    shorts: shorts.plan.cuts.length,
    validShorts: shorts.plan.cuts.filter((cut) => cut.status === "PLANNED").length,
  }
  const preliminaryQC = buildPackagingQC(errors, counts)
  if (preliminaryQC.overall < input.qcThreshold) errors.push("PACKAGING_QC_FAILED")
  const uniqueErrors = [...new Set(errors)]
  const packagingQC = buildPackagingQC(uniqueErrors, counts)
  const ready = uniqueErrors.length === 0 && packagingQC.overall >= input.qcThreshold
  const publishAuthorized = ready && approvalValid
  const finalManifest = buildPublishingManifest(input, recommendation, description.description, tags.bundle, chapters.chapters, shorts.plan, !ready, publishAuthorized).manifest

  const metadataCore = {
    language: input.language,
    selectedTitleId: recommendation.titleId,
    titleCandidates: titles.candidates,
    thumbnailBrief: brief,
    thumbnailOptions: thumbnails.options,
    recommendedSelection: recommendation,
    description: description.description,
    chapters: chapters.chapters,
    sourceDisclosure: disclosures.sourceDisclosure,
    syntheticDisclosure: disclosures.syntheticDisclosure,
    tags: tags.bundle.tags,
    tagBundle: tags.bundle,
    shortsCuts: shorts.plan,
    policyValidation: policy.validation,
    publishingManifest: finalManifest,
  }
  const metadataHash = packagingHash(metadataCore)
  if (!metadataHash) uniqueErrors.push("METADATA_HASH_MISSING")
  const metadata: MetadataBundle = { bundleId: `meta-${packagingPackId}`, ...metadataCore, metadataHash }

  if (ready && !publishAuthorized) warnings.push("PUBLISH_APPROVAL_MISSING", "HUMAN_SELECTION_REQUIRED")
  const deliveryStatus = !ready ? "BLOCKED" as const : publishAuthorized ? "DELIVERY_APPROVED" as const : "HUMAN_SELECTION_REQUIRED" as const
  const finalStage = stageFor(uniqueErrors, deliveryStatus === "DELIVERY_APPROVED")
  const trail = checkpointTrail(input, packagingPackId, key, metadataHash, finalStage)

  return {
    schemaVersion: input.schemaVersion,
    projectId: input.projectId,
    runId: input.runId,
    packagingPackId,
    episodeId: input.episodeId,
    status: ready ? "PACKAGING_READY" : uniqueErrors.length ? "BLOCKED" : "NEEDS_REVIEW",
    deliveryStatus,
    metadata,
    packagingQC,
    blockingErrors: uniqueErrors,
    warnings,
    inputHashes,
    packagingJobKey: key,
    checkpoint: trail.at(-1)!,
    checkpointTrail: trail,
    publishAuthorized,
    nextAgent: publishAuthorized ? "PUBLISH_AGENT" : "HUMAN_REVIEW",
  }
}
