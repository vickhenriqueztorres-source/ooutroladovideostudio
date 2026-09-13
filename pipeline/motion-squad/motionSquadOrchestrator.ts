import { ScriptPhysicsDeconstructor, SceneInput } from './scriptPhysicsDeconstructor';
import { Isometric3DArtDirector, MotionChoreography } from './isometric3DArtDirector';
import { RemotionMotionDeveloper } from './remotionMotionDeveloper';
import { MotionBlueprint } from '../../contracts/motionBlueprintContract';
import { Logger } from '../../event-hub/logger';

export interface SquadDevelopmentResult {
  sceneId: string;
  componentName: string;
  filePath: string;
  blueprint: MotionBlueprint;
  choreography: MotionChoreography;
}

export class MotionSquadOrchestrator {
  private static readonly NAME = 'MotionSquadOrchestrator';

  /**
   * Processa uma lista de cenas de um episódio, identifica cenas técnicas/esquemáticas
   * e desenvolve autonomamente os componentes de motion 3D necessários.
   */
  public static developMotionsForEpisode(
    episodeSlug: string,
    scenes: SceneInput[]
  ): Record<string, SquadDevelopmentResult> {
    Logger.info(
      this.NAME,
      `Iniciando Squad de Motion Graphics para o episódio '${episodeSlug}' (${scenes.length} cenas)...`
    );

    const developedScenes: Record<string, SquadDevelopmentResult> = {};

    for (const scene of scenes) {
      const text = `${scene.voiceover} ${scene.visualSubject || ''} ${scene.required_category || ''}`.toLowerCase();
      const isReveal = scene.canon_category === 'reveal' ||
        scene.take_type === 'KEYFRAME_DOSSIER' && (
          text.includes('corte') ||
          text.includes('fatiar') ||
          text.includes('volumétrico') ||
          text.includes('microscópio') ||
          text.includes('fadiga') ||
          text.includes('pressão') ||
          text.includes('densidade')
        );

      if (isReveal) {
        Logger.info(this.NAME, `Cena '${scene.sceneId}' qualificada para desenvolvimento de Motion 3D autônomo.`);

        // 1. Script & Physics Deconstruction
        const blueprint = ScriptPhysicsDeconstructor.deconstruct(scene, episodeSlug);

        // 2. 3D Isometric Art Direction
        const choreography = Isometric3DArtDirector.direct(blueprint);

        // 3. Remotion Motion Development & Registration
        const { filePath, componentName } = RemotionMotionDeveloper.developAndRegister(choreography);

        developedScenes[scene.sceneId] = {
          sceneId: scene.sceneId,
          componentName,
          filePath,
          blueprint,
          choreography
        };
      }
    }

    Logger.info(
      this.NAME,
      `Squad concluiu o desenvolvimento de ${Object.keys(developedScenes).length} componentes 3D para '${episodeSlug}'.`
    );

    return developedScenes;
  }
}
