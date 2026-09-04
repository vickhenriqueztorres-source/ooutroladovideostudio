import {spawnSync} from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {HslGenerationHandoff} from '../../production-bridge/motionToFirefly';
import {HslExecutableScene, HslExecutableVisualShot, HslExecutionPlan} from '../execution/types/execution';
import {PremiumMotionStartFrameAgent} from './premiumMotionStartFrame';
import {
  HSL_PREMIUM_MOTION_REFERENCE_SET,
  HSL_VISUAL_IDENTITY_CONTRACT_VERSION,
  HSL_VISUAL_IDENTITY_RULES
} from '../../config/hslVisualIdentity';
import {StartFrameIdentityGate} from './startFrameIdentityGate';
import {FIREFLY_GENERATION_PROFILE} from '../../config/fireflyGenerationConfig';

export interface HslStartFrameApprovalItem {
  readonly shot_id?: string;
  readonly scene_id?: string;
  readonly status: 'APPROVED' | 'REJECTED';
  readonly approved_start_frame_sha256: string;
  readonly reviewer: string;
  readonly reviewed_at: string;
}

export interface HslStartFrameApprovalManifest {
  readonly episode_id: string;
  readonly status: 'APPROVED';
  readonly visual_identity_contract_version?: string;
  readonly start_frame_provenance_sha256?: string;
  readonly review_artifact_sha256?: string;
  readonly items: readonly HslStartFrameApprovalItem[];
}

export interface HslStartFrameRunResult {
  readonly status: 'MOTION_PACKAGES_READY';
  readonly startFrameManifestPath: string;
  readonly motionPackagePaths: readonly string[];
  readonly handoffs: readonly HslGenerationHandoff[];
  readonly premiumPackagePaths: readonly string[];
}

function shaFile(filePath: string): string {
  return `sha256_${crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')}`;
}

function shaText(value: string): string {
  return `sha256_${crypto.createHash('sha256').update(value, 'utf8').digest('hex')}`;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  const temp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temp, filePath);
}

function imageDimensions(filePath: string): {width: number; height: number} {
  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', filePath], {encoding: 'utf8'});
  if (probe.status !== 0) throw new Error(`START_FRAME_FFPROBE_FAILED:${filePath}:${probe.stderr}`);
  const parsed = JSON.parse(probe.stdout) as {streams?: Array<{width?: number; height?: number}>};
  const width = Number(parsed.streams?.[0]?.width || 0);
  const height = Number(parsed.streams?.[0]?.height || 0);
  if (!width || !height) throw new Error(`START_FRAME_DIMENSIONS_MISSING:${filePath}`);
  return {width, height};
}

export interface HslStartFrameVisualAnalysis {
  readonly status: 'START_FRAME_VISUAL_ANALYSIS_PASS';
  readonly texture_bucket_ratio: number;
  readonly brand_palette_ratio: number;
  readonly dark_pixel_ratio: number;
  readonly saturated_pixel_ratio: number;
  readonly average_edge_delta: number;
  readonly luminance_stddev: number;
}

function samplePixels(filePath: string): Buffer {
  const width = 96;
  const height = 54;
  const probe = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', filePath,
    '-vf', `scale=${width}:${height}:flags=bilinear`,
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'
  ], {encoding: 'buffer', maxBuffer: width * height * 3 + 1024 * 1024});
  if (probe.status !== 0) throw new Error(`START_FRAME_VISUAL_SAMPLE_FAILED:${filePath}:${String(probe.stderr)}`);
  return probe.stdout as Buffer;
}

