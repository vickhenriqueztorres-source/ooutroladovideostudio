import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {spawnSync} from 'child_process';
import {FIREFLY_GENERATION_PROFILE as profile} from '../config/fireflyGenerationConfig';

export interface FireflyDispatchScene {
  sceneId: string;
  prompt: string;
  startFramePath?: string;
}

export interface FireflyDispatchPackage {
  guidePath: string;
  imagesDirectory: string;
  jobNames: string[];
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function validateStartFrame(filePath: string, sceneId: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`FIREFLY_START_FRAME_MISSING:${sceneId}:${filePath}`);
  }
  const bytes = fs.readFileSync(filePath);
  if (bytes.length < 10 * 1024 || !bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    throw new Error(`FIREFLY_START_FRAME_INVALID_PNG:${sceneId}:${filePath}`);
  }
  const probe = spawnSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'json', filePath
  ], {encoding: 'utf8'});
  if (probe.status !== 0) {
    throw new Error(`FIREFLY_START_FRAME_FFPROBE_FAILED:${sceneId}:${probe.stderr || probe.stdout}`);
  }
  const parsed = JSON.parse(probe.stdout) as {streams?: Array<{width?: number; height?: number}>};
  const width = Number(parsed.streams?.[0]?.width || 0);
  const height = Number(parsed.streams?.[0]?.height || 0);
  if (width < 1280 || height < 720 || Math.abs(width / height - 16 / 9) > 0.012) {
    throw new Error(`FIREFLY_START_FRAME_DIMENSIONS_INVALID:${sceneId}:${width}x${height}`);
  }
}

export function materializeFireflyDispatchPackage(input: {
  runDirectory: string;
  scenes: FireflyDispatchScene[];
}): FireflyDispatchPackage {
  if (!input.scenes.length) throw new Error('FIREFLY_DISPATCH_SCENES_EMPTY');

  const fireflyRoot = path.join(path.resolve(input.runDirectory), 'firefly');
  const imagesDirectory = path.join(fireflyRoot, 'imagens');
  fs.mkdirSync(imagesDirectory, {recursive: true});

  const seen = new Set<string>();
  const attachStartFrames = profile.requires_first_frame;
  const items = input.scenes.map((scene) => {
    if (!scene.sceneId || seen.has(scene.sceneId)) {
      throw new Error(`FIREFLY_DISPATCH_SCENE_ID_INVALID:${scene.sceneId || 'EMPTY'}`);
    }
    seen.add(scene.sceneId);
    if (!scene.prompt.trim()) throw new Error(`FIREFLY_PROMPT_EMPTY:${scene.sceneId}`);
    let imageName: string | undefined;
    let sourceStartFrameSha256: string | undefined;
    if (attachStartFrames) {
      if (!scene.startFramePath) throw new Error(`FIREFLY_START_FRAME_MISSING:${scene.sceneId}`);
      validateStartFrame(scene.startFramePath, scene.sceneId);
      imageName = `${scene.sceneId}.png`;
      const imagePath = path.join(imagesDirectory, imageName);
      fs.copyFileSync(scene.startFramePath, imagePath);
      sourceStartFrameSha256 = sha256(scene.startFramePath);
    }

    return {
      name: scene.sceneId,
      image: imageName,
      use_first_frame: attachStartFrames,
      input_mode: attachStartFrames
        ? 'image_to_video'
        : 'text_to_video',
      prompt: scene.prompt,
      model: profile.model,
      resolution: profile.resolution,
      aspect_ratio: profile.aspect_ratio,
      fps: profile.fps,
      duration_seconds: profile.duration_seconds,
      generate_audio: profile.generate_audio,
      source_start_frame_sha256: sourceStartFrameSha256
    };
  });

  const guidePath = path.join(fireflyRoot, 'firefly-production-guide.json');
  const guide = {
    schema: 'ool.firefly.production-guide.v3',
    model: profile.model,
    resolution: profile.resolution,
    aspect_ratio: profile.aspect_ratio,
    fps: profile.fps,
    duration_seconds: profile.duration_seconds,
    generate_audio: profile.generate_audio,
    use_first_frame: attachStartFrames,
    items
  };
  const tempPath = `${guidePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(guide, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, guidePath);

  return {guidePath, imagesDirectory, jobNames: items.map((item) => item.name)};
}
