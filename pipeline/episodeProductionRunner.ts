import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execSync, spawnSync } from 'child_process';
import { parseEpisodeContract, EpisodeContract, EpisodeStage } from '../contracts/episodeContract';
import { buildSceneContracts, RawSceneInput } from '../contracts/buildSceneContracts';
import { SceneVisualContract } from '../contracts/sceneVisualContract';
import { assertCinematicPipelineActive } from '../config/hslCinematicFlags';
import { NarrativeBeatDirectorAgent } from '../hsl/cinematic/agents/narrativeBeatDirectorAgent';
import { CinematicShotDirectorAgent } from '../hsl/cinematic/agents/cinematicShotDirectorAgent';
import { ContinuityDirectorAgent } from '../hsl/cinematic/agents/continuityDirectorAgent';
import { CinematicSceneConceptionEngine } from '../hsl/cinematic/agents/cinematicSceneConceptionEngine';
import { Beat, BeatsArraySchema, mapCategoryToNarrativeFunction, NarrativeFunction } from '../hsl/cinematic/schemas/beatSchema';
import { runNarrationDispatch } from '../scripts/dispatchNarrationBatch';
import { runAudioBedDispatch } from '../scripts/dispatchAudioBed';
import { HybridVideoEngine, HybridSceneInput } from './hybridVideoEngine';
import { PipelineContractGate, RunValidationReport } from './pipelineContractGate';
import { ProductionSafetyGuard } from '../config/productionSafetyGuard';
import { StartFrameGenerator } from '../hsl/startframe/startFrameGenerator';
import { buildFireflyPrompt } from '../contracts/buildFireflyPrompt';
import { RunManifest } from './runManifest';
import { validateCanonBalance, assertBeatsTimingAnchored } from './canonBalanceCheck';
import { AgentTelemetryCinematicSink } from '../hsl/cinematic/telemetry/cinematicTelemetry';
import { HSL_CINEMATIC_BRAND_RULES } from '../hsl/cinematic/config/hslCinematicShotGrammar';
import {FIREFLY_GENERATION_PROFILE} from '../config/fireflyGenerationConfig';
import { Logger } from '../event-hub/logger';
import { WorkflowTracker } from './orchestration/workflowTracker';
import { executeWithRetry } from './orchestration/retryEngine';
import { AgentCommunicationBridge } from '../event-hub/agentCommunicationBridge';
import { MotionDirectorAgent } from './agents/motionDirectorAgent';
import { MotionQualityGate } from './gates/motionQualityGate';

const EPISODE_COMPOSITIONS: Record<string, string> = {
  'gps-tempo': 'EpisodeGps',
  'gasolina-adulterada': 'EpisodeGasolina',
  'drones-agro': 'EpisodeDronesAgro',
  'drones-agro-noturnos': 'EpisodeDronesAgroNoturnos',
  'energia-ia-data-centers': 'EpisodeEnergiaIaDataCenters',
  'leite-cadeia-frio': 'EpisodeMilk',
  'nota-100-reais': 'EpisodeNota100',
  'raio-x-aeroporto': 'EpisodeRaioX',
  'sala-cofre-apuracao': 'EpisodeSalaCofre',
  'linha-segura-presidencial': 'EpisodeLinhaSegura',
  'rede-eletrica-60hz': 'EpisodeRedeEletrica'
};

function resolveEpisodeComposition(episodeId: string): string {
  const composition = EPISODE_COMPOSITIONS[episodeId];
  if (!composition) {
    throw new Error(
      `REMOTION_COMPOSITION_NOT_REGISTERED:${episodeId}. Registre uma composição CinematicEpisode antes do render; substituição por EpisodeGasolina é proibida.`
    );
  }
  return composition;
}

function resolveEpisodeTimeline(episodeId: string): unknown {
  switch (episodeId) {
    case 'gps-tempo':
      return require('../remotion/episodeGpsTimelineData').EPISODE_GPS_CALCULATED_TIMELINE;
    case 'gasolina-adulterada':
      return require('../remotion/episodeGasolinaTimelineData').EPISODE_GASOLINA_CALCULATED_TIMELINE;
    case 'drones-agro':
      return require('../remotion/episodeDronesAgroFieldTimelineData').EPISODE_DRONES_AGRO_FIELD_CALCULATED_TIMELINE;
    case 'drones-agro-noturnos':
      return require('../remotion/episodeDronesAgroNoturnosTimelineData').EPISODE_DRONES_AGRO_NOTURNOS_CALCULATED_TIMELINE;
    case 'energia-ia-data-centers':
      return require('../remotion/episodeEnergiaIaDataCentersTimelineData').EPISODE_ENERGIA_IA_CALCULATED_TIMELINE;
    case 'leite-cadeia-frio':
      return require('../remotion/episodeMilkTimelineData').EPISODE_MILK_CALCULATED_TIMELINE;
    case 'nota-100-reais':
      return require('../remotion/episodeNota100TimelineData').EPISODE_NOTA_100_CALCULATED_TIMELINE;
    case 'raio-x-aeroporto':
      return require('../remotion/episodeRaioXTimelineData').EPISODE_RAIO_X_CALCULATED_TIMELINE;
    case 'sala-cofre-apuracao':
      return require('../remotion/episodeSalaCofreTimelineData').EPISODE_SALA_COFRE_CALCULATED_TIMELINE;
    case 'linha-segura-presidencial':
      return require('../remotion/episodeLinhaSeguraTimelineData').EPISODE_LINHA_SEGURA_CALCULATED_TIMELINE;
    case 'rede-eletrica-60hz':
      return require('../remotion/episodeRedeEletrica60hzTimelineData').EPISODE_REDE_ELETRICA_CALCULATED_TIMELINE;
    default:
      throw new Error(`CINEMATIC_TIMELINE_NOT_REGISTERED:${episodeId}`);
  }
}

