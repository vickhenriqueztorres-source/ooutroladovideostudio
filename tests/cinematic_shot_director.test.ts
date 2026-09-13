import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import test, {after} from 'node:test';
import {CinematicShotDirectorAgent} from '../hsl/cinematic/agents/cinematicShotDirectorAgent';
import {HSL_CINEMATIC_BRAND_RULES} from '../hsl/cinematic/config/hslCinematicShotGrammar';
import {CinematicDirectionShadowRunner} from '../hsl/cinematic/runners/cinematicDirectionShadowRunner';
import {runCinematicDirectionShadowHook} from '../hsl/cinematic/runners/cinematicShadowHook';
import {inspectCinematicScenePlanMigration} from '../hsl/cinematic/services/cinematicScenePlanMigration';
import {tokenizeScriptWords} from '../hsl/cinematic/services/scriptWordSpans';
import {
  CinematicTelemetryEventData,
  CinematicTelemetryEventName,
  CinematicTelemetryPort
} from '../hsl/cinematic/telemetry/cinematicTelemetry';
import {
  CinematicScenePlanV1,
  CinematicShotDirection,
  CinematicShotDirectorInput,
  NarrativeBeatV1
} from '../hsl/cinematic/types/cinematicPlans';
import {validateCinematicScenePlan} from '../hsl/cinematic/validators/cinematicPlanValidator';
import {validateCinematicShotDirection} from '../hsl/cinematic/validators/cinematicShotValidator';
import {CinematicValidationError} from '../hsl/cinematic/validators/cinematicValidationError';

const SCRIPT = 'Fuel enters airport storage, passes through quality control, and then moves toward the gate.';
const tempRoots: string[] = [];

class CapturingTelemetry implements CinematicTelemetryPort {
  public readonly events: Array<{name: CinematicTelemetryEventName; data: CinematicTelemetryEventData}> = [];

  public emit(name: CinematicTelemetryEventName, data: CinematicTelemetryEventData): void {
    this.events.push({name, data});
  }
}

after(() => {
  for (const root of tempRoots) fs.rmSync(root, {recursive: true, force: true});
});

function beat(): NarrativeBeatV1 {
  return {
    id: 'HSL_018_B001',
    beat_id: 'HSL_018_B001',
    scene_id: 'HSL_018',
    claim_id: 'C007',
    t_start: 0.0,
    t_end: 4.5,
    transcript_span: SCRIPT,
    narrative_function: 'explain_mechanism',
    evidence_mode: 'witness',
    visual_claim: 'sistema mecânico operando com válvulas e tubulações industriais visíveis sob iluminação prática',
    visual_must_include: ['tubulações'],
    visual_must_not: [],
    hud_value: null,
    script_span: {start_word: 0, end_word: 13},
    timing: {source: 'estimated_wpm'}
  } as any;
}

function input(overrides: Partial<CinematicShotDirectorInput> = {}): CinematicShotDirectorInput {
  return {
    productionId: 'PROD_SHOT',
    episodeId: 'HSL_EP_001',
    sceneId: 'HSL_018',
    narrativeFunction: 'explain_mechanism',
    visualMode: 'licensed_real',
    narrativeIntent: 'Explain the controlled transfer of fuel through the airport system.',
    beats: [beat()],
    focusTargetCandidates: ['airport fuel distribution system'],
    sceneContext: {chapterId: 'CH_02', chapterTitle: 'The Last Mile'},
    brandRules: HSL_CINEMATIC_BRAND_RULES,
    ...overrides
  };
}

function generate(overrides: Partial<CinematicShotDirectorInput> = {}) {
  const telemetry = new CapturingTelemetry();
  const shotInput = input(overrides);
  const result = new CinematicShotDirectorAgent(telemetry).run(shotInput);
  return {result, telemetry, shotInput};
}

function fixture(options: {visualMode?: boolean} = {}): {root: string; packagePath: string} {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hsl-shot-director-'));
  tempRoots.push(root);
  const packagePath = path.join(root, 'episode-package.json');
  const words = tokenizeScriptWords(SCRIPT);
  fs.writeFileSync(packagePath, JSON.stringify({
    episode_id: 'HSL_EP_001',
    human_approval_status: 'APPROVED',
    claim_registry: [{claim_id: 'C007'}],
    scenes: [{
      scene_id: 'HSL_018',
      claim_id: 'C007',
      narrative_function: 'explain_mechanism',
      ...(options.visualMode === false ? {} : {visual_mode: 'licensed_real'}),
      visual_subject: 'airport fuel distribution system',
      review_status: 'APPROVED',
      voiceover: SCRIPT,
      narration_alignment: words.map((word, index) => ({
        word: word.text,
        start_ms: 1000 + index * 120,
        end_ms: 1100 + index * 120
      }))
    }]
  }, null, 2));
  return {root, packagePath};
}

