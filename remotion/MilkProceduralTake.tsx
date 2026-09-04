import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {FilmGrade} from './cinema/FilmGrade';

export interface MilkProceduralTakeProps {
  [key: string]: unknown;
  imageSrc: string;
  sceneId: string;
  chapterTitle: string;
  mode?: 'FLOW' | 'THERMAL' | 'ROUTE' | 'SEAL' | 'EVIDENCE';
}

const hashPosition = (value: string, offset: number, span: number): number => {
  let hash = offset;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % span;
};

export const MilkProceduralTake: React.FC<MilkProceduralTakeProps> = ({
  imageSrc,
  sceneId,
  chapterTitle,
  mode = 'EVIDENCE',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const intro = spring({frame, fps, config: {damping: 18, mass: 0.7, stiffness: 120}});
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames - 1], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scanY = interpolate(frame, [10, durationInFrames - 16], [-80, 1160], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const revealX = interpolate(frame, [8, 42, 86, durationInFrames - 8], [0, 58, 58, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const markerX = 300 + hashPosition(sceneId, 17, 1320);
  const markerY = 210 + hashPosition(sceneId, 43, 560);
  const pulse = 0.78 + Math.sin(frame / 7) * 0.08;
  const accent = mode === 'THERMAL' || mode === 'SEAL' ? '#FF5500' : '#00F0FF';

  return (
    <AbsoluteFill style={{backgroundColor: '#060709', opacity: fadeOut}}>
      <FilmGrade contrast={1.04} saturate={0.9} grainOpacity={0.028}>
        <AbsoluteFill>
          <Img
            src={staticFile(imageSrc)}
            style={{width: '100%', height: '100%', objectFit: 'cover'}}
          />

          <AbsoluteFill
            style={{
              clipPath: `polygon(0 0, ${revealX}% 0, ${revealX}% 100%, 0 100%)`,
              filter: mode === 'THERMAL'
                ? 'contrast(1.08) saturate(0.82) sepia(0.12)'
                : 'contrast(1.08) saturate(0.76)',
              opacity: 0.62,
            }}
          >
            <Img
              src={staticFile(imageSrc)}
              style={{width: '100%', height: '100%', objectFit: 'cover'}}
            />
          </AbsoluteFill>

          <div
            style={{
              position: 'absolute',
              top: scanY,
              left: 0,
              width: '100%',
              height: 2,
              opacity: 0.32,
              background: `linear-gradient(90deg, transparent 4%, ${accent} 45%, transparent 92%)`,
            }}
          />

          <div
            style={{
              position: 'absolute',
              left: markerX,
              top: markerY,
              width: 118,
              height: 118,
              border: `2px solid ${accent}`,
              borderRadius: '50%',
              opacity: intro * pulse,
              transform: `scale(${0.72 + intro * 0.28})`,
            }}
          >
            <div style={{position: 'absolute', left: 56, top: -26, width: 1, height: 168, background: `${accent}88`}} />
            <div style={{position: 'absolute', top: 56, left: -26, height: 1, width: 168, background: `${accent}88`}} />
          </div>

        </AbsoluteFill>
      </FilmGrade>
    </AbsoluteFill>
  );
};