function visualAnalysis(filePath: string): HslStartFrameVisualAnalysis {
  const width = 96;
  const height = 54;
  const data = samplePixels(filePath);
  const expectedBytes = width * height * 3;
  if (data.length < expectedBytes) throw new Error(`START_FRAME_VISUAL_SAMPLE_INCOMPLETE:${filePath}`);
  const buckets = new Set<string>();
  const luminance: number[] = [];
  let brandPixels = 0;
  let darkPixels = 0;
  let saturatedPixels = 0;
  for (let offset = 0; offset < expectedBytes; offset += 3) {
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lum = .2126 * r + .7152 * g + .0722 * b;
    luminance.push(lum);
    buckets.add(`${r >> 4}:${g >> 4}:${b >> 4}`);
    if (lum < 35) darkPixels++;
    if (max - min > 90 && max > 120) saturatedPixels++;
    const dark = lum < 45;
    const white = Math.abs(r - g) < 25 && Math.abs(g - b) < 25 && lum > 155;
    const yellow = r > 150 && g > 130 && b < 80;
    const blue = b > 110 && r < 80;
    const orange = r > 150 && g > 45 && g < 130 && b < 80;
    if (dark || white || yellow || blue || orange) brandPixels++;
  }
  const edgeDeltas: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) edgeDeltas.push(Math.abs(luminance[y * width + x] - luminance[y * width + x + 1]));
  }
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width; x++) edgeDeltas.push(Math.abs(luminance[y * width + x] - luminance[(y + 1) * width + x]));
  }
  const pixelCount = width * height;
  const mean = luminance.reduce((sum, value) => sum + value, 0) / luminance.length;
  const variance = luminance.reduce((sum, value) => sum + (value - mean) ** 2, 0) / luminance.length;
  const averageEdgeDelta = edgeDeltas.reduce((sum, value) => sum + value, 0) / edgeDeltas.length;
  const analysis = {
    status: 'START_FRAME_VISUAL_ANALYSIS_PASS' as const,
    texture_bucket_ratio: Math.round((buckets.size / pixelCount) * 10000) / 10000,
    brand_palette_ratio: Math.round((brandPixels / pixelCount) * 10000) / 10000,
    dark_pixel_ratio: Math.round((darkPixels / pixelCount) * 10000) / 10000,
    saturated_pixel_ratio: Math.round((saturatedPixels / pixelCount) * 10000) / 10000,
    average_edge_delta: Math.round(averageEdgeDelta * 1000) / 1000,
    luminance_stddev: Math.round(Math.sqrt(variance) * 1000) / 1000
  };
  const flatGraphic = analysis.texture_bucket_ratio < HSL_VISUAL_IDENTITY_RULES.minimumTextureBucketRatio
    && analysis.brand_palette_ratio > .88
    && analysis.luminance_stddev < 36
    && analysis.average_edge_delta < 9;
  if (flatGraphic) throw new Error(`START_FRAME_VISUAL_STYLE_TOO_FLAT:${filePath}:${JSON.stringify(analysis)}`);
  return analysis;
}

export class StartFrameQaAgent {
  validate(filePath: string): {width: number; height: number; sha256: string; visual_analysis: HslStartFrameVisualAnalysis} {
    if (!fs.existsSync(filePath)) throw new Error(`START_FRAME_REQUIRED:${filePath}`);
    const {width, height} = imageDimensions(filePath);
    const ratio = width / height;
    if (Math.abs(ratio - 16 / 9) > 0.012) throw new Error(`START_FRAME_ASPECT_RATIO_INVALID:${width}x${height}`);
    if (width < 1280 || height < 720) throw new Error(`START_FRAME_RESOLUTION_TOO_LOW:${width}x${height}`);
    return {width, height, sha256: shaFile(filePath), visual_analysis: visualAnalysis(filePath)};
  }
}

export class StartFrameContinuityAgent {
  validate(items: readonly {shot_id: string; width: number; height: number}[]): void {
    if (!items.length) throw new Error('START_FRAME_SET_EMPTY');
    const ratios = items.map((item) => item.width / item.height);
    if (ratios.some((ratio) => Math.abs(ratio - ratios[0]) > 0.005)) throw new Error('START_FRAME_CROSS_SHOT_ASPECT_MISMATCH');
    if (new Set(items.map((item) => item.shot_id)).size !== items.length) throw new Error('START_FRAME_SHOT_DUPLICATE');
  }
}

