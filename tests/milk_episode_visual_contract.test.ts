import fs from 'fs';
import path from 'path';
import {parseEpisodeContract} from '../contracts/episodeContract';
import {buildSceneContracts, RawSceneInput} from '../contracts/buildSceneContracts';
import {validateCanonBalance} from '../pipeline/canonBalanceCheck';
import {FIREFLY_GENERATION_PROFILE} from '../config/fireflyGenerationConfig';

const root = process.cwd();
const episodePath = path.join(root, 'contracts', 'episodes', 'leite-cadeia-frio.episode.json');
const scenesPath = path.join(root, 'contracts', 'episodes', 'leite-cadeia-frio.scenes.json');
const episode = parseEpisodeContract(episodePath);
const rawScenes = JSON.parse(fs.readFileSync(scenesPath, 'utf8')) as RawSceneInput[];
const scenes = buildSceneContracts(episode, rawScenes);

if (scenes.length !== 50) throw new Error(`MILK_SCENES_INVALID:${scenes.length}`);
if (new Set(scenes.map((scene) => scene.chapterId)).size !== 6) throw new Error('MILK_CHAPTERS_INVALID');

const counts = scenes.reduce<Record<string, number>>((acc, scene) => {
  const key = scene.visual_asset_class || 'UNSET';
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});
const expected = {REALISTIC_IMAGE: 20, VIDEO: 15, MOTION_GRAPHICS: 8, MOTION_IMAGE: 7};
for (const [key, value] of Object.entries(expected)) {
  if (counts[key] !== value) throw new Error(`MILK_MIX_INVALID:${key}:${counts[key]}`);
}

const noPeopleTerms = ['person', 'people', 'human', 'worker', 'operator', 'hands', 'face', 'body', 'human silhouette'];
for (const scene of scenes) {
  for (const term of noPeopleTerms) {
    if (!scene.visual_must_not.includes(term)) throw new Error(`MILK_NO_PEOPLE_POLICY_MISSING:${scene.sceneId}:${term}`);
  }
  if (scene.visual_asset_class === 'VIDEO') {
    if (scene.take_type !== 'CINEMATIC_TAKE' || !scene.allowed_sources.includes('firefly')) {
      throw new Error(`MILK_VIDEO_DISPATCH_INVALID:${scene.sceneId}`);
    }
  }
}

const canon = validateCanonBalance(scenes, {throwOnViolation: true});
if (!canon.valid) throw new Error(`MILK_CANON_INVALID:${canon.violations.join('|')}`);

if (
  FIREFLY_GENERATION_PROFILE.model !== 'Kling 2.5 Turbo' ||
  FIREFLY_GENERATION_PROFILE.resolution !== '1080p' ||
  FIREFLY_GENERATION_PROFILE.aspect_ratio !== '16:9' ||
  FIREFLY_GENERATION_PROFILE.fps !== 24 ||
  FIREFLY_GENERATION_PROFILE.duration_seconds !== 5
) {
  throw new Error('MILK_FIREFLY_PROFILE_INVALID');
}

process.stdout.write(`${JSON.stringify({passed: true, scenes: scenes.length, chapters: 6, counts, canon: canon.counts, firefly: FIREFLY_GENERATION_PROFILE}, null, 2)}\n`);
