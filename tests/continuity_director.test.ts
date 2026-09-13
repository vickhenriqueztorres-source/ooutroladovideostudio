import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import test, {after} from 'node:test';
import {ContinuityDirectorAgent} from '../hsl/cinematic/agents/continuityDirectorAgent';
import {CinematicDirectionShadowRunner} from '../hsl/cinematic/runners/cinematicDirectionShadowRunner';
import {runCinematicDirectionShadowHook} from '../hsl/cinematic/runners/cinematicShadowHook';
import {buildCinematicContinuityContexts} from '../hsl/cinematic/services/cinematicContinuityContextBuilder';
import {inspectCinematicScenePlanMigration} from '../hsl/cinematic/services/cinematicScenePlanMigration';
import {buildCinematicSequenceMemory} from '../hsl/cinematic/services/cinematicSequenceMemoryBuilder';
import {tokenizeScriptWords} from '../hsl/cinematic/services/scriptWordSpans';
import {
  CinematicTelemetryEventData,
  CinematicTelemetryEventName,
  CinematicTelemetryPort
} from '../hsl/cinematic/telemetry/cinematicTelemetry';
import {
  CINEMATIC_SCENE_SCHEMA_VERSION,
  CinematicContinuityDecision,
  CinematicContinuitySceneView,
  CinematicScenePlanV1,
  HslCameraMovement,
  HslComposition,
  HslShotSize,
  HslShotType
} from '../hsl/cinematic/types/cinematicPlans';
import {
  validateCinematicContinuityDecision,
  validateContinuityOwnership
} from '../hsl/cinematic/validators/cinematicContinuityValidator';
import {CinematicValidationError} from '../hsl/cinematic/validators/cinematicValidationError';

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

interface ViewOptions {
  chapterId?: string | null;
  narrativeFunction?: string;
  narrativeIntent?: string;
  focus?: string;
  shotType?: HslShotType;
  shotSize?: HslShotSize;
  composition?: HslComposition;
  movement?: HslCameraMovement;
  direction?: CinematicContinuitySceneView['camera']['direction'];
  motivation?: CinematicContinuitySceneView['camera']['motivation'];
  visualMode?: string;
  beatSemantic?: CinematicContinuitySceneView['beat_semantics'][number];
}

function view(id: string, options: ViewOptions = {}): CinematicContinuitySceneView {
  const movement = options.movement || 'STATIC';
  return {
    scene_id: id,
    chapter_id: options.chapterId === undefined ? 'CH_01' : options.chapterId,
    narrative_function: options.narrativeFunction || 'explain_mechanism',
    beat_semantics: [options.beatSemantic || 'explain_mechanism'],
    narrative_intent: options.narrativeIntent || `Explain the role of ${options.focus || id}.`,
    focus_target: options.focus || `component ${id}`,
    shot: {
      shot_type: options.shotType || 'OPERATION',
      shot_size: options.shotSize || 'MEDIUM',
      composition: options.composition || 'RULE_OF_THIRDS_LEFT',
      subject_anchor: 'LEFT_THIRD',
      negative_space: 'RIGHT',
      negative_space_motivation: 'ROOM_FOR_FUTURE_LABEL',
      depth_design: 'THREE_LAYER',
      lens_language: 'DOCUMENTARY_35'
    },
    camera: {
      movement,
      direction: options.direction || (movement === 'STATIC' ? 'NONE' : 'LEFT_TO_RIGHT'),
      intensity: movement === 'STATIC' ? 'NONE' : 'LOW',
      motivation: options.motivation === undefined
        ? (movement === 'STATIC' ? null : 'FOLLOW_FLOW')
        : options.motivation
    },
    visual_mode: options.visualMode || 'licensed_real'
  };
}

function run(views: readonly CinematicContinuitySceneView[], telemetry = new CapturingTelemetry()) {
  const input = {productionId: 'PROD_CONTINUITY', episodeId: 'HSL_EP_001', scenes: views};
  return {input, telemetry, result: new ContinuityDirectorAgent(telemetry).runEpisode(input)};
}

