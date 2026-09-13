import {
  AgentTelemetryAdapter,
  TelemetryEventType,
  TelemetryStatus
} from '../../../adapters/agentTelemetryAdapter';
import {CINEMATIC_RULESET, CINEMATIC_SCENE_SCHEMA_VERSION} from '../types/cinematicPlans';

export type CinematicTelemetryEventName =
  | 'cinematic.shadow.started'
  | 'cinematic.shadow.scene_plan_created'
  | 'cinematic.shadow.episode_plan_created'
  | 'cinematic.shadow.validation_failed'
  | 'cinematic.shadow.completed'
  | 'cinematic.shadow.failed'
  | 'cinematic.beats.started'
  | 'cinematic.beats.generated'
  | 'cinematic.beats.validation_failed'
  | 'cinematic.beats.completed'
  | 'cinematic.beats.failed'
  | 'cinematic.shot.started'
  | 'cinematic.shot.generated'
  | 'cinematic.shot.validation_failed'
  | 'cinematic.shot.completed'
  | 'cinematic.shot.failed'
  | 'cinematic.continuity.started'
  | 'cinematic.continuity.scene_analyzed'
  | 'cinematic.continuity.validation_failed'
  | 'cinematic.continuity.completed'
  | 'cinematic.continuity.failed';

export interface CinematicTelemetryEventData {
  readonly productionId: string;
  readonly episodeId: string;
  readonly sceneId?: string;
  readonly artifactPath?: string;
  readonly errorCode?: string;
  readonly message?: string;
  readonly metrics?: Readonly<{
    beatCount: number;
    scriptWordCount: number;
    coveragePercent: number;
    cutCandidateCount: number;
    visualChangeCandidateCount: number;
    highImportanceCount: number;
    timingSource: 'not_available' | 'narration_alignment' | 'tts_word_timestamps' | 'forced_alignment' | 'estimated_wpm';
  }>;
  readonly shotMetrics?: Readonly<{
    shotType: string;
    shotSize: string;
    composition: string;
    cameraMovement: string;
    cameraIntensity: string;
    focusTarget: string;
    staticCamera: boolean;
  }>;
  readonly continuityMetrics?: Readonly<{
    sceneCount: number;
    passCount?: number;
    warnCount?: number;
    revisionRecommendedCount?: number;
    axisReversalCount?: number;
    unknownFlowCount?: number;
    crossMediaContinuityCount?: number;
    repeatedCameraWarningCount?: number;
    repeatedCompositionWarningCount?: number;
  }>;
  readonly continuitySceneMetrics?: Readonly<{
    previousSceneId?: string;
    nextSceneId?: string;
    continuityStatus: string;
    axisStrategy: string;
    shotScaleRelation: string;
    focusHandoff: string;
    bridgeCandidate: string;
    warningCount: number;
  }>;
}

export interface CinematicTelemetryPort {
  emit(eventName: CinematicTelemetryEventName, data: CinematicTelemetryEventData): void;
}

const EVENT_TYPES: Record<CinematicTelemetryEventName, TelemetryEventType> = {
  'cinematic.shadow.started': 'AGENT_STARTED',
  'cinematic.shadow.scene_plan_created': 'ARTIFACT_CREATED',
  'cinematic.shadow.episode_plan_created': 'ARTIFACT_CREATED',
  'cinematic.shadow.validation_failed': 'QA_REJECTED',
  'cinematic.shadow.completed': 'AGENT_COMPLETED',
  'cinematic.shadow.failed': 'AGENT_FAILED',
  'cinematic.beats.started': 'AGENT_STARTED',
  'cinematic.beats.generated': 'AGENT_ACTIVITY',
  'cinematic.beats.validation_failed': 'QA_REJECTED',
  'cinematic.beats.completed': 'AGENT_COMPLETED',
  'cinematic.beats.failed': 'AGENT_FAILED',
  'cinematic.shot.started': 'AGENT_STARTED',
  'cinematic.shot.generated': 'AGENT_ACTIVITY',
  'cinematic.shot.validation_failed': 'QA_REJECTED',
  'cinematic.shot.completed': 'AGENT_COMPLETED',
  'cinematic.shot.failed': 'AGENT_FAILED',
  'cinematic.continuity.started': 'AGENT_STARTED',
  'cinematic.continuity.scene_analyzed': 'AGENT_ACTIVITY',
  'cinematic.continuity.validation_failed': 'QA_REJECTED',
  'cinematic.continuity.completed': 'AGENT_COMPLETED',
  'cinematic.continuity.failed': 'AGENT_FAILED'
};

