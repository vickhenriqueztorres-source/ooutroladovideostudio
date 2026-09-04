import { z } from 'zod';

export const REQUIRED_EPISODE_STAGES = [
  'narration',
  'visuals',
  'sfx',
  'music',
  'mix',
  'thumbnail',
  'render',
  'cinematic_grade'
] as const;

export const EpisodeStageSchema = z.enum(REQUIRED_EPISODE_STAGES);
export type EpisodeStage = z.infer<typeof EpisodeStageSchema>;

export const StartFramePeoplePolicySchema = z.enum(['FORBIDDEN', 'CONTEXTUAL']);
export type StartFramePeoplePolicy = z.infer<typeof StartFramePeoplePolicySchema>;

export const VisualMixSchema = z.object({
  targetPercentages: z.object({
    realisticImages: z.number().min(0).max(100),
    videos: z.number().min(0).max(100),
    motionGraphics: z.number().min(0).max(100),
    motionImages: z.number().min(0).max(100)
  }).refine(
    (mix) => Math.abs(
      mix.realisticImages + mix.videos + mix.motionGraphics + mix.motionImages - 100
    ) < 0.001,
    { message: "Os percentuais de 'visualMix.targetPercentages' devem somar 100%." }
  ),
  plannedCounts: z.object({
    realisticImages: z.number().int().nonnegative(),
    videos: z.number().int().nonnegative(),
    motionGraphics: z.number().int().nonnegative(),
    motionImages: z.number().int().nonnegative()
  })
});
export type VisualMix = z.infer<typeof VisualMixSchema>;

export const RawEpisodeContractInputSchema = z.object({
  episodeId: z
    .string()
    .min(1, "O campo 'episodeId' não pode ser vazio.")
    .regex(/^[a-zA-Z0-9_-]+$/, "O campo 'episodeId' deve ser um slug válido (apenas letras, números, '_' ou '-')."),
  
  title: z
    .string()
    .min(1, "O campo 'title' não pode ser vazio."),

  theme: z
    .string()
    .min(1, "O campo 'theme' não pode ser vazio."),

  domainTags: z
    .array(z.string().min(1, "Tag de domínio não pode ser vazia."))
    .min(3, "O campo 'domainTags' deve conter no mínimo 3 tags de domínio."),

  targetDurationSeconds: z
    .number()
    .positive("O campo 'targetDurationSeconds' deve ser um número positivo maior que zero."),

  minDurationRatio: z
    .number()
    .min(0, "O campo 'minDurationRatio' deve ser >= 0.")
    .max(1, "O campo 'minDurationRatio' deve ser <= 1.")
    .default(0.9),

  minScenes: z
    .number()
    .int("O campo 'minScenes' deve ser um número inteiro.")
    .positive("O campo 'minScenes' deve ser maior que zero."),

  requiredStages: z
    .array(EpisodeStageSchema)
    .refine(
      (stages) => {
        const stageSet = new Set(stages);
        return REQUIRED_EPISODE_STAGES.every((req) => stageSet.has(req));
      },
      {
        message: `O campo 'requiredStages' DEVE conter no mínimo todas as ${REQUIRED_EPISODE_STAGES.length} etapas obrigatórias: [${REQUIRED_EPISODE_STAGES.join(', ')}].`
      }
    ),

  voiceProfile: z
    .string()
    .min(1, "O campo 'voiceProfile' não pode ser vazio."),

  musicMood: z
    .string()
    .min(1, "O campo 'musicMood' não pode ser vazio."),

  sfxDensity: z
    .string()
    .min(1, "O campo 'sfxDensity' não pode ser vazio."),

  outputDir: z.string().optional(),

  visualMix: VisualMixSchema.optional(),

  startFramePeoplePolicy: StartFramePeoplePolicySchema.default('CONTEXTUAL')
}).superRefine((data, ctx) => {
  if (!data.visualMix) return;
  const counts = data.visualMix.plannedCounts;
  const total = counts.realisticImages + counts.videos + counts.motionGraphics + counts.motionImages;
  if (total !== data.minScenes) {
    ctx.addIssue({
      code: 'custom',
      path: ['visualMix', 'plannedCounts'],
      message: `A soma dos plannedCounts (${total}) deve ser igual a minScenes (${data.minScenes}).`
    });
  }
});

