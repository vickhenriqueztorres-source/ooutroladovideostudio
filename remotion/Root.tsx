import React from 'react';
import {Composition} from 'remotion';
import {HslEpisode} from './HslEpisode';
import {Episode01Pix} from './Episode01Pix';
import {Episode02Cabos} from './Episode02Cabos';
import {Episode04GpsTempo} from './Episode04GpsTempo';
import {Episode05RadarAsfalto, EPISODE05RADARASFALTO_TOTAL_FRAMES} from './Episode05RadarAsfalto';
import {EpisodeTest1Min} from './EpisodeTest1Min';
import {EPISODE_TEST_1MIN_TOTAL_FRAMES} from './episodeTest1MinTimelineData';
import {EpisodeGasolina} from './EpisodeGasolina';
import {EPISODE_GASOLINA_TOTAL_FRAMES} from './episodeGasolinaTimelineData';
import {EpisodeGps} from './EpisodeGps';
import {EPISODE_GPS_TOTAL_FRAMES} from './episodeGpsTimelineData';
import {EpisodeDronesAgro} from './EpisodeDronesAgro';
import {EpisodeDronesAgroFieldCut} from './EpisodeDronesAgroFieldCut';
import {EPISODE_DRONES_AGRO_FIELD_TOTAL_FRAMES} from './episodeDronesAgroFieldTimelineData';
import {EpisodeDronesAgroNoturnos} from './EpisodeDronesAgroNoturnos';
import {EPISODE_DRONES_AGRO_NOTURNOS_TOTAL_FRAMES} from './episodeDronesAgroNoturnosTimelineData';
import {EpisodeEnergiaIaDataCenters} from './EpisodeEnergiaIaDataCenters';
import {EPISODE_ENERGIA_IA_TOTAL_FRAMES} from './episodeEnergiaIaDataCentersTimelineData';
import {EpisodeNota100} from './EpisodeNota100';
import {EPISODE_NOTA_100_TOTAL_FRAMES} from './episodeNota100TimelineData';
import {EpisodeRaioX} from './EpisodeRaioX';
import {EPISODE_RAIO_X_TOTAL_FRAMES} from './episodeRaioXTimelineData';
import {EpisodeSalaCofre} from './EpisodeSalaCofre';
import {EPISODE_SALA_COFRE_TOTAL_FRAMES} from './episodeSalaCofreTimelineData';
import {EpisodeLinhaSegura} from './EpisodeLinhaSegura';
import {EPISODE_LINHA_SEGURA_TOTAL_FRAMES} from './episodeLinhaSeguraTimelineData';
import {EpisodeRedeEletrica60hz} from './EpisodeRedeEletrica60hz';
import {EPISODE_REDE_ELETRICA_TOTAL_FRAMES} from './episodeRedeEletrica60hzTimelineData';
import {EpisodeDiarioOficial} from './EpisodeDiarioOficial';
import {EPISODE_DIARIO_OFICIAL_TOTAL_FRAMES} from './episodeDiarioOficialTimelineData';
import {EpisodeEncomendaChina} from './EpisodeEncomendaChina';
import {EPISODE_ENCOMENDA_CHINA_TOTAL_FRAMES} from './episodeEncomendaChinaTimelineData';
import {HslThumbnail, HslThumbnailProps} from './HslThumbnail';
import {
  FieldDocumentaryThumbnail,
  FieldDocumentaryThumbnailProps,
} from './FieldDocumentaryThumbnail';
import {HslEpisodeRenderProps} from './types';

import {HSL_FPS, HSL_VIDEO_RESOLUTION} from '../spec/hsl-spec';
import {EPISODE_01_TIMELINE_TOTAL_FRAMES} from './episode01TimelineData';
import {EPISODE_02_TOTAL_FRAMES} from './episode02TimelineData';
import {EPISODE_04_TOTAL_FRAMES} from './episode04TimelineData';
import {EPISODE_05_TOTAL_FRAMES} from './episode05TimelineData';
import {MilkProceduralTake, MilkProceduralTakeProps} from './MilkProceduralTake';
import {EpisodeMilk} from './EpisodeMilk';
import {EPISODE_MILK_TOTAL_FRAMES, MILK_FPS} from './episodeMilkTimelineData';
import {
  DOCUMENTARY_MOTION_SHOWCASE_FRAMES,
  DocumentaryMotionLibraryShowcase,
} from './motion-documentary';

