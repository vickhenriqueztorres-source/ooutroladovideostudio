import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import test, {after} from 'node:test';
import {HslEditorialRuntime} from '../hsl/editorial/editorialRuntime';
import {CinematicDirectionShadowRunner} from '../hsl/cinematic/runners/cinematicDirectionShadowRunner';
import {CinematicExecutionCompiler} from '../hsl/execution/cinematicExecutionCompiler';
import {HslStartFrameRuntime} from '../hsl/startframe/startFrameRuntime';
import {HslFireflyGenerationRuntime} from '../production/hslFireflyGenerationRuntime';
import {HslPostproductionRuntime} from '../hsl/postproduction/postproductionRuntime';
import {HslSoundFxRuntime} from '../hsl/postproduction/soundFxRuntime';
import {HslExecutableScene} from '../hsl/execution/types/execution';
import {HSL_PREMIUM_MOTION_REFERENCE_SET, HSL_VISUAL_IDENTITY_CONTRACT_VERSION} from '../config/hslVisualIdentity';
import {sha256File, sha256Text} from '../hsl/startframe/startFrameIdentityGate';

const roots: string[] = [];
after(() => roots.forEach((root) => fs.rmSync(root, {recursive: true, force: true})));

function root(name: string): string {
  const value = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
  roots.push(value);
  return value;
}

function hash(filePath: string): string {
  return `sha256_${crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')}`;
}

