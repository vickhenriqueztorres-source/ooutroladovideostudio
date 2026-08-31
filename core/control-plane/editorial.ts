import { randomUUID } from "node:crypto"
import type { AgentResult,AgentTask,ArtifactRecord,GreenlightDecision,ProjectRecord,ProjectState,ScriptPackage,TopicBrief,TopicCandidate,EvidenceMatrix } from "../contracts"
import { governance } from "../contracts"
import { AgentResultSchema,AgentTaskSchema,ArtifactRecordSchema } from "../schemas"
import { ScriptPackageSchema,TopicBriefSchema } from "../schemas/editorial"
import { applyTransition } from "../state-machine"
import type { Logger,RuntimeAdapter } from "../interfaces"
import type { ArtifactRegistry,ProjectRegistry,RunRegistry } from "../registry"
import type { CheckpointManager } from "../checkpoints"
import type { AgentRegistry } from "../../agents/registry"
export interface EditorialPipelineResult {project:ProjectRecord;runId:string;script?:ScriptPackage;artifacts:ArtifactRecord[];lastCheckpointId:string;status:"SCRIPT_APPROVED"|"HUMAN_REQUIRED"|"BLOCKED"}
export class EditorialControlPlane {
 private cache=new Map<string,AgentResult>();private artifacts:ArtifactRecord[]=[]
 constructor(private projects:ProjectRegistry,private runs:RunRegistry,private artifactRegistry:ArtifactRegistry,private checkpoints:CheckpointManager,private logger:Logger,private runtime:RuntimeAdapter,private agents:AgentRegistry){}
 private log(event:string,ctx:{projectId:string;runId:string;taskId?:string;agent?:string;status:string;durationMs?:number;artifactId?:string}){this.logger.log({level:event.includes("failed")||event.includes("blocked")?"error":"info",event,projectId:ctx.projectId,runId:ctx.runId,data:ctx})}
 private async stage(projectId:string,runId:string,agentId:string,input:unknown):Promise<{result:AgentResult;checkpointId:string;artifact:ArtifactRecord}>{
  const taskId=`${runId}:${agentId}`;const cached=this.cache.get(taskId);if(cached){const artifact=this.artifacts.find(a=>a.metadata.taskId===taskId)!;return{result:cached,checkpointId:cached.checkpointRef!,artifact}}
  const before=this.checkpoints.save({projectId,runId,snapshot:{stage:agentId,phase:"before",input},cause:"before-agent",metadata:{taskId,agentId},recoverable:true});this.log("checkpoint.created",{projectId,runId,taskId,agent:agentId,status:"before",artifactId:before.id})
  const task=AgentTaskSchema.parse({id:taskId,...governance({projectId,runId,status:"running",checkpointRef:before.id}),agentId,input,requestedTransition:null}) as AgentTask
  this.log("agent.started",{projectId,runId,taskId,agent:agentId,status:"running"});this.log("agent.input.validated",{projectId,runId,taskId,agent:agentId,status:"valid"});const started=Date.now()
  const result=AgentResultSchema.parse(await this.runtime.dispatch(this.agents.get(agentId),task)) as AgentResult;this.log("agent.output.validated",{projectId,runId,taskId,agent:agentId,status:result.status,durationMs:Date.now()-started})
  const artifact=ArtifactRecordSchema.parse({id:randomUUID(),...governance({projectId,runId,status:result.status}),kind:`editorial/${agentId}`,uri:`memory://${runId}/${agentId}`,contentType:"application/json",metadata:{taskId,payload:result.output}}) as ArtifactRecord;this.artifactRegistry.create(artifact);this.artifacts.push(artifact)
  const after=this.checkpoints.save({projectId,runId,snapshot:{stage:agentId,phase:"after",result,artifactId:artifact.id},cause:"after-agent",metadata:{taskId,agentId,artifactId:artifact.id},recoverable:true});const enriched={...result,checkpointRef:after.id,artifactIds:[artifact.id]};this.cache.set(taskId,enriched);this.log("checkpoint.created",{projectId,runId,taskId,agent:agentId,status:"after",artifactId:after.id});return{result:enriched,checkpointId:after.id,artifact}
 }
 private transition(project:ProjectRecord,to:ProjectState,runId:string){const from=project.state;applyTransition({id:randomUUID(),...governance({projectId:project.id,runId,status:"completed"}),from,to,reason:"editorial pipeline gate"});const updated=this.projects.update(project.id,{state:to,status:to==="BLOCKED"||to==="HUMAN_REQUIRED"?"failed":"running"});this.log("state.transitioned",{projectId:project.id,runId,status:`${from}->${to}`});return updated}
 async execute(briefInput:TopicBrief,options:{projectName?:string;failAfterStage?:string;resumeRunId?:string}={}):Promise<EditorialPipelineResult>{
  const brief=TopicBriefSchema.parse(briefInput) as TopicBrief;let project:ProjectRecord;try{project=this.projects.getById(brief.projectId)}catch{project=this.projects.create({id:brief.projectId,name:options.projectName??"BRECHA Editorial",state:"CREATED",metadata:{},...governance({projectId:brief.projectId,status:"running"})})}
  const run=options.resumeRunId?this.runs.getById(options.resumeRunId):this.runs.create({id:randomUUID(),...governance({projectId:brief.projectId,status:"running"}),agentId:"editorial-pipeline",state:project.state,startedAt:new Date().toISOString(),finishedAt:null});const runId=run.id;let cp=""
  const scout=await this.stage(project.id,runId,"topic-scout",brief);cp=scout.checkpointId;if(options.failAfterStage==="topic-scout")throw new Error("SIMULATED_FAILURE")
  const green=await this.stage(project.id,runId,"topic-greenlight",scout.result.output);cp=green.checkpointId;const decision=green.result.output as GreenlightDecision
  if(decision.decision!=="GREENLIT"){const state=decision.decision==="HUMAN_REQUIRED"?"HUMAN_REQUIRED":"BLOCKED";project=this.transition(project,state,runId);this.runs.update(runId,{status:"failed",state,finishedAt:new Date().toISOString()});this.log("run.blocked",{projectId:project.id,runId,status:state});return{project,runId,artifacts:this.artifacts.filter(a=>a.runId===runId),lastCheckpointId:cp,status:state}}
  if(project.state==="CREATED")project=this.transition(project,"TOPIC_APPROVED",runId)
  const topic=decision.selected as TopicCandidate;const research=await this.stage(project.id,runId,"research-integrity",topic);cp=research.checkpointId;if(options.failAfterStage==="research-integrity")throw new Error("SIMULATED_FAILURE")
  const evidence=research.result.output as EvidenceMatrix;if(evidence.status==="BLOCKED"){project=this.transition(project,"BLOCKED",runId);this.log("run.blocked",{projectId:project.id,runId,status:"BLOCKED"});return{project,runId,artifacts:this.artifacts.filter(a=>a.runId===runId),lastCheckpointId:cp,status:"BLOCKED"}}
  const compile=await this.stage(project.id,runId,"documentary-script-compiler",{topic,evidence});cp=compile.checkpointId
  const qc=await this.stage(project.id,runId,"script-qc",{script:compile.result.output,constraints:brief.productionConstraints});cp=qc.checkpointId;const script=ScriptPackageSchema.parse(qc.result.output) as ScriptPackage
  if(script.status!=="SCRIPT_APPROVED"){project=this.transition(project,"BLOCKED",runId);this.log("agent.qc.failed",{projectId:project.id,runId,agent:"script-qc",taskId:`${runId}:script-qc`,status:script.qc.decision});this.log("run.blocked",{projectId:project.id,runId,status:"BLOCKED"});return{project,runId,script,artifacts:this.artifacts.filter(a=>a.runId===runId),lastCheckpointId:cp,status:"BLOCKED"}}
  this.log("agent.qc.passed",{projectId:project.id,runId,agent:"script-qc",taskId:`${runId}:script-qc`,status:"SCRIPT_APPROVED"});if(project.state==="TOPIC_APPROVED")project=this.transition(project,"SCRIPT_APPROVED",runId);this.runs.update(runId,{status:"completed",state:"SCRIPT_APPROVED",finishedAt:new Date().toISOString(),checkpointRef:cp});this.log("run.completed",{projectId:project.id,runId,status:"SCRIPT_APPROVED"});return{project,runId,script,artifacts:this.artifacts.filter(a=>a.runId===runId),lastCheckpointId:cp,status:"SCRIPT_APPROVED"}
 }
 async resume(checkpointId:string,brief:TopicBrief){const checkpoint=this.checkpoints.recover(checkpointId);if(!checkpoint.recoverable)throw new Error("CHECKPOINT_NOT_RECOVERABLE");return this.execute(brief,{resumeRunId:checkpoint.runId!})}
}
