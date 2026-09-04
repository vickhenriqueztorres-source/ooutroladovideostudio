import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame
} from 'remotion';

export interface KineticEditorialCalloutProps {
  mainText?: string;
  text?: string;
  subText?: string;
  categoryText?: string;
  startFrame?: number;
  durationFrames?: number;
  durationInFrames?: number;
  position?: 'center' | 'bottom_left' | 'top_right' | 'center_left';
  accentColor?: string;
  telemetryColor?: string;
  scaleIntensity?: number;
}

/**
 * Anotação documental curta. Não substitui a evidência fotografada e não usa
 * escala, tracking animado, glow ou barras de apresentação.
 */
export const KineticEditorialCallout: React.FC<KineticEditorialCalloutProps> = ({
  mainText,
  text,
  subText,
  categoryText,
  startFrame = 15,
  durationFrames = 75,
  position = 'center',
  accentColor = '#FF5500'
}) => {
  const frame = useCurrentFrame();

  const displayText = mainText || text || '';
  if (!displayText) {
    return null;
  }

  const activeFrame = frame - startFrame;
  if (activeFrame < 0 || activeFrame > durationFrames) {
    return null;
  }

  const enter = interpolate(activeFrame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)
  });
  const exit = interpolate(activeFrame, [Math.max(9, durationFrames - 8), durationFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)
  });
  const opacity = Math.min(enter, exit);

  // Posicionamento
  const getContainerStyle = (): React.CSSProperties => {
    switch (position) {
      case 'bottom_left':
        return {bottom: 78, left: 72, alignItems: 'flex-start', textAlign: 'left'};
      case 'top_right':
        return {top: 72, right: 72, alignItems: 'flex-end', textAlign: 'right'};
      case 'center_left':
        return {top: '42%', left: 72, alignItems: 'flex-start', textAlign: 'left'};
      case 'center':
      default:
        return {top: '42%', left: 72, alignItems: 'flex-start', textAlign: 'left'};
    }
  };

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50
      }}
    >
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          opacity,
          transform: `translateY(${(1 - enter) * 5}px)`,
          maxWidth: 620,
          ...getContainerStyle()
        }}
      >
        {categoryText && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', Menlo, Consolas, monospace",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0,
              color: accentColor,
              textTransform: 'uppercase',
              marginBottom: 6,
              textShadow: '0 2px 12px rgba(0,0,0,0.9)'
            }}
          >
            {categoryText}
          </div>
        )}

        <div
          style={{
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: displayText.length > 38 ? 26 : 30,
            fontWeight: 750,
            letterSpacing: 0,
            color: '#F4F4F0',
            textTransform: 'uppercase',
            lineHeight: 1.15,
            textShadow: '0 2px 14px rgba(0,0,0,0.95)'
          }}
        >
          {displayText}
        </div>

        <div
          style={{
            height: 1,
            width: 42,
            backgroundColor: accentColor,
            marginTop: 8,
            alignSelf: 'flex-start'
          }}
        />

        {subText && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', Menlo, Consolas, monospace",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: 0,
              color: '#D7D8D4',
              marginTop: 7,
              textTransform: 'uppercase',
              textShadow: '0 2px 10px rgba(0,0,0,0.9)'
            }}
          >
            {subText}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
