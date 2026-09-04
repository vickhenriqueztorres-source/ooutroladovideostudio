import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {PipelineContractGate} from '../pipeline/pipelineContractGate';

interface MilkScene {
  sceneId: string;
  chapterTitle: string;
  visual_asset_class: string;
}

const EPISODE_ID = 'leite-cadeia-frio';
const RUN_ID = process.argv.find((arg) => arg.startsWith('--runId='))?.split('=')[1]
  || 'LEITE-VISUALS-20260901';
const FORCE = process.argv.includes('--force');

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function modeFor(sceneId: string): 'FLOW' | 'THERMAL' | 'ROUTE' | 'SEAL' | 'EVIDENCE' {
  if (['LEITE_001', 'LEITE_005', 'LEITE_010', 'LEITE_017', 'LEITE_029'].includes(sceneId)) return 'FLOW';
  if (['LEITE_013', 'LEITE_032', 'LEITE_044', 'LEITE_047'].includes(sceneId)) return 'THERMAL';
  if (['LEITE_020', 'LEITE_026', 'LEITE_041'].includes(sceneId)) return 'ROUTE';
  if (['LEITE_035', 'LEITE_038', 'LEITE_049'].includes(sceneId)) return 'SEAL';
  return 'EVIDENCE';
}

async function main(): Promise<void> {
  const root = process.cwd();
  const runDir = path.join(root, 'runs', EPISODE_ID, RUN_ID);
  const publicRunDir = path.join(root, 'public', 'editorial', 'execution', RUN_ID, 'scenes');
  const scenesPath = path.join(root, 'contracts', 'episodes', `${EPISODE_ID}.scenes.json`);
  const scenes = (JSON.parse(fs.readFileSync(scenesPath, 'utf8')) as MilkScene[])
    .filter((scene) => scene.visual_asset_class === 'VIDEO');
  const receipts: unknown[] = [];
  const isolatedPublic = path.join(runDir, '.procedural-public');
  if (!path.resolve(isolatedPublic).startsWith(path.resolve(runDir))) {
    throw new Error(`PROCEDURAL_PUBLIC_OUTSIDE_RUN:${isolatedPublic}`);
  }
  fs.rmSync(isolatedPublic, {recursive: true, force: true});
  for (const scene of scenes) {
    const source = path.join(runDir, 'editorial', 'execution', 'scenes', scene.sceneId, 'firefly_start_frame.png');
    if (!fs.existsSync(source)) throw new Error(`PROCEDURAL_START_FRAME_MISSING:${scene.sceneId}`);
    const target = path.join(isolatedPublic, 'editorial', 'execution', RUN_ID, 'scenes', scene.sceneId, 'firefly_start_frame.png');
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.copyFileSync(source, target);
  }

  process.stdout.write('Preparing one isolated Remotion bundle for all procedural takes\n');
  const bundleDir = path.join(runDir, '.procedural-bundle');
  if (!path.resolve(bundleDir).startsWith(path.resolve(runDir))) {
    throw new Error(`PROCEDURAL_BUNDLE_OUTSIDE_RUN:${bundleDir}`);
  }
  fs.rmSync(bundleDir, {recursive: true, force: true});
  const serveUrl = await bundle({
    entryPoint: path.join(root, 'remotion', 'milkProceduralIndex.ts'),
    publicDir: isolatedPublic,
    outDir: bundleDir,
    rootDir: root,
    onProgress: (progress) => {
      const percent = Math.round(progress);
      if (percent % 20 === 0) process.stdout.write(`Bundle ${percent}%\n`);
    },
  });

  for (const [index, scene] of scenes.entries()) {
    const sceneDir = path.join(runDir, 'editorial', 'execution', 'scenes', scene.sceneId);
    const publicSceneDir = path.join(publicRunDir, scene.sceneId);
    const input = path.join(sceneDir, 'firefly_start_frame.png');
    const output = path.join(sceneDir, 'procedural_take.mp4');
    const receiptPath = path.join(sceneDir, 'procedural_take_receipt.json');
    if (!fs.existsSync(input)) throw new Error(`PROCEDURAL_START_FRAME_MISSING:${scene.sceneId}`);
    fs.mkdirSync(publicSceneDir, {recursive: true});
    const publicInput = path.join(publicSceneDir, 'firefly_start_frame.png');
    fs.copyFileSync(input, publicInput);

    if (!FORCE && fs.existsSync(output) && fs.existsSync(receiptPath)) {
      const existingProbe = PipelineContractGate.probeMedia(output);
      if (existingProbe.valid && existingProbe.width === 1920 && existingProbe.height === 1080
        && Math.abs(existingProbe.duration - 5) <= 0.15) {
        const existingReceipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8')) as unknown;
        receipts.push(existingReceipt);
        process.stdout.write(`[${index + 1}/${scenes.length}] Resume valid ${scene.sceneId}\n`);
        continue;
      }
    }

    const propsDir = path.join(runDir, 'procedural-props');
    fs.mkdirSync(propsDir, {recursive: true});
    const propsPath = path.join(propsDir, `${scene.sceneId}.json`);
    const imageSrc = path.posix.join('editorial', 'execution', RUN_ID, 'scenes', scene.sceneId, 'firefly_start_frame.png');
    const inputProps = {
      imageSrc,
      sceneId: scene.sceneId,
      chapterTitle: scene.chapterTitle,
      mode: modeFor(scene.sceneId),
    };
    fs.writeFileSync(propsPath, `${JSON.stringify(inputProps, null, 2)}\n`, 'utf8');

    process.stdout.write(`[${index + 1}/${scenes.length}] Render procedural ${scene.sceneId}\n`);
    const composition = await selectComposition({
      serveUrl,
      id: 'MilkProceduralTake',
      inputProps,
      logLevel: 'warn',
    });
    await renderMedia({
      serveUrl,
      composition,
      codec: 'h264',
      outputLocation: output,
      inputProps,
      crf: 18,
      pixelFormat: 'yuv420p',
      concurrency: 4,
      overwrite: true,
      logLevel: 'warn',
      onProgress: ({progress}) => {
        const percent = Math.round(progress * 100);
        if (percent === 25 || percent === 50 || percent === 75 || percent === 100) {
          process.stdout.write(`  ${scene.sceneId} ${percent}%\n`);
        }
      },
    });

    const probe = PipelineContractGate.probeMedia(output);
    if (!probe.valid || probe.width !== 1920 || probe.height !== 1080 || Math.abs(probe.duration - 5) > 0.15) {
      throw new Error(`PROCEDURAL_MEDIA_INVALID:${scene.sceneId}:${JSON.stringify(probe)}`);
    }
    const publicOutput = path.join(publicSceneDir, 'procedural_take.mp4');
    fs.copyFileSync(output, publicOutput);
    const receipt = {
      schema: 'ool.procedural-motion-take.v1',
      sceneId: scene.sceneId,
      provider: 'remotion',
      compositor: 'MilkProceduralTake',
      fireflyUsed: false,
      visualAssetClass: 'MOTION_IMAGE',
      takeOrigin: 'procedural_motion_image',
      sourceFrame: input,
      sourceSha256: sha256(input),
      output,
      outputSha256: sha256(output),
      width: probe.width,
      height: probe.height,
      fps: 24,
      durationSeconds: probe.duration,
      peoplePolicy: 'FORBIDDEN',
      generatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(sceneDir, 'procedural_take_receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(publicSceneDir, 'procedural_take_receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    receipts.push(receipt);
  }

  const checkpointDir = path.join(runDir, 'checkpoints');
  fs.mkdirSync(checkpointDir, {recursive: true});
  fs.writeFileSync(path.join(checkpointDir, 'procedural_visuals.json'), `${JSON.stringify({
    stage: 'procedural_visuals',
    fireflyUsed: false,
    totalTakes: receipts.length,
    status: 'COMPLETED',
    generatedAt: new Date().toISOString(),
    receipts,
  }, null, 2)}\n`, 'utf8');
  process.stdout.write(`PROCEDURAL_TAKES_DONE:${receipts.length}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});
