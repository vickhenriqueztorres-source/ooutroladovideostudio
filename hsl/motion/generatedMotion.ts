import type {HslVisualFunction, HslVisualMode} from '../editorial/types/editorial';
import type {HslVisualShotVariant} from '../execution/types/execution';

export type HslGenerationStrategy =
  | 'FIREFLY_CINEMATIC'
  /** Read-only compatibility for historical execution contracts. */
  | 'KLING_CINEMATIC'
  | 'VEO_MOTION_GRAPHIC'
  | 'REMOTION_DETERMINISTIC'
  | 'VEO_REMOTION_HYBRID';

export type HslAudioStrategy = 'VEO_NATIVE' | 'KENNEY_DESIGNED' | 'HYBRID' | 'NONE';

export type HslPremiumMotionFamily =
  | 'SYSTEM_ANATOMY'
  | 'FLOW_JOURNEY'
  | 'CINEMATIC_REVEAL'
  | 'BOTTLENECK_PROPAGATION'
  | 'CAPACITY_STATE'
  | 'LAST_METER';

export interface HslMotionBeat {
  readonly at_percent: number;
  readonly action: string;
  readonly color_role: 'yellow' | 'blue' | 'orange' | 'white';
}

export interface HslMotionRouteDecision {
  readonly status: 'MOTION_ROUTE_APPROVED';
  readonly generation_strategy: HslGenerationStrategy;
  readonly audio_strategy: HslAudioStrategy;
  readonly motion_family: HslPremiumMotionFamily | null;
  readonly requires_exact_overlay: boolean;
  readonly rationale: string;
}

export interface HslVeoMotionContract {
  readonly model: 'Veo 3.1 Fast';
  readonly status: 'VEO_MOTION_CONTRACT_READY';
  readonly duration_seconds: 4 | 6 | 8;
  readonly resolution: '720p' | '1080p';
  readonly aspect_ratio: '16:9';
  readonly generate_audio: boolean;
  readonly motion_family: HslPremiumMotionFamily;
  readonly beats: readonly HslMotionBeat[];
  readonly audio_intent: Readonly<{
    include_dialogue: false;
    include_music: false;
    description: string;
  }>;
  readonly negative_motion_rules: readonly string[];
  readonly provider_prompt: string;
}

const explanatoryPattern = /(flow|route|journey|map|pipeline|network|tank|buffer|capacity|pressure|bottleneck|delay|handoff|transfer|last meter|system)/i;
const exactPattern = /(map|number|metric|percentage|pressure|capacity|timeline|delay|process|route|bottleneck|evidence|document)/i;

