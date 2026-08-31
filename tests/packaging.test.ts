import{describe,expect,it}from"vitest"
import{packagingJobKey,runPackaging}from"../core/packaging"
import{MockPackagingAdapter}from"../providers/packaging"
import{validPackagingInput}from"./fixtures/packaging"

const run=(mutate:(i:ReturnType<typeof validPackagingInput>)=>void=()=>{},adapter=new MockPackagingAdapter())=>{
  const input=validPackagingInput()
  mutate(input)
  return runPackaging(input,adapter)
}

describe("packaging agent",()=>{
  it("aprova metadados derivados de master aprovado",()=>{
    const pack=run()
    expect(pack.status).toBe("PACKAGING_READY")
    expect(pack.blockingErrors).toEqual([])
    expect(pack.metadata.selectedTitleId).toBe("TITLE-1")
    expect(pack.metadata.thumbnailOptions).toHaveLength(3)
    expect(pack.metadata.recommendedSelection.alternatives).toHaveLength(3)
  })

  it("não autoriza publicação sem aprovação explícita",()=>{
    const pack=run()
    expect(pack.publishAuthorized).toBe(false)
    expect(pack.nextAgent).toBe("HUMAN_REVIEW")
    expect(pack.warnings).toContain("PUBLISH_APPROVAL_MISSING")
  })

  it("autoriza publish agent apenas com aprovação humana",()=>{
    const pack=run(i=>{i.publishApproval={approvedBy:"editor-chefe",approvedAt:"2026-01-03T00:00:00.000Z",selectedTitleId:"TITLE-1",selectedThumbnailId:"THUMB-A"}})
    expect(pack.publishAuthorized).toBe(true)
    expect(pack.nextAgent).toBe("PUBLISH_AGENT")
    expect(pack.deliveryStatus).toBe("DELIVERY_APPROVED")
    expect(pack.metadata.publishingManifest.status).toBe("READY_FOR_PUBLISH")
  })

  it("bloqueia receipt sem MASTER_APPROVED",()=>{
    const pack=run(i=>{i.masterApprovalReceipt={...i.masterApprovalReceipt,blockers:["OUTPUT_QC_FAILED"]}})
    expect(pack.status).toBe("BLOCKED")
    expect(pack.blockingErrors).toContain("MASTER_NOT_APPROVED")
  })

  it("detecta mutação do AssemblyPack após aprovação",()=>{
    const pack=run(i=>{i.masterApprovalReceipt={...i.masterApprovalReceipt,timelineHash:"sha256:outro"}})
    expect(pack.blockingErrors).toContain("ASSEMBLY_PACK_MUTATED")
  })

  it("detecta divergência do render manifest",()=>{
    const pack=run(i=>{i.masterApprovalReceipt={...i.masterApprovalReceipt,renderManifestHash:"sha256:outro"}})
    expect(pack.blockingErrors).toContain("MASTER_RECEIPT_HASH_MISMATCH")
  })

  it("bloqueia assemblyPackId divergente",()=>{
    const pack=run(i=>{i.masterApprovalReceipt={...i.masterApprovalReceipt,assemblyPackId:"assembly-outro"}})
    expect(pack.blockingErrors).toContain("ASSEMBLY_PACK_VERSION_MISMATCH")
  })

  it("bloqueia título sensacionalista",()=>{
    const pack=run(i=>{i.titleSeeds=[{text:"Você não vai acreditar nessa brecha do sistema",claimIds:["CLM-1"]}]})
    expect(pack.blockingErrors).toContain("TITLE_SENSATIONALIST")
    expect(pack.blockingErrors).toContain("TITLE_CANDIDATE_MISSING")
  })

  it("bloqueia título com número fabricado",()=>{
    const pack=run(i=>{i.titleSeeds=[{text:"A brecha que atingiu 4200 contas bancárias",claimIds:["CLM-1"]}]})
    expect(pack.blockingErrors).toContain("TITLE_CLAIM_UNSUPPORTED")
  })

  it("bloqueia título ligado a claim não suportado",()=>{
    const pack=run(i=>{i.claims=[{claimId:"CLM-1",status:"UNSUPPORTED",conditionalLanguageApproved:false}]})
    expect(pack.blockingErrors).toContain("TITLE_CLAIM_UNSUPPORTED")
  })

  it("bloqueia título fora do intervalo de caracteres",()=>{
    const pack=run(i=>{i.titleSeeds=[{text:"Brecha",claimIds:["CLM-1"]}]})
    expect(pack.blockingErrors).toContain("TITLE_LENGTH_INVALID")
  })

  it("exige linguagem condicional aprovada para claim incerto",()=>{
    const blocked=run(i=>{i.claims=[{claimId:"CLM-1",status:"UNCERTAIN",conditionalLanguageApproved:false}]})
    expect(blocked.blockingErrors).toContain("TITLE_CLAIM_UNSUPPORTED")
    const allowed=run(i=>{i.claims=[{claimId:"CLM-1",status:"UNCERTAIN",conditionalLanguageApproved:true}]})
    expect(allowed.status).toBe("PACKAGING_READY")
  })

  it("bloqueia thumbnail que apresenta evidência não verificada",()=>{
    const pack=run(i=>{
      i.evidenceMatrix=[...i.evidenceMatrix,{evidenceId:"leak",shotId:"SHOT-1",assetHash:"sha256:leak",classification:"REAL_EVIDENCE",verified:false}]
      i.thumbnailEvidenceIds=["leak"]
    })
    expect(pack.blockingErrors).toContain("THUMBNAIL_FABRICATED_EVIDENCE")
  })

  it("bloqueia thumbnail ilegível",()=>{
    const pack=run(()=>{},new MockPackagingAdapter(1.2,false))
    expect(pack.blockingErrors).toContain("THUMBNAIL_TEXT_ILLEGIBLE")
  })

  it("preserva rótulo de reconstrução na thumbnail",()=>{
    const pack=run(i=>{i.thumbnailEvidenceIds=["policy"]})
    expect(pack.metadata.thumbnailBrief.representationLabels).toContain("RECONSTRUCTION")
    expect(pack.metadata.thumbnailBrief.depictsRealEvidence).toBe(false)
  })

  it("bloqueia descrição sem fonte verificada",()=>{
    const pack=run(i=>{i.sources=[{...i.sources[0],verified:false}]})
    expect(pack.blockingErrors).toContain("DESCRIPTION_SOURCE_MISSING")
  })

  it("bloqueia descrição com número fabricado",()=>{
    const pack=run(i=>{i.descriptionSeed="O incidente afetou 9100 usuários."})
    expect(pack.blockingErrors).toContain("DESCRIPTION_CLAIM_UNSUPPORTED")
  })

  it("gera capítulos cobrindo a duração compilada",()=>{
    const pack=run()
    const total=pack.metadata.chapters.reduce((sum,c)=>sum+(c.endSec-c.startSec),0)
    expect(pack.metadata.chapters[0].startSec).toBe(0)
    expect(total).toBeCloseTo(validPackagingInput().assemblyPack.timelineCompilation.durationSeconds,2)
  })

  it("bloqueia capítulo com timestamp inválido",()=>{
    const pack=run(i=>{i.assemblyPack={...i.assemblyPack,timelineCompilation:{...i.assemblyPack.timelineCompilation,blocks:[{...i.assemblyPack.timelineCompilation.blocks[0],startSec:2}]}}})
    expect(pack.blockingErrors).toContain("CHAPTER_TIMESTAMP_INVALID")
  })

  it("bloqueia cobertura de capítulos incompleta",()=>{
    const pack=run(i=>{i.assemblyPack={...i.assemblyPack,timelineCompilation:{...i.assemblyPack.timelineCompilation,blocks:[{...i.assemblyPack.timelineCompilation.blocks[0],endSec:3}]}}})
    expect(pack.blockingErrors).toContain("CHAPTER_COVERAGE_INCOMPLETE")
  })

  it("exige disclosure sintético quando há reconstrução",()=>{
    const pack=run()
    expect(pack.metadata.syntheticDisclosure.required).toBe(true)
    expect(pack.metadata.syntheticDisclosure.present).toBe(true)
    expect(pack.metadata.description.body).toContain("reconstruções")
  })

  it("bloqueia idioma divergente das legendas",()=>{
    const pack=run(i=>{i.language="en-US"})
    expect(pack.blockingErrors).toContain("LOCALIZATION_MISMATCH")
  })

  it("é idempotente e determinístico",()=>{
    const a=run(),b=run()
    expect(a.packagingJobKey).toBe(b.packagingJobKey)
    expect(a.metadata.metadataHash).toBe(b.metadata.metadataHash)
  })

  it("versiona quando o pacote de entrada muda",()=>{
    const a=packagingJobKey(validPackagingInput())
    const changed=validPackagingInput()
    changed.packagingVersion="1.0.1"
    expect(packagingJobKey(changed)).not.toBe(a)
  })

  it("registra checkpoint no estágio da falha",()=>{
    const blocked=run(i=>{i.titleSeeds=[{text:"Brecha",claimIds:["CLM-1"]}]})
    expect(blocked.checkpoint.stage).toBe("THUMBNAIL_GENERATED")
    expect(run().checkpoint.stage).toBe("MANIFEST_BUILT")
  })

  it("gera três conceitos editoriais distintos e legíveis em mobile",()=>{
    const pack=run()
    expect(pack.metadata.thumbnailOptions.map(t=>t.role)).toEqual(["MECHANISM","CONSEQUENCE","FINAL_HANDOFF"])
    expect(pack.metadata.thumbnailOptions.every(t=>t.legibilityScore>=.8&&t.safeAreaValid)).toBe(true)
    expect(pack.metadata.thumbnailOptions.every(t=>t.lineage.baseImageHash&&t.lineage.finalImageHash&&t.lineage.mobilePreviewHash)).toBe(true)
  })

  it("bloqueia conceitos de thumbnail que não são realmente distintos",()=>{
    const pack=run(i=>{i.thumbnailConcepts=i.thumbnailConcepts.map(c=>({...c,concept:"Mesmo conceito"}))})
    expect(pack.blockingErrors).toContain("THUMBNAIL_CONCEPTS_NOT_DISTINCT")
  })

  it("bloqueia CTR estimado abaixo do gate",()=>{
    const pack=run(()=>{},new MockPackagingAdapter(7.2,true,.05))
    expect(pack.blockingErrors).toContain("THUMBNAIL_CTR_BELOW_TARGET")
  })

  it("compila SEO, capítulos, Shorts e políticas por plataforma",()=>{
    const pack=run()
    expect(pack.metadata.tagBundle.status).toBe("APPROVED")
    expect(pack.metadata.tagBundle.primaryTags).toContain("brecha")
    expect(pack.metadata.shortsCuts.cutCount).toBeGreaterThanOrEqual(3)
    expect(pack.metadata.shortsCuts.cuts.every(c=>c.durationSec>=15&&c.durationSec<=60&&c.format==="9:16")).toBe(true)
    expect(pack.metadata.policyValidation.status).toBe("APPROVED")
    expect(pack.metadata.publishingManifest.status).toBe("READY_FOR_REVIEW")
  })

  it("exige seleção humana pareada entre título e thumbnail",()=>{
    const pack=run(i=>{i.publishApproval={approvedBy:"editor",approvedAt:"2026-01-03T00:00:00.000Z",selectedTitleId:"TITLE-1",selectedThumbnailId:"THUMB-B"}})
    expect(pack.blockingErrors).toContain("HUMAN_SELECTION_INVALID")
    expect(pack.publishAuthorized).toBe(false)
  })

  it("nenhum score substitui bloqueio crítico",()=>{
    const pack=run(i=>{i.qcThreshold=0;i.sources=[{...i.sources[0],verified:false}]})
    expect(pack.status).toBe("BLOCKED")
  })
})