const defaults: HslEpisodeRenderProps = {
  title: 'O Outro Lado', fps: HSL_FPS, width: HSL_VIDEO_RESOLUTION.WIDTH, height: HSL_VIDEO_RESOLUTION.HEIGHT, totalDurationInFrames: HSL_FPS,
  scenes: [{sceneId: 'OUTRO_LADO_DEFAULT', shotId: 'OUTRO_LADO_DEFAULT_V01', variant: 'ESTABLISH', chapterTitle: 'O Outro Lado', narrativeFunction: 'title', visualMode: 'typography', visualSubject: 'O Outro Lado', durationInFrames: HSL_FPS, aiDisclosureRequired: false, transition: 'CUT'}]
};

const thumbnailDefaults: HslThumbnailProps = {
  baseImageSrc: 'identity/logo.png',
  headlineLines: ['O OUTRO', 'LADO'],
  textSide: 'LEFT',
  role: 'MECHANISM'
};

const fieldThumbnailDefaults: FieldDocumentaryThumbnailProps = {
  baseImageSrc: 'identity/logo.png',
  headlineLines: ['O OUTRO', 'LADO'],
  textSide: 'LEFT',
};

const milkProceduralDefaults: MilkProceduralTakeProps = {
  imageSrc: 'identity/logo.png',
  sceneId: 'LEITE_PREVIEW',
  chapterTitle: 'CADEIA DO LEITE',
  mode: 'EVIDENCE',
};

