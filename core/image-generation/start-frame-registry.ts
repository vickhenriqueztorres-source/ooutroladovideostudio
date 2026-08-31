import type{GeneratedImageAsset,StartFrameRegistryEntry}from"../contracts/image-generation"
import type{ImagePromptSpec}from"../contracts/prompt-pack"

// The video agent consumes ONLY entries whose status === "APPROVED".
export function registerStartFrame(asset:GeneratedImageAsset,spec:ImagePromptSpec|undefined,visualQCId:string,expectedEndState:string):StartFrameRegistryEntry{
  return{
    frameId:`frame-${asset.shotId}`,
    shotId:asset.shotId,
    assetId:asset.assetId,
    assetPath:asset.assetPath,
    sha256:asset.sha256,
    status:asset.status,
    promptId:asset.promptId,
    promptVersion:asset.promptHash.slice(0,12),
    referenceIds:asset.referenceIds,
    preservedAttributes:spec?.identityLocks??[],
    allowedMotion:spec?.motionPreparation?[spec.motionPreparation]:[],
    forbiddenMotion:["identity-altering-morph","teleport-cut"],
    composition:spec?.compositionLocks.join(", ")??"locked",
    expectedEndState,
    visualQCId,
  }
}

export function approvedStartFrames(entries:StartFrameRegistryEntry[]):StartFrameRegistryEntry[]{
  return entries.filter(e=>e.status==="APPROVED")
}
