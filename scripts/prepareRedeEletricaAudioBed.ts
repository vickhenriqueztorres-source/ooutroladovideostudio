import fs from 'fs';
import path from 'path';
import { spawnSync, execSync } from 'child_process';
import scenesData from '../contracts/episodes/rede-eletrica-60hz.scenes.json';

const audioLibDir = path.join(process.cwd(), 'assets', 'audio_library');
const baseAudioDir = path.join(process.cwd(), 'public', 'episodes', 'rede-eletrica-60hz', 'audio');
const musicDir = path.join(baseAudioDir, 'music');
const sfxDir = path.join(baseAudioDir, 'sfx');
const narrationDir = path.join(baseAudioDir, 'narration');

fs.mkdirSync(musicDir, { recursive: true });
fs.mkdirSync(sfxDir, { recursive: true });
fs.mkdirSync(narrationDir, { recursive: true });

const duration = 300; // 300 seconds

function runFfmpeg(args: string[]) {
  const result = spawnSync('ffmpeg', ['-y', ...args], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`FFMPEG_FAILED: ${result.stderr || result.stdout}`);
  }
}

async function main() {
  console.log('🎧 PREPARANDO TRILHA AMBIENTE, SOUND DESIGN E MASTER DE LOCUÇÃO...');

  // 1. Music Bed
  const targetMusicBed = path.join(musicDir, 'bed.wav');
  const musicBedSource = path.join(audioLibDir, 'audio', 'music', 'cinematic', 'ambient', 'ambient_gloom_horizon.mp3');
  console.log('🎵 Gerando trilha ambiente 300s...');
  runFfmpeg([
    '-stream_loop', '-1', '-i', musicBedSource, '-t', String(duration),
    '-af', `volume=0.45,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, duration - 4)}:d=4`,
    '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', targetMusicBed
  ]);

  // 2. SFX Bed
  const targetSfxBed = path.join(sfxDir, 'bed.wav');
  console.log('💥 Gerando camada de transições e impactos sonoros (SFX Bed)...');
  const cueSources = [
    path.join(audioLibDir, 'audio', 'sfx', 'ui', 'ui_click_16.wav'),
    path.join(audioLibDir, 'audio', 'sfx', 'cinematic', 'impacts', 'impact_strike_42.wav'),
    path.join(audioLibDir, 'audio', 'sfx', 'foley', 'doors', 'foley_door_02.wav')
  ];
  const inputs: string[] = ['-f', 'lavfi', '-t', String(duration), '-i', 'anullsrc=r=48000:cl=stereo'];
  const totalCues = 10;
  for (let i = 0; i < totalCues; i++) {
    inputs.push('-i', cueSources[i % cueSources.length]);
  }
  const cueFilters: string[] = ['[0:a]volume=0[base]'];
  for (let i = 0; i < totalCues; i++) {
    const elapsed = i * 30 + 1.0;
    cueFilters.push(`[${i + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.15,adelay=${Math.round(elapsed * 1000)}|${Math.round(elapsed * 1000)}[cue${i}]`);
  }
  const mixInputs = ['[base]', ...Array.from({ length: totalCues }, (_, i) => `[cue${i}]`)].join('');
  cueFilters.push(`${mixInputs}amix=inputs=${totalCues + 1}:normalize=0:duration=first,atrim=0:${duration}[out]`);
  runFfmpeg([...inputs, '-filter_complex', cueFilters.join(';'), '-map', '[out]', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', targetSfxBed]);

  // 3. Master Narration concatenado calibrado para 300s
  console.log('🎙️ Gerando master narration.mp3 sincronizado para 300s...');
  const tempDir = path.join(process.cwd(), 'runs', 'rede-eletrica-60hz', 'temp_narration');
  fs.mkdirSync(tempDir, { recursive: true });
  const concatLines: string[] = [];

  for (const sc of scenesData) {
    const sceneMp3 = path.join(narrationDir, `${sc.sceneId}.mp3`);
    const paddedMp3 = path.join(tempDir, `${sc.sceneId}_padded.mp3`);
    const durSec = sc.targetSeconds;
    if (fs.existsSync(sceneMp3)) {
      runFfmpeg(['-i', sceneMp3, '-af', `apad=whole_dur=${durSec.toFixed(3)}`, '-t', durSec.toFixed(3), '-ar', '48000', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '192k', paddedMp3]);
    } else {
      runFfmpeg(['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', durSec.toFixed(3), '-c:a', 'libmp3lame', '-b:a', '192k', paddedMp3]);
    }
    concatLines.push(`file '${paddedMp3.replace(/\\/g, '/')}'`);
  }
  const concatTxt = path.join(tempDir, 'concat.txt');
  fs.writeFileSync(concatTxt, concatLines.join('\n'), 'utf8');

  const masterNarrationPath = path.join(narrationDir, 'narration.mp3');
  runFfmpeg(['-f', 'concat', '-safe', '0', '-i', concatTxt, '-c', 'copy', masterNarrationPath]);
  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log('✅ ÁUDIO MASTER PREPARADO COM SUCESSO!');
}

main().catch((err) => {
  console.error('❌ ERRO NO PREPARO DE ÁUDIO:', err);
  process.exit(1);
});
