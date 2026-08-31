import { describe, expect, it } from "vitest"
import { ControlPlane } from "../core/control-plane"
import { ProjectRegistry, RunRegistry } from "../core/registry"
import { CheckpointManager, InMemoryCheckpointStore } from "../core/checkpoints"
import { InMemoryLogger } from "../core/logging"
import { DirectRuntimeAdapter } from "../runtimes/shared"
import { MockAgent } from "../agents/mock-agent"
describe("minimal control plane", () => {
  it("executes the governed happy path", async () => { const projects = new ProjectRegistry(); const runs = new RunRegistry(); const store = new InMemoryCheckpointStore(); const checkpoints = new CheckpointManager(store); const logger = new InMemoryLogger(); const control = new ControlPlane({ projects, runs, checkpoints, logger, runtime: new DirectRuntimeAdapter() }); const project = control.createProject("BRECHA"); const run = control.openRun(project.id, "mock-agent"); const completed = await control.dispatch(run.id, new MockAgent(), { topic: "cinema" }, "TOPIC_APPROVED"); expect(completed.status).toBe("completed"); expect(completed.state).toBe("TOPIC_APPROVED"); expect(projects.getById(project.id).state).toBe("TOPIC_APPROVED"); expect(checkpoints.listByRun(run.id)).toHaveLength(2); expect(logger.list({ runId: run.id }).map((e) => e.event)).toContain("run.completed") })
})
