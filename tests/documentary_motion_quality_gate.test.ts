import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {EPISODE_DRONES_AGRO_FIELD_CALCULATED_TIMELINE} from '../remotion/episodeDronesAgroFieldTimelineData';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const calloutSource = read('remotion/documentary/KineticEditorialCallout.tsx');
assert.doesNotMatch(calloutSource, /\bspring\s*\(/);
assert.doesNotMatch(calloutSource, /scale\s*\(/);
assert.doesNotMatch(calloutSource, /letterSpacing:\s*interpolate/);
assert.doesNotMatch(calloutSource, /boxShadow|textShadow:\s*`[^`]*(?:glow|accentColor)/i);

const fieldSceneSource = read('remotion/documentary/FieldDocumentaryScene.tsx');
assert.match(fieldSceneSource, /OffthreadVideo/);
assert.doesNotMatch(fieldSceneSource, /\bImg\b|\binterpolate\b|CinematicParallax|Ken Burns/i);

const episodeSource = read('remotion/EpisodeDronesAgro.tsx');
const runnerSource = read('pipeline/episodeProductionRunner.ts');
assert.match(episodeSource, /EPISODE_DRONES_AGRO_FIELD_CALCULATED_TIMELINE/);
assert.match(runnerSource, /episodeDronesAgroFieldTimelineData/);
const preRenderGateAt = runnerSource.indexOf("stageScope: 'PRE_RENDER'");
const remotionRenderAt = runnerSource.indexOf('npx remotion render');
assert.ok(preRenderGateAt >= 0 && remotionRenderAt > preRenderGateAt, 'visual provenance gate must run before Remotion');

const hslEpisodeSource = read('remotion/HslEpisode.tsx');
assert.match(hslEpisodeSource, /showGlobalOverlays\s*=\s*props\.showGlobalOverlays\s*\?\?\s*false/);
assert.match(hslEpisodeSource, /showHybridTextOverlay\s*=\s*props\.showHybridTextOverlay\s*\?\?\s*false/);
assert.doesNotMatch(hslEpisodeSource, /scale\(\$\{interpolate\(frame/);

const timeline = EPISODE_DRONES_AGRO_FIELD_CALCULATED_TIMELINE;
const calloutCount = timeline.scenes.filter((scene) => scene.callout).length;
const mediaFiles = timeline.scenes.map((scene) => scene.mediaFile).filter((value): value is string => Boolean(value));
const crossfadeCount = timeline.scenes.filter((scene) => scene.transition === 'crossfade').length;

assert.equal(timeline.scenes.length, 24);
assert.ok(calloutCount / timeline.scenes.length <= 0.3, `callout ratio ${calloutCount}/${timeline.scenes.length}`);
assert.equal(crossfadeCount, 0);
assert.equal(new Set(mediaFiles).size, timeline.scenes.length);
assert.ok(timeline.scenes.every((scene) => scene.camera === 'static'));
assert.ok(timeline.scenes.every((scene) => scene.component === 'FieldDocumentaryScene'));
assert.ok(mediaFiles.every((mediaFile) => fs.existsSync(path.join(root, 'public', mediaFile))), 'every temporal take must exist');

console.log('documentary_motion_quality_gate.test.ts: PASS (pre-render provenance, restrained annotations, no synthetic camera)');