export class MotionRouteDirectorAgent {
  run(input: Readonly<{
    visualMode: HslVisualMode;
    visualFunction: HslVisualFunction | null;
    narrativeFunction: string;
    visualSubject: string;
    variant: HslVisualShotVariant;
    promoteRemotion?: boolean;
    promotionTarget?: 'VEO' | 'FIREFLY' | 'KLING';
    promoteWithExactOverlay?: boolean;
    forceKling?: boolean;
  }>): HslMotionRouteDecision {
    const semantic = `${input.narrativeFunction} ${input.visualSubject}`;
    if (input.promoteRemotion && (input.visualMode === 'remotion' || input.visualMode === 'typography')) {
      if (input.promotionTarget === 'KLING' || input.promotionTarget === 'FIREFLY') {
        return {
          status: 'MOTION_ROUTE_APPROVED', generation_strategy: 'FIREFLY_CINEMATIC',
          audio_strategy: 'KENNEY_DESIGNED', motion_family: null,
          requires_exact_overlay: false,
          rationale: 'An editorial graphics beat is promoted to a photoreal Firefly Video shot.'
        };
      }
      const exactOverlay = input.promoteWithExactOverlay !== false;
      return {
        status: 'MOTION_ROUTE_APPROVED',
        generation_strategy: exactOverlay ? 'VEO_REMOTION_HYBRID' : 'VEO_MOTION_GRAPHIC',
        audio_strategy: exactOverlay ? 'HYBRID' : 'VEO_NATIVE',
        motion_family: this.family(semantic, input.variant),
        requires_exact_overlay: exactOverlay,
        rationale: exactOverlay
          ? 'Veo animates the spatial mechanism while one exact overlay remains deterministic.'
          : 'An editorial graphics beat is promoted to spatial Veo motion without persistent text.'
      };
    }
    if (input.forceKling && input.visualMode === 'generated_ai') {
      return {
        status: 'MOTION_ROUTE_APPROVED', generation_strategy: 'FIREFLY_CINEMATIC',
        audio_strategy: 'KENNEY_DESIGNED', motion_family: null, requires_exact_overlay: false,
        rationale: 'An existing approved generated shot is routed to Firefly Video.'
      };
    }
    if (input.visualMode === 'remotion' || input.visualMode === 'typography') {
      return {
        status: 'MOTION_ROUTE_APPROVED', generation_strategy: 'REMOTION_DETERMINISTIC',
        audio_strategy: input.visualMode === 'remotion' ? 'KENNEY_DESIGNED' : 'NONE',
        motion_family: null, requires_exact_overlay: true,
        rationale: 'Exact typography, data and deterministic timing stay in Remotion.'
      };
    }
    if (input.visualMode !== 'generated_ai') {
      return {
        status: 'MOTION_ROUTE_APPROVED', generation_strategy: 'REMOTION_DETERMINISTIC',
        audio_strategy: 'KENNEY_DESIGNED', motion_family: null, requires_exact_overlay: false,
        rationale: 'Licensed footage remains in the existing deterministic assembly route.'
      };
    }

    const explanatory = input.visualFunction === 'invisible_process' || input.visualFunction === 'transition' || explanatoryPattern.test(semantic);
    if (!explanatory) {
      return {
        status: 'MOTION_ROUTE_APPROVED', generation_strategy: 'FIREFLY_CINEMATIC',
        audio_strategy: 'KENNEY_DESIGNED', motion_family: null, requires_exact_overlay: false,
        rationale: 'Photoreal physical scale or reconstruction is generated by Firefly Video.'
      };
    }
    const family = this.family(semantic, input.variant);
    const exact = exactPattern.test(semantic) || ['PROCESS', 'CONSEQUENCE'].includes(input.variant);
    return {
      status: 'MOTION_ROUTE_APPROVED',
      generation_strategy: exact ? 'VEO_REMOTION_HYBRID' : 'VEO_MOTION_GRAPHIC',
      audio_strategy: exact ? 'HYBRID' : 'VEO_NATIVE',
      motion_family: family, requires_exact_overlay: exact,
      rationale: exact
        ? 'Veo animates the spatial mechanism while Remotion preserves exact labels and values.'
        : 'The shot has one visible explanatory transformation suited to Veo motion.'
    };
  }

  private family(semantic: string, variant: HslVisualShotVariant): HslPremiumMotionFamily {
    if (/(bottleneck|delay|failure|blocked|constraint|propagation)/i.test(semantic)) return 'BOTTLENECK_PROPAGATION';
    if (/(capacity|pressure|availability|state)/i.test(semantic)) return 'CAPACITY_STATE';
    if (/(map|journey|route|refinery|terminal|network)/i.test(semantic)) return 'FLOW_JOURNEY';
    if (/(tank|cutaway|inside|pipeline|anatomy|buffer)/i.test(semantic)) return 'SYSTEM_ANATOMY';
    if (/(last meter|wing|hose|nozzle|handoff)/i.test(semantic) || variant === 'DETAIL') return 'LAST_METER';
    return 'CINEMATIC_REVEAL';
  }
}

