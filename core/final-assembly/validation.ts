import type{AssemblyBlockingError,AssetLink,FinalAssemblyInput}from"../contracts/final-assembly"
export function validateAssemblyInput(i:FinalAssemblyInput){const e:AssemblyBlockingError[]=[]
if(i.editBlueprint.status!=="EDIT_BLUEPRINT_APPROVED")e.push("ASSEMBLY_INPUT_INVALID")
if(i.approvedVideoPack.status!=="APPROVED_FOR_ASSEMBLY")e.push("VIDEO_PACK_NOT_APPROVED")
if(i.approvedAudioPack.status!=="APPROVED_FOR_ASSEMBLY")e.push("AUDIO_PACK_NOT_APPROVED")
if(!i.evidenceMatrix.length||!i.representationRules.length)e.push("ASSEMBLY_INPUT_INVALID")
return[...new Set(e)]}
export function resolveAssetLinks(i:FinalAssemblyInput){const errors:AssemblyBlockingError[]=[];const links:AssetLink[]=[]
for(const c of i.approvedVideoPack.generatedClips){if(c.status!=="APPROVED"||c.motionVetos.length){errors.push("UNAPPROVED_ASSET_REFERENCED");continue}if(!c.sha256)errors.push("ASSET_HASH_MISMATCH");links.push({assetId:c.clipId,assetHash:c.sha256,kind:"VIDEO",shotId:c.shotId,status:"APPROVED",provider:c.provider,runtime:c.runtime,adapterVersion:c.adapterVersion,durationSeconds:i.approvedVideoPack.jobs.find(j=>j.jobId===c.jobId)?.parameters.durationSeconds??0,frameRate:i.deliveryProfile.frameRate})}
for(const n of i.approvedAudioPack.narration)links.push({assetId:n.segmentId,assetHash:i.approvedAudioPack.narrationJobKey,kind:"NARRATION",blockId:n.blockId,status:"APPROVED",durationSeconds:n.endSec-n.startSec})
for(const c of i.approvedAudioPack.cues){if(c.status!=="approved")continue;if(c.type!=="SILENCE"&&(!c.assetHash||!c.licenseId))errors.push(c.assetHash?"ASSET_LICENSE_MISSING":"ASSET_HASH_MISMATCH");links.push({assetId:c.cueId,assetHash:c.assetHash??"silence",kind:"SFX",blockId:c.blockId,status:"APPROVED",durationSeconds:c.durationSec,licenseId:c.licenseId})}
return{links,errors:[...new Set(errors)]}}
