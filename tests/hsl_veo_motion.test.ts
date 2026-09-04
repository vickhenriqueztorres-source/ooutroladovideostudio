import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, {after} from 'node:test';
import {spawnSync} from 'node:child_process';
import {MotionRouteDirectorAgent, VeoMotionDirectorAgent} from '../hsl/motion/generatedMotion';
import {PremiumMotionStartFrameAgent} from '../hsl/startframe/premiumMotionStartFrame';
import {StartFrameQaAgent} from '../hsl/startframe/startFrameRuntime';
import {buildMotionDesign} from '../hsl/motion/motionDesign';
import {HslExecutableVisualShot} from '../hsl/execution/types/execution';
import {NativeGeneratedAudioAgent} from '../hsl/postproduction/nativeGeneratedAudioRuntime';
import {HslGeneratedAssetIntakeItem} from '../production-bridge/fireflyToIntake';
import {assertOfficialHslNarrationConfig, HSL_OFFICIAL_PRODUCTION_RULES} from '../config/hslProductionRules';

const roots: string[] = [];
after(() => roots.forEach((root) => fs.rmSync(root, {recursive: true, force: true})));

test('motion router selects Firefly Video while preserving Veo hybrid for exact explanatory flow', () => {
  const router = new MotionRouteDirectorAgent();
  const physical = router.run({
    visualMode: 'generated_ai', visualFunction: 'scale', narrativeFunction: 'establish_facility',
    visualSubject: 'wide airport refinery at dawn', variant: 'ESTABLISH'
  });
  assert.equal(physical.generation_strategy, 'FIREFLY_CINEMATIC');
  const explanatory = router.run({
    visualMode: 'generated_ai', visualFunction: 'invisible_process', narrativeFunction: 'trace_route',
    visualSubject: 'map showing refinery terminal airport flow', variant: 'PROCESS'
  });
  assert.equal(explanatory.generation_strategy, 'VEO_REMOTION_HYBRID');
  assert.equal(explanatory.motion_family, 'FLOW_JOURNEY');
  assert.equal(explanatory.audio_strategy, 'HYBRID');
});

test('motion router promotes an explicitly approved Remotion shot to Veo hybrid', () => {
  const route = new MotionRouteDirectorAgent().run({
    visualMode: 'remotion', visualFunction: null, narrativeFunction: 'explain_flow',
    visualSubject: 'storage buffer releases a steady outbound flow', variant: 'PROCESS',
    promoteRemotion: true
  });
  assert.equal(route.generation_strategy, 'VEO_REMOTION_HYBRID');
  assert.equal(route.audio_strategy, 'HYBRID');
  assert.equal(route.requires_exact_overlay, true);
});

test('motion router promotes physical editorial beats to Firefly without text overlays', () => {
  const route = new MotionRouteDirectorAgent().run({
    visualMode: 'remotion', visualFunction: null, narrativeFunction: 'show_consequence',
    visualSubject: 'baggage carts crossing a wet airport apron at night', variant: 'CONSEQUENCE',
    promoteRemotion: true, promotionTarget: 'KLING', promoteWithExactOverlay: false
  });
  assert.equal(route.generation_strategy, 'FIREFLY_CINEMATIC');
  assert.equal(route.requires_exact_overlay, false);
});

test('motion router redirects an old Kling request to Firefly Video', () => {
  const route = new MotionRouteDirectorAgent().run({
    visualMode: 'generated_ai', visualFunction: 'invisible_process', narrativeFunction: 'trace_route',
    visualSubject: 'airport fuel route map', variant: 'PROCESS', forceKling: true
  });
  assert.equal(route.generation_strategy, 'FIREFLY_CINEMATIC');
  assert.equal(route.audio_strategy, 'KENNEY_DESIGNED');
});

