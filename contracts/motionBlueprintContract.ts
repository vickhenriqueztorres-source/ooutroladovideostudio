import { z } from 'zod';

export const MotionArchetypeSchema = z.enum([
  'VOLUMETRIC_CUTAWAY',
  'FLOW_DYNAMICS',
  'LAYER_EXPLODED_VIEW',
  'METROLOGICAL_STRESS',
  'INFRASTRUCTURE_NODES',
  'MICROSCOPIC_STRUCTURE'
]);
export type MotionArchetype = z.infer<typeof MotionArchetypeSchema>;

export const PhysicalVariableSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().min(1),
  standard: z.string().optional()
});
export type PhysicalVariable = z.infer<typeof PhysicalVariableSchema>;

export const MotionLayer3DSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  depthOffset: z.number(),
  opacity: z.number().min(0).max(1),
  material: z.enum([
    'steel',
    'cotton_fiber',
    'copper',
    'frosted_glass',
    'optical_core',
    'asphalt',
    'silicon',
    'polymer'
  ]),
  critical: z.boolean().default(false)
});
export type MotionLayer3D = z.infer<typeof MotionLayer3DSchema>;

export const MotionBlueprintSchema = z.object({
  sceneId: z.string().min(1),
  archetype: MotionArchetypeSchema,
  title: z.string().min(1),
  subtitle: z.string().min(1),
  mechanismDescription: z.string().min(1),
  physicalVariables: z.array(PhysicalVariableSchema).default([]),
  layers: z.array(MotionLayer3DSchema).default([]),
  cameraMotion: z.enum([
    'isometric_drift',
    'axial_slice',
    'exploded_pull',
    'laser_sweep'
  ]).default('isometric_drift'),
  colorHierarchy: z.object({
    background: z.string().default('#060709'),
    surface: z.string().default('#0D0E15'),
    accentCritical: z.string().default('#FF5500'),
    telemetry: z.string().default('#00F0FF'),
    textPrimary: z.string().default('#F4F4F0'),
    textMuted: z.string().default('#8A8D9F')
  }),
  componentName: z.string().min(1),
  generatedAt: z.string().datetime().optional()
});
export type MotionBlueprint = z.infer<typeof MotionBlueprintSchema>;
