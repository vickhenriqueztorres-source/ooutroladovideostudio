import{describe,expect,it}from"vitest"
import{ImagePackSchema}from"../core/schemas/image-generation"
import{runImageAgent,imageJobKey,imageHash,resolveReferences,isCalibratedFor,weightedOverall,HARD_FAIL_CODES}from"../core/image-generation"
import{MockImageProviderAdapter,mockCalibrationApproved}from"../providers/image"
import{positiveImageInput,driftImageInput,uncalibratedImageInput,partialCalibrationInput,missingReferenceInput,rejectedReferenceInput,noMotionSpaceInput,evidenceSupportInput}from"./fixtures/image-generation"

const adapter=new MockImageProviderAdapter()
const run=(i:ReturnType<typeof positiveImageInput>)=>runImageAgent(i,adapter)

describe("Image Generation & Visual QC Agent",()=>{
  it("input sem Prompt Pack aprovado bloqueia (schema)",()=>{const i=positiveImageInput() as any;i.status="DRAFT";expect(()=>run(i)).toThrow()})

  it("fixture positiva chega a APPROVED_FOR_VIDEO e valida schema",()=>{const{pack}=run(positiveImageInput());expect(pack.status).toBe("APPROVED_FOR_VIDEO");expect(pack.nextAgent).toBe("VIDEO_GENERATION_AGENT");ImagePackSchema.parse(pack)})

  it("não muta specs de entrada",()=>{const i=positiveImageInput(),before=JSON.stringify(i);run(i);expect(JSON.stringify(i)).toBe(before)})

  it("provider não calibrado bloqueia produção",()=>{const{pack}=run(uncalibratedImageInput());expect(pack.status).toBe("BLOCKED");expect(pack.generatedAssets.every(a=>a.hardFails.includes("IMAGE_PROVIDER_NOT_CALIBRATED"))).toBe(true)})

  it("calibração positiva aprova classe de asset",()=>{expect(isCalibratedFor([mockCalibrationApproved()],{providerId:"mock-image-provider",runtime:"mock-runtime",adapterVersion:"1.0.0"},"START_FRAME")).toBe(true)})

  it("calibração parcial bloqueia somente classes incompatíveis",()=>{const{pack}=run(partialCalibrationInput());const sf=pack.generatedAssets.find(a=>a.assetType==="START_FRAME")!;const atm=pack.generatedAssets.find(a=>a.assetType==="ATMOSPHERE")!;expect(sf.hardFails).toContain("IMAGE_PROVIDER_NOT_CALIBRATED");expect(atm.hardFails).not.toContain("IMAGE_PROVIDER_NOT_CALIBRATED")})

  it("referência aprovada é resolvida",()=>{const r=resolveReferences(positiveImageInput().references);expect(r.approved.length).toBe(3);expect(r.missing.length).toBe(0)})

  it("referência ausente bloqueia",()=>{const{pack}=run(missingReferenceInput());expect(pack.status).toBe("BLOCKED");expect(pack.blockingErrors.some(e=>e.startsWith("IMAGE_REFERENCE_MISSING"))).toBe(true)})

  it("asset rejeitado não é usado como referência",()=>{const{pack}=run(rejectedReferenceInput());const ins=pack.generatedAssets.find(a=>a.assetType==="INSERT")!;expect(ins.hardFails).toContain("IMAGE_UNAPPROVED_REFERENCE_USED");expect(ins.status).not.toBe("APPROVED")})

  it("generation job possui hash e idempotencyKey",()=>{const{jobs}=run(positiveImageInput());expect(jobs.every(j=>j.promptHash.length===64&&j.idempotencyKey.length===64)).toBe(true)})

  it("drift facial bloqueia (hard fail)",()=>{const{pack}=run(driftImageInput());const sf=pack.generatedAssets.find(a=>a.assetType==="START_FRAME")!;expect(sf.hardFails).toContain("IMAGE_IDENTITY_DRIFT");expect(sf.status).toBe("REJECTED");expect(pack.status).not.toBe("APPROVED_FOR_VIDEO")})

  it("hard fail nunca é aprovado mesmo com score alto",()=>{const i=positiveImageInput();i.imageSpecs[0].identityLocks=["drift:identity"];const{pack}=run(i);const sf=pack.generatedAssets.find(a=>a.assetType==="START_FRAME")!;expect(sf.adherence.overall).toBe(0);expect(sf.status).toBe("REJECTED")})

  it("start frame com motion safe area passa",()=>{const{pack}=run(positiveImageInput());expect(pack.approvedStartFrames.length).toBe(1);expect(pack.approvedStartFrames[0].allowedMotion.length).toBeGreaterThan(0)})

  it("start frame sem motion space bloqueia",()=>{const{pack}=run(noMotionSpaceInput());const sf=pack.generatedAssets.find(a=>a.assetType==="START_FRAME")!;expect(sf.hardFails).toContain("IMAGE_MOTION_SPACE_MISSING")})

  it("start frame registry registra hash",()=>{const{pack}=run(positiveImageInput());expect(pack.approvedStartFrames[0].sha256.length).toBe(64)})

  it("somente start frames aprovados são propagados",()=>{const{pack}=run(driftImageInput());expect(pack.approvedStartFrames.length).toBe(0)})

  it("evidence asset nunca é gerado",()=>{const{pack,jobs}=run(evidenceSupportInput());expect(jobs.some(j=>j.promptId==="ev-1")).toBe(false);expect(pack.generatedAssets.some(a=>a.representationType==="REAL_EVIDENCE")).toBe(false);expect(pack.visualQC.evidenceNeverGenerated).toBe(true)})

  it("texto crítico vai para pós-produção",()=>{const{jobs}=run(positiveImageInput());const sf=jobs.find(j=>j.assetType==="START_FRAME")!;expect(sf.postProductionRequirements).toContain("render-critical-text-in-post")})

  it("provider adherence é calculado",()=>{const{pack}=run(positiveImageInput());expect(pack.providerAdherence.length).toBe(1);expect(pack.providerAdherence[0].identity).toBeGreaterThan(0)})

  it("providers diferentes sem calibração são detectados (sem mistura silenciosa)",()=>{const{pack}=run(positiveImageInput());expect(pack.visualQC.noSilentProviderMix).toBe(true)})

  it("budget é respeitado",()=>{const i=positiveImageInput();i.productionConstraints.maxJobs=1;const{pack}=run(i);expect(pack.blockingErrors).toContain("IMAGE_BUDGET_EXCEEDED")})

  it("idempotência: mesma entrada retorna o mesmo pack (hash)",()=>{const i=positiveImageInput();const a=run(i).pack,b=run(i).pack;expect(imageHash(a)).toBe(imageHash(b));expect(a.imagePackId).toBe(b.imagePackId)})

  it("imageJobKey é estável e determinístico",()=>{const args={projectId:"p",promptId:"x",promptVersion:"v",promptHash:"h",providerId:"pr",runtime:"rt",adapterVersion:"1.0.0",referenceManifestId:"m",referenceAssetHashes:["a"],parameters:{aspectRatio:"16:9"}};expect(imageJobKey(args)).toBe(imageJobKey({...args}))})

  it("weightedOverall respeita pesos por tipo de asset",()=>{const perfect={identity:1,environment:1,objectGeometry:1,palette:1,lighting:1,composition:1,period:1,narrativeFunction:1,representation:1,technicalQuality:1,overall:0};expect(weightedOverall("START_FRAME",perfect)).toBeCloseTo(1,3)})

  it("HARD_FAIL_CODES cobre os códigos obrigatórios",()=>{expect(HARD_FAIL_CODES).toContain("IMAGE_EVIDENCE_ALTERED");expect(HARD_FAIL_CODES).toContain("IMAGE_START_FRAME_UNFIT")})

  it("fixture negativa nunca é aprovada",()=>{for(const f of[driftImageInput,uncalibratedImageInput,missingReferenceInput,rejectedReferenceInput,noMotionSpaceInput]){const{pack}=run(f());expect(pack.status).not.toBe("APPROVED_FOR_VIDEO")}})

  it("nenhum asset real é gerado (simulated=true)",()=>{const{pack}=run(positiveImageInput());expect(pack.generatedAssets.every(a=>a.simulated===true&&a.assetPath.startsWith("outputs/mock"))).toBe(true)})
})
