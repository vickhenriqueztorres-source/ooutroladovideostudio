import type{AgentTask,PackagingInput}from"../../core/contracts"
import{AgentResultSchema}from"../../core/schemas"
import type{Agent}from"../../core/interfaces"
import{runPackaging,type PackagingAdapter}from"../../core"
import{MockPackagingAdapter}from"../../providers/packaging"

export class PackagingAgent implements Agent{
  readonly id="packaging"
  constructor(private readonly adapter:PackagingAdapter=new MockPackagingAdapter()){}
  async execute(task:AgentTask){
    const pack=runPackaging(task.input as PackagingInput,this.adapter)
    const now=new Date().toISOString(),ready=pack.status==="PACKAGING_READY"
    return AgentResultSchema.parse({schemaVersion:task.schemaVersion,projectId:task.projectId,runId:task.runId,status:ready?"completed":"failed",warnings:pack.warnings,blockingErrors:pack.blockingErrors,createdAt:now,updatedAt:now,sourceVersions:[{source:this.id,version:"1.0.0"}],artifactIds:ready?[pack.metadata.bundleId]:[],checkpointRef:null,nextAgent:pack.publishAuthorized?"publish-agent":null,id:`result-${task.id}`,taskId:task.id,agentId:this.id,requestedTransition:ready?"PACKAGING_READY":null,output:pack})
  }
}
