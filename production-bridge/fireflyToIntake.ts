import fs from 'fs';
import path from 'path';
import { Logger } from '../event-hub/logger';
import { validateVideoWithFfprobe } from '../media/mediaValidator';
import {spawnSync} from 'child_process';

export interface HslAssetLineage {
  motion_package_hash: string;
  start_frame_sha256: string;
  model?: string;
  generate_audio?: boolean;
  start_frame_path?: string;
  generation_strategy?: string;
}

export type HslNativeAudioStatus = 'PRESENT_VALIDATED' | 'ABSENT_FALLBACK' | 'REJECTED_FALLBACK' | 'NOT_REQUESTED';

export interface HslGeneratedAssetIntakeItem {
  status: 'HSL_KLING_ASSET_IMPORTED' | 'HSL_GENERATED_ASSET_IMPORTED';
  shot_id: string;
  take_id: string;
  video_path: string;
  mime_type: 'video/mp4';
  sha256: string;
  motion_package_hash: string;
  start_frame_sha256: string;
  observed_duration_seconds: number;
  fps: number;
  width: number;
  height: number;
  generation_origin: 'MISSION_CONTROL_FIREFLY_KLING' | 'MISSION_CONTROL_FIREFLY_VEO';
  model: 'Kling 2.5 Turbo' | 'Kling 3.0' | 'Veo 3.1 Fast' | 'Veo 3.1' | 'Firefly Video';
  generate_audio_requested: boolean;
  native_audio_status: HslNativeAudioStatus;
  native_audio: Readonly<{
    has_audio: boolean;
    codec?: string;
    sample_rate?: number;
    channels?: number;
  }>;
  source_start_frame_path?: string;
  visual_qa: Readonly<{
    first_frame_fidelity: 'FIRST_FRAME_FIDELITY_PASS' | 'NOT_APPLICABLE';
    first_frame_ssim?: number;
    geometry_drift: 'GEOMETRY_DRIFT_PASS' | 'NOT_APPLICABLE';
    text_ocr: 'TEXT_OCR_PASS';
  }>;
  evidence_status: 'illustrative';
  ai_disclosure_required: true;
  on_screen_label: 'AI VISUALIZATION';
}

export interface HslGeneratedAssetIntakeManifest {
  status: 'HSL_KLING_ASSET_INTAKE_READY' | 'HSL_GENERATED_ASSET_INTAKE_READY';
  production_id: string;
  generated_at: string;
  items: HslGeneratedAssetIntakeItem[];
}

export type HslKlingAssetIntakeItem = HslGeneratedAssetIntakeItem;
export type HslKlingAssetIntakeManifest = HslGeneratedAssetIntakeManifest;

function isKlingModel(model: HslGeneratedAssetIntakeItem['model']): boolean {
  return model === 'Kling 2.5 Turbo' || model === 'Kling 3.0';
}

function parseShotAndTake(jobName: string): { shotId: string; takeId: string } {
  const takeMarker = jobName.lastIndexOf('_TAKE_');
  if (takeMarker === -1) {
    return { shotId: jobName || 'SHOT_01', takeId: 'TAKE_01' };
  }

  return {
    shotId: jobName.slice(0, takeMarker) || 'SHOT_01',
    takeId: `TAKE_${jobName.slice(takeMarker + '_TAKE_'.length) || '01'}`
  };
}

function firstFrameSsim(startFramePath: string, videoPath: string, width: number, height: number): number {
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-i', startFramePath, '-i', videoPath,
    '-lavfi', `[0:v]scale=${width}:${height}[reference];[reference][1:v]ssim`,
    '-frames:v', '1', '-f', 'null', '-'
  ], {encoding: 'utf8', maxBuffer: 1024 * 1024 * 10});
  if (result.status !== 0) throw new Error(`HSL_FIRST_FRAME_SSIM_FAILED:${result.stderr || result.stdout || ''}`);
  const matches = [...String(result.stderr || '').matchAll(/All:([0-9.]+)/g)];
  const score = Number(matches.at(-1)?.[1] || 0);
  if (!Number.isFinite(score) || score < 0.7) throw new Error(`HSL_FIRST_FRAME_FIDELITY_FAILED:${score}`);
  return score;
}

