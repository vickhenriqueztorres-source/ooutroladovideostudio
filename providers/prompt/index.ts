import type{EditBlueprint,PromptPack,PromptUnit,ProviderCapabilityRequirement,ReferenceManifest}from"../../core/contracts"
import{compilePromptPack,runPromptPackQC}from"../../core/prompt-pack"
export class MockPromptPackCompiler{compile(b:EditBlueprint){return compilePromptPack(b)}}
export class MockPromptQC{run(p:PromptPack,b:EditBlueprint){return runPromptPackQC(p,b)}}
export class MockReferenceResolver{resolve(p:PromptUnit):ReferenceManifest{return{referenceManifestId:`manifest-${p.promptId}`,promptId:p.promptId,references:p.references.map(referenceId=>({referenceId,entityType:"CONTINUITY",role:"IDENTITY",required:true,status:"APPROVED",locks:[],forbiddenDrift:["substituição"]})),calibrationRequired:true,providerAgnosticRequirements:["preservar locks"]}}}
export type CapabilityValidation={status:"BLOCKED"|"SUPPORTED";missing:ProviderCapabilityRequirement[]}
