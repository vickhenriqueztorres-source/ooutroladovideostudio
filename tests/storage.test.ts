import { describe, expect, it } from "vitest"
import { governance } from "../core/contracts"
import { ProjectRegistry } from "../core/registry"
import { DuplicateRecordError } from "../core/errors"
import { CheckpointManager, InMemoryCheckpointStore } from "../core/checkpoints"
describe("in-memory registries", () => {
  it("creates, reads, updates and lists by project", () => { const registry = new ProjectRegistry(); const record = { id: "p", ...governance({ projectId: "p" }), name: "BRECHA", state: "CREATED" as const, metadata: {} }; registry.create(record); expect(registry.getById("p").name).toBe("BRECHA"); registry.update("p", { name: "BRECHA Studio" }); expect(registry.listByProject("p")[0].name).toBe("BRECHA Studio") })
  it("rejects duplicate ids", () => { const registry = new ProjectRegistry(); const record = { id: "p", ...governance({ projectId: "p" }), name: "BRECHA", state: "CREATED" as const, metadata: {} }; registry.create(record); expect(() => registry.create(record)).toThrow(DuplicateRecordError) })
})
describe("checkpoint manager", () => {
  it("stores immutable snapshots and supports marking", () => { const manager = new CheckpointManager(new InMemoryCheckpointStore()); const snapshot = { state: "CREATED" }; const saved = manager.save({ projectId: "p", runId: "r", snapshot, cause: "before" }); snapshot.state = "FAILED"; expect(manager.recover(saved.id).snapshot).toEqual({ state: "CREATED" }); expect(manager.listByRun("r")).toHaveLength(1); expect(manager.mark(saved.id, { final: true, recoverable: false }).final).toBe(true) })
})