/**
 * O Remotion copia o publicDir inteiro para o bundle. O public global acumula
 * takes de todas as runs e pode consumir o disco antes do render começar.
 * Cada render recebe uma cópia isolada apenas dos assets desta run.
 */
function prepareIsolatedRemotionPublicDir(runDir: string, runId: string): string {
  const sourceRoot = path.join(process.cwd(), 'public');
  const isolatedRoot = path.join(runDir, '.remotion-public');
  fs.rmSync(isolatedRoot, { recursive: true, force: true });
  fs.mkdirSync(isolatedRoot, { recursive: true });

  const requiredRoots = [
    path.join('editorial', 'execution', runId),
    'assets',
    'identity',
    'episodes',
    'audio',
  ];
  for (const relativeRoot of requiredRoots) {
    const source = path.join(sourceRoot, relativeRoot);
    if (!fs.existsSync(source)) continue;
    const target = path.join(isolatedRoot, relativeRoot);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(source, target, { recursive: true });
  }

  return isolatedRoot;
}

export interface EpisodeProductionOptions {
  contractPath: string;
  scenesPath: string;
  runId?: string;
  dryRun?: boolean;
  stages?: EpisodeStage[];
  visualsScope?: 'all' | 'firefly-videos';
}

export interface EpisodeProductionResult {
  runId: string;
  episodeId: string;
  success: boolean;
  totalScenes: number;
  durationSeconds: number;
  stagesCompleted: string[];
  report: RunValidationReport;
}

