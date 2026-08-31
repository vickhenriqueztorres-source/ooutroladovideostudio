import{describe,expect,it}from"vitest"
import{BrechaStateMachine,CheckpointManager,governance,InMemoryCheckpointStore,InMemoryLogger,PackagingControlPlane,ProjectRegistry}from"../core"
import{MockPackagingAdapter}from"../providers/packaging"
import{validPackagingInput}from"./fixtures/packaging"

function setup(){
  const input=validPackagingInput(),projects=new ProjectRegistry()
  projects.create({id:input.projectId,name:"Packaging",state:"MASTER_APPROVED",metadata:{fixture:true},...governance({projectId:input.projectId,runId:input.runId})})
  const checkpoints=new CheckpointManager(new InMemoryCheckpointStore()),logger=new InMemoryLogger()
  return{input,projects,checkpoints,logger,cp:new PackagingControlPlane(projects,checkpoints,new BrechaStateMachine(),logger,new MockPackagingAdapter())}
}

describe("packaging control plane",()=>{
  it("transiciona para PACKAGING_READY",()=>{
    const s=setup()
    s.cp.execute(s.input)
    expect(s.projects.getById(s.input.projectId).state).toBe("PACKAGING_READY")
  })

  it("não publica automaticamente",()=>{
    const s=setup()
    const pack=s.cp.execute(s.input)
    expect(s.projects.getById(s.input.projectId).state).not.toBe("PUBLISHED")
    expect(pack.publishAuthorized).toBe(false)
  })

  it("é idempotente e retomável",()=>{
    const s=setup()
    const a=s.cp.execute(s.input),b=s.cp.resume(s.input)
    expect(a.packagingPackId).toBe(b.packagingPackId)
    expect(a.metadata.metadataHash).toBe(b.metadata.metadataHash)
  })

  it("salva checkpoint imutável",()=>{
    const s=setup()
    s.cp.execute(s.input)
    expect(s.checkpoints.listByRun(s.input.runId)[0]).toBeDefined()
  })

  it("sanitiza logs",()=>{
    const s=setup()
    s.cp.execute(s.input)
    const logs=JSON.stringify(s.logger.list())
    expect(logs).not.toContain("Como a brecha foi explorada")
    expect(logs).not.toContain("https://example.org/relatorio")
  })

  it("recusa projeto que não está em MASTER_APPROVED",()=>{
    const s=setup()
    s.projects.update(s.input.projectId,{state:"ASSEMBLY_READY"})
    expect(()=>s.cp.execute(s.input)).toThrow("PACKAGING_INVALID_PROJECT_STATE")
  })

  it("não transiciona quando há bloqueio",()=>{
    const s=setup()
    s.input.titleSeeds=[{text:"Brecha",claimIds:["CLM-1"]}]
    s.cp.execute(s.input)
    expect(s.projects.getById(s.input.projectId).state).toBe("MASTER_APPROVED")
  })
})
