import scenesData from '../contracts/episodes/raio-x-aeroporto.scenes.json';
import type { SceneVisualContract } from '../contracts/sceneVisualContract';
import type { RawSceneInput } from '../contracts/buildSceneContracts';
import {
  CalculatedTimeline,
  TimelineContractInput,
  parseAndCalculateTimeline
} from '../contracts/timelineContract';
import { MotionDirectorAgent } from '../pipeline/agents/motionDirectorAgent';
import audioTimingsData from './raioXAudioTimings.json';

export interface SceneTimelineItem {
  sceneId: string;
  order: number;
  chapterId: string;
  chapterTitle: string;
  name: string;
  voiceover: string;
  visualSubject: string;
  take_type: 'KEYFRAME_DOSSIER' | 'CINEMATIC_TAKE';
  allowed_sources: Array<'firefly' | 'bank' | 'dossier'>;
  durationSeconds: number;
  durationFrames: number;
  startFrame: number;
  endFrame: number;
  audioFile: string;
  sfxFile: string;
  videoFile: string;
  motionMode?: 'slow_push_in' | 'crash_push_in' | 'dramatic_pull_out' | 'pan_right' | 'pan_left' | 'cinematic_drift';
}

export const EPISODE_RAIO_X_FPS = 30;

export function buildRaioXTimeline(
  sceneContracts?: SceneVisualContract[],
  runId: string = 'latest'
): SceneTimelineItem[] {
  const raw: RawSceneInput[] = scenesData as RawSceneInput[];
  const scenesToUse = raw.map((r) => ({
    sceneId: r.sceneId,
    voiceover: r.voiceover,
    visualSubject: r.visualSubject || '',
    take_type: (r.take_type === 'KEYFRAME_DOSSIER' ? 'KEYFRAME_DOSSIER' : 'CINEMATIC_TAKE') as 'KEYFRAME_DOSSIER' | 'CINEMATIC_TAKE',
    allowed_sources: r.take_type === 'KEYFRAME_DOSSIER' ? (['dossier'] as Array<'firefly' | 'bank' | 'dossier'>) : (['firefly', 'bank'] as Array<'firefly' | 'bank' | 'dossier'>),
    targetSeconds: r.targetSeconds || 10.0
  }));

  let accumulatedFrames = 0;
  const timeline: SceneTimelineItem[] = [];

  const chapterTitles = [
    'A FALSA PRIVACIDADE',
    'A FÍSICA DA DUPLA ENERGIA',
    'O CÓDIGO DO NÚMERO ATÔMICO',
    'A ILUSÃO DO CHUMBO',
    'A TOMOGRAFIA TRIDIMENSIONAL',
    'O VEREDITO FORENSE'
  ];

  for (let i = 0; i < scenesToUse.length; i++) {
    const sc = scenesToUse[i];
    const timing = (audioTimingsData as Record<string, { sceneDuration: number }>)[sc.sceneId];
    // Sincronização Dinâmica: áudio real do ElevenLabs + 0.8s de respiro cinematográfico
    const durationSeconds = timing ? timing.sceneDuration : (sc.targetSeconds || 8.0);
    const durationFrames = Math.round(durationSeconds * EPISODE_RAIO_X_FPS);
    const startFrame = accumulatedFrames;
    const endFrame = startFrame + durationFrames;
    accumulatedFrames = endFrame;

    const chapterNum = Math.min(Math.floor(i / 5) + 1, 6);
    const chapterTitle = chapterTitles[chapterNum - 1];

    timeline.push({
      sceneId: sc.sceneId,
      order: i + 1,
      chapterId: `ATO_${chapterNum}`,
      chapterTitle,
      name: `Cena ${i + 1} - ${sc.sceneId}`,
      voiceover: sc.voiceover,
      visualSubject: sc.visualSubject,
      take_type: sc.take_type,
      allowed_sources: sc.allowed_sources,
      durationSeconds,
      durationFrames,
      startFrame,
      endFrame,
      audioFile: `episodes/raio-x-aeroporto/audio/narration/${sc.sceneId}.mp3`,
      sfxFile: `editorial/execution/${runId}/sfx/${sc.sceneId}.mp3`,
      videoFile: `editorial/execution/${runId}/scenes/${sc.sceneId}/firefly_take.mp4`,
      motionMode: i % 2 === 0 ? 'slow_push_in' : 'cinematic_drift'
    });
  }

  return timeline;
}

const motionAgent = new MotionDirectorAgent();
const motionPackage = motionAgent.buildMotionPackage({
  episodeId: 'raio-x-aeroporto',
  rawScenes: scenesData as any,
  enableAutonomous3DSquad: false
});

const SPECIALIZED_3D_SCENES: Record<
  string,
  { component: string; headerTag: string; title: string; subtitle: string }
