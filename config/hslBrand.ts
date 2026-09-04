import { HSL_THUMBNAIL_TYPOGRAPHY } from '../spec/hsl-spec';

export const HSL_BRAND = {
  name: 'O Outro Lado',
  shortName: 'O Outro Lado',
  tagline: 'O que acontece depois que você clica, compra, liga ou aperta.',
  secondaryTagline: 'Investigar. Revelar. Compreender.',
  promise: 'Revelar a infraestrutura invisível que opera 24/7 no Brasil, acompanhando uma única unidade do ponto de origem ao destino final.',
  theme: 'Documentario de Campo Investigativo',
  format: {
    aspectRatio: '16:9',
    master: { width: 3840, height: 2160, fps: 30 },
    render: { width: 1920, height: 1080, fps: 30 },
    safeMarginPx1080: 64
  },
  thumbnailTypography: HSL_THUMBNAIL_TYPOGRAPHY,
  colors: {
    background: '#060709', // Neutral deep black for natural negative space
    surface: 'rgba(255, 255, 255, 0.05)',
    surfaceBorder: 'rgba(255, 85, 0, 0.3)',
    orange: '#FF5500', // Practical warm source or one evidence/risk accent
    cyan: '#00F0FF', // Verified telemetry only
    frostedGlass: 'rgba(255, 255, 255, 0.08)',
    textPrimary: '#F4F4F5', // Titanium White (títulos e peso)
    textMuted: '#71717A', // Muted Slate (telemetria e suporte)
    border: 'rgba(255, 85, 0, 0.3)',
    yellow: '#FFE500',
    blue: '#0038FF',
    green: '#00FF85'
  },
  fonts: {
    heading: 'Bebas Neue',
    body: 'Inter',
    mono: 'JetBrains Mono'
  },
  glass: {
    backdropBlur: '12px',
    border: '1px solid rgba(255, 85, 0, 0.3)'
  },
  springs: {
    laserWipe: { damping: 20, mass: 0.8, stiffness: 90 },
    glassFloat: { damping: 15, mass: 1.0, stiffness: 120 },
    telemetryScan: { damping: 30, mass: 0.5, stiffness: 200 },
    pop: { damping: 12, mass: 0.6, stiffness: 180 },
    pan: { damping: 20, mass: 1, stiffness: 80 },
    drop: { damping: 14, mass: 1.2, stiffness: 140 }
  },
  mediaMix: {
    remotion: { min: 50, max: 60 },
    real: { min: 20, max: 25 },
    generative: { min: 10, max: 20 },
    typography: { min: 5, max: 10 }
  }
} as const;

export const OUTRO_LADO_BRAND = HSL_BRAND;

export const HSL_KLING_MODIFIER = [
  'present-day on-location investigative documentary',
  'physical observational camera with a 35mm documentary lens',
  'natural Rec.709 color, moderate contrast and readable shadows',
  'practical available light preserved',
  'fine irregular 35mm grain and subtle lamp-only halation',
  'real atmosphere only when caused by dust, vapor, spray or weather',
  'current commercially plausible equipment',
  'no permanent digital push-in, zoom loop or fake parallax',
  'no hologram, floating HUD, decorative laser, dominant neon or staged fog',
  'no posed human faces, text or logos --motion 2'
].join(', ');
