import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import test, {after} from 'node:test';
import {getHslCinematicFlags} from '../config/hslCinematicFlags';
import {CinematicDirectionShadowRunner} from '../hsl/cinematic/runners/cinematicDirectionShadowRunner';
import {runCinematicDirectionShadowHook} from '../hsl/cinematic/runners/cinematicShadowHook';
import {
  CinematicTelemetryEventData,
  CinematicTelemetryEventName,
  CinematicTelemetryPort
} from '../hsl/cinematic/telemetry/cinematicTelemetry';
import {CinematicScenePlanV1} from '../hsl/cinematic/types/cinematicPlans';
import {tokenizeScriptWords} from '../hsl/cinematic/services/scriptWordSpans';
import {
  CinematicValidationError,
  validateCinematicScenePlan
} from '../hsl/cinematic/validators/cinematicPlanValidator';

class CapturingTelemetry implements CinematicTelemetryPort {
  public readonly events: Array<{name: CinematicTelemetryEventName; data: CinematicTelemetryEventData}> = [];

  public emit(name: CinematicTelemetryEventName, data: CinematicTelemetryEventData): void {
    this.events.push({name, data});
  }
}

const tempRoots: string[] = [];

after(() => {
  for (const root of tempRoots) fs.rmSync(root, {recursive: true, force: true});
});

function fixture(): {root: string; packagePath: string} {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hsl-cinematic-shadow-'));
  tempRoots.push(root);
  const packagePath = path.join(root, 'episode-package.json');
  const v1 = "Fuel does not move directly from a refinery to an aircraft. It first enters a regional distribution network.";
  const v2 = "It reaches airport storage, passes through quality control, and only then moves toward the gate.";
  const words1 = tokenizeScriptWords(v1);
  const words2 = tokenizeScriptWords(v2);

  fs.writeFileSync(packagePath, JSON.stringify({
    episode_id: 'HSL_EP_TEST_001',
    human_approval_status: 'APPROVED',
    approved_script: {artifact_path: 'script-approved.json'},
    visual_plan: {artifact_path: 'visual-plan-approved.json'},
    claim_registry: {artifact_path: 'claims-approved.json'},
    scenes: [
      {
        scene_id: 'HSL_001',
        claim_id: 'C001',
        narrative_function: 'explain_mechanism',
        visual_mode: 'remotion_flow_trace',
        evidence_status: 'fact',
        review_status: 'APPROVED',
        voiceover: v1,
        narration_alignment: words1.map((w, i) => ({
          word: w.text,
          start_ms: 1000 + i * 120,
          end_ms: 1100 + i * 120
        }))
      },
      {
        scene_id: 'HSL_002',
        claim_id: 'C002',
        narrative_function: 'show_consequence',
        visual_mode: 'licensed_real',
        evidence_status: 'fact',
        review_status: 'APPROVED',
        voiceover: v2,
        narration_alignment: words2.map((w, i) => ({
          word: w.text,
          start_ms: 2000 + i * 120,
          end_ms: 2100 + i * 120
        }))
      }
    ]
  }, null, 2));
  return {root, packagePath};
}

function filesUnder(root: string): string[] {
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else files.push(path.relative(root, absolute).replace(/\\/g, '/'));
    }
  };
  visit(root);
  return files.sort();
}