> = {
  RX_005: {
    component: 'RaioxaeroportoVolumetricCutawayRX005Scene',
    headerTag: 'RAIO-X 3D // ESTEIRA & SCANNER',
    title: 'CORTE VOLUMÉTRICO DA ESTEIRA // RX_005',
    subtitle: 'DETECTOR DE DUPLA ENERGIA (ALTA E BAIXA PENETRAÇÃO)'
  },
  RX_009: {
    component: 'RaioxaeroportoVolumetricCutawayRX009Scene',
    headerTag: 'RAIO-X 3D // ESPECTROMETRIA',
    title: 'ESPECTROMETRIA DE ABSORÇÃO // RX_009',
    subtitle: 'FÓTONS DE 80 KEV E 160 KEV: DECOMPOSIÇÃO POR DENSIDADE'
  },
  RX_015: {
    component: 'RaioxaeroportoVolumetricCutawayRX015Scene',
    headerTag: 'RAIO-X 3D // NÚMERO ATÔMICO EFETIVO',
    title: 'ESCALA ATÔMICA ZEFF // RX_015',
    subtitle: 'DISCRIMINAÇÃO CROMÁTICA: LARANJA, VERDE E AZUL'
  },
  RX_016: {
    component: 'RaioxaeroportoVolumetricCutawayRX016Scene',
    headerTag: 'RAIO-X 3D // MATRIZ CROMÁTICA FORENSE',
    title: 'IDENTIFICAÇÃO DE ELEMENTOS // RX_016',
    subtitle: 'ORGÂNICOS (Z<10), VIDRO/ALUMÍNIO (10<Z<29), METAIS PESADOS (Z>29)'
  },
  RX_026: {
    component: 'RaioxaeroportoTechnical3DRX026Scene',
    headerTag: 'RAIO-X 3D // TOMOGRAFIA HELICOIDAL',
    title: 'ESCANEAMENTO HELICOIDAL 360° // RX_026',
    subtitle: 'VARREDURA COMPUTADORIZADA MULTI-ÂNGULO EM ALTA VELOCIDADE'
  },
  RX_027: {
    component: 'RaioxaeroportoVolumetricCutawayRX027Scene',
    headerTag: 'RAIO-X 3D // FATIAMENTO TOMOGRÁFICO',
    title: 'FATIAMENTO VOLUMÉTRICO VOXEL A VOXEL // RX_027',
    subtitle: 'ELIMINAÇÃO DE PONTOS CEGOS E SOBREPOSIÇÃO DE OBJETOS'
  },
  RX_028: {
    component: 'RaioxaeroportoVolumetricCutawayRX028Scene',
    headerTag: 'RAIO-X 3D // ALERTA E DOSSIÊ AUTOMATIZADO',
    title: 'SISTEMA FORENSE DE ALERTA // RX_028',
    subtitle: 'DETECÇÃO AUTOMÁTICA DE AMEAÇAS E MATERIAIS ILÍCITOS'
  }
};

const rawContractInput: TimelineContractInput = {
  episodeId: 'raio-x-aeroporto',
  fps: EPISODE_RAIO_X_FPS,
  coldOpen: {
    sceneIds: ['RX_001', 'RX_002']
  },
  actBreaks: [5, 15, 25],
  hudWindows: motionPackage.hudWindows,
  audio: {
    musicBed: 'episodes/raio-x-aeroporto/audio/music/emotional_decisions.mp3',
    musicVolume: 0.22,
    voiceoverVolume: 1.0,
    sfxVolume: 0.45,
    ducking: true,
    duckedVolume: 0.12
  },
  scenes: buildRaioXTimeline().map((sc) => {
    const specialized = SPECIALIZED_3D_SCENES[sc.sceneId];
    const assignment = motionPackage.sceneAssignments[sc.sceneId];
    const isDossier = sc.take_type === 'KEYFRAME_DOSSIER';
    const componentName = specialized?.component || assignment?.component || 'DynamicDocumentaryMedia';

    return {
      id: sc.sceneId,
      name: sc.name,
      chapterTitle: sc.chapterTitle,
      component: componentName,
      take_type: sc.take_type,
      allowed_sources: sc.allowed_sources,
      durationSeconds: sc.durationSeconds,
      visualSubject: sc.visualSubject,
      integratedText: sc.chapterTitle,
      callout: assignment?.callout,
      motionMode: assignment?.motionMode || sc.motionMode,
      camera: specialized ? 'static' : (assignment?.camera || (isDossier ? 'drift' : 'pushIn')),
      transition: assignment?.transition || 'crossfade',
      voiceoverFile: `episodes/raio-x-aeroporto/audio/narration/${sc.sceneId}.mp3`,
      mediaFile: `episodes/raio-x-aeroporto/takes/${sc.sceneId}.mp4`,
      props: {
        ...(assignment?.props || {}),
        ...(specialized
          ? {
              headerTag: specialized.headerTag,
              title: specialized.title,
              subtitle: specialized.subtitle,
              accentColor: '#FF5500',
              telemetryColor: '#00F0FF',
              durationInFrames: sc.durationFrames
            }
          : {}),
        imageSrc: `episodes/raio-x-aeroporto/images/${sc.sceneId}.png`,
        mediaPath: `episodes/raio-x-aeroporto/takes/${sc.sceneId}.mp4`,
        isDossierTake: isDossier
      }
    };
  })
};

export const EPISODE_RAIO_X_CALCULATED_TIMELINE: CalculatedTimeline = parseAndCalculateTimeline(rawContractInput);
export const EPISODE_RAIO_X_TOTAL_SECONDS = EPISODE_RAIO_X_CALCULATED_TIMELINE.totalDurationSeconds;
export const EPISODE_RAIO_X_TOTAL_FRAMES = EPISODE_RAIO_X_CALCULATED_TIMELINE.totalDurationFrames;
