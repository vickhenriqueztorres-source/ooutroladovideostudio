import type { PackagingBlockingError, PackagingQC } from "../contracts/packaging"

const gate = (errors: PackagingBlockingError[], prefixes: string[]) => errors.some((error) => prefixes.some((prefix) => error.startsWith(prefix))) ? 0 : 1

export function buildPackagingQC(errors: PackagingBlockingError[], counts: { totalTitles: number; approvedTitles: number; totalThumbnails: number; approvedThumbnails: number; chapters: number; validChapters: number; shorts: number; validShorts: number }): PackagingQC {
  const quality = {
    receiptIntegrity: gate(errors, ["MASTER", "ASSEMBLY_PACK", "PACKAGING_INPUT", "TOPIC_PROFILE", "CHANNEL_PROFILE", "PLATFORM_POLICIES", "DISTRIBUTION_STRATEGY"]),
    promiseAlignment: gate(errors, ["TITLE_KEYWORD", "TITLE_THUMBNAIL", "THUMBNAIL_FABRICATED", "DESCRIPTION_CLAIM"]),
    titleIntegrity: counts.totalTitles ? counts.approvedTitles / counts.totalTitles : 0,
    thumbnailIntegrity: counts.totalThumbnails ? counts.approvedThumbnails / counts.totalThumbnails : 0,
    descriptionIntegrity: gate(errors, ["DESCRIPTION"]),
    tagIntegrity: gate(errors, ["TAGS"]),
    chapterCoverage: counts.chapters ? counts.validChapters / counts.chapters : 0,
    shortsIntegrity: counts.shorts ? counts.validShorts / counts.shorts : 0,
    disclosureIntegrity: gate(errors, ["SOURCE_DISCLOSURE", "SYNTHETIC_DISCLOSURE"]),
    localizationIntegrity: gate(errors, ["LOCALIZATION"]),
    policyIntegrity: gate(errors, ["PLATFORM_POLICY"]),
    manifestIntegrity: gate(errors, ["PUBLISHING_MANIFEST"]),
    metadataReproducibility: gate(errors, ["METADATA_HASH"]),
    overall: 0,
  }
  quality.overall = Object.values(quality).slice(0, 13).reduce((sum, score) => sum + Number(score), 0) / 13
  return quality
}
