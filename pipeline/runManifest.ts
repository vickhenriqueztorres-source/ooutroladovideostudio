import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type PipelineStage = 
  | 'PREPRODUCTION'
  | 'IMAGE_ENGINE'
  | 'FIREFLY_BOT'
  | 'VOICEOVER'
  | 'REMOTION_RENDER'
  | 'FFMPEG_MUX'
  | 'PACKAGING';

export type StageStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'FAILED';

export interface StageRecord {
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  itemCount?: number;
  expectedCount?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface RunManifestData {
  schema: 'hsl.pipeline.run-manifest.v1';
  runId: string;
  createdAt: string;
  updatedAt: string;
  overallStatus: 'RUNNING' | 'COMPLETED' | 'FAILED';
  status?: 'RUNNING' | 'DONE' | 'FAILED';
  stages: Record<string, StageRecord>;
  render?: { engine: 'CinematicEpisode'; compositionId: string; outputPath: string };
  fireflyFailed?: boolean;
  generatedVideos?: number;
  bankClips?: number;
  fallbackRemotion?: number;
  assetInventory: Record<string, {
    sizeBytes: number;
    sha256?: string;
    durationSeconds?: number;
    takeOrigin?: 'firefly_real' | 'fallback_kenburns' | 'bank_matched' | 'dossier_25d';
    verifiedAt: string;
  }>;
  scenes?: Record<string, {
    takeOrigin?: 'firefly_real' | 'fallback_kenburns' | 'bank_matched' | 'dossier_25d';
    action?: string;
    videoPath?: string;
    startFramePath?: string;
  }>;
}

export class RunManifest {
  private manifestPath: string;
  private data: RunManifestData;

  constructor(runDir: string, runId: string) {
    this.manifestPath = path.join(runDir, 'run-manifest.json');
    if (fs.existsSync(this.manifestPath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.manifestPath, 'utf8'));
      } catch {
        this.data = this.createDefault(runId);
      }
    } else {
      this.data = this.createDefault(runId);
      this.save();
    }
  }

  private createDefault(runId: string): RunManifestData {
    const now = new Date().toISOString();
    return {
      schema: 'hsl.pipeline.run-manifest.v1',
      runId,
      createdAt: now,
      updatedAt: now,
      status: 'RUNNING',
      overallStatus: 'RUNNING',
      stages: {
        PREPRODUCTION: { status: 'PENDING' },
        IMAGE_ENGINE: { status: 'PENDING' },
        FIREFLY_BOT: { status: 'PENDING' },
        VOICEOVER: { status: 'PENDING' },
        REMOTION_RENDER: { status: 'PENDING' },
        FFMPEG_MUX: { status: 'PENDING' },
        PACKAGING: { status: 'PENDING' }
      },
      assetInventory: {}
    };
  }

  public startStage(stage: PipelineStage, expectedCount?: number): void {
    this.data.stages[stage] = {
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString(),
      expectedCount
    };
    this.data.updatedAt = new Date().toISOString();
    this.save();
  }

  public completeStage(stage: PipelineStage, itemCount?: number, metadata?: Record<string, unknown>): void {
    const current = this.data.stages[stage];
    const now = new Date();
    const started = current.startedAt ? new Date(current.startedAt) : now;
    const durationSeconds = (now.getTime() - started.getTime()) / 1000;

    this.data.stages[stage] = {
      ...current,
      status: 'DONE',
      completedAt: now.toISOString(),
      durationSeconds,
      itemCount: itemCount ?? current.expectedCount,
      metadata
    };
    this.data.updatedAt = now.toISOString();
    this.save();
  }

  public failStage(stage: PipelineStage, error: string): void {
    const current = this.data.stages[stage];
    const now = new Date();
    this.data.stages[stage] = {
      ...current,
      status: 'FAILED',
      completedAt: now.toISOString(),
      error
    };
    this.data.overallStatus = 'FAILED';
    this.data.updatedAt = now.toISOString();
    this.save();
  }

  public recordAsset(key: string, filePath: string, durationSeconds?: number): void {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      let sha256: string | undefined;
      try {
        const buffer = fs.readFileSync(filePath);
        sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      } catch {
        // Ignora sha256 se o arquivo for muito grande
      }

      this.data.assetInventory[key] = {
        sizeBytes: stat.size,
        sha256,
        durationSeconds,
        verifiedAt: new Date().toISOString()
      };
      this.save();
    }
  }

  public recordSceneTakeOrigin(
    sceneId: string,
    origin: 'firefly_real' | 'fallback_kenburns' | 'bank_matched' | 'dossier_25d',
    details?: { action?: string; videoPath?: string; startFramePath?: string }
  ): void {
    if (!this.data.scenes) {
      this.data.scenes = {};
    }
    this.data.scenes[sceneId] = {
      ...(this.data.scenes[sceneId] || {}),
      takeOrigin: origin,
      ...(details || {})
    };
    this.data.updatedAt = new Date().toISOString();
    this.save();
  }

  public setOverallStatus(status: 'RUNNING' | 'COMPLETED' | 'FAILED'): void {
    this.data.overallStatus = status;
    this.data.status = status === 'COMPLETED' ? 'DONE' : status;
    this.data.updatedAt = new Date().toISOString();
    this.save();
  }

  public finalizeProduction(input: {
    compositionId: string;
    outputPath: string;
    generatedVideos: number;
    bankClips: number;
    fallbackRemotion: number;
  }): void {
    if (input.fallbackRemotion !== 0) {
      throw new Error(`RUN_MANIFEST_FALLBACK_FORBIDDEN:${input.fallbackRemotion}`);
    }
    this.data.generatedVideos = input.generatedVideos;
    this.data.bankClips = input.bankClips;
    this.data.fallbackRemotion = input.fallbackRemotion;
    this.data.fireflyFailed = false;
    this.data.render = {
      engine: 'CinematicEpisode',
      compositionId: input.compositionId,
      outputPath: input.outputPath
    };
    this.data.stages.visuals = {
      status: 'DONE',
      itemCount: input.generatedVideos + input.bankClips,
      completedAt: new Date().toISOString()
    };
    this.data.stages.render = {
      status: 'DONE',
      itemCount: 1,
      completedAt: new Date().toISOString(),
      metadata: {engine: 'CinematicEpisode', compositionId: input.compositionId}
    };
    this.setOverallStatus('COMPLETED');
  }

  public getData(): RunManifestData {
    return this.data;
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.manifestPath), { recursive: true });
    fs.writeFileSync(this.manifestPath, JSON.stringify(this.data, null, 2), 'utf8');
  }
}
