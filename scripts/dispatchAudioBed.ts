import fs from 'fs';
import path from 'path';
import { parseEpisodeContract } from '../contracts/episodeContract';
import { buildSceneContracts, RawSceneInput } from '../contracts/buildSceneContracts';
import { buildAudioBedPlan, AudioBedPlanReport } from '../contracts/audioBedContract';
import { validateNarrationBatch } from './dispatchNarrationBatch';
import {spawnSync} from 'child_process';
import crypto from 'crypto';

export interface AudioValidationResult {
  runId: string;
  passed: boolean;
  musicValid: boolean;
  sfxValid: boolean;
  mixValid: boolean;
  totalScenes: number;
  sfxStemsPresent: number;
  failures: string[];
}

/**
 * Valida os stems de áudio (SFX, Música e Mix) no disco
 */
export function validateAudioBed(runId: string, customBaseDir?: string): AudioValidationResult {
  const baseDir = customBaseDir || path.join(process.cwd(), 'runs', 'gasolina-adulterada', runId);
  const audioDir = path.join(baseDir, 'audio');
  const sfxDir = path.join(audioDir, 'sfx');
  const musicPath = path.join(audioDir, 'music', 'bed.wav');
  const mixPath = path.join(audioDir, 'mix', 'mix.wav');

  const contractPath = path.join(process.cwd(), 'contracts', 'episodes', 'gasolina-adulterada.episode.json');
  const scenesPath = path.join(process.cwd(), 'contracts', 'episodes', 'gasolina-adulterada.scenes.json');

  const episodeContract = parseEpisodeContract(contractPath);
  const rawScenes: RawSceneInput[] = JSON.parse(fs.readFileSync(scenesPath, 'utf8'));

  const failures: string[] = [];

  // 1. Validação de Trilha Musical
  let musicValid = false;
  if (!fs.existsSync(musicPath)) {
    failures.push('MISSING_MUSIC_BED: audio/music/bed.wav ausente.');
  } else {
    const st = fs.statSync(musicPath);
    if (st.size === 0) {
      failures.push('EMPTY_MUSIC_BED: audio/music/bed.wav com 0 bytes.');
    } else {
      musicValid = true;
    }
  }

  // 2. Validação de Stems SFX por Cena (Exclusividade e Unicidade Obrigatórias)
  let sfxStemsPresent = 0;
  const shaMap = new Map<string, string[]>();

  for (const scene of rawScenes) {
    const stemPathWav = path.join(sfxDir, `${scene.sceneId}.wav`);
    const stemPathMp3 = path.join(sfxDir, `${scene.sceneId}.mp3`);
    const stemPath = fs.existsSync(stemPathMp3) ? stemPathMp3 : stemPathWav;

    if (!fs.existsSync(stemPath)) {
      failures.push(`MISSING_STAGE: sfx (${scene.sceneId} ausente).`);
    } else {
      const st = fs.statSync(stemPath);
      if (st.size === 0) {
        failures.push(`EMPTY_SFX_STEM: ${scene.sceneId} com 0 bytes.`);
      } else {
        sfxStemsPresent++;
        const fileBuffer = fs.readFileSync(stemPath);
        const hash = require('crypto').createHash('sha256').update(fileBuffer).digest('hex');
        const existing = shaMap.get(hash) || [];
        existing.push(scene.sceneId);
        shaMap.set(hash, existing);
      }
    }
  }

  // Verifica duplicação de SHA nos SFX (Proibido mesmo stem para cenas diferentes)
  for (const [hash, sceneIds] of shaMap.entries()) {
    if (sceneIds.length > 1) {
      failures.push(`SFX_REUSED: Mesmo stem sonoro (SHA: ${hash.slice(0, 10)}) repetido nas cenas [${sceneIds.join(', ')}]`);
    }
  }

  const sfxValid = (sfxStemsPresent === rawScenes.length) && (failures.filter(f => f.startsWith('SFX_REUSED')).length === 0);
  if (!sfxValid && !failures.some(f => f.includes('MISSING_STAGE'))) {
    failures.unshift(`SFX_STEMS_INVALID: ${sfxStemsPresent}/${rawScenes.length} validados.`);
  }

  // 3. Validação de Mix
  let mixValid = false;
  if (!fs.existsSync(mixPath)) {
    failures.push('MISSING_MIX_FILE: audio/mix/mix.wav ausente.');
  } else {
    const st = fs.statSync(mixPath);
    if (st.size === 0) {
      failures.push('EMPTY_MIX_FILE: audio/mix/mix.wav com 0 bytes.');
    } else {
      mixValid = true;
    }
  }

  return {
    runId,
    passed: failures.length === 0,
    musicValid,
    sfxValid,
    mixValid,
    totalScenes: rawScenes.length,
    sfxStemsPresent,
    failures
  };
}

