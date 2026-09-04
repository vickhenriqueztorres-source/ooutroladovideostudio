import crypto from 'crypto';
import {buildFireflyPrompt} from '../contracts/buildFireflyPrompt';

export interface FireflyVideoPromptInput {
  readonly shotId: string;
  readonly motionPrompt: string;
  readonly startState?: string;
  readonly motionChange?: string;
  readonly endState?: string;
  readonly cameraMotion?: string;
}

export interface FireflyVideoPromptArtifact {
  readonly schema: 'hsl.firefly-video-provider-prompt.v1';
  readonly provider: 'Firefly Video';
  readonly shot_id: string;
  readonly provider_prompt: string;
  readonly provider_prompt_hash: string;
  readonly semantic_intent_validation: Readonly<{status: 'PASS'; errors: readonly []}>;
}

export function adaptFireflyVideoPrompt(input: FireflyVideoPromptInput): FireflyVideoPromptArtifact {
  const physicalAction = [
    input.motionPrompt,
    input.startState ? `Start state: ${input.startState}` : '',
    input.motionChange ? `Visible action: ${input.motionChange}` : '',
    input.endState ? `End state: ${input.endState}` : '',
    input.cameraMotion ? `Camera movement: ${input.cameraMotion}` : '',
    'One continuous five-second observational documentary take with physically plausible temporal motion'
  ].filter(Boolean).join('. ');
  if (!input.motionPrompt.trim()) throw new Error(`FIREFLY_VIDEO_PROMPT_REQUIRED:${input.shotId}`);

  const built = buildFireflyPrompt({
    sceneId: input.shotId,
    visualSubject: physicalAction,
    visual_must_include: [input.motionPrompt.trim()],
    required_category: 'documentary_physical_motion',
    domainTags: ['present-day', 'on-location', 'physical-operation'],
    targetSeconds: 5
  });
  return {
    schema: 'hsl.firefly-video-provider-prompt.v1',
    provider: 'Firefly Video',
    shot_id: input.shotId,
    provider_prompt: built.prompt,
    provider_prompt_hash: `sha256_${crypto.createHash('sha256').update(built.prompt, 'utf8').digest('hex')}`,
    semantic_intent_validation: {status: 'PASS', errors: []}
  };
}