function fixture(options: {missingVisualModeAt?: number; sceneCount?: number} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hsl-continuity-'));
  tempRoots.push(root);
  const packagePath = path.join(root, 'episode-package.json');
  const sceneCount = options.sceneCount || 3;
  const scenes = Array.from({length: sceneCount}, (_, index) => {
    const voiceover = index === 0
      ? 'The airport fuel system connects storage with every active gate.'
      : index === 1
        ? 'A transfer valve controls when fuel enters the distribution line.'
        : 'When that transfer slows, aircraft wait longer at the gate.';
    const words = tokenizeScriptWords(voiceover);
    return {
      scene_id: `HSL_${String(index + 1).padStart(3, '0')}`,
      claim_id: `C${String(index + 1).padStart(3, '0')}`,
      chapter_id: index < 2 ? 'CH_01' : 'CH_02',
      narrative_function: index === 0 ? 'establish_context' : index === 1 ? 'explain_mechanism' : 'consequence',
      ...(options.missingVisualModeAt === index ? {} : {visual_mode: index === 1 ? 'remotion_flow_trace' : 'licensed_real'}),
      visual_subject: index === 0 ? 'airport fuel system' : index === 1 ? 'transfer valve' : 'waiting aircraft',
      review_status: 'APPROVED',
      voiceover,
      narration_alignment: words.map((word, wIdx) => ({
        word: word.text,
        start_ms: 1000 + wIdx * 120,
        end_ms: 1100 + wIdx * 120
      }))
    };
  });
  fs.writeFileSync(packagePath, JSON.stringify({
    episode_id: 'HSL_EP_001',
    human_approval_status: 'APPROVED',
    claim_registry: scenes.map((scene) => ({claim_id: scene.claim_id})),
    scenes
  }, null, 2));
  return {root, packagePath};
}

async function runnerPlans(sceneCount = 3) {
  const {root, packagePath} = fixture({sceneCount});
  const result = await new CinematicDirectionShadowRunner(new CapturingTelemetry()).run({
    productionId: 'PROD_CONTINUITY_RUNNER', editorialPackagePath: packagePath
  });
  return {
    root,
    packagePath,
    result,
    plans: result.scenePlanPaths.map((file) => JSON.parse(fs.readFileSync(file, 'utf8')) as CinematicScenePlanV1)
  };
}

function continuityContext(views: readonly CinematicContinuitySceneView[], index: number) {
  return {
    currentScene: views[index],
    previousScene: views[index - 1] || null,
    nextScene: views[index + 1] || null,
    existingSceneIds: new Set(views.map((scene) => scene.scene_id))
  };
}

function throwsCode(action: () => unknown, code: string): void {
  assert.throws(action, (error: unknown) => error instanceof CinematicValidationError && error.code === code);
}

test('1. scene schema advances without changing the logical V1 contract', () => {
  assert.equal(CINEMATIC_SCENE_SCHEMA_VERSION, '1.3.0');
});

test('2. Continuity Director output owns only continuity decisions and metrics', () => {
  const {result} = run([view('HSL_001'), view('HSL_002')]);
  assert.deepEqual(Object.keys(result).sort(), ['decisions', 'metrics']);
  assert.deepEqual(Object.keys(result.decisions[0]).sort(), ['continuity', 'sceneId']);
});

test('3. beats semantic summaries remain byte-identical', () => {
  const views = [view('HSL_001'), view('HSL_002')];
  const before = JSON.stringify(views.map((scene) => scene.beat_semantics));
  run(views);
  assert.equal(JSON.stringify(views.map((scene) => scene.beat_semantics)), before);
});

test('4. narrative intent remains byte-identical', () => {
  const views = [view('HSL_001'), view('HSL_002')];
  const before = JSON.stringify(views.map((scene) => scene.narrative_intent));
  run(views);
  assert.equal(JSON.stringify(views.map((scene) => scene.narrative_intent)), before);
});

test('5. shot direction remains byte-identical', () => {
  const views = [view('HSL_001'), view('HSL_002')];
  const before = JSON.stringify(views.map((scene) => scene.shot));
  run(views);
  assert.equal(JSON.stringify(views.map((scene) => scene.shot)), before);
});

