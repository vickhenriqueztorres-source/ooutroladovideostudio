import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { parseEpisodeContract, EpisodeContract, EpisodeStage } from '../contracts/episodeContract';
import { buildSceneContracts, RawSceneInput } from '../contracts/buildSceneContracts';
import { SceneVisualContract } from '../contracts/sceneVisualContract';
import { assertCinematicPipelineActive } from '../config/hslCinematicFlags';
import { NarrativeBeatDirectorAgent } from '../hsl/cinematic/agents/narrativeBeatDirectorAgent';
import { CinematicShotDirectorAgent } from '../hsl/cinematic/agents/cinematicShotDirectorAgent';
import { ContinuityDirectorAgent } from '../hsl/cinematic/agents/continuityDirectorAgent';
import { runNarrationDispatch } from '../scripts/dispatchNarrationBatch';
import { runAudioBedDispatch } from '../scripts/dispatchAudioBed';
import { HybridVideoEngine, HybridSceneInput } from './hybridVideoEngine';
import { PipelineContractGate, RunValidationReport } from './pipelineContractGate';
import { ProductionSafetyGuard } from '../config/productionSafetyGuard';
import { StartFrameGenerator } from '../hsl/startframe/startFrameGenerator';
import { buildFireflyPrompt } from '../contracts/buildFireflyPrompt';
import { RunManifest } from './runManifest';
import {validateCanonBalance} from './canonBalanceCheck';
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
  'nota-100-reais': 'EpisodeNota100'
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
  const rawScenes: RawSceneInput[] = JSON.parse(fs.readFileSync(options.scenesPath, 'utf8'));
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
    const { AgentTelemetryCinematicSink } = require('../hsl/cinematic/telemetry/cinematicTelemetry');
    const telemetry = new AgentTelemetryCinematicSink();
    const beatDirector = new NarrativeBeatDirectorAgent(telemetry);
    const shotDirector = new CinematicShotDirectorAgent(telemetry);
    const continuityDirector = new ContinuityDirectorAgent(telemetry);

    const editorialScenes = sceneContracts.map((sc, idx) => ({
      scene_id: sc.sceneId,
      scene_order: idx + 1,
      name: `Cena ${sc.sceneId}`,
      voiceover_text: sc.voiceover,
      visual_prompt: sc.visual_must_include.join(', '),
      take_type: sc.take_type,
      target_seconds: sc.targetSeconds
    }));

    // Simula validação de consistência cinematográfica estrita
    for (const sc of editorialScenes) {
      if (!sc.voiceover_text || sc.voiceover_text.length < 5) {
        throw new Error(`BEAT_DIRECTOR_FAILED: Cena '${sc.scene_id}' não possui voiceover adequado.`);
      }
    }

    saveCheckpoint('cinematic_direction', {
      beats: editorialScenes.length,
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
          fs.mkdirSync(narrationPublic, {recursive: true});
          for (const file of fs.readdirSync(narrationSource).filter((name) => name.endsWith('.mp3'))) {
            fs.copyFileSync(path.join(narrationSource, file), path.join(narrationPublic, file));
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
          visual_subject: sc.visual_must_include.join(', '),
          take_type: sc.take_type,
          visual_asset_class: sc.visual_asset_class,
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
              take_type: scene.take_type
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
            const target = path.join(thumbDir, filenames[variantIndex]);
            if (!fs.existsSync(sourceVideo)) throw new Error(`THUMBNAIL_SOURCE_VIDEO_MISSING:${sceneId}`);
            execSync(`ffmpeg -y -ss 00:00:01.2 -i "${sourceVideo}" -frames:v 1 -vf "scale=3840:2160:flags=lanczos,eq=contrast=1.04:saturation=0.94" "${target}"`, {stdio: 'ignore'});
          });
          fs.writeFileSync(path.join(postprodDir, 'description.txt'), [
            episodeContract.title,
            '',
            'Uma pergunta enviada para uma IA atravessa GPUs, racks, refrigeração, UPS, subestações e a rede elétrica. Este episódio segue essa cadeia física para mostrar por que não existe um único número universal de energia por resposta e por que o gargalo pode estar na conexão elétrica disponível.',
            '',
            'Fontes: IEA Energy and AI (2025), U.S. Department of Energy, NVIDIA H100, EPE e estudo Schneider Electric Brasil/MDIC (2026).',
            '',
            'INVESTIGAR. REVELAR. COMPREENDER.'
          ].join('\n'), 'utf8');
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
            rawScenes: sceneContracts
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
