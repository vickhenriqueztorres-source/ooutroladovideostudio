/**
 * 🖋️ TOKENS DE TIPOGRAFIA EDITORIAL E HIERARQUIA CINEMATOGRÁFICA
 * Canal "O Outro Lado" // Dossiê do Sistema 3.0
 */

export const CINEMATIC_TYPOGRAPHY = {
  FONTS: {
    DISPLAY: "'Bebas Neue', 'Druk Wide', sans-serif",
    TELEMETRY: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
    EDITORIAL: "'Inter', 'Helvetica Neue', Arial, sans-serif"
  },
  SIZES: {
    DOSSIER_TITLE: '64px',
    SECTION_HEADER: '42px',
    PRIMARY_LABEL: '28px',
    TELEMETRY_DATA: '24px',
    FOOTNOTE: '18px'
  },
  WEIGHTS: {
    REGULAR: 400,
    MEDIUM: 500,
    BOLD: 700,
    BLACK: 900
  },
  LETTER_SPACING: {
    TIGHT: '-0.5px',
    NORMAL: '0px',
    WIDE: '1.5px',
    TRACKING_ULTRA: '3px'
  },
  COLORS: {
    TEXT_PRIMARY: '#F4F4F0',
    TEXT_MUTED: '#8A8D9F',
    TEXT_ACCENT: '#FF5500',
    TEXT_TELEMETRY: '#00F0FF'
  }
} as const;

export interface TypographyPreset {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  letterSpacing: string;
  color: string;
  textTransform?: 'uppercase' | 'none';
}

export const TYPOGRAPHY_PRESETS: Record<string, TypographyPreset> = {
  DOSSIER_MAIN_TITLE: {
    fontFamily: CINEMATIC_TYPOGRAPHY.FONTS.DISPLAY,
    fontSize: CINEMATIC_TYPOGRAPHY.SIZES.DOSSIER_TITLE,
    fontWeight: CINEMATIC_TYPOGRAPHY.WEIGHTS.BLACK,
    letterSpacing: CINEMATIC_TYPOGRAPHY.LETTER_SPACING.WIDE,
    color: CINEMATIC_TYPOGRAPHY.COLORS.TEXT_PRIMARY,
    textTransform: 'uppercase'
  },
  SECTION_HEADER: {
    fontFamily: CINEMATIC_TYPOGRAPHY.FONTS.EDITORIAL,
    fontSize: CINEMATIC_TYPOGRAPHY.SIZES.SECTION_HEADER,
    fontWeight: CINEMATIC_TYPOGRAPHY.WEIGHTS.BOLD,
    letterSpacing: CINEMATIC_TYPOGRAPHY.LETTER_SPACING.NORMAL,
    color: CINEMATIC_TYPOGRAPHY.COLORS.TEXT_PRIMARY
  },
  TELEMETRY_HEADER: {
    fontFamily: CINEMATIC_TYPOGRAPHY.FONTS.TELEMETRY,
    fontSize: CINEMATIC_TYPOGRAPHY.SIZES.PRIMARY_LABEL,
    fontWeight: CINEMATIC_TYPOGRAPHY.WEIGHTS.BOLD,
    letterSpacing: CINEMATIC_TYPOGRAPHY.LETTER_SPACING.WIDE,
    color: CINEMATIC_TYPOGRAPHY.COLORS.TEXT_TELEMETRY,
    textTransform: 'uppercase'
  },
  TELEMETRY_VALUE: {
    fontFamily: CINEMATIC_TYPOGRAPHY.FONTS.TELEMETRY,
    fontSize: CINEMATIC_TYPOGRAPHY.SIZES.TELEMETRY_DATA,
    fontWeight: CINEMATIC_TYPOGRAPHY.WEIGHTS.REGULAR,
    letterSpacing: CINEMATIC_TYPOGRAPHY.LETTER_SPACING.WIDE,
    color: CINEMATIC_TYPOGRAPHY.COLORS.TEXT_MUTED
  },
  CRITICAL_ALERT: {
    fontFamily: CINEMATIC_TYPOGRAPHY.FONTS.TELEMETRY,
    fontSize: CINEMATIC_TYPOGRAPHY.SIZES.PRIMARY_LABEL,
    fontWeight: CINEMATIC_TYPOGRAPHY.WEIGHTS.BOLD,
    letterSpacing: CINEMATIC_TYPOGRAPHY.LETTER_SPACING.WIDE,
    color: CINEMATIC_TYPOGRAPHY.COLORS.TEXT_ACCENT,
    textTransform: 'uppercase'
  }
};

export { HSL_THUMBNAIL_TYPOGRAPHY } from '../../spec/hsl-spec';

