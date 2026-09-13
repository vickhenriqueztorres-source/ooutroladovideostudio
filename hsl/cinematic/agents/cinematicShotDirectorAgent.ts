import {
  CinematicShotDirection,
  CinematicShotDirectorInput,
  HslCameraDirection,
  HslCameraIntensity,
  HslCameraMovement,
  HslComposition,
  HslDepthDesign,
  HslLensLanguage,
  HslMotionMotivation,
  HslNegativeSpace,
  HslNegativeSpaceMotivation,
  HslShotSize,
  HslShotType,
  HslSubjectAnchor,
  NarrativeBeatV1
} from '../types/cinematicPlans';
import {CinematicTelemetryPort} from '../telemetry/cinematicTelemetry';
import {validateCinematicShotDirection} from '../validators/cinematicShotValidator';
import {CinematicValidationError} from '../validators/cinematicValidationError';
import {deriveSemanticFunction} from '../schemas/beatSchema';

function dominantBeat(beats: readonly NarrativeBeatV1[]): NarrativeBeatV1 {
  const beat = beats.find((candidate) => candidate.importance === 'high')
    || beats.find((candidate) => candidate.visual_change_candidate)
    || beats[0];
  if (!beat) throw new CinematicValidationError('CINEMATIC_SHOT_DIRECTION_FAILED', 'beats are required');
  return beat;
}

function chooseShotType(input: CinematicShotDirectorInput, beat: NarrativeBeatV1): HslShotType {
  const mode = input.visualMode.toLowerCase();
  if (mode.includes('remotion')) return 'TECHNICAL_LOCKED';
  const semantic = deriveSemanticFunction(beat.narrative_function);
  switch (semantic) {
    case 'introduce_object': return 'SCALE_REFERENCE';
    case 'introduce_system': return mode.includes('map') ? 'AERIAL_NETWORK' : 'SYSTEM_WIDE';
    case 'establish_context': return mode.includes('map') || mode.includes('aerial') ? 'AERIAL_NETWORK' : 'ESTABLISHING';
    case 'follow_flow': return mode.includes('map') ? 'TOPDOWN_PROCESS' : 'TRACKING_FLOW';
    case 'explain_mechanism': return 'MECHANICAL_DETAIL';
    case 'handoff': return 'OPERATION';
    case 'reveal_dependency':
    case 'reveal_constraint': return 'REVEAL';
    case 'quantify':
    case 'compare': return 'TECHNICAL_LOCKED';
    case 'failure_trigger': return 'MECHANICAL_DETAIL';
    case 'propagation': return mode.includes('map') ? 'AERIAL_NETWORK' : 'SYSTEM_WIDE';
    case 'conclusion': return 'SYSTEM_WIDE';
    default: return mode.includes('reconstruction') ? 'SYSTEM_WIDE' : 'OPERATION';
  }
}

function shotSize(type: HslShotType): HslShotSize {
  const sizes: Record<HslShotType, HslShotSize> = {
    ESTABLISHING: 'WIDE', SYSTEM_WIDE: 'WIDE', OPERATION: 'MEDIUM', MECHANICAL_DETAIL: 'CLOSE',
    MACRO_DETAIL: 'EXTREME_CLOSE', TRACKING_FLOW: 'MEDIUM_WIDE', TOPDOWN_PROCESS: 'WIDE',
    AERIAL_NETWORK: 'EXTREME_WIDE', TECHNICAL_LOCKED: 'MEDIUM', REVEAL: 'MEDIUM', SCALE_REFERENCE: 'EXTREME_WIDE'
  };
  return sizes[type];
}

function shotDesign(type: HslShotType, semantic: string): {
  composition: HslComposition;
  anchor: HslSubjectAnchor;
  space: HslNegativeSpace;
  spaceMotivation: HslNegativeSpaceMotivation | null;
  depth: HslDepthDesign;
  lens: HslLensLanguage;
} {
  if (type === 'TECHNICAL_LOCKED') return {
    composition: 'ASYMMETRIC_LEFT', anchor: 'LEFT_THIRD', space: 'RIGHT',
    spaceMotivation: semantic === 'quantify' ? 'ROOM_FOR_FUTURE_METRIC' : 'ROOM_FOR_FUTURE_CALLOUT',
    depth: 'FLAT', lens: 'NATURAL_50'
  };
  if (type === 'MECHANICAL_DETAIL' || type === 'MACRO_DETAIL') return {
    composition: 'RULE_OF_THIRDS_LEFT', anchor: 'LEFT_THIRD', space: 'RIGHT',
    spaceMotivation: 'ROOM_FOR_FUTURE_CALLOUT', depth: 'TWO_LAYER',
    lens: type === 'MACRO_DETAIL' ? 'MACRO' : 'DETAIL_85'
  };
  if (type === 'REVEAL') return {
    composition: 'ASYMMETRIC_LEFT', anchor: 'LEFT_THIRD', space: 'RIGHT',
    spaceMotivation: 'ROOM_FOR_VISUAL_REVEAL', depth: 'THREE_LAYER', lens: 'DOCUMENTARY_35'
  };
  if (type === 'TRACKING_FLOW') return {
    composition: 'LEADING_LINES', anchor: 'CENTER', space: 'NONE', spaceMotivation: null,
    depth: 'THREE_LAYER', lens: 'DOCUMENTARY_35'
  };
  if (type === 'AERIAL_NETWORK' || type === 'ESTABLISHING' || type === 'SCALE_REFERENCE') return {
    composition: 'LAYERED_DEPTH', anchor: 'FULL_FRAME', space: 'NONE', spaceMotivation: null,
    depth: 'DEEP', lens: 'WIDE_24'
  };
  if (type === 'SYSTEM_WIDE' || type === 'TOPDOWN_PROCESS') return {
    composition: type === 'TOPDOWN_PROCESS' ? 'CENTERED' : 'LAYERED_DEPTH', anchor: 'FULL_FRAME',
    space: 'NONE', spaceMotivation: null, depth: type === 'TOPDOWN_PROCESS' ? 'FLAT' : 'THREE_LAYER',
    lens: type === 'TOPDOWN_PROCESS' ? 'NATURAL_50' : 'WIDE_24'
  };
  return {
    composition: 'RULE_OF_THIRDS_LEFT', anchor: 'LEFT_THIRD', space: 'RIGHT',
    spaceMotivation: 'ROOM_FOR_FUTURE_LABEL', depth: 'THREE_LAYER', lens: 'DOCUMENTARY_35'
  };
}

