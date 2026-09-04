import scenesJson from '../contracts/episodes/leite-cadeia-frio.scenes.json';
import {
  CalculatedTimeline,
  TimelineContractInput,
  parseAndCalculateTimeline,
} from '../contracts/timelineContract';

type MilkScene = {
  sceneId: string;
  chapterId: string;
  chapterTitle: string;
  voiceover: string;
  visualSubject: string;
  visual_asset_class: 'VIDEO' | 'REALISTIC_IMAGE' | 'MOTION_GRAPHICS' | 'MOTION_IMAGE';
  canon_category: 'matter' | 'evidence' | 'maps' | 'reveal';
};

export const MILK_EPISODE_ID = 'leite-cadeia-frio';
export const MILK_RUN_ID = 'LEITE-VISUALS-20260901';
export const MILK_FPS = 24;
export const MILK_TARGET_FRAMES = 360 * MILK_FPS;

const scenes = scenesJson as MilkScene[];
const totalWords = scenes.reduce(
  (sum, scene) => sum + scene.voiceover.trim().split(/\s+/).filter(Boolean).length,
  0,
);
const spokenSecondsAt146Wpm = (totalWords * 60) / 146;
const pauseSecondsPerScene = (360 - spokenSecondsAt146Wpm) / scenes.length;
const sceneFrames = scenes.map((scene) => {
  const words = scene.voiceover.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(((words * 60) / 146 + pauseSecondsPerScene) * MILK_FPS);
});
sceneFrames[sceneFrames.length - 1] += MILK_TARGET_FRAMES - sceneFrames.reduce((sum, frames) => sum + frames, 0);

const chapterStartIndexes = scenes
  .map((scene, index) => index === 0 || scene.chapterId !== scenes[index - 1].chapterId ? index : -1)
  .filter((index) => index >= 0);
const chapterStartSet = new Set(chapterStartIndexes);
const actBreaks = [8, 16, 25, 34];

export function buildMilkTimelineContract(): TimelineContractInput {
  const publicBase = `editorial/execution/${MILK_RUN_ID}`;
  const timeline: TimelineContractInput = {
    episodeId: MILK_EPISODE_ID,
    motionLanguage: 'documentary-field-v4',
    fps: MILK_FPS,
    actBreaks,
    coldOpen: {sceneIds: ['LEITE_001', 'LEITE_002']},
    hudWindows: [],
    audio: {
      musicBed: `${publicBase}/audio/music/bed.mp3`,
      musicVolume: 0.2,
      voiceoverVolume: 1,
      sfxVolume: 0.46,
      ducking: true,
      duckedVolume: 0.09,
      roomTone: `${publicBase}/audio/room-tone/bed.mp3`,
      sfxBed: `${publicBase}/audio/sfx/bed.mp3`,
    },
    scenes: scenes.map((scene, index) => {
      const imageSrc = `${publicBase}/scenes/${scene.sceneId}/firefly_start_frame.png`;
      const isVideo = scene.visual_asset_class === 'VIDEO';
      const mediaPath = isVideo
        ? `${publicBase}/scenes/${scene.sceneId}/approved_bank_take.mp4`
        : imageSrc;
      const isChapterStart = chapterStartSet.has(index);
      const showChapterCallout = index === 2 || (isChapterStart && index > 0);
      const useCrossfade = !isChapterStart && index % 8 === 6;
      return {
        id: scene.sceneId,
        name: scene.visualSubject,
        chapterId: scene.chapterId,
        chapterTitle: scene.chapterTitle,
        component: 'MilkDocumentaryScene',
        durationSeconds: sceneFrames[index] / MILK_FPS,
        transition: isChapterStart && index > 0 ? 'dipToBlack' : useCrossfade ? 'crossfade' : 'cut',
        camera: 'static',
        take_type: isVideo ? 'CINEMATIC_TAKE' : 'KEYFRAME_DOSSIER',
        voiceoverFile: `${publicBase}/audio/narration/${scene.sceneId}.mp3`,
        voiceoverText: scene.voiceover,
        mediaFile: mediaPath,
        visualSubject: scene.visualSubject,
        callout: showChapterCallout
          ? {
              categoryText: scene.chapterId,
              mainText: scene.chapterTitle,
              subText: 'Cadeia do leite',
              position: 'bottom_left',
              startSeconds: 0.55,
              durationSeconds: 1.7,
            }
          : undefined,
        motionRecipes: [],
        props: {
          imageSrc,
          mediaPath: isVideo ? mediaPath : undefined,
          visualAssetClass: scene.visual_asset_class,
          canonCategory: scene.canon_category,
          sourceDurationSeconds: sceneFrames[index] / MILK_FPS,
          durationInFrames: sceneFrames[index],
        },
      };
    }),
  };
  parseAndCalculateTimeline(timeline);
  return timeline;
}

export const EPISODE_MILK_TIMELINE_CONTRACT = buildMilkTimelineContract();
export const EPISODE_MILK_CALCULATED_TIMELINE: CalculatedTimeline =
  parseAndCalculateTimeline(EPISODE_MILK_TIMELINE_CONTRACT);
export const EPISODE_MILK_TOTAL_FRAMES = EPISODE_MILK_CALCULATED_TIMELINE.totalDurationFrames;
