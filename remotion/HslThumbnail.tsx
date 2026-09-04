import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { HSL_THUMBNAIL_TYPOGRAPHY } from '../spec/hsl-spec';

export interface HslThumbnailProps extends Record<string, unknown> {
  readonly baseImageSrc: string;
  readonly headlineLines: readonly string[];
  readonly categoryBadge?: string;
  readonly subheadline?: string;
  readonly textSide?: 'LEFT' | 'RIGHT';
  readonly accentColor?: string;
  readonly telemetryColor?: string;
  readonly revealPercentage?: number;
  readonly coordinates?: string;
  readonly sourcesCount?: number;
  readonly documentsCount?: number;

  // Novos campos semânticos para YouTube High-Conversion
  readonly mode?: 'thumbnail' | 'brand-board';
  readonly hideDecorativeHud?: boolean;
  readonly brandMark?: 'minimal' | 'full' | 'none';
  readonly format?: string;
  readonly safeZone?: 'mobile' | 'standard';
  readonly syntheticLabel?: string;
  readonly evidenceLabel?: string;
}

/**
 * THUMBNAIL OFICIAL 4K — O OUTRO LADO (3840x2160)
 * Direção Aprovada: INDUSTRIAL X-RAY (Documentário Investigativo)
 * Denis Villeneuve 35mm Anamorphic, Laranja Vapor de Sódio (#FF5500),
 * Ciano Laser (#00F0FF), Carbon Black (#060709), Tipografia Bebas/Impact.
 * 
 * Modo 'thumbnail' (Padrão): Foco absoluto no Objeto 35mm + Headline massiva legível no celular,
 * sem HUDs decorativos, sem selos gigantes e sem coordenadas distrativas.
 */