export class HslStartFrameRuntime {
  run(input: Readonly<{
    productionId: string;
    executionPlanPath: string;
    sourceFramesDirectory: string;
    approvalManifestPath: string;
    outputDirectory: string;
  }>): HslStartFrameRunResult {
    const executionPlanPath = path.resolve(input.executionPlanPath);
    const executionPlan = JSON.parse(fs.readFileSync(executionPlanPath, 'utf8')) as HslExecutionPlan;
    if (executionPlan.status !== 'EXECUTION_PLAN_APPROVED') throw new Error('HSL_EXECUTION_PLAN_NOT_APPROVED');
    const executionRoot = path.dirname(executionPlanPath);
    const scenes = executionPlan.scenes
      .map((relative) => path.resolve(executionRoot, relative))
      .map((scenePath) => JSON.parse(fs.readFileSync(scenePath, 'utf8')) as HslExecutableScene);
    const generatedShots = scenes.flatMap((scene) => {
      const shots = scene.visual_shots?.length ? scene.visual_shots : [this.legacyShot(scene)];
      return shots.filter((shot) => shot.visual_mode === 'generated_ai').map((shot) => ({shot, executionRevision: scene.execution_revision}));
    });
    if (!generatedShots.length) throw new Error('HSL_GENERATED_SHOTS_REQUIRED');
    const identityLocked = executionPlan.visual_identity_contract_version === HSL_VISUAL_IDENTITY_CONTRACT_VERSION;
    if (identityLocked && executionPlan.required_visual_reference_set !== HSL_PREMIUM_MOTION_REFERENCE_SET.name) {
      throw new Error('HSL_EXECUTION_VISUAL_REFERENCE_SET_MISMATCH');
    }
    const approvalPath = path.resolve(input.approvalManifestPath);
    if (!fs.existsSync(approvalPath)) throw new Error('HSL_START_FRAME_HUMAN_APPROVAL_REQUIRED');
    const approval = JSON.parse(fs.readFileSync(approvalPath, 'utf8')) as HslStartFrameApprovalManifest;
    if (approval.episode_id !== executionPlan.episode_id || approval.status !== 'APPROVED') throw new Error('HSL_START_FRAME_APPROVAL_INVALID');
    const approvalHash = shaFile(approvalPath);
    const approvalByShot = new Map(approval.items.map((item) => [item.shot_id || item.scene_id || '', item]));
    const qa = new StartFrameQaAgent();
    const frameRecords: Array<{shot_id: string; parent_scene_id: string; path: string; sha256: string; width: number; height: number; prompt: string}> = [];
    const outputRoot = path.resolve(input.outputDirectory);
    for (const {shot} of generatedShots) {
      const candidates = ['.png', '.jpg', '.jpeg', '.webp'].map((ext) => path.join(path.resolve(input.sourceFramesDirectory), `${shot.shot_id}${ext}`));
      const source = candidates.find((candidate) => fs.existsSync(candidate));
      if (!source) throw new Error(`START_FRAME_REQUIRED:${shot.shot_id}`);
      const validation = qa.validate(source);
      const shotApproval = approvalByShot.get(shot.shot_id);
      if (!shotApproval || shotApproval.status !== 'APPROVED') throw new Error(`HSL_START_FRAME_SHOT_APPROVAL_REQUIRED:${shot.shot_id}`);
      if (shotApproval.approved_start_frame_sha256 !== validation.sha256) throw new Error(`HSL_START_FRAME_APPROVAL_HASH_MISMATCH:${shot.shot_id}`);
      const destination = path.join(outputRoot, 'start-frames', shot.shot_id, `START_FRAME_${shot.shot_id}${path.extname(source).toLowerCase()}`);
      fs.mkdirSync(path.dirname(destination), {recursive: true});
      fs.copyFileSync(source, destination);
      frameRecords.push({shot_id: shot.shot_id, parent_scene_id: shot.parent_scene_id, path: destination, sha256: validation.sha256, width: validation.width, height: validation.height, prompt: shot.start_frame_prompt || ''});
    }
    let provenanceHash: string | null = null;
    if (identityLocked) {
      const provenancePath = path.join(path.resolve(input.sourceFramesDirectory), 'start-frame-provenance.json');
      new StartFrameIdentityGate().validate({
        provenanceManifestPath: provenancePath,
        expectedShots: frameRecords.map((frame) => ({
          shot_id: frame.shot_id,
          frame_path: frame.path,
          start_frame_prompt: frame.prompt
        }))
      });
      provenanceHash = shaFile(provenancePath);
      if (approval.visual_identity_contract_version !== HSL_VISUAL_IDENTITY_CONTRACT_VERSION) {
        throw new Error('HSL_START_FRAME_APPROVAL_IDENTITY_VERSION_REQUIRED');
      }
      if (approval.start_frame_provenance_sha256 !== provenanceHash) {
        throw new Error('HSL_START_FRAME_APPROVAL_PROVENANCE_HASH_MISMATCH');
      }
      if (!approval.review_artifact_sha256) throw new Error('HSL_START_FRAME_APPROVAL_REVIEW_ARTIFACT_REQUIRED');
    }
    new StartFrameContinuityAgent().validate(frameRecords);
    const startFrameManifestPath = path.join(outputRoot, 'start-frame-manifest.json');
    writeJson(startFrameManifestPath, {
      schema: 'hsl.start-frame.manifest.v1', episode_id: executionPlan.episode_id,
      status: 'HUMAN_APPROVED', human_approval_hash: approvalHash,
      visual_identity_contract_version: identityLocked ? HSL_VISUAL_IDENTITY_CONTRACT_VERSION : null,
      start_frame_provenance_sha256: provenanceHash,
      review_artifact_sha256: approval.review_artifact_sha256 || null,
      items: frameRecords
    });
    const motionPackagePaths: string[] = [];
    const premiumPackagePaths: string[] = [];
    const handoffs: HslGenerationHandoff[] = [];
    for (const {shot, executionRevision} of generatedShots) {
      const frame = frameRecords.find((candidate) => candidate.shot_id === shot.shot_id)!;
      if (!shot.motion || !shot.visual_function) throw new Error(`HSL_FIREFLY_MOTION_REQUIRED:${shot.shot_id}`);
      const shotApproval = approvalByShot.get(shot.shot_id)!;
      const premiumPackage = new PremiumMotionStartFrameAgent().package({
        shot, approvedFramePath: frame.path, approvedFrameSha256: frame.sha256,
        reviewer: shotApproval.reviewer, reviewedAt: shotApproval.reviewed_at,
        outputDirectory: path.join(outputRoot, 'premium-motion-packages', shot.shot_id)
      });
      if (premiumPackage) premiumPackagePaths.push(premiumPackage.packageDirectory);
      const isVeo = shot.generation_strategy === 'VEO_MOTION_GRAPHIC' || shot.generation_strategy === 'VEO_REMOTION_HYBRID';
      const duration = isVeo ? shot.veo_motion!.duration_seconds : 5;
      const motionPackage = {
        schema: isVeo ? 'hsl.veo.generation-package.v1' : 'hsl.firefly-video.generation-package.v1',
        status: isVeo ? 'GENERATION_PACKAGE_READY_FOR_VEO' : 'GENERATION_PACKAGE_READY_FOR_FIREFLY',
        episode_id: executionPlan.episode_id, shot_id: shot.shot_id, parent_scene_id: shot.parent_scene_id,
        execution_revision: executionRevision,
        start_frame_path: frame.path, start_frame_sha256: frame.sha256,
        generation_strategy: isVeo ? shot.generation_strategy : 'FIREFLY_CINEMATIC',
        audio_strategy: shot.audio_strategy || 'KENNEY_DESIGNED',
        model: isVeo ? 'Veo 3.1 Fast' : FIREFLY_GENERATION_PROFILE.model,
        generate_audio: Boolean(isVeo && shot.veo_motion?.generate_audio),
        premium_start_frame_package: premiumPackage?.packageDirectory || null,
        motion_family: shot.motion_family || null,
        motion_prompt: isVeo ? shot.veo_motion!.provider_prompt : shot.motion.motion_prompt,
        start_state: shot.motion.start_state,
        motion_change: shot.motion.motion_change, end_state: shot.motion.end_state,
        camera_motion: shot.motion.camera_motion,
        planned_usable_seconds: Math.min(shot.planned_duration_seconds, duration),
        head_handle_seconds: 0.4, tail_handle_seconds: 0.4,
        generation_duration_seconds: duration, supported_duration_seconds: isVeo ? [4, 6, 8] : [5],
        resolution: isVeo ? shot.veo_motion!.resolution : '1080p', aspect_ratio: '16:9',
        evidence_status: 'illustrative', ai_disclosure_required: true, on_screen_label: 'AI VISUALIZATION'
      };
      const packagePath = path.join(outputRoot, 'motion-packages', shot.shot_id, `${shot.shot_id}.generation-package.json`);
      writeJson(packagePath, motionPackage);
      motionPackagePaths.push(packagePath);
      handoffs.push({
        production_id: input.productionId, run_id: executionPlan.episode_id, shot_id: shot.shot_id,
        motion_package_path: packagePath, motion_package_sha256: shaFile(packagePath),
        start_frame_path: frame.path, start_frame_sha256: frame.sha256,
        human_approval_hash: approvalHash, source_system: 'hidden-systems-lab', target_system: 'b2-mission-control',
        handoff_mode: 'MISSION_CONTROL_AUTOMATED', eligible_for_automated_video_dispatch: true,
        visual_function: shot.visual_function, evidence_status: 'illustrative', ai_disclosure_required: true,
        on_screen_label: 'AI VISUALIZATION', created_at: new Date().toISOString(),
        generation_strategy: isVeo ? shot.generation_strategy : 'FIREFLY_CINEMATIC',
        audio_strategy: shot.audio_strategy || 'KENNEY_DESIGNED',
        requested_model: isVeo ? 'Veo 3.1 Fast' : FIREFLY_GENERATION_PROFILE.model,
        generate_audio: Boolean(isVeo && shot.veo_motion?.generate_audio),
        premium_start_frame_package_path: premiumPackage?.packageDirectory
      });
    }
    const handoffPath = path.join(outputRoot, 'mission-control-handoffs.json');
    writeJson(handoffPath, {schema: 'hsl.firefly.handoff-set.v1', episode_id: executionPlan.episode_id, handoffs, approval_fingerprint: shaText(approvalHash)});
    return {status: 'MOTION_PACKAGES_READY', startFrameManifestPath, motionPackagePaths, handoffs, premiumPackagePaths};
  }

  private legacyShot(scene: HslExecutableScene): HslExecutableVisualShot {
    return {
      schema: 'hsl.execution.visual-shot.v1', schema_version: '1.0.0', episode_id: scene.episode_id,
      parent_scene_id: scene.scene_id, shot_id: scene.scene_id, shot_index: 1, variant: 'ESTABLISH',
      visual_mode: scene.visual_mode as HslExecutableVisualShot['visual_mode'], visual_subject: scene.visual_subject,
      planned_duration_seconds: scene.planned_duration_seconds, evidence_status: scene.evidence_status,
      ai_disclosure_required: scene.ai_disclosure_required, visual_function: scene.visual_function || null,
      start_frame_prompt: scene.start_frame_prompt, motion: scene.motion
    };
  }
}
