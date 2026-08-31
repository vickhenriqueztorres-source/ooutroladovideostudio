import type { AgentTask,TopicCandidate } from "../../core/contracts"
import { EvidenceMatrixSchema,TopicCandidateSchema } from "../../core/schemas/editorial"
import type { ResearchProvider } from "../../providers/editorial"
import { createEditorialResult } from "../strategy/editorial-agents"
export class ResearchIntegrityAgent {readonly id="research-integrity";constructor(private provider:ResearchProvider){}async execute(task:AgentTask){const topic=TopicCandidateSchema.parse(task.input) as TopicCandidate;const matrix=EvidenceMatrixSchema.parse(await this.provider.research(topic));return createEditorialResult(task,matrix,matrix.status==="BLOCKED"?"failed":"completed")}}
