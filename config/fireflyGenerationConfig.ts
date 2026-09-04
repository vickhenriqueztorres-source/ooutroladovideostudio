import rawProfile = require('./fireflyGenerationProfile.json');

export interface FireflyGenerationProfile {
  readonly schema: 'ool.firefly.generation-profile.v1';
  readonly model: 'Kling 2.5 Turbo';
  readonly model_value: string;
  readonly resolution: '1080p';
  readonly aspect_ratio: '16:9';
  readonly aspect_ratio_label: 'Widescreen (16:9)';
  readonly fps: 24;
  readonly duration_seconds: 5;
  readonly requires_first_frame: true;
  readonly generate_audio: false;
}

const profile = rawProfile as FireflyGenerationProfile;

if (
  profile.model !== 'Kling 2.5 Turbo' ||
  profile.resolution !== '1080p' ||
  profile.aspect_ratio !== '16:9' ||
  profile.fps !== 24 ||
  profile.duration_seconds !== 5 ||
  profile.requires_first_frame !== true
) {
  throw new Error('FIREFLY_GENERATION_PROFILE_INVALID');
}

export const FIREFLY_GENERATION_PROFILE = Object.freeze(profile);