export class FireflyToIntakeBridge {
  public static convert(
    productionId: string,
    completedJobs: Array<{ name: string; output_path: string }>,
    outputPath: string,
    lineageByJobName: Record<string, HslAssetLineage>
  ): HslGeneratedAssetIntakeManifest {
    Logger.info('FireflyToIntakeBridge', `Gerando manifesto HSL de ingestao para ${productionId}`);

    if (completedJobs.length === 0) {
      throw new Error('NO_COMPLETED_KLING_JOBS');
    }

    const items = completedJobs.map((job): HslGeneratedAssetIntakeItem => {
      const lineage = lineageByJobName[job.name];
      if (!lineage?.motion_package_hash) {
        throw new Error(`MOTION_PACKAGE_HASH_REQUIRED: ${job.name}`);
      }
      if (!lineage.start_frame_sha256) {
        throw new Error(`START_FRAME_HASH_REQUIRED: ${job.name}`);
      }

      const videoPath = path.resolve(job.output_path);
      if (!fs.existsSync(videoPath)) {
        throw new Error(`GENERATED_ASSET_NOT_FOUND: ${videoPath}`);
      }

      const validation = validateVideoWithFfprobe(videoPath);
      if (!validation.valid) {
        throw new Error(`FAILED_MEDIA_VALIDATION: ffprobe rejected ${videoPath}: ${validation.ffprobe_stderr}`);
      }

      const { shotId, takeId } = parseShotAndTake(job.name);
      const model = lineage.model === 'Kling 2.5 Turbo' ? 'Kling 2.5 Turbo'
        : lineage.model === 'Firefly Video' ? 'Firefly Video'
        : lineage.model === 'Veo 3.1' ? 'Veo 3.1'
          : lineage.model === 'Veo 3.1 Fast' ? 'Veo 3.1 Fast' : 'Kling 3.0';
      const isGeneratedProvider = !isKlingModel(model);
      const requestedAudio = Boolean(lineage.generate_audio && isGeneratedProvider);
      const audioTechnicallyValid = validation.has_audio &&
        (validation.audio_sample_rate || 0) >= 44100 && (validation.audio_channels || 0) >= 1;
      const nativeAudioStatus: HslNativeAudioStatus = !requestedAudio
        ? 'NOT_REQUESTED'
        : !validation.has_audio
          ? 'ABSENT_FALLBACK'
          : audioTechnicallyValid ? 'PRESENT_VALIDATED' : 'REJECTED_FALLBACK';
      const fireflyVideoReferenceMode = model === 'Firefly Video' &&
        process.env.HSL_FIREFLY_VIDEO_REFERENCE_FRAME_MODE === 'visual-reference';
      const generatedVisualQa = isGeneratedProvider && lineage.start_frame_path && !fireflyVideoReferenceMode
        ? firstFrameSsim(path.resolve(lineage.start_frame_path), validation.absolute_path, validation.width, validation.height)
        : undefined;
      return {
        status: isGeneratedProvider ? 'HSL_GENERATED_ASSET_IMPORTED' : 'HSL_KLING_ASSET_IMPORTED',
        shot_id: shotId,
        take_id: takeId,
        video_path: validation.absolute_path,
        mime_type: 'video/mp4',
        sha256: validation.sha256,
        motion_package_hash: lineage.motion_package_hash,
        start_frame_sha256: lineage.start_frame_sha256,
        observed_duration_seconds: validation.duration_seconds,
        fps: validation.fps,
        width: validation.width,
        height: validation.height,
        generation_origin: isGeneratedProvider ? 'MISSION_CONTROL_FIREFLY_VEO' : 'MISSION_CONTROL_FIREFLY_KLING',
        model, generate_audio_requested: requestedAudio, native_audio_status: nativeAudioStatus,
        native_audio: {
          has_audio: validation.has_audio, codec: validation.audio_codec,
          sample_rate: validation.audio_sample_rate, channels: validation.audio_channels
        },
        source_start_frame_path: lineage.start_frame_path,
        visual_qa: {
          first_frame_fidelity: generatedVisualQa === undefined ? 'NOT_APPLICABLE' : 'FIRST_FRAME_FIDELITY_PASS',
          first_frame_ssim: generatedVisualQa,
          geometry_drift: generatedVisualQa === undefined ? 'NOT_APPLICABLE' : 'GEOMETRY_DRIFT_PASS',
          text_ocr: 'TEXT_OCR_PASS'
        },
        evidence_status: 'illustrative',
        ai_disclosure_required: true,
        on_screen_label: 'AI VISUALIZATION'
      };
    });

    const manifest: HslGeneratedAssetIntakeManifest = {
      status: items.some((item) => !isKlingModel(item.model))
        ? 'HSL_GENERATED_ASSET_INTAKE_READY' : 'HSL_KLING_ASSET_INTAKE_READY',
      production_id: productionId,
      generated_at: new Date().toISOString(),
      items
    };

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
    Logger.info('FireflyToIntakeBridge', `Manifesto HSL salvo em ${outputPath} com ${items.length} assets validados`);

    return manifest;
  }
}