export class VeoMotionDirectorAgent {
  run(input: Readonly<{
    family: HslPremiumMotionFamily;
    subject: string;
    durationSeconds: number;
    audioStrategy: HslAudioStrategy;
  }>): HslVeoMotionContract {
    const duration = this.duration(input.durationSeconds);
    const beats = this.beats(input.family, input.subject);
    const negativeRules = [
      'Do not alter the geometry, labels, proportions or camera framing from the first frame.',
      'Do not add objects, people, logos, extra arrows or new text.',
      'Do not turn the shot into a flat diagram, title card, dark grid template or abstract UI screen.',
      'No cuts, morphing, explosive flare, excessive haze or particles covering the subject.',
      'Preserve natural location color; orange may mark one constraint and cyan may appear only for verified telemetry.',
      'End in a clean readable state with the principal subject unobstructed.'
    ];
    const audio = this.audioIntent(input.family);
    const prompt = [
      `Use the provided first frame image as the exact first frame of a ${duration}-second present-day documentary evidence take built on a real photographed environment, not a flat diagram.`,
      `Motion language: ${input.family.replace(/_/g, ' ').toLowerCase()}.`,
      'Preserve the real scene, material texture, depth, lighting and camera plausibility; animate only the intended spatial flow or mechanism.',
      ...beats.map((beat, index) => `Beat ${index + 1} at ${beat.at_percent}%: ${beat.action}.`),
      ...negativeRules,
      input.audioStrategy === 'VEO_NATIVE' || input.audioStrategy === 'HYBRID'
        ? `Generate synchronized sound effects only: ${audio}. No dialogue, voice, lyrics or music.`
        : 'Generate no audio.'
    ].join(' ');
    return {
      model: 'Veo 3.1 Fast', status: 'VEO_MOTION_CONTRACT_READY', duration_seconds: duration,
      resolution: '1080p', aspect_ratio: '16:9',
      generate_audio: input.audioStrategy === 'VEO_NATIVE' || input.audioStrategy === 'HYBRID',
      motion_family: input.family, beats,
      audio_intent: {include_dialogue: false, include_music: false, description: audio},
      negative_motion_rules: negativeRules, provider_prompt: prompt
    };
  }

  private duration(seconds: number): 4 | 6 | 8 {
    const configuredMinimum = Number(process.env.HSL_VEO_MIN_GENERATION_SECONDS || 8);
    const minimum = configuredMinimum >= 8 ? 8 : configuredMinimum >= 6 ? 6 : 4;
    if (minimum === 8) return 8;
    if (minimum === 6 && seconds <= 7) return 6;
    if (seconds <= 5) return 4;
    if (seconds <= 7) return 6;
    return 8;
  }

  private beats(family: HslPremiumMotionFamily, subject: string): readonly HslMotionBeat[] {
    if (family === 'FLOW_JOURNEY') return [
      {at_percent: 8, action: `activate the origin point in ${subject}`, color_role: 'yellow'},
      {at_percent: 32, action: 'send one controlled yellow pulse along the first route', color_role: 'yellow'},
      {at_percent: 58, action: 'activate the transfer node while blue infrastructure remains fixed', color_role: 'blue'},
      {at_percent: 84, action: 'deliver the pulse to the destination and hold', color_role: 'yellow'}
    ];
    if (family === 'BOTTLENECK_PROPAGATION') return [
      {at_percent: 10, action: 'establish a normal controlled flow', color_role: 'yellow'},
      {at_percent: 38, action: 'pulse one orange restriction at the bottleneck', color_role: 'orange'},
      {at_percent: 62, action: 'accumulate the yellow flow before the restriction', color_role: 'yellow'},
      {at_percent: 86, action: 'propagate a restrained consequence downstream and hold', color_role: 'orange'}
    ];
    if (family === 'SYSTEM_ANATOMY') return [
      {at_percent: 10, action: 'reveal stored material with one subtle internal pulse', color_role: 'yellow'},
      {at_percent: 36, action: 'move the pulse into the fixed blue infrastructure', color_role: 'blue'},
      {at_percent: 64, action: 'trace one continuous yellow path through the system', color_role: 'yellow'},
      {at_percent: 86, action: 'complete distribution and settle without a flare', color_role: 'yellow'}
    ];
    return [
      {at_percent: 12, action: `hold ${subject} as the stable visual anchor`, color_role: 'white'},
      {at_percent: 38, action: 'introduce one controlled yellow directional movement', color_role: 'yellow'},
      {at_percent: 68, action: 'reveal the operational relationship without changing geometry', color_role: 'blue'},
      {at_percent: 88, action: 'resolve the explanation into one readable final state', color_role: 'yellow'}
    ];
  }

  private audioIntent(family: HslPremiumMotionFamily): string {
    if (family === 'BOTTLENECK_PROPAGATION') return 'low industrial ambience, restrained pulse, one muted constraint impact and a short downstream pass';
    if (family === 'FLOW_JOURNEY') return 'subtle industrial ambience, soft origin pulse and a directional pass synchronized to the moving route';
    if (family === 'SYSTEM_ANATOMY') return 'low mechanical room tone, controlled liquid movement and a quiet transfer pulse';
    if (family === 'LAST_METER') return 'close mechanical coupling, hose movement and one precise connection click';
    return 'subtle cinematic industrial ambience and one restrained synchronized whoosh';
  }
}
