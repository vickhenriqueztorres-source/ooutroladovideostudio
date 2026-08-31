import type { PackagingBlockingError, PackagingInput, ThumbnailVariant, TitleCandidate } from "../contracts/packaging"

const MIN = 15
const MAX = 100
const numbers = (text: string) => text.match(/\d+(?:[.,]\d+)?/g) ?? []
const normalized = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

export function resolveTitles(i: PackagingInput, thumbnails: ThumbnailVariant[]) {
  const errors: PackagingBlockingError[] = []
  const corpus = i.assemblyPack.captionTrack.cues.map((cue) => cue.text).join(" ")
  const claimById = new Map(i.claims.map((claim) => [claim.claimId, claim]))
  const seeds = i.titleSeeds.slice(0, 3)

  if (i.titleSeeds.length !== 3) errors.push("TITLE_OPTIONS_INCOMPLETE")

  const candidates: TitleCandidate[] = seeds.map((seed, index) => {
    const flags = i.forbiddenTitlePatterns.filter((pattern) => pattern && normalized(seed.text).includes(normalized(pattern)))
    const lengthInvalid = seed.text.length < MIN || seed.text.length > Math.min(MAX, i.platformPolicies.youtube.maxTitleCharacters)
    const fabricated = numbers(seed.text).filter((number) => !corpus.includes(number))
    const claimIssue = seed.claimIds.some((id) => {
      const claim = claimById.get(id)
      return !claim || claim.status === "UNSUPPORTED" || claim.status === "UNCERTAIN" && !claim.conditionalLanguageApproved
    })
    const keywordPosition = normalized(seed.text).indexOf(normalized(i.topicProfile.primaryKeyword))
    const keywordInvalid = keywordPosition < 0 || keywordPosition >= 40
    const pairedThumbnail = thumbnails[index]
    const repeatsHeadline = pairedThumbnail ? normalized(seed.text).includes(normalized(pairedThumbnail.overlayText)) : true

    if (flags.length) errors.push("TITLE_SENSATIONALIST")
    if (lengthInvalid) errors.push("TITLE_LENGTH_INVALID")
    if (fabricated.length || claimIssue) errors.push("TITLE_CLAIM_UNSUPPORTED")
    if (keywordInvalid) errors.push("TITLE_KEYWORD_MISSING")
    if (!pairedThumbnail || repeatsHeadline) errors.push("TITLE_THUMBNAIL_MISMATCH")

    const curiosityScore = Math.min(0.95, 0.72 + Math.min(seed.text.split(/\s+/).length, 12) * 0.015)
    const promiseClarity = seed.text.includes(":") || /como|por que|o que/i.test(seed.text) ? 0.92 : 0.84
    const rejected = flags.length > 0 || lengthInvalid || fabricated.length > 0 || claimIssue || keywordInvalid || !pairedThumbnail || repeatsHeadline

    return {
      titleId: `TITLE-${index + 1}`,
      text: seed.text,
      claimIds: [...seed.claimIds],
      rank: index + 1,
      sensationalismFlags: flags,
      characterCount: seed.text.length,
      keywordPosition,
      promiseClarity,
      curiosityScore,
      sensationalismRisk: flags.length ? "high" : "low",
      ctrEstimate: Math.min(0.095, 0.058 + curiosityScore * 0.02),
      pairedThumbnailId: pairedThumbnail?.thumbnailId ?? "",
      status: rejected ? "REJECTED" : "APPROVED",
    }
  })

  const selected = candidates.find((candidate) => candidate.status === "APPROVED")
  if (!selected) errors.push("TITLE_CANDIDATE_MISSING")
  return { candidates, selected, errors: [...new Set(errors)] }
}
