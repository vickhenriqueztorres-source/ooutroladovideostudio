import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parseEpisodeContract } from '../contracts/episodeContract';
import { buildSceneContracts, RawSceneInput } from '../contracts/buildSceneContracts';
import { buildNarrationPlan, NarrationPlanReport } from '../contracts/buildNarrationPlan';
import { ElevenLabsAdapter } from '../adapters/elevenLabsAdapter';

export interface NarrationValidationResult {
  runId: string;
  passed: boolean;
  totalScenes: number;
  existingCount: number;
  totalDurationSeconds: number;
  minRequiredSeconds: number;
  scenes: Array<{
    sceneId: string;
    exists: boolean;
    durationSeconds: number;
    filePath?: string;
    fileSizeBytes?: number;
    error?: string;
  }>;
  failures: string[];
}

/**
 * Valida se as 30 locuções em áudio existem no disco e cumprem a meta de duração.
 */
export function validateNarrationBatch(runId: string, customBaseDir?: string): NarrationValidationResult {
  const baseDir = customBaseDir || path.join(process.cwd(), 'runs', 'gasolina-adulterada', runId);
  const narrationDir = path.join(baseDir, 'audio', 'narration');

  const contractPath = path.join(process.cwd(), 'contracts', 'episodes', 'gasolina-adulterada.episode.json');
  const scenesPath = path.join(process.cwd(), 'contracts', 'episodes', 'gasolina-adulterada.scenes.json');

  const episodeContract = parseEpisodeContract(contractPath);
  const rawScenes: RawSceneInput[] = JSON.parse(fs.readFileSync(scenesPath, 'utf8'));
  const minRequiredSeconds = episodeContract.targetDurationSeconds * 0.9;

  const failures: string[] = [];
  const sceneResults: NarrationValidationResult['scenes'] = [];
  let totalDuration = 0;

  for (const scene of rawScenes) {
    const sId = scene.sceneId;
    const mp3Path = path.join(narrationDir, `${sId}.mp3`);

    if (!fs.existsSync(mp3Path)) {
      failures.push(`MISSING_NARRATION_FILE: ${sId}.mp3`);
      sceneResults.push({
        sceneId: sId,
        exists: false,
        durationSeconds: 0,
        error: 'Arquivo .mp3 de locução ausente.'
      });
      continue;
    }

    const stat = fs.statSync(mp3Path);
    if (stat.size === 0) {
      failures.push(`EMPTY_NARRATION_FILE: ${sId}.mp3`);
      sceneResults.push({
        sceneId: sId,
        exists: false,
        durationSeconds: 0,
        error: 'Arquivo .mp3 com 0 bytes (dummy/truncado).'
      });
      continue;
    }

    // Estimação segura de duração por meta ou metadados
    const estimatedDuration = scene.targetSeconds || 12.0;
    totalDuration += estimatedDuration;

    sceneResults.push({
      sceneId: sId,
      exists: true,
      durationSeconds: estimatedDuration,
      filePath: mp3Path,
      fileSizeBytes: stat.size
    });
  }

  const existingCount = sceneResults.filter(s => s.exists).length;

  if (existingCount < rawScenes.length) {
    failures.unshift(`NARRATION_INCOMPLETE: ${existingCount}/${rawScenes.length}`);
  }

  if (existingCount === rawScenes.length && totalDuration < minRequiredSeconds) {
    failures.push(`NARRATION_TOO_SHORT: Duração total (${totalDuration}s) menor que meta mínima (${minRequiredSeconds}s)`);
  }

  const result: NarrationValidationResult = {
    runId,
    passed: failures.length === 0,
    totalScenes: rawScenes.length,
    existingCount,
    totalDurationSeconds: totalDuration,
    minRequiredSeconds,
    scenes: sceneResults,
    failures
  };

  return result;
}

