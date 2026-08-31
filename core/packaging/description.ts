import type{Chapter,DescriptionDraft,PackagingBlockingError,PackagingInput}from"../contracts/packaging"

const numbers=(text:string)=>text.match(/\d+(?:[.,]\d+)?/g)??[]
const stamp=(sec:number)=>{const s=Math.floor(sec),m=Math.floor(s/60);return `${String(m).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`}

export function resolveChapters(i:PackagingInput){
  const errors:PackagingBlockingError[]=[]
  const blocks=[...i.assemblyPack.timelineCompilation.blocks]
  const duration=i.assemblyPack.timelineCompilation.durationSeconds
  const chapters:Chapter[]=blocks.map((b,index)=>{
    const cue=i.assemblyPack.captionTrack.cues.find(c=>c.startSec>=b.startSec&&c.endSec<=b.endSec)
    return{chapterId:`CHP-${index+1}`,title:cue?cue.text.slice(0,60):b.blockId,startSec:b.startSec,endSec:b.endSec,blockId:b.blockId}
  })
  if(!chapters.length||chapters[0].startSec!==0)errors.push("CHAPTER_TIMESTAMP_INVALID")
  for(let x=0;x<chapters.length;x++){
    const c=chapters[x]
    if(c.endSec<=c.startSec||c.endSec>duration+.01)errors.push("CHAPTER_TIMESTAMP_INVALID")
    if(x&&c.startSec<chapters[x-1].endSec)errors.push("CHAPTER_TIMESTAMP_INVALID")
  }
  const covered=chapters.reduce((total,c)=>total+(c.endSec-c.startSec),0)
  if(Math.abs(covered-duration)>.01)errors.push("CHAPTER_COVERAGE_INCOMPLETE")
  return{chapters,errors:[...new Set(errors)]}
}

export function compileDescription(i:PackagingInput,chapters:Chapter[],disclosureText:string){
  const errors:PackagingBlockingError[]=[]
  const corpus=i.assemblyPack.captionTrack.cues.map(c=>c.text).join(" ")
  const fabricated=numbers(i.descriptionSeed).filter(n=>!corpus.includes(n))
  const unsupportedReferenced=i.claims.filter(c=>c.status==="UNSUPPORTED"&&i.descriptionSeed.includes(c.claimId))
  if(fabricated.length||unsupportedReferenced.length)errors.push("DESCRIPTION_CLAIM_UNSUPPORTED")
  const verifiedSources=i.sources.filter(s=>s.verified)
  if(!verifiedSources.length)errors.push("DESCRIPTION_SOURCE_MISSING")
  const claimIds=i.claims.filter(c=>c.status==="VERIFIED"||c.status==="UNCERTAIN"&&c.conditionalLanguageApproved).map(c=>c.claimId)
  const body=[i.descriptionSeed.trim(),"","Capítulos:",...chapters.map(c=>`${stamp(c.startSec)} ${c.title}`),"","Fontes:",...verifiedSources.map(s=>s.url?`${s.title} — ${s.url}`:s.title),"",disclosureText].join("\n")
  const description:DescriptionDraft={language:i.language,body,claimIds,sourceIds:verifiedSources.map(s=>s.sourceId),disclosureIncluded:Boolean(disclosureText),characterCount:body.length}
  return{description,errors:[...new Set(errors)]}
}
