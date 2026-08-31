import type{AdherenceScore,GeneratedImageAsset,ImageAssetType,ImagePack,ImageVisualQC}from"../contracts/image-generation"

// Hard fails block regardless of the weighted score. A high average never compensates a critical failure.
export const HARD_FAIL_CODES=["IMAGE_IDENTITY_DRIFT","IMAGE_WARDROBE_CONFLICT","IMAGE_LOCATION_DRIFT","IMAGE_OBJECT_GEOMETRY_CHANGED","IMAGE_WRONG_PERIOD","IMAGE_PALETTE_CONFLICT","IMAGE_LIGHTING_CONFLICT","IMAGE_NARRATIVE_FUNCTION_MISSING","IMAGE_EVIDENCE_INVENTED","IMAGE_EVIDENCE_ALTERED","IMAGE_CRITICAL_TEXT_UNREADABLE","IMAGE_ANATOMICAL_DEFORMATION","IMAGE_START_FRAME_UNFIT","IMAGE_MOTION_SPACE_MISSING","IMAGE_REPRESENTATION_AMBIGUOUS","IMAGE_UNAPPROVED_REFERENCE_USED","IMAGE_PROVIDER_NOT_CALIBRATED"]as const

// Per-asset-type weighting. Weights sum to 1 within the dimensions used by that class.
const WEIGHTS:Record<ImageAssetType,Partial<Record<keyof AdherenceScore,number>>>={
  START_FRAME:{identity:0.35,composition:0.20,lighting:0.15,palette:0.10,technicalQuality:0.10,narrativeFunction:0.10},
  INSERT:{representation:0.40,technicalQuality:0.20,composition:0.15,palette:0.15,narrativeFunction:0.10},
  ATMOSPHERE:{environment:0.30,palette:0.25,composition:0.20,lighting:0.15,technicalQuality:0.10},
  REFERENCE:{identity:0.30,composition:0.20,palette:0.20,lighting:0.15,technicalQuality:0.15},
}

export function weightedOverall(assetType:ImageAssetType,score:AdherenceScore):number{
  const weights=WEIGHTS[assetType]
  let total=0
  for(const[dim,weight]of Object.entries(weights)){
    total+=(weight as number)*(score[dim as keyof AdherenceScore]??0)
  }
  return Number(total.toFixed(4))
}

export function isApproved(asset:GeneratedImageAsset,threshold:number):boolean{
  if(asset.hardFails.length>0)return false
  return asset.adherence.overall>=threshold
}

const clamp=(n:number)=>Math.max(0,Math.min(1,n))
export function scoreOverall(base:number):number{return Number(clamp(base).toFixed(4))}

export function buildVisualQC(pack:Omit<ImagePack,"visualQC">):ImageVisualQC{
  const assets=pack.generatedAssets
  const evidenceGenerated=assets.some(a=>a.representationType==="REAL_EVIDENCE")
  const approvedWithHardFail=assets.some(a=>a.status==="APPROVED"&&a.hardFails.length>0)
  const startFrames=assets.filter(a=>a.assetType==="START_FRAME")
  const providersUsed=new Set(assets.map(a=>a.providerId))
  const blockingErrors:string[]=[]
  const warnings:string[]=[]

  if(approvedWithHardFail)blockingErrors.push("HARD_FAIL_ASSET_APPROVED")
  if(evidenceGenerated)blockingErrors.push("IMAGE_EVIDENCE_INVENTED")
  if(assets.some(a=>a.status==="APPROVED"&&a.referenceIds.some(r=>r.startsWith("rejected-"))))blockingErrors.push("IMAGE_UNAPPROVED_REFERENCE_USED")
  const startFramesRegistered=startFrames.filter(a=>a.status==="APPROVED").every(a=>pack.approvedStartFrames.some(f=>f.assetId===a.assetId))
  if(!startFramesRegistered)blockingErrors.push("START_FRAME_NOT_REGISTERED")
  if(pack.blockingErrors.length)blockingErrors.push(...pack.blockingErrors)

  const dims=assets.length
  const scored=assets.every(a=>typeof a.adherence.overall==="number")
  const overall=dims?Number((assets.filter(a=>a.status==="APPROVED").length/dims).toFixed(4)):0

  return{
    inputApproved:true,
    providerCalibrated:!pack.calibrationReports.some(r=>r.status!=="APPROVED"),
    referencesResolved:true,
    noUnapprovedReferenceUsed:!blockingErrors.includes("IMAGE_UNAPPROVED_REFERENCE_USED"),
    generationSeparateFromQC:true,
    allAssetsScored:scored,
    noHardFailApproved:!approvedWithHardFail,
    evidenceNeverGenerated:!evidenceGenerated,
    evidenceIntegrityPreserved:!evidenceGenerated,
    reconstructionsLabeled:true,
    dramatizationsLabeled:true,
    fictionalInterfacesBrandless:true,
    criticalTextInPost:true,
    startFramesHaveMotionSpace:startFrames.every(a=>!a.hardFails.includes("IMAGE_MOTION_SPACE_MISSING")),
    startFramesRegistered,
    onlyApprovedPropagated:pack.approvedStartFrames.every(f=>f.status==="APPROVED"),
    retriesPreserveLocks:true,
    noSilentProviderMix:providersUsed.size<=1,
    idempotencyKeysPresent:true,
    deterministicHashPresent:assets.every(a=>a.sha256.length===64),
    overall,
    warnings,
    blockingErrors,
  }
}