function cameraDesign(type: HslShotType, semantic: string): {
  movement: HslCameraMovement;
  direction: HslCameraDirection;
  intensity: HslCameraIntensity;
  motivation: HslMotionMotivation | null;
} {
  if (type === 'TECHNICAL_LOCKED' || type === 'OPERATION') {
    return {movement: 'STATIC', direction: 'NONE', intensity: 'NONE', motivation: null};
  }
  if (type === 'TRACKING_FLOW') {
    return {movement: 'TRACK_RIGHT', direction: 'LEFT_TO_RIGHT', intensity: 'LOW', motivation: 'FOLLOW_FLOW'};
  }
  if (type === 'REVEAL') {
    return {movement: 'SLOW_DOLLY_IN', direction: 'FORWARD', intensity: 'LOW', motivation: 'REVEAL_DETAIL'};
  }
  if (type === 'MECHANICAL_DETAIL' || type === 'MACRO_DETAIL') {
    return {movement: 'SLOW_DOLLY_IN', direction: 'FORWARD', intensity: 'LOW', motivation: 'APPROACH_MECHANISM'};
  }
  if (type === 'TOPDOWN_PROCESS') {
    return {movement: 'TOPDOWN_DESCEND', direction: 'DOWN', intensity: 'LOW', motivation: 'SHOW_PROCESS'};
  }
  if (type === 'AERIAL_NETWORK' || type === 'ESTABLISHING') {
    return {movement: 'SUBTLE_CRANE_UP', direction: 'UP', intensity: 'LOW', motivation: 'ESTABLISH_GEOGRAPHY'};
  }
  if (type === 'SCALE_REFERENCE' || (type === 'SYSTEM_WIDE' && semantic === 'conclusion')) {
    return {movement: 'SLOW_DOLLY_OUT', direction: 'BACKWARD', intensity: 'LOW', motivation: 'REVEAL_SCALE'};
  }
  return {movement: 'STATIC', direction: 'NONE', intensity: 'NONE', motivation: null};
}

export class CinematicShotDirectorAgent {
  constructor(private readonly telemetry: CinematicTelemetryPort) {}

  public run(input: Readonly<CinematicShotDirectorInput>): CinematicShotDirection {
    this.telemetry.emit('cinematic.shot.started', {
      productionId: input.productionId,
      episodeId: input.episodeId,
      sceneId: input.sceneId
    });
    try {
      if (!input.narrativeIntent.trim()) {
        throw new CinematicValidationError('CINEMATIC_SHOT_DIRECTION_FAILED', 'narrative intent is required');
      }
      const beat = dominantBeat(input.beats);
      const focusTarget = input.focusTargetCandidates[0];
      if (!focusTarget) throw new CinematicValidationError('CINEMATIC_SHOT_FOCUS_REQUIRED', input.sceneId);
      const shotType = chooseShotType(input, beat);
      const semantic = deriveSemanticFunction(beat.narrative_function);
      const design = shotDesign(shotType, semantic);
      const camera = cameraDesign(shotType, semantic);
      const output: CinematicShotDirection = {
        focusTarget,
        shot: {
          shot_type: shotType,
          shot_size: shotSize(shotType),
          composition: design.composition,
          subject_anchor: design.anchor,
          negative_space: design.space,
          negative_space_motivation: design.spaceMotivation,
          depth_design: design.depth,
          lens_language: design.lens
        },
        camera,
        decisionReason: {
          based_on: ['narrative_intent', beat.beat_id],
          goal: `Prioritize ${focusTarget} to support ${semantic.replace(/_/g, ' ')}.`
        }
      };
      validateCinematicShotDirection(output, input);
      const metrics = {
        shotType: output.shot.shot_type,
        shotSize: output.shot.shot_size,
        composition: output.shot.composition,
        cameraMovement: output.camera.movement,
        cameraIntensity: output.camera.intensity,
        focusTarget: output.focusTarget,
        staticCamera: output.camera.movement === 'STATIC'
      };
      this.telemetry.emit('cinematic.shot.generated', {
        productionId: input.productionId, episodeId: input.episodeId, sceneId: input.sceneId, shotMetrics: metrics
      });
      this.telemetry.emit('cinematic.shot.completed', {
        productionId: input.productionId, episodeId: input.episodeId, sceneId: input.sceneId, shotMetrics: metrics
      });
      return output;
    } catch (error) {
      if (error instanceof CinematicValidationError) {
        this.telemetry.emit('cinematic.shot.validation_failed', {
          productionId: input.productionId,
          episodeId: input.episodeId,
          sceneId: input.sceneId,
          errorCode: error.code,
          message: error.message
        });
      }
      this.telemetry.emit('cinematic.shot.failed', {
        productionId: input.productionId,
        episodeId: input.episodeId,
        sceneId: input.sceneId,
        errorCode: error instanceof CinematicValidationError ? error.code : 'CINEMATIC_SHOT_DIRECTION_FAILED',
        message: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
