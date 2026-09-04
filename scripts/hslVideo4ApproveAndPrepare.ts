import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import {HslStartFrameRuntime} from '../hsl/startframe/startFrameRuntime';
import {HslFireflyGenerationRuntime} from '../production/hslFireflyGenerationRuntime';

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function main(): void {
  if (process.env.HSL_CONFIRMED_HUMAN_APPROVAL !== 'true') throw new Error('HSL_CONFIRMED_HUMAN_APPROVAL_REQUIRED');
  const reviewer = process.env.HSL_START_FRAME_REVIEWER?.trim();
  if (!reviewer) throw new Error('HSL_START_FRAME_REVIEWER_REQUIRED');
  const productionId = process.env.HSL_VIDEO_4_RUN_ID || 'HSL-VIDEO-004';
  const outputRoot = path.resolve(process.env.HSL_VIDEO_4_OUTPUT || path.join('runs', productionId));
  const candidatesRoot = path.join(outputRoot, 'start-frame-candidates');
  const qaPath = path.join(candidatesRoot, 'start-frame-technical-qa.json');
  const qa = JSON.parse(fs.readFileSync(qaPath, 'utf8')) as {
    episode_id: string;
    status: string;
    items: Array<{shot_id: string; sha256: string; status: string}>;
  };
  if (qa.status !== 'START_FRAME_SET_QA_PASS' || qa.items.some((item) => item.status !== 'START_FRAME_QA_PASS')) {
    throw new Error('HSL_VIDEO_4_START_FRAME_TECHNICAL_QA_REQUIRED');
  }

  const reviewedAt = new Date().toISOString();
  const approvalManifestPath = path.join(candidatesRoot, 'start-frame-approval-manifest.json');
  writeJson(approvalManifestPath, {
    schema: 'hsl.video-4.start-frame.approval.v1',
    schema_version: '1.0.0',
    episode_id: qa.episode_id,
    status: 'APPROVED',
    reviewer,
    reviewed_at: reviewedAt,
    approval_source: 'EXPLICIT_USER_APPROVAL_IN_CODEX_TASK',
    items: qa.items.map((item) => ({
      shot_id: item.shot_id,
      status: 'APPROVED',
      approved_start_frame_sha256: item.sha256,
      reviewer,
      reviewed_at: reviewedAt
    }))
  });

  process.env.HSL_FIREFLY_TARGET_RESOLUTION = process.env.HSL_FIREFLY_TARGET_RESOLUTION || '1080p';
  const startFrames = new HslStartFrameRuntime().run({
    productionId,
    executionPlanPath: path.join(outputRoot, 'editorial', 'execution', 'episode.execution.json'),
    sourceFramesDirectory: candidatesRoot,
    approvalManifestPath,
    outputDirectory: path.join(outputRoot, 'generation')
  });
  const prepared = new HslFireflyGenerationRuntime().prepare(startFrames.handoffs, path.join(outputRoot, 'firefly'));
  const modelCounts = startFrames.handoffs.reduce<Record<string, number>>((counts, handoff) => {
    const model = handoff.requested_model || 'Firefly Video';
    counts[model] = (counts[model] || 0) + 1;
    return counts;
  }, {});
  const manifestPath = path.join(outputRoot, 'firefly', 'video-4-generation-preparation.json');
  writeJson(manifestPath, {
    schema: 'hsl.video-4.generation-preparation.v1',
    schema_version: '1.0.0',
    production_id: productionId,
    status: 'GENERATION_GUIDE_READY',
    dispatch_authorized: false,
    target_provider_override: 'Firefly Video',
    target_resolution: '1080p',
    approval_manifest_path: approvalManifestPath,
    start_frame_manifest_path: startFrames.startFrameManifestPath,
    motion_package_count: startFrames.motionPackagePaths.length,
    motion_package_paths: startFrames.motionPackagePaths,
    premium_package_count: startFrames.premiumPackagePaths.length,
    source_provider_model_counts: modelCounts,
    generation_guide_path: prepared.masterGuidePath,
    generation_jobs: prepared.jobNames,
    prepared_at: new Date().toISOString()
  });
  process.stdout.write(`${JSON.stringify({
    status: 'GENERATION_GUIDE_READY',
    motion_package_count: startFrames.motionPackagePaths.length,
    source_provider_model_counts: modelCounts,
    target_provider_override: 'Firefly Video',
    target_resolution: '1080p',
    generation_guide_path: prepared.masterGuidePath,
    preparation_manifest_path: manifestPath
  }, null, 2)}\n`);
}

main();
