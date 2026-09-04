import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { HslGenerationHandoff, MotionToFireflyBridge } from '../production-bridge/motionToFirefly';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

function sha(filePath: string): string {
  return `sha256_${crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')}`;
}

function fixture(): {handoff: HslGenerationHandoff; guidePath: string} {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hsl-mc-bridge-'));
  const framePath = path.join(root, 'FUEL_FARM_START.png');
  fs.writeFileSync(framePath, PNG_1X1);
  const packagePath = path.join(root, 'GENERATION_PACKAGE.json');
  fs.writeFileSync(packagePath, JSON.stringify({
    status: 'GENERATION_PACKAGE_READY_FOR_FIREFLY',
    shot_id: 'HSL_004',
    start_frame_path: framePath,
    start_frame_sha256: sha(framePath),
    motion_prompt: 'Fuel moves slowly through a clearly visible industrial pipe network.',
    start_state: 'The fuel farm is still at dawn',
    motion_change: 'Fuel begins moving through the pipe network',
    end_state: 'The highlighted route reaches the storage manifold',
    generation_duration_seconds: 5,
    supported_duration_seconds: [5],
    resolution: '1080p',
    aspect_ratio: '16:9'
  }, null, 2));
  return {
    guidePath: path.join(root, 'bridge', 'guide.json'),
    handoff: {
      production_id: 'HSL-PILOT-001',
      run_id: 'HSL-KLING-ASSET-001',
      shot_id: 'HSL_004',
      motion_package_path: packagePath,
      motion_package_sha256: sha(packagePath),
      start_frame_path: framePath,
      start_frame_sha256: sha(framePath),
      human_approval_hash: `sha256_${'a'.repeat(64)}`,
      source_system: 'hidden-systems-lab',
      target_system: 'b2-mission-control',
      handoff_mode: 'MISSION_CONTROL_AUTOMATED',
      eligible_for_automated_video_dispatch: true,
      visual_function: 'invisible_process',
      evidence_status: 'illustrative',
      ai_disclosure_required: true,
      on_screen_label: 'AI VISUALIZATION',
      generation_strategy: 'FIREFLY_CINEMATIC',
      requested_model: 'Kling 2.5 Turbo',
      created_at: '2026-08-19T00:00:00.000Z'
    }
  };
}

test('HSL handoff preserves 16:9 start-frame lineage and disclosure', () => {
  const {handoff, guidePath} = fixture();
  const receipt = MotionToFireflyBridge.convertHslHandoff(handoff, guidePath);
  const guide = JSON.parse(fs.readFileSync(guidePath, 'utf8'));
  assert.equal(guide.aspect_ratio, '16:9');
  assert.equal(guide.resolution, '1080p');
  assert.equal(guide.ai_disclosure_required, true);
  assert.equal(guide.on_screen_label, 'AI VISUALIZATION');
  assert.equal(guide.model, 'Kling 2.5 Turbo');
  assert.equal(guide.fps, 24);
  assert.equal(guide.duration_seconds, 5);
  assert.equal(guide.use_first_frame, true);
  assert.doesNotMatch(guide.items[0].prompt, /provided first frame/i);
  assert.equal(sha(receipt.copied_start_frame_path), handoff.start_frame_sha256);
});

test('HSL handoff rejects an unlabelled AI visualization', () => {
  const {handoff, guidePath} = fixture();
  (handoff as any).on_screen_label = 'DOCUMENTARY FOOTAGE';
  assert.throws(() => MotionToFireflyBridge.convertHslHandoff(handoff, guidePath), /HSL_AI_DISCLOSURE_LABEL_INVALID/);
});
