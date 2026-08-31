import{createHash}from"node:crypto"
import type{AdherenceScore,ImageGenerationJob}from"../../core/contracts"
import type{ImageProviderAdapter}from"../../core/image-generation"

// Deterministic, offline simulation. NEVER produces real image bytes or contacts a provider.
// The sha256 is derived from the job's idempotency key so the same job always yields the same descriptor.
const hash=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex")

// Drift is signaled through control tokens embedded in a job's strictLocks (used by fixtures/tests).
// Real adapters would derive these from actual comparison; here they are explicit and auditable.
const DRIFT_TOKENS:Record<string,string>={"drift:identity":"IMAGE_IDENTITY_DRIFT","drift:wardrobe":"IMAGE_WARDROBE_CONFLICT","drift:location":"IMAGE_LOCATION_DRIFT","drift:geometry":"IMAGE_OBJECT_GEOMETRY_CHANGED","drift:period":"IMAGE_WRONG_PERIOD","drift:palette":"IMAGE_PALETTE_CONFLICT","drift:anatomy":"IMAGE_ANATOMICAL_DEFORMATION","drift:evidence":"IMAGE_EVIDENCE_ALTERED"}

function deriveScore(seed:string):AdherenceScore{
  const n=(i:number)=>Number((0.8+((parseInt(seed.slice(i,i+2),16)%20)/100)).toFixed(4))// 0.80..0.99
  return{identity:n(0),environment:n(2),objectGeometry:n(4),palette:n(6),lighting:n(8),composition:n(10),period:n(12),narrativeFunction:n(14),representation:n(16),technicalQuality:n(18),overall:0}
}

export class MockImageProviderAdapter implements ImageProviderAdapter{
  constructor(readonly id="mock-image-provider",readonly runtime="mock-runtime",readonly adapterVersion="1.0.0"){}
  simulate(job:ImageGenerationJob){
    const seed=hash(job.idempotencyKey)
    const hardFails:string[]=[]
    for(const lock of job.strictLocks){const code=DRIFT_TOKENS[lock];if(code)hardFails.push(code)}
    if(job.strictLocks.includes("drift:narrative"))hardFails.push("IMAGE_NARRATIVE_FUNCTION_MISSING")
    return{assetPath:`outputs/mock/${job.imageJobId}.png`,sha256:seed,adherence:deriveScore(seed),hardFails}
  }
}

export function mockCalibrationApproved(providerId="mock-image-provider",runtime="mock-runtime",adapterVersion="1.0.0",allowed:string[]=["REFERENCE","START_FRAME","INSERT","ATMOSPHERE"],blocked:string[]=[]){
  return{calibrationId:`cal-${providerId}-${adapterVersion}`,providerId,runtime,adapterVersion,testCases:[{caseId:"cc-1",assetClass:"CHARACTER_CLOSEUP",description:"character close-up",requiredScore:0.8}],requiredDimensions:["identity","composition","palette"],scores:{identity:0.9,environment:0.88,objectGeometry:0.87,palette:0.9,lighting:0.89,composition:0.9,representation:0.9},allowedAssetTypes:allowed,blockedAssetTypes:blocked,status:"APPROVED"as const,evidenceRefs:["cal-evidence-1"]}
}