export async function runAudioBedDispatch(options?: {
  runId?: string;
  forceDispatch?: boolean;
  stage?: 'sfx' | 'music' | 'mix' | 'all';
  contractPath?: string;
  scenesPath?: string;
}): Promise<{ plan: AudioBedPlanReport; wordStatus: 'AUDIO_DRY_ONLY' | 'AUDIO_DISPATCHED' | 'NO_AUDIO_PACK' }> {
  const contractPath = options?.contractPath || path.join(process.cwd(), 'contracts', 'episodes', 'gasolina-adulterada.episode.json');
  const scenesPath = options?.scenesPath || path.join(process.cwd(), 'contracts', 'episodes', 'gasolina-adulterada.scenes.json');

  const episodeContract = parseEpisodeContract(contractPath);
  const rawScenes: RawSceneInput[] = JSON.parse(fs.readFileSync(scenesPath, 'utf8'));
  const sceneContracts = buildSceneContracts(episodeContract, rawScenes);

  const isRealDispatch = options?.forceDispatch || process.env.AUDIO_DISPATCH === '1';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runId = options?.runId || `RUN_AUDIO_${timestamp}`;

  // 1. Gera e Valida o Plano de SFX / Trilha / Mix
  const plan = buildAudioBedPlan(episodeContract, sceneContracts, runId);

  const runsEpisodeBase = path.join(process.cwd(), 'runs', episodeContract.episodeId);
  const runDir = path.join(runsEpisodeBase, runId);
  const audioDir = path.join(runDir, 'audio');
  const sfxDir = path.join(audioDir, 'sfx');
  const musicDir = path.join(audioDir, 'music');
  const mixDir = path.join(audioDir, 'mix');
  const checkpointsDir = path.join(runDir, 'checkpoints');
  const dispatchBase = path.join(runsEpisodeBase, 'dispatch');

  fs.mkdirSync(sfxDir, { recursive: true });
  fs.mkdirSync(musicDir, { recursive: true });
  fs.mkdirSync(mixDir, { recursive: true });
  fs.mkdirSync(checkpointsDir, { recursive: true });
  fs.mkdirSync(path.join(dispatchBase, 'latest'), { recursive: true });

  // 2. Modo Sem AUDIO_DISPATCH=1 -> NÃO copiar stems genéricos, apenas reportar plano
  if (!isRealDispatch) {
    console.log(`\n══════════════════════════════════════════════════════════════════════════════════════`);
    console.log(`🎧 PLANO DE SFX, MÚSICA & MIX (DRY-RUN / AUDIO_DISPATCH=0)`);
    console.log(`══════════════════════════════════════════════════════════════════════════════════════`);
    console.log(`- RunId: ${runId}`);
    console.log(`- Total de Cenas com SFX: ${plan.totalScenes}`);
    console.log(`- Total de Cues Substantivas: ${plan.totalSfxCues}`);
    console.log(`- Trilha Musical: ${plan.musicMood} (${plan.musicTargetSeconds.toFixed(1)}s)`);
    console.log(`- Status: MISSING_STAGE: sfx (Nenhum stem copiado sem AUDIO_DISPATCH=1 explícito)`);
    console.log(`══════════════════════════════════════════════════════════════════════════════════════\n`);
    return { plan, wordStatus: 'AUDIO_DRY_ONLY' };
  }

  // 3. Produção real a partir do catálogo local aprovado.
  console.log(`\n🔥 PRODUÇÃO REAL DE ÁUDIO DOCUMENTAL A PARTIR DO CATÁLOGO APROVADO...`);

  const audioLibDir = path.join(process.cwd(), 'assets', 'audio_library');
  const hasAudioLib = fs.existsSync(audioLibDir);

  if (!hasAudioLib && process.env.AUDIO_PACK_AVAILABLE !== '1') {
    const sessionReport = {
      status: 'STAGE_UNAVAILABLE',
      hasPack: false,
      wordStatus: 'NO_AUDIO_PACK',
      runId,
      reason: 'Nenhum sound pack de SFX industrial específico de posto configurado no ambiente.',
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(path.join(dispatchBase, 'latest', 'audio-session.json'), JSON.stringify(sessionReport, null, 2), 'utf8');
    throw new Error('STAGE_UNAVAILABLE: sfx / music - Sound pack de posto indisponível.');
  }

  const runFfmpeg = (args: string[]) => {
    const result = spawnSync('ffmpeg', ['-y', ...args], {encoding: 'utf8'});
    if (result.status !== 0) throw new Error(`AUDIO_FFMPEG_FAILED:${result.stderr || result.stdout}`);
  };

  const duration = episodeContract.targetDurationSeconds;
  const musicBedSource = path.join(audioLibDir, 'audio', 'music', 'cinematic', 'ambient', 'ambient_gloom_horizon.mp3');
  const targetMusicBed = path.join(musicDir, 'bed.wav');
  if (!fs.existsSync(targetMusicBed) || fs.statSync(targetMusicBed).size < 1024) {
    runFfmpeg([
      '-stream_loop', '-1', '-i', musicBedSource, '-t', String(duration),
      '-af', `volume=0.52,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, duration - 4)}:d=4`,
      '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', targetMusicBed,
    ]);
  }

  const cueItems = plan.contract.sfx.filter((item) => item.cues.length > 0);
  const cueSources = [
    path.join(audioLibDir, 'audio', 'sfx', 'ui', 'ui_click_16.wav'),
    path.join(audioLibDir, 'audio', 'sfx', 'cinematic', 'impacts', 'impact_strike_42.wav'),
    path.join(audioLibDir, 'audio', 'sfx', 'foley', 'doors', 'foley_door_02.wav'),
  ];
  const targetSfxBed = path.join(sfxDir, 'bed.wav');
  if (!fs.existsSync(targetSfxBed) || fs.statSync(targetSfxBed).size < 1024) {
    const inputs: string[] = ['-f', 'lavfi', '-t', String(duration), '-i', 'anullsrc=r=48000:cl=stereo'];
    cueItems.forEach((_, index) => inputs.push('-i', cueSources[index % cueSources.length]));
    let elapsed = 0;
    const cueFilters: string[] = ['[0:a]volume=0[base]'];
    cueItems.forEach((item, index) => {
      const sceneIndex = sceneContracts.findIndex((scene) => scene.sceneId === item.sceneId);
      elapsed = sceneContracts.slice(0, Math.max(0, sceneIndex)).reduce((sum, scene) => sum + scene.targetSeconds, 0) + 0.35;
      cueFilters.push(`[${index + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${index % 3 === 1 ? '0.16' : '0.11'},adelay=${Math.round(elapsed * 1000)}|${Math.round(elapsed * 1000)}[cue${index}]`);
    });
    const mixInputs = ['[base]', ...cueItems.map((_, index) => `[cue${index}]`)].join('');
    cueFilters.push(`${mixInputs}amix=inputs=${cueItems.length + 1}:normalize=0:duration=first,atrim=0:${duration}[out]`);
    runFfmpeg([...inputs, '-filter_complex', cueFilters.join(';'), '-map', '[out]', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', targetSfxBed]);
  }

  const targetMix = path.join(mixDir, 'mix.wav');
  if (!fs.existsSync(targetMix) || fs.statSync(targetMix).size < 1024) {
    runFfmpeg(['-i', targetMusicBed, '-i', targetSfxBed, '-filter_complex', '[0:a]volume=0.35[m];[1:a]volume=0.8[s];[m][s]amix=inputs=2:normalize=0:duration=longest[out]', '-map', '[out]', '-t', String(duration), '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', targetMix]);
  }

  const publicAudio = path.join(process.cwd(), 'public', 'editorial', 'execution', runId, 'audio');
  fs.mkdirSync(path.join(publicAudio, 'music'), {recursive: true});
  fs.mkdirSync(path.join(publicAudio, 'sfx'), {recursive: true});
  fs.copyFileSync(targetMusicBed, path.join(publicAudio, 'music', 'bed.wav'));
  fs.copyFileSync(targetSfxBed, path.join(publicAudio, 'sfx', 'bed.wav'));

  const cuePlan = cueItems.map((item, index) => ({
    sceneId: item.sceneId,
    cue: item.cues[0],
    source: cueSources[index % cueSources.length],
    sha256: crypto.createHash('sha256').update(fs.readFileSync(cueSources[index % cueSources.length])).digest('hex'),
    gain: index % 3 === 1 ? 0.16 : 0.11,
    reason: 'Narrative evidence or chapter punctuation',
  }));
  fs.writeFileSync(path.join(runDir, 'audio', 'sfx', 'cue-plan.json'), `${JSON.stringify(cuePlan, null, 2)}\n`, 'utf8');

  return {plan, wordStatus: 'AUDIO_DISPATCHED'};
}

if (require.main === module) {
  runAudioBedDispatch().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error('\n❌ STATUS NO DISPATCH DE ÁUDIO:', err.message);
    process.exit(1);
  });
}