async function runPlan(): Promise<{root: string; packagePath: string; plan: CinematicScenePlanV1; planPath: string}> {
  const {root, packagePath} = fixture();
  const result = await new CinematicDirectionShadowRunner(new CapturingTelemetry()).run({
    productionId: 'PROD_PLAN',
    editorialPackagePath: packagePath
  });
  const planPath = result.scenePlanPaths[0];
  return {root, packagePath, planPath, plan: JSON.parse(fs.readFileSync(planPath, 'utf8'))};
}

function invalidDirection(
  result: CinematicShotDirection,
  patch: Partial<CinematicShotDirection>
): CinematicShotDirection {
  return {...result, ...patch} as CinematicShotDirection;
}

function throwsCode(action: () => unknown, code: string): void {
  assert.throws(
    action,
    (error: unknown) => error instanceof CinematicValidationError && error.code === code
  );
}

function containsForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value as Record<string, unknown>).some(([key, child]) => (
    /prompt|start.?frame|firefly|kling|remotion/i.test(key) || containsForbiddenKey(child)
  ));
}

test('1. agent keeps every approved beat byte-identical', () => {
  const shotInput = input();
  const before = JSON.stringify(shotInput.beats);
  new CinematicShotDirectorAgent(new CapturingTelemetry()).run(shotInput);
  assert.equal(JSON.stringify(shotInput.beats), before);
});

test('2. agent output owns only focus, shot, camera and reason', () => {
  const {result} = generate();
  assert.deepEqual(Object.keys(result).sort(), ['camera', 'decisionReason', 'focusTarget', 'shot']);
});

test('3. narrative intent remains read-only', () => {
  const shotInput = input();
  const before = shotInput.narrativeIntent;
  new CinematicShotDirectorAgent(new CapturingTelemetry()).run(shotInput);
  assert.equal(shotInput.narrativeIntent, before);
});

test('4. scene plan leaves energy unset', async () => {
  assert.equal((await runPlan()).plan.direction.energy, null);
});

test('5. shot fields remain valid after the later continuity pass', async () => {
  const plan = (await runPlan()).plan;
  assert.ok(plan.direction.focus_target);
  assert.ok(plan.shot.shot_type);
  assert.ok(plan.camera.movement);
});

test('6. scene plan leaves micro-events empty', async () => {
  assert.deepEqual((await runPlan()).plan.micro_events, []);
});

test('7. scene plan leaves transition unset', async () => {
  assert.deepEqual((await runPlan()).plan.transition, {type: null, motivation: null});
});

test('8. scene plan leaves Remotion choreography empty', async () => {
  assert.deepEqual((await runPlan()).plan.remotion_choreography, []);
});

test('9. agent output contains no prompt or executor contract', () => {
  assert.equal(containsForbiddenKey(generate().result), false);
});

test('10. shadow run creates no Start Frame or image', async () => {
  const {root} = await runPlan();
  const files = fs.readdirSync(root, {recursive: true}).map(String);
  assert.equal(files.some((file) => /start.?frame|\.(png|jpe?g|webp)$/i.test(file)), false);
});

test('11. shadow run creates no Kling or Firefly artifact', async () => {
  const {root} = await runPlan();
  const files = fs.readdirSync(root, {recursive: true}).map(String);
  assert.equal(files.some((file) => /kling|firefly/i.test(file)), false);
});

test('12. moving camera without motivation is rejected', () => {
  const {result, shotInput} = generate();
  const invalid = invalidDirection(result, {
    camera: {movement: 'SLOW_DOLLY_IN', direction: 'FORWARD', intensity: 'LOW', motivation: null}
  });
  throwsCode(() => validateCinematicShotDirection(invalid, shotInput), 'CINEMATIC_CAMERA_MOTIVATION_REQUIRED');
});

test('13. value outside the closed shot grammar is rejected', () => {
  const {result, shotInput} = generate();
  const invalid = invalidDirection(result, {
    shot: {...result.shot, shot_type: 'DRONE_HERO' as never}
  });
  throwsCode(() => validateCinematicShotDirection(invalid, shotInput), 'CINEMATIC_SHOT_ENUM_INVALID');
});

test('14. empty or invented focus target is rejected', () => {
  const {result, shotInput} = generate();
  throwsCode(
    () => validateCinematicShotDirection(invalidDirection(result, {focusTarget: ''}), shotInput),
    'CINEMATIC_SHOT_FOCUS_REQUIRED'
  );
});

test('15. incoherent aerial extreme-close combination is rejected', () => {
  const {result, shotInput} = generate();
  const invalid = invalidDirection(result, {
    shot: {...result.shot, shot_type: 'AERIAL_NETWORK', shot_size: 'EXTREME_CLOSE'}
  });
  throwsCode(() => validateCinematicShotDirection(invalid, shotInput), 'CINEMATIC_SHOT_COMBINATION_INVALID');
});

