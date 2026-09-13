import { MotionBlueprint } from '../../contracts/motionBlueprintContract';
import { Logger } from '../../event-hub/logger';

export interface MotionChoreography {
  blueprint: MotionBlueprint;
  viewport: {
    rotateX: number;
    rotateZ: number;
    scale: number;
    perspective: number;
  };
  timing: {
    entranceDurationFrames: number;
    laserSliceStartFrame: number;
    laserSliceDurationFrames: number;
    revealHoldFrames: number;
  };
  lighting: {
    ambientColor: string;
    keyLightColor: string;
    criticalGlow: string;
    telemetryGlow: string;
  };
  hudProps: {
    headerTag: string;
    title: string;
    subtitle: string;
    metricCards: Array<{
      label: string;
      value: string;
      unit: string;
      standard?: string;
    }>;
  };
}

export class Isometric3DArtDirector {
  private static readonly NAME = 'Isometric3DArtDirector';

  /**
   * Define a direção de arte tridimensional, cinematografia isométrica
   * e iluminação em chiaroscuro conforme as regras invioláveis de "O Outro Lado".
   */
  public static direct(blueprint: MotionBlueprint, fps: number = 30): MotionChoreography {
    Logger.info(this.NAME, `Direcionando arte 3D para componente '${blueprint.componentName}'...`);

    // 1. Ângulos de Projeção Isométrica Canônica
    let rotateX = 58;
    let rotateZ = -38;
    let scale = 1.0;

    if (blueprint.archetype === 'VOLUMETRIC_CUTAWAY') {
      rotateX = 62;
      rotateZ = -34;
      scale = 1.05;
    } else if (blueprint.archetype === 'MICROSCOPIC_STRUCTURE') {
      rotateX = 50;
      rotateZ = -45;
      scale = 1.15;
    }

    // 2. Coreografia Temporal (Frames a 30 FPS)
    const entranceDurationFrames = Math.round(fps * 0.8); // 24 frames
    const laserSliceStartFrame = Math.round(fps * 0.9);   // frame 27
    const laserSliceDurationFrames = Math.round(fps * 1.5); // 45 frames
    const revealHoldFrames = Math.round(fps * 3.5);

    // 3. Cartões de Métrica e Telemetria CAD
    const metricCards = blueprint.physicalVariables.map((v) => ({
      label: v.name,
      value: v.value,
      unit: v.unit,
      standard: v.standard
    }));

    return {
      blueprint,
      viewport: {
        rotateX,
        rotateZ,
        scale,
        perspective: 1400
      },
      timing: {
        entranceDurationFrames,
        laserSliceStartFrame,
        laserSliceDurationFrames,
        revealHoldFrames
      },
      lighting: {
        ambientColor: '#060709',
        keyLightColor: '#1F2430',
        criticalGlow: blueprint.colorHierarchy.accentCritical,
        telemetryGlow: blueprint.colorHierarchy.telemetry
      },
      hudProps: {
        headerTag: `RAIO-X 3D // ${blueprint.archetype.replace(/_/g, ' ')}`,
        title: blueprint.title,
        subtitle: blueprint.subtitle,
        metricCards
      }
    };
  }
}
