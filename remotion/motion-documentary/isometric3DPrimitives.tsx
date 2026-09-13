import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface IsometricViewportProps {
  children: React.ReactNode;
  rotateX?: number;
  rotateZ?: number;
  scale?: number;
  perspective?: number;
  style?: React.CSSProperties;
}

/**
 * 📐 IsometricViewport: Contêiner 3D Isométrico com Projeção Matricial
 */
export const IsometricViewport: React.FC<IsometricViewportProps> = ({
  children,
  rotateX = 58,
  rotateZ = -38,
  scale = 1,
  perspective = 1400,
  style
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: `${perspective}px`,
        overflow: 'hidden',
        ...style
      }}
    >
      <div
        style={{
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotateX}deg) rotateZ(${rotateZ}deg) scale(${scale})`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export interface IsometricGridProps {
  size?: number;
  divisions?: number;
  gridColor?: string;
  axisColor?: string;
  opacity?: number;
}

/**
 * 📏 IsometricGrid: Grade de Engenharia CAD Isométrica
 */
export const IsometricGrid: React.FC<IsometricGridProps> = ({
  size = 800,
  divisions = 16,
  gridColor = 'rgba(255, 255, 255, 0.05)',
  axisColor = 'rgba(0, 240, 255, 0.3)',
  opacity = 1
}) => {
  const step = size / divisions;
  const half = size / 2;

  return (
    <div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        left: -half,
        top: -half,
        opacity,
        pointerEvents: 'none',
        transformStyle: 'preserve-3d'
      }}
    >
      {/* Malha de Linhas */}
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: divisions + 1 }).map((_, i) => {
          const pos = i * step;
          const isCenter = i === divisions / 2;
          return (
            <React.Fragment key={`grid-${i}`}>
              <line
                x1={pos}
                y1={0}
                x2={pos}
                y2={size}
                stroke={isCenter ? axisColor : gridColor}
                strokeWidth={isCenter ? 1.5 : 1}
              />
              <line
                x1={0}
                y1={pos}
                x2={size}
                y2={pos}
                stroke={isCenter ? axisColor : gridColor}
                strokeWidth={isCenter ? 1.5 : 1}
              />
            </React.Fragment>
          );
        })}
      </svg>
    </div>
  );
};

export interface IsometricCuboidProps {
  width: number;
  height: number;
  depth: number;
  topColor?: string;
  leftColor?: string;
  rightColor?: string;
  borderColor?: string;
  opacity?: number;
  elevation?: number;
  style?: React.CSSProperties;
}

/**
 * 📦 IsometricCuboid: Bloco 3D com 3 Faces Iluminadas em Chiaroscuro
 * Projeta Top, Left e Right com oclusão de ambiente e profundidade real.
 */
export const IsometricCuboid: React.FC<IsometricCuboidProps> = ({
  width,
  height,
  depth,
  topColor = '#1F2430',
  leftColor = '#141824',
  rightColor = '#0B0D14',
  borderColor = 'rgba(255, 255, 255, 0.1)',
  opacity = 1,
  elevation = 0,
  style
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        width,
        height,
        left: -width / 2,
        top: -height / 2,
        transformStyle: 'preserve-3d',
        transform: `translateZ(${elevation}px)`,
        opacity,
        ...style
      }}
    >
      {/* Face Superior (Top) */}
      <div
        style={{
          position: 'absolute',
          width,
          height,
          backgroundColor: topColor,
          border: `1px solid ${borderColor}`,
          transformStyle: 'preserve-3d',
          transform: `translateZ(${depth}px)`,
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
        }}
      />

      {/* Face Lateral Esquerda (Left - eixo Y) */}
      <div
        style={{
          position: 'absolute',
          width,
          height: depth,
          backgroundColor: leftColor,
          border: `1px solid ${borderColor}`,
          transformOrigin: 'top left',
          transform: `rotateX(-90deg) translateZ(0px)`,
          boxShadow: 'inset 0 0 25px rgba(0,0,0,0.7)'
        }}
      />

      {/* Face Lateral Direita (Right - eixo X) */}
      <div
        style={{
          position: 'absolute',
          width: depth,
          height,
          backgroundColor: rightColor,
          border: `1px solid ${borderColor}`,
          transformOrigin: 'top right',
          transform: `rotateY(90deg) translateZ(${width - depth}px)`,
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8)'
        }}
      />
    </div>
  );
};

export interface IsometricSliceLaserProps {
  width: number;
  height: number;
  depth: number;
  sliceProgress: number; // 0 a 1
  laserColor?: string;
  glowColor?: string;
}

/**
 * ⚡ IsometricSliceLaser: Feixe de Varredura Laser de Corte Forense
 */
export const IsometricSliceLaser: React.FC<IsometricSliceLaserProps> = ({
  width,
  height,
  depth,
  sliceProgress,
  laserColor = '#FF5500',
  glowColor = 'rgba(255, 85, 0, 0.4)'
}) => {
  const currentZ = interpolate(sliceProgress, [0, 1], [0, depth]);

  return (
    <div
      style={{
        position: 'absolute',
        width: width + 40,
        height: height + 40,
        left: -(width + 40) / 2,
        top: -(height + 40) / 2,
        transformStyle: 'preserve-3d',
        transform: `translateZ(${currentZ}px)`,
        pointerEvents: 'none'
      }}
    >
      {/* Lâmina Laser */}
      <div
        style={{
          width: '100%',
          height: '100%',
          border: `2px solid ${laserColor}`,
          backgroundColor: glowColor,
          boxShadow: `0 0 25px ${laserColor}, inset 0 0 15px ${laserColor}`
        }}
      />
    </div>
  );
};

export interface IsometricTelemetryPinProps {
  x: number;
  y: number;
  z: number;
  height?: number;
  tagTitle: string;
  tagValue: string;
  unit?: string;
  accentColor?: string;
  telemetryColor?: string;
  opacity?: number;
}

/**
 * 📍 IsometricTelemetryPin: Marcador de Cota Metrológica Tridimensional
 */
export const IsometricTelemetryPin: React.FC<IsometricTelemetryPinProps> = ({
  x,
  y,
  z,
  height = 80,
  tagTitle,
  tagValue,
  unit = '',
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF',
  opacity = 1
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transformStyle: 'preserve-3d',
        transform: `translateZ(${z}px)`,
        opacity,
        pointerEvents: 'none'
      }}
    >
      {/* Ponto Base na Superfície */}
      <div
        style={{
          position: 'absolute',
          width: 8,
          height: 8,
          left: -4,
          top: -4,
          borderRadius: '50%',
          backgroundColor: accentColor,
          boxShadow: `0 0 10px ${accentColor}`
        }}
      />

      {/* Haste Vertical Z */}
      <div
        style={{
          position: 'absolute',
          width: 1.5,
          height,
          backgroundColor: telemetryColor,
          transformOrigin: 'bottom left',
          transform: 'rotateX(-90deg)',
          boxShadow: `0 0 6px ${telemetryColor}`
        }}
      />

      {/* Tag Flutuante com Bilboard Reverso (desfaz a inclinação para leitura perfeita) */}
      <div
        style={{
          position: 'absolute',
          left: 14,
          top: -height - 18,
          transformStyle: 'preserve-3d',
          transform: 'rotateZ(38deg) rotateX(-58deg)',
          backgroundColor: 'rgba(6, 7, 9, 0.94)',
          border: `2px solid ${telemetryColor}`,
          padding: '10px 18px',
          borderRadius: 4,
          boxShadow: '0 12px 32px rgba(0,0,0,0.9)',
          whiteSpace: 'nowrap'
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 16,
            fontWeight: 700,
            color: '#8A8D9F',
            letterSpacing: 2,
            textTransform: 'uppercase'
          }}
        >
          {tagTitle}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 24,
            fontWeight: 900,
            color: '#F4F4F0',
            marginTop: 4
          }}
        >
          <span style={{ color: accentColor }}>{tagValue}</span> {unit}
        </div>
      </div>
    </div>
  );
};
