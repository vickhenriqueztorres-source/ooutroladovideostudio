import {describe,expect,it} from "vitest"
import {AgentRegistry} from "../agents/registry"
import {TopicGreenlightAgent,TopicScoutAgent} from "../agents/strategy/editorial-agents"
import {ResearchIntegrityAgent} from "../agents/editorial/research-agent"
import {DocumentaryScriptCompilerAgent} from "../agents/editorial/script-compiler-agent"
import {ScriptQCAgent} from "../agents/editorial/script-qc-agent"
import {CheckpointManager,InMemoryCheckpointStore} from "../core/checkpoints"
import {EditorialControlPlane} from "../core/control-plane/editorial"
import {InMemoryLogger} from "../core/logging"
import {ArtifactRegistry,ProjectRegistry,RunRegistry} from "../core/registry"
import {DirectRuntimeAdapter} from "../runtimes/shared"
import {MockResearchProvider,MockScriptModel,MockTopicProvider} from "../providers/editorial"
import {topicBrief} from "./fixtures/editorial-positive"
function setup(topicProvider=new MockTopicProvider()){const projects=new ProjectRegistry(),runs=new RunRegistry(),artifacts=new ArtifactRegistry(),checkpoints=new CheckpointManager(new InMemoryCheckpointStore()),logger=new InMemoryLogger(),agents=new AgentRegistry();agents.register(new TopicScoutAgent(topicProvider));agents.register(new TopicGreenlightAgent());agents.register(new ResearchIntegrityAgent(new MockResearchProvider()));agents.register(new DocumentaryScriptCompilerAgent(new MockScriptModel()));agents.register(new ScriptQCAgent());return{plane:new EditorialControlPlane(projects,runs,artifacts,checkpoints,logger,new DirectRuntimeAdapter(),agents),projects,runs,artifacts,checkpoints,logger}}
describe("pipeline editorial",()=>{
 it("executa tema mock até SCRIPT_APPROVED com artefatos e checkpoints",async()=>{const x=setup();const out=await x.plane.execute(topicBrief);expect(out.status).toBe("SCRIPT_APPROVED");expect(out.project.state).toBe("SCRIPT_APPROVED");expect(out.artifacts).toHaveLength(5);expect(x.checkpoints.listByRun(out.runId)).toHaveLength(10);expect(out.script?.beats).toHaveLength(3);expect(x.logger.list({runId:out.runId}).map(e=>e.event)).toEqual(expect.arrayContaining(["agent.started","agent.input.validated","agent.output.validated","agent.qc.passed","checkpoint.created","state.transitioned","run.completed"]))})
 it("é idempotente para a mesma task",async()=>{const x=setup();const first=await x.plane.execute(topicBrief);const before=x.artifacts.listByProject(topicBrief.projectId).length;const resumed=await x.plane.resume(first.lastCheckpointId,topicBrief);expect(resumed.runId).toBe(first.runId);expect(x.artifacts.listByProject(topicBrief.projectId).length).toBe(before)})
 it("retoma após falha simulada",async()=>{const x=setup();let runId="";try{await x.plane.execute(topicBrief,{failAfterStage:"research-integrity"})}catch{runId=x.runs.listByProject(topicBrief.projectId)[0].id}const cp=x.checkpoints.listByRun(runId).at(-1)!;const out=await x.plane.resume(cp.id,topicBrief);expect(out.status).toBe("SCRIPT_APPROVED");expect(out.runId).toBe(runId)})
 it("termina HUMAN_REQUIRED quando confiança é baixa",async()=>{class Low extends MockTopicProvider{override async propose(b:typeof topicBrief){return (await super.propose(b)).map(c=>({...c,status:"HUMAN_REQUIRED" as const,confidence:.69}))}}const x=setup(new Low());const out=await x.plane.execute({...topicBrief,projectId:"fixture-low"});expect(out.status).toBe("HUMAN_REQUIRED");expect(out.project.state).toBe("HUMAN_REQUIRED");expect(x.logger.list({runId:out.runId}).some(e=>e.event==="run.blocked")).toBe(true)})
})
