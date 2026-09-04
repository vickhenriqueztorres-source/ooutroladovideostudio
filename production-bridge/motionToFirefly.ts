import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Logger } from '../event-hub/logger';
import {adaptFireflyVideoPrompt} from './fireflyVideoPromptAdapter';
import {adaptVeoProviderPrompt} from './veoProviderPromptAdapter';
import {HslAudioStrategy, HslGenerationStrategy} from '../hsl/motion/generatedMotion';
import {FIREFLY_GENERATION_PROFILE as profile} from '../config/fireflyGenerationConfig';

export interface GenerationMotionPackageItem {
  shot_id: string;
  take_id?: string;
  prompt?: string;
  motion_prompt?: string;
  start_frame_path?: string;
  image_path?: string;
  model?: string;
  resolution?: string;
  aspect_ratio?: string;
  duration_seconds?: number;
}

export interface FireflyGuideItem {
  name: string;
  prompt: string;
  image_path: string;
  model: string;
  resolution: string;
  aspect_ratio: string;
  fps?: number;
  duration_seconds: number;
  generate_audio?: boolean;
  use_first_frame?: boolean;
  input_mode?: string;
}

export interface HslGenerationHandoff {
  production_id: string;
  run_id: string;
  shot_id: string;
  motion_package_path: string;
  motion_package_sha256: string;
  start_frame_path: string;
  start_frame_sha256: string;
  human_approval_hash: string;
  source_system: 'hidden-systems-lab';
  target_system: 'b2-mission-control';
  handoff_mode: 'MISSION_CONTROL_AUTOMATED';
  eligible_for_automated_video_dispatch: true;
  visual_function: 'atmosphere' | 'scale' | 'reconstruction' | 'invisible_process' | 'transition';
  evidence_status: 'illustrative' | 'not_evidence';
  ai_disclosure_required: true;
  on_screen_label: 'AI VISUALIZATION';
  created_at: string;
  generation_strategy?: HslGenerationStrategy;
  audio_strategy?: HslAudioStrategy;
  requested_model?: 'Kling 2.5 Turbo' | 'Firefly Video' | 'Kling 3.0' | 'Veo 3.1 Fast';
  generate_audio?: boolean;
  premium_start_frame_package_path?: string;
}

export interface HslFireflyBridgeReceipt {
  guide: FireflyGuideItem[];
  source_start_frame_sha256: string;
  motion_package_sha256: string;
  copied_start_frame_path: string;
  firefly_guide_path: string;
  provider_prompt_path: string;
  provider_prompt_hash: string;
}

