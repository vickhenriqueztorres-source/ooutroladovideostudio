import scenesData from '../contracts/episodes/nota-100-reais.scenes.json';
import type { SceneVisualContract } from '../contracts/sceneVisualContract';
import type { RawSceneInput } from '../contracts/buildSceneContracts';
import {
  CalculatedTimeline,
  TimelineContractInput,
  parseAndCalculateTimeline
} from '../contracts/timelineContract';
import { MotionDirectorAgent } from '../pipeline/agents/motionDirectorAgent';
import audioTimingsData from './nota100AudioTimings.json';

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

export const EPISODE_NOTA_100_FPS = 30;

export function buildNota100Timeline(
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
    targetSeconds: r.targetSeconds || 12.0
  }));

  let accumulatedFrames = 0;
  const timeline: SceneTimelineItem[] = [];

  const chapterTitles = [
    'A ILUSÃO DO PAPEL',
    'A FORJA MECÂNICA',
    'A GRAVURA LÍQUIDA',
    'A FÍSICA DA TINTA',
    'O TRIBUNAL BANCÁRIO',
    'A MORTE E A CINZA'
  ];

  for (let i = 0; i < scenesToUse.length; i++) {
    const sc = scenesToUse[i];
    const timing = (audioTimingsData as Record<string, { sceneDuration: number }>)[sc.sceneId];
    // Sincronização Dinâmica: áudio real do ElevenLabs + 0.8s de respiro cinematográfico
    const durationSeconds = timing ? timing.sceneDuration : (sc.targetSeconds || 8.0);
    const durationFrames = Math.round(durationSeconds * EPISODE_NOTA_100_FPS);
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
      audioFile: `editorial/execution/${runId}/audio/${sc.sceneId}.mp3`,
      sfxFile: `editorial/execution/${runId}/sfx/${sc.sceneId}.mp3`,
      videoFile: `editorial/execution/${runId}/scenes/${sc.sceneId}/firefly_take.mp4`,
      motionMode: i % 2 === 0 ? 'slow_push_in' : 'cinematic_drift'
    });
  }

  return timeline;
}

const motionAgent = new MotionDirectorAgent();
const motionPackage = motionAgent.buildMotionPackage({
  episodeId: 'nota-100-reais',
  rawScenes: scenesData as any
});

const rawContractInput: TimelineContractInput = {
  episodeId: 'nota-100-reais',
  fps: EPISODE_NOTA_100_FPS,
  coldOpen: {
    sceneIds: ['N100_001', 'N100_002']
  },
  actBreaks: [5, 15, 25],
  hudWindows: motionPackage.hudWindows,
  audio: {
    musicBed: 'episodes/nota-100-reais/audio/music/bed.mp3',
    musicVolume: 0.22,
    voiceoverVolume: 1.0,
    sfxVolume: 0.45,
    ducking: true,
    duckedVolume: 0.12
  },
  scenes: buildNota100Timeline().map((sc) => {
    const assignment = motionPackage.sceneAssignments[sc.sceneId];
    const isDossier = sc.take_type === 'KEYFRAME_DOSSIER';
    return {
      id: sc.sceneId,
      name: sc.name,
      chapterTitle: sc.chapterTitle,
      component: assignment?.component || 'DynamicDocumentaryMedia',
      take_type: sc.take_type,
      allowed_sources: sc.allowed_sources,
      durationSeconds: sc.durationSeconds,
      visualSubject: sc.visualSubject,
      integratedText: sc.chapterTitle,
      callout: assignment?.callout,
      motionMode: assignment?.motionMode || sc.motionMode,
      camera: assignment?.camera || (isDossier ? 'drift' : 'pushIn'),
      transition: assignment?.transition || 'crossfade',
      voiceoverFile: `episodes/nota-100-reais/audio/narration/${sc.sceneId}.mp3`,
      mediaFile: `episodes/nota-100-reais/takes/${sc.sceneId}.mp4`,
      props: {
        ...(assignment?.props || {}),
        imageSrc: `episodes/nota-100-reais/images/${sc.sceneId}.png`,
        mediaPath: `episodes/nota-100-reais/takes/${sc.sceneId}.mp4`,
        isDossierTake: isDossier
      }
    };
  })
};

export const EPISODE_NOTA_100_CALCULATED_TIMELINE: CalculatedTimeline = parseAndCalculateTimeline(rawContractInput);
export const EPISODE_NOTA_100_TOTAL_SECONDS = EPISODE_NOTA_100_CALCULATED_TIMELINE.totalDurationSeconds;
export const EPISODE_NOTA_100_TOTAL_FRAMES = EPISODE_NOTA_100_CALCULATED_TIMELINE.totalDurationFrames;