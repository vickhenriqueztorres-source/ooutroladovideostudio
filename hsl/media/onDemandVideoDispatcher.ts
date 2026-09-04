import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { OnDemandVideoJob, VideoCatalogEntry } from './types';
import { VideoRepositoryMatcher } from './videoRepositoryMatcher';
import {FIREFLY_GENERATION_PROFILE as profile} from '../../config/fireflyGenerationConfig';

export class OnDemandVideoDispatcher {
  private static readonly REPO_PATH = path.join(process.cwd(), 'assets', 'video_repository');
  private static readonly FIREFLY_ROOT = path.join(process.cwd(), 'firefly-automation');

  /**
   * Cria um guia de produção cirúrgico focado apenas nas cenas sob demanda
   */
  public static createOnDemandGuide(
    runId: string,
    jobs: OnDemandVideoJob[]
  ): string {
    const guidePath = path.join(process.cwd(), 'runs', runId, 'on-demand-firefly-guide.json');
    const guideDir = path.dirname(guidePath);
    if (!fs.existsSync(guideDir)) {
      fs.mkdirSync(guideDir, { recursive: true });
    }

    const imagesDir = path.join(guideDir, 'firefly-start-frames');
    if (profile.requires_first_frame) fs.mkdirSync(imagesDir, {recursive: true});

    const items = jobs.map((job) => {
      let imageName: string | undefined;
      if (profile.requires_first_frame) {
        if (!job.startFramePath || !fs.existsSync(job.startFramePath)) {
          throw new Error(`ON_DEMAND_FIREFLY_START_FRAME_REQUIRED:${job.sceneId}_${job.shotId}`);
        }
        imageName = `${job.sceneId}_${job.shotId}${path.extname(job.startFramePath) || '.png'}`;
        fs.copyFileSync(job.startFramePath, path.join(imagesDir, imageName));
      }
      return {
        name: `${job.sceneId}_${job.shotId}`,
        prompt: job.prompt,
        image: imageName,
        use_first_frame: profile.requires_first_frame,
        input_mode: profile.requires_first_frame ? 'image_to_video' : 'text_to_video',
        motion: 'documentary_observational_motion',
        camera_movement: 'Subtle handheld documentary camera movement anchored to the real subject',
        model: profile.model,
        resolution: profile.resolution,
        aspect_ratio: profile.aspect_ratio,
        fps: profile.fps,
        duration_seconds: profile.duration_seconds,
        generate_audio: profile.generate_audio,
        category: job.targetCategory || 'infrastructure',
        tags: job.tags || []
      };
    });

    fs.writeFileSync(guidePath, JSON.stringify({
      schema: 'ool.firefly.production-guide.v3',
      model: profile.model,
      resolution: profile.resolution,
      aspect_ratio: profile.aspect_ratio,
      fps: profile.fps,
      duration_seconds: profile.duration_seconds,
      generate_audio: profile.generate_audio,
      use_first_frame: profile.requires_first_frame,
      images_directory: profile.requires_first_frame ? imagesDir : undefined,
      items,
      createdAt: new Date().toISOString()
    }, null, 2), 'utf8');
    return guidePath;
  }

  /**
   * Dispara o Firefly Bot cirurgicamente para as cenas especificadas
   */
  public static dispatchBot(guidePath: string): { success: boolean; output: string } {
    console.log(`[ON_DEMAND_FIREFLY] Alimentando guia cirúrgico: ${guidePath}`);

    // 1. Feed guide
    const feedResult = spawnSync('python', [
      '-m', 'firefly_bot.main',
      '--root', 'firefly-automation',
      '--feed-guide', guidePath
    ], {
      cwd: process.cwd(),
      encoding: 'utf8'
    });

    if (feedResult.status !== 0) {
      console.warn(`[ON_DEMAND_FIREFLY] Aviso ao alimentar fila: ${feedResult.stderr || feedResult.stdout}`);
      return { success: false, output: feedResult.stderr || feedResult.stdout };
    }

    console.log(`[ON_DEMAND_FIREFLY] Fila alimentada com sucesso. Iniciando execução do bot...`);

    // 2. Run bot
    const runResult = spawnSync('python', [
      '-m', 'firefly_bot.main',
      '--root', 'firefly-automation',
      '--run'
    ], {
      cwd: process.cwd(),
      encoding: 'utf8'
    });

    const isSuccess = runResult.status === 0;
    return {
      success: isSuccess,
      output: runResult.stdout || runResult.stderr || ''
    };
  }

  /**
   * Auto-ingere um take gerado sob demanda no Repositório Central de Vídeos
   */
  public static autoIngestCompletedTake(options: {
    videoFilePath: string;
    sceneId: string;
    category: string;
    description: string;
    tags: string[];
    durationSeconds?: number;
    recommendedMotion?: any;
  }): VideoCatalogEntry | null {
    if (!fs.existsSync(options.videoFilePath)) {
      console.warn(`[ON_DEMAND_FIREFLY] Arquivo de vídeo gerado não encontrado: ${options.videoFilePath}`);
      return null;
    }

    const catFolder = path.join(this.REPO_PATH, options.category);
    if (!fs.existsSync(catFolder)) {
      fs.mkdirSync(catFolder, { recursive: true });
    }

    const filename = `${options.category}/${path.basename(options.videoFilePath)}`;
    const destPath = path.join(this.REPO_PATH, filename);

    // Copia para o repositório
    fs.copyFileSync(options.videoFilePath, destPath);

    // Extrai hash SHA-256
    const fileBuf = fs.readFileSync(destPath);
    const sha256 = crypto.createHash('sha256').update(fileBuf).digest('hex');

    const entry: VideoCatalogEntry = {
      id: `${options.category.toUpperCase()}_${options.sceneId}_${Date.now()}`,
      category: options.category,
      filename: filename.replace(/\\/g, '/'),
      tags: options.tags,
      description: options.description,
      durationSeconds: options.durationSeconds || profile.duration_seconds,
      fps: profile.fps,
      resolution: '1920x1080',
      colorTone: 'Documentario de campo investigativo / Rec.709 natural',
      recommendedMotion: options.recommendedMotion || 'cinematic_drift',
      sha256,
      provenance: 'firefly_ai',
      qaStatus: 'quarantined',
      createdAt: new Date().toISOString()
    };

    VideoRepositoryMatcher.registerVideo(entry);
    console.log(`[ON_DEMAND_FIREFLY] Vídeo auto-ingerido com sucesso no Repositório Central: ${entry.id}`);
    return entry;
  }
}
