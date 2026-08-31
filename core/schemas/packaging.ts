import { z } from "zod"

const secondaryPlatform = z.enum(["tiktok", "instagram"])
const thumbnailRole = z.enum(["MECHANISM", "CONSEQUENCE", "FINAL_HANDOFF"])

export const MasterApprovalReceiptSchema = z.object({
  episodeId: z.string().min(1), projectId: z.string().min(1), assemblyPackId: z.string().min(1), assemblyPackVersion: z.string().min(1),
  state: z.literal("MASTER_APPROVED"), approvedAt: z.string().min(1), approvedBy: z.string().min(1), timelineHash: z.string().min(1),
  renderManifestHash: z.string().min(1), captionHash: z.string().min(1), evidenceManifestHash: z.string().min(1), qcReportHash: z.string().min(1),
  blockers: z.array(z.string()), warnings: z.array(z.string()), nextAgent: z.literal("PACKAGING_AGENT"),
})

export const PackagingInputSchema = z.object({
  schemaVersion: z.string().min(1), projectId: z.string().min(1), runId: z.string().min(1), episodeId: z.string().min(1), packagingVersion: z.string().min(1),
  masterApprovalReceipt: MasterApprovalReceiptSchema,
  assemblyPack: z.object({ status: z.literal("DELIVERY_APPROVED"), assemblyPackId: z.string().min(1), timelineCompilation: z.any(), captionTrack: z.any(), renderManifest: z.any() }).passthrough(),
  renderManifest: z.object({ status: z.literal("RENDERED"), outputPath: z.string().min(1), outputHash: z.string().min(1) }).passthrough(),
  topicProfile: z.object({ primaryKeyword: z.string().min(1), secondaryKeywords: z.array(z.string().min(1)), longTailKeywords: z.array(z.string().min(1)), hook: z.string().min(1), promise: z.string().min(1) }),
  channelProfile: z.object({
    channelName: z.string().min(1), palette: z.array(z.enum(["graphite", "coldblue", "mutedred", "controlledteal"])).min(1),
    defaultCta: z.string().min(1), hashtags: z.array(z.string().min(1)).min(1).max(5), channelUrl: z.string().optional(), nextVideoUrl: z.string().optional(),
  }),
  platformPolicies: z.object({
    youtube: z.object({ maxTitleCharacters: z.number().int().positive(), maxDescriptionCharacters: z.number().int().positive(), maxTags: z.number().int().positive(), minThumbnailContrast: z.number().positive(), minEstimatedCtr: z.number().min(0).max(1) }),
    tiktok: z.object({ minDurationSeconds: z.number().positive(), maxDurationSeconds: z.number().positive(), requiredFormat: z.literal("9:16") }).optional(),
    instagram: z.object({ minDurationSeconds: z.number().positive(), maxDurationSeconds: z.number().positive(), requiredFormat: z.literal("9:16"), maxHashtags: z.number().int().positive() }).optional(),
  }),
  distributionStrategy: z.object({ primaryPlatform: z.literal("youtube"), secondaryPlatforms: z.array(secondaryPlatform), publishMode: z.enum(["manual", "scheduled"]), scheduledTime: z.string().nullable().optional() }),
  claims: z.array(z.object({ claimId: z.string().min(1), status: z.enum(["VERIFIED", "UNCERTAIN", "UNSUPPORTED"]), conditionalLanguageApproved: z.boolean() })),
  sources: z.array(z.object({ sourceId: z.string().min(1), title: z.string().min(1), url: z.string().optional(), retrievedAt: z.string().min(1), verified: z.boolean() })).min(1),
  evidenceMatrix: z.array(z.object({ evidenceId: z.string().min(1), shotId: z.string().min(1), assetHash: z.string().min(1), classification: z.enum(["REAL_EVIDENCE", "RECONSTRUCTION", "DRAMATIZATION", "FICTIONAL_INTERFACE", "EXPLANATORY_GRAPHIC"]), verified: z.boolean() })),
  thumbnailEvidenceIds: z.array(z.string().min(1)),
  thumbnailConcepts: z.array(z.object({ conceptId: z.string().min(1), role: thumbnailRole, concept: z.string().min(1), headline: z.string().min(1), sourceEvidenceId: z.string().min(1) })).length(3),
  titleSeeds: z.array(z.object({ text: z.string().min(1), claimIds: z.array(z.string().min(1)) })).min(1),
  descriptionSeed: z.string().min(1), language: z.string().min(1), forbiddenTitlePatterns: z.array(z.string()), qcThreshold: z.number().min(0).max(1),
  publishApproval: z.object({ approvedBy: z.string().min(1), approvedAt: z.string().min(1), selectedTitleId: z.string().min(1), selectedThumbnailId: z.string().min(1) }).nullable().optional(),
  checkpoint: z.any().optional(),
})