export const RemotionRoot: React.FC = () => <>
  <Composition
    id="EpisodeMilk"
    component={EpisodeMilk}
    durationInFrames={EPISODE_MILK_TOTAL_FRAMES}
    fps={MILK_FPS}
    width={1920}
    height={1080}
  />
  <Composition
    id="MilkProceduralTake"
    component={MilkProceduralTake}
    durationInFrames={120}
    fps={24}
    width={1920}
    height={1080}
    defaultProps={milkProceduralDefaults}
  />
  <Composition
    id="DocumentaryMotionLibrary"
    component={DocumentaryMotionLibraryShowcase}
    durationInFrames={DOCUMENTARY_MOTION_SHOWCASE_FRAMES}
    fps={30}
    width={HSL_VIDEO_RESOLUTION.WIDTH}
    height={HSL_VIDEO_RESOLUTION.HEIGHT}
  />
  <Composition
    id="Episode01Pix"
    component={Episode01Pix}
    durationInFrames={EPISODE_01_TIMELINE_TOTAL_FRAMES}
    fps={HSL_FPS}
    width={HSL_VIDEO_RESOLUTION.WIDTH}
    height={HSL_VIDEO_RESOLUTION.HEIGHT}
  />
  <Composition
    id="Episode02Cabos"
    component={Episode02Cabos}
    durationInFrames={EPISODE_02_TOTAL_FRAMES}
    fps={HSL_FPS}
    width={HSL_VIDEO_RESOLUTION.WIDTH}
    height={HSL_VIDEO_RESOLUTION.HEIGHT}
  />
  <Composition
    id="Episode04GpsTempo"
    component={Episode04GpsTempo}
    durationInFrames={EPISODE_04_TOTAL_FRAMES}
    fps={HSL_FPS}
    width={HSL_VIDEO_RESOLUTION.WIDTH}
    height={HSL_VIDEO_RESOLUTION.HEIGHT}
  />
  <Composition
    id="Episode05RadarAsfalto"
    component={Episode05RadarAsfalto}
    durationInFrames={EPISODE05RADARASFALTO_TOTAL_FRAMES}
    fps={HSL_FPS}
    width={HSL_VIDEO_RESOLUTION.WIDTH}
    height={HSL_VIDEO_RESOLUTION.HEIGHT}
  />
  <Composition
    id="EpisodeTest1Min"
    component={EpisodeTest1Min}
    durationInFrames={EPISODE_TEST_1MIN_TOTAL_FRAMES}
    fps={HSL_FPS}
    width={HSL_VIDEO_RESOLUTION.WIDTH}
    height={HSL_VIDEO_RESOLUTION.HEIGHT}
  />
  <Composition
    id="EpisodeGasolina"
    component={EpisodeGasolina}
    durationInFrames={EPISODE_GASOLINA_TOTAL_FRAMES}
    fps={HSL_FPS}
    width={HSL_VIDEO_RESOLUTION.WIDTH}
    height={HSL_VIDEO_RESOLUTION.HEIGHT}
  />
  <Composition
    id="EpisodeGps"
    component={EpisodeGps}
    durationInFrames={EPISODE_GPS_TOTAL_FRAMES}
    fps={HSL_FPS}
    width={HSL_VIDEO_RESOLUTION.WIDTH}
    height={HSL_VIDEO_RESOLUTION.HEIGHT}
  />
  <Composition
    id="EpisodeDronesAgro"
    component={EpisodeDronesAgro}
    durationInFrames={EPISODE_DRONES_AGRO_FIELD_TOTAL_FRAMES}
    fps={HSL_FPS}
    width={HSL_VIDEO_RESOLUTION.WIDTH}
    height={HSL_VIDEO_RESOLUTION.HEIGHT}
  />
  <Composition
    id="EpisodeDronesAgroFieldCut"
    component={EpisodeDronesAgroFieldCut}
    durationInFrames={EPISODE_DRONES_AGRO_FIELD_TOTAL_FRAMES}
    fps={HSL_FPS}
    width={HSL_VIDEO_RESOLUTION.WIDTH}
    height={HSL_VIDEO_RESOLUTION.HEIGHT}
  />
  <Composition
    id="EpisodeDronesAgroNoturnos"
    component={EpisodeDronesAgroNoturnos}
    durationInFrames={EPISODE_DRONES_AGRO_NOTURNOS_TOTAL_FRAMES}
    fps={HSL_FPS}
    width={HSL_VIDEO_RESOLUTION.WIDTH}
    height={HSL_VIDEO_RESOLUTION.HEIGHT}
  />
  <Composition
    id="EpisodeEnergiaIaDataCenters"
    component={EpisodeEnergiaIaDataCenters}
    durationInFrames={EPISODE_ENERGIA_IA_TOTAL_FRAMES}
    fps={HSL_FPS}
    width={HSL_VIDEO_RESOLUTION.WIDTH}
    height={HSL_VIDEO_RESOLUTION.HEIGHT}
  />
  <Composition
    id="EpisodeNota100"
    component={EpisodeNota100}
    durationInFrames={EPISODE_NOTA_100_TOTAL_FRAMES}
    fps={30}
    width={1920}
    height={1080}
  />
  <Composition
    id="EpisodeRaioX"
    component={EpisodeRaioX}
    durationInFrames={EPISODE_RAIO_X_TOTAL_FRAMES}
    fps={30}
    width={1920}
    height={1080}
  />
  <Composition
    id="EpisodeSalaCofre"
    component={EpisodeSalaCofre}
    durationInFrames={EPISODE_SALA_COFRE_TOTAL_FRAMES}
    fps={30}
    width={1920}
    height={1080}
  />
  <Composition
    id="EpisodeLinhaSegura"
    component={EpisodeLinhaSegura}
    durationInFrames={EPISODE_LINHA_SEGURA_TOTAL_FRAMES}
    fps={30}
    width={1920}
    height={1080}
  />
  <Composition
    id="EpisodeRedeEletrica"
    component={EpisodeRedeEletrica60hz}
    durationInFrames={EPISODE_REDE_ELETRICA_TOTAL_FRAMES}
    fps={30}
    width={1920}
    height={1080}
  />
  <Composition
    id="EpisodeDiarioOficial"
    component={EpisodeDiarioOficial}
    durationInFrames={EPISODE_DIARIO_OFICIAL_TOTAL_FRAMES}
    fps={30}
    width={1920}
    height={1080}
  />
  <Composition
    id="EpisodeEncomendaChina"
    component={EpisodeEncomendaChina}
    durationInFrames={EPISODE_ENCOMENDA_CHINA_TOTAL_FRAMES}
    fps={30}
    width={1920}
    height={1080}
  />
  <Composition
    id="HslEpisode"
    component={HslEpisode}
    durationInFrames={defaults.totalDurationInFrames}
    fps={defaults.fps}
    width={defaults.width}
    height={defaults.height}
    defaultProps={defaults}
    calculateMetadata={({props}) => ({
      durationInFrames: props.totalDurationInFrames,
      fps: props.fps,
      width: props.width,
      height: props.height,
      props
    })}
  />
  <Composition
    id="HslThumbnail"
    component={HslThumbnail}
    durationInFrames={1}
    fps={30}
    width={3840}
    height={2160}
    defaultProps={thumbnailDefaults}
  />
  <Composition
    id="FieldDocumentaryThumbnail"
    component={FieldDocumentaryThumbnail}
    durationInFrames={1}
    fps={30}
    width={3840}
    height={2160}
    defaultProps={fieldThumbnailDefaults}
  />
  </>;
