import Ajv2020, {ErrorObject} from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import cinematicEpisodePlanV1Schema from '../schemas/cinematicEpisodePlanV1.schema.json';
import cinematicScenePlanV1Schema from '../schemas/cinematicScenePlanV1.schema.json';
import {
  CinematicEditorialPackageView,
  CinematicEpisodePlanV1,
  CinematicScenePlanV1,
  CinematicShotDirectorInput,
  CinematicContinuitySceneView
} from '../types/cinematicPlans';
import {CinematicValidationError} from './cinematicValidationError';
import {NarrativeBeatValidationContext, validateNarrativeBeats} from './narrativeBeatValidator';
import {validateCinematicShotDirection} from './cinematicShotValidator';
import {validateCinematicContinuityDecision} from './cinematicContinuityValidator';

export {CinematicValidationError} from './cinematicValidationError';

const PROTECTED_EDITORIAL_FIELDS = new Set([
  'claim_id',
  'source_url',
  'evidence_status',
  'asset_provenance',
  'license_status',
  'ai_disclosure_required',
  'review_status',
  'approved_thesis',
  'approved_script',
  'narrative_function',
  'original_contribution',
  'source_override',
  'claim_override',
  'evidence_override',
  'license_override',
  'thesis_override',
  'script_override'
]);

const ajv = new Ajv2020({allErrors: true, strict: false});
addFormats(ajv);
const validateSceneSchema = ajv.compile(cinematicScenePlanV1Schema as any);
const validateEpisodeSchema = ajv.compile(cinematicEpisodePlanV1Schema as any);

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors || []).map((error) => `${error.instancePath || '/'} ${error.message || 'invalid'}`);
}

