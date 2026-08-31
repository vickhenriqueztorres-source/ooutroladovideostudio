import{describe,expect,it}from"vitest"
import{ImageGenerationControlPlane}from"../core/control-plane/image-generation"
import{CheckpointManager,InMemoryCheckpointStore}from"../core/checkpoints"
import{ArtifactRegistry,ProjectRegistry,RunRegistry}from"../core/registry"
import{InMemoryLogger}from"../core/logging"
import{BrechaStateMachine}from"../core/state-machine"
import{governance}from"../core/contracts"
import{ImageGenerationAgent}from"../agents/image/image-generation-agent"
import{positiveImageInput,driftImageInput}from"./fixtures/image-generation"

function setup(state:"REFERENCES_APPROVED"|"PROMPT_PACK_APPROVED"="REFERENCES_APPROVED"){
  const input=positiveImageInput()
  const projects=new ProjectRegistry()
  const logger=new InMemoryLogger()
  projects.create({id:input.projectId,...governance({projectId:input.projectId,status:"running"}),name:"Image test",state,metadata:{fixture:true}})
  const cp=new ImageGenerationControlPlane({projects,runs:new RunRegistry(),artifacts:new ArtifactRegistry(),checkpoints:new CheckpointManager(new InMemoryCheckpointStore()),logger,stateMachine:new BrechaStateMachine()})
  return{input,projects,logger,cp}
}

describe("Image generation integration",()=>{
  it("executa ponta a ponta, cria checkpoint e transiciona state machine",()=>{
    const s=setup()
    const pack=s.cp.execute(s.input)
    expect(pack.status).toBe("APPROVED_FOR_VIDEO")
    expect(s.projects.getById(s.input.projectId).state).toBe("START_FRAMES_APPROVED")
    expect(s.logger.list().some(e=>e.event==="image.visual.qc.completed")).toBe(true)
    expect(s.logger.list().some(e=>e.event==="image.pack.approved")).toBe(true)
  })

  it("bloqueia transição a partir de estado inválido",()=>{
    const s=setup("PROMPT_PACK_APPROVED")
    expect(()=>s.cp.execute(s.input)).toThrow("IMAGE_STATE_TRANSITION_INVALID")
  })

  it("idempotência: mesma entrada retorna o mesmo pack em cache",()=>{
    const s=setup()
    const a=s.cp.execute(s.input)
    const b=s.cp.execute(s.input)
    expect(b).toBe(a)
  })

  it("fixture negativa não transiciona o projeto",()=>{
    const input=driftImageInput()
    const projects=new ProjectRegistry()
    projects.create({id:input.projectId,...governance({projectId:input.projectId,status:"running"}),name:"Image drift",state:"REFERENCES_APPROVED",metadata:{}})
    const cp=new ImageGenerationControlPlane({projects,runs:new RunRegistry(),artifacts:new ArtifactRegistry(),checkpoints:new CheckpointManager(new InMemoryCheckpointStore()),logger:new InMemoryLogger()})
    const pack=cp.execute(input)
    expect(pack.status).not.toBe("APPROVED_FOR_VIDEO")
    expect(projects.getById(input.projectId).state).toBe("REFERENCES_APPROVED")
  })

  it("logs não contêm segredos",()=>{
    const s=setup()
    s.cp.execute(s.input)
    const logs=JSON.stringify(s.logger.list()).toLowerCase()
    expect(logs).not.toContain("token")
    expect(logs).not.toContain("cookie")
    expect(logs).not.toContain("credential")
    expect(logs).not.toContain("api_key")
  })

  it("agente wrapper aprova e pede transição START_FRAMES_APPROVED",async()=>{
    const agent=new ImageGenerationAgent()
    const now=new Date().toISOString()
    const result=await agent.execute({id:"task-1",schemaVersion:"1.0.0",projectId:"proj-img",runId:"run-img",status:"running",warnings:[],blockingErrors:[],createdAt:now,updatedAt:now,sourceVersions:[],artifactIds:[],checkpointRef:null,nextAgent:null,agentId:"image-generation",input:positiveImageInput(),requestedTransition:null})
    expect(result.status).toBe("completed")
    expect(result.requestedTransition).toBe("START_FRAMES_APPROVED")
    expect(result.nextAgent).toBe("video-generation-agent")
  })
})
