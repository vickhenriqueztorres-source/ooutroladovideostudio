import {describe,expect,it} from "vitest"
import {EvidenceClaimSchema,EvidenceMatrixSchema,OpenLoopSchema,ScriptBeatSchema,ScriptPackageSchema,TopicBriefSchema,TopicCandidateSchema} from "../core/schemas/editorial"
import {countWords,estimateNarrationSeconds,evaluateScript,usedBudget} from "../core/editorial"
import {evidenceMatrix,productionConstraints,scriptPackage,topicBrief,topicCandidate} from "./fixtures/editorial-positive"
describe("contratos editoriais",()=>{
 it("valida TopicBrief e rejeita inválido",()=>{expect(TopicBriefSchema.safeParse(topicBrief).success).toBe(true);expect(TopicBriefSchema.safeParse({...topicBrief,targetRuntimeSeconds:0}).success).toBe(false)})
 it("valida score/confidence e bloqueia greenlight abaixo de 0.70",()=>{expect(TopicCandidateSchema.safeParse(topicCandidate).success).toBe(true);expect(TopicCandidateSchema.safeParse({...topicCandidate,confidence:.69}).success).toBe(false)})
 it("aceita UNSUPPORTED somente removido e bloqueia matrix verified",()=>{const unsupported={...evidenceMatrix.claims[1],classification:"UNSUPPORTED",sourceRefs:[],status:"REMOVE"} as const;expect(EvidenceClaimSchema.safeParse(unsupported).success).toBe(true);expect(EvidenceMatrixSchema.safeParse({...evidenceMatrix,claims:[unsupported]}).success).toBe(false)})
 it("bloqueia claim verified sem fonte",()=>{const claim={...evidenceMatrix.claims[0],sourceRefs:[]};expect(EvidenceClaimSchema.safeParse(claim).success).toBe(false)})
 it("valida beat e exige asset para visual obrigatório",()=>{const beat=scriptPackage().beats[0];expect(ScriptBeatSchema.safeParse(beat).success).toBe(true);expect(ScriptBeatSchema.safeParse({...beat,assetRequests:[]}).success).toBe(false)})
 it("valida loop fechado e detecta loop sem payoff",()=>{const loop=scriptPackage().openLoops[0];expect(OpenLoopSchema.safeParse(loop).success).toBe(true);expect(OpenLoopSchema.safeParse({...loop,closedAtBeatId:undefined}).success).toBe(false)})
 it("calcula palavras, runtime e budget",()=>{expect(countWords("um dois três")).toBe(3);expect(estimateNarrationSeconds(120,120)).toBe(60);expect(usedBudget(scriptPackage())).toBe(4)})
 it("aprova pacote válido",()=>{const p=scriptPackage();const qc=evaluateScript(p,productionConstraints);const approved={...p,status:"SCRIPT_APPROVED",qc};expect(qc.decision).toBe("SCRIPT_APPROVED");expect(ScriptPackageSchema.safeParse(approved).success).toBe(true)})
 it("detecta runtime, budget e loop inválidos",()=>{const p=scriptPackage();p.targetRuntimeSeconds=200;p.openLoops[0]={...p.openLoops[0],status:"OPEN",closedAtBeatId:undefined};p.beats[0].assetRequests[0].budgetUnits=20;const qc=evaluateScript(p,productionConstraints);expect(qc.decision).toBe("NEEDS_SCRIPT_REVISION");expect(qc.findings.map(x=>x.code)).toEqual(expect.arrayContaining(["RUNTIME_MISMATCH","BUDGET_EXCEEDED","LOOP_UNPAID"]))})
})
