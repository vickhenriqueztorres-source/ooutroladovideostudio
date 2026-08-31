import type{MasterApprovalReceipt,PackagingInput}from"../../core/contracts/packaging"
import{runFinalAssembly}from"../../core/final-assembly"
import{receiptHashes}from"../../core/packaging/validation"
import{MockFinalAssemblyAdapter}from"../../providers/assembly"
import{validAssemblyInput}from"./final-assembly"

export function approvedAssembly(){
  const assemblyInput=validAssemblyInput()
  const assemblyPack=runFinalAssembly(assemblyInput,new MockFinalAssemblyAdapter())
  return{assemblyInput,assemblyPack}
}

export function validPackagingInput():PackagingInput{
  const{assemblyInput,assemblyPack}=approvedAssembly()
  const base={
    schemaVersion:"1.0.0",
    projectId:assemblyInput.projectId,
    runId:"run-packaging",
    episodeId:"OOL-PIX-001",
    packagingVersion:"1.0.0",
    assemblyPack,
    renderManifest:assemblyPack.renderManifest,
    claims:[{claimId:"CLM-1",status:"VERIFIED" as const,conditionalLanguageApproved:false}],
    sources:[{sourceId:"SRC-1",title:"Relatório técnico oficial",url:"https://example.org/relatorio",retrievedAt:"2026-01-01T00:00:00.000Z",verified:true}],
    evidenceMatrix:assemblyInput.evidenceMatrix,
    thumbnailEvidenceIds:[] as string[],
    titleSeeds:[{text:"Como a brecha foi explorada",claimIds:["CLM-1"]}],
    thumbnailConcept:"Camada técnica sobre o fluxo de pagamento",
    descriptionSeed:"Análise técnica do incidente com fontes verificadas.",
    language:"pt-BR",
    forbiddenTitlePatterns:["você não vai acreditar","inacreditável","choque"],
    qcThreshold:.9,
    publishApproval:null,
  }
  const hashes=receiptHashes(base as unknown as PackagingInput)
  const masterApprovalReceipt:MasterApprovalReceipt={
    episodeId:base.episodeId,
    projectId:base.projectId,
    assemblyPackId:assemblyPack.assemblyPackId,
    assemblyPackVersion:assemblyInput.assemblyVersion,
    state:"MASTER_APPROVED",
    approvedAt:"2026-01-02T00:00:00.000Z",
    approvedBy:"reviewer-1",
    ...hashes,
    blockers:[],
    warnings:[],
    nextAgent:"PACKAGING_AGENT",
  }
  return{...base,masterApprovalReceipt}
}
