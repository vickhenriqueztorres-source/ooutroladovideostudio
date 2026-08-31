import type { MasterApprovalReceipt, PackagingInput } from "../../core/contracts/packaging"
import { runFinalAssembly } from "../../core/final-assembly"
import { receiptHashes } from "../../core/packaging/validation"
import { MockFinalAssemblyAdapter } from "../../providers/assembly"
import { validAssemblyInput } from "./final-assembly"

export function approvedAssembly() {
  const assemblyInput = validAssemblyInput()
  const assemblyPack = structuredClone(runFinalAssembly(assemblyInput, new MockFinalAssemblyAdapter()))
  const scale = 12
  assemblyPack.timelineCompilation.blocks = assemblyPack.timelineCompilation.blocks.map((block) => ({ ...block, startSec: block.startSec * scale, endSec: block.endSec * scale }))
  assemblyPack.timelineCompilation.durationSeconds *= scale
  assemblyPack.timelineCompilation.timelineHash = "sha256:packaging-timeline-72s"
  assemblyPack.captionTrack.cues = assemblyPack.captionTrack.cues.map((cue) => ({ ...cue, startSec: cue.startSec * scale, endSec: cue.endSec * scale }))
  assemblyPack.captionTrack.captionHash = "sha256:packaging-captions-72s"
  assemblyPack.renderManifest.timelineHash = assemblyPack.timelineCompilation.timelineHash
  return { assemblyInput, assemblyPack }
}

export function validPackagingInput(): PackagingInput {
  const { assemblyInput, assemblyPack } = approvedAssembly()
  const base = {
    schemaVersion: "1.0.0",
    projectId: assemblyInput.projectId,
    runId: "run-packaging",
    episodeId: "OOL-PIX-001",
    packagingVersion: "1.0.0",
    assemblyPack,
    renderManifest: assemblyPack.renderManifest,
    topicProfile: {
      primaryKeyword: "brecha",
      secondaryKeywords: ["segurança digital", "engenharia social", "fraude online"],
      longTailKeywords: ["como identificar uma brecha digital", "documentário sobre engenharia social"],
      hook: "Uma interface confiável pode esconder o mecanismo da fraude.",
      promise: "Neste episódio, mostramos como a brecha transfere autoridade para uma tela falsa.",
    },
    channelProfile: {
      channelName: "BRECHA",
      palette: ["graphite", "coldblue", "mutedred", "controlledteal"] as const,
      defaultCta: "Inscreva-se no BRECHA e reconheça o sistema antes que ele use sua confiança.",
      hashtags: ["#brecha", "#segurancadigital", "#engenhariasocial", "#documentario"],
      channelUrl: "https://youtube.com/@brecha",
      nextVideoUrl: "https://youtube.com/watch?v=proximo",
    },
    platformPolicies: {
      youtube: { maxTitleCharacters: 100, maxDescriptionCharacters: 5000, maxTags: 15, minThumbnailContrast: 4.5, minEstimatedCtr: 0.06 },
      tiktok: { minDurationSeconds: 15, maxDurationSeconds: 60, requiredFormat: "9:16" as const },
      instagram: { minDurationSeconds: 15, maxDurationSeconds: 60, requiredFormat: "9:16" as const, maxHashtags: 5 },
    },
    distributionStrategy: { primaryPlatform: "youtube" as const, secondaryPlatforms: ["tiktok", "instagram"] as const, publishMode: "manual" as const, scheduledTime: null },
    claims: [{ claimId: "CLM-1", status: "VERIFIED" as const, conditionalLanguageApproved: false }],
    sources: [{ sourceId: "SRC-1", title: "Relatório técnico oficial", url: "https://example.org/relatorio", retrievedAt: "2026-01-01T00:00:00.000Z", verified: true }],
    evidenceMatrix: assemblyInput.evidenceMatrix,
    thumbnailEvidenceIds: ["policy", "policy", "policy"],
    thumbnailConcepts: [
      { conceptId: "CONCEPT-A", role: "MECHANISM" as const, concept: "O fluxo invisível que transfere autoridade", headline: "Fluxo Invisível", sourceEvidenceId: "policy" },
      { conceptId: "CONCEPT-B", role: "CONSEQUENCE" as const, concept: "A confiança quebrada pela interface falsa", headline: "Confiança Quebrada", sourceEvidenceId: "policy" },
      { conceptId: "CONCEPT-C", role: "FINAL_HANDOFF" as const, concept: "O sinal concreto que entrega a fraude", headline: "O Sinal Final", sourceEvidenceId: "policy" },
    ],
    titleSeeds: [
      { text: "Como a brecha transfere confiança para uma tela falsa", claimIds: ["CLM-1"] },
      { text: "Brecha digital: o mecanismo oculto por trás da fraude", claimIds: ["CLM-1"] },
      { text: "A brecha que revela por que a mensagem parece legítima", claimIds: ["CLM-1"] },
    ],
    descriptionSeed: "Análise técnica do incidente, do mecanismo de autoridade simulada e dos sinais verificáveis que ajudam a reconhecer a fraude.",
    language: "pt-BR",
    forbiddenTitlePatterns: ["você não vai acreditar", "inacreditável", "choque"],
    qcThreshold: 0.9,
    publishApproval: null,
  }
  const hashes = receiptHashes(base as unknown as PackagingInput)
  const masterApprovalReceipt: MasterApprovalReceipt = {
    episodeId: base.episodeId,
    projectId: base.projectId,
    assemblyPackId: assemblyPack.assemblyPackId,
    assemblyPackVersion: assemblyInput.assemblyVersion,
    state: "MASTER_APPROVED",
    approvedAt: "2026-01-02T00:00:00.000Z",
    approvedBy: "reviewer-1",
    ...hashes,
    blockers: [],
    warnings: [],
    nextAgent: "PACKAGING_AGENT",
  }
  return { ...base, distributionStrategy: { ...base.distributionStrategy, secondaryPlatforms: [...base.distributionStrategy.secondaryPlatforms] }, channelProfile: { ...base.channelProfile, palette: [...base.channelProfile.palette] }, masterApprovalReceipt }
}
