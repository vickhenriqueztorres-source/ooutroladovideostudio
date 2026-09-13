export const CINEMATIC_SCENE_SCHEMA = 'hsl.cinematic.scene.v1' as const;
export const CINEMATIC_EPISODE_SCHEMA = 'hsl.cinematic.episode.v1' as const;
export const CINEMATIC_SCENE_SCHEMA_VERSION = '1.3.0' as const;
export const CINEMATIC_EPISODE_SCHEMA_VERSION = '1.1.0' as const;
export const CINEMATIC_RULESET = 'HSL_CINEMATIC_V1' as const;

type NullableText = string | null;

export const NARRATIVE_BEAT_SEMANTIC_FUNCTIONS = [
  'introduce_object',
  'introduce_system',
  'establish_context',
  'follow_flow',
  'explain_mechanism',
  'handoff',
  'reveal_dependency',
  'reveal_constraint',
  'compare',
  'quantify',
  'cause',
  'consequence',
  'failure_trigger',
  'propagation',
  'response',
  'recovery',
  'tradeoff',
  'limitation',
  'interpretation',
  'conclusion'
] as const;

export type NarrativeBeatSemanticFunction = typeof NARRATIVE_BEAT_SEMANTIC_FUNCTIONS[number];
export type NarrativeBeatImportance = 'low' | 'medium' | 'high';

export type NarrativeBeatTiming =
  | Readonly<{source: 'not_available'}>
  | Readonly<{source: 'narration_alignment'; start_ms: number; end_ms: number}>;

import type { Beat } from '../schemas/beatSchema';

export type NarrativeBeatV1 = Beat;
export type { Beat };

export const HSL_SHOT_TYPES = [
  'ESTABLISHING', 'SYSTEM_WIDE', 'OPERATION', 'MECHANICAL_DETAIL', 'MACRO_DETAIL',
  'TRACKING_FLOW', 'TOPDOWN_PROCESS', 'AERIAL_NETWORK', 'TECHNICAL_LOCKED', 'REVEAL', 'SCALE_REFERENCE'
] as const;
export const HSL_SHOT_SIZES = ['EXTREME_WIDE', 'WIDE', 'MEDIUM_WIDE', 'MEDIUM', 'CLOSE', 'EXTREME_CLOSE'] as const;
export const HSL_COMPOSITIONS = [
  'CENTERED', 'RULE_OF_THIRDS_LEFT', 'RULE_OF_THIRDS_RIGHT', 'SYMMETRIC',
  'ASYMMETRIC_LEFT', 'ASYMMETRIC_RIGHT', 'TOP_HEAVY', 'BOTTOM_HEAVY', 'LEADING_LINES', 'LAYERED_DEPTH'
] as const;
export const HSL_SUBJECT_ANCHORS = [
  'CENTER', 'LEFT_THIRD', 'RIGHT_THIRD', 'LOWER_LEFT', 'LOWER_RIGHT', 'UPPER_LEFT', 'UPPER_RIGHT', 'FULL_FRAME'
] as const;
export const HSL_NEGATIVE_SPACES = [
  'NONE', 'LEFT', 'RIGHT', 'TOP', 'BOTTOM', 'UPPER_LEFT', 'UPPER_RIGHT', 'LOWER_LEFT', 'LOWER_RIGHT'
] as const;
export const HSL_DEPTH_DESIGNS = ['FLAT', 'TWO_LAYER', 'THREE_LAYER', 'DEEP'] as const;
export const HSL_LENS_LANGUAGES = ['WIDE_24', 'DOCUMENTARY_35', 'NATURAL_50', 'DETAIL_85', 'MACRO'] as const;
export const HSL_CAMERA_MOVEMENTS = [
  'STATIC', 'SLOW_DOLLY_IN', 'SLOW_DOLLY_OUT', 'TRACK_LEFT', 'TRACK_RIGHT', 'PAN_LEFT', 'PAN_RIGHT',
  'SUBTLE_CRANE_UP', 'SUBTLE_CRANE_DOWN', 'TOPDOWN_DESCEND', 'PARALLAX_PUSH'
] as const;
export const HSL_CAMERA_DIRECTIONS = ['LEFT_TO_RIGHT', 'RIGHT_TO_LEFT', 'FORWARD', 'BACKWARD', 'UP', 'DOWN', 'NONE'] as const;
export const HSL_CAMERA_INTENSITIES = ['NONE', 'LOW', 'MEDIUM'] as const;
export const HSL_MOTION_MOTIVATIONS = [
  'FOLLOW_FLOW', 'REVEAL_DETAIL', 'REVEAL_SCALE', 'APPROACH_MECHANISM', 'LEAVE_MECHANISM',
  'TRANSFER_ATTENTION', 'ESTABLISH_GEOGRAPHY', 'SHOW_PROCESS'
] as const;
export const HSL_NEGATIVE_SPACE_MOTIVATIONS = [
  'ROOM_FOR_FUTURE_CALLOUT', 'ROOM_FOR_FUTURE_METRIC', 'ROOM_FOR_FLOW_OVERLAY',
  'ROOM_FOR_VISUAL_REVEAL', 'ROOM_FOR_FUTURE_LABEL', 'ROOM_FOR_EVIDENCE'
] as const;

