import type { EvidenceMatrix,ScriptPackage,TopicBrief,TopicCandidate } from "../../core/contracts"
import { evidenceMatrix,scriptPackage,topicCandidate } from "../../tests/fixtures/editorial-positive"
export interface TopicProvider { propose(brief:TopicBrief):Promise<TopicCandidate[]> }
export interface ResearchProvider { research(topic:TopicCandidate):Promise<EvidenceMatrix> }
export interface ScriptModel { compile(input:{topic:TopicCandidate;evidence:EvidenceMatrix;runId:string}):Promise<ScriptPackage> }
export class MockTopicProvider implements TopicProvider { async propose(brief:TopicBrief){return [{...structuredClone(topicCandidate),projectId:brief.projectId}]}}
export class MockResearchProvider implements ResearchProvider { async research(topic:TopicCandidate){return {...structuredClone(evidenceMatrix),projectId:topic.projectId}}}
export class MockScriptModel implements ScriptModel { async compile({topic,evidence,runId}:Parameters<ScriptModel["compile"]>[0]){const value=scriptPackage(runId);return{...value,projectId:topic.projectId,topicId:topic.topicId,evidenceMatrix:evidence}}}
