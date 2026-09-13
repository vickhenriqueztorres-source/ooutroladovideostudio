import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { ElevenLabsAdapter } from '../adapters/elevenLabsAdapter';
import { Logger } from '../event-hub/logger';

interface Scene {
  sceneId: string;
  voiceover: string;
  targetSeconds?: number;
}

interface AudioTiming {
  audioDuration: number;
  breathSeconds: number;
  sceneDuration: number;
  frames: number;
}

async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const probe = spawnSync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ], { encoding: 'utf8' });
    const dur = parseFloat(probe.stdout.trim());
    return isNaN(dur) ? 0 : dur;
  } catch {
    return 0;
  }
}

async function main() {
  const episodeId = 'raio-x-aeroporto';
  const scenesPath = path.join(process.cwd(), 'contracts', 'episodes', `${episodeId}.scenes.json`);
  const outputDir = path.join(process.cwd(), 'public', 'episodes', episodeId, 'audio', 'narration');
  const timingsFilePath = path.join(process.cwd(), 'remotion', 'raioXAudioTimings.json');

  if (!fs.existsSync(scenesPath)) {
    throw new Error(`Arquivo de cenas não encontrado: ${scenesPath}`);
  }

  const scenes: Scene[] = JSON.parse(fs.readFileSync(scenesPath, 'utf8'));
  fs.mkdirSync(outputDir, { recursive: true });

  Logger.info('RaioXNarration', `Iniciando síntese de narração para ${scenes.length} cenas com voz Chris (ElevenLabs)...`);

  const adapter = new ElevenLabsAdapter();
  await adapter.initialize();

  const timings: Record<string, AudioTiming> = {};
  let totalAudioDuration = 0;
  let totalSceneDuration = 0;

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const outMp3 = path.join(outputDir, `${sc.sceneId}.mp3`);
    let duration = 0;

    if (fs.existsSync(outMp3) && fs.statSync(outMp3).size > 1024) {
      duration = await getAudioDuration(outMp3);
      console.log(`🎙️ [${i + 1}/${scenes.length}] ${sc.sceneId}: Áudio já existe (${duration.toFixed(2)}s).`);
    } else {
      console.log(`🎙️ [${i + 1}/${scenes.length}] ${sc.sceneId}: Sintetizando locução oficial Chris...`);
      const res = await adapter.synthesizeText(sc.voiceover, outMp3);
      duration = res.durationSeconds || (await getAudioDuration(outMp3));
      console.log(`   ✅ Concluído: ${duration.toFixed(2)}s`);
    }

    const breathSeconds = 0.8;
    const sceneDuration = Math.round((duration + breathSeconds) * 10) / 10;
    const frames = Math.round(sceneDuration * 30);

    timings[sc.sceneId] = {
      audioDuration: Math.round(duration * 100) / 100,
      breathSeconds,
      sceneDuration,
      frames
    };

    totalAudioDuration += duration;
    totalSceneDuration += sceneDuration;
  }

  // Salva timings sincronizados para o Remotion
  fs.writeFileSync(timingsFilePath, JSON.stringify(timings, null, 2), 'utf8');

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log(`🎉 LOCUÇÃO ELEVENLABS CONCLUÍDA PARA: ${episodeId}`);
  console.log(`- Total de Cenas: ${scenes.length}`);
  console.log(`- Duração Total da Voz: ${(totalAudioDuration / 60).toFixed(1)} min (${totalAudioDuration.toFixed(1)}s)`);
  console.log(`- Duração Total do Vídeo (com respiro): ${(totalSceneDuration / 60).toFixed(1)} min (${totalSceneDuration.toFixed(1)}s)`);
  console.log(`- Timings gravados em: remotion/raioXAudioTimings.json`);
  console.log(`- Áudios salvos em: public/episodes/${episodeId}/audio/narration/`);
  console.log('══════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('\n❌ ERRO NA SÍNTESE DE NARRAÇÃO:', err.message);
  process.exit(1);
});