export async function runEpisodeProduction(options: EpisodeProductionOptions): Promise<EpisodeProductionResult> {
  ProductionSafetyGuard.assertSafeForProduction();

  // 1. Parse de Contratos Zod Obrigatórios
  if (!fs.existsSync(options.contractPath)) {
    throw new Error(`EPISODE_CONTRACT_FILE_NOT_FOUND: Arquivo de contrato '${options.contractPath}' não encontrado.`);
  }
  if (!fs.existsSync(options.scenesPath)) {
    throw new Error(`SCENE_CONTRACTS_FILE_NOT_FOUND: Arquivo de cenas '${options.scenesPath}' não encontrado.`);
  }

  const episodeContract: EpisodeContract = parseEpisodeContract(options.contractPath);
  const rawScenesInput: RawSceneInput[] = JSON.parse(fs.readFileSync(options.scenesPath, 'utf8'));
  const conceptionEngine = new CinematicSceneConceptionEngine();
  const rawScenes: RawSceneInput[] = conceptionEngine.processScenes(rawScenesInput);
  const sceneContracts: SceneVisualContract[] = buildSceneContracts(episodeContract, rawScenes);
  const selectedStages = options.stages && options.stages.length > 0
    ? Array.from(new Set(options.stages))
    : episodeContract.requiredStages;
  for (const stage of selectedStages) {
    if (!episodeContract.requiredStages.includes(stage)) {
      throw new Error(`EPISODE_STAGE_NOT_AUTHORIZED_BY_CONTRACT:${stage}`);
    }
  }

  // 2. Validação da Flag de Produção Master Cinematográfica
  assertCinematicPipelineActive(true);

  // 3. Estruturação dos Diretórios Isolados da Run
  const runId = options.runId || `RUN_${Date.now()}`;
  const episodeRunsBase = path.join(process.cwd(), 'runs', episodeContract.episodeId);
  const runDir = path.join(episodeRunsBase, runId);
  const checkpointsDir = path.join(runDir, 'checkpoints');
  const executionScenesDir = path.join(runDir, 'editorial', 'execution', 'scenes');
  const postprodDir = path.join(runDir, 'postproduction');
  const thumbDir = path.join(postprodDir, 'thumbnails');
  const audioScenesDir = path.join(runDir, 'audio_scenes');
  const publicDir = path.join(process.cwd(), 'public', 'editorial', 'execution', runId, 'scenes');

  fs.mkdirSync(checkpointsDir, { recursive: true });
  fs.mkdirSync(executionScenesDir, { recursive: true });
  fs.mkdirSync(postprodDir, { recursive: true });
  fs.mkdirSync(thumbDir, { recursive: true });
  fs.mkdirSync(audioScenesDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });

  // Configura gravação de logs em disco na pasta isolada da run
  const logsDir = path.join(runDir, 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  Logger.configureRunLogger(logsDir);

  // Inicializa o rastreador de status do workflow
  const allStages = ['cinematic_direction', ...selectedStages, 'contract_gate'];
  const workflow = new WorkflowTracker({
    runId,
    episodeId: episodeContract.episodeId,
    runDir,
    stages: allStages
  });
  workflow.start();

  AgentCommunicationBridge.getInstance().publish({
    sender: 'EpisodeProductionRunner',
    topic: 'WORKFLOW_STARTED',
    payload: { runId, episodeId: episodeContract.episodeId, stages: allStages }
  });

  // Salva contratos na run para auditoria e rastreabilidade
  fs.writeFileSync(path.join(runDir, 'episode.contract.json'), JSON.stringify(episodeContract, null, 2), 'utf8');
  fs.writeFileSync(path.join(runDir, 'scene_contracts.json'), JSON.stringify(sceneContracts, null, 2), 'utf8');

  // Compila e salva documentary-edit-package.json para conformidade do PipelineContractGate
  const editPackage = {
    episode_id: episodeContract.episodeId,
    title: episodeContract.title,
    total_scenes: sceneContracts.length,
    scenes: sceneContracts.map((sc, idx) => ({
      sceneId: sc.sceneId,
      shotId: `SHOT_${sc.sceneId}`,
      index: idx + 1,
      chapterId: sc.chapterId,
      chapterTitle: sc.chapterTitle,
      durationFrames: Math.round(sc.targetSeconds * 30),
      durationSeconds: sc.targetSeconds,
      voiceoverText: sc.voiceover,
      visualSubject: sc.visual_must_include.join(', '),
      takeType: sc.take_type,
      take_type: sc.take_type,
      category: sc.canon_category || sc.required_category,
      required_category: sc.required_category,
      canon_category: sc.canon_category,
      mediaFile: sc.take_type === 'KEYFRAME_DOSSIER' ? undefined : `episodes/${episodeContract.episodeId}/takes/${sc.sceneId}.mp4`
    }))
  };
  const execDir = path.join(runDir, 'editorial', 'execution');
  fs.mkdirSync(execDir, { recursive: true });
  fs.writeFileSync(path.join(execDir, 'documentary-edit-package.json'), JSON.stringify(editPackage, null, 2), 'utf8');
  fs.writeFileSync(path.join(execDir, 'edit_package.json'), JSON.stringify(editPackage, null, 2), 'utf8');
  fs.writeFileSync(path.join(runDir, 'edit_package.json'), JSON.stringify(editPackage, null, 2), 'utf8');
  const pubExecDir = path.join(process.cwd(), 'public', 'editorial', 'execution', runId);
  fs.mkdirSync(pubExecDir, { recursive: true });
  fs.writeFileSync(path.join(pubExecDir, 'documentary-edit-package.json'), JSON.stringify(editPackage, null, 2), 'utf8');

  const saveCheckpoint = (stage: string, data: unknown) => {
    fs.writeFileSync(path.join(checkpointsDir, `${stage}.json`), JSON.stringify({
      stage,
      timestamp: new Date().toISOString(),
      data
    }, null, 2), 'utf8');
  };

  const stagesCompleted: string[] = [];
  let visualSummary = {generatedVideos: 0, bankClips: 0, fallbackRemotion: 0};
  let renderedCompositionId: string | null = null;

  // 4. Execução dos Diretores Cinematográficos Bloqueantes (Beat -> Shot -> Continuity)
  workflow.transitionToStage('cinematic_direction', 'Validando direção de beats, enquadramentos e continuidade...');
  try {
    const telemetry = new AgentTelemetryCinematicSink();
    const beatDirector = new NarrativeBeatDirectorAgent(telemetry);
    const shotDirector = new CinematicShotDirectorAgent(telemetry);
    const continuityDirector = new ContinuityDirectorAgent(telemetry);

    const allEpisodeBeats: Beat[] = [];
    const existingClaimIds = new Set<string>(
      sceneContracts.map((s) => s.claimId || s.claim_id).filter((c): c is string => Boolean(c))
    );

    for (const sc of sceneContracts) {
      if (!sc.voiceover || sc.voiceover.length < 5) {
        throw new Error(`BEAT_DIRECTOR_FAILED: Cena '${sc.sceneId}' não possui voiceover adequado.`);
      }
      const rawCategory = sc.canon_category || sc.required_category || 'matter';
      let narrativeFunction: NarrativeFunction;
      try {
        narrativeFunction = mapCategoryToNarrativeFunction(rawCategory);
      } catch {
        try {
          narrativeFunction = mapCategoryToNarrativeFunction(sc.canon_category || 'matter');
        } catch {
          narrativeFunction = 'introduce_object';
        }
      }
      const claimId = sc.claimId || sc.claim_id || null;

      const beats = beatDirector.generateBeats({
        productionId: runId,
        episodeId: episodeContract.episodeId,
        sceneId: sc.sceneId,
        claimId,
        existingClaimIds,
        narrativeFunction,
        approvedScriptText: sc.voiceover,
        narrationAlignment: sc.narration_alignment as any
      }, (_prompt: string, span: Beat): [Beat, Beat] => {
        const midSec = Number(((span.t_start + span.t_end) / 2).toFixed(3));
        const words = span.transcript_span.split(/\s+/).filter(Boolean);
        const midWord = Math.max(1, Math.floor(words.length / 2));
        const span1 = words.slice(0, midWord).join(' ');
        const span2 = words.slice(midWord).join(' ');
        const b1: Beat = {
          ...span,
          id: `${span.id}_p1`,
          beat_id: `${span.id}_p1`,
          t_start: span.t_start,
          t_end: midSec,
          transcript_span: span1,
          script_span: {
            start_word: span.script_span.start_word,
            end_word: span.script_span.start_word + midWord
          },
          concept: `${span.concept}_estagio_inicial`,
          visual_claim: 'conjunto mecânico de precisão operando sob iluminação prática documental',
          hud_value: span.hud_value,
          timing: span.timing
        };
        const b2: Beat = {
          ...span,
          id: `${span.id}_p2`,
          beat_id: `${span.id}_p2`,
          t_start: midSec,
          t_end: span.t_end,
          transcript_span: span2,
          script_span: {
            start_word: span.script_span.start_word + midWord,
            end_word: span.script_span.end_word
          },
          concept: `${span.concept}_estagio_final`,
          visual_claim: 'superfície técnica registrando atividade mecânica contínua na inspeção',
          hud_value: null,
          timing: span.timing
        };
        return [b1, b2];
      });
      BeatsArraySchema.parse(beats);
      allEpisodeBeats.push(...beats);

      try {
        const shotDirection = shotDirector.run({
          productionId: runId,
          episodeId: episodeContract.episodeId,
          sceneId: sc.sceneId,
          narrativeFunction,
          visualMode: sc.visual_asset_class === 'VIDEO' ? 'cinematic_live_action' : 'motion_graphics',
          narrativeIntent: sc.voiceover,
          focusTargetCandidates: sc.visual_must_include,
          beats: beats as any,
          sceneContext: {
            chapterId: sc.chapterId,
            chapterTitle: sc.chapterTitle
          },
          brandRules: HSL_CINEMATIC_BRAND_RULES
        });
        (sc as any).cinematic_shot = shotDirection;
      } catch (shotErr: any) {
        Logger.warn('EpisodeProductionRunner', `Aviso ao calcular CinematicShotDirection para cena '${sc.sceneId}': ${shotErr.message}`);
      }
    }

    // Gate de ancoragem real de locução
    assertBeatsTimingAnchored(allEpisodeBeats, { dryRun: options.dryRun });

    saveCheckpoint('cinematic_direction', {
      beats: allEpisodeBeats.length,
      status: 'APPROVED'
    });
    stagesCompleted.push('cinematic_direction');
    workflow.completeStage('cinematic_direction');
  } catch (err: any) {
    workflow.fail(`Falha na direção cinematográfica: ${err.message}`);
    Logger.closeRunLogger();
    throw new Error(`CINEMATIC_DIRECTION_FAILED: Falha na direção cinematográfica obrigatória: ${err.message}`);
  }

  // 5. Execução Determinística de cada RequiredStage do Contrato
  for (const stage of selectedStages) {
    workflow.transitionToStage(stage);
    switch (stage) {
      case 'narration': {
        const { plan, wordStatus } = await executeWithRetry(
          'NarrationDispatch',
          () => runNarrationDispatch({
            runId,
            forceDispatch: !options.dryRun,
            contractPath: options.contractPath,
            scenesPath: options.scenesPath
          }),
          {
            runId,
            maxAttempts: 3,
            onRetry: (err, attempt) => {
              workflow.setRetrying('narration', attempt, 3, err.message);
            }
          }
        );

        saveCheckpoint('narration', {
          totalScenes: plan.totalScenes,
          totalWords: plan.totalWords,
          totalTargetSeconds: plan.totalTargetSeconds,
          status: wordStatus
        });
        if (!options.dryRun) {
          const narrationSource = path.join(runDir, 'audio', 'narration');
          const narrationPublic = path.join(process.cwd(), 'public', 'editorial', 'execution', runId, 'audio', 'narration');
          const narrationEpisode = path.join(process.cwd(), 'public', 'episodes', episodeContract.episodeId, 'audio', 'narration');
          fs.mkdirSync(narrationPublic, { recursive: true });
          fs.mkdirSync(narrationEpisode, { recursive: true });
          for (const file of fs.readdirSync(narrationSource).filter((name) => name.endsWith('.mp3'))) {
            fs.copyFileSync(path.join(narrationSource, file), path.join(narrationPublic, file));
            fs.copyFileSync(path.join(narrationSource, file), path.join(narrationEpisode, file));
          }

          // Monta narração mestre calibrada sincronizada com as durações da timeline
          try {
            const concatListPath = path.join(runDir, 'narration_concat.txt');
            const concatLines: string[] = [];
            const paddedTempDir = path.join(runDir, 'temp_padded_narration');
            fs.mkdirSync(paddedTempDir, { recursive: true });

            for (let i = 0; i < sceneContracts.length; i++) {
              const sc = sceneContracts[i];
              const sceneMp3 = path.join(narrationSource, `${sc.sceneId}.mp3`);
              const paddedMp3 = path.join(paddedTempDir, `${sc.sceneId}_padded.mp3`);
              const durSec = sc.targetSeconds;
              if (fs.existsSync(sceneMp3)) {
                execSync(`ffmpeg -y -i "${sceneMp3}" -af "apad=whole_dur=${durSec.toFixed(3)}" -t ${durSec.toFixed(3)} -ar 48000 -ac 2 -c:a libmp3lame -b:a 192k "${paddedMp3}"`, { stdio: 'ignore' });
              } else {
                execSync(`ffmpeg -y -f lavfi -i anullsrc=r=48000:cl=stereo -t ${durSec.toFixed(3)} -c:a libmp3lame -b:a 192k "${paddedMp3}"`, { stdio: 'ignore' });
              }
              concatLines.push(`file '${paddedMp3.replace(/\\/g, '/')}'`);
            }
            fs.writeFileSync(concatListPath, concatLines.join('\n'), 'utf8');

            const masterNarrationPath = path.join(postprodDir, 'narration.mp3');
            execSync(`ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${masterNarrationPath}"`, { stdio: 'ignore' });

            const totalExpectedDuration = sceneContracts.reduce((sum, sc) => sum + sc.targetSeconds, 0);
            try {
              const p = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', masterNarrationPath], { encoding: 'utf8' });
              const dur = Number(p.stdout.trim());
              if (Math.abs(dur - totalExpectedDuration) > 0.05) {
                const tempCalibrated = path.join(postprodDir, 'narration_cal.mp3');
                execSync(`ffmpeg -y -i "${masterNarrationPath}" -t ${totalExpectedDuration.toFixed(3)} -c copy "${tempCalibrated}"`, { stdio: 'ignore' });
                fs.copyFileSync(tempCalibrated, masterNarrationPath);
                fs.unlinkSync(tempCalibrated);
              }
            } catch {}

            const targetSyncPaths = [
              path.join(runDir, 'narration.mp3'),
              path.join(narrationSource, 'narration.mp3'),
              path.join(narrationPublic, 'narration.mp3'),
              path.join(process.cwd(), 'public', 'editorial', 'execution', runId, 'narration.mp3'),
              path.join(narrationEpisode, 'narration.mp3')
            ];
            for (const p of targetSyncPaths) {
              fs.mkdirSync(path.dirname(p), { recursive: true });
              fs.copyFileSync(masterNarrationPath, p);
            }
          } catch (concatErr: any) {
            Logger.warn('EpisodeProductionRunner', `Aviso ao montar master narration.mp3 calibrado: ${concatErr.message}`);
          }
        }
        stagesCompleted.push('narration');
        workflow.completeStage('narration');
        break;
      }

      case 'visuals': {
        const hybridScenesAll: HybridSceneInput[] = sceneContracts.map((sc, idx) => ({
          scene_id: sc.sceneId,
          chapter_id: sc.chapterId || `CH_${Math.floor(idx / 5) + 1}`,
          chapter_title: sc.chapterTitle || `Capítulo ${Math.floor(idx / 5) + 1}`,
          name: `Cena ${sc.sceneId}`,
          voiceover_text: sc.voiceover,
          visual_subject: sc.visualSubject || (sc as any).visual_subject || sc.visual_must_include.join(', '),
          take_type: sc.take_type,
          visual_asset_class: sc.visual_asset_class,
          generation_priority: sc.generation_priority,
          narrative_archetype: sc.narrative_archetype,
          cinematic_shot: (sc as any).cinematic_shot,
          visual_must_include: sc.visual_must_include,
          visual_must_not: sc.visual_must_not,
          required_category: sc.required_category,
          tags: sc.domainTags,
          allowed_sources: sc.allowed_sources
        }));
        const hybridScenes = options.visualsScope === 'firefly-videos'
          ? hybridScenesAll.filter((scene) => scene.visual_asset_class === 'VIDEO')
          : hybridScenesAll;

        const engine = new HybridVideoEngine();
        if (!options.dryRun) {
          const startFrameItems = hybridScenes.map((scene) => {
            const prompt = buildFireflyPrompt({
              scene_id: scene.scene_id,
              visual_subject: scene.visual_subject,
              visual_must_include: scene.visual_must_include,
              visual_must_not: scene.visual_must_not,
              required_category: scene.required_category,
              domainTags: scene.tags || [],
              take_type: scene.take_type,
              generation_priority: scene.generation_priority,
              narrative_archetype: scene.narrative_archetype,
              cinematic_shot: scene.cinematic_shot
            });
            return {
              sceneId: scene.scene_id,
              prompt: prompt.prompt,
              subject: scene.visual_subject,
              chapterTitle: scene.chapter_title,
              forbidPeople: episodeContract.startFramePeoplePolicy === 'FORBIDDEN'
            };
          });
          const attachStartFrames = FIREFLY_GENERATION_PROFILE.requires_first_frame;
          workflow.updateSubStep('Sintetizando / validando Start Frames das cenas...');
          const generatedFrames = attachStartFrames
            ? await executeWithRetry(
                'StartFrameGenerator',
                () => new StartFrameGenerator().generateAll(
                  episodeContract.episodeId,
                  path.join(runDir, 'editorial', 'execution'),
                  startFrameItems
                ),
                {
                  runId,
                  maxAttempts: 3,
                  onRetry: (err, attempt) => {
                    workflow.setRetrying('start_frames', attempt, 3, err.message);
                  }
                }
              )
            : [];
          saveCheckpoint('image_engine', {
            status: attachStartFrames ? 'START_FRAMES_READY' : 'DEFERRED_TO_FIREFLY_VIDEO_FRAME_EXTRACTION',
            generatedFrames: generatedFrames.length
          });
          stagesCompleted.push('image_engine');

          workflow.updateSubStep('Processando takes de vídeo (Firefly / Banco documental)...');
          const visualResult = await executeWithRetry(
            'HybridVideoEngine',
            () => engine.processEpisodeScenes({
              runId,
              scenes: hybridScenes,
              runDirectory: runDir,
              publicExecutionDirectory: publicDir,
              forceFireflyAll: options.visualsScope === 'firefly-videos'
            }),
            {
              runId,
              maxAttempts: 3,
              onRetry: (err, attempt) => {
                workflow.setRetrying('visuals_video_engine', attempt, 3, err.message);
              }
            }
          );
          visualSummary = {
            generatedVideos: visualResult.generatedByFirefly,
            bankClips: visualResult.matchedFromBank,
            fallbackRemotion: 0
          };
        }

        saveCheckpoint('visuals', {
          totalScenes: hybridScenes.length,
          totalEpisodeScenes: hybridScenesAll.length,
          visualsScope: options.visualsScope || 'all',
          visualMix: episodeContract.visualMix,
          startFramePeoplePolicy: episodeContract.startFramePeoplePolicy,
          ...visualSummary
        });
        stagesCompleted.push('visuals');
        workflow.completeStage('visuals');
        break;
      }

      case 'sfx': {
        const { plan, wordStatus } = await executeWithRetry(
          'SfxDispatch',
          () => runAudioBedDispatch({
            runId,
            stage: 'sfx',
            forceDispatch: !options.dryRun,
            contractPath: options.contractPath,
            scenesPath: options.scenesPath
          }),
          {
            runId,
            maxAttempts: 3,
            onRetry: (err, attempt) => {
              workflow.setRetrying('sfx', attempt, 3, err.message);
            }
          }
        );

        saveCheckpoint('sfx', { totalScenes: plan.totalScenes, totalCues: plan.totalSfxCues, status: wordStatus });
        stagesCompleted.push('sfx');
        workflow.completeStage('sfx');
        break;
      }

      case 'music': {
        const { plan, wordStatus } = await executeWithRetry(
          'MusicDispatch',
          () => runAudioBedDispatch({
            runId,
            stage: 'music',
            forceDispatch: !options.dryRun,
            contractPath: options.contractPath,
            scenesPath: options.scenesPath
          }),
          {
            runId,
            maxAttempts: 3,
            onRetry: (err, attempt) => {
              workflow.setRetrying('music', attempt, 3, err.message);
            }
          }
        );

        saveCheckpoint('music', { mood: plan.musicMood, targetSeconds: plan.musicTargetSeconds, status: wordStatus });
        stagesCompleted.push('music');
        workflow.completeStage('music');
        break;
      }

      case 'mix': {
        const { plan, wordStatus } = await executeWithRetry(
          'MixDispatch',
          () => runAudioBedDispatch({
            runId,
            stage: 'mix',
            forceDispatch: !options.dryRun,
            contractPath: options.contractPath,
            scenesPath: options.scenesPath
          }),
          {
            runId,
            maxAttempts: 3,
            onRetry: (err, attempt) => {
              workflow.setRetrying('mix', attempt, 3, err.message);
            }
          }
        );

        saveCheckpoint('mix', { targetSeconds: plan.contract.mix.targetSeconds, status: wordStatus });
        stagesCompleted.push('mix');
        workflow.completeStage('mix');
        break;
      }

      case 'thumbnail': {
        if (!options.dryRun) {
          const sourceIndexes = [0, Math.floor(sceneContracts.length / 2), sceneContracts.length - 1];
          const filenames = [
            'thumbnail_variant_a_mechanism.png',
            'thumbnail_variant_b_consequence.png',
            'thumbnail_variant_c_final_handoff.png'
          ];
          sourceIndexes.forEach((sourceIndex, variantIndex) => {
            const sceneId = sceneContracts[sourceIndex].sceneId;
            const sourceVideo = path.join(executionScenesDir, sceneId, 'firefly_take.mp4');
            const sourceImage = path.join(executionScenesDir, sceneId, 'firefly_start_frame.png');
            const target = path.join(thumbDir, filenames[variantIndex]);
            if (fs.existsSync(sourceVideo)) {
              execSync(`ffmpeg -y -ss 00:00:01.2 -i "${sourceVideo}" -frames:v 1 -vf "scale=3840:2160:flags=lanczos,eq=contrast=1.04:saturation=0.94" "${target}"`, {stdio: 'ignore'});
            } else if (fs.existsSync(sourceImage)) {
              execSync(`ffmpeg -y -i "${sourceImage}" -vf "scale=3840:2160:flags=lanczos,eq=contrast=1.04:saturation=0.94" "${target}"`, {stdio: 'ignore'});
            } else {
              throw new Error(`THUMBNAIL_SOURCE_VIDEO_MISSING:${sceneId}`);
            }
          });
          const episodeDescription = episodeContract.theme
            ? `${episodeContract.title}\n\n${episodeContract.theme}.\n\nFontes: Gabinete de Segurança Institucional (GSI), Exército Brasileiro (DCT), Telebras, Anatel, FAB e documentos de auditoria pública.\n\nINVESTIGAR. REVELAR. COMPREENDER.`
            : [
                episodeContract.title,
                '',
                'Documentário investigativo de campo revelando a engenharia invisível e os bastidores dos sistemas de soberania nacional.',
                '',
                'Fontes e dados são identificados no episódio.',
                '',
                'INVESTIGAR. REVELAR. COMPREENDER.'
              ].join('\n');
          fs.writeFileSync(path.join(postprodDir, 'description.txt'), episodeDescription, 'utf8');
          fs.writeFileSync(path.join(postprodDir, 'youtube-metadata.json'), `${JSON.stringify({
            title: episodeContract.title,
            language: 'pt-BR',
            category: 'Ciência e tecnologia',
            disclosure: 'Cenas documentais foram geradas com Adobe Firefly Video e editadas no Remotion; dados e fontes são identificados no episódio.',
            tags: episodeContract.domainTags,
          }, null, 2)}\n`, 'utf8');
        }
        saveCheckpoint('thumbnail', { thumbDir });
        stagesCompleted.push('thumbnail');
        workflow.completeStage('thumbnail');
        break;
      }

      case 'render': {
        const masterVideoPath = path.join(runDir, 'final_master.mp4');
        const compositionId = resolveEpisodeComposition(episodeContract.episodeId);

        if (!options.dryRun) {
          // A. Compilação e Validação do Contrato de Motion Graphics (Padrão HSL 2026)
          workflow.updateSubStep('Compilando pacote de Motion Graphics & HUDs...');
          const motionAgent = new MotionDirectorAgent();
          const motionPkg = motionAgent.buildMotionPackage({
            episodeId: episodeContract.episodeId,
            runId,
            rawScenes: sceneContracts,
            enableAutonomous3DSquad: true
          });
          const motionValidation = MotionQualityGate.validate(motionPkg);
          if (!motionValidation.valid) {
            throw new Error(`MOTION_QUALITY_GATE_FAILED: Score=${motionValidation.score}. Erros: ${motionValidation.reasons.join('; ')}`);
          }
          fs.writeFileSync(path.join(runDir, 'motion_package.json'), JSON.stringify(motionPkg, null, 2), 'utf8');
          saveCheckpoint('motion_design', {
            qualityScore: motionValidation.score,
            motionGraphicsPercentage: motionPkg.distributionReport.motionGraphicsPercentage,
            totalCallouts: motionPkg.distributionReport.totalCallouts
          });
          stagesCompleted.push('motion_design');

          workflow.updateSubStep(`Validando balanço canônico e timeline Remotion '${compositionId}'...`);
          const balance = validateCanonBalance(sceneContracts, {throwOnViolation: true});
          fs.writeFileSync(path.join(runDir, 'canon-balance-report.json'), `${JSON.stringify(balance, null, 2)}\n`, 'utf8');
          const timelineData = resolveEpisodeTimeline(episodeContract.episodeId) as any;
          fs.writeFileSync(path.join(postprodDir, 'scene_timings.json'), `${JSON.stringify({
            runId,
            fps: timelineData.fps,
            totalDurationFrames: timelineData.totalDurationFrames,
            totalDurationSeconds: timelineData.totalDurationSeconds,
            scenes: timelineData.scenes.map((scene: any) => ({
              sceneId: scene.id,
              startFrame: scene.startFrame,
              durationFrames: scene.durationFrames,
              endFrame: scene.endFrame,
            })),
          }, null, 2)}\n`, 'utf8');
          const preRenderReport = PipelineContractGate.auditRun({
            runId,
            runsDir: episodeRunsBase,
            contract: episodeContract,
            sceneContracts,
            stageScope: 'PRE_RENDER'
          });
          if (!preRenderReport.passed) {
            PipelineContractGate.printReport(preRenderReport);
            throw new Error(
              `PRE_RENDER_VISUAL_GATE_FAILED:${preRenderReport.failures.length}. ` +
              'O Remotion nao pode iniciar com takes sem procedencia, congelados ou derivados de motion graphics.'
            );
          }
          const isolatedPublicDir = prepareIsolatedRemotionPublicDir(runDir, runId);
          const requestedRemotionConcurrency = Number(process.env.REMOTION_CONCURRENCY || 4) || 4;
          const remotionConcurrency = Math.min(
            Math.max(1, requestedRemotionConcurrency),
            Math.max(1, os.cpus().length),
          );
          const remotionCmd = `npx remotion render remotion/index.ts ${compositionId} "${masterVideoPath}" --public-dir "${isolatedPublicDir}" --concurrency=${remotionConcurrency} --gl=angle`;
          workflow.updateSubStep(`Renderizando master com Remotion (concorrência ${remotionConcurrency})...`);
          try {
            execSync(remotionCmd, { stdio: 'inherit' });
          } finally {
            fs.rmSync(isolatedPublicDir, { recursive: true, force: true });
          }
        }
        renderedCompositionId = compositionId;
        saveCheckpoint('render', { masterVideoPath, compositionId });
        stagesCompleted.push('render');
        workflow.completeStage('render');
        break;
      }

      case 'cinematic_grade': {
        if (!options.dryRun) {
          const timelineData = resolveEpisodeTimeline(episodeContract.episodeId);

          const { writeCinematicRenderManifest } = require('../remotion/cinema/CinematicEpisode');
          const masterVideoPath = path.join(runDir, 'final_master.mp4');
          if (!fs.existsSync(masterVideoPath)) {
            throw new Error(`CINEMATIC_MASTER_MISSING:${masterVideoPath}`);
          }
          const probe = PipelineContractGate.probeMedia(masterVideoPath);
          if (!probe.valid || probe.codec !== 'h264' || probe.width !== 1920 || probe.height !== 1080) {
            throw new Error(`CINEMATIC_MASTER_INVALID:${JSON.stringify(probe)}`);
          }
          const frozenRatio = PipelineContractGate.calculateFrozenRatio(masterVideoPath, probe.duration);
          if (frozenRatio >= 0.85) {
            throw new Error(`CINEMATIC_MASTER_STATIC:${(frozenRatio * 100).toFixed(1)}%`);
          }
          const outputEvidence = {
            path: masterVideoPath,
            sha256: crypto.createHash('sha256').update(fs.readFileSync(masterVideoPath)).digest('hex'),
            sizeBytes: fs.statSync(masterVideoPath).size,
            durationSeconds: probe.duration,
            codec: probe.codec,
            width: probe.width!,
            height: probe.height!,
            frozenRatio
          };
          writeCinematicRenderManifest(timelineData, runId, runDir, {
            compositionId: renderedCompositionId || resolveEpisodeComposition(episodeContract.episodeId),
            output: outputEvidence
          });
        }
        saveCheckpoint('cinematic_grade', { compositor: 'CinematicEpisode', grade: '35mm' });
        stagesCompleted.push('cinematic_grade');
        workflow.completeStage('cinematic_grade');
        break;
      }

      default:
        throw new Error(`STAGE_UNAVAILABLE: ${stage} - Etapa desconhecida no pipeline.`);
    }
  }

  const partialRun = selectedStages.length !== episodeContract.requiredStages.length ||
    selectedStages.some((stage) => !episodeContract.requiredStages.includes(stage));
  if (options.dryRun || partialRun) {
    const report: RunValidationReport = options.dryRun
      ? {
          runId,
          contract: episodeContract,
          totalScenesExpected: sceneContracts.length,
          validStartFrames: 0,
          validVideoTakes: 0,
          validDossierVisuals: 0,
          validAudioClips: 0,
          narrationDurationSeconds: 0,
          timelineDurationSeconds: sceneContracts.reduce((sum, scene) => sum + scene.targetSeconds, 0),
          timingDeltaSeconds: 0,
          packagingValid: false,
          degradedScenes: [],
          failures: [],
          passed: true
        }
      : options.visualsScope === 'firefly-videos'
        ? (() => {
            const videoScenes = sceneContracts.filter((scene) => scene.visual_asset_class === 'VIDEO');
            const failures: RunValidationReport['failures'] = [];
            let validStartFrames = 0;
            let validVideoTakes = 0;
            for (const scene of videoScenes) {
              const sceneDir = path.join(executionScenesDir, scene.sceneId);
              const startFrame = path.join(sceneDir, 'firefly_start_frame.png');
              const video = path.join(sceneDir, 'firefly_take.mp4');
              if (PipelineContractGate.validateImageHeader(startFrame)) validStartFrames++;
              else failures.push({sceneId: scene.sceneId, shotId: scene.sceneId, index: 0, assetType: 'START_FRAME', expectedPath: startFrame, reason: 'START_FRAME_INVALID'});
              const probe = PipelineContractGate.probeMedia(video);
              if (
                probe.valid && probe.width === 1920 && probe.height === 1080 &&
                Math.abs(probe.duration - FIREFLY_GENERATION_PROFILE.duration_seconds) <= 0.75
              ) validVideoTakes++;
              else failures.push({sceneId: scene.sceneId, shotId: scene.sceneId, index: 0, assetType: 'VIDEO_TAKE', expectedPath: video, reason: `FIREFLY_TAKE_INVALID:${JSON.stringify(probe)}`});
            }
            return {
              runId,
              contract: episodeContract,
              totalScenesExpected: videoScenes.length,
              validStartFrames,
              validVideoTakes,
              validDossierVisuals: 0,
              validAudioClips: 0,
              narrationDurationSeconds: 0,
              timelineDurationSeconds: videoScenes.length * FIREFLY_GENERATION_PROFILE.duration_seconds,
              timingDeltaSeconds: 0,
              packagingValid: false,
              degradedScenes: [],
              failures,
              passed: failures.length === 0
            };
          })()
        : PipelineContractGate.auditRun({
          runId,
          runsDir: episodeRunsBase,
          contract: episodeContract,
          sceneContracts,
          stageScope: selectedStages.includes('visuals') ? 'PRE_RENDER' : 'PRE_MUX'
        });
    if (!options.dryRun) {
      PipelineContractGate.printReport(report);
      if (!report.passed) {
        new RunManifest(runDir, runId).setOverallStatus('FAILED');
        workflow.fail(`PARTIAL_EPISODE_GATE_FAILED:${report.failures.length}`);
        Logger.closeRunLogger();
        throw new Error(`PARTIAL_EPISODE_GATE_FAILED:${report.failures.length}`);
      }
    }
    saveCheckpoint(options.dryRun ? 'dry_run' : 'partial_run', {
      selectedStages,
      status: options.dryRun ? 'PLAN_VALIDATED' : 'PARTIAL_PRODUCTION_READY',
      overallStatus: 'RUNNING'
    });
    workflow.complete();
    Logger.closeRunLogger();
    return {
      runId,
      episodeId: episodeContract.episodeId,
      success: report.passed,
      totalScenes: sceneContracts.length,
      durationSeconds: sceneContracts.reduce((sum, scene) => sum + scene.targetSeconds, 0),
      stagesCompleted,
      report
    };
  }

  // 6. Auditoria Final do Gatekeeper Determinístico
  workflow.transitionToStage('contract_gate', 'Auditoria final do Pipeline Contract Gate...');
  const report = PipelineContractGate.auditRun({
    runId,
    runsDir: episodeRunsBase,
    contract: episodeContract,
    sceneContracts,
    stageScope: 'FULL_PACKAGE'
  });

  PipelineContractGate.printReport(report);

  if (!report.passed) {
    new RunManifest(runDir, runId).setOverallStatus('FAILED');
    process.exitCode = 1;
    workflow.fail(`EPISODE_GATE_FAILED: O Gatekeeper reprovou o pacote com ${report.failures.length} violações.`);
    Logger.closeRunLogger();
    throw new Error(`EPISODE_GATE_FAILED: O Gatekeeper reprovou o pacote do episódio com ${report.failures.length} violações.`);
  }

  const totalSeconds = sceneContracts.reduce((sum, sc) => sum + sc.targetSeconds, 0);

  const finalManifest = new RunManifest(runDir, runId);
  finalManifest.finalizeProduction({
    compositionId: renderedCompositionId || resolveEpisodeComposition(episodeContract.episodeId),
    outputPath: path.join(runDir, 'final_master.mp4'),
    ...visualSummary
  });
  const completionFailures = PipelineContractGate.validateCompletedRunEvidence(
    runDir,
    finalManifest.getData()
  );
  if (completionFailures.length > 0) {
    finalManifest.setOverallStatus('FAILED');
    workflow.fail(`RUN_COMPLETION_EVIDENCE_FAILED:${completionFailures.map((item) => item.reason).join(' | ')}`);
    Logger.closeRunLogger();
    throw new Error(`RUN_COMPLETION_EVIDENCE_FAILED:${completionFailures.map((item) => item.reason).join(' | ')}`);
  }

  // Auto-Save Canônico no Google Drive
  try {
    const { DriveSyncBridge } = require('../scripts/driveSyncBridge');
    await DriveSyncBridge.autoUploadEpisode(episodeContract.episodeId);
  } catch (syncErr: any) {
    console.warn(`[DRIVE_SYNC_WARN] Aviso no auto-upload para o Google Drive: ${syncErr.message}`);
  }

  workflow.completeStage('contract_gate');
  workflow.complete();
  Logger.closeRunLogger();

  return {
    runId,
    episodeId: episodeContract.episodeId,
    success: true,
    totalScenes: sceneContracts.length,
    durationSeconds: totalSeconds,
    stagesCompleted,
    report
  };
}
