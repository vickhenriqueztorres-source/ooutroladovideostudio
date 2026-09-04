import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync, spawnSync } from 'child_process';
import { FireflyAdapter } from '../adapters/fireflyAdapter';
import { VideoRepositoryMatcher } from '../hsl/media/videoRepositoryMatcher';
import { VideoExecutionMode, VideoMatchResult } from '../hsl/media/types';
import { PipelineContractGate } from './pipelineContractGate';
import { RunManifest } from './runManifest';
import { Logger } from '../event-hub/logger';
import { AgentTelemetryAdapter } from '../adapters/agentTelemetryAdapter';
import { ProductionSafetyGuard } from '../config/productionSafetyGuard';
import { buildFireflyPrompt } from '../contracts/buildFireflyPrompt';
import {materializeFireflyDispatchPackage} from './fireflyDispatchPackage';
import {FIREFLY_GENERATION_PROFILE} from '../config/fireflyGenerationConfig';
import {VisualAssetClass} from '../contracts/sceneVisualContract';

export interface HybridSceneInput {
  scene_id: string;
  chapter_id: string;
  chapter_title: string;
  name: string;
  voiceover_text: string;
  visual_subject: string;
  take_type: 'KEYFRAME_DOSSIER' | 'CINEMATIC_TAKE';
  visual_asset_class?: VisualAssetClass;
  integrated_text?: string;
  callout_main?: string;
  callout_sub?: string;
  callout_category?: string;
  motion_mode?: string;
  tags?: string[];
  domain_tags?: string[];
  required_category?: string;
  visual_must_include?: string[];
  visual_must_not?: string[];
  allowed_sources?: ('firefly' | 'bank' | 'dossier')[];
}

export interface HybridVideoEngineOptions {
  runId: string;
  scenes: HybridSceneInput[];
  domainTags?: string[];
  runDirectory: string;
  publicExecutionDirectory: string;
  mode?: VideoExecutionMode;
  forceFireflyAll?: boolean;
}

export interface HybridVideoEngineResult {
  success: boolean;
  totalScenes: number;
  matchedFromBank: number;
  generatedByFirefly: number;
  dossiers25D: number;
  sceneOutcomes: Record<string, {
    action: 'USE_MATCHED_VIDEO' | 'DISPATCH_FIREFLY_ON_DEMAND' | 'KEYFRAME_DOSSIER_2.5D';
    videoPath?: string;
    startFramePath: string;
    matchScore?: number;
    takeOrigin?: 'firefly_real' | 'fallback_kenburns' | 'bank_matched' | 'dossier_25d';
    reason: string;
  }>;
}

export class HybridVideoEngine {
  private telemetry: AgentTelemetryAdapter;

  constructor() {
    this.telemetry = AgentTelemetryAdapter.getInstance();
  }

