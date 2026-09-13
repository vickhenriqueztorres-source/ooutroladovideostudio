import {AssetProvenance, EvidenceStatus, HslSource} from '../../../production/hslEpisodeGate';

export type HslVisualFunction = 'atmosphere' | 'scale' | 'reconstruction' | 'invisible_process' | 'transition';
export type HslVisualMode = 'remotion' | 'licensed_real' | 'generated_ai' | 'typography';
export type HslAttentionRole = 'HOOK' | 'OPEN_LOOP' | 'DEEPEN' | 'PARTIAL_PAYOFF' | 'PAYOFF' | 'REFRAME' | 'NONE';
export type HslAudienceAwarenessLevel = 1 | 2 | 3 | 4 | 5;
export type HslTopicSophisticationLevel = 1 | 2 | 3 | 4 | 5;

export interface HslAudienceStrategySeed {
  readonly primary_audience: string;
  readonly awareness_level: HslAudienceAwarenessLevel;
  readonly sophistication_level: HslTopicSophisticationLevel;
  readonly what_they_know: string;
  readonly knowledge_gap: string;
  readonly mass_desire: string;
  readonly human_conflict: string;
  readonly thumbnail_text: string;
  readonly title_candidates?: readonly [string, string];
  readonly next_video_question: string;
}

export interface HslEditorialSceneSeed {
  readonly scene_id: string;
  readonly chapter_id: string;
  readonly chapter_title: string;
  readonly narrative_function: string;
  readonly voiceover: string;
  readonly visual_mode: HslVisualMode;
  readonly visual_subject: string;
  readonly claim_source_ids: readonly string[];
  readonly visual_function?: HslVisualFunction;
}

export interface HslEpisodeSeed {
  readonly episode_id: string;
  readonly title: string;
  readonly format: 'THE_JOURNEY' | 'SYSTEM_ANATOMY' | 'BOTTLENECK' | 'FAILURE';
  readonly target_duration_minutes: number;
  readonly central_question: string;
  readonly thesis: string;
  readonly object_or_flow: string;
  readonly system_being_analyzed: string;
  readonly main_constraint: string;
  readonly primary_consequence: string;
  readonly hero_visual: string;
  readonly causal_flow?: readonly string[];
  readonly system_interfaces?: readonly string[];
  readonly original_interpretation: string;
  readonly counterargument_or_limitation: string;
  readonly audience_strategy?: HslAudienceStrategySeed;
  readonly sources: readonly HslSource[];
  readonly scenes: readonly HslEditorialSceneSeed[];
  readonly human_approval_status: 'APPROVED' | 'PENDING' | 'REJECTED';
}

export interface HslClaim {
  readonly claim_id: string;
  readonly text: string;
  readonly source_ids: readonly string[];
  readonly evidence_status: 'fact';
}

export interface HslEditorialSceneContract {
  readonly scene_id: string;
  readonly chapter_id: string;
  readonly chapter_title: string;
  readonly claim_id: string | null;
  readonly narrative_function: string;
  readonly voiceover: string;
  readonly script_text: string;
  readonly visual_mode: string;
  readonly visual_subject: string;
  readonly evidence_status: EvidenceStatus;
  readonly asset_provenance: AssetProvenance;
  readonly source_url: string | null;
  readonly license_status: string;
  readonly original_contribution: string;
  readonly ai_disclosure_required: boolean;
  readonly on_screen_label?: 'AI VISUALIZATION';
  readonly visual_function?: HslVisualFunction;
  readonly attention_role?: HslAttentionRole;
  readonly attention_loop_id?: string | null;
  readonly narration_alignment?: readonly {
    readonly word: string;
    readonly start_ms: number;
    readonly end_ms: number;
    readonly source?: 'tts_word_timestamps' | 'forced_alignment' | 'estimated_wpm';
  }[];
  readonly source_scene_revision: string;
}

export interface HslEditorialPackage {
  readonly schema: 'hsl.episode.package.v1';
  readonly schema_version: '1.0.0';
  readonly episode_id: string;
  readonly title: string;
  readonly human_approval_status: 'APPROVED';
  readonly episode_brief: {readonly artifact_path: string};
  readonly source_pack: {readonly artifact_path: string};
  readonly claim_registry: {readonly artifact_path: string; readonly claims: readonly HslClaim[]};
  readonly causal_model: {readonly artifact_path: string; readonly flow: readonly string[]};
  readonly approved_script: {readonly artifact_path: string; readonly language: 'en'};
  readonly visual_plan: {readonly artifact_path: string};
  readonly reference_insights?: {readonly artifact_path: string; readonly reference_only: true};
  readonly attention_architecture?: {readonly artifact_path: string; readonly status: 'ATTENTION_ARCHITECTURE_APPROVED'};
  readonly reference_originality_gate?: {readonly artifact_path: string; readonly status: 'PASS'};
  readonly eugene_rag?: {readonly artifact_path: string; readonly reference_only: true; readonly status: 'EUGENE_RAG_READY'};
  readonly audience_strategy?: {readonly artifact_path: string; readonly status: 'AUDIENCE_STRATEGY_APPROVED'};
  readonly eugene_originality_gate?: {readonly artifact_path: string; readonly status: 'PASS'};
  readonly promise_delivery_gate?: {readonly artifact_path: string; readonly status: 'PASS'};
  readonly gate: {readonly artifact_path: string; readonly status: 'PASS'; readonly originality_score: number};
  readonly scenes: readonly HslEditorialSceneContract[];
  readonly generated_at: string;
}

export interface HslEditorialRunResult {
  readonly success: true;
  readonly episodePackagePath: string;
  readonly outputDirectory: string;
  readonly episodeId: string;
}
