import type {
  Chapter,
  DescriptionDraft,
  DistributionPlatform,
  PackagingBlockingError,
  PackagingInput,
  PolicyValidation,
  PublishingManifest,
  RecommendedSelection,
  ShortsPlan,
  TagBundle,
  ThumbnailVariant,
  TitleCandidate,
} from "../contracts/packaging"
import { packagingHash } from "./validation"

const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))]

export function buildTags(i: PackagingInput) {
  const primaryTags = unique([i.topicProfile.primaryKeyword, ...i.topicProfile.secondaryKeywords.slice(0, 2)])
  const secondaryTags = unique(i.topicProfile.secondaryKeywords.slice(2).concat(i.topicProfile.longTailKeywords.slice(0, 2)))
  const longTailTags = unique(i.topicProfile.longTailKeywords)
  const tags = unique([...primaryTags, ...secondaryTags, ...longTailTags, i.channelProfile.channelName]).slice(0, i.platformPolicies.youtube.maxTags)
  const valid = primaryTags.length >= 1 && tags.length >= 3 && tags.length <= i.platformPolicies.youtube.maxTags
  const bundle: TagBundle = { tags, primaryTags, secondaryTags, longTailTags, tagCount: tags.length, status: valid ? "APPROVED" : "REJECTED" }
  return { bundle, errors: valid ? [] : ["TAGS_INVALID" as PackagingBlockingError] }
}

export function planShortsCuts(i: PackagingInput, chapters: Chapter[]) {
  const errors: PackagingBlockingError[] = []
  const duration = i.assemblyPack.timelineCompilation.durationSeconds
  const count = Math.min(5, Math.max(3, chapters.length))
  const cutDuration = Math.min(60, duration / count)
  const platforms: DistributionPlatform[] = [i.distributionStrategy.primaryPlatform, ...i.distributionStrategy.secondaryPlatforms]
  const cuts = Array.from({ length: count }, (_, index) => {
    const startSec = Number((index * cutDuration).toFixed(3))
    const endSec = Number(Math.min(duration, startSec + cutDuration).toFixed(3))
    const chapter = chapters.find((entry) => startSec >= entry.startSec && startSec < entry.endSec) ?? chapters[Math.min(index, chapters.length - 1)]
    const cue = i.assemblyPack.captionTrack.cues.find((entry) => entry.startSec >= startSec && entry.startSec < endSec) ?? i.assemblyPack.captionTrack.cues[0]
    const actualDuration = Number((endSec - startSec).toFixed(3))
    const status = actualDuration >= 15 && actualDuration <= 60 ? "PLANNED" as const : "REJECTED" as const
    return {
      cutId: `SHORT-${index + 1}`,
      title: chapter?.title ?? `Momento ${index + 1}`,
      startSec,
      endSec,
      durationSec: actualDuration,
      hook: cue?.text ?? i.topicProfile.hook,
      format: "9:16" as const,
      caption: "embedded" as const,
      platform: platforms,
      status,
    }
  })
  if (cuts.length < 3 || cuts.length > 5 || cuts.some((cut) => cut.status === "REJECTED")) errors.push("SHORTS_CUTS_INVALID")
  const plan: ShortsPlan = { cuts, cutCount: cuts.length, status: errors.length ? "REJECTED" : "APPROVED" }
  return { plan, errors }
}

export function buildRecommendation(titles: TitleCandidate[], thumbnails: ThumbnailVariant[]): RecommendedSelection {
  const approvedTitles = titles.filter((title) => title.status === "APPROVED")
  const approvedThumbnails = thumbnails.filter((thumbnail) => thumbnail.status === "APPROVED")
  const selectedTitle = approvedTitles[0] ?? titles[0]
  const selectedThumbnail = approvedThumbnails.find((thumbnail) => thumbnail.thumbnailId === selectedTitle?.pairedThumbnailId) ?? approvedThumbnails[0] ?? thumbnails[0]
  const alternatives = (["A", "B", "C"] as const).map((testId, index) => ({
    testId,
    titleId: titles[index]?.titleId ?? "",
    title: titles[index]?.text ?? "",
    thumbnailId: thumbnails[index]?.thumbnailId ?? "",
    thumbnailHeadline: thumbnails[index]?.overlayText ?? "",
  }))
  return {
    titleId: selectedTitle?.titleId ?? "",
    title: selectedTitle?.text ?? "",
    thumbnailId: selectedThumbnail?.thumbnailId ?? "",
    thumbnailHeadline: selectedThumbnail?.overlayText ?? "",
    combination: `${selectedTitle?.text ?? ""} + ${selectedThumbnail?.overlayText ?? ""}`,
    alternatives,
  }
}

