export * from "./editorial"
export * from "./edit-timeline"
export * from "./prompt-pack"
export * from "./provider-validation"
export * from "./image-generation"
export * from "./video-generation"

import { randomUUID } from "node:crypto"
import type { Agent, Logger, RuntimeAdapter } from "../interfaces"
import type { AgentTask, ProjectRecord, RunRecord } from "../contracts"
import { governance } from "../contracts"
import { CheckpointManager } from "../checkpoints"
import { ProjectRegistry, RunRegistry } from "../registry"
import { BrechaStateMachine } from "../state-machine"
import { ControlPlaneError } from "../errors"
import { AgentTaskSchema } from "../schemas"

export interface ControlPlaneDependencies { projects: ProjectRegistry; runs: RunRegistry; checkpoints: CheckpointManager; logger: Logger; runtime: RuntimeAdapter; stateMachine?: BrechaStateMachine }
export class ControlPlane {
  private readonly stateMachine: BrechaStateMachine
  constructor(private readonly deps: ControlPlaneDependencies) { this.stateMachine = deps.stateMachine ?? new BrechaStateMachine() }
  createProject(name: string, metadata: Record<string, unknown> = {}): ProjectRecord {
    const id = randomUUID(); const project = this.deps.projects.create({ id, ...governance({ projectId: id, status: "pending" }), name, state: "CREATED", metadata })
    this.deps.logger.log({ level: "info", event: "project.created", projectId: id, runId: null }); return project
  }
  openRun(projectId: string, agentId: string): RunRecord {
    const project = this.deps.projects.getById(projectId); const id = randomUUID()
    const run = this.deps.runs.create({ id, ...governance({ projectId, runId: id, status: "running" }), agentId, state: project.state, startedAt: new Date().toISOString(), finishedAt: null })
    this.deps.logger.log({ level: "info", event: "run.opened", projectId, runId: id }); return run
  }
  async dispatch(runId: string, agent: Agent, input: unknown, requestedTransition: ProjectRecord["state"] | null): Promise<RunRecord> {
    const run = this.deps.runs.getById(runId); const project = this.deps.projects.getById(run.projectId)
    const before = this.deps.checkpoints.save({ projectId: project.id, runId, snapshot: { project, run }, cause: "before-agent-dispatch" })
    this.deps.runs.update(runId, { checkpointRef: before.id })
    const task: AgentTask = AgentTaskSchema.parse({ id: randomUUID(), ...governance({ projectId: project.id, runId, status: "running", checkpointRef: before.id }), agentId: agent.id, input, requestedTransition })
    this.deps.logger.log({ level: "info", event: "agent.dispatched", projectId: project.id, runId, data: { agentId: agent.id } })
    try {
      const result = await this.deps.runtime.dispatch(agent, task)
      const nextState = result.requestedTransition ? this.stateMachine.apply({ id: randomUUID(), ...governance({ projectId: project.id, runId, status: "completed" }), from: project.state, to: result.requestedTransition, reason: `Agent ${agent.id} completed` }) : project.state
      const updatedProject = this.deps.projects.update(project.id, { state: nextState, status: "completed", artifactIds: result.artifactIds, nextAgent: result.nextAgent })
      const completed = this.deps.runs.update(runId, { state: nextState, status: "completed", artifactIds: result.artifactIds, finishedAt: new Date().toISOString() })
      const after = this.deps.checkpoints.save({ projectId: project.id, runId, snapshot: { project: updatedProject, run: completed, result }, cause: "after-agent-dispatch", recoverable: false, final: true })
      this.deps.runs.update(runId, { checkpointRef: after.id }); this.deps.logger.log({ level: "info", event: "run.completed", projectId: project.id, runId }); return this.deps.runs.getById(runId)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown execution error"
      const failed = this.deps.runs.update(runId, { status: "failed", state: "FAILED", blockingErrors: [message], finishedAt: new Date().toISOString() })
      const checkpoint = this.deps.checkpoints.save({ projectId: project.id, runId, snapshot: { project, run: failed }, cause: "agent-dispatch-failed", metadata: { message }, recoverable: true })
      this.deps.runs.update(runId, { checkpointRef: checkpoint.id }); this.deps.logger.log({ level: "error", event: "run.failed", projectId: project.id, runId, data: { message } }); throw new ControlPlaneError("Agent dispatch failed", error)
    }
  }
}