test('Veo director creates a bounded first-frame and native-audio contract', () => {
  const contract = new VeoMotionDirectorAgent().run({
    family: 'SYSTEM_ANATOMY', subject: 'industrial tank cutaway', durationSeconds: 7.4,
    audioStrategy: 'VEO_NATIVE'
  });
  assert.equal(contract.model, 'Veo 3.1 Fast');
  assert.equal(contract.duration_seconds, 8);
  assert.equal(contract.generate_audio, true);
  assert.equal(contract.beats.length, 4);
  assert.match(contract.provider_prompt, /exact first frame/i);
  assert.match(contract.provider_prompt, /real photographed environment/i);
  assert.match(contract.provider_prompt, /not a flat diagram/i);
  assert.match(contract.provider_prompt, /No dialogue/i);
});

test('start-frame QA rejects flat diagram templates and accepts premium photographic references', () => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hsl-start-frame-qa-'));
  roots.push(outputRoot);
  const flatTemplatePath = path.join(outputRoot, 'flat-template.png');
  const flat = spawnSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'color=c=0x05080c:s=1280x720:d=1',
    '-vf',
    "drawbox=x=0:y=0:w=1280:h=720:color=0x101722:t=fill," +
      "drawbox=x=100:y=170:w=900:h=6:color=0xffe500:t=fill," +
      "drawbox=x=100:y=260:w=900:h=4:color=0x0038ff:t=fill," +
      "drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='PRESSURE HELD':x=85:y=390:fontsize=96:fontcolor=white",
    '-frames:v', '1', flatTemplatePath
  ], {encoding: 'utf8'});
  assert.equal(flat.status, 0, flat.stderr);
  const qa = new StartFrameQaAgent();
  assert.throws(() => qa.validate(flatTemplatePath), /START_FRAME_VISUAL_STYLE_TOO_FLAT/);

  const reference = qa.validate(path.resolve('assets/hsl/motion-reference-set-v1/last-meters.png'));
  assert.equal(reference.visual_analysis.status, 'START_FRAME_VISUAL_ANALYSIS_PASS');
  assert.ok(reference.visual_analysis.texture_bucket_ratio >= .022);
});

test('official HSL production rules lock narration to ElevenLabs Chris', () => {
  assert.equal(HSL_OFFICIAL_PRODUCTION_RULES.narrationProvider, 'elevenlabs');
  assert.equal(HSL_OFFICIAL_PRODUCTION_RULES.officialVoiceName, 'Chris');
  assert.equal(HSL_OFFICIAL_PRODUCTION_RULES.elevenLabsVoiceId, 'iP95p4xoKVk53GoZ742B');
  assert.equal(HSL_OFFICIAL_PRODUCTION_RULES.elevenLabsModelId, 'eleven_multilingual_v2');
  assert.equal(HSL_OFFICIAL_PRODUCTION_RULES.voiceboxPresetVoiceId, 'am_echo');
  assert.doesNotThrow(() => assertOfficialHslNarrationConfig({
    HSL_NARRATION_PROVIDER: 'elevenlabs',
    ELEVENLABS_VOICE_NAME: 'Chris',
    ELEVENLABS_VOICE_ID: 'iP95p4xoKVk53GoZ742B',
    ELEVENLABS_MODEL_ID: 'eleven_multilingual_v2'
  } as NodeJS.ProcessEnv));
  assert.throws(() => assertOfficialHslNarrationConfig({
    HSL_NARRATION_PROVIDER: 'voicebox',
    ELEVENLABS_VOICE_NAME: 'Chris',
    ELEVENLABS_VOICE_ID: 'iP95p4xoKVk53GoZ742B',
    ELEVENLABS_MODEL_ID: 'eleven_multilingual_v2'
  } as NodeJS.ProcessEnv), /HSL_OFFICIAL_ELEVENLABS_REQUIRED/);
});

