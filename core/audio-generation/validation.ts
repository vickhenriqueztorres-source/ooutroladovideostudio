import type { AudioBlockingError, AudioGenerationInput } from "../contracts/audio-generation"

export function validateAudioInput(input:AudioGenerationInput):AudioBlockingError[]{
  const errors=new Set<AudioBlockingError>()
  if(!input.scriptApproved||!input.narrationScript.length)errors.add("NARRATION_FILE_MISSING")
  if(!input.soundBible?.version)errors.add("SOUND_BIBLE_MISSING")
  const blocks=new Map(input.timelineBlocks.map(b=>[b.blockId,b]))
  const shots=new Map(input.timelineBlocks.map(b=>[b.shotId,b]))
  for(const clip of input.approvedVideoClips){
    const block=shots.get(clip.shotId)
    if(clip.status!=="APPROVED"||!clip.videoJobKey||!clip.assetHash||clip.motionVetos.length||!block||clip.durationSeconds>block.endSec-block.startSec+.001)errors.add("VIDEO_INPUT_NOT_APPROVED")
  }
  if(!input.approvedVideoClips.length)errors.add("VIDEO_INPUT_NOT_APPROVED")
  for(const segment of input.narrationScript){
    const block=blocks.get(segment.blockId)
    if(segment.sourceStatus==="UNSUPPORTED")errors.add("NARRATION_CLAIM_UNSUPPORTED")
    if(segment.sourceStatus==="UNCERTAIN"&&!segment.conditionalLanguageApproved)errors.add("NARRATION_CLAIM_UNSUPPORTED")
    if(!block||segment.startSec<block.startSec||segment.endSec>block.endSec||segment.endSec<=segment.startSec)errors.add("SFX_INVALID_TIMESTAMP")
  }
  const provider=input.audioProviderRegistry.find(p=>p.provider===input.productionConstraints.audioProvider&&p.runtime===input.productionConstraints.runtime&&p.adapterVersion===input.productionConstraints.adapterVersion)
  if(!provider?.approved)errors.add("AUDIO_QC_FAILED")
  return[...errors]
}