function digest(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function enabledFlags() {
  return getHslCinematicFlags({
    HSL_CINEMATIC_PIPELINE_V1: 'true',
    HSL_CINEMATIC_SHADOW_MODE: 'true'
  });
}

test('1. feature flag OFF blocks production and requires HSL_CINEMATIC_PIPELINE_V1', async () => {
  const {root, packagePath} = fixture();
  await assert.rejects(
    runCinematicDirectionShadowHook({
      productionId: 'PROD_OFF',
      editorialPackagePath: packagePath,
      flags: getHslCinematicFlags({ HSL_CINEMATIC_PIPELINE_V1: '0', HSL_CINEMATIC_SHADOW_MODE: '0' }),
      runner: {run: async () => { throw new Error('runner must not execute'); }}
    }),
    /CINEMATIC_DIRECTION_REQUIRED/
  );
  assert.equal(getHslCinematicFlags({HSL_CINEMATIC_PIPELINE_V1: 'true', HSL_CINEMATIC_SHADOW_MODE: '0'}).shouldRunShadow, false);
});

test('2. shadow mode ON creates versioned scene and episode sidecars', async () => {
  const {packagePath} = fixture();
  const telemetry = new CapturingTelemetry();
  const result = await new CinematicDirectionShadowRunner(telemetry).run({
    productionId: 'PROD_ON',
    editorialPackagePath: packagePath,
    expectedEpisodeId: 'HSL_EP_TEST_001'
  });

  assert.equal(result.scenePlanPaths.length, 2);
  assert.ok(fs.existsSync(result.episodePlanPath));
  const scene = JSON.parse(fs.readFileSync(result.scenePlanPaths[0], 'utf8'));
  assert.equal(scene.schema, 'hsl.cinematic.scene.v1');
  assert.equal(scene.schema_version, '1.3.0');
  assert.equal(scene.mode, 'shadow');
  assert.deepEqual(scene.camera, {movement: 'STATIC', direction: 'NONE', intensity: 'NONE', motivation: null});
  assert.equal(scene.shot.shot_type, 'TECHNICAL_LOCKED');
  assert.ok(scene.direction.focus_target);
});

test('3. shadow execution does not modify the source Scene Contract package', async () => {
  const {packagePath} = fixture();
  const before = digest(packagePath);
  await new CinematicDirectionShadowRunner(new CapturingTelemetry()).run({
    productionId: 'PROD_READONLY',
    editorialPackagePath: packagePath
  });
  assert.equal(digest(packagePath), before);
});

test('4. shadow execution creates no Firefly or Kling job artifact', async () => {
  const {root, packagePath} = fixture();
  await new CinematicDirectionShadowRunner(new CapturingTelemetry()).run({
    productionId: 'PROD_NO_JOBS',
    editorialPackagePath: packagePath
  });
  const files = filesUnder(root);
  assert.equal(files.some((file) => /firefly|kling|job/i.test(file)), false);
  assert.deepEqual(files.filter((file) => file !== 'episode-package.json').every((file) => file.startsWith('cinematic/')), true);
});

test('5. shadow execution generates no Start Frame or image file', async () => {
  const {root, packagePath} = fixture();
  await new CinematicDirectionShadowRunner(new CapturingTelemetry()).run({
    productionId: 'PROD_NO_FRAMES',
    editorialPackagePath: packagePath
  });
  assert.equal(filesUnder(root).some((file) => /start.?frame|\.(png|jpe?g|webp)$/i.test(file)), false);
});

test('6. shadow execution does not alter ProductionStateMachine', async () => {
  const stateMachinePath = path.resolve(__dirname, '../orchestrator/stateMachine.ts');
  const before = digest(stateMachinePath);
  const {packagePath} = fixture();
  await new CinematicDirectionShadowRunner(new CapturingTelemetry()).run({
    productionId: 'PROD_NO_STATE',
    editorialPackagePath: packagePath
  });
  assert.equal(digest(stateMachinePath), before);
});

test('7. validator rejects a sidecar whose scene_id does not exist', async () => {
  const {packagePath} = fixture();
  const result = await new CinematicDirectionShadowRunner(new CapturingTelemetry()).run({
    productionId: 'PROD_BAD_SCENE',
    editorialPackagePath: packagePath
  });
  const plan = JSON.parse(fs.readFileSync(result.scenePlanPaths[0], 'utf8')) as CinematicScenePlanV1;
  const invalid = {...plan, scene_id: 'HSL_999'};

  assert.throws(
    () => validateCinematicScenePlan(invalid, {
      episodeId: 'HSL_EP_TEST_001',
      existingSceneIds: new Set(['HSL_001', 'HSL_002'])
    }),
    (error: unknown) => error instanceof CinematicValidationError && error.code === 'CINEMATIC_SCENE_NOT_FOUND'
  );
});

test('8. validator rejects invalid schemas and protected editorial overrides', async () => {
  const {packagePath} = fixture();
  const result = await new CinematicDirectionShadowRunner(new CapturingTelemetry()).run({
    productionId: 'PROD_BAD_SCHEMA',
    editorialPackagePath: packagePath
  });
  const plan = JSON.parse(fs.readFileSync(result.scenePlanPaths[0], 'utf8')) as Record<string, unknown>;
  const {schema_version: _removed, ...withoutVersion} = plan;
  const context = {episodeId: 'HSL_EP_TEST_001', existingSceneIds: new Set(['HSL_001', 'HSL_002'])};

  assert.throws(
    () => validateCinematicScenePlan(withoutVersion, context),
    (error: unknown) => error instanceof CinematicValidationError && error.code === 'CINEMATIC_SCHEMA_INVALID'
  );
  assert.throws(
    () => validateCinematicScenePlan({...plan, claim_override: 'C999'}, context),
    (error: unknown) => error instanceof CinematicValidationError && error.code === 'CINEMATIC_PROTECTED_FIELD_OVERRIDE'
  );
});

test('9. a second run is byte-stable and creates no duplicate sidecars', async () => {
  const {root, packagePath} = fixture();
  const runner = new CinematicDirectionShadowRunner(new CapturingTelemetry());
  const first = await runner.run({productionId: 'PROD_IDEMPOTENT', editorialPackagePath: packagePath});
  const filesAfterFirst = filesUnder(root);
  const bytesAfterFirst = [first.episodePlanPath, ...first.scenePlanPaths].map((file) => fs.readFileSync(file, 'utf8'));
  const second = await runner.run({productionId: 'PROD_IDEMPOTENT', editorialPackagePath: packagePath});

  assert.deepEqual(filesUnder(root), filesAfterFirst);
  assert.deepEqual(
    [second.episodePlanPath, ...second.scenePlanPaths].map((file) => fs.readFileSync(file, 'utf8')),
    bytesAfterFirst
  );
});

test('10. runner failure emits validation_failed and failed telemetry', async () => {
  const telemetry = new CapturingTelemetry();
  const runner = new CinematicDirectionShadowRunner(telemetry);

  await assert.rejects(
    runner.run({
      productionId: 'PROD_FAILURE',
      editorialPackagePath: path.join(os.tmpdir(), 'missing-hsl-cinematic-package.json'),
      expectedEpisodeId: 'HSL_EP_MISSING'
    }),
    /CINEMATIC_SOURCE_PACKAGE_INVALID/
  );
  assert.deepEqual(
    telemetry.events.map((event) => event.name),
    ['cinematic.shadow.started', 'cinematic.shadow.validation_failed', 'cinematic.shadow.failed']
  );
  assert.equal(telemetry.events[2].data.errorCode, 'CINEMATIC_SOURCE_PACKAGE_INVALID');

  await assert.rejects(
    runCinematicDirectionShadowHook({
      productionId: 'PROD_BLOCKING',
      editorialPackagePath: 'unused.json',
      flags: enabledFlags(),
      runner: {run: async () => { throw new Error('cinematic-direction failure'); }}
    }),
    /CINEMATIC_DIRECTION_GATE_FAILED: cinematic-direction failure/
  );
});

