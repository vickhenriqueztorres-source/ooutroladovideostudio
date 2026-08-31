import type{AgentTask,AudioGenerationInput}from"../../core/contracts"
import{AgentResultSchema}from"../../core/schemas"
import type{Agent}from"../../core/interfaces"
import{runAudioAgent,type AudioRenderAdapter}from"../../core"
import{MockAudioRenderAdapter}from"../../providers/audio"
export class AudioGenerationAgent implements Agent{readonly id="audio-generation";constructor(private readonly adapter:AudioRenderAdapter=new MockAudioRenderAdapter()){}async execute(task:AgentTask){const pack=runAudioAgent(task.input as AudioGenerationInput,this.adapter),now=new Date().toISOString(),approved=pack.status==="APPROVED_FOR_ASSEMBLY";return AgentResultSchema.parse({schemaVersion:task.schemaVersion,projectId:task.projectId,runId:task.runId,status:approved?"completed":"failed",warnings:pack.warnings,blockingErrors:pack.blockingErrors,createdAt:now,updatedAt:now,sourceVersions:[{source:this.id,version:"1.0.0"}],artifactIds:pack.approvedAudioAssets,checkpointRef:null,nextAgent:approved?"final-assembly-agent":null,id:`result-${task.id}`,taskId:task.id,agentId:this.id,requestedTransition:approved?"AUDIO_APPROVED":null,output:pack})}}
