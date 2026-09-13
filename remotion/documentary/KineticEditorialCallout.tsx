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
          maxWidth: 1100,
          ...getContainerStyle()
        }}
      >
        {categoryText && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', Menlo, Consolas, monospace",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 2,
              color: accentColor,
              textTransform: 'uppercase',
              marginBottom: 10,
              textShadow: '0 2px 14px rgba(0,0,0,0.95)'
            }}
          >
            {categoryText}
          </div>
        )}

        <div
          style={{
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: displayText.length > 40 ? 46 : 56,
            fontWeight: 850,
            letterSpacing: 0,
            color: '#F4F4F0',
            textTransform: 'uppercase',
            lineHeight: 1.1,
            textShadow: '0 3px 20px rgba(0,0,0,0.98)'
          }}
        >
          {displayText}
        </div>

        <div
          style={{
            height: 3,
            width: 72,
            backgroundColor: accentColor,
            marginTop: 12,
            marginBottom: 8,
            alignSelf: 'flex-start'
          }}
        />

        {subText && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', Menlo, Consolas, monospace",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 1,
              color: '#E2E4DE',
              marginTop: 4,
              textTransform: 'uppercase',
              textShadow: '0 2px 12px rgba(0,0,0,0.95)'
            }}
          >
            {subText}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
