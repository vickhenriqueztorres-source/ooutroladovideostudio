import type{AudioProviderProfile,AudioRenderAdapter,CompiledNarrationSegment}from"../../core/contracts/audio-generation"
import{audioHash}from"../../core/audio-generation/narration"
export class MockAudioRenderAdapter implements AudioRenderAdapter{renderNarration(segment:CompiledNarrationSegment,provider:AudioProviderProfile){const hash=audioHash([segment.narrationJobKey,segment.segmentId,segment.text,provider]);return{assetId:`mock-narration-${hash.slice(0,12)}`,assetHash:`sha256:${hash}`,decodable:!segment.text.includes("[DECODE_FAIL]")}}}
