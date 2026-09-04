import {z} from 'zod';

export const DocumentaryMotionZoneSchema = z.enum([
  'top_left',
  'top_center',
  'top_right',
  'center_left',
  'center',
  'center_right',
  'bottom_left',
  'bottom_center',
  'bottom_right',
]);

export const DocumentaryMotionColorRoleSchema = z.enum([
  'neutral',
  'evidence',
  'telemetry',
  'risk',
]);

export const NormalizedPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const MotionAnchorBindingSchema = z.object({
  mediaSha256: z.string().regex(/^(?:sha256_)?[a-f0-9]{64}$/i, 'MOTION_MEDIA_SHA256_INVALID'),
  trackingMethod: z.enum(['manual_keyframes', 'planar_track', 'object_track']),
  confidence: z.number().min(0.65).max(1),
  keyframes: z.array(z.object({
    atSeconds: z.number().min(0),
    point: NormalizedPointSchema,
  })).min(2).max(24),
}).superRefine((binding, ctx) => {
  for (let index = 1; index < binding.keyframes.length; index++) {
    if (binding.keyframes[index].atSeconds <= binding.keyframes[index - 1].atSeconds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MOTION_TRACK_KEYFRAMES_NOT_ORDERED',
        path: ['keyframes', index, 'atSeconds'],
      });
    }
  }
});

const commonShape = {
  id: z.string().min(1),
  startSeconds: z.number().min(0),
  durationSeconds: z.number().min(0.3).max(6),
  zone: DocumentaryMotionZoneSchema.optional().default('bottom_left'),
  colorRole: DocumentaryMotionColorRoleSchema.optional().default('neutral'),
  source: z.string().min(2).max(180).optional(),
  verifiedData: z.boolean().optional().default(false),
  binding: MotionAnchorBindingSchema.optional(),
};

const FieldMarkerSchema = z.object({
  ...commonShape,
  type: z.literal('field_marker'),
  anchor: NormalizedPointSchema,
  label: z.string().min(1).max(72),
  detail: z.string().max(96).optional(),
});

const EvidenceFreezeSchema = z.object({
  ...commonShape,
  type: z.literal('evidence_freeze'),
  durationSeconds: z.number().min(0.8).max(1.2),
  anchor: NormalizedPointSchema,
  label: z.string().min(1).max(72),
});

const MeasurementBracketSchema = z.object({
  ...commonShape,
  type: z.literal('measurement_bracket'),
  from: NormalizedPointSchema,
  to: NormalizedPointSchema,
  value: z.string().min(1).max(32),
  label: z.string().max(72).optional(),
});

const VerifiedCounterSchema = z.object({
  ...commonShape,
  type: z.literal('verified_counter'),
  startValue: z.number().optional().default(0),
  endValue: z.number(),
  decimals: z.number().int().min(0).max(3).optional().default(0),
  prefix: z.string().max(12).optional(),
  suffix: z.string().max(16).optional(),
  label: z.string().min(1).max(72),
});

const SourceCaptionSchema = z.object({
  ...commonShape,
  type: z.literal('source_caption'),
  text: z.string().min(1).max(120),
});

const ProcessChainSchema = z.object({
  ...commonShape,
  type: z.literal('process_chain'),
  title: z.string().max(72).optional(),
  steps: z.array(z.string().min(1).max(36)).min(2).max(6),
  activeStep: z.number().int().min(0).max(5),
});

const RouteTraceSchema = z.object({
  ...commonShape,
  type: z.literal('route_trace'),
  points: z.array(NormalizedPointSchema).min(2).max(24),
  label: z.string().max(72).optional(),
  coordinates: z.string().max(48).optional(),
});

const ComparisonSideSchema = z.object({
  label: z.string().min(1).max(48),
  value: z.string().min(1).max(32),
  detail: z.string().max(72).optional(),
});

const ComparisonSchema = z.object({
  ...commonShape,
  type: z.literal('comparison'),
  title: z.string().max(72).optional(),
  left: ComparisonSideSchema,
  right: ComparisonSideSchema,
});

const DocumentHighlightSchema = z.object({
  ...commonShape,
  type: z.literal('document_highlight'),
  documentTitle: z.string().min(1).max(88),
  excerpt: z.string().min(1).max(220),
  page: z.string().max(20).optional(),
});

const DataBarItemSchema = z.object({
  label: z.string().min(1).max(36),
  value: z.number().nonnegative(),
  displayValue: z.string().max(24).optional(),
});

const DataBarsSchema = z.object({
  ...commonShape,
  type: z.literal('data_bars'),
  title: z.string().min(1).max(72),
  unit: z.string().max(16).optional(),
  items: z.array(DataBarItemSchema).min(2).max(5),
});