const EVENT_STATUSES: Record<CinematicTelemetryEventName, TelemetryStatus> = {
  'cinematic.shadow.started': 'RUNNING',
  'cinematic.shadow.scene_plan_created': 'SUCCESS',
  'cinematic.shadow.episode_plan_created': 'SUCCESS',
  'cinematic.shadow.validation_failed': 'FAILED',
  'cinematic.shadow.completed': 'SUCCESS',
  'cinematic.shadow.failed': 'FAILED',
  'cinematic.beats.started': 'RUNNING',
  'cinematic.beats.generated': 'SUCCESS',
  'cinematic.beats.validation_failed': 'FAILED',
  'cinematic.beats.completed': 'SUCCESS',
  'cinematic.beats.failed': 'FAILED',
  'cinematic.shot.started': 'RUNNING',
  'cinematic.shot.generated': 'SUCCESS',
  'cinematic.shot.validation_failed': 'FAILED',
  'cinematic.shot.completed': 'SUCCESS',
  'cinematic.shot.failed': 'FAILED',
  'cinematic.continuity.started': 'RUNNING',
  'cinematic.continuity.scene_analyzed': 'SUCCESS',
  'cinematic.continuity.validation_failed': 'FAILED',
  'cinematic.continuity.completed': 'SUCCESS',
  'cinematic.continuity.failed': 'FAILED'
};

export class AgentTelemetryCinematicSink implements CinematicTelemetryPort {
  public emit(eventName: CinematicTelemetryEventName, data: CinematicTelemetryEventData): void {
    const timestamp = new Date().toISOString();
    AgentTelemetryAdapter.getInstance().recordEvent({
      run_id: data.productionId,
      production_id: data.productionId,
      agent_id: eventName.startsWith('cinematic.beats.')
        ? 'NarrativeBeatDirectorAgent'
        : eventName.startsWith('cinematic.shot.')
          ? 'CinematicShotDirectorAgent'
          : eventName.startsWith('cinematic.continuity.')
            ? 'ContinuityDirectorAgent'
          : 'CinematicDirectionShadowRunner',
      provider: 'HIDDEN_SYSTEMS_LAB',
      task_id: eventName,
      type: EVENT_TYPES[eventName],
      status: EVENT_STATUSES[eventName],
      message: data.message || eventName,
      artifact_path: data.artifactPath,
      timestamp,
      attempt: 1,
      payload: {
        event_name: eventName,
        episode_id: data.episodeId,
        scene_id: data.sceneId,
        schema_version: CINEMATIC_SCENE_SCHEMA_VERSION,
        ruleset: CINEMATIC_RULESET,
        timestamp,
        status: EVENT_STATUSES[eventName],
        error_code: data.errorCode,
        beat_count: data.metrics?.beatCount,
        script_word_count: data.metrics?.scriptWordCount,
        coverage_percent: data.metrics?.coveragePercent,
        cut_candidate_count: data.metrics?.cutCandidateCount,
        visual_change_candidate_count: data.metrics?.visualChangeCandidateCount,
        high_importance_count: data.metrics?.highImportanceCount,
        timing_source: data.metrics?.timingSource,
        shot_type: data.shotMetrics?.shotType,
        shot_size: data.shotMetrics?.shotSize,
        composition: data.shotMetrics?.composition,
        camera_movement: data.shotMetrics?.cameraMovement,
        camera_intensity: data.shotMetrics?.cameraIntensity,
        focus_target: data.shotMetrics?.focusTarget,
        static_camera: data.shotMetrics?.staticCamera,
        scene_count: data.continuityMetrics?.sceneCount,
        pass_count: data.continuityMetrics?.passCount,
        warn_count: data.continuityMetrics?.warnCount,
        revision_recommended_count: data.continuityMetrics?.revisionRecommendedCount,
        axis_reversal_count: data.continuityMetrics?.axisReversalCount,
        unknown_flow_count: data.continuityMetrics?.unknownFlowCount,
        cross_media_continuity_count: data.continuityMetrics?.crossMediaContinuityCount,
        repeated_camera_warning_count: data.continuityMetrics?.repeatedCameraWarningCount,
        repeated_composition_warning_count: data.continuityMetrics?.repeatedCompositionWarningCount,
        previous_scene_id: data.continuitySceneMetrics?.previousSceneId,
        next_scene_id: data.continuitySceneMetrics?.nextSceneId,
        continuity_status: data.continuitySceneMetrics?.continuityStatus,
        axis_strategy: data.continuitySceneMetrics?.axisStrategy,
        shot_scale_relation: data.continuitySceneMetrics?.shotScaleRelation,
        focus_handoff: data.continuitySceneMetrics?.focusHandoff,
        bridge_candidate: data.continuitySceneMetrics?.bridgeCandidate,
        continuity_warning_count: data.continuitySceneMetrics?.warningCount
      }
    });
  }
}