export type HslShotType = typeof HSL_SHOT_TYPES[number];
export type HslShotSize = typeof HSL_SHOT_SIZES[number];
export type HslComposition = typeof HSL_COMPOSITIONS[number];
export type HslSubjectAnchor = typeof HSL_SUBJECT_ANCHORS[number];
export type HslNegativeSpace = typeof HSL_NEGATIVE_SPACES[number];
export type HslNegativeSpaceMotivation = typeof HSL_NEGATIVE_SPACE_MOTIVATIONS[number];
export type HslDepthDesign = typeof HSL_DEPTH_DESIGNS[number];
export type HslLensLanguage = typeof HSL_LENS_LANGUAGES[number];
export type HslCameraMovement = typeof HSL_CAMERA_MOVEMENTS[number];
export type HslCameraDirection = typeof HSL_CAMERA_DIRECTIONS[number];
export type HslCameraIntensity = typeof HSL_CAMERA_INTENSITIES[number];
export type HslMotionMotivation = typeof HSL_MOTION_MOTIVATIONS[number];

export const HSL_CONTINUITY_STATUSES = ['PASS', 'WARN', 'REVISION_RECOMMENDED', 'NOT_APPLICABLE'] as const;
export const HSL_SCREEN_FLOW_DIRECTIONS = [
  'LEFT_TO_RIGHT', 'RIGHT_TO_LEFT', 'FORWARD', 'BACKWARD', 'UP', 'DOWN', 'STATIC', 'UNKNOWN'
] as const;
export const HSL_SCREEN_FLOW_SOURCES = [
  'VISUAL_PLAN', 'CAMERA_INTENT', 'BEAT_SEMANTICS', 'FOCUS_RELATION', 'NOT_AVAILABLE'
] as const;
export const HSL_AXIS_STRATEGIES = ['PRESERVE', 'REVERSE_MOTIVATED', 'RESET', 'NOT_APPLICABLE'] as const;
export const HSL_CONTINUITY_MOTIVATIONS = [
  'COUNTER_FLOW', 'RETURN_PATH', 'FAILURE_REVERSAL', 'TEMPORAL_REVERSAL',
  'GEOGRAPHIC_REORIENTATION', 'NARRATIVE_CONTRAST'
] as const;
export const HSL_SHOT_SCALE_RELATIONS = ['CONTRACT', 'EXPAND', 'HOLD', 'RESET', 'NOT_APPLICABLE'] as const;
export const HSL_FOCUS_HANDOFFS = [
  'DIRECT', 'REVEAL', 'CAUSE_TO_EFFECT', 'OBJECT_TO_SYSTEM', 'SYSTEM_TO_OBJECT', 'RESET', 'NONE'
] as const;
export const HSL_BRIDGE_CANDIDATES = [
  'MOTION_VECTOR', 'SHAPE', 'LINE', 'OBJECT', 'FOCUS', 'SCALE',
  'GEOGRAPHIC', 'COLOR_ROLE', 'SEMANTIC', 'NONE'
] as const;
export const HSL_CROSS_MEDIA_CONTINUITIES = ['PRESERVED', 'RESET', 'NOT_APPLICABLE', 'UNKNOWN'] as const;
export const HSL_CONTINUITY_WARNING_CODES = [
  'REPEATED_SHOT_TYPE', 'REPEATED_SHOT_SIZE', 'REPEATED_COMPOSITION',
  'REPEATED_CAMERA_MOVEMENT', 'UNMOTIVATED_DIRECTION_REVERSAL', 'AXIS_DISCONTINUITY',
  'FOCUS_DISCONTINUITY', 'SCALE_JUMP', 'CROSS_MEDIA_DISCONTINUITY',
  'VISUAL_MONOTONY', 'UNKNOWN_SCREEN_FLOW'
] as const;
export const HSL_CONTINUITY_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const HSL_CONTINUITY_WARNING_OWNERS = [
  'CinematicShotDirectorAgent', 'ContinuityDirectorAgent', 'FutureTransitionDirector', 'VisualPlan', 'NONE'
] as const;

