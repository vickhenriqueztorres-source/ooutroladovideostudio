import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import { ElevenLabsAdapter } from '../adapters/elevenLabsAdapter';
import rawScenesData from '../contracts/episodes/sala-cofre-apuracao.scenes.json';

interface SceneRaw {
  sceneId: string;
  voiceover: string;
  visualSubject: string;
  take_type: 'KEYFRAME_DOSSIER' | 'CINEMATIC_TAKE';
  targetSeconds: number;
}

const EPISODE_ID = 'sala-cofre-apuracao';
const BASE_EPISODE_DIR = path.join(process.cwd(), 'public', 'episodes', EPISODE_ID);
const AUDIO_DIR = path.join(BASE_EPISODE_DIR, 'audio', 'narration');
const MUSIC_DIR = path.join(BASE_EPISODE_DIR, 'audio', 'music');
const TAKES_DIR = path.join(BASE_EPISODE_DIR, 'takes');
const IMAGES_DIR = path.join(BASE_EPISODE_DIR, 'images');

fs.mkdirSync(AUDIO_DIR, { recursive: true });
fs.mkdirSync(MUSIC_DIR, { recursive: true });
fs.mkdirSync(TAKES_DIR, { recursive: true });
fs.mkdirSync(IMAGES_DIR, { recursive: true });

function getAudioDuration(filePath: string): number {
  const res = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath
  ], { encoding: 'utf8' });
  const dur = parseFloat(res.stdout.trim());
  return isNaN(dur) ? 8.0 : dur;
}

// Mapeamento semântico dos clipes reais do banco documental
const BANK_DIR = path.join(process.cwd(), 'banco de videos');
const CLIP_MAPPING: Record<string, string> = {
  SC_001: 'Parcel_passes_under_scanner_202608281235.mp4',
  SC_002: 'Printer_ejects_paper_in_office_202608281235.mp4',
  SC_004: 'Car_crossing_neighborhood_street_202608281234.mp4',
  SC_006: 'Phone_sliding_to_fiber_connector_202608281234.mp4',
  SC_009: 'Parcel_passes_under_scanner_202608281235.mp4',
  SC_011: 'Gloved_hand_turning_valve_202608281236.mp4',
  SC_013: 'Maintenance_vehicle_passing_secu…_202608281234.mp4',
  SC_014: 'Water_fills_glass_from_faucet_202608281234.mp4',
  SC_015: 'Freight_train_moving_laterally_202608281235.mp4',
  SC_016: 'Hand_adjusting_phone_on_rooftop_202608281234.mp4',
  SC_017: 'Phone_sliding_to_fiber_connector_202608281234.mp4',
  SC_018: 'Clouds_moving_over_neighborhood_…_202608281234.mp4',
  SC_020: 'City_skyline_at_dawn_202608281234.mp4',
  SC_021: 'Gloved_hand_turning_valve_202608281236.mp4',
  SC_023: 'Parcel_moving_on_conveyor_belt_202608281234.mp4',
  SC_025: 'Worker_redirects_parcel_on_belt_202608281235.mp4',
  SC_027: 'Hands_comparing_documents_overhead_202608281235.mp4',
  SC_028: 'Worker_redirects_parcel_on_belt_202608281235.mp4',
  SC_030: 'Camera_pushing_toward_concrete_r…_202608281234.mp4'
};

async function prepareAssets() {
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('🎙️ PREPARANDO ASSETS DE ÁUDIO E VÍDEO // SALA-COFRE');
  console.log('══════════════════════════════════════════════════════════════════\n');

  const scenes: SceneRaw[] = rawScenesData as SceneRaw[];
  const adapter = new ElevenLabsAdapter();
  await adapter.initialize();

  // 1. Narração ElevenLabs
  const timingsMap: Record<string, { audioDuration: number; breathSeconds: number; sceneDuration: number; frames: number }> = {};

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const outAudioPath = path.join(AUDIO_DIR, `${sc.sceneId}.mp3`);

    if (fs.existsSync(outAudioPath) && fs.statSync(outAudioPath).size > 2000) {
      console.log(`[${i + 1}/${scenes.length}] Áudio existente: ${sc.sceneId}.mp3`);
    } else {
      console.log(`[${i + 1}/${scenes.length}] Sintetizando Chris ElevenLabs: ${sc.sceneId}...`);
      await adapter.synthesizeText(sc.voiceover, outAudioPath);
      // Pequena pausa para evitar rate limit
      await new Promise(r => setTimeout(r, 600));
    }

    const duration = getAudioDuration(outAudioPath);
    const breath = 0.8;
    const sceneDur = parseFloat((duration + breath).toFixed(1));
    const frames = Math.round(sceneDur * 30);

    timingsMap[sc.sceneId] = {
      audioDuration: parseFloat(duration.toFixed(2)),
      breathSeconds: breath,
      sceneDuration: sceneDur,
      frames
    };
  }

  // Salva timings
  const timingsPath = path.join(process.cwd(), 'remotion', 'salaCofreAudioTimings.json');
  fs.writeFileSync(timingsPath, JSON.stringify(timingsMap, null, 2), 'utf8');
  console.log(`\n✅ Timings salvos em: ${timingsPath}`);

  // 2. Trilha Sonora
  const srcMusic = path.join(process.cwd(), 'public', 'episodes', 'gasolina-adulterada', 'audio', 'music', 'bed.mp3');
  const dstMusic = path.join(MUSIC_DIR, 'bed.mp3');
  if (!fs.existsSync(dstMusic) && fs.existsSync(srcMusic)) {
    fs.copyFileSync(srcMusic, dstMusic);
    console.log(`✅ Trilha musical configurada em: ${dstMusic}`);
  }

  // 3. Takes de Vídeo e Frames de Imagem
  console.log('\n🎞️ Preparando takes documentais e frames de evidência...');
  for (const sc of scenes) {
    const targetVideo = path.join(TAKES_DIR, `${sc.sceneId}.mp4`);
    const targetImage = path.join(IMAGES_DIR, `${sc.sceneId}.png`);

    const clipName = CLIP_MAPPING[sc.sceneId] || 'Camera_pushing_toward_concrete_r…_202608281234.mp4';
    const sourceVideo = path.join(BANK_DIR, clipName);

    if (!fs.existsSync(targetVideo) && fs.existsSync(sourceVideo)) {
      // Cria loop/extensão do clipe com duração correspondente
      const timing = timingsMap[sc.sceneId];
      const targetSeconds = timing ? timing.sceneDuration : 10.0;
      execSync(`ffmpeg -y -hide_banner -loglevel error -stream_loop 3 -i "${sourceVideo}" -t ${targetSeconds} -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,eq=contrast=1.05:saturation=0.92" -c:v libx264 -pix_fmt yuv420p -an "${targetVideo}"`);
    }

    if (!fs.existsSync(targetImage) && fs.existsSync(targetVideo)) {
      execSync(`ffmpeg -y -hide_banner -loglevel error -ss 00:00:01.0 -i "${targetVideo}" -frames:v 1 "${targetImage}"`);
    }
  }

  console.log('\n🎉 TODOS OS ASSETS DA SALA-COFRE FORAM PREPARADOS COM SUCESSO!\n');
}

prepareAssets().catch(err => {
  console.error('❌ ERRO NA PREPARAÇÃO DE ASSETS:', err);
  process.exit(1);
});