test('premium start-frame agent writes the complete approved package', () => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hsl-premium-frame-'));
  roots.push(outputRoot);
  const source = path.resolve('assets/hsl/motion-reference-set-v1/buffer-and-flow.png');
  const route = new MotionRouteDirectorAgent().run({
    visualMode: 'generated_ai', visualFunction: 'invisible_process', narrativeFunction: 'explain_buffer',
    visualSubject: 'tank buffer and underground pipeline flow', variant: 'PROCESS'
  });
  const veo = new VeoMotionDirectorAgent().run({
    family: route.motion_family!, subject: 'tank buffer and underground pipeline flow',
    durationSeconds: 8, audioStrategy: route.audio_strategy
  });
  const shot: HslExecutableVisualShot = {
    schema: 'hsl.execution.visual-shot.v1', schema_version: '1.0.0', episode_id: 'HSL-TEST',
    parent_scene_id: 'HSL_001', shot_id: 'HSL_001_V02', shot_index: 2, variant: 'PROCESS',
    visual_mode: 'generated_ai', visual_subject: 'tank buffer and underground pipeline flow',
    planned_duration_seconds: 8, evidence_status: 'illustrative', ai_disclosure_required: true,
    visual_function: 'invisible_process', start_frame_prompt: 'approved premium frame',
    motion: {start_state: 'stable', motion_change: 'flow', end_state: 'delivered', camera_motion: 'locked', motion_prompt: veo.provider_prompt},
    generation_strategy: route.generation_strategy, audio_strategy: route.audio_strategy,
    motion_family: route.motion_family, motion_route: route, veo_motion: veo,
    motion_design: buildMotionDesign({narrativeFunction: 'explain_buffer', visualSubject: 'tank buffer and underground pipeline flow', variant: 'PROCESS'})
  };
  const result = new PremiumMotionStartFrameAgent().package({
    shot, approvedFramePath: source, approvedFrameSha256: 'sha256_source', reviewer: 'TEST',
    reviewedAt: '2026-08-20T00:00:00.000Z', outputDirectory: outputRoot
  });
  assert.ok(result);
  for (const file of [
    result!.baseFramePath, result!.previewCompositePath, result!.overlaySpecPath,
    result!.motionPathSpecPath, result!.audioIntentPath, result!.negativeMotionRulesPath,
    result!.approvalManifestPath
  ]) assert.ok(fs.existsSync(file), file);
  const overlay = JSON.parse(fs.readFileSync(result!.overlaySpecPath, 'utf8'));
  assert.equal(overlay.exact_text_policy, 'REMOTION_ONLY');
});

test('native Veo audio is extracted, placed and normalized as a controllable stem', () => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hsl-native-audio-'));
  roots.push(outputRoot);
  const videoPath = path.join(outputRoot, 'veo.mp4');
  const generated = spawnSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=1280x720:d=2',
    '-f', 'lavfi', '-i', 'sine=frequency=180:duration=2', '-shortest', '-c:v', 'libx264', '-c:a', 'aac', videoPath
  ], {encoding: 'utf8'});
  assert.equal(generated.status, 0, generated.stderr);
  const asset = {
    status: 'HSL_GENERATED_ASSET_IMPORTED', shot_id: 'HSL_001_V02', take_id: 'TAKE_01',
    video_path: videoPath, mime_type: 'video/mp4', sha256: 'sha', motion_package_hash: 'motion',
    start_frame_sha256: 'frame', observed_duration_seconds: 2, fps: 25, width: 1280, height: 720,
    generation_origin: 'MISSION_CONTROL_FIREFLY_VEO', model: 'Veo 3.1 Fast',
    generate_audio_requested: true, native_audio_status: 'PRESENT_VALIDATED',
    native_audio: {has_audio: true, codec: 'aac', sample_rate: 44100, channels: 1},
    visual_qa: {first_frame_fidelity: 'NOT_APPLICABLE', geometry_drift: 'NOT_APPLICABLE', text_ocr: 'TEXT_OCR_PASS'},
    evidence_status: 'illustrative', ai_disclosure_required: true, on_screen_label: 'AI VISUALIZATION'
  } satisfies HslGeneratedAssetIntakeItem;
  const result = new NativeGeneratedAudioAgent().create({
    timeline: [{shotId: asset.shot_id, startSeconds: 0.5, durationSeconds: 1.5}],
    assets: new Map([[asset.shot_id, asset]]), totalDurationSeconds: 2.5,
    outputDirectory: path.join(outputRoot, 'native')
  });
  assert.equal(result.status, 'NATIVE_AUDIO_QA_PASS');
  assert.equal(result.acceptedCount, 1);
  assert.ok(fs.statSync(result.bedPath).size > 0);
});
