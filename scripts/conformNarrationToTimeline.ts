import fs from 'fs';
import path from 'path';
import {execFileSync} from 'child_process';

type SceneContract = {sceneId: string; targetSeconds: number};

const root = process.cwd();
const episodeId = process.argv[2];
const runId = process.argv[3];

if (!episodeId || !runId) {
  throw new Error('USAGE: ts-node scripts/conformNarrationToTimeline.ts <episodeId> <runId>');
}

const scenePath = path.join(root, 'contracts', 'episodes', `${episodeId}.scenes.json`);
const narrationDir = path.join(root, 'runs', episodeId, runId, 'audio', 'narration');
const backupDir = path.join(narrationDir, 'raw');
const reportPath = path.join(root, 'runs', episodeId, runId, 'audio', 'narration-conform-report.json');
const scenes = JSON.parse(fs.readFileSync(scenePath, 'utf8')) as SceneContract[];
fs.mkdirSync(backupDir, {recursive: true});

const report: Array<Record<string, unknown>> = [];
for (const scene of scenes) {
  const source = path.join(narrationDir, `${scene.sceneId}.mp3`);
  if (!fs.existsSync(source)) throw new Error(`NARRATION_MISSING:${scene.sceneId}`);

  const backup = path.join(backupDir, `${scene.sceneId}.mp3`);
  if (!fs.existsSync(backup)) fs.copyFileSync(source, backup);

  const rawDuration = Number(execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', source
  ], {encoding: 'utf8'}).trim());
  const target = scene.targetSeconds;
  const tempo = rawDuration > target ? Math.min(1.15, rawDuration / target) : 1;
  const filter = tempo > 1
    ? `atempo=${tempo.toFixed(6)},apad,atrim=0:${target.toFixed(3)}`
    : `apad,atrim=0:${target.toFixed(3)}`;
  const temp = path.join(narrationDir, `.${scene.sceneId}.conform.mp3`);

  execFileSync('ffmpeg', [
    '-y', '-v', 'error', '-i', source, '-filter:a', filter,
    '-ar', '48000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '192k', temp
  ], {stdio: 'inherit'});
  fs.renameSync(temp, source);

  const finalDuration = Number(execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', source
  ], {encoding: 'utf8'}).trim());
  report.push({sceneId: scene.sceneId, rawDuration, targetSeconds: target, tempo, finalDuration});
}

fs.writeFileSync(reportPath, `${JSON.stringify({episodeId, runId, generatedAt: new Date().toISOString(), scenes: report}, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({episodeId, runId, sceneCount: report.length, reportPath}, null, 2));
