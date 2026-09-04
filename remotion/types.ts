import {HslMotionDesign} from '../hsl/motion/motionDesign';
import {HslGenerationStrategy} from '../hsl/motion/generatedMotion';

export interface HslRenderScene {
  readonly sceneId: string;
  readonly shotId: string;
  readonly variant: 'ESTABLISH' | 'PROCESS' | 'DETAIL' | 'CONSEQUENCE';
  readonly chapterTitle: string;
  readonly narrativeFunction: string;
  readonly visualMode: 'remotion' | 'licensed_real' | 'generated_ai' | 'typography';
  readonly visualSubject: string;
  readonly durationInFrames: number;
  readonly mediaSrc?: string;
  readonly aiDisclosureRequired: boolean;
  readonly transition: string;
  readonly motionDesign?: HslMotionDesign;
  readonly generationStrategy?: HslGenerationStrategy;
}

export interface HslEpisodeRenderProps {
  readonly [key: string]: unknown;
  readonly title: string;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly totalDurationInFrames: number;
  readonly scenes: readonly HslRenderScene[];
  readonly narrationSrc?: string;
  readonly soundFxSrc?: string;
  readonly soundFxVolume?: number;
  readonly showGlobalOverlays?: boolean;
  readonly showHybridTextOverlay?: boolean;
  readonly showMasterStopwatch?: boolean;
}
