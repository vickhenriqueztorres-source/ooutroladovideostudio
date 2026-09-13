import { z } from 'zod';
import { TimelineCalloutSchema, HudWindowSchema } from './timelineContract';
import { DocumentaryMotionRecipeListSchema } from './documentaryMotionContract';

export const MotionSceneAssignmentSchema = z.object({
  sceneId: z.string().min(1),
  component: z.string().min(1),
  props: z.record(z.string(), z.any()).default({}),
  callout: TimelineCalloutSchema.optional(),
  motionRecipes: DocumentaryMotionRecipeListSchema.optional().default([]),
  motionMode: z.enum(['slow_push_in', 'crash_push_in', 'dramatic_pull_out', 'pan_right', 'pan_left', 'cinematic_drift']).optional(),
  camera: z.enum(['pushIn', 'drift', 'tension', 'static', 'pullOut', 'panRight', 'panLeft']).optional(),
  transition: z.enum(['crossfade', 'dipToBlack', 'whipPan', 'hardCut', 'laserWipe', 'wipe', 'cut']).optional()
});
export type MotionSceneAssignment = z.infer<typeof MotionSceneAssignmentSchema>;

export const MotionDistributionReportSchema = z.object({
  totalScenes: z.number().int().positive(),
  matterCount: z.number().int().nonnegative(),
  evidenceCount: z.number().int().nonnegative(),
  mapsCount: z.number().int().nonnegative(),
  revealCount: z.number().int().nonnegative(),
  motionGraphicsPercentage: z.number().min(0).max(100),
  totalCallouts: z.number().int().nonnegative(),
  qualityScore: z.number().min(0).max(10)
});
export type MotionDistributionReport = z.infer<typeof MotionDistributionReportSchema>;

export const MotionPackageSchema = z.object({
  episodeId: z.string().min(1),
  runId: z.string().optional(),
  sceneAssignments: z.record(z.string(), MotionSceneAssignmentSchema),
  hudWindows: z.array(HudWindowSchema).default([]),
  distributionReport: MotionDistributionReportSchema,
  compiledAt: z.string()
});
export type MotionPackage = z.infer<typeof MotionPackageSchema>;
