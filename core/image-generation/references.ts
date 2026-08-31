import type{ReferenceManifest}from"../contracts/prompt-pack"
import type{ReferenceAsset}from"../contracts/image-generation"

// Resolves reference manifests into canonical reference assets.
// Only APPROVED references may become generation anchors; REFERENCE_REQUIRED / MISSING are surfaced as blockers.
export interface ResolvedReferences{approved:ReferenceAsset[];required:string[];missing:string[]}

export function resolveReferences(manifests:ReferenceManifest[]):ResolvedReferences{
  const approved:ReferenceAsset[]=[]
  const required:string[]=[]
  const missing:string[]=[]
  for(const manifest of manifests){
    for(const ref of manifest.references){
      if(ref.status==="APPROVED"){
        approved.push({referenceId:ref.referenceId,entityId:ref.referenceId,entityType:ref.entityType,role:ref.role,assetIds:[`asset-${ref.referenceId}`],locks:ref.locks,forbiddenDrift:ref.forbiddenDrift,status:"APPROVED",sourceManifestId:manifest.referenceManifestId})
      }else if(ref.status==="REFERENCE_REQUIRED"){
        // A required, not-yet-created reference blocks generation only when the manifest depends on it.
        if(ref.required)required.push(ref.referenceId)
      }else{
        if(ref.required)missing.push(ref.referenceId)
      }
    }
  }
  return{approved,required,missing}
}

// Recurring/critical entities can never be treated as atmospheric-flexible.
const CRITICAL_ROLES=new Set(["IDENTITY","DEVICE","OBJECT","LOCATION","EVIDENCE"])
export function classifyReferenceRequirement(role:string,required:boolean):"REFERENCE_REQUIRED"|"REFERENCE_APPROVED"|"REFERENCE_OPTIONAL"|"ATMOSPHERIC_FLEXIBLE"{
  if(CRITICAL_ROLES.has(role))return required?"REFERENCE_REQUIRED":"REFERENCE_APPROVED"
  if(required)return"REFERENCE_REQUIRED"
  return role==="STYLE"?"REFERENCE_OPTIONAL":"ATMOSPHERIC_FLEXIBLE"
}

// An asset that was rejected can never be used downstream as an anchor.
export function isUsableAsAnchor(status:string):boolean{return status==="APPROVED"}
