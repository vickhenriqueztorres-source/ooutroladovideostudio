import { describe, expect, it } from "vitest"
import * as schemas from "../core/schemas"
import { governance } from "../core/contracts"
const g = governance({ projectId: "project-1", runId: "run-1" })
const samples = [
  [schemas.BaseEnvelopeSchema, { id: "e", ...g, type: "event", payload: {} }],
  [schemas.ProjectRecordSchema, { id: "p", ...g, name: "BRECHA", state: "CREATED", metadata: {} }],
  [schemas.RunRecordSchema, { id: "r", ...g, agentId: null, state: "CREATED", startedAt: g.createdAt, finishedAt: null }],
  [schemas.ArtifactRecordSchema, { id: "a", ...g, kind: "text", uri: "memory://a", contentType: "text/plain", metadata: {} }],
  [schemas.CheckpointRecordSchema, { id: "c", ...g, snapshot: {}, recoverable: true, final: false, cause: "test", metadata: {} }],
  [schemas.AgentTaskSchema, { id: "t", ...g, agentId: "mock", input: {}, requestedTransition: null }],
  [schemas.AgentResultSchema, { id: "ar", ...g, taskId: "t", agentId: "mock", output: {}, requestedTransition: null }],
  [schemas.StateTransitionSchema, { id: "s", ...g, from: "CREATED", to: "TOPIC_APPROVED", reason: "approved" }],
  [schemas.ProviderCapabilitySchema, { id: "pc", ...g, providerId: "local", capability: "llm", available: true, costTier: "free" }],
  [schemas.RuntimeCapabilitySchema, { id: "rc", ...g, runtimeId: "codex-adapter", capability: "tasks", available: true }],
] as const
describe("contract schemas", () => {
  it.each(samples)("accepts a valid contract", (schema, sample) => expect(schema.safeParse(sample).success).toBe(true))
  it.each(samples)("rejects an invalid schemaVersion", (schema, sample) => expect(schema.safeParse({ ...sample, schemaVersion: "latest" }).success).toBe(false))
})
