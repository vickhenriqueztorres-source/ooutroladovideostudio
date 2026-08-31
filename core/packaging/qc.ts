import type{PackagingBlockingError,PackagingQC}from"../contracts/packaging"

const gate=(errors:PackagingBlockingError[],prefixes:string[])=>errors.some(e=>prefixes.some(p=>e.startsWith(p)))?0:1

export function buildPackagingQC(errors:PackagingBlockingError[],totalTitles:number,approvedTitles:number,chapters:number,validChapters:number):PackagingQC{
  const q={
    receiptIntegrity:gate(errors,["MASTER","ASSEMBLY_PACK","PACKAGING_INPUT"]),
    titleIntegrity:totalTitles?approvedTitles/totalTitles:0,
    thumbnailIntegrity:gate(errors,["THUMBNAIL"]),
    descriptionIntegrity:gate(errors,["DESCRIPTION"]),
    chapterCoverage:chapters?validChapters/chapters:0,
    disclosureIntegrity:gate(errors,["SOURCE_DISCLOSURE","SYNTHETIC_DISCLOSURE"]),
    localizationIntegrity:gate(errors,["LOCALIZATION"]),
    metadataReproducibility:gate(errors,["METADATA_HASH"]),
    overall:0,
  }
  q.overall=Object.values(q).slice(0,8).reduce((a,b)=>a+Number(b),0)/8
  return q
}