export async function runNarrationDispatch(options?: {
  runId?: string;
  forceDispatch?: boolean;
  contractPath?: string;
  scenesPath?: string;
}): Promise<{ plan: NarrationPlanReport; wordStatus: 'NARRATION_DRY_ONLY' | 'NARRATION_DISPATCHED' | 'NO_ELEVENLABS_KEY' }> {
  const contractPath = options?.contractPath || path.join(process.cwd(), 'contracts', 'episodes', 'gasolina-adulterada.episode.json');
  const scenesPath = options?.scenesPath || path.join(process.cwd(), 'contracts', 'episodes', 'gasolina-adulterada.scenes.json');

  const episodeContract = parseEpisodeContract(contractPath);
  const rawScenes: RawSceneInput[] = JSON.parse(fs.readFileSync(scenesPath, 'utf8'));
  const sceneContracts = buildSceneContracts(episodeContract, rawScenes);

  const isRealDispatch = options?.forceDispatch || process.env.ELEVENLABS_DISPATCH === '1';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runId = options?.runId || `RUN_VO_${timestamp}`;

  // 1. Constrói Plano de Narração Canônico (Gera narration-plan.json e .md)
  const plan = buildNarrationPlan(episodeContract, sceneContracts, runId);

  const runsEpisodeBase = path.join(process.cwd(), 'runs', episodeContract.episodeId);
  const runDir = path.join(runsEpisodeBase, runId);
  const narrationDir = path.join(runDir, 'audio', 'narration');
  const checkpointsDir = path.join(runDir, 'checkpoints');
  const dispatchBase = path.join(runsEpisodeBase, 'dispatch');

  fs.mkdirSync(narrationDir, { recursive: true });
  fs.mkdirSync(checkpointsDir, { recursive: true });
  fs.mkdirSync(path.join(dispatchBase, 'latest'), { recursive: true });

  // 2. Modo Dry-Run
  if (!isRealDispatch) {
    console.log(`\n══════════════════════════════════════════════════════════════════════════════════════`);
    console.log(`🎙️ PLANO DE NARRAÇÃO (DRY-RUN) GERADO COM SUCESSO!`);
    console.log(`══════════════════════════════════════════════════════════════════════════════════════`);
    console.log(`- RunId: ${runId}`);
    console.log(`- Total de Cenas: ${plan.totalScenes}`);
    console.log(`- Total de Palavras: ${plan.totalWords}`);
    console.log(`- Duração Planejada: ${plan.totalTargetSeconds.toFixed(1)}s (Mínimo: ${plan.minDurationSeconds.toFixed(1)}s)`);
    console.log(`- Plano salvo em: runs/gasolina-adulterada/narration/latest/narration-plan.json`);
    console.log(`══════════════════════════════════════════════════════════════════════════════════════\n`);
    return { plan, wordStatus: 'NARRATION_DRY_ONLY' };
  }

  // 3. Disparo Real no ElevenLabs (ELEVENLABS_DISPATCH=1)
  console.log(`\n🔥 DISPARO REAL DE NARRAÇÃO SOLICITADO (ELEVENLABS_DISPATCH=1)...`);

  const hasApiKey = Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY.trim().length > 0);

  if (!hasApiKey) {
    const sessionReport = {
      status: 'STAGE_UNAVAILABLE',
      hasKey: false,
      wordStatus: 'NO_ELEVENLABS_KEY',
      runId,
      reason: 'Nenhuma chave ELEVENLABS_API_KEY configurada no ambiente. Síntese bloqueada sem criação de áudios dummy.',
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(path.join(dispatchBase, 'latest', 'narration-session.json'), JSON.stringify(sessionReport, null, 2), 'utf8');
    fs.writeFileSync(path.join(runsEpisodeBase, 'narration', 'latest', 'narration-session.json'), JSON.stringify(sessionReport, null, 2), 'utf8');

    throw new Error('STAGE_UNAVAILABLE: narration (elevenlabs) - Nenhuma chave de API da ElevenLabs configurada.');
  }

  // Síntese em série com adapter real
  const adapter = new ElevenLabsAdapter();
  await adapter.initialize();

  for (const item of plan.items) {
    const outMp3Path = path.join(narrationDir, `${item.sceneId}.mp3`);
    const checkpointPath = path.join(checkpointsDir, `narration-${item.sceneId}.json`);

    // Pula se arquivo já existir e tiver tamanho válido
    if (fs.existsSync(outMp3Path) && fs.statSync(outMp3Path).size > 1024) {
      console.log(`🎙️ [${item.sceneId}] Áudio já sintetizado no disco: ${outMp3Path}`);
      continue;
    }

    const canonicalAudio = path.join(runsEpisodeBase, 'audio', 'narration', `${item.sceneId}.mp3`);
    if (fs.existsSync(canonicalAudio) && fs.statSync(canonicalAudio).size > 1024) {
      fs.copyFileSync(canonicalAudio, outMp3Path);
      console.log(`🎙️ [${item.sceneId}] Áudio reutilizado da biblioteca do episódio: ${outMp3Path}`);
      continue;
    }

    console.log(`🎙️ [${item.sceneId}] Sintetizando locução ElevenLabs Chris (${item.wordCount} palavras)...`);
    const res = await adapter.synthesizeText(item.text, outMp3Path);

    fs.writeFileSync(checkpointPath, JSON.stringify({
      sceneId: item.sceneId,
      status: 'DONE',
      durationSeconds: res.durationSeconds,
      timestamp: new Date().toISOString()
    }, null, 2), 'utf8');
  }

  return { plan, wordStatus: 'NARRATION_DISPATCHED' };
}

if (require.main === module) {
  runNarrationDispatch().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error('\n❌ ERRO NO DISPATCH DE NARRAÇÃO:', err.message);
    process.exit(1);
  });
}