export const HslThumbnail: React.FC<HslThumbnailProps> = ({
  baseImageSrc,
  headlineLines = ['NUNCA FOI', 'PAPEL.'],
  categoryBadge = 'INVESTIGAÇÃO // O OUTRO LADO',
  subheadline,
  textSide = 'LEFT',
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF',
  revealPercentage = 88,
  coordinates = '22.9042° S, 43.1729° W',
  mode = 'thumbnail',
  hideDecorativeHud = true,
  brandMark = 'minimal',
  syntheticLabel,
  evidenceLabel
}) => {
  const isLeft = textSide === 'LEFT';
  const isCleanThumbnail = mode === 'thumbnail' || hideDecorativeHud;

  // Cálculo de tamanho dinâmico da headline conectado à spec canônica da raiz (spec/hsl-spec)
  const maxLineLength = Math.max(...headlineLines.map((l) => l.length), 1);
  let headlineFontSize: number = HSL_THUMBNAIL_TYPOGRAPHY.SCALES.SHORT_LINE_MAX_FONT_SIZE;
  if (maxLineLength > 14) {
    headlineFontSize = HSL_THUMBNAIL_TYPOGRAPHY.SCALES.EXTENDED_LINE_FONT_SIZE;
  } else if (maxLineLength > 11) {
    headlineFontSize = HSL_THUMBNAIL_TYPOGRAPHY.SCALES.LONG_LINE_FONT_SIZE;
  } else if (maxLineLength > 8) {
    headlineFontSize = HSL_THUMBNAIL_TYPOGRAPHY.SCALES.MEDIUM_LINE_FONT_SIZE;
  }
  if (headlineLines.length > 2) {
    headlineFontSize = Math.min(headlineFontSize, HSL_THUMBNAIL_TYPOGRAPHY.SCALES.MULTI_LINE_CAP_FONT_SIZE);
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: HSL_THUMBNAIL_TYPOGRAPHY.COLORS.BACKGROUND_DARK,
        color: HSL_THUMBNAIL_TYPOGRAPHY.COLORS.PRIMARY_TEXT,
        overflow: 'hidden',
        fontFamily: HSL_THUMBNAIL_TYPOGRAPHY.FONTS.EDITORIAL
      }}
    >
      {/* 1. Imagem de Fundo 35mm Chiaroscuro */}
      <Img
        src={staticFile(baseImageSrc)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'contrast(1.18) brightness(0.88) saturate(1.12)'
        }}
      />

      {/* 2. Gradiente Direcional Villeneuve para Máximo Contraste Ótico em Chiaroscuro */}
      <AbsoluteFill
        style={{
          background: isLeft
            ? 'linear-gradient(90deg, rgba(6,7,9,0.95) 0%, rgba(6,7,9,0.86) 34%, rgba(6,7,9,0.30) 60%, rgba(6,7,9,0) 78%)'
            : 'linear-gradient(270deg, rgba(6,7,9,0.95) 0%, rgba(6,7,9,0.86) 34%, rgba(6,7,9,0.30) 60%, rgba(6,7,9,0) 78%)'
        }}
      />

      {/* 3. Cantoneiras Cinematográficas Sutis [ ] */}
      <div style={{ position: 'absolute', top: 80, left: 80, width: 50, height: 50, borderTop: '3px solid rgba(244,244,240,0.35)', borderLeft: '3px solid rgba(244,244,240,0.35)' }} />
      <div style={{ position: 'absolute', top: 80, right: 80, width: 50, height: 50, borderTop: '3px solid rgba(244,244,240,0.35)', borderRight: '3px solid rgba(244,244,240,0.35)' }} />
      <div style={{ position: 'absolute', bottom: 80, left: 80, width: 50, height: 50, borderBottom: '3px solid rgba(244,244,240,0.35)', borderLeft: '3px solid rgba(244,244,240,0.35)' }} />
      {/* Canto inferior direito deixado livre para não colidir com o timestamp do YouTube */}

      {/* 4. Marca Mínima (Discreta, <5% da tela, sem competir com o sujeito) */}
      {brandMark === 'minimal' && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: 100,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontFamily: HSL_THUMBNAIL_TYPOGRAPHY.FONTS.TELEMETRY,
            fontSize: HSL_THUMBNAIL_TYPOGRAPHY.SCALES.CATEGORY_BADGE_FONT_SIZE,
            fontWeight: 800,
            letterSpacing: HSL_THUMBNAIL_TYPOGRAPHY.METRICS.LETTER_SPACING_TELEMETRY,
            color: '#F4F4F0',
            backgroundColor: 'rgba(6,7,9,0.85)',
            padding: '12px 26px',
            borderRadius: 6,
            borderLeft: `6px solid ${HSL_THUMBNAIL_TYPOGRAPHY.COLORS.ACCENT_TEXT}`,
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            boxShadow: HSL_THUMBNAIL_TYPOGRAPHY.SHADOWS.SOLID_PILL_SHADOW,
            zIndex: 10
          }}
        >
          <span>{categoryBadge}</span>
        </div>
      )}

      {/* Label de Identificação de Reconstrução Sintética (se aplicável) */}
      {syntheticLabel && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            right: 100,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 2,
            color: telemetryColor,
            backgroundColor: 'rgba(6,7,9,0.85)',
            padding: '10px 20px',
            borderRadius: 6,
            border: `1px solid ${telemetryColor}60`,
            zIndex: 10
          }}
        >
          SIMULAÇÃO FORENSE // {syntheticLabel}
        </div>
      )}

      {/* 6. Bloco Principal da Headline (Ultra-Legível em Telas Grandes e Smartphones) */}
      <div
        style={{
          position: 'absolute',
          top: 180,
          bottom: 180,
          left: isLeft ? 140 : undefined,
          right: isLeft ? undefined : 140,
          width: 1750,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: isLeft ? 'flex-start' : 'flex-end',
          zIndex: 10
        }}
      >
        {/* Linhas da Headline com Alto Contraste 35mm e Sombra Sólida (ZERO NEON) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, lineHeight: HSL_THUMBNAIL_TYPOGRAPHY.METRICS.LINE_HEIGHT }}>
          {headlineLines.map((line, idx) => {
            const isLast = idx === headlineLines.length - 1;
            return (
              <span
                key={idx}
                style={{
                  fontFamily: HSL_THUMBNAIL_TYPOGRAPHY.FONTS.HEADLINE,
                  fontSize: headlineFontSize,
                  fontWeight: 900,
                  letterSpacing: HSL_THUMBNAIL_TYPOGRAPHY.METRICS.LETTER_SPACING_HEADLINE,
                  textTransform: 'uppercase',
                  color: isLast ? HSL_THUMBNAIL_TYPOGRAPHY.COLORS.ACCENT_TEXT : HSL_THUMBNAIL_TYPOGRAPHY.COLORS.PRIMARY_TEXT,
                  textShadow: HSL_THUMBNAIL_TYPOGRAPHY.SHADOWS.SOLID_DROP_SHADOW,
                  transform: `scaleY(${HSL_THUMBNAIL_TYPOGRAPHY.METRICS.SCALE_Y})`
                }}
              >
                {line}
              </span>
            );
          })}
        </div>

        {/* Barra de Tensão Laranja Sólida (ZERO NEON) */}
        <div
          style={{
            width: HSL_THUMBNAIL_TYPOGRAPHY.ACCENT_BAR.WIDTH,
            height: HSL_THUMBNAIL_TYPOGRAPHY.ACCENT_BAR.HEIGHT,
            marginTop: 36,
            marginBottom: subheadline ? 0 : 10,
            backgroundColor: HSL_THUMBNAIL_TYPOGRAPHY.ACCENT_BAR.COLOR,
            boxShadow: HSL_THUMBNAIL_TYPOGRAPHY.SHADOWS.SOLID_BAR_SHADOW,
            borderRadius: 2
          }}
        />

        {/* Subheadline Técnica em Ciano Laser com Pill Sólido (ZERO NEON) */}
        {subheadline && (
          <div
            style={{
              marginTop: 28,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 18,
              backgroundColor: 'rgba(6,7,9,0.95)',
              padding: '18px 36px',
              borderRadius: 8,
              border: `2px solid ${HSL_THUMBNAIL_TYPOGRAPHY.COLORS.TELEMETRY_TEXT}`,
              borderLeft: `12px solid ${HSL_THUMBNAIL_TYPOGRAPHY.COLORS.TELEMETRY_TEXT}`,
              boxShadow: HSL_THUMBNAIL_TYPOGRAPHY.SHADOWS.SOLID_PILL_SHADOW
            }}
          >
            <span
              style={{
                fontFamily: HSL_THUMBNAIL_TYPOGRAPHY.FONTS.TELEMETRY,
                fontSize: HSL_THUMBNAIL_TYPOGRAPHY.SCALES.SUBHEADLINE_FONT_SIZE,
                fontWeight: 900,
                letterSpacing: HSL_THUMBNAIL_TYPOGRAPHY.METRICS.LETTER_SPACING_TELEMETRY,
                color: HSL_THUMBNAIL_TYPOGRAPHY.COLORS.TELEMETRY_TEXT,
                textTransform: 'uppercase'
              }}
            >
              {subheadline}
            </span>
          </div>
        )}

        {/* Label de Evidência Técnica Opcional */}
        {evidenceLabel && (
          <div style={{ marginTop: 24, fontFamily: "'JetBrains Mono', monospace", fontSize: 32, color: '#8A8D9F', letterSpacing: 2 }}>
            EVIDÊNCIA: {evidenceLabel}
          </div>
        )}
      </div>

      {/* 7. Elementos de Brand-Board (Renderizados APENAS no modo brand-board) */}
      {!isCleanThumbnail && (
        <>
          {/* Selo de Auditoria Técnica */}
          <div
            style={{
              position: 'absolute',
              bottom: 240,
              right: 260,
              width: 440,
              height: 440,
              borderRadius: '50%',
              border: `3px solid ${telemetryColor}80`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(6,7,9,0.75)',
              zIndex: 12
            }}
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, color: telemetryColor }}>ANÁLISE</span>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: '#F4F4F0' }}>O OUTRO LADO</span>
          </div>

          {/* Rodapé com Coordenadas */}
          <div
            style={{
              position: 'absolute',
              bottom: 60,
              left: 160,
              right: 160,
              height: 60,
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 24,
              color: 'rgba(244,244,240,0.7)',
              borderTop: '1px solid rgba(255,255,255,0.15)',
              paddingTop: 12
            }}
          >
            <div>COORDENADAS // {coordinates}</div>
            <div>REVELAÇÃO: {revealPercentage}%</div>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};
