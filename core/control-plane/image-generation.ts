import type{ImageGenerationInput,ImagePack}from"../contracts/image-generation"
import type{Logger}from"../interfaces"
import{ArtifactRegistry,ProjectRegistry,RunRegistry}from"../registry"
import{CheckpointManager}from"../checkpoints"
import{BrechaStateMachine}from"../state-machine"
import{governance}from"../contracts"
import{imageHash,runImageAgent,type ImageProviderAdapter}from"../image-generation"
import{MockImageProviderAdapter}from"../../providers/image"

export interface ImageGenerationDependencies{projects:ProjectRegistry;runs:RunRegistry;artifacts:ArtifactRegistry;checkpoints:CheckpointManager;logger:Logger;stateMachine?:BrechaStateMachine;adapter?:ImageProviderAdapter}

// Idempotency key: same input returns the already-validated pack, never a duplicate generation.
export function imagePackKey(input:ImageGenerationInput):string{return imageHash({projectId:input.projectId,promptPackId:input.promptPackId,providerPlanId:input.providerPlanId,inputHash:imageHash(input)})}

export class ImageGenerationControlPlane{
  private readonly cache=new Map<string,ImagePack>()
  private readonly sm:BrechaStateMachine
  private readonly adapter:ImageProviderAdapter
  constructor(private readonly d:ImageGenerationDependencies){this.sm=d.stateMachine??new BrechaStateMachine();this.adapter=d.adapter??new MockImageProviderAdapter()}

  private log(event:string,input:ImageGenerationInput,pack?:ImagePack){
    this.d.logger.log({level:pack?.blockingErrors.length?"error":"info",event,projectId:input.projectId,runId:input.runId,data:{imagePackId:pack?.imagePackId,promptPackId:input.promptPackId,providerPlanId:input.providerPlanId,status:pack?.status,inputHash:imagePackKey(input),approvedStartFrames:pack?.approvedStartFrames.length??0,rejected:pack?.rejectedAssets.length??0,blockingErrors:pack?.blockingErrors??[],warnings:pack?.warnings??[]}})
  }

  execute(input:ImageGenerationInput):ImagePack{
    const key=imagePackKey(input)
    const cached=this.cache.get(key)
    if(cached)return cached
    this.log("image.generation.started",input)
    const project=this.d.projects.getById(input.projectId)
    if(project.state!=="REFERENCES_APPROVED")throw new Error("IMAGE_STATE_TRANSITION_INVALID")

    this.d.checkpoints.save({projectId:project.id,runId:input.runId,snapshot:{stage:"REFERENCES_VALIDATED",inputHash:key},cause:"image-references-validated",recoverable:true})
    this.log("image.references.validated",input)

    const{pack}=runImageAgent(input,this.adapter)
    this.cache.set(key,pack)

    this.d.checkpoints.save({projectId:project.id,runId:input.runId,snapshot:{stage:"VISUAL_QC_COMPLETED",inputHash:key,artifactHash:imageHash(pack),generatedCount:pack.generatedAssets.length,approvedCount:pack.generatedAssets.filter(a=>a.status==="APPROVED").length,rejectedCount:pack.rejectedAssets.length,approvedStartFrameCount:pack.approvedStartFrames.length},cause:"image-visual-qc-completed",metadata:{imagePackId:pack.imagePackId},recoverable:true})
    this.log("image.visual.qc.completed",input,pack)

    if(pack.status==="APPROVED_FOR_VIDEO"){
      if(!this.sm.canTransition(project.state,"START_FRAMES_APPROVED"))throw new Error("IMAGE_STATE_TRANSITION_INVALID")
      this.sm.apply({id:`img-${key.slice(0,12)}`,...governance({projectId:project.id,runId:input.runId,status:"completed"}),from:project.state,to:"START_FRAMES_APPROVED",reason:"Image pack approved for video"})
      this.d.projects.update(project.id,{state:"START_FRAMES_APPROVED"})
      this.d.checkpoints.save({projectId:project.id,runId:input.runId,snapshot:{stage:"IMAGE_PACK_APPROVED",inputHash:key,artifactHash:imageHash(pack)},cause:"image-pack-approved",metadata:{imagePackId:pack.imagePackId},recoverable:false,final:true})
      this.log("image.pack.approved",input,pack)
    }
    return pack
  }
}
