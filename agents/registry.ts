import type { Agent } from "../core/interfaces"
import { DuplicateRecordError,RecordNotFoundError } from "../core/errors"
export class AgentRegistry {private agents=new Map<string,Agent>();register(agent:Agent){if(this.agents.has(agent.id))throw new DuplicateRecordError(agent.id);this.agents.set(agent.id,agent);return agent}get(id:string){const a=this.agents.get(id);if(!a)throw new RecordNotFoundError(id);return a}list(){return [...this.agents.values()]}}
