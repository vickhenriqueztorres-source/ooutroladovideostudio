import type{PackagingBlockingError,PackagingInput,TitleCandidate}from"../contracts/packaging"

const MIN=15,MAX=100
const numbers=(text:string)=>text.match(/\d+(?:[.,]\d+)?/g)??[]

export function resolveTitles(i:PackagingInput){
  const errors:PackagingBlockingError[]=[]
  const corpus=i.assemblyPack.captionTrack.cues.map(c=>c.text).join(" ")
  const claimById=new Map(i.claims.map(c=>[c.claimId,c]))
  const candidates:TitleCandidate[]=i.titleSeeds.map((seed,index)=>{
    const flags=i.forbiddenTitlePatterns.filter(p=>p&&seed.text.toLowerCase().includes(p.toLowerCase()))
    const lengthInvalid=seed.text.length<MIN||seed.text.length>MAX
    const fabricated=numbers(seed.text).filter(n=>!corpus.includes(n))
    const claimIssue=seed.claimIds.some(id=>{
      const claim=claimById.get(id)
      if(!claim||claim.status==="UNSUPPORTED")return true
      return claim.status==="UNCERTAIN"&&!claim.conditionalLanguageApproved
    })
    if(flags.length)errors.push("TITLE_SENSATIONALIST")
    if(lengthInvalid)errors.push("TITLE_LENGTH_INVALID")
    if(fabricated.length||claimIssue)errors.push("TITLE_CLAIM_UNSUPPORTED")
    return{titleId:`TTL-${index+1}`,text:seed.text,claimIds:[...seed.claimIds],rank:index+1,sensationalismFlags:flags,characterCount:seed.text.length,status:flags.length||lengthInvalid||fabricated.length||claimIssue?"REJECTED" as const:"APPROVED" as const}
  })
  const selected=candidates.find(c=>c.status==="APPROVED")
  if(!selected)errors.push("TITLE_CANDIDATE_MISSING")
  return{candidates,selected,errors:[...new Set(errors)]}
}