export type HslContinuityStatus = typeof HSL_CONTINUITY_STATUSES[number];
export type HslScreenFlowDirection = typeof HSL_SCREEN_FLOW_DIRECTIONS[number];
export type HslScreenFlowSource = typeof HSL_SCREEN_FLOW_SOURCES[number];
export type HslAxisStrategy = typeof HSL_AXIS_STRATEGIES[number];
export type HslContinuityMotivation = typeof HSL_CONTINUITY_MOTIVATIONS[number];
export type HslShotScaleRelation = typeof HSL_SHOT_SCALE_RELATIONS[number];
export type HslFocusHandoff = typeof HSL_FOCUS_HANDOFFS[number];
export type HslBridgeCandidate = typeof HSL_BRIDGE_CANDIDATES[number];
export type HslCrossMediaContinuity = typeof HSL_CROSS_MEDIA_CONTINUITIES[number];
export type HslContinuityWarningCode = typeof HSL_CONTINUITY_WARNING_CODES[number];
export type HslContinuitySeverity = typeof HSL_CONTINUITY_SEVERITIES[number];
export type HslContinuityWarningOwner = typeof HSL_CONTINUITY_WARNING_OWNERS[number];

export interface CinematicContinuityWarning {
  readonly code: HslContinuityWarningCode;
  readonly severity: HslContinuitySeverity;
  readonly owner: HslContinuityWarningOwner;
  readonly run_length: number | null;
  readonly detail: string | null;
}

export interface CinematicContinuityRelation {
  readonly scene_id: string;
  readonly screen_flow: Readonly<{
    direction: HslScreenFlowDirection;
    source: HslScreenFlowSource;
  }>;
  readonly axis_strategy: HslAxisStrategy;
  readonly axis_motivation: HslContinuityMotivation | null;
  readonly shot_scale_relation: HslShotScaleRelation;
  readonly focus_handoff: HslFocusHandoff;
  readonly bridge_candidate: HslBridgeCandidate;
  readonly cross_media_continuity: HslCrossMediaContinuity;
}

export interface CinematicSequenceMemory {
  readonly last_n_scenes: number;
  readonly shot_type_counts: Readonly<Record<string, number>>;
  readonly shot_size_sequence: readonly HslShotSize[];
  readonly camera_sequence: readonly HslCameraMovement[];
  readonly composition_sequence: readonly HslComposition[];
  readonly same_shot_type_run: number;
  readonly same_shot_size_run: number;
  readonly same_camera_movement_run: number;
  readonly same_composition_run: number;
}

export interface CinematicContinuityDecision {
  readonly status: HslContinuityStatus;
  readonly incoming: CinematicContinuityRelation | null;
  readonly outgoing: CinematicContinuityRelation | null;
  readonly sequence_memory: CinematicSequenceMemory;
  readonly warnings: readonly CinematicContinuityWarning[];
}

