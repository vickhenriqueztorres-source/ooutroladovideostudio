import React from 'react';
import {Easing, interpolate} from 'remotion';
import {DocumentaryMotionColorRole, DocumentaryMotionRecipe, NormalizedPoint} from '../../contracts/documentaryMotionContract';
import {colorForRole, DOCUMENTARY_MOTION_TOKENS} from './tokens';

export function motionEnvelope(frame: number, durationInFrames: number): number {
  const enter = Math.min(DOCUMENTARY_MOTION_TOKENS.timing.enterFrames, Math.max(1, durationInFrames / 3));
  const exitStart = Math.max(enter, durationInFrames - DOCUMENTARY_MOTION_TOKENS.timing.exitFrames);
  const fadeIn = interpolate(frame, [0, enter], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const fadeOut = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
  return Math.min(fadeIn, fadeOut);
}

export function drawProgress(frame: number, durationInFrames: number): number {
  return interpolate(
    frame,
    [0, Math.min(DOCUMENTARY_MOTION_TOKENS.timing.lineDrawFrames, durationInFrames * 0.45)],
    [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)}
  );
}

export function trackedPoint(
  binding: DocumentaryMotionRecipe['binding'],
  fallback: NormalizedPoint,
  frame: number,
  fps: number,
): NormalizedPoint {
  if (!binding?.keyframes.length) return fallback;
  const seconds = frame / fps;
  const keyframes = binding.keyframes;
  if (seconds <= keyframes[0].atSeconds) return keyframes[0].point;
  if (seconds >= keyframes[keyframes.length - 1].atSeconds) return keyframes[keyframes.length - 1].point;
  const rightIndex = keyframes.findIndex((keyframe) => keyframe.atSeconds >= seconds);
  const left = keyframes[Math.max(0, rightIndex - 1)];
  const right = keyframes[rightIndex];
  const progress = (seconds - left.atSeconds) / Math.max(0.001, right.atSeconds - left.atSeconds);
  return {
    x: left.point.x + (right.point.x - left.point.x) * progress,
    y: left.point.y + (right.point.y - left.point.y) * progress,
  };
}

export function px(point: NormalizedPoint): {x: number; y: number} {
  return {
    x: point.x * DOCUMENTARY_MOTION_TOKENS.canvas.width,
    y: point.y * DOCUMENTARY_MOTION_TOKENS.canvas.height,
  };
}

export const OverlaySvg: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg
    viewBox={`0 0 ${DOCUMENTARY_MOTION_TOKENS.canvas.width} ${DOCUMENTARY_MOTION_TOKENS.canvas.height}`}
    preserveAspectRatio="none"
    style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}
  >
    {children}
  </svg>
);

export const MarkerRing: React.FC<{
  point: NormalizedPoint;
  progress: number;
  role?: DocumentaryMotionColorRole;
  radius?: number;
}> = ({point, progress, role = 'evidence', radius = DOCUMENTARY_MOTION_TOKENS.geometry.markerRadius}) => {
  const p = px(point);
  const circumference = Math.PI * 2 * radius;
  return (
    <circle
      cx={p.x}
      cy={p.y}
      r={radius}
      fill="rgba(6,7,9,0.12)"
      stroke={colorForRole(role)}
      strokeWidth={DOCUMENTARY_MOTION_TOKENS.geometry.lineWidth}
      strokeDasharray={circumference}
      strokeDashoffset={circumference * (1 - progress)}
      transform={`rotate(-90 ${p.x} ${p.y})`}
    />
  );
};

export const LeaderLine: React.FC<{
  from: NormalizedPoint;
  to: NormalizedPoint;
  progress: number;
  role?: DocumentaryMotionColorRole;
  dashed?: boolean;
}> = ({from, to, progress, role = 'neutral', dashed = false}) => {
  const a = px(from);
  const b = px(to);
  return (
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      pathLength={1}
      stroke={colorForRole(role)}
      strokeWidth={DOCUMENTARY_MOTION_TOKENS.geometry.lineWidth}
      strokeDasharray={dashed ? '0.018 0.012' : 1}
      strokeDashoffset={dashed ? 0 : 1 - progress}
      opacity={0.9}
    />
  );
};

export const MotionPanel: React.FC<{
  opacity: number;
  role?: DocumentaryMotionColorRole;
  children: React.ReactNode;
  width?: number;
  compact?: boolean;
}> = ({opacity, role = 'neutral', children, width = 420, compact = false}) => (
  <div
    style={{
      width,
      boxSizing: 'border-box',
      padding: compact ? '8px 0' : '10px 0',
      background: 'transparent',
      borderTop: `1px solid ${colorForRole(role)}`,
      borderRadius: 0,
      color: DOCUMENTARY_MOTION_TOKENS.colors.white,
      opacity,
      fontFamily: DOCUMENTARY_MOTION_TOKENS.typography.editorial,
      textAlign: 'left',
      textShadow: '0 2px 12px rgba(0,0,0,0.9)',
    }}
  >
    {children}
  </div>
);

export const MotionLabel: React.FC<{
  label: string;
  detail?: string;
  role?: DocumentaryMotionColorRole;
}> = ({label, detail, role = 'neutral'}) => (
  <>
    <div style={{fontSize: DOCUMENTARY_MOTION_TOKENS.typography.label, lineHeight: 1.15, fontWeight: 700, letterSpacing: 0}}>
      {label}
    </div>
    {detail ? (
      <div style={{fontSize: DOCUMENTARY_MOTION_TOKENS.typography.detail, lineHeight: 1.35, marginTop: 6, color: DOCUMENTARY_MOTION_TOKENS.colors.muted, letterSpacing: 0}}>
        <span style={{color: colorForRole(role)}}>{detail}</span>
      </div>
    ) : null}
  </>
);

export const SourceLine: React.FC<{source?: string}> = ({source}) => source ? (
  <div
    style={{
      marginTop: 9,
      fontFamily: DOCUMENTARY_MOTION_TOKENS.typography.mono,
      fontSize: DOCUMENTARY_MOTION_TOKENS.typography.source,
      lineHeight: 1.25,
      color: DOCUMENTARY_MOTION_TOKENS.colors.muted,
      letterSpacing: 0,
      whiteSpace: 'normal',
    }}
  >
    FONTE: {source}
  </div>
) : null;

export function polylinePath(points: readonly NormalizedPoint[], close = false): string {
  const commands = points.map((point, index) => {
    const p = px(point);
    return `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
  });
  return `${commands.join(' ')}${close ? ' Z' : ''}`;
}

export function formatDocumentaryNumber(value: number, decimals: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
