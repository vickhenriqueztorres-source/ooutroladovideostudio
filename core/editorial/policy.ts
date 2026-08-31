import type { AssetBudget, ProductionConstraints, ScriptPackage } from "../contracts"
export const DEFAULT_EDITORIAL_POLICY={minimumConfidence:.7,wordsPerMinute:145,runtimeToleranceSeconds:20,pauseMarginRatio:.12} as const
export function countWords(text:string){return text.trim()?text.trim().split(/\s+/u).length:0}
export function estimateNarrationSeconds(wordCount:number,wordsPerMinute:number){return wordCount/wordsPerMinute*60}
export function estimateTotalRuntimeSeconds(wordCount:number,constraints:Pick<ProductionConstraints,"wordsPerMinute"|"pauseMarginRatio">){return estimateNarrationSeconds(wordCount,constraints.wordsPerMinute)*(1+constraints.pauseMarginRatio)}
export function budgetTotal(b:AssetBudget){return Object.values(b).reduce((sum,n)=>sum+n,0)}
export function usedBudget(p:ScriptPackage){return p.beats.flatMap(b=>b.assetRequests).reduce((sum,a)=>sum+a.budgetUnits,0)}
export function isRuntimeWithinTolerance(estimated:number,target:number,tolerance:number){return Math.abs(estimated-target)<=tolerance}