export interface CinematicContinuitySceneView {
  readonly scene_id: string;
  readonly chapter_id: string | null;
  readonly narrative_function: string;
  readonly beat_semantics: readonly NarrativeBeatSemanticFunction[];
  readonly narrative_intent: string;
  readonly focus_target: string;
  readonly shot: Readonly<CinematicShotDirection['shot']>;
  readonly camera: Readonly<CinematicShotDirection['camera']>;
  readonly visual_mode: string;
}

export interface CinematicContinuityContext {
  readonly episodeId: string;
  readonly scenes: readonly CinematicContinuitySceneView[];
  readonly currentIndex: number;
  readonly previousScenes: readonly CinematicContinuitySceneView[];
  readonly currentScene: CinematicContinuitySceneView;
  readonly nextScenes: readonly CinematicContinuitySceneView[];
  readonly recentHistory: CinematicSequenceMemory;
}

export interface ContinuityDirectorEpisodeInput {
  readonly productionId: string;
  readonly episodeId: string;
  readonly scenes: readonly CinematicContinuitySceneView[];
}

export interface ContinuityDirectorEpisodeResult {
  readonly decisions: readonly Readonly<{sceneId: string; continuity: CinematicContinuityDecision}>[];
  readonly metrics: Readonly<{
    sceneCount: number;
    passCount: number;
    warnCount: number;
    revisionRecommendedCount: number;
    axisReversalCount: number;
    unknownFlowCount: number;
    crossMediaContinuityCount: number;
    repeatedCameraWarningCount: number;
    repeatedCompositionWarningCount: number;
  }>;
}

export interface HslCinematicBrandRules {
  readonly ruleset: typeof CINEMATIC_RULESET;
  readonly principles: readonly string[];
  readonly maximumCameraIntensity: 'MEDIUM';
  readonly defaultDocumentaryLens: 'DOCUMENTARY_35';
}

export interface CinematicShotDirectorInput {
  readonly productionId: string;
  readonly episodeId: string;
  readonly sceneId: string;
  readonly narrativeFunction: string;
  readonly visualMode: string;
  readonly narrativeIntent: string;
  readonly beats: readonly NarrativeBeatV1[];
  readonly focusTargetCandidates: readonly string[];
  readonly sceneContext: Readonly<{
    chapterId?: string;
    chapterTitle?: string;
    precedingSceneSummary?: string;
    followingSceneSummary?: string;
  }>;
  readonly brandRules: Readonly<HslCinematicBrandRules>;
}

export interface CinematicShotDirection {
  readonly focusTarget: string;
  readonly shot: Readonly<{
    shot_type: HslShotType;
    shot_size: HslShotSize;
    composition: HslComposition;
    subject_anchor: HslSubjectAnchor;
    negative_space: HslNegativeSpace;
    negative_space_motivation: HslNegativeSpaceMotivation | null;
    depth_design: HslDepthDesign;
    lens_language: HslLensLanguage;
  }>;
  readonly camera: Readonly<{
    movement: HslCameraMovement;
    direction: HslCameraDirection;
    intensity: HslCameraIntensity;
    motivation: HslMotionMotivation | null;
  }>;
  readonly decisionReason: Readonly<{
    based_on: readonly string[];
    goal: string;
  }>;
}

