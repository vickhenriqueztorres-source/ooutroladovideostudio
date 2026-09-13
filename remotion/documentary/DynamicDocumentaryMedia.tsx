import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame } from 'remotion';
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
  hideEditorialOverlay?: boolean;
  component?: string;
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
  dossierTag,
  hideEditorialOverlay = false,
  component
}) => {
  const frame = useCurrentFrame();
  const mediaInfo = availableMedia[sceneId];
  const hasExplicitVideo = Boolean(mediaPath);
  const isDossier = !hasExplicitVideo && (isDossierTake || mediaInfo?.isDossier === true);
  const hasVideo = hasExplicitVideo || (!isDossier && Boolean(mediaInfo?.hasVideo));
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
    : sceneId.startsWith('RX')
    ? 'raio-x-aeroporto'
    : sceneId.startsWith('SC_') || sceneId.startsWith('LS')
    ? 'linha-segura-presidencial'
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

  // Se estiver sob outro HUD dedicado, silencia a telemetria para não poluir o quadro
  const isUnderActiveHud = Boolean(
    hideEditorialOverlay ||
    (component && component !== 'DynamicDocumentaryMedia')
  );

  // 2. Cenas com Vídeo Real (Banco Central de Vídeos ou Firefly On-Demand)
  if (hasVideo) {
    const sec = Math.floor(frame / 30).toString().padStart(2, '0');
    const f = (frame % 30).toString().padStart(2, '0');

    return (
      <AbsoluteFill style={{ backgroundColor: '#060709', overflow: 'hidden' }}>
        {/* Imagem estática idêntica de fundo como garantia contra congelamento ou atraso de codec */}
        <img
          src={staticFile(resolvedImageSrc)}
          alt={sceneId}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity,
            filter
          }}
        />
        <OffthreadVideo
          src={staticFile(videoSrc)}
          volume={0}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity,
            filter
          }}
        />

        {/* Camada Editorial Sutil de Telemetria de Campo (Documentário Investigativo) */}
        {!isUnderActiveHud && (
          <AbsoluteFill style={{ pointerEvents: 'none' }}>
            {/* Retículos de canto ótico de campo */}
            <div style={{ position: 'absolute', top: 24, left: 24, width: 10, height: 10, borderTop: '1px solid rgba(138, 141, 159, 0.35)', borderLeft: '1px solid rgba(138, 141, 159, 0.35)' }} />
            <div style={{ position: 'absolute', top: 24, right: 24, width: 10, height: 10, borderTop: '1px solid rgba(138, 141, 159, 0.35)', borderRight: '1px solid rgba(138, 141, 159, 0.35)' }} />
            <div style={{ position: 'absolute', bottom: 24, left: 24, width: 10, height: 10, borderBottom: '1px solid rgba(138, 141, 159, 0.35)', borderLeft: '1px solid rgba(138, 141, 159, 0.35)' }} />
            <div style={{ position: 'absolute', bottom: 24, right: 24, width: 10, height: 10, borderBottom: '1px solid rgba(138, 141, 159, 0.35)', borderRight: '1px solid rgba(138, 141, 159, 0.35)' }} />

            {/* Tag de Registro Superior Esquerdo */}
            <div
              style={{
                position: 'absolute',
                top: 32,
                left: 44,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 10px',
                backgroundColor: 'rgba(6, 7, 9, 0.70)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(4px)',
                borderRadius: 2,
                fontFamily: 'JetBrains Mono, Courier, monospace',
                fontSize: 10,
                letterSpacing: '0.12em',
                color: '#8A8D9F',
                textTransform: 'uppercase'
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  backgroundColor: '#00F0FF',
                  boxShadow: '0 0 6px #00F0FF',
                  display: 'inline-block'
                }}
              />
              <span>REGISTRO DE CAMPO // {sceneId}</span>
            </div>

            {/* Telemetria e Timecode Inferior Direito */}
            <div
              style={{
                position: 'absolute',
                bottom: 32,
                right: 44,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '4px 10px',
                backgroundColor: 'rgba(6, 7, 9, 0.70)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(4px)',
                borderRadius: 2,
                fontFamily: 'JetBrains Mono, Courier, monospace',
                fontSize: 10,
                letterSpacing: '0.14em',
                color: '#8A8D9F'
              }}
            >
              <span>AUDIT [24 FPS]</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>|</span>
              <span>TC 00:{sec}:{f}</span>
            </div>
          </AbsoluteFill>
        )}
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
