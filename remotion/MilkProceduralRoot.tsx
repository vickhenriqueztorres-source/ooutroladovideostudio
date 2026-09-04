import React from 'react';
import {Composition} from 'remotion';
import {MilkProceduralTake, MilkProceduralTakeProps} from './MilkProceduralTake';

const defaults: MilkProceduralTakeProps = {
  imageSrc: 'identity/logo.png',
  sceneId: 'LEITE_PREVIEW',
  chapterTitle: 'CADEIA DO LEITE',
  mode: 'EVIDENCE',
};

export const MilkProceduralRoot: React.FC = () => (
  <Composition
    id="MilkProceduralTake"
    component={MilkProceduralTake}
    durationInFrames={120}
    fps={24}
    width={1920}
    height={1080}
    defaultProps={defaults}
  />
);