  /**
   * Executa o processamento híbrido inteligente de todas as cenas de um episódio.
   */
  public async processEpisodeScenes(options: HybridVideoEngineOptions): Promise<HybridVideoEngineResult> {
    ProductionSafetyGuard.assertSafeForProduction();

    const {
      runId,
      scenes,
      runDirectory,
      publicExecutionDirectory,
      forceFireflyAll = false
    } = options;

    const mode: VideoExecutionMode = forceFireflyAll 
      ? 'generate-all' 
      : (options.mode || (process.env.HSL_VIDEO_EXECUTION_MODE as VideoExecutionMode) || 'smart');

    Logger.info('HybridVideoEngine', `Iniciando Motor Híbrido de Vídeos para Run: ${runId} (Modo: ${mode}, Total Cenas: ${scenes.length})`);

    const executionScenesDir = path.join(runDirectory, 'editorial', 'execution', 'scenes');
    fs.mkdirSync(executionScenesDir, { recursive: true });
    fs.mkdirSync(publicExecutionDirectory, { recursive: true });

    const sceneOutcomes: HybridVideoEngineResult['sceneOutcomes'] = {};
    const fireflyPendingScenes: Array<{
      scene: HybridSceneInput;
      sceneDir: string;
      pubSceneDir: string;
      prompt: string;
      negativePrompt?: string;
      startFramePath: string;
    }> = [];

    const availableMedia: Record<string, any> = {};
    let matchedCount = 0;
    let fireflyCount = 0;
    let dossierCount = 0;

    const txtPrompts: string[] = [];
    const jsonlPrompts: string[] = [];

    // Validação de integridade de negativas específicas:
    if (scenes.length > 1) {
      const firstNeg = scenes[0].visual_must_not ? JSON.stringify([...scenes[0].visual_must_not].sort()) : null;
      if (firstNeg !== null) {
        const allIdentical = scenes.every(sc => {
          const currentNeg = sc.visual_must_not ? JSON.stringify([...sc.visual_must_not].sort()) : null;
          return currentNeg === firstNeg;
        });
        if (allIdentical) {
          throw new Error(
            `SCENES_NEGATIVE_NOT_SPECIFIC: O episódio '${runId}' possui 'visual_must_not' idêntico em todas as ${scenes.length} cenas (negativo copiado). Cada cena deve conter negações específicas do seu contexto.`
          );
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // FASE 1: Avaliação e Triagem Semântica das Cenas
    // ══════════════════════════════════════════════════════════════════════
    for (let i = 0; i < scenes.length; i++) {
      const sc = scenes[i];

      // Verificação obrigatória do SceneVisualContract
      if (!sc.visual_must_include || sc.visual_must_include.length < 2 || !sc.required_category) {
        throw new Error(`SCENE_CONTRACT_REQUIRED: Cena '${sc.scene_id}' não possui SceneVisualContract válido (mínimo 2 visual_must_include e required_category específica).`);
      }

      const sceneDir = path.join(executionScenesDir, sc.scene_id);
      const pubSceneDir = path.join(publicExecutionDirectory, sc.scene_id);
      fs.mkdirSync(sceneDir, { recursive: true });
      fs.mkdirSync(pubSceneDir, { recursive: true });

      const isDossier = sc.take_type === 'KEYFRAME_DOSSIER';

      // 1. Gera o prompt governado através de buildFireflyPrompt
      const promptResult = buildFireflyPrompt({
        sceneId: sc.scene_id,
        visual_subject: sc.visual_subject,
        visual_must_include: sc.visual_must_include,
        visual_must_not: sc.visual_must_not,
        required_category: sc.required_category,
        domainTags: (sc as any).domain_tags || (sc as any).domainTags || sc.tags || [],
        take_type: sc.take_type
      });

      const promptMaster = promptResult.prompt;
      const negativePrompt = promptResult.negativePrompt;

      fs.writeFileSync(path.join(sceneDir, 'clean_start_frame_prompt.txt'), promptMaster, 'utf8');

      const scenePlanData = {
        sceneId: sc.scene_id,
        name: sc.name,
        takeType: isDossier ? 'KEYFRAME_DOSSIER' : 'CINEMATIC_TAKE',
        visualAssetClass: sc.visual_asset_class || (isDossier ? 'MOTION_IMAGE' : 'VIDEO'),
        integratedText: sc.integrated_text,
        prompt: promptMaster,
        negativePrompt: negativePrompt
      };
      fs.writeFileSync(path.join(sceneDir, 'scene_plan.json'), JSON.stringify(scenePlanData, null, 2), 'utf8');

      txtPrompts.push(`[${sc.scene_id}] ${promptMaster}`);
      jsonlPrompts.push(JSON.stringify({ id: sc.scene_id, prompt: promptMaster, negativePrompt, filename: `${sc.scene_id}.png`, takeType: scenePlanData.takeType }, null, 0));

      const startFramePath = path.join(sceneDir, 'firefly_start_frame.png');
      const pubStartFramePath = path.join(pubSceneDir, 'firefly_start_frame.png');

      // 2. Classificação de 3 vias
      if (isDossier) {
        dossierCount++;
        Logger.info('HybridVideoEngine', `  📑 [${sc.scene_id}] Classificado como KEYFRAME_DOSSIER (Render 2.5D com HUD)`);
        
        // Se ainda não existir Start Frame real, extrai de banco ou compõe
        this.ensureStartFrameExists(startFramePath, promptMaster, sc.scene_id);
        fs.copyFileSync(startFramePath, pubStartFramePath);

        this.writeStartFrameReceipt(sceneDir, pubSceneDir, sc.scene_id, promptMaster, startFramePath, 'KEYFRAME_DOSSIER');

        sceneOutcomes[sc.scene_id] = {
          action: 'KEYFRAME_DOSSIER_2.5D',
          startFramePath,
          takeOrigin: 'dossier_25d',
          reason: 'KEYFRAME_DOSSIER: Render procedural 2.5D com motion graphics e HUD de raio-x no Remotion.'
        };

        availableMedia[sc.scene_id] = {
          hasVideo: false,
          hasImage: true,
          isDossier: true
        };
        continue;
      }

      // Consulta semântica ao Banco de Vídeos com governança de contrato visual
      const matchResult = VideoRepositoryMatcher.matchScene({
        sceneId: sc.scene_id,
        chapterTitle: sc.chapter_title,
        visualSubject: sc.visual_subject,
        tags: sc.tags || [],
        domainTags: sc.domain_tags || options.domainTags || [],
        requiredCategory: sc.required_category,
        visualMustInclude: sc.visual_must_include,
        visualMustNot: sc.visual_must_not,
        allowedSources: sc.allowed_sources
      }, mode);

      if (matchResult.recommendedAction === 'USE_MATCHED_VIDEO' && matchResult.absoluteVideoPath) {
        matchedCount++;
        Logger.info('HybridVideoEngine', `  🎥 [${sc.scene_id}] Cache Hit no Banco de Vídeos! Relevância: ${(matchResult.matchScore * 100).toFixed(1)}% -> ${path.basename(matchResult.absoluteVideoPath)}`);

        const targetVideo = path.join(sceneDir, 'firefly_take.mp4');
        const pubVideo = path.join(pubSceneDir, 'firefly_take.mp4');

        fs.copyFileSync(matchResult.absoluteVideoPath, targetVideo);
        fs.copyFileSync(matchResult.absoluteVideoPath, pubVideo);

        // Extrai Start Frame 1080p real do vídeo do banco
        execSync(`ffmpeg -y -ss 00:00:01 -i "${targetVideo}" -frames:v 1 -q:v 2 "${startFramePath}"`);
        fs.copyFileSync(startFramePath, pubStartFramePath);

        this.writeStartFrameReceipt(sceneDir, pubSceneDir, sc.scene_id, promptMaster, startFramePath, 'CINEMATIC_TAKE');

        sceneOutcomes[sc.scene_id] = {
          action: 'USE_MATCHED_VIDEO',
          videoPath: targetVideo,
          startFramePath,
          matchScore: matchResult.matchScore,
          takeOrigin: 'bank_matched',
          reason: matchResult.reason
        };

        availableMedia[sc.scene_id] = {
          hasVideo: true,
          hasImage: true,
          isDossier: false
        };
      } else {
        // Cache Miss -> Verifica permissão de Firefly
        const allowsFirefly = !sc.allowed_sources || sc.allowed_sources.includes('firefly');
        if (!allowsFirefly) {
          throw new Error(
            `NO_LEGAL_VISUAL: Cena '${sc.scene_id}' não encontrou vídeo compatível no banco e 'allowed_sources' não permite Firefly.`
          );
        }

        Logger.info('HybridVideoEngine', `  🔥 [${sc.scene_id}] PENDING_FIREFLY (${matchResult.reason}). ENFILEIRANDO GERAÇÃO ON-DEMAND NO FIREFLY.`);
        
        if (FIREFLY_GENERATION_PROFILE.requires_first_frame) {
          this.ensureStartFrameExists(startFramePath, promptMaster, sc.scene_id);
          fs.copyFileSync(startFramePath, pubStartFramePath);
          this.writeStartFrameReceipt(sceneDir, pubSceneDir, sc.scene_id, promptMaster, startFramePath, 'CINEMATIC_TAKE');
        }

        fireflyPendingScenes.push({
          scene: sc,
          sceneDir,
          pubSceneDir,
          prompt: promptMaster,
          negativePrompt: negativePrompt,
          startFramePath
        });

        sceneOutcomes[sc.scene_id] = {
          action: 'DISPATCH_FIREFLY_ON_DEMAND',
          startFramePath,
          matchScore: matchResult.matchScore,
          takeOrigin: 'firefly_real',
          reason: `PENDING_FIREFLY: ${matchResult.reason}`
        };

        availableMedia[sc.scene_id] = {
          hasVideo: true,
          hasImage: true,
          isDossier: false
        };
      }
    }

    // Salva filas para o ChatGPT Bot
    fs.mkdirSync('chatgpt-image-bot/prompts', { recursive: true });
    fs.writeFileSync('chatgpt-image-bot/prompts/queue.txt', txtPrompts.join('\n') + '\n', 'utf8');
    fs.writeFileSync('chatgpt-image-bot/queue.jsonl', jsonlPrompts.join('\n') + '\n', 'utf8');

    // ══════════════════════════════════════════════════════════════════════
    // FASE 2: Disparo do Firefly Bot para Cenas On-Demand
    // ══════════════════════════════════════════════════════════════════════
    if (fireflyPendingScenes.length > 0) {
      Logger.info('HybridVideoEngine', `\n🚀 Disparando Firefly Bot para ${fireflyPendingScenes.length} cenas sob demanda...`);

      const dispatchPackage = materializeFireflyDispatchPackage({
        runDirectory,
        scenes: fireflyPendingScenes.map((item) => ({
          sceneId: item.scene.scene_id,
          prompt: item.prompt,
          startFramePath: item.startFramePath
        }))
      });

      const firefly = new FireflyAdapter(
        undefined,
        path.join(runDirectory, 'firefly-runtime')
      );
      await firefly.initialize();

      let completedJobs: Array<{ name: string; output_path: string; origin: 'firefly_real' }> = [];

      try {
        const fireflyResult = await firefly.feedGuideAndRun(runId, dispatchPackage.guidePath);
        completedJobs = fireflyResult.completedJobs.map(job => ({
          name: job.name,
          output_path: job.output_path,
          origin: 'firefly_real' as const
        }));
      } catch (err: any) {
        throw new Error(`FIREFLY_REQUIRED_GENERATION_FAILED:${runId}:${err.message}`);
      }

      const completedNames = new Set(completedJobs.map((job) => job.name));
      const missingJobs = dispatchPackage.jobNames.filter((name) => !completedNames.has(name));
      if (missingJobs.length > 0) {
        throw new Error(`FIREFLY_REQUIRED_JOBS_INCOMPLETE:${missingJobs.join(',')}`);
      }

      // Distribui e auto-ingere os vídeos gerados
      for (const job of completedJobs) {
        const pending = fireflyPendingScenes.find(p => p.scene.scene_id === job.name);
        if (pending && fs.existsSync(job.output_path)) {
          const targetVideo = path.join(pending.sceneDir, 'firefly_take.mp4');
          const pubVideo = path.join(pending.pubSceneDir, 'firefly_take.mp4');

          if (path.resolve(job.output_path) !== path.resolve(targetVideo)) {
            fs.copyFileSync(job.output_path, targetVideo);
          }
          fs.copyFileSync(targetVideo, pubVideo);

          execSync(`ffmpeg -y -ss 00:00:01 -i "${targetVideo}" -frames:v 1 -q:v 2 "${pending.startFramePath}"`, {stdio: 'ignore'});
          fs.copyFileSync(pending.startFramePath, path.join(pending.pubSceneDir, 'firefly_start_frame.png'));
          this.writeStartFrameReceipt(
            pending.sceneDir,
            pending.pubSceneDir,
            pending.scene.scene_id,
            pending.prompt,
            pending.startFramePath,
            'CINEMATIC_TAKE',
            'adobe_firefly'
          );
          this.writeVideoReceipt(pending.sceneDir, pending.pubSceneDir, pending.scene.scene_id, targetVideo, job.output_path);

          sceneOutcomes[job.name] = {
            action: 'DISPATCH_FIREFLY_ON_DEMAND',
            videoPath: targetVideo,
            startFramePath: pending.startFramePath,
            takeOrigin: job.origin,
            reason: job.origin === 'firefly_real' ? 'FIREFLY_GENERATED_SUCCESS' : 'FALLBACK_KENBURNS_CONTINGENCY'
          };
          fireflyCount++;

          // Auto-ingere no repositório central para enriquecer o acervo APENAS quando origin === 'firefly_real'
          if (job.origin === 'firefly_real') {
            try {
              VideoRepositoryMatcher.ingestGeneratedVideo(
                targetVideo,
                {
                  id: `GEN_${pending.scene.scene_id}`,
                  category: pending.scene.required_category || 'industrial',
                  description: pending.scene.visual_subject,
                  tags: pending.scene.tags || ['firefly', 'gerado', '35mm'],
                  recommendedMotion: pending.scene.motion_mode || 'slow_push_in',
                  sourceRunId: runId
                },
                'firefly_real'
              );
              Logger.info('HybridVideoEngine', `  📦 [AUTO-INGESTÃO] Take '${pending.scene.scene_id}' catalogado na quarentena com sucesso.`);
            } catch (e: any) {
              Logger.warn('HybridVideoEngine', `Aviso na auto-ingestão de '${pending.scene.scene_id}': ${e.message}`);
            }
          } else {
            Logger.info('HybridVideoEngine', `  🛡️ [PROTEÇÃO CONTRA CONTAMINAÇÃO] Take '${pending.scene.scene_id}' com fallback Ken Burns NÃO é oferecido para ingestão no repositório.`);
          }
        }
      }
    }

    // Registrar manifesto de run com takeOrigin por cena para auditoria
    try {
      const manifest = new RunManifest(runDirectory, runId);
      for (const [scId, outcome] of Object.entries(sceneOutcomes)) {
        manifest.recordSceneTakeOrigin(
          scId,
          outcome.takeOrigin || (outcome.action === 'USE_MATCHED_VIDEO' ? 'bank_matched' : outcome.action === 'KEYFRAME_DOSSIER_2.5D' ? 'dossier_25d' : 'fallback_kenburns'),
          {
            action: outcome.action,
            videoPath: outcome.videoPath,
            startFramePath: outcome.startFramePath
          }
        );
      }
    } catch (e: any) {
      Logger.warn('HybridVideoEngine', `Aviso ao registrar takeOrigin no manifesto: ${e.message}`);
    }

    fs.writeFileSync('remotion/availableMedia.json', JSON.stringify(availableMedia, null, 2), 'utf8');

    Logger.info('HybridVideoEngine', `══════════════════════════════════════════════════════════════════════`);
    Logger.info('HybridVideoEngine', `✅ PROCESSAMENTO DE VÍDEO CONCLUÍDO COM SUCESSO!`);
    Logger.info('HybridVideoEngine', `  • Cenas no Banco de Vídeos: ${matchedCount}`);
    Logger.info('HybridVideoEngine', `  • Cenas Geradas no Firefly: ${fireflyCount}`);
    Logger.info('HybridVideoEngine', `  • Cenas Dossiê 2.5D (Remotion): ${dossierCount}`);
    Logger.info('HybridVideoEngine', `══════════════════════════════════════════════════════════════════════\n`);

    return {
      success: true,
      totalScenes: scenes.length,
      matchedFromBank: matchedCount,
      generatedByFirefly: fireflyCount,
      dossiers25D: dossierCount,
      sceneOutcomes
    };
  }

  private ensureStartFrameExists(startFramePath: string, prompt: string, sceneId: string): void {
    if (fs.existsSync(startFramePath) && fs.statSync(startFramePath).size >= 10240) {
      return;
    }

    throw new Error(
      `START_FRAME_NOT_FOUND: Cena '${sceneId}' exige um Start Frame 35mm cinematográfico válido no disco (${startFramePath}, mínimo 10KB). Sorteio aleatório de vídeo do banco é estritamente proibido pelas leis de produção.`
    );
  }

  private writeStartFrameReceipt(
    sceneDir: string,
    pubSceneDir: string,
    sceneId: string,
    prompt: string,
    startFramePath: string,
    takeType: 'KEYFRAME_DOSSIER' | 'CINEMATIC_TAKE',
    sourceSystem: 'openai_imagegen' | 'adobe_firefly' | 'bank' = 'openai_imagegen'
  ): void {
    const frameBuf = fs.readFileSync(startFramePath);
    const frameSha = crypto.createHash('sha256').update(frameBuf).digest('hex');

    const receipt = {
      sceneId,
      prompt,
      sourceSystem,
      provider: sourceSystem,
      generator: sourceSystem === 'adobe_firefly'
        ? 'frame_extracted_from_firefly_video'
        : 'OpenAI Image Generation',
      model: sourceSystem === 'adobe_firefly' ? FIREFLY_GENERATION_PROFILE.model : 'OpenAI Image Generation',
      sha256: frameSha,
      aspectRatio: '16:9',
      width: 1920,
      height: 1080,
      takeType,
      peoplePolicy: ['person', 'people', 'human', 'worker', 'operator', 'hands', 'face', 'body', 'human silhouette']
        .every((term) => prompt.toLowerCase().includes(term))
        ? 'FORBIDDEN'
        : 'CONTEXTUAL',
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(path.join(sceneDir, 'start_frame_receipt.json'), JSON.stringify(receipt, null, 2), 'utf8');
    fs.writeFileSync(path.join(pubSceneDir, 'start_frame_receipt.json'), JSON.stringify(receipt, null, 2), 'utf8');
  }

  private writeVideoReceipt(
    sceneDir: string,
    pubSceneDir: string,
    sceneId: string,
    videoPath: string,
    sourceOutput: string
  ): void {
    const bytes = fs.readFileSync(videoPath);
    const probe = PipelineContractGate.probeMedia(videoPath);
    const receipt = {
      schema: 'hsl.video.provenance.v2',
      sourceSystem: 'adobe_firefly',
      model: FIREFLY_GENERATION_PROFILE.model,
      fps: FIREFLY_GENERATION_PROFILE.fps,
      sceneId,
      sourceOutput,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      durationSeconds: probe.duration,
      width: probe.width,
      height: probe.height,
      codec: probe.codec,
      productionUse: 'APPROVED_PHYSICAL_VIDEO_TAKE',
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(path.join(sceneDir, 'firefly_take_receipt.json'), JSON.stringify(receipt, null, 2), 'utf8');
    fs.writeFileSync(path.join(pubSceneDir, 'firefly_take_receipt.json'), JSON.stringify(receipt, null, 2), 'utf8');
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
