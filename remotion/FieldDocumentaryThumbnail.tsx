import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';

export interface FieldDocumentaryThumbnailProps extends Record<string, unknown> {
  readonly baseImageSrc: string;
  readonly headlineLines: readonly string[];
  readonly accentLine?: number;
  readonly textSide?: 'LEFT' | 'RIGHT';
  readonly eyebrow?: string;
}

export const FieldDocumentaryThumbnail: React.FC<FieldDocumentaryThumbnailProps> = ({
  baseImageSrc,
  headlineLines,
  accentLine = headlineLines.length - 1,
  textSide = 'LEFT',
  eyebrow = 'O OUTRO LADO // DOCUMENTARIO',
}) => {
  const isLeft = textSide === 'LEFT';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#060709',
        color: '#f5f5f2',
        overflow: 'hidden',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      <Img
        src={staticFile(baseImageSrc)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'brightness(0.92) contrast(1.08) saturate(0.88)',
        }}
      />

      <AbsoluteFill
        style={{
          background: isLeft
            ? 'linear-gradient(90deg, rgba(6,7,9,0.94) 0%, rgba(6,7,9,0.79) 31%, rgba(6,7,9,0.18) 56%, rgba(6,7,9,0) 74%)'
            : 'linear-gradient(270deg, rgba(6,7,9,0.94) 0%, rgba(6,7,9,0.79) 31%, rgba(6,7,9,0.18) 56%, rgba(6,7,9,0) 74%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 170,
          left: isLeft ? 190 : undefined,
          right: isLeft ? undefined : 190,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          fontSize: 34,
          fontWeight: 800,
          letterSpacing: 0,
          textTransform: 'uppercase',
        }}
      >
        <div style={{width: 76, height: 8, backgroundColor: '#ff5500'}} />
        <span>{eyebrow}</span>
      </div>

      <div
        style={{
          position: 'absolute',
          left: isLeft ? 190 : undefined,
          right: isLeft ? undefined : 190,
          top: 400,
          bottom: 300,
          width: 1640,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: isLeft ? 'flex-start' : 'flex-end',
          textAlign: isLeft ? 'left' : 'right',
        }}
      >
        {headlineLines.map((line, index) => (
          <div
            key={`${line}-${index}`}
            style={{
              fontFamily: 'Impact, Arial Black, Arial, sans-serif',
              fontSize: headlineLines.length === 1 ? 330 : 300,
              lineHeight: 0.92,
              fontWeight: 900,
              letterSpacing: 0,
              textTransform: 'uppercase',
              color: index === accentLine ? '#ff5500' : '#f5f5f2',
              textShadow: '0 12px 36px rgba(0,0,0,0.72)',
              whiteSpace: 'nowrap',
            }}
          >
            {line}
          </div>
        ))}
        <div
          style={{
            width: 300,
            height: 10,
            marginTop: 58,
            backgroundColor: '#ff5500',
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 110,
          left: 190,
          right: 190,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: 0,
          textTransform: 'uppercase',
          color: 'rgba(245,245,242,0.86)',
        }}
      >
        <span>Investigar. Revelar. Compreender.</span>
        <span style={{color: '#ff5500'}}>Energia + Inteligencia Artificial</span>
      </div>
    </AbsoluteFill>
  );
};
