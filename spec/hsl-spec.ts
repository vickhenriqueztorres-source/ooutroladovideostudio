/**
 * ════════════════════════════════════════════════════════════════════════════════════
 * 📜 ESPECIFICAÇÃO EXECUTÁVEL CANÔNICA — PROJETO "O OUTRO LADO" (HIDDEN SYSTEMS LAB)
 * ════════════════════════════════════════════════════════════════════════════════════
 * Autoridade Final: Este módulo é a ÚNICA fonte de verdade para todas as constantes,
 * invariantes de integridade e regras de negócio do pipeline de produção audiovisual.
 * Qualquer divergência em prosa ou código deve ser resolvida referenciando este arquivo.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. REGRAS DE TEMPORALIDADE E TAXA DE QUADROS (PRD: FR-07, NFR-01)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Taxa de quadros canônica para renderização e composição no Remotion.
 * Cláusula PRD: FR-07 ("Renderização em Full HD 1080p @ 30fps no Remotion 2.0")
 */
export const HSL_FPS = 30 as const;

/**
 * Limite mínimo de duração de um episódio master em segundos (5 minutos).
 * Cláusula PRD: NFR-01 ("Todo episódio master deve ter entre 300 e 720 segundos")
 */
export const HSL_MIN_EPISODE_DURATION_SECONDS = 300 as const; // 5 minutos (9.000 frames @ 30fps)

/**
 * Limite máximo de duração de um episódio master em segundos (12 minutos).
 * Cláusula PRD: NFR-01 ("Todo episódio master deve ter entre 300 e 720 segundos")
 */
export const HSL_MAX_EPISODE_DURATION_SECONDS = 720 as const; // 12 minutos (21.600 frames @ 30fps)

/**
 * Tolerância temporal máxima permitida para descompasso entre a duração do áudio (narration.mp3)
 * e o total de frames renderizados na timeline do vídeo.
 * Cláusula PRD: NFR-05 ("Sincronização estrita de áudio e vídeo com tolerância de container")
 */
export const HSL_MAX_AUDIO_VIDEO_DESYNC_SECONDS = 2.5 as const;

/**
 * Converte duração em segundos para total exato de frames a 30fps.
 */
export function secondsToFrames(seconds: number, fps: number = HSL_FPS): number {
  return Math.round(seconds * fps);
}

/**
 * Converte contagem de frames para duração em segundos.
 */
