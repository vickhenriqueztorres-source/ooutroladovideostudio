import{governance}from"../contracts"
import type{PackagingAdapter,PackagingInput,PackagingPack}from"../contracts/packaging"
import type{CheckpointManager}from"../checkpoints"
import type{Logger,StateMachine}from"../interfaces"
import type{ProjectRegistry}from"../registry"
import{packagingJobKey,runPackaging}from"../packaging"

export class PackagingControlPlane{
  private readonly cache=new Map<string,PackagingPack>()
  constructor(private readonly projects:ProjectRegistry,private readonly checkpoints:CheckpointManager,private readonly sm:StateMachine,private readonly logger:Logger,private readonly adapter:PackagingAdapter){}

  execute(input:PackagingInput){
    const key=packagingJobKey(input),cached=this.cache.get(key)
    if(cached)return cached
    const project=this.projects.getById(input.projectId)
    if(project.state!=="MASTER_APPROVED")throw new Error("PACKAGING_INVALID_PROJECT_STATE")
    const pack=runPackaging(input,this.adapter)
    for(const checkpoint of pack.checkpointTrail)this.checkpoints.save({projectId:input.projectId,runId:input.runId,snapshot:checkpoint,recoverable:true,final:checkpoint.stage==="DELIVERY_APPROVED",cause:checkpoint.stage,metadata:{packagingPackId:pack.packagingPackId,inputHash:key}})
    this.logger.log({level:pack.status==="BLOCKED"?"error":"info",event:"packaging.completed",projectId:input.projectId,runId:input.runId,data:{packagingPackId:pack.packagingPackId,status:pack.status,deliveryStatus:pack.deliveryStatus,titleCandidates:pack.metadata.titleCandidates.length,thumbnailOptions:pack.metadata.thumbnailOptions.length,chapters:pack.metadata.chapters.length,shortsCuts:pack.metadata.shortsCuts.cutCount,publishAuthorized:pack.publishAuthorized}})
    if(pack.status==="PACKAGING_READY"){
      this.sm.apply({id:`packaging-${key.slice(7,19)}`,...governance({projectId:project.id,runId:input.runId,status:"completed"}),from:project.state,to:"PACKAGING_READY",reason:"Metadata bundle approved for publish review"})
      this.projects.update(project.id,{state:"PACKAGING_READY"})
    }
    this.cache.set(key,pack)
    return pack
  }

  resume(input:PackagingInput){return this.execute(input)}
}