test('6. camera intent remains byte-identical', () => {
  const views = [view('HSL_001'), view('HSL_002')];
  const before = JSON.stringify(views.map((scene) => scene.camera));
  run(views);
  assert.equal(JSON.stringify(views.map((scene) => scene.camera)), before);
});

test('7. energy remains null after episode pass', async () => {
  assert.equal((await runnerPlans()).plans.every((plan) => plan.direction.energy === null), true);
});

test('8. micro-events remain empty after episode pass', async () => {
  assert.equal((await runnerPlans()).plans.every((plan) => plan.micro_events.length === 0), true);
});

test('9. transition remains null after episode pass', async () => {
  assert.equal((await runnerPlans()).plans.every((plan) => (
    plan.transition.type === null && plan.transition.motivation === null
  )), true);
});

test('10. Remotion choreography remains empty after episode pass', async () => {
  assert.equal((await runnerPlans()).plans.every((plan) => plan.remotion_choreography.length === 0), true);
});

test('11. episode pass creates no Start Frame or image artifact', async () => {
  const {root} = await runnerPlans();
  const files = fs.readdirSync(root, {recursive: true}).map(String);
  assert.equal(files.some((file) => /start.?frame|\.(png|jpe?g|webp)$/i.test(file)), false);
});

test('12. episode pass creates no Kling or Firefly artifact', async () => {
  const {root} = await runnerPlans();
  assert.equal(fs.readdirSync(root, {recursive: true}).map(String).some((file) => /kling|firefly/i.test(file)), false);
});

test('13. first scene never invents a predecessor', () => {
  assert.equal(run([view('HSL_001'), view('HSL_002')]).result.decisions[0].continuity.incoming, null);
});

test('14. last scene never invents a successor', () => {
  assert.equal(run([view('HSL_001'), view('HSL_002')]).result.decisions[1].continuity.outgoing, null);
});

test('15. decision order follows the canonical input order', () => {
  const ids = ['HSL_020', 'HSL_003', 'HSL_100'];
  assert.deepEqual(run(ids.map((id) => view(id))).result.decisions.map((item) => item.sceneId), ids);
});

test('16. filesystem order cannot alter episode analysis', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hsl-continuity-order-'));
  tempRoots.push(root);
  fs.writeFileSync(path.join(root, 'Z.scene'), 'z');
  fs.writeFileSync(path.join(root, 'A.scene'), 'a');
  const views = [view('HSL_020'), view('HSL_003'), view('HSL_100')];
  assert.deepEqual(run(views).result, run(views).result);
});

test('17. four repeated non-static camera movements create a warning', () => {
  const views = Array.from({length: 4}, (_, index) => view(`HSL_00${index + 1}`, {
    movement: 'TRACK_RIGHT', direction: 'LEFT_TO_RIGHT'
  }));
  assert.equal(run(views).result.decisions[3].continuity.warnings.some((warning) => (
    warning.code === 'REPEATED_CAMERA_MOVEMENT' && warning.run_length === 4
  )), true);
});

test('18. two equal camera movements do not force a warning', () => {
  const views = [1, 2].map((index) => view(`HSL_00${index}`, {
    movement: 'TRACK_RIGHT', direction: 'LEFT_TO_RIGHT'
  }));
  assert.equal(run(views).result.decisions[1].continuity.warnings.some((warning) => (
    warning.code === 'REPEATED_CAMERA_MOVEMENT'
  )), false);
});

test('19. REVERSE_MOTIVATED without motivation is rejected', () => {
  const views = [view('HSL_001'), view('HSL_002')];
  const decision = structuredClone(run(views).result.decisions[1].continuity) as CinematicContinuityDecision;
  const invalid = {
    ...decision,
    incoming: {...decision.incoming!, axis_strategy: 'REVERSE_MOTIVATED' as const, axis_motivation: null}
  };
  throwsCode(
    () => validateCinematicContinuityDecision(invalid, continuityContext(views, 1)),
    'CINEMATIC_CONTINUITY_REVERSAL_MOTIVATION_REQUIRED'
  );
});