export function validatePolicies(i: PackagingInput, title: TitleCandidate | undefined, description: DescriptionDraft, thumbnails: ThumbnailVariant[], shorts: ShortsPlan, contentErrors: PackagingBlockingError[]) {
  const requested = new Set(i.distributionStrategy.secondaryPlatforms)
  const youtube = {
    titleCompliant: Boolean(title && title.status === "APPROVED" && title.characterCount <= i.platformPolicies.youtube.maxTitleCharacters),
    descriptionCompliant: description.status === "APPROVED" && description.characterCount <= i.platformPolicies.youtube.maxDescriptionCharacters,
    thumbnailCompliant: thumbnails.length === 3 && thumbnails.every((thumbnail) => thumbnail.status === "APPROVED"),
    contentGuidelines: contentErrors.some((error) => error === "TITLE_CLAIM_UNSUPPORTED" || error === "DESCRIPTION_CLAIM_UNSUPPORTED" || error === "THUMBNAIL_FABRICATED_EVIDENCE") ? "blocked" as const : "approved" as const,
    copyrightRisk: i.sources.some((source) => !source.verified) ? "high" as const : "low" as const,
    misinformationRisk: contentErrors.some((error) => error.includes("CLAIM_UNSUPPORTED") || error === "THUMBNAIL_FABRICATED_EVIDENCE") ? "high" as const : "low" as const,
  }
  const tiktok = requested.has("tiktok") ? {
    durationCompliant: Boolean(i.platformPolicies.tiktok && shorts.cuts.every((cut) => cut.durationSec >= i.platformPolicies.tiktok!.minDurationSeconds && cut.durationSec <= i.platformPolicies.tiktok!.maxDurationSeconds)),
    formatCompliant: Boolean(i.platformPolicies.tiktok && shorts.cuts.every((cut) => cut.format === i.platformPolicies.tiktok!.requiredFormat)),
    contentGuidelines: youtube.contentGuidelines,
  } : undefined
  const instagram = requested.has("instagram") ? {
    durationCompliant: Boolean(i.platformPolicies.instagram && shorts.cuts.every((cut) => cut.durationSec >= i.platformPolicies.instagram!.minDurationSeconds && cut.durationSec <= i.platformPolicies.instagram!.maxDurationSeconds)),
    formatCompliant: Boolean(i.platformPolicies.instagram && shorts.cuts.every((cut) => cut.format === i.platformPolicies.instagram!.requiredFormat)),
    captionCompliant: Boolean(i.platformPolicies.instagram && description.hashtags.length <= i.platformPolicies.instagram!.maxHashtags),
    contentGuidelines: youtube.contentGuidelines,
  } : undefined
  const approved = Object.values(youtube).every((value) => value === true || value === "approved" || value === "low")
    && (!tiktok || Object.values(tiktok).every((value) => value === true || value === "approved"))
    && (!instagram || Object.values(instagram).every((value) => value === true || value === "approved"))
  const validation: PolicyValidation = { youtube, ...(tiktok ? { tiktok } : {}), ...(instagram ? { instagram } : {}), status: approved ? "APPROVED" : "REJECTED" }
  return { validation, errors: approved ? [] : ["PLATFORM_POLICY_VIOLATION" as PackagingBlockingError] }
}

export function buildPublishingManifest(i: PackagingInput, recommendation: RecommendedSelection, description: DescriptionDraft, tags: TagBundle, chapters: Chapter[], shorts: ShortsPlan, blocked: boolean, publishAuthorized: boolean) {
  const thumbnail = recommendation.thumbnailId ? `outputs/${i.episodeId}-thumbnail-${recommendation.thumbnailId.slice(-1)}.png` : ""
  const manifest: PublishingManifest = {
    manifestId: `PUB-${i.episodeId}`,
    projectId: i.projectId,
    assemblyPackHash: packagingHash(i.assemblyPack),
    videoPath: i.renderManifest.outputPath,
    videoHash: i.renderManifest.outputHash,
    thumbnailPath: thumbnail,
    title: recommendation.title,
    description: description.body,
    tags: tags.tags,
    chapters,
    shortsCuts: shorts.cuts,
    platforms: [i.distributionStrategy.primaryPlatform, ...i.distributionStrategy.secondaryPlatforms],
    publishMode: i.distributionStrategy.publishMode,
    scheduledTime: i.distributionStrategy.scheduledTime ?? null,
    status: blocked ? "BLOCKED" : publishAuthorized ? "READY_FOR_PUBLISH" : "READY_FOR_REVIEW",
  }
  const valid = Boolean(manifest.videoPath && manifest.videoHash && manifest.thumbnailPath && manifest.title && manifest.description && manifest.tags.length && manifest.chapters.length && manifest.shortsCuts.length)
  return { manifest, errors: valid ? [] : ["PUBLISHING_MANIFEST_INVALID" as PackagingBlockingError] }
}
