import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import test, {after} from 'node:test';
import {NarrativeBeatDirectorAgent} from '../hsl/cinematic/agents/narrativeBeatDirectorAgent';
import {CinematicDirectionShadowRunner} from '../hsl/cinematic/runners/cinematicDirectionShadowRunner';
import {runCinematicDirectionShadowHook} from '../hsl/cinematic/runners/cinematicShadowHook';
import {CinematicArtifactStore} from '../hsl/cinematic/services/cinematicArtifactStore';
import {tokenizeScriptWords} from '../hsl/cinematic/services/scriptWordSpans';
import {
  CinematicTelemetryEventData,
  CinematicTelemetryEventName,
  CinematicTelemetryPort
} from '../hsl/cinematic/telemetry/cinematicTelemetry';
import {NarrativeBeatSceneInput, NarrativeBeatV1} from '../hsl/cinematic/types/cinematicPlans';
import {CinematicValidationError} from '../hsl/cinematic/validators/cinematicValidationError';
import {validateNarrativeBeats} from '../hsl/cinematic/validators/narrativeBeatValidator';

const SCRIPT = "Fuel does not move directly from a refinery to an aircraft. It first enters a regional distribution network, reaches airport storage, passes through quality control, and only then moves toward the gate.";
const SCENE_ID = 'HSL_018';
const CLAIM_ID = 'C007';
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

function input(aligned = true): NarrativeBeatSceneInput {
  const words = tokenizeScriptWords(SCRIPT);
  return {
    productionId: 'PROD_BEATS',
    episodeId: 'HSL_EP_001',
    sceneId: SCENE_ID,
    claimId: CLAIM_ID,
    existingClaimIds: new Set([CLAIM_ID]),
    narrativeFunction: 'explain_mechanism',
    chapterId: 'CH_02',
    approvedScriptText: SCRIPT,
    narrationAlignment: aligned
      ? words.map((word, index) => ({word: word.text, start_ms: index * 120, end_ms: index * 120 + 100}))
      : undefined
  };
}

function packageFixture(options: {withScript?: boolean; withAlignment?: boolean} = {}): {root: string; packagePath: string} {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hsl-narrative-beats-'));
  tempRoots.push(root);
  const packagePath = path.join(root, 'episode-package.json');
  const words = tokenizeScriptWords(SCRIPT);
  const withAlignment = options.withAlignment !== false;
  fs.writeFileSync(packagePath, JSON.stringify({
    episode_id: 'HSL_EP_001',
    human_approval_status: 'APPROVED',
    claim_registry: [{claim_id: CLAIM_ID}],
    scenes: [{
      scene_id: SCENE_ID,
      claim_id: CLAIM_ID,
      narrative_function: 'explain_mechanism',
      visual_mode: 'remotion_flow_trace',
      visual_subject: 'airport fuel distribution network',
      review_status: 'APPROVED',
      ...(options.withScript === false ? {} : {voiceover: SCRIPT}),
      ...(withAlignment ? {
        narration_alignment: words.map((word, index) => ({
          word: word.text,
          start_ms: 1000 + index * 120,
          end_ms: 1100 + index * 120
        }))
      } : {})
    }]
  }, null, 2));
  return {root, packagePath};
}