function findProtectedFields(value: unknown, path = '$'): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findProtectedFields(item, `${path}[${index}]`));
  }
  if (!value || typeof value !== 'object') return [];

  const findings: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${path}.${key}`;
    const allowedBeatField =
      (key === 'claim_id' || key === 'narrative_function') &&
      /^\$\.beats\[\d+\]\.(claim_id|narrative_function)$/.test(childPath);
    if (PROTECTED_EDITORIAL_FIELDS.has(key) && !allowedBeatField) findings.push(childPath);
    findings.push(...findProtectedFields(child, childPath));
  }
  return findings;
}

export function validateEditorialPackage(
  value: unknown,
  expectedEpisodeId?: string
): asserts value is CinematicEditorialPackageView {
  if (!value || typeof value !== 'object') {
    throw new CinematicValidationError('CINEMATIC_SOURCE_PACKAGE_INVALID', 'editorial package must be an object');
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.episode_id !== 'string' || !candidate.episode_id.trim()) {
    throw new CinematicValidationError('CINEMATIC_SOURCE_PACKAGE_INVALID', 'episode_id is required');
  }
  if (expectedEpisodeId && candidate.episode_id !== expectedEpisodeId) {
    throw new CinematicValidationError(
      'CINEMATIC_EPISODE_ID_MISMATCH',
      `expected ${expectedEpisodeId}, received ${candidate.episode_id}`
    );
  }
  if (!Array.isArray(candidate.scenes) || candidate.scenes.length === 0) {
    throw new CinematicValidationError('CINEMATIC_SOURCE_PACKAGE_INVALID', 'real scene contracts are required');
  }

  const sceneIds = new Set<string>();
  for (const scene of candidate.scenes) {
    if (!scene || typeof scene !== 'object' || typeof (scene as Record<string, unknown>).scene_id !== 'string') {
      throw new CinematicValidationError('CINEMATIC_SOURCE_PACKAGE_INVALID', 'every scene requires scene_id');
    }
    const sceneId = String((scene as Record<string, unknown>).scene_id);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(sceneId) || sceneIds.has(sceneId)) {
      throw new CinematicValidationError('CINEMATIC_SOURCE_PACKAGE_INVALID', `invalid or duplicate scene_id: ${sceneId}`);
    }
    sceneIds.add(sceneId);
  }
}

export function approvedSceneIds(editorialPackage: CinematicEditorialPackageView): Set<string> {
  const episodeApproved = String(editorialPackage.human_approval_status || '').toUpperCase() === 'APPROVED';
  const approved = editorialPackage.scenes.filter((scene) => {
    if (scene.review_status !== undefined) {
      return String(scene.review_status).toUpperCase() === 'APPROVED';
    }
    return episodeApproved;
  });

  if (approved.length === 0) {
    throw new CinematicValidationError(
      'CINEMATIC_APPROVED_SCENES_REQUIRED',
      'shadow execution requires existing approved scenes'
    );
  }
  return new Set(approved.map((scene) => scene.scene_id));
}

export function validateCinematicScenePlan(
  plan: unknown,
  context: Readonly<{
    episodeId: string;
    existingSceneIds: ReadonlySet<string>;
    narrativeBeatContext?: NarrativeBeatValidationContext;
    shotDirectorInput?: CinematicShotDirectorInput;
    continuityContext?: Readonly<{
      currentScene: CinematicContinuitySceneView;
      previousScene: CinematicContinuitySceneView | null;
      nextScene: CinematicContinuitySceneView | null;
      existingSceneIds: ReadonlySet<string>;
    }>;
  }>
): asserts plan is CinematicScenePlanV1 {
  const protectedFields = findProtectedFields(plan);
  if (protectedFields.length) {
    throw new CinematicValidationError(
      'CINEMATIC_PROTECTED_FIELD_OVERRIDE',
      'cinematic sidecar attempted to carry editorial authority',
      protectedFields
    );
  }
  if (!validateSceneSchema(plan)) {
    throw new CinematicValidationError(
      'CINEMATIC_SCHEMA_INVALID',
      'scene sidecar failed hsl.cinematic.scene.v1',
      formatAjvErrors(validateSceneSchema.errors)
    );
  }

  const typedPlan = plan as CinematicScenePlanV1;
  if (typedPlan.episode_id !== context.episodeId) {
    throw new CinematicValidationError('CINEMATIC_EPISODE_ID_MISMATCH', typedPlan.episode_id);
  }
  if (!context.existingSceneIds.has(typedPlan.scene_id)) {
    throw new CinematicValidationError('CINEMATIC_SCENE_NOT_FOUND', typedPlan.scene_id);
  }
  if (context.narrativeBeatContext) {
    if (context.narrativeBeatContext.sceneId !== typedPlan.scene_id) {
      throw new CinematicValidationError('CINEMATIC_SCENE_NOT_FOUND', context.narrativeBeatContext.sceneId);
    }
    validateNarrativeBeats(typedPlan.beats, context.narrativeBeatContext);
  }
  if (
    typedPlan.direction.energy !== null ||
    typedPlan.micro_events.length !== 0 ||
    typedPlan.transition.type !== null ||
    typedPlan.transition.motivation !== null ||
    typedPlan.remotion_choreography.length !== 0
  ) {
    throw new CinematicValidationError('CINEMATIC_FUTURE_FIELD_POPULATED', typedPlan.scene_id);
  }
  if (context.shotDirectorInput) {
    if (typedPlan.direction.narrative_intent !== context.shotDirectorInput.narrativeIntent) {
      throw new CinematicValidationError('CINEMATIC_PROTECTED_FIELD_OVERRIDE', 'direction.narrative_intent');
    }
    validateCinematicShotDirection({
      focusTarget: typedPlan.direction.focus_target,
      shot: typedPlan.shot,
      camera: typedPlan.camera,
      decisionReason: typedPlan.decision_reason
    }, context.shotDirectorInput);
  }
  if (context.continuityContext) {
    validateCinematicContinuityDecision(typedPlan.continuity, context.continuityContext);
  }
}

export function validateCinematicEpisodePlan(
  plan: unknown,
  expectedEpisodeId: string
): asserts plan is CinematicEpisodePlanV1 {
  const protectedFields = findProtectedFields(plan);
  if (protectedFields.length) {
    throw new CinematicValidationError(
      'CINEMATIC_PROTECTED_FIELD_OVERRIDE',
      'cinematic episode manifest attempted to carry editorial authority',
      protectedFields
    );
  }
  if (!validateEpisodeSchema(plan)) {
    throw new CinematicValidationError(
      'CINEMATIC_SCHEMA_INVALID',
      'episode manifest failed hsl.cinematic.episode.v1',
      formatAjvErrors(validateEpisodeSchema.errors)
    );
  }
  if ((plan as CinematicEpisodePlanV1).episode_id !== expectedEpisodeId) {
    throw new CinematicValidationError('CINEMATIC_EPISODE_ID_MISMATCH', expectedEpisodeId);
  }
}
