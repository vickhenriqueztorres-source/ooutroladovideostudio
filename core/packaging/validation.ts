import{createHash}from"node:crypto"
import type{PackagingBlockingError,PackagingInput}from"../contracts/packaging"

const hash=(v:unknown)=>`sha256:${createHash("sha256").update(JSON.stringify(v)).digest("hex")}`

export const receiptHashes=(i:PackagingInput)=>({timelineHash:i.assemblyPack.timelineCompilation.timelineHash,renderManifestHash:hash(i.renderManifest),captionHash:i.assemblyPack.captionTrack.captionHash,evidenceManifestHash:hash(i.assemblyPack.assetLinks),qcReportHash:hash(i.assemblyPack.assemblyQC)})

export function validatePackagingInput(i:PackagingInput):PackagingBlockingError[]{
  const errors:PackagingBlockingError[]=[]
  const r=i.masterApprovalReceipt
  if(!r)return["MASTER_RECEIPT_MISSING"]
  if(r.state!=="MASTER_APPROVED"||r.blockers.length)errors.push("MASTER_NOT_APPROVED")
  if(i.assemblyPack.status!=="DELIVERY_APPROVED")errors.push("MASTER_NOT_APPROVED")
  if(i.renderManifest.status!=="RENDERED"||!i.renderManifest.outputHash)errors.push("MASTER_NOT_APPROVED")
  if(r.projectId!==i.projectId||r.episodeId!==i.episodeId)errors.push("PACKAGING_INPUT_INVALID")
  if(r.assemblyPackId!==i.assemblyPack.assemblyPackId)errors.push("ASSEMBLY_PACK_VERSION_MISMATCH")
  const expected=receiptHashes(i)
  const mismatched=(Object.keys(expected) as (keyof typeof expected)[]).filter(k=>r[k]!==expected[k])
  if(mismatched.length)errors.push(mismatched.length===1&&mismatched[0]==="renderManifestHash"?"MASTER_RECEIPT_HASH_MISMATCH":"ASSEMBLY_PACK_MUTATED")
  if(i.language!==i.assemblyPack.captionTrack.language)errors.push("LOCALIZATION_MISMATCH")
  if(!i.sources.some(s=>s.verified))errors.push("DESCRIPTION_SOURCE_MISSING")
  return [...new Set(errors)]
}

export{hash as packagingHash}
