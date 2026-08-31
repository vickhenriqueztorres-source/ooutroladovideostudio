import{createHash}from"node:crypto"
import type{AudioGenerationInput,CompiledNarrationSegment}from"../contracts/audio-generation"
export const audioHash=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex")
export function narrationJobKey(input:AudioGenerationInput){return audioHash([input.projectId,input.scriptVersion,input.timelineVersion,input.productionConstraints.audioProvider,input.soundBible.version].join("|"))}
export function compileNarration(input:AudioGenerationInput):CompiledNarrationSegment[]{const key=narrationJobKey(input);return input.narrationScript.map(s=>({...s,text:s.text,renderStatus:"pending",narrationJobKey:key}))}
