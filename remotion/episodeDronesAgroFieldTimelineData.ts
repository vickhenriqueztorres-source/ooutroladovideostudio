import {
  CalculatedTimeline,
  TimelineContractInput,
  parseAndCalculateTimeline,
} from '../contracts/timelineContract';
import {
  DRONES_AGRO_TIMELINE_CONTRACT,
  EPISODE_DRONES_AGRO_FPS,
} from './episodeDronesAgroTimelineData';

export function buildDronesAgroFieldTimelineContract(): TimelineContractInput {
  const contract: TimelineContractInput = {
    ...DRONES_AGRO_TIMELINE_CONTRACT,
    episodeId: 'drones-agro',
    motionLanguage: 'documentary-field-v4',
    fps: EPISODE_DRONES_AGRO_FPS,
    hudWindows: [],
    audio: {
      musicBed: 'episodes/drones-agro/audio/music/bed.mp3',
      musicVolume: 0.24,
      voiceoverVolume: 1.0,
      sfxVolume: 0.55,
      ducking: true,
      duckedVolume: 0.11,
    },
    scenes: DRONES_AGRO_TIMELINE_CONTRACT.scenes.map((scene, index) => {
      if (!scene.mediaFile) throw new Error(`DRONES_AGRO_TEMPORAL_TAKE_REQUIRED:${scene.id}`);
      const keepCallout = index % 4 === 2;
      return {
        ...scene,
        component: 'FieldDocumentaryScene',
        take_type: 'CINEMATIC_TAKE' as const,
        mediaFile: scene.mediaFile,
        camera: 'static' as const,
        transition: [5, 11, 16, 21].includes(index) ? 'dipToBlack' as const : 'cut' as const,
        callout: keepCallout && scene.callout
          ? {...scene.callout, startSeconds: 0.55, durationSeconds: 1.65, position: 'bottom_left' as const}
          : undefined,
        motionRecipes: [],
        props: {
          sceneId: scene.id,
          mediaPath: scene.mediaFile,
          durationInFrames: Math.round(scene.durationSeconds * EPISODE_DRONES_AGRO_FPS),
        },
      };
    }),
  };
  parseAndCalculateTimeline(contract);
  return contract;
}

export const DRONES_AGRO_FIELD_TIMELINE_CONTRACT: TimelineContractInput = buildDronesAgroFieldTimelineContract();
export const EPISODE_DRONES_AGRO_FIELD_CALCULATED_TIMELINE: CalculatedTimeline =
  parseAndCalculateTimeline(DRONES_AGRO_FIELD_TIMELINE_CONTRACT);
export const EPISODE_DRONES_AGRO_FIELD_TOTAL_FRAMES =
  EPISODE_DRONES_AGRO_FIELD_CALCULATED_TIMELINE.totalDurationFrames;
