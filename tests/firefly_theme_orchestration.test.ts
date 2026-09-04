import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {spawnSync} from 'child_process';
import {materializeFireflyDispatchPackage} from '../pipeline/fireflyDispatchPackage';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hsl-firefly-theme-'));
try {
  const sourceFrame = path.join(tempRoot, 'source.png');
  const frameResult = spawnSync('ffmpeg', [
    '-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=1280x720:r=1',
    '-frames:v', '1', sourceFrame
  ]);
  assert.equal(frameResult.status, 0, String(frameResult.stderr));

  const result = materializeFireflyDispatchPackage({
    runDirectory: path.join(tempRoot, 'run'),
    scenes: [{sceneId: 'SC_001', prompt: 'physical agricultural drone in a real field', startFramePath: sourceFrame}]
  });
  const guide = JSON.parse(fs.readFileSync(result.guidePath, 'utf8'));
  assert.equal(guide.model, 'Kling 2.5 Turbo');
  assert.equal(guide.resolution, '1080p');
  assert.equal(guide.aspect_ratio, '16:9');
  assert.equal(guide.fps, 24);
  assert.equal(guide.duration_seconds, 5);
  assert.equal(guide.items[0].model, 'Kling 2.5 Turbo');
  assert.equal(guide.items[0].fps, 24);
  assert.equal(guide.items[0].duration_seconds, 5);
  assert.equal(guide.items[0].generate_audio, false);
  assert.equal(guide.items[0].image, 'SC_001.png');
  assert.equal(guide.use_first_frame, true);
  assert.equal(guide.items[0].use_first_frame, true);
  assert.equal(guide.items[0].input_mode, 'image_to_video');
  assert.ok(fs.existsSync(path.join(path.dirname(result.guidePath), 'imagens', 'SC_001.png')));

  const hybridSource = fs.readFileSync(path.join(process.cwd(), 'pipeline', 'hybridVideoEngine.ts'), 'utf8');
  assert.ok(!hybridSource.includes("model: 'Kling 3.0'"));
  assert.ok(!hybridSource.includes('FALLBACK_REMOTION_PARALLAX'));
  assert.ok(hybridSource.includes('FIREFLY_REQUIRED_GENERATION_FAILED'));
  assert.ok(hybridSource.includes("path.join(runDirectory, 'firefly-runtime')"));

  const masterSource = fs.readFileSync(
    path.join(process.cwd(), 'orchestrator', 'masterDocumentaryOrchestrator.ts'),
    'utf8'
  );
  assert.ok(!masterSource.includes("model: 'Kling 3.0'"));
  assert.ok(!masterSource.includes("'-loop', '1'"));
  assert.ok(!masterSource.includes('FALLBACK_REMOTION_PARALLAX'));
  assert.ok(masterSource.includes('materializeFireflyDispatchPackage'));

  const pilotSource = fs.readFileSync(
    path.join(process.cwd(), 'production', 'productionPilotRunner.ts'),
    'utf8'
  );
  assert.ok(!pilotSource.includes('DELETE FROM jobs'));
  assert.ok(!pilotSource.includes("model: 'Kling 3.0'"));
  assert.ok(pilotSource.includes('FIREFLY_CHROME_PROFILE_DIR'));

  const runtimeSource = fs.readFileSync(
    path.join(process.cwd(), 'production', 'hslFireflyGenerationRuntime.ts'),
    'utf8'
  );
  assert.ok(!runtimeSource.includes('FALLBACK_REMOTION_PARALLAX'));
  assert.ok(runtimeSource.includes('profile.model'));
  assert.ok(runtimeSource.includes('profile.duration_seconds'));

  const startFrameRuntimeSource = fs.readFileSync(
    path.join(process.cwd(), 'hsl', 'startframe', 'startFrameRuntime.ts'),
    'utf8'
  );
  assert.ok(!startFrameRuntimeSource.includes("requested_model: isVeo ? 'Veo 3.1 Fast' : 'Kling 3.0'"));
  assert.ok(startFrameRuntimeSource.includes("requested_model: isVeo ? 'Veo 3.1 Fast' : FIREFLY_GENERATION_PROFILE.model"));
  assert.ok(startFrameRuntimeSource.includes("status: isVeo ? 'GENERATION_PACKAGE_READY_FOR_VEO' : 'GENERATION_PACKAGE_READY_FOR_FIREFLY'"));

  const bridgeSource = fs.readFileSync(
    path.join(process.cwd(), 'production-bridge', 'motionToFirefly.ts'),
    'utf8'
  );
  assert.ok(bridgeSource.includes('adaptFireflyVideoPrompt'));
  assert.ok(!bridgeSource.includes("model: isVeo ? 'Veo 3.1 Fast' : 'Kling 3.0'"));

  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts['produce:episode'], 'ts-node scripts/produceEpisode.ts');
  assert.equal(packageJson.scripts['firefly:dispatch'], 'ts-node scripts/dispatchFireflyGuide.ts');

  console.log('firefly_theme_orchestration.test.ts: PASS');
} finally {
  fs.rmSync(tempRoot, {recursive: true, force: true});
}