test('20. supported return flow produces a motivated reversal', () => {
  const views = [
    view('HSL_001', {movement: 'TRACK_RIGHT', direction: 'LEFT_TO_RIGHT', visualMode: 'real_left_to_right'}),
    view('HSL_002', {
      movement: 'TRACK_LEFT', direction: 'RIGHT_TO_LEFT', visualMode: 'real_right_to_left',
      narrativeIntent: 'The return path moves back through the distribution system.'
    })
  ];
  const incoming = run(views).result.decisions[1].continuity.incoming;
  assert.equal(incoming?.axis_strategy, 'REVERSE_MOTIVATED');
  assert.equal(incoming?.axis_motivation, 'RETURN_PATH');
});

test('21. scale relation deterministically contracts and expands', () => {
  const views = [
    view('HSL_001', {shotSize: 'WIDE'}),
    view('HSL_002', {shotSize: 'CLOSE'}),
    view('HSL_003', {shotSize: 'WIDE'})
  ];
  const result = run(views).result;
  assert.equal(result.decisions[1].continuity.incoming?.shot_scale_relation, 'CONTRACT');
  assert.equal(result.decisions[2].continuity.incoming?.shot_scale_relation, 'EXPAND');
});

test('22. focus handoff may reference only the real adjacent scene', () => {
  const views = [view('HSL_001', {focus: 'fuel pipeline'}), view('HSL_002', {focus: 'pipeline valve'})];
  const decision = structuredClone(run(views).result.decisions[0].continuity) as CinematicContinuityDecision;
  const invalid = {...decision, outgoing: {...decision.outgoing!, scene_id: 'HSL_999'}};
  throwsCode(
    () => validateCinematicContinuityDecision(invalid, continuityContext(views, 0)),
    'CINEMATIC_CONTINUITY_RELATION_INVALID'
  );
});

test('23. unknown bridge candidate is rejected', () => {
  const views = [view('HSL_001'), view('HSL_002')];
  const decision = structuredClone(run(views).result.decisions[0].continuity) as CinematicContinuityDecision;
  const invalid = {...decision, outgoing: {...decision.outgoing!, bridge_candidate: 'PORTAL' as never}};
  throwsCode(
    () => validateCinematicContinuityDecision(invalid, continuityContext(views, 0)),
    'CINEMATIC_CONTINUITY_ENUM_INVALID'
  );
});

test('24. unknown warning code is rejected', () => {
  const views = [view('HSL_001'), view('HSL_002')];
  const decision = structuredClone(run(views).result.decisions[0].continuity) as CinematicContinuityDecision;
  const invalid = {
    ...decision,
    warnings: [{code: 'MAKE_IT_EPIC' as never, severity: 'LOW' as const, owner: 'NONE' as const, run_length: null, detail: null}]
  };
  throwsCode(
    () => validateCinematicContinuityDecision(invalid, continuityContext(views, 0)),
    'CINEMATIC_CONTINUITY_ENUM_INVALID'
  );
});

test('25. schema 1.2 requires regeneration and receives no invented continuity', () => {
  assert.deepEqual(inspectCinematicScenePlanMigration({schema: 'hsl.cinematic.scene.v1', schema_version: '1.2.0'}), {
    readable: true,
    sourceVersion: '1.2.0',
    targetVersion: '1.3.0',
    requiresRegeneration: true,
    strategy: 'regenerate_from_approved_editorial_package'
  });
});

test('26. episode pass is deterministic', () => {
  const views = [view('HSL_001'), view('HSL_002'), view('HSL_003')];
  assert.deepEqual(run(views).result, run(views).result);
});

test('27. generation failure before staging promotes no partial set', async () => {
  const {root, packagePath} = fixture({missingVisualModeAt: 1});
  await assert.rejects(
    new CinematicDirectionShadowRunner(new CapturingTelemetry()).run({
      productionId: 'PROD_CONTINUITY_PARTIAL', editorialPackagePath: packagePath
    }),
    /CINEMATIC_VISUAL_MODE_REQUIRED/
  );
  assert.equal(fs.existsSync(path.join(root, 'cinematic')), false);
});

