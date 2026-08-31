import{createHash}from"node:crypto"
import type{AdherenceScore,GeneratedImageAsset,ImageAssetType,ImageBudgetUsage,ImageGenerationInput,ImageGenerationJob,ImagePack,ProviderAdherenceProfile,RejectedImageAsset,StartFrameRegistryEntry,VisualComparisonSet}from"../contracts/image-generation"
import type{ImagePromptSpec}from"../contracts/prompt-pack"
import{ImageGenerationInputSchema}from"../schemas/image-generation"
import{calibrationBlockReason,detectSilentProviderMix}from"./calibration"
import{resolveReferences}from"./references"
import{buildVisualQC,isApproved,scoreOverall,weightedOverall}from"./qc"
import{registerStartFrame}from"./start-frame-registry"

const stable=(v:unknown):string=>JSON.stringify(v,(_,x)=>x&&typeof x==="object"&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x)
export const imageHash=(v:unknown)=>createHash("sha256").update(stable(v)).digest("hex")

const PURPOSE_TO_TYPE:Record<string,ImageAssetType>={REFERENCE:"REFERENCE",START_FRAME:"START_FRAME",INSERT:"INSERT",ATMOSPHERE:"ATMOSPHERE",EVIDENCE_SUPPORT:"INSERT"}

// Deterministic idempotency key per spec.
export function imageJobKey(input:{projectId:string;promptId:string;promptVersion:string;promptHash:string;providerId:string;runtime:string;adapterVersion:string;referenceManifestId:string;referenceAssetHashes:string[];parameters:unknown}):string{
  return imageHash(input)
}

// The adapter never generates real bytes here; it returns a deterministic simulated descriptor.
export interface ImageProviderAdapter{readonly id:string;readonly runtime:string;readonly adapterVersion:string;simulate(job:ImageGenerationJob):{assetPath:string;sha256:string;adherence:AdherenceScore;hardFails:string[]}}

function buildJob(input:ImageGenerationInput,spec:ImagePromptSpec,approvedRefs:string[]):ImageGenerationJob{
  const providerId=input.providerExecutionPlan.providerId
  const adapterVersion=input.providerExecutionPlan.adapterVersion
  const runtime="mock-runtime"
  const promptHash=imageHash({promptId:spec.promptId,locks:spec.identityLocks,composition:spec.compositionLocks})
  const parameters={aspectRatio:spec.requestedAspectRatio,resolution:spec.requestedResolution,outputCount:1}
  const referenceManifestId=input.references.find(m=>m.promptId===spec.promptId)?.referenceManifestId??"none"
  const key=imageJobKey({projectId:input.projectId,promptId:spec.promptId,promptVersion:promptHash.slice(0,12),promptHash,providerId,runtime,adapterVersion,referenceManifestId,referenceAssetHashes:approvedRefs,parameters})
  return{imageJobId:`imgjob-${spec.promptId}`,promptId:spec.promptId,assetRequestId:spec.promptId,shotId:spec.promptId,assetType:PURPOSE_TO_TYPE[spec.imagePurpose],providerId,runtime,adapterVersion,promptVersion:promptHash.slice(0,12),promptHash,referenceManifestId,approvedReferenceIds:approvedRefs,parameters,strictLocks:spec.identityLocks,negativeConstraints:[],representationType:spec.imagePurpose==="EVIDENCE_SUPPORT"?"REAL_EVIDENCE":"ILLUSTRATION",postProductionRequirements:spec.textPolicy==="SOURCE_TEXT_PRESERVE"?["preserve-source-text"]:spec.textPolicy==="NO_CRITICAL_TEXT"?["render-critical-text-in-post"]:[],idempotencyKey:key}
}

export interface ImageAgentResult{pack:ImagePack;jobs:ImageGenerationJob[]}

