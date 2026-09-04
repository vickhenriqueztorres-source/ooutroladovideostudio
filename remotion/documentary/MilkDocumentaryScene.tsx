import React from 'react';
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export interface MilkDocumentarySceneProps {
  sceneId: string;
  imageSrc: string;
  mediaPath?: string;
  chapterTitle?: string;
  visualAssetClass?: 'VIDEO' | 'REALISTIC_IMAGE' | 'MOTION_GRAPHICS' | 'MOTION_IMAGE';
  canonCategory?: 'matter' | 'evidence' | 'maps' | 'reveal';
  durationInFrames: number;
  sourceDurationSeconds?: number;
  accentColor?: string;
  telemetryColor?: string;
}

const hashCoordinate = (value: string, seed: number, span: number): number => {
  let hash = seed;
  for (const character of value) hash = (hash * 33 + character.charCodeAt(0)) >>> 0;
  return hash % span;
};

/**
 * Cena específica da cadeia do leite.
 *
 * Vídeos são reproduzidos uma única vez, ajustados à duração editorial. Quadros
 * estáticos permanecem imóveis: o movimento vem somente de marcas documentais
 * que localizam evidência sem fabricar movimento de câmera ou parallax.
 */
export const MilkDocumentaryScene: React.FC<MilkDocumentarySceneProps> = ({
  sceneId,
  imageSrc,
  mediaPath,
  chapterTitle = '',
  visualAssetClass = 'REALISTIC_IMAGE',
  canonCategory = 'matter',
  durationInFrames,
  sourceDurationSeconds = 5.056,
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const isVideo = visualAssetClass === 'VIDEO' && Boolean(mediaPath);
  const sceneDurationSeconds = Math.max(1 / fps, durationInFrames / fps);
  const playbackRate = Math.max(0.35, Math.min(2, sourceDurationSeconds / sceneDurationSeconds));
  const markerX = 280 + hashCoordinate(sceneId, 19, 1260);
  const markerY = 190 + hashCoordinate(sceneId, 47, 560);
  const evidenceOpacity = interpolate(
    frame,
    [Math.round(fps * 0.55), Math.round(fps * 0.8), durationInFrames - Math.round(fps * 0.8), durationInFrames - Math.round(fps * 0.5)],
    [0, 0.82, 0.82, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  const lineProgress = interpolate(
    frame,
    [Math.round(fps * 0.65), Math.round(fps * 1.35)],
    [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  const markerColor = canonCategory === 'evidence' || canonCategory === 'reveal'
    ? accentColor
    : telemetryColor;
  const showEvidenceMark = !isVideo && canonCategory !== 'matter';

  return (
    <AbsoluteFill style={{backgroundColor: '#080a0c', overflow: 'hidden'}}>
      {isVideo ? (
        <OffthreadVideo
          src={staticFile(mediaPath!)}
          muted
          volume={0}
          playbackRate={playbackRate}
          style={{width: '100%', height: '100%', objectFit: 'cover'}}
        />
      ) : (
        <Img
          src={staticFile(imageSrc)}
          style={{width: '100%', height: '100%', objectFit: 'cover'}}
        />
      )}

      {showEvidenceMark && (
        <div style={{position: 'absolute', inset: 0, opacity: evidenceOpacity, pointerEvents: 'none'}}>
          <div
            style={{
              position: 'absolute',
              left: markerX,
              top: markerY,
              width: 94,
              height: 94,
              border: `1.5px solid ${markerColor}`,
              borderRadius: canonCategory === 'maps' ? 2 : '50%',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: markerX + 94,
              top: markerY + 47,
              width: 210 * lineProgress,
              height: 1,
              backgroundColor: markerColor,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: markerX + 310,
              top: markerY + 37,
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: markerColor,
              opacity: lineProgress,
            }}
          />
        </div>
      )}

    </AbsoluteFill>
  );
};