export type RawEpisodeContractInput = z.infer<typeof RawEpisodeContractInputSchema>;

export interface EpisodeContract {
  episodeId: string;
  title: string;
  theme: string;
  domainTags: string[];
  targetDurationSeconds: number;
  minDurationRatio: number;
  minScenes: number;
  requiredStages: EpisodeStage[];
  voiceProfile: string;
  musicMood: string;
  sfxDensity: string;
  outputDir: string;
  visualMix?: VisualMix;
  startFramePeoplePolicy: StartFramePeoplePolicy;
}

export function parseEpisodeContract(jsonPathOrData: string | unknown): EpisodeContract {
  let rawData: unknown;
  let sourceLabel = 'input_object';
  const nodePath = require('path');
  const nodeFs = require('fs');

  if (typeof jsonPathOrData === 'string') {
    sourceLabel = jsonPathOrData;
    const resolvedPath = nodePath.isAbsolute(jsonPathOrData)
      ? jsonPathOrData
      : nodePath.resolve(process.cwd(), jsonPathOrData);

    if (!nodeFs.existsSync(resolvedPath)) {
      throw new Error(`EPISODE_CONTRACT_FILE_NOT_FOUND: O arquivo de contrato '${resolvedPath}' não existe no disco.`);
    }

    try {
      const fileContent = nodeFs.readFileSync(resolvedPath, 'utf8');
      rawData = JSON.parse(fileContent);
    } catch (err: any) {
      throw new Error(`EPISODE_CONTRACT_JSON_CORRUPTED: Falha ao ler/parsear JSON de '${resolvedPath}': ${err.message}`);
    }
  } else {
    rawData = jsonPathOrData;
  }

  const parseResult = RawEpisodeContractInputSchema.safeParse(rawData);

  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues
      .map((issue) => `  - [${issue.path.join('.') || 'root'}]: ${issue.message}`)
      .join('\n');
    throw new Error(`EPISODE_CONTRACT_INVALID: O contrato de episódio em '${sourceLabel}' violou o schema Zod:\n${errorDetails}`);
  }

  const validData = parseResult.data;

  // Derivação obrigatória e estrita do outputDir a partir de runs/<episodeId>/
  const expectedOutputDir = nodePath.join(process.cwd(), 'runs', validData.episodeId);
  const normalizedExpected = nodePath.normalize(expectedOutputDir).toLowerCase();

  if (validData.outputDir) {
    const normalizedProvided = nodePath.isAbsolute(validData.outputDir)
      ? nodePath.normalize(validData.outputDir).toLowerCase()
      : nodePath.normalize(nodePath.resolve(process.cwd(), validData.outputDir)).toLowerCase();

    if (normalizedProvided !== normalizedExpected) {
      throw new Error(
        `EPISODE_CONTRACT_FORBIDDEN_OUTPUT_DIR: Caminho 'outputDir' customizado (${validData.outputDir}) é proibido. ` +
        `O outputDir DEVE ser derivado estritamente de 'runs/${validData.episodeId}'.`
      );
    }
  }

  return {
    episodeId: validData.episodeId,
    title: validData.title,
    theme: validData.theme,
    domainTags: validData.domainTags,
    targetDurationSeconds: validData.targetDurationSeconds,
    minDurationRatio: validData.minDurationRatio ?? 0.9,
    minScenes: validData.minScenes,
    requiredStages: validData.requiredStages,
    voiceProfile: validData.voiceProfile,
    musicMood: validData.musicMood,
    sfxDensity: validData.sfxDensity,
    outputDir: expectedOutputDir,
    visualMix: validData.visualMix,
    startFramePeoplePolicy: validData.startFramePeoplePolicy
  };
}
