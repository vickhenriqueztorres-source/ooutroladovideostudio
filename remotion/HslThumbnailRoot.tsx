import React from 'react';
import { Composition } from 'remotion';
import { HslThumbnail, HslThumbnailProps } from './HslThumbnail';

export const HslThumbnailRoot: React.FC = () => {
  return (
    <Composition
      id="HslThumbnail"
      component={HslThumbnail as unknown as React.FC<Record<string, unknown>>}
      durationInFrames={1}
      fps={30}
      width={3840}
      height={2160}
      defaultProps={{
        baseImageSrc: 'base_variant_a_rx012.png',
        headlineLines: ['NÃO ADIANTA', 'ESCONDER.'],
        subheadline: 'O QUE O FISCAL VÊ EM 2 SEGUNDOS NA ESTEIRA',
        textSide: 'LEFT',
        accentColor: '#FF5500',
        telemetryColor: '#00F0FF',
        mode: 'thumbnail',
        hideDecorativeHud: true
      } as HslThumbnailProps}
    />
  );
};