function sha256File(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export class MotionToFireflyBridge {
  public static convert(
    motionPackagePath: string,
    outputPath: string
  ): FireflyGuideItem[] {
    Logger.info('MotionToFireflyBridge', `Convertendo Motion Package: ${motionPackagePath}`);

    if (!fs.existsSync(motionPackagePath)) {
      throw new Error(`Arquivo de Motion Package não encontrado: ${motionPackagePath}`);
    }

    const outputDir = path.dirname(outputPath);
    const imagesDir = path.join(outputDir, 'imagens');
    
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const rawData = fs.readFileSync(motionPackagePath, 'utf-8');
    const motionData = JSON.parse(rawData);
    
    const rawItems: any[] = Array.isArray(motionData) 
      ? motionData 
      : (motionData.shots || motionData.items || [motionData]);

    const fireflyGuide: FireflyGuideItem[] = rawItems.map((item, index) => {
      const shotName = item.shot_id || `SHOT_${(index + 1).toString().padStart(2, '0')}`;
      const takeName = item.take_id || 'TAKE_01';
      const promptText = item.motion_prompt || item.prompt || 'Cinematic movement';
      const origImagePath = item.start_frame_path || item.image_path || '';

      const destImageName = `${shotName}_${takeName}_start.png`;
      const destImagePath = path.join(imagesDir, destImageName);

      if (!fs.existsSync(origImagePath)) {
        throw new Error(`START_FRAME_REQUIRED: ${shotName} has no physical start frame`);
      }
      fs.copyFileSync(origImagePath, destImagePath);
      const providerPrompt = adaptFireflyVideoPrompt({
        shotId: shotName,
        motionPrompt: String(promptText),
        startState: item.start_state,
        motionChange: item.motion_change,
        endState: item.end_state,
        cameraMotion: item.camera_motion
      });

      return {
        name: `${shotName}_${takeName}`,
        prompt: providerPrompt.provider_prompt,
        image_path: destImageName, // Exigido pelo Firefly JobStore dentro da pasta imagens/
        model: profile.model,
        resolution: profile.resolution,
        aspect_ratio: profile.aspect_ratio,
        fps: profile.fps,
        duration_seconds: profile.duration_seconds,
        generate_audio: profile.generate_audio,
        use_first_frame: profile.requires_first_frame,
        input_mode: 'image_to_video'
      };
    });

    const fireflyOutputFormat = {
      model: profile.model,
      resolution: profile.resolution,
      aspect_ratio: profile.aspect_ratio,
      fps: profile.fps,
      duration_seconds: profile.duration_seconds,
      generate_audio: profile.generate_audio,
      use_first_frame: profile.requires_first_frame,
      items: fireflyGuide.map(item => ({
        name: item.name,
        image: item.image_path,
        prompt: item.prompt,
        model: profile.model,
        resolution: profile.resolution,
        aspect_ratio: profile.aspect_ratio,
        fps: profile.fps,
        duration_seconds: profile.duration_seconds,
        generate_audio: profile.generate_audio,
        use_first_frame: profile.requires_first_frame,
        input_mode: 'image_to_video'
      }))
    };

    fs.writeFileSync(outputPath, JSON.stringify(fireflyOutputFormat, null, 2), 'utf-8');
    Logger.info('MotionToFireflyBridge', `Guia Firefly gerada com sucesso em ${outputPath} com ${fireflyGuide.length} itens.`);

    return fireflyGuide;
  }

  public static convertHslHandoff(
    handoff: HslGenerationHandoff,
    outputPath: string
  ): HslFireflyBridgeReceipt {
    Logger.info('MotionToFireflyBridge', `Converting strict HSL handoff: ${handoff.motion_package_path}`);

    if (handoff.source_system !== 'hidden-systems-lab' || handoff.target_system !== 'b2-mission-control') {
      throw new Error('HSL_TO_MC_HANDOFF_INVALID: source/target system mismatch');
    }
    if (handoff.handoff_mode !== 'MISSION_CONTROL_AUTOMATED' || handoff.eligible_for_automated_video_dispatch !== true) {
      throw new Error('HSL_TO_MC_HANDOFF_INVALID: automated dispatch not explicitly enabled');
    }
    if (!fs.existsSync(handoff.motion_package_path)) {
      throw new Error(`HSL_TO_MC_HANDOFF_INVALID: generation package not found: ${handoff.motion_package_path}`);
    }
    if (!fs.existsSync(handoff.start_frame_path)) {
      throw new Error(`START_FRAME_HANDOFF_HASH_MISMATCH: start frame not found: ${handoff.start_frame_path}`);
    }
    const actualMotionHash = `sha256_${sha256File(handoff.motion_package_path)}`;
    if (actualMotionHash !== handoff.motion_package_sha256) {
      throw new Error('HSL_TO_MC_HANDOFF_INVALID: generation package SHA mismatch');
    }
    const actualStartFrameHash = `sha256_${sha256File(handoff.start_frame_path)}`;
    if (actualStartFrameHash !== handoff.start_frame_sha256) {
      throw new Error('START_FRAME_HANDOFF_HASH_MISMATCH');
    }

    const motionData = JSON.parse(fs.readFileSync(handoff.motion_package_path, 'utf-8'));
    if (!['GENERATION_PACKAGE_READY_FOR_FIREFLY', 'GENERATION_PACKAGE_READY_FOR_KLING', 'GENERATION_PACKAGE_READY_FOR_VEO'].includes(motionData.status)) {
      throw new Error('MOTION_PACKAGE_SCHEMA_INVALID: status is not ready');
    }
    if (motionData.shot_id !== handoff.shot_id || motionData.start_frame_sha256 !== handoff.start_frame_sha256) {
      throw new Error('HSL_TO_MC_HANDOFF_INVALID: package lineage mismatch');
    }
    if (handoff.evidence_status === 'illustrative' && handoff.ai_disclosure_required !== true) {
      throw new Error('HSL_AI_DISCLOSURE_REQUIRED');
    }
    if (handoff.on_screen_label !== 'AI VISUALIZATION') {
      throw new Error('HSL_AI_DISCLOSURE_LABEL_INVALID');
    }
    const duration = Number(motionData.generation_duration_seconds);
    if (!Array.isArray(motionData.supported_duration_seconds) || !motionData.supported_duration_seconds.includes(duration)) {
      throw new Error('MOTION_DURATION_BRIDGE_MISMATCH');
    }

    const outputDir = path.dirname(outputPath);
    const imagesDir = path.join(outputDir, 'imagens');
    fs.mkdirSync(imagesDir, { recursive: true });

    const takeName = 'TAKE_01';
    const copiedStartFrameName = `${handoff.shot_id}_${takeName}_start${path.extname(handoff.start_frame_path) || '.png'}`;
    const copiedStartFramePath = path.join(imagesDir, copiedStartFrameName);
    fs.copyFileSync(handoff.start_frame_path, copiedStartFramePath);
    const copiedHash = `sha256_${sha256File(copiedStartFramePath)}`;
    if (copiedHash !== handoff.start_frame_sha256) {
      throw new Error('START_FRAME_HANDOFF_HASH_MISMATCH');
    }

    const isVeo = motionData.status === 'GENERATION_PACKAGE_READY_FOR_VEO' || handoff.requested_model === 'Veo 3.1 Fast';
    const providerPrompt = isVeo
      ? adaptVeoProviderPrompt(handoff.shot_id, String(motionData.motion_prompt || ''))
      : adaptFireflyVideoPrompt({
        shotId: handoff.shot_id,
        motionPrompt: String(motionData.motion_prompt || ''),
        startState: String(motionData.start_state || ''),
        motionChange: String(motionData.motion_change || ''),
        endState: String(motionData.end_state || ''),
        cameraMotion: String(motionData.camera_motion || '')
      });
    if (providerPrompt.semantic_intent_validation.status !== 'PASS') {
      throw new Error(`PROVIDER_PROMPT_SEMANTIC_DRIFT:${providerPrompt.semantic_intent_validation.errors.join(',')}`);
    }
    const providerPromptPath = path.join(outputDir, `${handoff.shot_id}.provider-prompt.json`);
    fs.writeFileSync(providerPromptPath, JSON.stringify(providerPrompt, null, 2), 'utf-8');

    const guideItem: FireflyGuideItem = {
      name: `${handoff.shot_id}_${takeName}`,
      prompt: providerPrompt.provider_prompt,
      image_path: copiedStartFrameName,
      model: isVeo ? 'Veo 3.1 Fast' : profile.model,
      resolution: isVeo ? String(motionData.resolution || profile.resolution) : profile.resolution,
      aspect_ratio: isVeo ? String(motionData.aspect_ratio || profile.aspect_ratio) : profile.aspect_ratio,
      fps: isVeo ? undefined : profile.fps,
      duration_seconds: isVeo ? duration : profile.duration_seconds,
      generate_audio: Boolean(isVeo && motionData.generate_audio),
      use_first_frame: true,
      input_mode: 'image_to_video'
    };
    if (!guideItem.prompt.trim()) {
      throw new Error('MOTION_PACKAGE_SCHEMA_INVALID: empty motion prompt');
    }

    const fireflyOutputFormat = {
      model: guideItem.model,
      resolution: guideItem.resolution,
      aspect_ratio: guideItem.aspect_ratio,
      fps: guideItem.fps,
      duration_seconds: guideItem.duration_seconds,
      generate_audio: guideItem.generate_audio || false,
      use_first_frame: guideItem.use_first_frame === true,
      input_mode: guideItem.input_mode,
      source_production_id: handoff.production_id,
      source_run_id: handoff.run_id,
      source_shot_id: handoff.shot_id,
      source_start_frame_sha256: handoff.start_frame_sha256,
      motion_package_sha256: handoff.motion_package_sha256,
      visual_function: handoff.visual_function,
      evidence_status: handoff.evidence_status,
      ai_disclosure_required: handoff.ai_disclosure_required,
      on_screen_label: handoff.on_screen_label,
      editorial_useful_duration: motionData.planned_usable_seconds,
      handles: {
        head: motionData.head_handle_seconds,
        tail: motionData.tail_handle_seconds
      },
      items: [{
        name: guideItem.name,
        image: guideItem.image_path,
        prompt: guideItem.prompt,
        source_shot_id: handoff.shot_id,
        source_start_frame_sha256: handoff.start_frame_sha256,
        motion_package_sha256: handoff.motion_package_sha256
        ,model: guideItem.model
        ,resolution: guideItem.resolution
        ,aspect_ratio: guideItem.aspect_ratio
        ,fps: guideItem.fps
        ,duration_seconds: guideItem.duration_seconds
        ,generate_audio: guideItem.generate_audio || false
        ,use_first_frame: guideItem.use_first_frame === true
        ,input_mode: guideItem.input_mode
      }]
    };

    fs.writeFileSync(outputPath, JSON.stringify(fireflyOutputFormat, null, 2), 'utf-8');
    return {
      guide: [guideItem],
      source_start_frame_sha256: handoff.start_frame_sha256,
      motion_package_sha256: handoff.motion_package_sha256,
      copied_start_frame_path: copiedStartFramePath,
      firefly_guide_path: outputPath,
      provider_prompt_path: providerPromptPath,
      provider_prompt_hash: providerPrompt.provider_prompt_hash
    };
  }
}
