import fs from 'fs';
import path from 'path';
import {FireflyAdapter} from '../adapters/fireflyAdapter';
import {HslGenerationHandoff, MotionToFireflyBridge} from '../production-bridge/motionToFirefly';
import {FIREFLY_GENERATION_PROFILE as profile} from '../config/fireflyGenerationConfig';

export interface HslFireflyPreparedBatch {
  readonly masterGuidePath: string;
  readonly jobNames: readonly string[];
  readonly lineageByJobName: Readonly<Record<string, {motion_package_hash: string; start_frame_sha256: string; model?: string; generate_audio?: boolean; start_frame_path?: string; generation_strategy?: string}>>;
}

export class HslFireflyGenerationRuntime {
  prepare(handoffs: readonly HslGenerationHandoff[], outputDirectory: string): HslFireflyPreparedBatch {
    if (!handoffs.length) throw new Error('HSL_FIREFLY_HANDOFF_SET_EMPTY');
    const outputRoot = path.resolve(outputDirectory);
    const targetResolution = process.env.HSL_FIREFLY_TARGET_RESOLUTION || profile.resolution;
    if (targetResolution !== profile.resolution) {
      throw new Error(`HSL_VISUAL_IDENTITY_RESOLUTION_FORBIDDEN:${targetResolution}`);
    }
    const items: Array<{name: string; image: string; prompt: string; model: string; resolution: string; aspect_ratio: string; duration_seconds: number; generate_audio: boolean; use_first_frame: boolean; input_mode: string; source_shot_id: string; source_start_frame_sha256: string; motion_package_sha256: string}> = [];
    const lineageByJobName: Record<string, {motion_package_hash: string; start_frame_sha256: string; model?: string; generate_audio?: boolean; start_frame_path?: string; generation_strategy?: string}> = {};
    for (const handoff of handoffs) {
      const shotDir = path.join(outputRoot, 'shots', handoff.shot_id);
      const receipt = MotionToFireflyBridge.convertHslHandoff(handoff, path.join(shotDir, 'firefly-guide.json'));
      const item = receipt.guide[0];
      const masterImages = path.join(outputRoot, 'imagens');
      fs.mkdirSync(masterImages, {recursive: true});
      const masterImage = path.join(masterImages, path.basename(receipt.copied_start_frame_path));
      fs.copyFileSync(receipt.copied_start_frame_path, masterImage);
      items.push({
        name: item.name, image: path.basename(masterImage), prompt: item.prompt,
        model: profile.model, resolution: targetResolution, aspect_ratio: profile.aspect_ratio,
        duration_seconds: profile.duration_seconds, generate_audio: profile.generate_audio,
        use_first_frame: profile.requires_first_frame, input_mode: 'image_to_video',
        source_shot_id: handoff.shot_id, source_start_frame_sha256: handoff.start_frame_sha256,
        motion_package_sha256: handoff.motion_package_sha256
      });
      lineageByJobName[item.name] = {
        motion_package_hash: handoff.motion_package_sha256, start_frame_sha256: handoff.start_frame_sha256,
        model: profile.model, generate_audio: profile.generate_audio,
        start_frame_path: handoff.start_frame_path, generation_strategy: handoff.generation_strategy
      };
    }
    const masterGuidePath = path.join(outputRoot, 'firefly-production-guide.json');
    fs.writeFileSync(masterGuidePath, `${JSON.stringify({
      schema: 'hsl.firefly.multi-provider-guide.v3', model: profile.model, resolution: targetResolution,
      aspect_ratio: profile.aspect_ratio, fps: profile.fps, duration_seconds: profile.duration_seconds,
      generate_audio: profile.generate_audio, use_first_frame: profile.requires_first_frame, items
    }, null, 2)}\n`, 'utf8');
    return {masterGuidePath, jobNames: items.map((item) => item.name), lineageByJobName};
  }

  async dispatch(productionId: string, prepared: Readonly<HslFireflyPreparedBatch>, adapter: FireflyAdapter): Promise<{success: boolean; completedJobs: Array<{name: string; output_path: string}>}> {
    if (process.env.HSL_ALLOW_PAID_FIREFLY_DISPATCH !== 'true') throw new Error('HSL_PAID_FIREFLY_DISPATCH_NOT_AUTHORIZED');
    process.env.FIREFLY_ALLOW_CREDIT_SPEND = 'true';
    process.env.FIREFLY_CONTINUE_ON_PROVIDER_ERROR = 'false';
    process.env.FIREFLY_CONTINUE_ON_FAILED_INFRA = 'false';
    return adapter.feedGuideAndRun(productionId, prepared.masterGuidePath);
  }
}