const TimelineEventSchema = z.object({
  label: z.string().min(1).max(36),
  date: z.string().min(1).max(24),
});

const TimelineMarksSchema = z.object({
  ...commonShape,
  type: z.literal('timeline_marks'),
  title: z.string().max(72).optional(),
  events: z.array(TimelineEventSchema).min(2).max(6),
  activeIndex: z.number().int().min(0).max(5),
});

const LocationStampSchema = z.object({
  ...commonShape,
  type: z.literal('location_stamp'),
  place: z.string().min(1).max(72),
  coordinates: z.string().min(3).max(48),
  context: z.string().max(72).optional(),
});

const AreaOutlineSchema = z.object({
  ...commonShape,
  type: z.literal('area_outline'),
  points: z.array(NormalizedPointSchema).min(3).max(24),
  label: z.string().min(1).max(72),
  value: z.string().max(32).optional(),
});

const RiskMarkerSchema = z.object({
  ...commonShape,
  type: z.literal('risk_marker'),
  anchor: NormalizedPointSchema,
  label: z.string().min(1).max(72),
  consequence: z.string().max(96).optional(),
});

const rawRecipeSchema = z.discriminatedUnion('type', [
  FieldMarkerSchema,
  EvidenceFreezeSchema,
  MeasurementBracketSchema,
  VerifiedCounterSchema,
  SourceCaptionSchema,
  ProcessChainSchema,
  RouteTraceSchema,
  ComparisonSchema,
  DocumentHighlightSchema,
  DataBarsSchema,
  TimelineMarksSchema,
  LocationStampSchema,
  AreaOutlineSchema,
  RiskMarkerSchema,
]);

const SOURCE_REQUIRED_TYPES = new Set([
  'evidence_freeze',
  'verified_counter',
  'source_caption',
  'route_trace',
  'comparison',
  'document_highlight',
  'data_bars',
  'timeline_marks',
  'location_stamp',
  'area_outline',
  'risk_marker',
]);

export const DocumentaryMotionRecipeSchema = rawRecipeSchema.superRefine((recipe, ctx) => {
  if (['field_marker', 'evidence_freeze', 'risk_marker'].includes(recipe.type) && !recipe.binding) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `MOTION_PHYSICAL_BINDING_REQUIRED:${recipe.id}:${recipe.type}`,
      path: ['binding'],
    });
  }
  if (recipe.binding) {
    const lastKeyframe = recipe.binding.keyframes[recipe.binding.keyframes.length - 1];
    if (lastKeyframe.atSeconds > recipe.durationSeconds + 0.001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `MOTION_TRACK_OUTSIDE_RECIPE:${recipe.id}`,
        path: ['binding', 'keyframes'],
      });
    }
  }
  if (SOURCE_REQUIRED_TYPES.has(recipe.type) && !recipe.source?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `MOTION_SOURCE_REQUIRED:${recipe.id}:${recipe.type}`,
      path: ['source'],
    });
  }
  if (recipe.colorRole === 'telemetry' && recipe.verifiedData !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `MOTION_TELEMETRY_NOT_VERIFIED:${recipe.id}`,
      path: ['verifiedData'],
    });
  }
  if ('activeStep' in recipe && recipe.activeStep >= recipe.steps.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `MOTION_ACTIVE_STEP_INVALID:${recipe.id}`,
      path: ['activeStep'],
    });
  }
  if ('activeIndex' in recipe && recipe.activeIndex >= recipe.events.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `MOTION_ACTIVE_INDEX_INVALID:${recipe.id}`,
      path: ['activeIndex'],
    });
  }
});

export const DocumentaryMotionRecipeListSchema = z.array(DocumentaryMotionRecipeSchema).max(12);

export type DocumentaryMotionRecipe = z.infer<typeof DocumentaryMotionRecipeSchema>;
export type DocumentaryMotionZone = z.infer<typeof DocumentaryMotionZoneSchema>;
export type DocumentaryMotionColorRole = z.infer<typeof DocumentaryMotionColorRoleSchema>;
export type NormalizedPoint = z.infer<typeof NormalizedPointSchema>;

export const DOCUMENTARY_MOTION_TYPES = Object.freeze([
  'field_marker',
  'evidence_freeze',
  'measurement_bracket',
  'verified_counter',
  'source_caption',
  'process_chain',
  'route_trace',
  'comparison',
  'document_highlight',
  'data_bars',
  'timeline_marks',
  'location_stamp',
  'area_outline',
  'risk_marker',
] as const);
