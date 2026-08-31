import type { Chapter, DescriptionDraft, PackagingBlockingError, PackagingInput } from "../contracts/packaging"

const numbers = (text: string) => text.match(/\d+(?:[.,]\d+)?/g) ?? []
const stamp = (seconds: number) => {
  const value = Math.floor(seconds)
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor(value % 3600 / 60)
  const secs = value % 60
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${minutes}:${String(secs).padStart(2, "0")}`
}

export function resolveChapters(i: PackagingInput) {
  const errors: PackagingBlockingError[] = []
  const blocks = [...i.assemblyPack.timelineCompilation.blocks]
  const duration = i.assemblyPack.timelineCompilation.durationSeconds
  const chapters: Chapter[] = blocks.map((block, index) => {
    const cue = i.assemblyPack.captionTrack.cues.find((entry) => entry.startSec >= block.startSec && entry.startSec < block.endSec)
    return { chapterId: `CHAPTER-${index + 1}`, title: cue ? cue.text.slice(0, 60) : block.blockId, startSec: block.startSec, endSec: block.endSec, blockId: block.blockId }
  })

  if (!chapters.length || chapters[0].startSec !== 0) errors.push("CHAPTER_TIMESTAMP_INVALID")
  for (let index = 0; index < chapters.length; index += 1) {
    const chapter = chapters[index]
    if (chapter.endSec <= chapter.startSec || chapter.endSec > duration + 0.01) errors.push("CHAPTER_TIMESTAMP_INVALID")
    if (index && Math.abs(chapter.startSec - chapters[index - 1].endSec) > 0.01) errors.push("CHAPTER_TIMESTAMP_INVALID")
  }
  const covered = chapters.reduce((total, chapter) => total + chapter.endSec - chapter.startSec, 0)
  if (Math.abs(covered - duration) > 0.01) errors.push("CHAPTER_COVERAGE_INCOMPLETE")
  return { chapters, errors: [...new Set(errors)] }
}

export function compileDescription(i: PackagingInput, chapters: Chapter[], disclosureText: string) {
  const errors: PackagingBlockingError[] = []
  const corpus = i.assemblyPack.captionTrack.cues.map((cue) => cue.text).join(" ")
  const fabricated = numbers(i.descriptionSeed).filter((number) => !corpus.includes(number))
  const unsupportedReferenced = i.claims.filter((claim) => claim.status === "UNSUPPORTED" && i.descriptionSeed.includes(claim.claimId))
  if (fabricated.length || unsupportedReferenced.length) errors.push("DESCRIPTION_CLAIM_UNSUPPORTED")

  const verifiedSources = i.sources.filter((source) => source.verified)
  if (!verifiedSources.length) errors.push("DESCRIPTION_SOURCE_MISSING")
  if (!i.channelProfile.defaultCta.trim()) errors.push("DESCRIPTION_CTA_MISSING")

  const claimIds = i.claims.filter((claim) => claim.status === "VERIFIED" || claim.status === "UNCERTAIN" && claim.conditionalLanguageApproved).map((claim) => claim.claimId)
  const links = verifiedSources.filter((source) => source.url).map((source) => ({ text: `Fonte: ${source.title}`, url: source.url! }))
  if (i.channelProfile.channelUrl) links.push({ text: i.channelProfile.channelName, url: i.channelProfile.channelUrl })
  if (i.channelProfile.nextVideoUrl) links.push({ text: "Próximo vídeo", url: i.channelProfile.nextVideoUrl })
  const hashtags = [...new Set(i.channelProfile.hashtags)].slice(0, 5)
  const body = [
    i.topicProfile.hook.trim(),
    i.topicProfile.promise.trim(),
    "",
    i.descriptionSeed.trim(),
    "",
    "Capítulos:",
    ...chapters.map((chapter) => `${stamp(chapter.startSec)} ${chapter.title}`),
    "",
    "Links e fontes:",
    ...links.map((link) => `${link.text} — ${link.url}`),
    "",
    i.channelProfile.defaultCta.trim(),
    "",
    disclosureText,
    "",
    hashtags.join(" "),
  ].join("\n")

  if (body.length > i.platformPolicies.youtube.maxDescriptionCharacters) errors.push("PLATFORM_POLICY_VIOLATION")
  const description: DescriptionDraft = {
    descriptionId: `DESC-${i.episodeId}`,
    language: i.language,
    hook: i.topicProfile.hook,
    summary: i.descriptionSeed,
    body,
    claimIds,
    sourceIds: verifiedSources.map((source) => source.sourceId),
    links,
    cta: i.channelProfile.defaultCta,
    hashtags,
    disclosureIncluded: Boolean(disclosureText),
    characterCount: body.length,
    status: errors.length ? "REJECTED" : "APPROVED",
  }
  return { description, errors: [...new Set(errors)] }
}