export interface CinematicScenePlanV1 {
  schema: typeof CINEMATIC_SCENE_SCHEMA;
  schema_version: typeof CINEMATIC_SCENE_SCHEMA_VERSION;
  ruleset: typeof CINEMATIC_RULESET;
  episode_id: string;
  scene_id: string;
  source_revision: string;
  source_scene_revision?: string;
  cinematic_plan_revision: string;
  beats: readonly NarrativeBeatV1[];
  direction: Readonly<{
    narrative_intent: NullableText;
    energy: NullableText;
    focus_target: string;
  }>;
  shot: Readonly<{
    shot_type: HslShotType;
    shot_size: HslShotSize;
    composition: HslComposition;
    subject_anchor: HslSubjectAnchor;
    negative_space: HslNegativeSpace;
    negative_space_motivation: HslNegativeSpaceMotivation | null;
    depth_design: HslDepthDesign;
    lens_language: HslLensLanguage;
  }>;
  camera: Readonly<{
    movement: HslCameraMovement;
    direction: HslCameraDirection;
    intensity: HslCameraIntensity;
    motivation: HslMotionMotivation | null;
  }>;
  decision_reason: Readonly<{
    based_on: readonly string[];
    goal: string;
  }>;
  continuity: Readonly<CinematicContinuityDecision>;
  micro_events: readonly string[];
  transition: Readonly<{
    type: NullableText;
    motivation: NullableText;
  }>;
  remotion_choreography: readonly string[];
  generated_at: string;
  mode: 'shadow';
}

export interface CinematicEpisodePlanV1 {
  schema: typeof CINEMATIC_EPISODE_SCHEMA;
  schema_version: typeof CINEMATIC_EPISODE_SCHEMA_VERSION;
  ruleset: typeof CINEMATIC_RULESET;
  episode_id: string;
  source: Readonly<{
    script_available: boolean;
    visual_plan_available: boolean;
    claim_registry_available: boolean;
    source_revision: string;
  }>;
  cinematic_plan_revision: string;
  scene_plans: readonly string[];
  status: 'shadow_generated';
  generated_at: string;
}

export interface CinematicEditorialSceneView {
  readonly scene_id: string;
  readonly claim_id?: unknown;
  readonly narrative_function?: unknown;
  readonly visual_mode?: unknown;
  readonly focus_target?: unknown;
  readonly visual_subject?: unknown;
  readonly subject?: unknown;
  readonly object_or_flow?: unknown;
  readonly asset_subject?: unknown;
  readonly chapter_title?: unknown;
  readonly voiceover?: unknown;
  readonly narration_text?: unknown;
  readonly script_text?: unknown;
  readonly chapter_id?: unknown;
  readonly narration_alignment?: unknown;
  readonly review_status?: unknown;
  readonly revision?: unknown;
  readonly source_scene_revision?: unknown;
  readonly [key: string]: unknown;
}

export interface NarrationAlignmentWordView {
  readonly word: string;
  readonly start_ms: number;
  readonly end_ms: number;
  readonly source?: 'tts_word_timestamps' | 'forced_alignment' | 'estimated_wpm';
}

export interface NarrativeBeatSceneInput {
  readonly productionId: string;
  readonly episodeId: string;
  readonly sceneId: string;
  readonly claimId: string | null;
  readonly existingClaimIds: ReadonlySet<string>;
  readonly narrativeFunction: string;
  readonly chapterId?: string;
  readonly approvedScriptText: string;
  readonly narrationAlignment?: readonly NarrationAlignmentWordView[];
}

export interface NarrativeBeatDirectorResult {
  readonly beats: readonly NarrativeBeatV1[];
  readonly narrativeIntent: string;
  readonly metrics: Readonly<{
    beatCount: number;
    scriptWordCount: number;
    coveragePercent: number;
    cutCandidateCount: number;
    visualChangeCandidateCount: number;
    highImportanceCount: number;
    timingSource: 'not_available' | 'narration_alignment' | 'tts_word_timestamps' | 'forced_alignment' | 'estimated_wpm';
  }>;
}

export interface CinematicEditorialPackageView {
  readonly episode_id: string;
  readonly human_approval_status?: unknown;
  readonly scenes: readonly CinematicEditorialSceneView[];
  readonly [key: string]: unknown;
}

export interface CinematicShadowRunInput {
  readonly productionId: string;
  readonly editorialPackagePath: string;
  readonly expectedEpisodeId?: string;
}

export interface CinematicShadowRunResult {
  readonly mode: 'shadow';
  readonly episodeId: string;
  readonly sourceRevision: string;
  readonly outputDirectory: string;
  readonly episodePlanPath: string;
  readonly scenePlanPaths: readonly string[];
}
