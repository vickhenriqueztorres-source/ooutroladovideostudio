import {DocumentaryMotionColorRole, DocumentaryMotionZone} from '../../contracts/documentaryMotionContract';
import type {CSSProperties} from 'react';

export const DOCUMENTARY_MOTION_TOKENS = Object.freeze({
  canvas: Object.freeze({width: 1920, height: 1080}),
  safeMargin: 72,
  maxTextFrameRatio: 0.12,
  colors: Object.freeze({
    white: '#F4F4F0',
    muted: '#A4A6AE',
    dark: '#060709',
    evidence: '#FF5500',
    telemetry: '#00F0FF',
    line: 'rgba(244,244,240,0.78)',
    panel: 'rgba(6,7,9,0.18)',
    panelSoft: 'rgba(6,7,9,0.10)',
  }),
  typography: Object.freeze({
    editorial: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    mono: "'JetBrains Mono', 'Courier New', monospace",
    label: 24,
    detail: 18,
    source: 14,
    value: 46,
  }),
  timing: Object.freeze({
    enterFrames: 10,
    exitFrames: 8,
    lineDrawFrames: 16,
  }),
  geometry: Object.freeze({
    markerRadius: 18,
    lineWidth: 2,
    panelRadius: 4,
    panelMaxWidth: 440,
  }),
});

export function colorForRole(role: DocumentaryMotionColorRole): string {
  if (role === 'telemetry') return DOCUMENTARY_MOTION_TOKENS.colors.telemetry;
  if (role === 'evidence' || role === 'risk') return DOCUMENTARY_MOTION_TOKENS.colors.evidence;
  return DOCUMENTARY_MOTION_TOKENS.colors.white;
}

export function zoneStyle(zone: DocumentaryMotionZone, width = 420): CSSProperties {
  const margin = DOCUMENTARY_MOTION_TOKENS.safeMargin;
  const base: CSSProperties = {position: 'absolute', width};
  if (zone.includes('top')) base.top = margin;
  if (zone.includes('bottom')) base.bottom = margin;
  if (zone.includes('left')) base.left = margin;
  if (zone.includes('right')) base.right = margin;
  if (zone.includes('center') && !zone.includes('left') && !zone.includes('right')) {
    base.left = '50%';
    base.transform = 'translateX(-50%)';
  }
  if (zone === 'center_left' || zone === 'center_right' || zone === 'center') {
    base.top = '50%';
    const horizontal = zone === 'center_left'
      ? {left: margin}
      : zone === 'center_right'
        ? {right: margin}
        : {left: '50%'};
    Object.assign(base, horizontal);
    base.transform = zone === 'center' ? 'translate(-50%, -50%)' : 'translateY(-50%)';
  }
  if (zone === 'top_center' || zone === 'bottom_center') {
    base.left = '50%';
    base.transform = 'translateX(-50%)';
  }
  return base;
}