function json(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function image(filePath: string): void {
  fs.copyFileSync(path.resolve('assets/hsl/motion-reference-set-v1/last-meters.png'), filePath);
}

async function dryRun(base: string) {
  const editorial = new HslEditorialRuntime().run('HSL-E2E-TEST', path.join(base, 'editorial'));
  const cinematic = await new CinematicDirectionShadowRunner().run({productionId: 'HSL-E2E-TEST', editorialPackagePath: editorial.episodePackagePath});
  const execution = new CinematicExecutionCompiler().compile(editorial.episodePackagePath, cinematic);
  return {editorial, cinematic, execution};
}

test('complete editorial and cinematic chain produces approved execution contracts', async () => {
  const base = root('hsl-editorial-e2e');
  const result = await dryRun(base);
  const episode = JSON.parse(fs.readFileSync(result.editorial.episodePackagePath, 'utf8'));
  const execution = JSON.parse(fs.readFileSync(result.execution.executionPlanPath, 'utf8'));
  assert.equal(episode.gate.status, 'PASS');
  assert.equal(episode.reference_insights.reference_only, true);
  assert.equal(episode.attention_architecture.status, 'ATTENTION_ARCHITECTURE_APPROVED');
  assert.equal(episode.reference_originality_gate.status, 'PASS');
  assert.equal(episode.eugene_rag.status, 'EUGENE_RAG_READY');
  assert.equal(episode.audience_strategy.status, 'AUDIENCE_STRATEGY_APPROVED');
  assert.equal(episode.eugene_originality_gate.status, 'PASS');
  assert.equal(episode.promise_delivery_gate.status, 'PASS');
  assert.equal(episode.scenes.length, 8);
  assert.equal(result.execution.scenePaths.length, 8);
  assert.ok(execution.generated_scene_ids.length >= 6);
  assert.ok(execution.total_visual_shots > episode.scenes.length);
  assert.ok(execution.generated_shot_ids.length > execution.generated_scene_ids.length);
  for (const scenePath of result.execution.scenePaths) {
    const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
    assert.ok(scene.energy);
    assert.ok(scene.micro_events.length);
    assert.ok(scene.transition.type);
    assert.ok(scene.remotion_choreography.length);
    assert.ok(scene.attention_role);
    assert.ok(scene.visual_shots.length >= 2);
    assert.equal(scene.visual_shots.reduce((sum: number, shot: {planned_duration_seconds: number}) => sum + shot.planned_duration_seconds, 0), scene.planned_duration_seconds);
    for (const shot of scene.visual_shots) {
      if (shot.visual_mode === 'generated_ai') {
        assert.equal(shot.visual_identity_contract_version, HSL_VISUAL_IDENTITY_CONTRACT_VERSION);
        assert.equal(shot.required_visual_reference_set, HSL_PREMIUM_MOTION_REFERENCE_SET.name);
        assert.match(shot.start_frame_prompt, /present-day on-location investigative documentary photography/i);
      }
      if (shot.visual_mode === 'remotion') {
        assert.equal(shot.motion_design.schema, 'hsl.motion-design.v2');
        assert.ok(shot.motion_design.stages.length >= 3);
        assert.equal(shot.motion_design.beats.length, 4);
      }
    }
    if (scene.visual_mode === 'generated_ai') {
      assert.ok(scene.start_frame_prompt);
      assert.ok(scene.motion.motion_prompt);
    }
  }
  const coverage = JSON.parse(fs.readFileSync(result.execution.visualCoverageReportPath, 'utf8'));
  assert.equal(coverage.cinematic_coverage_policy.status, 'CINEMATIC_COVERAGE_QA_PASS');
  assert.ok(coverage.cinematic_coverage_policy.generated_ratio >= .7);
  assert.ok(coverage.cinematic_coverage_policy.remotion_ratio <= .22);
  assert.ok(coverage.generation_strategy_distribution.FIREFLY_CINEMATIC > 0);
  assert.ok((coverage.generation_strategy_distribution.VEO_MOTION_GRAPHIC || 0) + (coverage.generation_strategy_distribution.VEO_REMOTION_HYBRID || 0) > 0);
});

test('start-frame runtime requires physical 16:9 files, approval hashes and creates strict Firefly guides', async () => {
  const base = root('hsl-startframe-e2e');
  const result = await dryRun(base);
  const frames = path.join(base, 'frames');
  fs.mkdirSync(frames, {recursive: true});
  const execution = JSON.parse(fs.readFileSync(result.execution.executionPlanPath, 'utf8'));
  const generatedShotIds = execution.generated_shot_ids as string[];
  generatedShotIds.forEach((shotId) => image(path.join(frames, `${shotId}.png`)));
  const prompts = new Map<string, string>();
  for (const scenePath of result.execution.scenePaths) {
    const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8')) as HslExecutableScene;
    scene.visual_shots.filter((shot) => shot.visual_mode === 'generated_ai').forEach((shot) => {
      prompts.set(shot.shot_id, shot.start_frame_prompt || '');
    });
  }
  const provenancePath = path.join(frames, 'start-frame-provenance.json');
  json(provenancePath, {
    schema: 'hsl.start-frame.provenance.v2',
    status: 'IDENTITY_LOCKED_START_FRAMES_READY',
    identity_contract_version: HSL_VISUAL_IDENTITY_CONTRACT_VERSION,
    reference_set_manifest_path: HSL_PREMIUM_MOTION_REFERENCE_SET.manifestPath,
    reference_set_manifest_sha256: sha256File(path.resolve(HSL_PREMIUM_MOTION_REFERENCE_SET.manifestPath)),
    items: generatedShotIds.map((shotId) => ({
      shot_id: shotId,
      frame_sha256: hash(path.join(frames, `${shotId}.png`)),
      prompt_sha256: sha256Text(prompts.get(shotId) || ''),
      source_mode: 'REFERENCE_CONDITIONED_GENERATION',
      generator: 'TEST_REFERENCE_CONDITIONED_GENERATOR',
      identity_contract_version: HSL_VISUAL_IDENTITY_CONTRACT_VERSION,
      reference_asset_ids: ['OBSERVATIONAL_FIELD']
    }))
  });
  const approvalPath = path.join(base, 'approval.json');
  json(approvalPath, {
    episode_id: 'HSL-PILOT-001', status: 'APPROVED',
    visual_identity_contract_version: HSL_VISUAL_IDENTITY_CONTRACT_VERSION,
    start_frame_provenance_sha256: sha256File(provenancePath),
    review_artifact_sha256: 'sha256_test_review_artifact',
    items: generatedShotIds.map((shotId) => ({
      shot_id: shotId, status: 'APPROVED', approved_start_frame_sha256: hash(path.join(frames, `${shotId}.png`)), reviewer: 'TEST_REVIEWER', reviewed_at: '2026-08-19T00:00:00.000Z'
    }))
  });
  const startFrames = new HslStartFrameRuntime().run({
    productionId: 'HSL-E2E-TEST', executionPlanPath: result.execution.executionPlanPath,
    sourceFramesDirectory: frames, approvalManifestPath: approvalPath, outputDirectory: path.join(base, 'generation')
  });
  assert.equal(startFrames.motionPackagePaths.length, generatedShotIds.length);
  const prepared = new HslFireflyGenerationRuntime().prepare(startFrames.handoffs, path.join(base, 'firefly'));
  assert.deepEqual(prepared.jobNames, generatedShotIds.map((shotId) => `${shotId}_TAKE_01`));
  const guide = JSON.parse(fs.readFileSync(prepared.masterGuidePath, 'utf8'));
  assert.equal(guide.aspect_ratio, '16:9');
  assert.equal(guide.resolution, '1080p');
  assert.equal(guide.items.length, generatedShotIds.length);
  assert.match(guide.items[0].prompt, /provided first frame/i);
  const previousPaidDispatch = process.env.HSL_ALLOW_PAID_FIREFLY_DISPATCH;
  delete process.env.HSL_ALLOW_PAID_FIREFLY_DISPATCH;
  try {
    await assert.rejects(
      new HslFireflyGenerationRuntime().dispatch('HSL-E2E-TEST', prepared, {} as never),
      /HSL_PAID_FIREFLY_DISPATCH_NOT_AUTHORIZED/
    );
  } finally {
    if (previousPaidDispatch === undefined) delete process.env.HSL_ALLOW_PAID_FIREFLY_DISPATCH;
    else process.env.HSL_ALLOW_PAID_FIREFLY_DISPATCH = previousPaidDispatch;
  }
});

test('postproduction runtime renders a real Remotion documentary segment and passes ffprobe', async () => {
  const base = root('hsl-remotion-e2e');
  const executionRoot = path.join(base, 'execution');
  const scenePath = path.join(executionRoot, 'scenes', 'HSL_RM_001.execution.json');
  json(scenePath, {
    schema: 'hsl.execution.scene.v1', schema_version: '1.0.0', episode_id: 'HSL-REMOTION-TEST', scene_id: 'HSL_RM_001',
    chapter_id: 'TEST', narrative_function: 'explain_mechanism', voiceover: 'A system connects source, control and consequence.',
    visual_mode: 'remotion', visual_subject: 'Fuel storage to control to aircraft', evidence_status: 'inference', ai_disclosure_required: false,
    visual_function: null, cinematic_source_revision: 'sha256_test', energy: 'MEDIUM', planned_duration_seconds: 1,
    shot: {}, camera: {}, continuity: {}, micro_events: [{at_percent: 50, action: 'trace', subject: 'flow'}],
    transition: {type: 'CUT', motivation: 'test'}, remotion_choreography: [{at_percent: 20, type: 'flow_line', color_role: 'yellow'}],
    start_frame_prompt: null, motion: null, execution_revision: 'sha256_test'
  });
  const planPath = path.join(executionRoot, 'episode.execution.json');
  json(planPath, {
    schema: 'hsl.execution.episode.v1', schema_version: '1.0.0', episode_id: 'HSL-REMOTION-TEST', source_episode_package: 'test',
    source_cinematic_plan: 'test', status: 'EXECUTION_PLAN_APPROVED', scenes: ['scenes/HSL_RM_001.execution.json'], generated_scene_ids: [],
    execution_revision: 'sha256_test', generated_at: '2026-08-19T00:00:00.000Z'
  });
  const intakePath = path.join(base, 'intake.json');
  json(intakePath, {status: 'HSL_KLING_ASSET_INTAKE_READY', production_id: 'HSL-REMOTION-TEST', generated_at: '2026-08-19T00:00:00.000Z', items: []});
  const narrationPath = path.join(base, 'narration.mp3');
  const audio = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=1', narrationPath], {encoding: 'utf8'});
  assert.equal(audio.status, 0, audio.stderr);
  const result = await new HslPostproductionRuntime().run({
    productionId: `HSL-REMOTION-TEST-${Date.now()}`, executionPlanPath: planPath, intakeManifestPath: intakePath,
    narrationPath, outputDirectory: path.join(base, 'output')
  });
  assert.equal(result.success, true);
  assert.ok(fs.statSync(result.finalVideoPath).size > 0);
  const manifest = JSON.parse(fs.readFileSync(result.renderManifestPath, 'utf8'));
  assert.equal(manifest.status, 'FINAL_RENDER_QA_PASS');
  assert.equal(manifest.video.width, 1920);
  assert.equal(manifest.video.height, 1080);
  assert.equal(manifest.video.fps, 30);
  assert.equal(manifest.video.codec, 'h264');
  assert.equal(manifest.video.pixel_format, 'yuv420p');
  assert.equal(manifest.video.has_audio, true);
  assert.equal(manifest.video.audio_codec, 'aac');
  assert.equal(manifest.video.audio_sample_rate, 48000);
  assert.equal(manifest.video.audio_channels, 2);
  assert.match(manifest.video.sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.soundfx.qa.status, 'SFX_QA_PASS');
  assert.equal(manifest.soundfx.qa.sample_rate, 48000);
  assert.equal(manifest.soundfx.qa.channels, 2);
  assert.equal(manifest.narration.qa.status, 'NARRATION_AUDIO_QA_PASS');
  assert.ok(manifest.narration.qa.integrated_lufs >= -17);
  assert.ok(manifest.narration.qa.integrated_lufs <= -15);
  assert.ok(manifest.narration.qa.true_peak_dbtp <= -1);
  assert.equal(manifest.narration.qa.sample_rate, 48000);
  assert.equal(manifest.narration.qa.channels, 2);
  const props = JSON.parse(fs.readFileSync(path.join(base, 'output', 'remotion-props.json'), 'utf8'));
  assert.equal(props.showGlobalOverlays, false);
  assert.equal(props.scenes[0].motionDesign.schema, 'hsl.motion-design.v2');
  assert.notEqual(props.scenes[0].motionDesign.template, undefined);
  assert.ok(fs.statSync(result.narrationLeveledPath).size > 0);
  assert.ok(fs.statSync(result.narrationAudioQaPath).size > 0);
  assert.ok(fs.statSync(result.narrationPerformancePlanPath).size > 0);
  const soundFxPlan = JSON.parse(fs.readFileSync(result.soundFxPlanPath, 'utf8'));
  assert.equal(soundFxPlan.status, 'SFX_PLAN_APPROVED');
  assert.deepEqual(soundFxPlan.cues.map((cue: {type: string}) => cue.type), ['SNAP_POP']);
  assert.ok(fs.statSync(result.soundFxBedPath).size > 0);
});

test('sound FX runtime maps flow, bottleneck and chapter events to original verified assets', () => {
  const base = root('hsl-soundfx-e2e');
  const common = {
    schema: 'hsl.execution.scene.v1', schema_version: '1.0.0', episode_id: 'HSL-SFX-TEST',
    evidence_status: 'inference', ai_disclosure_required: false, visual_function: null,
    cinematic_source_revision: 'sha256_test', energy: 'MEDIUM', planned_duration_seconds: 1.2,
    shot: {}, camera: {}, continuity: {}, transition: {type: 'CUT', motivation: 'test'},
    start_frame_prompt: null, motion: null, execution_revision: 'sha256_test'
  };
  const scenes = [
    {
      ...common, scene_id: 'HSL_SFX_001', chapter_id: 'FLOW', narrative_function: 'explain mechanism',
      voiceover: 'The flow begins.', visual_mode: 'remotion', visual_subject: 'source to destination',
      micro_events: [{at_percent: 50, action: 'trace', subject: 'flow'}],
      remotion_choreography: [{at_percent: 30, type: 'flow_line', color_role: 'yellow'}]
    },
    {
      ...common, scene_id: 'HSL_SFX_002', chapter_id: 'CONSTRAINT', narrative_function: 'reveal bottleneck',
      voiceover: 'Then the constraint appears.', visual_mode: 'typography', visual_subject: 'system bottleneck',
      micro_events: [{at_percent: 55, action: 'reveal', subject: 'constraint'}], remotion_choreography: []
    }
  ] as unknown as HslExecutableScene[];
  const result = new HslSoundFxRuntime().run({scenes, outputDirectory: path.join(base, 'soundfx')});
  assert.equal(result.qa.status, 'SFX_QA_PASS');
  assert.deepEqual(new Set(result.plan.cues.map((cue) => cue.type)), new Set(['SNAP_POP', 'CHAPTER_DROP', 'SUBTLE_STRIKE']));
  result.plan.cues.forEach((cue) => {
    assert.equal(cue.provenance, 'KENNEY_CC0_DERIVATIVE');
    assert.equal(cue.license, 'CC0-1.0');
    assert.match(cue.source_page_url, /^https:\/\/kenney\.nl\/assets\//);
    assert.match(cue.asset_sha256, /^[a-f0-9]{64}$/);
  });
});
