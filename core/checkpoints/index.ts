import { randomUUID } from "node:crypto"
import type { CheckpointRecord } from "../contracts"
import { governance } from "../contracts"
import type { CheckpointStore } from "../interfaces"
import { CheckpointRegistry } from "../registry"

export class InMemoryCheckpointStore implements CheckpointStore {
  private readonly registry = new CheckpointRegistry()
  create(record: CheckpointRecord) { return this.registry.create(record) }
  update(id: string, patch: Partial<CheckpointRecord>) { return this.registry.update(id, patch) }
  getById(id: string) { return this.registry.getById(id) }
  listByRun(runId: string) { return this.registry.listAll().filter((item) => item.runId === runId) }
}

export class CheckpointManager {
  constructor(private readonly store: CheckpointStore) {}
  save(input: { projectId: string; runId: string; snapshot: unknown; cause: string; metadata?: Record<string, unknown>; recoverable?: boolean; final?: boolean }): CheckpointRecord {
    return this.store.create({ id: randomUUID(), ...governance({ projectId: input.projectId, runId: input.runId, status: input.final ? "completed" : "pending" }), snapshot: structuredClone(input.snapshot), recoverable: input.recoverable ?? true, final: input.final ?? false, cause: input.cause, metadata: input.metadata ?? {} })
  }
  recover(checkpointId: string): CheckpointRecord { return structuredClone(this.store.getById(checkpointId)) }
  listByRun(runId: string): CheckpointRecord[] { return this.store.listByRun(runId) }
  mark(checkpointId: string, flags: { recoverable?: boolean; final?: boolean; cause?: string; metadata?: Record<string, unknown> }): CheckpointRecord { return this.store.update(checkpointId, flags) }
}
