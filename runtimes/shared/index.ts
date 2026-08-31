import type { AgentResult, AgentTask } from "../../core/contracts"
import type { Agent, RuntimeAdapter } from "../../core/interfaces"
export class DirectRuntimeAdapter implements RuntimeAdapter {
  readonly id = "direct"
  dispatch(agent: Agent, task: AgentTask): Promise<AgentResult> { return agent.execute(task) }
}
