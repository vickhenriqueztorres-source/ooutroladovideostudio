/**
 * ════════════════════════════════════════════════════════════════════════════════════
 * 📜 SCHEMAS & TIPOS: WEB FOOTAGE HARVESTER & BLINDAGEM ANTI-COPYRIGHT
 * ════════════════════════════════════════════════════════════════════════════════════
 * Governa a descoberta, download, sanitização FFmpeg e recibos auditáveis de vídeos reais
 * obtidos da internet sob licenças comerciais livres e domínio público.
 */

export type WebFootageProvider =
  | 'pexels'
  | 'pixabay'
  | 'wikimedia'
  | 'nasa'
  | 'internet_archive'
  | 'curated_open_source';

export type WebFootageLicense =
  | 'Pexels_Free'
  | 'Pixabay_Free'
  | 'NASA_Public_Domain'
  | 'Public_Domain'
  | 'CC0'
  | 'CC_BY';

export interface WebFootageCandidate {
  id: string;
  provider: WebFootageProvider;
  title: string;
  description?: string;
  downloadUrl: string;
  previewImageUrl?: string;
  license: WebFootageLicense;
  author?: string;
  sourcePageUrl?: string;
  width: number;
  height: number;
  durationSeconds: number;
  fps?: number;
  tags: string[];
}

export interface WebFootageSearchQuery {
  query: string;
  keywords?: string[];
  category?: string;
  domainTags?: string[];
  minWidth?: number;
  minHeight?: number;
  minDurationSeconds?: number;
  maxDurationSeconds?: number;
  limit?: number;
}

export interface WebFootageSanitizeOptions {
  targetWidth?: number; // padrão 1920
  targetHeight?: number; // padrão 1080
  targetFps?: number; // padrão 24
  targetDurationSeconds?: number; // se definido, recorta o trecho mais dinâmico
  stripAudio?: boolean; // padrão true (Zero-Audio Guarantee)
  applyColorGrade?: boolean; // sutil curva documental 35mm
}

export interface WebFootageSanitizeResult {
  success: boolean;
  sanitizedPath: string;
  startFramePath: string;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
  rawSha256: string;
  sanitizedSha256: string;
  error?: string;
}

export interface WebFootageReceipt {
  schema: 'hsl.web_footage.provenance.v1';
  candidateId: string;
  provider: WebFootageProvider;
  license: WebFootageLicense;
  sourceUrl: string;
  sourcePageUrl?: string;
  author?: string;
  rawSha256: string;
  sanitizedSha256: string;
  audioStripped: boolean;
  durationSeconds: number;
  resolution: string;
  fps: number;
  category: string;
  tags: string[];
  domains: string[];
  semanticScore?: number;
  timestamp: string;
}