test('28. feature flags OFF preserve the existing behavior', async () => {
  // obsoleto desde a253b77: direção cinematográfica é obrigatória
  const {root, packagePath} = fixture();
  const before = fs.readdirSync(root);
  await assert.rejects(
    () => runCinematicDirectionShadowHook({
      productionId: 'PROD_CONTINUITY_OFF', editorialPackagePath: packagePath,
      flags: {pipelineV1Enabled: false, shadowModeEnabled: false, shouldRunShadow: false},
      runner: {run: async () => { throw new Error('must remain disabled'); }}
    }),
    /CINEMATIC_DIRECTION_REQUIRED/
  );
  assert.deepEqual(fs.readdirSync(root), before);
});

test('29. shadow failure does not block or modify production truth', async () => {
  const {packagePath} = fixture({missingVisualModeAt: 1});
  const before = fs.readFileSync(packagePath);
  const result = await runCinematicDirectionShadowHook({
    productionId: 'PROD_CONTINUITY_FAILURE', editorialPackagePath: packagePath,
    flags: {pipelineV1Enabled: false, shadowModeEnabled: true, shouldRunShadow: true},
    runner: new CinematicDirectionShadowRunner(new CapturingTelemetry())
  });
  assert.equal(result.executed, true);
  assert.equal(result.success, false);
  assert.deepEqual(fs.readFileSync(packagePath), before);
});

test('30. Continuity namespace imports no video executor', () => {
  const files = [
    '../hsl/cinematic/agents/continuityDirectorAgent.ts',
    '../hsl/cinematic/services/cinematicContinuityContextBuilder.ts',
    '../hsl/cinematic/services/cinematicSequenceMemoryBuilder.ts',
    '../hsl/cinematic/validators/cinematicContinuityValidator.ts'
  ].map((file) => fs.readFileSync(path.resolve(__dirname, file), 'utf8'))
    .flatMap((source) => source.split(/\r?\n/).filter((line) => /^import\b/.test(line)))
    .join('\n');
  assert.equal(/FireflyAdapter|KlingProviderPromptAdapter|MotionToFireflyBridge|FireflyToIntakeBridge|StartFrame|remotion/i.test(files), false);
});

test('31. sequence memory is explicit, reconstructable and capped at six scenes', () => {
  const views = Array.from({length: 8}, (_, index) => view(`HSL_${index + 1}`));
  const memory = buildCinematicSequenceMemory(views, 7);
  assert.equal(memory.last_n_scenes, 6);
  assert.equal(memory.shot_size_sequence.length, 6);
  assert.equal(memory.shot_type_counts.OPERATION, 6);
});

test('32. context window exposes three previous and two next scenes', () => {
  const views = Array.from({length: 8}, (_, index) => view(`HSL_${index + 1}`));
  const context = buildCinematicContinuityContexts('HSL_EP_001', views)[4];
  assert.deepEqual(context.previousScenes.map((scene) => scene.scene_id), ['HSL_2', 'HSL_3', 'HSL_4']);
  assert.deepEqual(context.nextScenes.map((scene) => scene.scene_id), ['HSL_6', 'HSL_7']);
});

test('33. telemetry reports episode lifecycle, scene analysis and metrics', () => {
  const telemetry = new CapturingTelemetry();
  run([view('HSL_001'), view('HSL_002')], telemetry);
  assert.deepEqual(telemetry.events.map((event) => event.name), [
    'cinematic.continuity.started',
    'cinematic.continuity.scene_analyzed',
    'cinematic.continuity.scene_analyzed',
    'cinematic.continuity.completed'
  ]);
  assert.equal(telemetry.events.at(-1)?.data.continuityMetrics?.sceneCount, 2);
});

test('34. ownership validator rejects any attempted shot rewrite', async () => {
  const plan = (await runnerPlans(1)).plans[0];
  const changedSize: HslShotSize = plan.shot.shot_size === 'WIDE' ? 'CLOSE' : 'WIDE';
  const changed = {...plan, shot: {...plan.shot, shot_size: changedSize}};
  throwsCode(
    () => validateContinuityOwnership(plan, changed),
    'CINEMATIC_CONTINUITY_OWNERSHIP_VIOLATION'
  );
});
