export * from "./editorial"

export const SCHEMA_VERSION = "1.0.0" as const

export const projectStates = [
  "CREATED", "TOPIC_APPROVED", "SCRIPT_APPROVED", "EDIT_BLUEPRINT_APPROVED",
  "PROMPT_PACK_APPROVED", "REFERENCES_APPROVED", "START_FRAMES_APPROVED",
  "VIDEO_BATCH_RUNNING", "VIDEO_BATCH_APPROVED", "AUDIO_APPROVED", "ASSEMBLY_READY",
  "MASTER_APPROVED", "PACKAGING_READY", "PUBLISHED", "HUMAN_REQUIRED", "BLOCKED",
  "FAILED", "CANCELLED",
] as const
export type ProjectState = (typeof projectStates)[number]

export const recordStatuses = ["pending", "running", "completed", "failed", "cancelled"] as const
export type RecordStatus = (typeof recordStatuses)[number]

export interface SourceVersion { source: string; version: string }
export interface GovernanceFields {
  schemaVersion: string
  projectId: string
  runId: string | null
  status: string
  warnings: string[]
  blockingErrors: string[]
  createdAt: string
  updatedAt: string
  sourceVersions: SourceVersion[]
  artifactIds: string[]
  checkpointRef: string | null
  nextAgent: string | null
}
export interface BaseEnvelope<T = unknown> extends GovernanceFields { id: string; type: string; payload: T }
export interface ProjectRecord extends GovernanceFields { id: string; name: string; state: ProjectState; metadata: Record<string, unknown> }
export interface RunRecord extends GovernanceFields { id: string; agentId: string | null; state: ProjectState; startedAt: string; finishedAt: string | null }
export interface ArtifactRecord extends GovernanceFields { id: string; kind: string; uri: string; contentType: string; metadata: Record<string, unknown> }
export interface CheckpointRecord extends GovernanceFields { id: string; snapshot: unknown; recoverable: boolean; final: boolean; cause: string; metadata: Record<string, unknown> }
export interface AgentTask extends GovernanceFields { id: string; agentId: string; input: unknown; requestedTransition: ProjectState | null }
export interface AgentResult extends GovernanceFields { id: string; taskId: string; agentId: string; output: unknown; requestedTransition: ProjectState | null }
export interface StateTransition extends GovernanceFields { id: string; from: ProjectState; to: ProjectState; reason: string }
export interface ProviderCapability extends GovernanceFields { id: string; providerId: string; capability: string; available: boolean; costTier: "free" | "subscription" | "paid" }
export interface RuntimeCapability extends GovernanceFields { id: string; runtimeId: string; capability: string; available: boolean }

export type RegistryRecord = ProjectRecord | RunRecord | ArtifactRecord | CheckpointRecord

export function governance(input: Pick<GovernanceFields, "projectId"> & Partial<GovernanceFields>): GovernanceFields {
  const now = new Date().toISOString()
  return {
    schemaVersion: SCHEMA_VERSION, runId: null, status: "pending", warnings: [], blockingErrors: [],
    createdAt: now, updatedAt: now, sourceVersions: [], artifactIds: [], checkpointRef: null,
    nextAgent: null, ...input,
  }
}
