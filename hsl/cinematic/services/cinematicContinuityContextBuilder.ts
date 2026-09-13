import {
  CinematicContinuityContext,
  CinematicContinuitySceneView,
  CinematicEditorialSceneView,
  CinematicScenePlanV1
} from '../types/cinematicPlans';
import {CinematicValidationError} from '../validators/cinematicValidationError';
import {buildCinematicSequenceMemory} from './cinematicSequenceMemoryBuilder';
import {deriveSemanticFunction} from '../schemas/beatSchema';

export interface CinematicContinuitySceneSource {
  readonly editorialScene: Readonly<CinematicEditorialSceneView>;
  readonly provisionalPlan: Readonly<Pick<
    CinematicScenePlanV1,
    'scene_id' | 'beats' | 'direction' | 'shot' | 'camera'
  >>;
}

export function buildCinematicContinuitySceneViews(
  orderedSources: readonly CinematicContinuitySceneSource[]
): readonly CinematicContinuitySceneView[] {
  return orderedSources.map(({editorialScene, provisionalPlan}) => {
    if (editorialScene.scene_id !== provisionalPlan.scene_id) {
      throw new CinematicValidationError(
        'CINEMATIC_CONTINUITY_ORDER_INVALID',
        `${editorialScene.scene_id} != ${provisionalPlan.scene_id}`
      );
    }
    if (typeof editorialScene.visual_mode !== 'string' || !editorialScene.visual_mode.trim()) {
      throw new CinematicValidationError('CINEMATIC_VISUAL_MODE_REQUIRED', editorialScene.scene_id);
    }
    return {
      scene_id: provisionalPlan.scene_id,
      chapter_id: typeof editorialScene.chapter_id === 'string' ? editorialScene.chapter_id : null,
      narrative_function: typeof editorialScene.narrative_function === 'string'
        ? editorialScene.narrative_function
        : '',
      beat_semantics: provisionalPlan.beats.map((beat) => deriveSemanticFunction(beat.narrative_function) as any),
      narrative_intent: provisionalPlan.direction.narrative_intent || '',
      focus_target: provisionalPlan.direction.focus_target,
      shot: provisionalPlan.shot,
      camera: provisionalPlan.camera,
      visual_mode: editorialScene.visual_mode
    };
  });
}

export function buildCinematicContinuityContexts(
  episodeId: string,
  orderedScenes: readonly CinematicContinuitySceneView[]
): readonly CinematicContinuityContext[] {
  return orderedScenes.map((currentScene, currentIndex) => ({
    episodeId,
    scenes: orderedScenes,
    currentIndex,
    previousScenes: orderedScenes.slice(Math.max(0, currentIndex - 3), currentIndex),
    currentScene,
    nextScenes: orderedScenes.slice(currentIndex + 1, currentIndex + 3),
    recentHistory: buildCinematicSequenceMemory(orderedScenes, currentIndex)
  }));
}
