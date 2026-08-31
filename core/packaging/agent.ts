import type{MetadataBundle,PackagingAdapter,PackagingBlockingError,PackagingCheckpointStage,PackagingInput,PackagingPack}from"../contracts/packaging"
import{PackagingInputSchema}from"../schemas/packaging"
import{compileDescription,resolveChapters}from"./description"
import{resolveDisclosures}from"./disclosure"
import{buildPackagingQC}from"./qc"
import{buildThumbnailBrief}from"./thumbnail"
import{resolveTitles}from"./titles"
import{packagingHash,validatePackagingInput}from"./validation"

export const packagingJobKey=(i:PackagingInput)=>packagingHash([i.projectId,i.episodeId,i.packagingVersion,i.masterApprovalReceipt.renderManifestHash,packagingHash(i.masterApprovalReceipt),packagingHash(i.titleSeeds),i.language])

const stageFor=(errors:PackagingBlockingError[]):PackagingCheckpointStage=>{
  if(errors.some(e=>e.startsWith("MASTER")||e.startsWith("ASSEMBLY_PACK")||e.startsWith("PACKAGING_INPUT")||e==="LOCALIZATION_MISMATCH"))return"INPUT_VALIDATED"
  if(errors.some(e=>e.startsWith("TITLE")))return"RECEIPT_VERIFIED"
  if(errors.some(e=>e.startsWith("THUMBNAIL")))return"TITLES_RESOLVED"
  if(errors.some(e=>e.startsWith("DESCRIPTION")))return"THUMBNAIL_BRIEFED"
  if(errors.some(e=>e.startsWith("CHAPTER")))return"DESCRIPTION_COMPILED"
  if(errors.some(e=>e.includes("DISCLOSURE")))return"CHAPTERS_RESOLVED"
  if(errors.length)return"DISCLOSURES_VERIFIED"
  return"PACKAGING_READY"
}

export function runPackaging(raw:PackagingInput,adapter:PackagingAdapter):PackagingPack{
  PackagingInputSchema.parse(raw)
  const i=raw,key=packagingJobKey(i),id=`packaging-${key.slice(7,19)}`
  const warnings:string[]=[]
  const inputHashes={masterReceipt:packagingHash(i.masterApprovalReceipt),assemblyPack:packagingHash(i.assemblyPack),renderManifest:packagingHash(i.renderManifest)}
  const inputErrors=validatePackagingInput(i)
  const titles=resolveTitles(i)
  const disclosures=resolveDisclosures(i)
  const chapters=resolveChapters(i)
  const description=compileDescription(i,chapters.chapters,disclosures.disclosureText)
  const thumbnail=buildThumbnailBrief(i,titles.selected,adapter)
  const errors=[...new Set<PackagingBlockingError>([...inputErrors,...titles.errors,...thumbnail.errors,...description.errors,...chapters.errors,...disclosures.errors])]

  const selectedTitleId=titles.selected?.titleId??""
  const brief=thumbnail.brief??{briefId:`THB-${id}`,concept:i.thumbnailConcept,overlayText:"",overlayCharacterCount:0,contrastRatio:0,safeAreaValid:false,representationLabels:[],depictsRealEvidence:false,evidenceIds:[...i.thumbnailEvidenceIds],status:"REJECTED" as const}
  const metadataCore={language:i.language,selectedTitleId,titleCandidates:titles.candidates,thumbnailBrief:brief,description:description.description,chapters:chapters.chapters,sourceDisclosure:disclosures.sourceDisclosure,syntheticDisclosure:disclosures.syntheticDisclosure,tags:[...new Set(i.claims.filter(c=>c.status==="VERIFIED").map(c=>c.claimId))]}
  const metadataHash=packagingHash(metadataCore)
  if(!metadataHash)errors.push("METADATA_HASH_MISSING")
  const metadata:MetadataBundle={bundleId:`meta-${id}`,...metadataCore,metadataHash}

  const validChapters=chapters.chapters.filter(c=>c.endSec>c.startSec).length
  const approvedTitles=titles.candidates.filter(c=>c.status==="APPROVED").length
  const prelim=buildPackagingQC(errors,titles.candidates.length,approvedTitles,chapters.chapters.length,validChapters)
  if(prelim.overall<i.qcThreshold)errors.push("PACKAGING_QC_FAILED")
  const unique=[...new Set(errors)]
  const packagingQC=buildPackagingQC(unique,titles.candidates.length,approvedTitles,chapters.chapters.length,validChapters)
  const ready=!unique.length&&packagingQC.overall>=i.qcThreshold
  const publishAuthorized=ready&&Boolean(i.publishApproval?.approvedBy&&i.publishApproval?.approvedAt)
  if(ready&&!publishAuthorized)warnings.push("PUBLISH_APPROVAL_MISSING")
  if(titles.candidates.some(c=>c.status==="REJECTED")&&ready)warnings.push("TITLE_CANDIDATES_PARTIALLY_REJECTED")

  return{
    schemaVersion:i.schemaVersion,projectId:i.projectId,runId:i.runId,packagingPackId:id,episodeId:i.episodeId,
    status:ready?"PACKAGING_READY":unique.length?"BLOCKED":"NEEDS_REVIEW",
    metadata,packagingQC,blockingErrors:unique,warnings,inputHashes,packagingJobKey:key,
    checkpoint:{projectId:i.projectId,runId:i.runId,packagingPackId:id,stage:stageFor(unique),inputHash:key,artifactHash:metadataHash,createdAt:new Date(0).toISOString()},
    publishAuthorized,
    nextAgent:publishAuthorized?"PUBLISH_AGENT":"HUMAN_REVIEW",
  }
}
