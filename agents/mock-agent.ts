import { randomUUID } from "node:crypto"
import type { AgentResult, AgentTask } from "../core/contracts"
import { governance } from "../core/contracts"
import type { Agent } from "../core/interfaces"
import { AgentTaskSchema, AgentResultSchema } from "../core/schemas"

export class MockAgent implements Agent {
  readonly id = "mock-agent"
  async execute(input: AgentTask): Promise<AgentResult> {
    const task = AgentTaskSchema.parse(input)
    return AgentResultSchema.parse({ id: randomUUID(), ...governance({ projectId: task.projectId, runId: task.runId, status: "completed", nextAgent: task.nextAgent }), taskId: task.id, agentId: this.id, output: { accepted: true, input: task.input }, requestedTransition: task.requestedTransition })
  }
}
