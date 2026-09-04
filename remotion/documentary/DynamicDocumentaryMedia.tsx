import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile } from 'remotion';
import { CinematicParallaxMotion } from './CinematicParallaxMotion';
import { CinematicKeyframeDossier } from './CinematicKeyframeDossier';
import availableMediaJson from '../availableMedia.json';

const availableMedia = availableMediaJson as Record<
  string,
  { hasVideo: boolean; hasImage: boolean; isDossier?: boolean }
>;

export interface DynamicDocumentaryMediaProps {
  sceneId: string;
  mediaPath?: string;
  imagePath?: string;
  imageSrc?: string;
  kenBurns?: 'crash_push_in' | 'slow_push_in' | 'dramatic_pull_out' | 'pan_right' | 'pan_left' | 'cinematic_drift';
  durationInFrames: number;
  opacity?: number;
  filter?: string;
  zoomIntensity?: number;
  isDossierTake?: boolean;
  dossierTag?: string;
}

export const DynamicDocumentaryMedia: React.FC<DynamicDocumentaryMediaProps> = ({
  sceneId,
  mediaPath,
  imagePath,
  imageSrc,
  kenBurns = 'slow_push_in',
  durationInFrames,
  opacity = 1.0,
  filter = 'none',
  zoomIntensity = 1.25,
  isDossierTake = false,
  dossierTag
}) => {
  const mediaInfo = availableMedia[sceneId];
  const isDossier = isDossierTake || mediaInfo?.isDossier === true;
  const hasVideo = !isDossier && Boolean(mediaInfo?.hasVideo);
  const episodeFolder = sceneId.startsWith('AGRO')
    ? 'drones-agro'
    : sceneId.startsWith('GPS')
    ? 'gps-tempo'
    : sceneId.startsWith('N100')
    ? 'nota-100-reais'
    : sceneId.startsWith('DC')
    ? 'energia-ia-data-centers'
    : sceneId.startsWith('MILK')
    ? 'leite-cadeia-frio'
    : 'gasolina-adulterada';

  const videoSrc = mediaPath || `episodes/${episodeFolder}/takes/${sceneId}.mp4`;
  const resolvedImageSrc = imageSrc || imagePath || `episodes/${episodeFolder}/images/${sceneId}.png`;

  // 1. Cenas do tipo KEYFRAME_DOSSIER: Motion Graphics 2.5D com scanline e HUD
  if (isDossier) {
    return (
      <CinematicKeyframeDossier
        imageSrc={resolvedImageSrc}
        durationInFrames={durationInFrames}
        motionMode={kenBurns}
        zoomIntensity={zoomIntensity}
        showScanline={true}
        scanlineColor="#FF5500"
        accentColor="#FF5500"
        telemetryColor="#00F0FF"
        tagText={dossierTag || `ANÁLISE DE SISTEMA // ${sceneId}`}
      />
    );
  }

  // 2. Cenas com Vídeo Real (Banco Central de Vídeos ou Firefly On-Demand)
  if (hasVideo) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#060709', overflow: 'hidden' }}>
        <OffthreadVideo
          src={staticFile(videoSrc)}
          volume={0}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity,
            filter
          }}
        />
      </AbsoluteFill>
    );
  }

  // 3. Fallback de contingência (apenas se não houver vídeo nem for dossiê)
  return (
    <AbsoluteFill style={{ backgroundColor: '#060709', overflow: 'hidden' }}>
      <CinematicParallaxMotion
        mode={kenBurns}
        durationInFrames={durationInFrames}
        zoomIntensity={zoomIntensity}
      >
        <img
          src={staticFile(resolvedImageSrc)}
          alt={sceneId}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity,
            filter
          }}
        />
      </CinematicParallaxMotion>
    </AbsoluteFill>
  );
};
