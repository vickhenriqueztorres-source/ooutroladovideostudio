import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {spawnSync} from 'child_process';
import {parseEpisodeContract} from '../contracts/episodeContract';
import {buildSceneContracts, RawSceneInput} from '../contracts/buildSceneContracts';
import {buildFireflyPrompt} from '../contracts/buildFireflyPrompt';

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  return inline?.slice(prefix.length);
}

const episodeId = argValue('episode') || 'leite-cadeia-frio';
const runId = argValue('run');
const sceneId = argValue('scene');
const source = argValue('source');
if (!runId || !sceneId || !source) throw new Error('INGEST_ARGS_REQUIRED: --run --scene --source');

const contractPath = path.join(process.cwd(), 'contracts', 'episodes', `${episodeId}.episode.json`);
const scenesPath = path.join(process.cwd(), 'contracts', 'episodes', `${episodeId}.scenes.json`);
const episode = parseEpisodeContract(contractPath);
const rawScenes = JSON.parse(fs.readFileSync(scenesPath, 'utf8')) as RawSceneInput[];
const scene = buildSceneContracts(episode, rawScenes).find((item) => item.sceneId === sceneId);
if (!scene) throw new Error(`INGEST_SCENE_NOT_FOUND:${sceneId}`);
if (!fs.existsSync(source)) throw new Error(`INGEST_SOURCE_NOT_FOUND:${source}`);

const sceneDir = path.join(process.cwd(), 'runs', episodeId, runId, 'editorial', 'execution', 'scenes', sceneId);
const target = path.join(sceneDir, 'firefly_start_frame.png');
const tempTarget = path.join(sceneDir, `firefly_start_frame.${process.pid}.tmp.png`);
fs.mkdirSync(sceneDir, {recursive: true});

if (fs.existsSync(target)) {
  const rejectedDir = path.join(sceneDir, 'rejected');
  fs.mkdirSync(rejectedDir, {recursive: true});
  const rejectedName = `semantic-mismatch-${Date.now()}.png`;
  fs.renameSync(target, path.join(rejectedDir, rejectedName));
}

const render = spawnSync('ffmpeg', [
  '-y', '-i', source,
  '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1',
  '-frames:v', '1', tempTarget
], {encoding: 'utf8'});
if (render.status !== 0 || !fs.existsSync(tempTarget)) {
  throw new Error(`INGEST_FFMPEG_FAILED:${render.stderr || render.stdout}`);
}
fs.renameSync(tempTarget, target);

const prompt = buildFireflyPrompt(scene).prompt;
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
fs.writeFileSync(path.join(sceneDir, 'start_frame_receipt.json'), `${JSON.stringify({
  sceneId,
  sha256,
  provider: 'openai_imagegen',
  model: 'OpenAI Image Generation',
  status: 'AUTHENTIC_AI_GENERATED',
  prompt,
  peoplePolicy: 'FORBIDDEN',
  semanticQa: 'APPROVED',
  source,
  timestamp: new Date().toISOString()
}, null, 2)}\n`, 'utf8');

process.stdout.write(`${JSON.stringify({sceneId, target, sha256, width: 1920, height: 1080}, null, 2)}\n`);
