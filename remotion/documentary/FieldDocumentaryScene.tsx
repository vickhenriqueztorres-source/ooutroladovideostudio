import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile} from 'remotion';

export interface FieldDocumentarySceneProps {
  sceneId: string;
  mediaPath: string;
  durationInFrames: number;
  evidenceLabel?: string;
  accentColor?: string;
  telemetryColor?: string;
}

/** Temporal field footage is the scene. No synthetic camera move or decorative HUD. */
export const FieldDocumentaryScene: React.FC<FieldDocumentarySceneProps> = ({
  sceneId,
  mediaPath,
  evidenceLabel,
  accentColor = '#FF5500',
}) => {
  if (!mediaPath || !/\.mp4(?:$|\?)/i.test(mediaPath)) {
    throw new Error(`FIELD_DOCUMENTARY_TEMPORAL_VIDEO_REQUIRED:${sceneId}`);
  }

  return (
    <AbsoluteFill style={{backgroundColor: '#060709', overflow: 'hidden'}}>
      <OffthreadVideo
        src={staticFile(mediaPath)}
        muted
        style={{width: '100%', height: '100%', objectFit: 'cover'}}
      />
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(6,7,9,0.08), transparent 58%, rgba(6,7,9,0.22))',
          pointerEvents: 'none',
        }}
      />
      {evidenceLabel ? (
        <div
          style={{
            position: 'absolute', left: 72, top: 58, maxWidth: 420, paddingTop: 8,
            borderTop: `1px solid ${accentColor}`, color: '#F4F4F0',
            fontFamily: 'Inter, Arial, sans-serif', fontSize: 13, fontWeight: 600,
            letterSpacing: 0, textShadow: '0 2px 12px rgba(0,0,0,0.9)',
          }}
        >
          {evidenceLabel} // {sceneId}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
