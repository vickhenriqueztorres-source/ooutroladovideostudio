import type{ImageGenerationInput}from"../../core/contracts"
import{mockCalibrationApproved}from"../../providers/image"

const manifest=(promptId:string,refId:string,role:"IDENTITY"|"LOCATION"|"OBJECT"|"DEVICE"|"STYLE",status:"APPROVED"|"REFERENCE_REQUIRED"|"MISSING"="APPROVED")=>({referenceManifestId:`man-${promptId}`,promptId,references:[{referenceId:refId,entityType:role,role,required:true,status,locks:["facial-structure","wardrobe"],forbiddenDrift:["identity","period"]}],calibrationRequired:true,providerAgnosticRequirements:["identity-lock"]})

const imageSpec=(promptId:string,purpose:"REFERENCE"|"START_FRAME"|"INSERT"|"ATMOSPHERE"|"EVIDENCE_SUPPORT",refIds:string[],opts:Partial<{preserveForVideo:boolean;strictLocks:string[];textPolicy:"NO_CRITICAL_TEXT"|"PLACEHOLDER_ONLY"|"SOURCE_TEXT_PRESERVE"}>={})=>({promptId,imagePurpose:purpose,referenceIds:refIds,identityLocks:opts.strictLocks??["facial-structure"],compositionLocks:["rule-of-thirds","motion-safe-area"],requestedAspectRatio:"16:9",requestedResolution:"1920x1080",preserveForVideo:opts.preserveForVideo??(purpose==="START_FRAME"),motionPreparation:purpose==="START_FRAME"?"left-to-right-dolly":undefined,textPolicy:opts.textPolicy??"NO_CRITICAL_TEXT",qcChecks:["identity","composition"]})

const execPlan=(providerId="mock-image-provider",adapterVersion="1.0.0",promptIds:string[]=[])=>({providerId,adapterVersion,executionPlanId:"plan-1",jobs:promptIds.map((p,i)=>({jobId:`job-${i+1}`,promptId:p}))})

const base:Omit<ImageGenerationInput,"references"|"imageSpecs"|"evidenceSpecs"|"providerExecutionPlan"|"calibrationReports">={schemaVersion:"1.0.0",projectId:"proj-img",runId:"run-img",promptPackId:"pp-1",providerPlanId:"pplan-1",status:"PROVIDER_PLAN_APPROVED",visualIdentityRef:"vib-1",continuityBibleRef:"cont-1",productionConstraints:{maxJobs:20,maxRetriesPerJob:2,approvalThreshold:0.6,outputDirectory:"outputs/mock",allowProviderMix:false}}

// Positive: all references approved, provider calibrated for every class, start frame has motion space.
export function positiveImageInput():ImageGenerationInput{
  const refs=[manifest("sf-1","char-ana","IDENTITY"),manifest("ins-1","doc-1","OBJECT"),manifest("atm-1","loc-1","LOCATION")]
  const imageSpecs=[imageSpec("sf-1","START_FRAME",["char-ana"],{preserveForVideo:true}),imageSpec("ins-1","INSERT",["doc-1"]),imageSpec("atm-1","ATMOSPHERE",["loc-1"])]
  return{...base,references:refs,imageSpecs,evidenceSpecs:[],providerExecutionPlan:execPlan("mock-image-provider","1.0.0",["sf-1","ins-1","atm-1"]),calibrationReports:[mockCalibrationApproved()]}
}

// Negative: identity drift on the start frame -> hard fail, never approved.
export function driftImageInput():ImageGenerationInput{
  const i=positiveImageInput()
  i.imageSpecs[0].identityLocks=["drift:identity"]
  return i
}

// Negative: provider has no calibration report -> production blocked for every class.
export function uncalibratedImageInput():ImageGenerationInput{
  const i=positiveImageInput()
  i.calibrationReports=[]
  return i
}

// Negative: partial calibration -> START_FRAME blocked, ATMOSPHERE allowed.
export function partialCalibrationInput():ImageGenerationInput{
  const i=positiveImageInput()
  i.calibrationReports=[mockCalibrationApproved("mock-image-provider","mock-runtime","1.0.0",["ATMOSPHERE","INSERT"],["START_FRAME","REFERENCE"])]
  return i
}

// Negative: a required reference is MISSING -> blocked.
export function missingReferenceInput():ImageGenerationInput{
  const i=positiveImageInput()
  i.references[0].references[0].status="MISSING"
  return i
}

// Negative: a rejected reference id is fed as an anchor -> hard fail.
export function rejectedReferenceInput():ImageGenerationInput{
  const i=positiveImageInput()
  i.imageSpecs[1].referenceIds=["rejected-doc-9"]
  return i
}

// Negative: start frame lacks motion space (preserveForVideo=false) -> hard fail.
export function noMotionSpaceInput():ImageGenerationInput{
  const i=positiveImageInput()
  i.imageSpecs[0].preserveForVideo=false
  return i
}

// Evidence support never generates: it must be routed out of the job list and require a source asset.
export function evidenceSupportInput():ImageGenerationInput{
  const i=positiveImageInput()
  i.imageSpecs.push(imageSpec("ev-1","EVIDENCE_SUPPORT",[],{textPolicy:"SOURCE_TEXT_PRESERVE"}))
  i.evidenceSpecs=[{promptId:"ev-1",claimIds:["c1"],sourceIds:["s1"],evidenceClassification:"VERIFIED",sourceAssetRequired:true,sourceAssetIds:["src-1"],allowedTreatment:["crop"],forbiddenTreatment:["fabricate"],onscreenLabel:"Fonte: documento",integrityChecks:["hash"],qcChecks:["integrity"]}as unknown as ImageGenerationInput["evidenceSpecs"][number]]
  return i
}
