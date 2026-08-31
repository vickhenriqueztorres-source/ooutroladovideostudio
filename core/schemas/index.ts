import { z } from "zod"
export * from "./editorial"
export * from "./edit-blueprint"
export * from "./prompt-pack"
export * from "./provider-capability"
export * from "./image-generation"
export * from "./video-generation"
export * from "./audio-generation"
import { projectStates, recordStatuses } from "../contracts"

const id = z.string().min(1)
const date = z.iso.datetime()
const governanceShape = {
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/), projectId: id, runId: id.nullable(),
  status: z.string().min(1), warnings: z.array(z.string()), blockingErrors: z.array(z.string()),
  createdAt: date, updatedAt: date, sourceVersions: z.array(z.object({ source: id, version: id })),
  artifactIds: z.array(id), checkpointRef: id.nullable(), nextAgent: id.nullable(),
}
const governed = z.object(governanceShape).refine((v) => Date.parse(v.updatedAt) >= Date.parse(v.createdAt), "updatedAt must not precede createdAt")
const extend = <T extends z.ZodRawShape>(shape: T) => z.object({ ...governanceShape, ...shape }).refine((v) => {
  const governedValue = v as { createdAt: string; updatedAt: string }
  return Date.parse(governedValue.updatedAt) >= Date.parse(governedValue.createdAt)
}, "updatedAt must not precede createdAt")

export const BaseEnvelopeSchema = extend({ id, type: id, payload: z.unknown() })
export const ProjectRecordSchema = extend({ id, name: id, state: z.enum(projectStates), metadata: z.record(z.string(), z.unknown()) })
export const RunRecordSchema = extend({ id, agentId: id.nullable(), state: z.enum(projectStates), startedAt: date, finishedAt: date.nullable() })
export const ArtifactRecordSchema = extend({ id, kind: id, uri: id, contentType: id, metadata: z.record(z.string(), z.unknown()) })
export const CheckpointRecordSchema = extend({ id, snapshot: z.unknown(), recoverable: z.boolean(), final: z.boolean(), cause: id, metadata: z.record(z.string(), z.unknown()) })
export const AgentTaskSchema = extend({ id, agentId: id, input: z.unknown(), requestedTransition: z.enum(projectStates).nullable() })
export const AgentResultSchema = extend({ id, taskId: id, agentId: id, output: z.unknown(), requestedTransition: z.enum(projectStates).nullable() })
export const StateTransitionSchema = extend({ id, from: z.enum(projectStates), to: z.enum(projectStates), reason: id })
export const ProviderCapabilitySchema = extend({ id, providerId: id, capability: id, available: z.boolean(), costTier: z.enum(["free", "subscription", "paid"]) })
export const RuntimeCapabilitySchema = extend({ id, runtimeId: id, capability: id, available: z.boolean() })
export const RecordStatusSchema = z.enum(recordStatuses)
export const GovernanceSchema = governed