export function framesToSeconds(frames: number, fps: number = HSL_FPS): number {
  return frames / fps;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ESTRUTURA CANÔNICA DE CAPÍTULOS E ATOS (PRD: FR-01, Seção 3.5)
// ─────────────────────────────────────────────────────────────────────────────

export interface HslChapterDefinition {
  readonly id: string;
  readonly name: string;
  readonly targetDurationSeconds: number;
  readonly description: string;
}

/**
 * A estrutura canônica dos 6 Capítulos Progressivos obrigatórios em cada episódio.
 * Cláusula PRD: FR-01 ("Concepção do Roteiro em 6 Capítulos progressivos")
 */
export const HSL_CANONICAL_CHAPTERS: readonly HslChapterDefinition[] = [
  {
    id: 'CH_01_HOOK',
    name: 'O Hook do Gatilho',
    targetDurationSeconds: 40,
    description: 'O ato simples e comum do dia a dia contrastado com a escala monumental que ele dispara.'
  },
  {
    id: 'CH_02_MAP',
    name: 'O Mapa Completo da Máquina',
    targetDurationSeconds: 80,
    description: 'Visão macro em Remotion revelando todos os nós e a distância total a ser percorrida.'
  },
  {
    id: 'CH_03_JOURNEY',
    name: 'A Jornada Passo a Passo',
    targetDurationSeconds: 300,
    description: 'O deslocamento da unidade através das camadas físicas, tubulações, estradas ou cabos.'
  },
  {
    id: 'CH_04_BOTTLENECK',
    name: 'O Gargalo Crítico',
    targetDurationSeconds: 150,
    description: 'O ponto exato onde a velocidade cai, o custo explode ou a capacidade é limitada.'
  },
  {
    id: 'CH_05_FAILURE_REDUNDANCY',
    name: 'O Ponto de Falha e a Redundância',
    targetDurationSeconds: 120,
    description: 'O que acontece quando essa etapa para e como os engenheiros evitam o colapso.'
  },
  {
    id: 'CH_06_CAUSAL_CONCLUSION',
    name: 'Conclusão Causal',
    targetDurationSeconds: 90,
    description: 'A síntese de por que o sistema foi desenhado dessa forma sob as restrições reais.'
  }
] as const;

export const HSL_EXPECTED_CHAPTER_COUNT = HSL_CANONICAL_CHAPTERS.length; // 6 Capítulos

// ─────────────────────────────────────────────────────────────────────────────
// 3. IDENTIDADE VISUAL & CONTRATOS DE ASSETS (PRD: FR-02, FR-03, FR-04, FR-07)
// ─────────────────────────────────────────────────────────────────────────────

export const HSL_BRAND_IDENTITY = {
  NAME: 'O OUTRO LADO',
  SLOGAN: 'O que acontece depois que você clica, compra, liga ou aperta.',
  SIGNATURE: 'INVESTIGAR. REVELAR. COMPREENDER.',
  DIRECTION: 'DOCUMENTARIO DE CAMPO INVESTIGATIVO',
  AESTHETIC: 'Present-day on-location documentary photography with restrained 35mm texture',
  ASPECT_RATIO: '16:9',
  PROMPT_MASTER_TEMPLATE: '{SUBJECT}, present-day on-location investigative documentary photography, current commercially plausible equipment, camera physically present inside the real operation, natural Rec.709 color, moderate contrast, readable shadows, practical available lighting, fine irregular 35mm grain, subtle halation only around real lamps, no futuristic interface, no hologram, no text, no posed faces --ar 16:9'
} as const;

export const HSL_OFFICIAL_VOICE = {
  PROVIDER: 'elevenlabs',
  VOICE_NAME: 'Chris',
  VOICE_ID: 'iP95p4xoKVk53GoZ742B',
  MODEL_ID: 'eleven_multilingual_v2',
  TONE: 'moderno_e_intimo',
  TARGET_WPM: 146
} as const;

export const HSL_COLOR_TOKENS = {
  CARBON_BLACK: '#060709',       // Fundo mestre, sombras profundas, base low-key (70%+ da área)
  DEEP_STEEL: '#0D0E15',         // Carcaças de máquinas, painéis sob vidro escuro
  SODIUM_ORANGE: '#FF5500',      // Fonte pratica quente, evidencia ou alerta pontual
  SODIUM_VAPOR_ORANGE: '#FF5500',// Alias oficial
  LASER_CYAN: '#00F0FF',         // Uso restrito a telemetria e coordenadas verificaveis
  FROSTED_GLASS: 'rgba(255,255,255,0.08)', // Vidro fosco, painéis translúcidos, camadas
  TITANIUM_WHITE: '#F4F4F0',     // Tipografia principal, títulos, termos de alto contraste
  MUTED_SLATE: '#8A8D9F'         // Metadados, referências regulatórias, timestamps
} as const;

export const HSL_VALID_VISUAL_MODES = [
  'remotion',
  'licensed_real',
  'generated_ai',
  'typography'
] as const;

export type HslVisualMode = typeof HSL_VALID_VISUAL_MODES[number];

/**
 * Requisitos de tamanho mínimo em bytes para integridade física de arquivos.
 * Cláusula PRD: NFR-05 & Regras de Confiabilidade Anti-Ghosting
 */
export const HSL_BYTE_CONSTRAINTS = {
  MIN_START_FRAME_BYTES: 10 * 1024,      // 10 KB (mínimo absoluto PNG)
  MIN_VIDEO_TAKE_BYTES: 50 * 1024,        // 50 KB (mínimo MP4 H.264)
  MIN_AUDIO_NARRATION_BYTES: 500 * 1024,  // 500 KB (mínimo MP3 de fala longa)
  MIN_THUMBNAIL_BYTES: 100 * 1024,        // 100 KB (mínimo PNG 4K)
  MIN_TEXT_METADATA_BYTES: 100            // 100 bytes (descrições e metadados)
} as const;

/**
 * Resolução de vídeo do Master Final e de Composição Remotion.
 */
export const HSL_VIDEO_RESOLUTION = {
  WIDTH: 1920,
  HEIGHT: 1080,
  ASPECT_RATIO: '16:9'
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 4. ARTEFATOS OBRIGATÓRIOS DE EMPACOTAMENTO 4K & SEO (PRD: FR-08, Seção 3.4)
// ─────────────────────────────────────────────────────────────────────────────

export interface HslThumbnailSpec {
  readonly variantId: 'A' | 'B' | 'C';
  readonly filename: string;
  readonly role: 'MECHANISM' | 'CONSEQUENCE' | 'FINAL_HANDOFF';
  readonly width: number;
  readonly height: number;
  readonly minSizeBytes: number;
}

/**
 * Lista canônica dos artefatos de thumbnail 4K exigidos pelo PRD.
 * Cláusula PRD: FR-08 ("Geração de 3 thumbnails 4K em neurociência de atenção visual A/B/C")
 */
export const HSL_CANONICAL_THUMBNAILS: readonly HslThumbnailSpec[] = [
  {
    variantId: 'A',
    filename: 'thumbnail_variant_a_mechanism.png',
    role: 'MECHANISM',
    width: 3840,
    height: 2160,
    minSizeBytes: HSL_BYTE_CONSTRAINTS.MIN_THUMBNAIL_BYTES
  },
  {
    variantId: 'B',
    filename: 'thumbnail_variant_b_consequence.png',
    role: 'CONSEQUENCE',
    width: 3840,
    height: 2160,
    minSizeBytes: HSL_BYTE_CONSTRAINTS.MIN_THUMBNAIL_BYTES
  },
  {
    variantId: 'C',
    filename: 'thumbnail_variant_c_final_handoff.png',
    role: 'FINAL_HANDOFF',
    width: 3840,
    height: 2160,
    minSizeBytes: HSL_BYTE_CONSTRAINTS.MIN_THUMBNAIL_BYTES
  }
] as const;

export const HSL_REQUIRED_PACKAGING_ARTIFACTS = [
  'thumbnails/thumbnail_variant_a_mechanism.png',
  'thumbnails/thumbnail_variant_b_consequence.png',
  'thumbnails/thumbnail_variant_c_final_handoff.png',
  'description.txt',
  'youtube-metadata.json'
] as const;

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * 📜 ESPECIFICAÇÃO CANÔNICA DE TIPOGRAFIA PARA THUMBNAILS 4K (3840x2160)
 * ══════════════════════════════════════════════════════════════════════════════
 * Regra Inviolável de Identidade Visual (Documentário de Campo 35mm):
 * - Laranja #FF5500 puro, opaco e sólido.
 * - PROIBIDO qualquer efeito de neon, glow, halo, blur decorativo ou visual cyberpunk.
 * - Sombra estritamente sólida/direcional de chiaroscuro (drop shadow preto profundo).
 * - Escala dominante para legibilidade imediata em feeds mobile (<100ms de reconhecimento).
 */
export const HSL_THUMBNAIL_TYPOGRAPHY = {
  FONTS: {
    HEADLINE: "'Bebas Neue', 'Impact', 'Arial Black', sans-serif",
    TELEMETRY: "'JetBrains Mono', 'Fira Code', monospace",
    EDITORIAL: "'Inter', sans-serif"
  },
  SCALES: {
    // Escala dinâmica em pixels para o canvas 3840x2160
    SHORT_LINE_MAX_FONT_SIZE: 540,   // Linhas com <= 8 caracteres
    MEDIUM_LINE_FONT_SIZE: 490,      // Linhas com 9 a 11 caracteres
    LONG_LINE_FONT_SIZE: 430,        // Linhas com 12 a 14 caracteres
    EXTENDED_LINE_FONT_SIZE: 380,    // Linhas com > 14 caracteres
    MULTI_LINE_CAP_FONT_SIZE: 360,   // Mais de 2 linhas na headline
    SUBHEADLINE_FONT_SIZE: 62,       // Pill de contexto / subheadline
    CATEGORY_BADGE_FONT_SIZE: 34,    // Selo superior de auditoria
    EVIDENCE_LABEL_FONT_SIZE: 32     // Rótulo técnico de evidência
  },
  METRICS: {
    LINE_HEIGHT: 0.86,
    SCALE_Y: 1.10,
    LETTER_SPACING_HEADLINE: 2,
    LETTER_SPACING_TELEMETRY: 3
  },
  COLORS: {
    PRIMARY_TEXT: '#FFFFFF',
    ACCENT_TEXT: HSL_COLOR_TOKENS.SODIUM_ORANGE,       // #FF5500 puro e sólido (ZERO NEON)
    TELEMETRY_TEXT: HSL_COLOR_TOKENS.LASER_CYAN,       // #00F0FF puro e sólido (ZERO NEON)
    BACKGROUND_DARK: HSL_COLOR_TOKENS.CARBON_BLACK     // #060709
  },
  SHADOWS: {
    // Sombra de corte preto sólido para separação ótica profunda em chiaroscuro 35mm (ZERO NEON)
    SOLID_DROP_SHADOW: '0 16px 50px rgba(0,0,0,1), 0 4px 16px rgba(0,0,0,0.95), 4px 4px 0px rgba(0,0,0,0.9)',
    SOLID_PILL_SHADOW: '0 14px 40px rgba(0,0,0,0.95)',
    SOLID_BAR_SHADOW: '0 8px 24px rgba(0,0,0,0.9)'
  },
  ACCENT_BAR: {
    WIDTH: 320,
    HEIGHT: 14,
    COLOR: HSL_COLOR_TOKENS.SODIUM_ORANGE
  }
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 5. GOVERNANÇA DE MOTION GRAPHICS (PRD: FR-03, FR-07)
// ─────────────────────────────────────────────────────────────────────────────

export const HSL_MOTION_GRAPHICS_ARCHETYPES = [
  'ANAMORPHIC_CINEMATIC_OVERLAY',
  'ATOMIC_STOPWATCH',
  'KINETIC_EDITORIAL_CALLOUT',
  'KINETIC_NUMBER_COUNTER',
  'INDUSTRIAL_XRAY_HUD',
  'TECHNICAL_CUTAWAY_SCHEMATIC',
  'LASER_SCAN_DOSSIER',
  'CYBER_MAP_TRACE',
  'LASER_REVEAL_WIPE',
  'DYNAMIC_SPOTLIGHT_FOCUS'
] as const;

export type HslMotionGraphicArchetype = typeof HSL_MOTION_GRAPHICS_ARCHETYPES[number];

/**
 * Regra Inviolável de Composição de Vídeo:
 * Todo vídeo final DEVE ser compilado via Remotion com a camada gráfica completa.
 * É estritamente proibido concatenar takes brutos sem aplicar a identidade visual.
 */
export const HSL_MOTION_COMPOSITION_RULE = {
  COMPOSITION_ENGINE: 'Remotion 2.0',
  MANDATORY_OVERLAYS: [
    'ANAMORPHIC_CINEMATIC_OVERLAY',
    'ATOMIC_STOPWATCH'
  ],
  CANONICAL_TYPOGRAPHY: {
    HEADLINES: 'Bebas Neue',
    TELEMETRY: 'JetBrains Mono',
    BODY: 'Inter'
  },
  PROHIBITED_BEHAVIORS: [
    'RAW_FFMPEG_CONCAT_WITHOUT_OVERLAYS',
    'GENERIC_ARIAL_FONTS_WITHOUT_STYLING',
    'MISSING_TENSION_WORD_HIGHLIGHT'
  ]
} as const;
