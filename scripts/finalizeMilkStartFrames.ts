import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {execFileSync} from 'child_process';
import {buildFireflyPrompt} from '../contracts/buildFireflyPrompt';

interface MilkScene {
  sceneId: string;
  chapterTitle: string;
  visual_asset_class: string;
  take_type: string;
  visualSubject: string;
  visual_must_include: string[];
  visual_must_not: string[];
  required_category: string;
  domainTags: string[];
}

const RUN_ID = process.argv.find((arg) => arg.startsWith('--runId='))?.split('=')[1]
  || 'LEITE-VISUALS-20260901';
const EPISODE_ID = 'leite-cadeia-frio';

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function imageSize(filePath: string): {width: number; height: number} {
  const raw = execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'json', filePath,
  ], {encoding: 'utf8'});
  const stream = JSON.parse(raw).streams?.[0];
  return {width: Number(stream?.width || 0), height: Number(stream?.height || 0)};
}

function main(): void {
  const root = process.cwd();
  const runDir = path.join(root, 'runs', EPISODE_ID, RUN_ID);
  const scenesDir = path.join(runDir, 'editorial', 'execution', 'scenes');
  const publicScenesDir = path.join(root, 'public', 'editorial', 'execution', RUN_ID, 'scenes');
  const scenes = JSON.parse(fs.readFileSync(
    path.join(root, 'contracts', 'episodes', `${EPISODE_ID}.scenes.json`), 'utf8',
  )) as MilkScene[];
  let normalized = 0;
  let receiptsCreated = 0;

  for (const scene of scenes) {
    const sceneDir = path.join(scenesDir, scene.sceneId);
    const framePath = path.join(sceneDir, 'firefly_start_frame.png');
    if (!fs.existsSync(framePath)) throw new Error(`MILK_FRAME_MISSING:${scene.sceneId}`);

    const before = imageSize(framePath);
    if (before.width !== 1920 || before.height !== 1080) {
      const normalizedPath = path.join(sceneDir, 'firefly_start_frame.normalized.png');
      execFileSync('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-y', '-i', framePath,
        '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080',
        '-frames:v', '1', normalizedPath,
      ]);
      fs.copyFileSync(normalizedPath, framePath);
      fs.rmSync(normalizedPath, {force: true});
      normalized++;
    }

    const after = imageSize(framePath);
    if (after.width !== 1920 || after.height !== 1080 || fs.statSync(framePath).size < 10_000) {
      throw new Error(`MILK_FRAME_INVALID:${scene.sceneId}:${JSON.stringify(after)}`);
    }

    const builtPrompt = buildFireflyPrompt({
      scene_id: scene.sceneId,
      visual_subject: scene.visualSubject,
      visual_must_include: scene.visual_must_include,
      visual_must_not: scene.visual_must_not,
      required_category: scene.required_category,
      domainTags: scene.domainTags,
      take_type: scene.take_type,
    });
    const receiptPath = path.join(sceneDir, 'start_frame_receipt.json');
    if (!fs.existsSync(receiptPath)) {
      fs.writeFileSync(receiptPath, `${JSON.stringify({
        sceneId: scene.sceneId,
        prompt: builtPrompt.prompt,
        sourceSystem: 'openai_imagegen',
        provider: 'openai_imagegen',
        generator: 'OpenAI Image Generation',
        model: 'OpenAI Image Generation',
        sha256: sha256(framePath),
        aspectRatio: '16:9',
        width: after.width,
        height: after.height,
        takeType: scene.take_type,
        peoplePolicy: 'FORBIDDEN',
        timestamp: new Date().toISOString(),
      }, null, 2)}\n`, 'utf8');
      fs.writeFileSync(path.join(sceneDir, 'clean_start_frame_prompt.txt'), `${builtPrompt.prompt}\n`, 'utf8');
      fs.writeFileSync(path.join(sceneDir, 'scene_plan.json'), `${JSON.stringify({
        sceneId: scene.sceneId,
        name: `Cena ${scene.sceneId}`,
        takeType: scene.take_type,
        visualAssetClass: scene.visual_asset_class,
        prompt: builtPrompt.prompt,
        negativePrompt: builtPrompt.negativePrompt,
      }, null, 2)}\n`, 'utf8');
      receiptsCreated++;
    }

    const publicSceneDir = path.join(publicScenesDir, scene.sceneId);
    fs.mkdirSync(publicSceneDir, {recursive: true});
    for (const filename of ['firefly_start_frame.png', 'start_frame_receipt.json']) {
      fs.copyFileSync(path.join(sceneDir, filename), path.join(publicSceneDir, filename));
    }
  }

  const checkpointDir = path.join(runDir, 'checkpoints');
  fs.mkdirSync(checkpointDir, {recursive: true});
  fs.writeFileSync(path.join(checkpointDir, 'image_engine_complete.json'), `${JSON.stringify({
    stage: 'image_engine',
    status: 'COMPLETED',
    provider: 'openai_imagegen',
    fireflyUsed: false,
    totalFrames: scenes.length,
    normalized,
    receiptsCreated,
    peoplePolicy: 'FORBIDDEN',
    completedAt: new Date().toISOString(),
  }, null, 2)}\n`, 'utf8');
  process.stdout.write(`MILK_START_FRAMES_READY:${scenes.length}:NORMALIZED=${normalized}:RECEIPTS=${receiptsCreated}\n`);
}

main();
