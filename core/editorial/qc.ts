import type { ProductionConstraints,QCFinding,ScriptPackage,ScriptQC } from "../contracts"
import { countWords,estimateTotalRuntimeSeconds,isRuntimeWithinTolerance,usedBudget } from "./policy"
function blocking(code:string,message:string,refs:string[]=[]):QCFinding{return{code,severity:"BLOCKING",message,refs}}
export function evaluateScript(input:ScriptPackage,constraints:ProductionConstraints):ScriptQC{
 const f:QCFinding[]=[]
 if(!input.storyBible.coreQuestion.trim())f.push(blocking("CORE_QUESTION_MISSING","Pergunta central ausente"))
 const hook=input.beats.find(b=>b.section==="HOOK");if(!hook||(!hook.dramaticFunction&&!hook.informationGoal))f.push(blocking("HOOK_INVALID","Hook sem promessa ou conflito"))
 const claims=new Map(input.evidenceMatrix.claims.map(c=>[c.claimId,c]))
 for(const beat of input.beats){
  if(beat.endSec<=beat.startSec)f.push(blocking("BEAT_DURATION",`Beat ${beat.beatId} sem duração`,[beat.beatId]))
  if(!beat.dramaticFunction)f.push(blocking("DRAMATIC_FUNCTION",`Beat ${beat.beatId} sem função dramática`,[beat.beatId]))
  if(beat.visualJobs.some(v=>v.required)&&!beat.assetRequests.length)f.push(blocking("ASSET_MISSING",`Beat ${beat.beatId} exige asset`,[beat.beatId]))
  for(const id of beat.claimIds){const c=claims.get(id);if(!c)f.push(blocking("CLAIM_UNKNOWN",`Claim ${id} não existe`,[beat.beatId]));else if(c.classification==="UNSUPPORTED")f.push(blocking("UNSUPPORTED_USED",`Claim ${id} unsupported usado`,[id]));else if(!c.sourceRefs.length)f.push(blocking("SOURCE_MISSING",`Claim ${id} sem fonte`,[id]))}
  if(/mecanismo/i.test(beat.dramaticFunction)&&!beat.visualJobs.some(v=>v.job==="EXPLAIN"))f.push(blocking("MECHANISM_NOT_EXPLAINED","Mecanismo sem função EXPLAIN",[beat.beatId]))
 }
 for(const loop of input.openLoops)if(loop.status!=="CLOSED"||!loop.closedAtBeatId||!loop.answerClaimIds.length)f.push(blocking("LOOP_UNPAID",`Loop ${loop.loopId} sem payoff`,[loop.loopId]))
 const usage=usedBudget(input);if(usage>constraints.maxBudgetUnits)f.push(blocking("BUDGET_EXCEEDED",`Uso ${usage} excede budget ${constraints.maxBudgetUnits}`))
 const words=countWords(input.beats.map(b=>b.narration).join(" "));const estimated=estimateTotalRuntimeSeconds(words,constraints)
 if(!isRuntimeWithinTolerance(estimated,input.targetRuntimeSeconds,constraints.runtimeToleranceSeconds))f.push(blocking("RUNTIME_MISMATCH",`Runtime estimado ${estimated.toFixed(1)}s incompatível com alvo`))
 const reasons=f.filter(x=>x.severity==="BLOCKING").map(x=>x.message)
 if(reasons.length)return{decision:f.some(x=>x.code.includes("SOURCE")||x.code.includes("UNSUPPORTED"))?"NEEDS_RESEARCH":"NEEDS_SCRIPT_REVISION",findings:f,estimatedRuntimeSeconds:estimated,blockingReasons:reasons}
 return{decision:"SCRIPT_APPROVED",findings:f,estimatedRuntimeSeconds:estimated}
}
