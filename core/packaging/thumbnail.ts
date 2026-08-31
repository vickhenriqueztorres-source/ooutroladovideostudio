import type{PackagingAdapter,PackagingBlockingError,PackagingInput,ThumbnailBrief,TitleCandidate}from"../contracts/packaging"

const MAX_OVERLAY=24
const MIN_CONTRAST=4.5

export function buildThumbnailBrief(i:PackagingInput,selected:TitleCandidate|undefined,adapter:PackagingAdapter){
  const errors:PackagingBlockingError[]=[]
  if(!selected||!i.thumbnailConcept.trim()){
    errors.push("THUMBNAIL_BRIEF_MISSING")
    return{brief:undefined,errors}
  }
  const overlayText=selected.text.split(/\s+/).slice(0,3).join(" ")
  const bindings=i.thumbnailEvidenceIds.map(id=>i.evidenceMatrix.find(e=>e.evidenceId===id))
  const unresolved=bindings.some(b=>!b)
  const synthetic=bindings.filter(b=>b&&b.classification!=="REAL_EVIDENCE")
  const unverifiedReal=bindings.some(b=>b&&b.classification==="REAL_EVIDENCE"&&!b.verified)
  const representationLabels=[...new Set(synthetic.map(b=>b!.classification))]
  const depictsRealEvidence=bindings.length>0&&bindings.every(b=>b&&b.classification==="REAL_EVIDENCE"&&b.verified)
  if(unresolved||unverifiedReal)errors.push("THUMBNAIL_FABRICATED_EVIDENCE")
  const measured=adapter.buildThumbnailBrief(i.thumbnailConcept,overlayText)
  const illegible=overlayText.length>MAX_OVERLAY||measured.contrastRatio<MIN_CONTRAST||!measured.safeAreaValid
  if(illegible)errors.push("THUMBNAIL_TEXT_ILLEGIBLE")
  const brief:ThumbnailBrief={briefId:`THB-${selected.titleId}`,concept:i.thumbnailConcept,overlayText,overlayCharacterCount:overlayText.length,contrastRatio:measured.contrastRatio,safeAreaValid:measured.safeAreaValid,representationLabels,depictsRealEvidence,evidenceIds:[...i.thumbnailEvidenceIds],status:errors.length?"REJECTED":"APPROVED"}
  return{brief,errors:[...new Set(errors)]}
}
