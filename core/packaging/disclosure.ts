import type{PackagingBlockingError,PackagingInput,SourceDisclosure,SyntheticDisclosure}from"../contracts/packaging"

const SYNTHETIC=["RECONSTRUCTION","DRAMATIZATION","FICTIONAL_INTERFACE","EXPLANATORY_GRAPHIC"] as const

export function resolveDisclosures(i:PackagingInput){
  const errors:PackagingBlockingError[]=[]
  const verified=i.sources.filter(s=>s.verified)
  const sourceDisclosure:SourceDisclosure={disclosureId:`SRC-${i.episodeId}`,language:i.language,text:verified.length?"Fontes verificadas listadas na descrição.":"",sourceIds:verified.map(s=>s.sourceId),complete:verified.length===i.sources.length&&verified.length>0}
  if(!sourceDisclosure.text||!sourceDisclosure.sourceIds.length)errors.push("SOURCE_DISCLOSURE_MISSING")
  const present=[...new Set(i.evidenceMatrix.filter(e=>SYNTHETIC.includes(e.classification as (typeof SYNTHETIC)[number])).map(e=>e.classification))]
  const required=present.length>0
  const text=required?"Este episódio contém reconstruções, dramatizações e interfaces recriadas identificadas como tal. Esses trechos não são registros originais.":""
  const syntheticDisclosure:SyntheticDisclosure={disclosureId:`SYN-${i.episodeId}`,language:i.language,text,representationTypes:present,required,present:Boolean(text)}
  if(required&&!syntheticDisclosure.present)errors.push("SYNTHETIC_DISCLOSURE_MISSING")
  const disclosureText=[sourceDisclosure.text,syntheticDisclosure.text].filter(Boolean).join(" ")
  return{sourceDisclosure,syntheticDisclosure,disclosureText,errors:[...new Set(errors)]}
}