function digest(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function generate(aligned = true) {
  const telemetry = new CapturingTelemetry();
  const result = new NarrativeBeatDirectorAgent(telemetry).run(input(aligned));
  return {result, telemetry};
}

test('1. approved script remains byte-for-byte unchanged', async () => {
  const {packagePath} = packageFixture();
  const before = digest(packagePath);
  await new CinematicDirectionShadowRunner(new CapturingTelemetry()).run({
    productionId: 'PROD_SCRIPT_IMMUTABLE',
    editorialPackagePath: packagePath
  });
  assert.equal(digest(packagePath), before);
});

test('2. beats cover 100 percent of scene script', () => {
  const {result, telemetry} = generate();
  assert.equal(result.metrics.coveragePercent, 100);
  assert.equal(result.beats[0].script_span.start_word, 0);
  assert.equal(result.beats.at(-1)?.script_span.end_word, tokenizeScriptWords(SCRIPT).length);
  assert.equal(telemetry.events.find((event) => event.name === 'cinematic.beats.generated')?.data.metrics?.coveragePercent, 100);
});

test('3. beat spans preserve script order without overlap', () => {
  const {result} = generate();
  result.beats.forEach((beat, index) => {
    assert.equal(beat.beat_id, `${SCENE_ID}_B${String(index + 1).padStart(3, '0')}`);
    if (index > 0) assert.equal(beat.script_span.start_word, result.beats[index - 1].script_span.end_word);
  });
});

test('4. validator rejects invented or rewritten beat text', () => {
  const {result} = generate();
  const invalid = result.beats.map((beat, index) => index === 0 ? {...beat, transcript_span: 'Rewritten text.'} : beat);
  assert.throws(
    () => validateNarrativeBeats(invalid, {
      sceneId: SCENE_ID,
      approvedScriptText: SCRIPT,
      existingClaimIds: new Set([CLAIM_ID])
    }),
    (error: unknown) => error instanceof CinematicValidationError && error.code === 'CINEMATIC_BEAT_TEXT_MISMATCH'
  );
});

test('5. beat claim_id must already exist', () => {
  const {result} = generate();
  const invalid = result.beats.map((beat, index) => index === 0 ? {...beat, claim_id: 'C999'} : beat) as NarrativeBeatV1[];
  assert.throws(
    () => validateNarrativeBeats(invalid, {
      sceneId: SCENE_ID,
      approvedScriptText: SCRIPT,
      existingClaimIds: new Set([CLAIM_ID])
    }),
    (error: unknown) => error instanceof CinematicValidationError && error.code === 'CINEMATIC_BEAT_CLAIM_INVALID'
  );
});

test('6. every beat keeps the existing scene_id', () => {
  const {result} = generate();
  assert.equal(result.beats.every((beat) => beat.scene_id === SCENE_ID), true);
});

test('7. missing alignment throws BEAT_ALIGNMENT_MISSING (fail-closed)', () => {
  const telemetry = new CapturingTelemetry();
  assert.throws(
    () => new NarrativeBeatDirectorAgent(telemetry).run(input(false)),
    /BEAT_ALIGNMENT_MISSING/
  );
});

test('8. real word alignment produces bounded exact timestamps', () => {
  const alignedInput = input(true);
  const {beats} = new NarrativeBeatDirectorAgent(new CapturingTelemetry()).run(alignedInput);
  const alignment = alignedInput.narrationAlignment!;
  for (const beat of beats) {
    assert.equal(beat.timing.source, 'tts_word_timestamps');
    if (beat.timing.source === 'tts_word_timestamps') {
      assert.equal(beat.timing.start_ms, alignment[beat.script_span.start_word].start_ms);
      assert.equal(beat.timing.end_ms, alignment[beat.script_span.end_word - 1].end_ms);
      assert.ok(beat.timing.start_ms >= alignment[0].start_ms);
      assert.ok(beat.timing.end_ms <= alignment.at(-1)!.end_ms);
    }
  }
});

test('9. repeated execution is deterministic', () => {
  const first = generate().result;
  const second = generate().result;
  assert.deepEqual(second, first);
});

test('10. agent failure remains non-blocking through the shadow hook', async () => {
  const {packagePath} = packageFixture({withScript: false});
  const before = digest(packagePath);
  const result = await runCinematicDirectionShadowHook({
    productionId: 'PROD_BEAT_FAILURE',
    editorialPackagePath: packagePath,
    flags: {pipelineV1Enabled: false, shadowModeEnabled: true, shouldRunShadow: true},
    runner: new CinematicDirectionShadowRunner(new CapturingTelemetry())
  });
  assert.equal(result.executed, true);
  assert.equal(result.success, false);
  assert.match(result.error || '', /CINEMATIC_APPROVED_SCRIPT_REQUIRED/);
  assert.equal(digest(packagePath), before);
});

test('11. beat agent output remains semantic-only and has no executor fields', () => {
  const {result} = generate();
  assert.deepEqual(Object.keys(result).sort(), ['beats', 'metrics', 'narrativeIntent']);
  assert.equal('camera' in result, false);
  assert.equal('shot' in result, false);
  assert.equal('transition' in result, false);
  assert.equal('prompt' in result, false);
});

test('12. invalid output is never atomically promoted', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hsl-invalid-beat-output-'));
  tempRoots.push(root);
  const target = path.join(root, 'HSL_018.cinematic.json');
  const store = new CinematicArtifactStore();
  assert.throws(
    () => store.writeJsonAtomic(target, {invalid: true}, () => {
      throw new CinematicValidationError('CINEMATIC_SCHEMA_INVALID', 'forced invalid beat output');
    }),
    /CINEMATIC_SCHEMA_INVALID/
  );
  assert.equal(fs.existsSync(target), false);
  assert.deepEqual(fs.readdirSync(root), []);
});

test('13. invalid alignment emits beat validation failure telemetry', () => {
  const telemetry = new CapturingTelemetry();
  const invalidInput = {
    ...input(true),
    narrationAlignment: input(true).narrationAlignment!.slice(0, -1)
  };
  assert.throws(
    () => new NarrativeBeatDirectorAgent(telemetry).run(invalidInput),
    /(?:CINEMATIC_BEAT_TIMING_INVALID|BEAT_ALIGNMENT_MISSING)/
  );
  assert.deepEqual(
    telemetry.events.map((event) => event.name),
    ['cinematic.beats.started', 'cinematic.beats.validation_failed', 'cinematic.beats.failed']
  );
});
