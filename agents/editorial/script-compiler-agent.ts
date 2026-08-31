import type { AgentTask,EvidenceMatrix,TopicCandidate } from "../../core/contracts"
import { EvidenceMatrixSchema,ScriptPackageSchema,TopicCandidateSchema } from "../../core/schemas/editorial"
import type { ScriptModel } from "../../providers/editorial"
import { createEditorialResult } from "../strategy/editorial-agents"
export class DocumentaryScriptCompilerAgent {readonly id="documentary-script-compiler";constructor(private model:ScriptModel){}async execute(task:AgentTask){const raw=task.input as {topic:TopicCandidate;evidence:EvidenceMatrix};const topic=TopicCandidateSchema.parse(raw.topic) as TopicCandidate;const evidence=EvidenceMatrixSchema.parse(raw.evidence) as EvidenceMatrix;const script=ScriptPackageSchema.parse(await this.model.compile({topic,evidence,runId:task.runId!}));return createEditorialResult(task,script)}}
