import {spawnSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import scenesJson from '../contracts/episodes/leite-cadeia-frio.scenes.json';
import {HslSoundFxRuntime} from '../hsl/postproduction/soundFxRuntime';
import {
  EPISODE_MILK_CALCULATED_TIMELINE,
  MILK_EPISODE_ID,
  MILK_FPS,
  MILK_RUN_ID,
} from '../remotion/episodeMilkTimelineData';

const root = process.cwd();
const runDir = path.join(root, 'runs', MILK_EPISODE_ID, MILK_RUN_ID);
const publicAudioDir = path.join(root, 'public', 'editorial', 'execution', MILK_RUN_ID, 'audio');
const runAudioDir = path.join(runDir, 'audio');
const durationSeconds = EPISODE_MILK_CALCULATED_TIMELINE.totalDurationSeconds;

function runFfmpeg(args: string[], errorCode: string): void {
  const result = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
  });
  if (result.status !== 0) {
    throw new Error(`${errorCode}:${result.stderr || result.stdout || result.error?.message || 'unknown'}`);
  }
}

function ensureDirectory(directory: string): void {
  fs.mkdirSync(directory, {recursive: true});
}

const sourceScenes = scenesJson as Array<{
  sceneId: string;
  chapterId: string;
  voiceover: string;
  visualSubject: string;
}>;

const executableScenes = EPISODE_MILK_CALCULATED_TIMELINE.scenes.map((scene, index) => {
  const source = sourceScenes[index];
  const constraint = /risco|contamina|falha|rejeitar|rompida|quebrar|interromper/i.test(source.voiceover);
  return {
    schema: 'hsl.execution.scene.v1',
    schema_version: '1.0.0',
    episode_id: MILK_EPISODE_ID,
    scene_id: source.sceneId,
    chapter_id: source.chapterId,
    narrative_function: constraint ? 'gargalo ou risco verificável' : 'processo observável',
    voiceover: source.voiceover,
    visual_mode: 'generated_ai',
    visual_subject: source.visualSubject,
    planned_duration_seconds: scene.durationSeconds,
    micro_events: [{
      at_percent: 60,
      action: constraint ? 'gargalo' : 'processo',
      subject: source.visualSubject,
    }],
    remotion_choreography: index > 0 && index % 10 === 0
      ? [{at_percent: 36, type: 'flow_line', color_role: 'orange'}]
      : [],
  };
}) as any;

const soundFxOutput = path.join(runDir, 'postproduction', 'soundfx');
const sfx = new HslSoundFxRuntime().run({
  scenes: executableScenes,
  outputDirectory: soundFxOutput,
  fps: MILK_FPS,
});

const publicSfxDir = path.join(publicAudioDir, 'sfx');
const runSfxDir = path.join(runAudioDir, 'sfx');
ensureDirectory(publicSfxDir);
ensureDirectory(runSfxDir);
const publicSfxBed = path.join(publicSfxDir, 'bed.mp3');
const runSfxBed = path.join(runSfxDir, 'bed.mp3');
runFfmpeg(['-i', sfx.bedPath, '-c:a', 'libmp3lame', '-b:a', '256k', publicSfxBed], 'MILK_SFX_TRANSCODE_FAILED');
fs.copyFileSync(publicSfxBed, runSfxBed);

const publicMusicDir = path.join(publicAudioDir, 'music');
const runMusicDir = path.join(runAudioDir, 'music');
ensureDirectory(publicMusicDir);
ensureDirectory(runMusicDir);
const publicMusicBed = path.join(publicMusicDir, 'bed.mp3');
runFfmpeg([
  '-f', 'lavfi', '-i', `sine=frequency=55:sample_rate=48000:duration=${durationSeconds}`,
  '-f', 'lavfi', '-i', `sine=frequency=82.5:sample_rate=48000:duration=${durationSeconds}`,
  '-f', 'lavfi', '-i', `anoisesrc=color=pink:amplitude=0.012:sample_rate=48000:duration=${durationSeconds}`,
  '-filter_complex',
  `[0:a]volume='0.045*(0.72+0.28*sin(2*PI*t/8))':eval=frame,lowpass=f=180[a0];` +
  `[1:a]volume='0.018*(0.65+0.35*sin(2*PI*t/16))':eval=frame,lowpass=f=260[a1];` +
  `[2:a]highpass=f=70,lowpass=f=1800,volume=0.32[a2];` +
  `[a0][a1][a2]amix=inputs=3:normalize=0,aecho=0.8:0.35:240|480:0.08|0.035,` +
  `afade=t=in:st=0:d=3,afade=t=out:st=${durationSeconds - 4}:d=4,alimiter=limit=0.45,` +
  `aformat=sample_fmts=fltp:channel_layouts=stereo[out]`,
  '-map', '[out]', '-ar', '48000', '-c:a', 'libmp3lame', '-b:a', '256k', publicMusicBed,
], 'MILK_MUSIC_BUILD_FAILED');
fs.copyFileSync(publicMusicBed, path.join(runMusicDir, 'bed.mp3'));

const publicRoomToneDir = path.join(publicAudioDir, 'room-tone');
const runRoomToneDir = path.join(runAudioDir, 'room-tone');
ensureDirectory(publicRoomToneDir);
ensureDirectory(runRoomToneDir);
const publicRoomToneBed = path.join(publicRoomToneDir, 'bed.mp3');
runFfmpeg([
  '-f', 'lavfi', '-i', `anoisesrc=color=pink:amplitude=0.018:sample_rate=48000:duration=${durationSeconds}`,
  '-af', `highpass=f=90,lowpass=f=3200,volume=0.2,afade=t=in:st=0:d=2,afade=t=out:st=${durationSeconds - 3}:d=3,aformat=sample_fmts=fltp:channel_layouts=stereo`,
  '-ar', '48000', '-c:a', 'libmp3lame', '-b:a', '192k', publicRoomToneBed,
], 'MILK_ROOM_TONE_BUILD_FAILED');
fs.copyFileSync(publicRoomToneBed, path.join(runRoomToneDir, 'bed.mp3'));

const checkpoint = {
  schema: 'milk.audio-beds.v1',
  status: 'AUDIO_BEDS_READY',
  episodeId: MILK_EPISODE_ID,
  runId: MILK_RUN_ID,
  durationSeconds,
  sfx: {
    status: sfx.qa.status,
    cueCount: sfx.qa.cue_count,
    plan: sfx.planPath,
    provenance: 'KENNEY_CC0_DERIVATIVE',
    publicBed: publicSfxBed,
  },
  music: {
    status: 'ORIGINAL_PROCEDURAL_BED_READY',
    publicBed: publicMusicBed,
  },
  roomTone: {
    status: 'ORIGINAL_PROCEDURAL_ROOM_TONE_READY',
    publicBed: publicRoomToneBed,
  },
  narration: 'PENDING_ELEVENLABS_AUTHORIZATION',
};
ensureDirectory(path.join(runDir, 'checkpoints'));
fs.writeFileSync(
  path.join(runDir, 'checkpoints', 'audio_beds.json'),
  `${JSON.stringify(checkpoint, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify(checkpoint, null, 2));
