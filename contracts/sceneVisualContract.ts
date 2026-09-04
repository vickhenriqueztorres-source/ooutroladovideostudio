import { z } from 'zod';

export const AllowedVisualSourceSchema = z.enum(['firefly', 'bank', 'dossier']);
export type AllowedVisualSource = z.infer<typeof AllowedVisualSourceSchema>;

export const TakeTypeSchema = z.enum(['CINEMATIC_TAKE', 'KEYFRAME_DOSSIER']);
export type TakeType = z.infer<typeof TakeTypeSchema>;

export const VisualAssetClassSchema = z.enum([
  'REALISTIC_IMAGE',
  'VIDEO',
  'MOTION_GRAPHICS',
  'MOTION_IMAGE'
]);
export type VisualAssetClass = z.infer<typeof VisualAssetClassSchema>;

export const SceneVisualContractSchema = z.object({
  sceneId: z
    .string()
    .min(1, "O campo 'sceneId' não pode ser vazio."),

  episodeId: z
    .string()
    .min(1, "O campo 'episodeId' não pode ser vazio."),

  voiceover: z
    .string()
    .min(1, "O campo 'voiceover' não pode ser vazio."),

  chapterId: z.string().min(1, "O campo 'chapterId' não pode ser vazio.").optional(),
  chapterTitle: z.string().min(1, "O campo 'chapterTitle' não pode ser vazio.").optional(),

  visual_must_include: z
    .array(z.string().min(1, "Termo de 'visual_must_include' não pode ser vazio."))
    .min(2, "O campo 'visual_must_include' DEVE conter no mínimo 2 elementos específicos."),

  visual_must_not: z
    .array(z.string().min(1, "Termo de 'visual_must_not' não pode ser vazio."))
    .min(1, "O campo 'visual_must_not' DEVE conter no mínimo 1 elemento proibido."),

  required_category: z
    .string()
    .min(1, "O campo 'required_category' não pode ser vazio.")
    .refine(
      (cat) => cat.toLowerCase().trim() !== 'industrial',
      {
        message: "O campo 'required_category' não pode ser 'industrial' genérico. Deve ser um slug específico do assunto."
      }
    ),

  domainTags: z
    .array(z.string().min(1, "Tag de domínio não pode ser vazia."))
    .min(1, "O campo 'domainTags' deve conter no mínimo 1 tag de domínio."),

  allowed_sources: z
    .array(AllowedVisualSourceSchema)
    .min(1, "O campo 'allowed_sources' deve conter no mínimo 1 fonte permitida ('firefly', 'bank' ou 'dossier')."),

  take_type: TakeTypeSchema,

  visual_asset_class: VisualAssetClassSchema.optional(),

  canon_category: z.enum(['matter', 'evidence', 'maps', 'reveal']).optional(),

  targetSeconds: z
    .number()
    .positive("O campo 'targetSeconds' deve ser um número positivo maior que zero.")
});

export type SceneVisualContract = z.infer<typeof SceneVisualContractSchema>;

export function parseSceneVisualContract(data: unknown): SceneVisualContract {
  const result = SceneVisualContractSchema.safeParse(data);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - [${issue.path.join('.') || 'root'}]: ${issue.message}`)
      .join('\n');
    throw new Error(`SCENE_VISUAL_CONTRACT_INVALID: O contrato visual de cena violou o schema Zod:\n${errorDetails}`);
  }
  return result.data;
}
