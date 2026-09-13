import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { AtomicStopwatch } from '../documentary/AtomicStopwatch';
import { CINEMATIC_TYPOGRAPHY } from './typography';

export interface CalculatedHudWindow {
  id: string;
  component: string;
  componentName?: string;
  props?: Record<string, any>;
  startFrame: number;
  durationFrames: number;
  endFrame: number;
}

export interface HudDirectorProps {
  totalFrames: number;
  hudWindows?: CalculatedHudWindow[];
  showMasterStopwatch?: boolean;
  accentColor?: string;
  telemetryColor?: string;
  children?: React.ReactNode;
}

/**
 * 🛰️ HudDirector: Diretor de HUDs Persistentes e Telemetria
 * Gerencia a renderização segura de elementos técnicos na tela,
 * respeitando janelas de timeline, slide-in/out de 10 frames e limite
 * de 1 elemento gráfico simultâneo.
 */
export const HudDirector: React.FC<HudDirectorProps> = ({
  totalFrames,
  hudWindows = [],
  showMasterStopwatch = false,
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF',
  children
}) => {
  const frame = useCurrentFrame();

  // Filtra as janelas de HUD ativas no frame atual
  const activeWindows = hudWindows.filter(
    (w) => frame >= w.startFrame && frame < w.endFrame
  );

  // Limite Disciplinar de HUD: Máximo 1 elemento gráfico simultâneo
  const visibleWindows = activeWindows.slice(0, 1);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* 1. Camada Base dos Filhos */}
      {children}

      {/* 2. Cronômetro Atômico de Telemetria no Topo Central (Safe Zone) */}
      {showMasterStopwatch && (
        <div
          style={{
            position: 'absolute',
            top: '104px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 950
          }}
        >
          <AtomicStopwatch totalFrames={totalFrames} />
        </div>
      )}

      {/* 3. Renderização de Janelas de HUD Específicas com Slide-In/Out 10 frames */}
      {visibleWindows.map((win) => {
        const localFrame = frame - win.startFrame;
        const animDuration = 10;

        // Slide-in nos primeiros 10 frames
        let translateX = 0;
        let opacity = 1;

        if (localFrame < animDuration) {
          translateX = interpolate(localFrame, [0, animDuration], [40, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp'
          });
          opacity = interpolate(localFrame, [0, animDuration], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp'
          });
        } else if (localFrame > win.durationFrames - animDuration) {
          // Slide-out nos últimos 10 frames
          translateX = interpolate(
            localFrame,
            [win.durationFrames - animDuration, win.durationFrames],
            [0, 40],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          opacity = interpolate(
            localFrame,
            [win.durationFrames - animDuration, win.durationFrames],
            [1, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
        }

        return (
          <div
            key={win.id}
            style={{
              position: 'absolute',
              top: '110px',
              right: '48px',
              padding: '20px 28px',
              backgroundColor: 'rgba(6, 7, 9, 0.92)',
              backdropFilter: 'blur(16px)',
              border: `1px solid rgba(0, 240, 255, 0.35)`,
              borderLeft: `5px solid ${accentColor}`,
              borderRadius: '6px',
              color: CINEMATIC_TYPOGRAPHY.COLORS.TEXT_PRIMARY,
              fontFamily: CINEMATIC_TYPOGRAPHY.FONTS.TELEMETRY,
              fontSize: '22px',
              letterSpacing: '1px',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.75)',
              zIndex: 920,
              maxWidth: '680px',
              transform: `translate3d(${translateX}px, 0, 0)`,
              opacity
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
              }}
            >
              <span
                style={{
                  color: telemetryColor,
                  fontWeight: 'bold',
                  fontSize: CINEMATIC_TYPOGRAPHY.SIZES.PRIMARY_LABEL,
                  letterSpacing: '2px'
                }}
              >
                // TELEMETRIA SISTÊMICA
              </span>
              <span
                style={{
                  color: CINEMATIC_TYPOGRAPHY.COLORS.TEXT_MUTED,
                  fontSize: CINEMATIC_TYPOGRAPHY.SIZES.FOOTNOTE
                }}
              >
                {win.id}
              </span>
            </div>
            <div
              style={{
                color: CINEMATIC_TYPOGRAPHY.COLORS.TEXT_PRIMARY,
                fontSize: '26px',
                fontWeight: 600,
                lineHeight: 1.35,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {win.props?.title || win.component}
            </div>
            {win.props?.status && (
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '22px',
                  color: accentColor,
                  fontWeight: 'bold',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                STATUS: {win.props.status}
              </div>
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