test('16. full plan validator rejects changed narrative intent', async () => {
  const {plan} = await runPlan();
  const shotInput = input({beats: plan.beats, narrativeIntent: plan.direction.narrative_intent!});
  const invalid = {
    ...plan,
    direction: {...plan.direction, narrative_intent: 'A cinematic rewrite that was never approved.'}
  };
  throwsCode(
    () => validateCinematicScenePlan(invalid, {
      episodeId: plan.episode_id,
      existingSceneIds: new Set([plan.scene_id]),
      shotDirectorInput: shotInput
    }),
    'CINEMATIC_PROTECTED_FIELD_OVERRIDE'
  );
});

test('17. disabled feature flags create no side effects', async () => {
  // obsoleto desde a253b77: direção cinematográfica é obrigatória
  const {root, packagePath} = fixture();
  const before = fs.readdirSync(root);
  await assert.rejects(
    () => runCinematicDirectionShadowHook({
      productionId: 'PROD_DISABLED',
      editorialPackagePath: packagePath,
      flags: {pipelineV1Enabled: false, shadowModeEnabled: false, shouldRunShadow: false},
      runner: {run: async () => { throw new Error('must stay disabled'); }}
    }),
    /CINEMATIC_DIRECTION_REQUIRED/
  );
  assert.deepEqual(fs.readdirSync(root), before);
});

test('18. shot agent failure remains non-blocking through shadow hook', async () => {
  const {packagePath} = fixture({visualMode: false});
  const sourceBefore = fs.readFileSync(packagePath);
  const hook = await runCinematicDirectionShadowHook({
    productionId: 'PROD_NO_VISUAL_MODE',
    editorialPackagePath: packagePath,
    flags: {pipelineV1Enabled: false, shadowModeEnabled: true, shouldRunShadow: true},
    runner: new CinematicDirectionShadowRunner(new CapturingTelemetry())
  });
  assert.equal(hook.executed, true);
  assert.equal(hook.success, false);
  assert.match(hook.error || '', /CINEMATIC_VISUAL_MODE_REQUIRED/);
  assert.deepEqual(fs.readFileSync(packagePath), sourceBefore);
  assert.equal(fs.existsSync(path.join(path.dirname(packagePath), 'cinematic')), false);
});

test('19. earlier scene schemas use explicit regeneration migration', () => {
  assert.deepEqual(inspectCinematicScenePlanMigration({schema: 'hsl.cinematic.scene.v1', schema_version: '1.1.0'}), {
    readable: true,
    sourceVersion: '1.1.0',
    targetVersion: '1.3.0',
    requiresRegeneration: true,
    strategy: 'regenerate_from_approved_editorial_package'
  });
  assert.equal(inspectCinematicScenePlanMigration({
    schema: 'hsl.cinematic.scene.v1', schema_version: '1.2.0'
  }).requiresRegeneration, true);
  assert.equal(inspectCinematicScenePlanMigration({
    schema: 'hsl.cinematic.scene.v1', schema_version: '1.3.0'
  }).requiresRegeneration, false);
});

test('20. repeated shadow execution is byte-stable', async () => {
  const {packagePath} = fixture();
  const runner = new CinematicDirectionShadowRunner(new CapturingTelemetry());
  const first = await runner.run({productionId: 'PROD_STABLE_SHOT', editorialPackagePath: packagePath});
  const firstBytes = fs.readFileSync(first.scenePlanPaths[0]);
  const second = await runner.run({productionId: 'PROD_STABLE_SHOT', editorialPackagePath: packagePath});
  assert.deepEqual(fs.readFileSync(second.scenePlanPaths[0]), firstBytes);
});

test('21. shot telemetry reports lifecycle and structured metrics', () => {
  const {telemetry} = generate();
  assert.deepEqual(telemetry.events.map((event) => event.name), [
    'cinematic.shot.started', 'cinematic.shot.generated', 'cinematic.shot.completed'
  ]);
  const metrics = telemetry.events[1].data.shotMetrics;
  assert.equal(metrics?.shotType, 'MECHANICAL_DETAIL');
  assert.equal(metrics?.cameraMovement, 'SLOW_DOLLY_IN');
  assert.equal(metrics?.cameraIntensity, 'LOW');
});

test('22. static camera has explicit NONE state and no fallback motivation', () => {
  const {result} = generate({visualMode: 'remotion_flow_trace'});
  assert.deepEqual(result.camera, {movement: 'STATIC', direction: 'NONE', intensity: 'NONE', motivation: null});
  assert.equal(result.shot.shot_type, 'TECHNICAL_LOCKED');
});
