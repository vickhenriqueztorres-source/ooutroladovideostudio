import{createHash}from"node:crypto";import type{FinalAssemblyAdapter,RenderArtifact}from"../../core/contracts/final-assembly"
const h=(s:string)=>`sha256:${createHash("sha256").update(s).digest("hex")}`
export class MockFinalAssemblyAdapter implements FinalAssemblyAdapter{render(kind:"PREVIEW"|"FINAL",m:{renderId:string;outputPath:string;parametersHash:string}):RenderArtifact{return{renderId:m.renderId,kind,outputPath:m.outputPath,outputHash:h(`${kind}:${m.parametersHash}`),encoded:true,outputExists:true,parametersHash:m.parametersHash,createdAt:new Date(0).toISOString()}}}
