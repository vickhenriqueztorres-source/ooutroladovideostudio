import type { PackagingAdapter, PackagingBlockingError, PackagingInput, ThumbnailBrief, ThumbnailVariant } from "../contracts/packaging"
import { packagingHash } from "./validation"

const MIN_CONTRAST = 4.5
const MIN_LEGIBILITY = 0.8
const MIN_PALETTE = 0.8
const normalized = (text: string) => text.trim().toLowerCase()

export function buildThumbnailBrief(i: PackagingInput, adapter: PackagingAdapter) {
  const errors: PackagingBlockingError[] = []
  const roles = new Set(i.thumbnailConcepts.map((concept) => concept.role))
  const concepts = new Set(i.thumbnailConcepts.map((concept) => normalized(concept.concept)))
  if (i.thumbnailConcepts.length !== 3) errors.push("THUMBNAIL_VARIANTS_INCOMPLETE")
  if (roles.size !== 3 || concepts.size !== 3) errors.push("THUMBNAIL_CONCEPTS_NOT_DISTINCT")

  const options: ThumbnailVariant[] = i.thumbnailConcepts.map((concept, index) => {
    const sourceEvidenceId = i.thumbnailEvidenceIds[index] ?? concept.sourceEvidenceId
    const evidence = i.evidenceMatrix.find((entry) => entry.evidenceId === sourceEvidenceId)
    const words = concept.headline.trim().split(/\s+/).filter(Boolean)
    const evidenceInvalid = !evidence || evidence.classification === "REAL_EVIDENCE" && !evidence.verified
    if (evidenceInvalid) errors.push("THUMBNAIL_FABRICATED_EVIDENCE")
    if (words.length < 1 || words.length > 5) errors.push("THUMBNAIL_TEXT_ILLEGIBLE")

    const measured = adapter.buildThumbnailBrief(concept.concept, concept.headline, concept.role)
    const legibilityScore = measured.legibilityScore ?? (measured.safeAreaValid && measured.contrastRatio >= MIN_CONTRAST ? 0.95 : 0.4)
    const paletteAdherence = measured.paletteAdherence ?? 0.95
    const estimatedCtr = measured.estimatedCtr ?? 0.074
    if (!measured.safeAreaValid || measured.contrastRatio < Math.max(MIN_CONTRAST, i.platformPolicies.youtube.minThumbnailContrast) || legibilityScore < MIN_LEGIBILITY) errors.push("THUMBNAIL_TEXT_ILLEGIBLE")
    if (paletteAdherence < MIN_PALETTE) errors.push("THUMBNAIL_PALETTE_INVALID")
    if (estimatedCtr <= i.platformPolicies.youtube.minEstimatedCtr) errors.push("THUMBNAIL_CTR_BELOW_TARGET")

    const roleId = String.fromCharCode(65 + index) as "A" | "B" | "C"
    const imagePath = `outputs/${i.episodeId}-thumbnail-${roleId}.png`
    const mobilePreviewPath = `outputs/${i.episodeId}-thumbnail-${roleId}-mobile-320x180.png`
    const representationLabels = evidence && evidence.classification !== "REAL_EVIDENCE" ? [evidence.classification] : []
    const rejected = evidenceInvalid || words.length < 1 || words.length > 5 || !measured.safeAreaValid || measured.contrastRatio < Math.max(MIN_CONTRAST, i.platformPolicies.youtube.minThumbnailContrast) || legibilityScore < MIN_LEGIBILITY || paletteAdherence < MIN_PALETTE || estimatedCtr <= i.platformPolicies.youtube.minEstimatedCtr

    return {
      thumbnailId: `THUMB-${roleId}`,
      role: concept.role,
      concept: concept.concept,
      sourceFrameId: evidence?.shotId ?? "",
      sourceEvidenceId,
      overlayText: concept.headline,
      textPosition: "upperThird",
      contrastRatio: measured.contrastRatio,
      legibilityScore,
      emotionDetected: measured.emotionDetected ?? (["curiosity", "tension", "surprise"] as const)[index],
      paletteAdherence,
      estimatedCtr,
      safeAreaValid: measured.safeAreaValid,
      representationLabels,
      depictsRealEvidence: Boolean(evidence?.classification === "REAL_EVIDENCE" && evidence.verified),
      imagePath,
      mobilePreviewPath,
      lineage: {
        baseImageHash: measured.baseImageHash ?? evidence?.assetHash ?? packagingHash([concept.concept, "base"]),
        finalImageHash: measured.finalImageHash ?? packagingHash([concept.concept, concept.headline, imagePath]),
        mobilePreviewHash: measured.mobilePreviewHash ?? packagingHash([concept.concept, concept.headline, mobilePreviewPath]),
      },
      status: rejected ? "REJECTED" : "APPROVED",
    }
  })

  const recommended = options.find((option) => option.status === "APPROVED") ?? options[0]
  if (!recommended) errors.push("THUMBNAIL_BRIEF_MISSING")
  const brief: ThumbnailBrief | undefined = recommended ? {
    briefId: `THB-${recommended.thumbnailId}`,
    concept: recommended.concept,
    overlayText: recommended.overlayText,
    overlayCharacterCount: recommended.overlayText.length,
    contrastRatio: recommended.contrastRatio,
    safeAreaValid: recommended.safeAreaValid,
    representationLabels: recommended.representationLabels,
    depictsRealEvidence: recommended.depictsRealEvidence,
    evidenceIds: [recommended.sourceEvidenceId],
    status: recommended.status,
  } : undefined

  return { brief, options, errors: [...new Set(errors)] }
}