export function runImageAgent(rawInput:ImageGenerationInput,adapter:ImageProviderAdapter):ImageAgentResult{
  ImageGenerationInputSchema.parse(rawInput)
  const input=rawInput
  const blockingErrors:string[]=[]
  const warnings:string[]=[]

  // GATE 1 — references
  const refs=resolveReferences(input.references)
  if(refs.required.length)blockingErrors.push(`IMAGE_REFERENCE_REQUIRED:${refs.required.join(",")}`)
  if(refs.missing.length)blockingErrors.push(`IMAGE_REFERENCE_MISSING:${refs.missing.join(",")}`)
  const approvedRefIds=refs.approved.map(r=>r.referenceId)

  // Evidence specs must never be generated: route them out of the job list entirely.
  const generatableSpecs=input.imageSpecs.filter(s=>s.imagePurpose!=="EVIDENCE_SUPPORT")
  const evidenceSpecs=input.imageSpecs.filter(s=>s.imagePurpose==="EVIDENCE_SUPPORT")
  if(evidenceSpecs.some(s=>!(input.evidenceSpecs.find(e=>e.promptId===s.promptId)?.sourceAssetRequired)))warnings.push("EVIDENCE_SUPPORT_REQUIRES_SOURCE_ASSET")

  const providersInUse=new Set<string>([input.providerExecutionPlan.providerId])
  if(detectSilentProviderMix(providersInUse,input.productionConstraints.allowProviderMix)&&providersInUse.size>1)blockingErrors.push("IMAGE_SILENT_PROVIDER_MIX")

  // GATE 3 — generation (simulated) with GATE 2 calibration guard per asset class.
  const jobs:ImageGenerationJob[]=[]
  const generatedAssets:GeneratedImageAsset[]=[]
  const rejectedAssets:RejectedImageAsset[]=[]
  const comparisonSets:VisualComparisonSet[]=[]
  const startFrameEntries:StartFrameRegistryEntry[]=[]

  for(const spec of generatableSpecs){
    const usableRefs=spec.referenceIds.filter(r=>approvedRefIds.includes(r))
    const job=buildJob(input,spec,usableRefs)
    jobs.push(job)
    const lookup={providerId:job.providerId,runtime:job.runtime,adapterVersion:job.adapterVersion}
    const calBlock=calibrationBlockReason(input.calibrationReports,lookup,job.assetType)
    const sim=adapter.simulate(job)
    const hardFails=[...sim.hardFails]
    // Any reference id explicitly flagged rejected cannot be used as an anchor.
    if(spec.referenceIds.some(r=>r.startsWith("rejected-")))hardFails.push("IMAGE_UNAPPROVED_REFERENCE_USED")
    if(calBlock&&!hardFails.includes(calBlock))hardFails.push(calBlock)
    if(job.assetType==="START_FRAME"&&!spec.preserveForVideo)hardFails.push("IMAGE_MOTION_SPACE_MISSING")
    const overall=hardFails.length?0:scoreOverall(weightedOverall(job.assetType,sim.adherence))
    const adherence:AdherenceScore={...sim.adherence,overall}
    const asset:GeneratedImageAsset={assetId:`img-${spec.promptId}`,imageJobId:job.imageJobId,promptId:spec.promptId,shotId:job.shotId,assetType:job.assetType,assetPath:sim.assetPath,sha256:sim.sha256,representationType:job.representationType,providerId:job.providerId,runtime:job.runtime,adapterVersion:job.adapterVersion,promptHash:job.promptHash,referenceIds:usableRefs,adherence,hardFails,status:"REVIEW_REQUIRED",attempt:1,simulated:true}
    // GATE 5 — approval. A non-calibrated provider/asset-class already contributed a hard fail above.
    asset.status=isApproved(asset,input.productionConstraints.approvalThreshold)?"APPROVED":asset.hardFails.length?"REJECTED":"REVIEW_REQUIRED"
    generatedAssets.push(asset)
    comparisonSets.push({comparisonId:`cmp-${spec.promptId}`,promptId:spec.promptId,assetId:asset.assetId,dimensions:(Object.keys(adherence)as(keyof AdherenceScore)[]).filter(k=>k!=="overall").map(k=>({dimension:k,score:adherence[k],passed:adherence[k]>=input.productionConstraints.approvalThreshold,notes:hardFails.length?"hard-fail":"ok"})),referenceIds:usableRefs,briefingRef:spec.promptId,visualIdentityRef:input.visualIdentityRef,continuityBibleRef:input.continuityBibleRef,factualBoundaryStatus:job.representationType})
    if(asset.status!=="APPROVED"){rejectedAssets.push({assetId:asset.assetId,imageJobId:asset.imageJobId,promptId:asset.promptId,assetType:asset.assetType,reasonCodes:hardFails.length?hardFails:["BELOW_THRESHOLD"],adherence,retryable:!hardFails.some(h=>["IMAGE_EVIDENCE_ALTERED","IMAGE_EVIDENCE_INVENTED","IMAGE_REPRESENTATION_AMBIGUOUS","IMAGE_PROVIDER_NOT_CALIBRATED"].includes(h))})}
    // GATE 6 — propagation: only APPROVED start frames enter the registry.
    if(job.assetType==="START_FRAME"&&asset.status==="APPROVED"){
      startFrameEntries.push(registerStartFrame(asset,spec,`vqc-${spec.promptId}`,spec.motionPreparation??"stable-end-state"))
    }
  }

  const approvedStartFrames=startFrameEntries.filter(e=>e.status==="APPROVED")
  const approvedInserts=generatedAssets.filter(a=>a.assetType==="INSERT"&&a.status==="APPROVED").map(a=>a.assetId)
  const approvedAtmosphereAssets=generatedAssets.filter(a=>a.assetType==="ATMOSPHERE"&&a.status==="APPROVED").map(a=>a.assetId)

  if(jobs.length>input.productionConstraints.maxJobs)blockingErrors.push("IMAGE_BUDGET_EXCEEDED")
  // A non-calibrated provider/asset-class blocks the whole pack, not just the asset.
  if(generatedAssets.some(a=>a.hardFails.includes("IMAGE_PROVIDER_NOT_CALIBRATED")))blockingErrors.push("IMAGE_PROVIDER_NOT_CALIBRATED")

  const byType:Record<string,number>={}
  for(const j of jobs)byType[j.assetType]=(byType[j.assetType]??0)+1
  const budgetUsage:ImageBudgetUsage={totalJobs:jobs.length,byType,references:byType.REFERENCE??0,startFrames:byType.START_FRAME??0,inserts:byType.INSERT??0,atmosphere:byType.ATMOSPHERE??0,retries:0,withinLimits:jobs.length<=input.productionConstraints.maxJobs}

  const providerAdherence:ProviderAdherenceProfile[]=[...providersInUse].map(providerId=>{
    const assets=generatedAssets.filter(a=>a.providerId===providerId)
    const avg=(k:keyof AdherenceScore)=>assets.length?Number((assets.reduce((s,a)=>s+a.adherence[k],0)/assets.length).toFixed(4)):0
    return{providerId,runtime:"mock-runtime",adapterVersion:input.providerExecutionPlan.adapterVersion,calibrationVersion:input.calibrationReports[0]?.calibrationId??"none",assetClass:"ALL",identity:avg("identity"),environment:avg("environment"),objectConsistency:avg("objectGeometry"),palette:avg("palette"),composition:avg("composition"),representation:avg("representation"),textReliability:0,approved:assets.every(a=>a.status==="APPROVED"),blockedReasons:assets.flatMap(a=>a.hardFails)}
  })

  const partial:Omit<ImagePack,"visualQC">={schemaVersion:input.schemaVersion,projectId:input.projectId,runId:input.runId,imagePackId:`imagepack-${imageHash({projectId:input.projectId,promptPackId:input.promptPackId,providerPlanId:input.providerPlanId}).slice(0,16)}`,promptPackId:input.promptPackId,providerPlanId:input.providerPlanId,status:"DRAFT",referenceAssets:refs.approved,generatedAssets,approvedStartFrames,approvedInserts,approvedAtmosphereAssets,rejectedAssets,comparisonSets,calibrationReports:input.calibrationReports,retryHistory:[],providerAdherence,budgetUsage,warnings,blockingErrors,nextAgent:"VIDEO_GENERATION_AGENT"}

  const visualQC=buildVisualQC(partial)
  const allBlocking=[...blockingErrors,...visualQC.blockingErrors]
  const status:ImagePack["status"]=allBlocking.length?"BLOCKED":rejectedAssets.length?"NEEDS_REVIEW":"APPROVED_FOR_VIDEO"
  const nextAgent:ImagePack["nextAgent"]=status==="APPROVED_FOR_VIDEO"?"VIDEO_GENERATION_AGENT":status==="BLOCKED"?"HUMAN_REVIEW":"PROVIDER_JOB_ORCHESTRATOR"

  return{pack:{...partial,status,visualQC:{...visualQC,blockingErrors:allBlocking},nextAgent},jobs}
}
