import type{AgentTask,ImageGenerationInput}from"../../core/contracts"
import{AgentResultSchema}from"../../core/schemas"
import type{Agent}from"../../core/interfaces"
import{runImageAgent,type ImageProviderAdapter}from"../../core/image-generation"
import{MockImageProviderAdapter}from"../../providers/image"

export class ImageGenerationAgent implements Agent{
  readonly id="image-generation"
  constructor(private readonly adapter:ImageProviderAdapter=new MockImageProviderAdapter()){}
  async execute(task:AgentTask){
    const{pack}=runImageAgent(task.input as ImageGenerationInput,this.adapter)
    const now=new Date().toISOString()
    const completed=pack.status==="APPROVED_FOR_VIDEO"
    return AgentResultSchema.parse({schemaVersion:task.schemaVersion,projectId:task.projectId,runId:task.runId,status:completed?"completed":pack.status==="BLOCKED"?"failed":"completed",warnings:pack.warnings,blockingErrors:pack.blockingErrors,createdAt:now,updatedAt:now,sourceVersions:[{source:this.id,version:"1.0.0"}],artifactIds:pack.approvedStartFrames.map(f=>f.assetId),checkpointRef:null,nextAgent:completed?"video-generation-agent":pack.nextAgent==="PROVIDER_JOB_ORCHESTRATOR"?"provider-job-orchestrator":null,id:`result-${task.id}`,taskId:task.id,agentId:this.id,requestedTransition:completed?"START_FRAMES_APPROVED":null,output:pack})
  }
}
