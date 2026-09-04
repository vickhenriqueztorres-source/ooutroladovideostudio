import fs from 'fs';
import path from 'path';
import {spawnSync} from 'child_process';
import {getFireflyPythonExec, resolveFireflyRoot} from '../config/fireflySessionLive';
import {PipelineContractGate} from '../pipeline/pipelineContractGate';
import {FIREFLY_GENERATION_PROFILE as profile} from '../config/fireflyGenerationConfig';

function main(): void {
  const fireflyRoot = resolveFireflyRoot();
  const python = getFireflyPythonExec(fireflyRoot);
  if (!python) throw new Error(`FIREFLY_VENV_NOT_FOUND:${fireflyRoot}`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(process.cwd(), 'runs', 'firefly-canary', stamp);
  fs.mkdirSync(outputDir, {recursive: true});
  const resultPath = path.join(outputDir, 'canary_result.json');
  const jobId = -Math.floor(Date.now() / 1000);
  const jobName = `FIREFLY_CANARY_${stamp.replace(/[^A-Za-z0-9_-]/g, '_')}`;
  const canaryImageInput = process.env.FIREFLY_CANARY_IMAGE?.trim();
  if (profile.requires_first_frame && !canaryImageInput) {
    throw new Error('FIREFLY_CANARY_IMAGE_REQUIRED: Kling 2.5 Turbo exige FIREFLY_CANARY_IMAGE apontando para um PNG/JPG 16:9 aprovado.');
  }
  if (process.env.HSL_ALLOW_PAID_FIREFLY_DISPATCH !== 'true') {
    throw new Error('FIREFLY_CANARY_REQUIRES_EXPLICIT_PAID_AUTH: defina HSL_ALLOW_PAID_FIREFLY_DISPATCH=true apenas quando houver autorizacao humana explicita para gastar creditos.');
  }
  const canaryImagePath = canaryImageInput ? path.resolve(canaryImageInput) : '';
  if (profile.requires_first_frame && (!canaryImagePath || !fs.existsSync(canaryImagePath))) {
    throw new Error(`FIREFLY_CANARY_IMAGE_NOT_FOUND:${canaryImagePath || 'EMPTY'}`);
  }

  const args = [
    '-m', 'firefly_bot.model_canary',
    '--root', fireflyRoot,
    '--model', profile.model,
    '--duration', String(profile.duration_seconds),
    '--resolution', profile.resolution,
    '--aspect-ratio', profile.aspect_ratio,
    '--job-id', String(jobId),
    '--name', jobName,
    '--output', resultPath
  ];
  if (canaryImagePath) args.push('--image', canaryImagePath);

  const run = spawnSync(python, args, {
    cwd: fireflyRoot,
    stdio: 'inherit',
    timeout: 30 * 60 * 1000,
    env: {
      ...process.env,
      FIREFLY_ALLOW_CREDIT_SPEND: 'true',
      FIREFLY_ALLOW_TEXT_TO_VIDEO: profile.requires_first_frame ? 'false' : 'true',
      PYTHONUNBUFFERED: '1'
    }
  });
  if (run.status !== 0 || !fs.existsSync(resultPath)) {
    throw new Error(`FIREFLY_CANARY_FAILED:exit=${run.status ?? 'TIMEOUT'}`);
  }

  const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  const videoPath = String(result?.job?.output_path || '');
  const probe = PipelineContractGate.probeMedia(videoPath);
  if (result?.job?.status !== 'done' || !probe.valid || probe.duration < 4.5) {
    throw new Error(`FIREFLY_CANARY_INVALID_OUTPUT:${videoPath}`);
  }
  fs.writeFileSync(path.join(outputDir, 'validated_result.json'), JSON.stringify({
    status: 'PASS',
    model: profile.model,
    resolution: profile.resolution,
    aspectRatio: profile.aspect_ratio,
    fps: profile.fps,
    durationRequested: profile.duration_seconds,
    videoPath,
    probe,
    validatedAt: new Date().toISOString()
  }, null, 2), 'utf8');
  console.log(JSON.stringify({status: 'PASS', videoPath, probe, resultPath}, null, 2));
}

try {
  main();
} catch (error: any) {
  console.error(error.message);
  process.exit(1);
}
