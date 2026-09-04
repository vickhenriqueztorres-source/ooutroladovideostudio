/**
 * ════════════════════════════════════════════════════════════════════════════════════
 * 📜 SCHEMAS TIPADOS: REPOSITÓRIO CENTRAL DE VÍDEOS & BANCO CENTRAL DE IMAGENS
 * ════════════════════════════════════════════════════════════════════════════════════
 * Governa a catalogação, indexação, matching e ciclo de vida de mídias compartilhadas
 * no ecossistema "O Outro Lado".
 */

export type VideoExecutionMode = 'smart' | 'repository' | 'generate-all' | 'feed-repo';

export type VideoCategory =
  | 'infrastructure'
  | 'cyber_telemetry'
  | 'industrial'
  | 'atmospheric'
  | 'macro_physics'
  | 'deep_sea'
  | 'transport_logistics'
  | 'energy_grid';

export type VideoProvenance =
  | 'firefly_ai'
  | 'stock_curated'
  | 'manual_import'
  | 'curated_broll'
  | 'kling_ai'
  | 'veo_ai'
  | 'remotion_procedural';

export type VideoQaStatus = 'approved' | 'quarantined' | 'rejected';

export interface VideoCatalogEntry {
  id: string;
  category: VideoCategory | string;
  filename: string; // Caminho relativo dentro de assets/video_repository/
  tags: string[];
  domains?: string[]; // Domínios temáticos permitidos para veto (ex: ['infrastructure', 'transportation'])
  description: string;
  durationSeconds: number;
  fps: number;
  resolution: string; // Ex: '1920x1080'
  colorTone: string; // Ex: 'Chiaroscuro / Sodium Amber'
  recommendedMotion?: 'slow_push_in' | 'crash_push_in' | 'dramatic_pull_out' | 'pan_right' | 'pan_left' | 'cinematic_drift';
  sha256?: string;
  provenance: VideoProvenance;
  qaStatus: VideoQaStatus;
  approvedBy?: string;
  approvedAt?: string;
  sourceRunId?: string;
  createdAt?: string;
}

export interface VideoCatalog {
  version: string;
  name: string;
  description: string;
  categories: string[];
  videos: VideoCatalogEntry[];
}

export interface ImageCatalogEntry {
  id: string;
  filename: string; // Caminho relativo dentro de assets/image_repository/
  topic: string;
  episodeSource?: string; // Ex: 'OOL-EP02-CABOS'
  sceneId?: string; // Ex: 'SC_001'
  prompt: string;
  tags: string[];
  resolution: string; // Ex: '1920x1080'
  sha256: string;
  colorTone?: string;
  createdAt: string;
}

export interface ImageCatalog {
  version: string;
  name: string;
  description: string;
  topics: string[];
  totalImages: number;
  images: ImageCatalogEntry[];
}

export { SceneVisualContract, AllowedVisualSource, TakeType } from '../../contracts/sceneVisualContract';

export interface VideoMatchRequest {
  sceneId: string;
  shotId?: string;
  chapterTitle?: string;
  visualSubject: string;
  narrativeFunction?: string;
  tags?: string[];
  domainTags?: string[];
  requiredCategory?: VideoCategory | string;
  visualMustInclude?: string[];
  visualMustNot?: string[];
  allowedSources?: ('firefly' | 'bank' | 'dossier')[];
  targetDurationSeconds?: number;
  usedAssetIds?: string[] | Set<string>;
}

export interface VideoMatchResult {
  sceneId: string;
  matched: boolean;
  matchScore: number; // 0.0 a 1.0
  videoEntry?: VideoCatalogEntry;
  absoluteVideoPath?: string;
  relativePublicSrc?: string;
  recommendedAction: 'USE_MATCHED_VIDEO' | 'DISPATCH_FIREFLY_ON_DEMAND' | 'FALLBACK_REMOTION_PARALLAX' | 'STOP_UNMATCHED';
  reason: string;
}

export interface OnDemandVideoJob {
  sceneId: string;
  shotId: string;
  prompt: string;
  startFramePath?: string;
  durationSeconds: number;
  aspectRatio: string;
  outputRelativePath: string;
  targetCategory: VideoCategory | string;
  tags: string[];
}
