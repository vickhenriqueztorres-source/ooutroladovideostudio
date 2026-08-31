# Image Generation — Contratos e Schemas

Fonte: `core/contracts/image-generation.ts` e `core/schemas/image-generation.ts`.

## Entrada — `ImageGenerationInput`

| Campo | Tipo | Validação |
| --- | --- | --- |
| `status` | `"PROVIDER_PLAN_APPROVED"` | literal obrigatória |
| `references` | `ReferenceManifest[]` | reusa o contrato do Prompt Pack |
| `imageSpecs` | `ImagePromptSpec[]` | reusa o contrato do Prompt Pack |
| `evidenceSpecs` | `EvidencePromptSpec[]` | evidência nunca gerada |
| `providerExecutionPlan` | `ProviderExecutionPlan` | plano aprovado a montante |
| `productionConstraints` | `ImageProductionConstraints` | budget, threshold, output dir |
| `calibrationReports` | `CalibrationReport[]` | por provider/runtime/adapter/classe |

`ImageGenerationInputSchema` valida a entrada e lança em `status` incorreto ou campos ausentes.

## Saída — `ImagePack`

Status: `DRAFT | NEEDS_REVIEW | BLOCKED | APPROVED_FOR_VIDEO`.

Coleções principais: `referenceAssets`, `generatedAssets`, `approvedStartFrames`,
`approvedInserts`, `approvedAtmosphereAssets`, `rejectedAssets`, `comparisonSets`,
`calibrationReports`, `retryHistory`, `providerAdherence`, `visualQC`, `budgetUsage`.

`ImagePackSchema` exige `sha256` de 64 chars em assets/start frames e `simulated: true`
em todo asset gerado, garantindo que nenhum asset real seja produzido em testes.

## Reference Pack

`CharacterReference`, `LocationReference`, `ObjectReference`, `StyleReference`.
Somente `status: "APPROVED"` pode alimentar geração.

## Start Frame Registry

`StartFrameRegistryEntry` com `sha256`, `allowedMotion`, `forbiddenMotion`,
`preservedAttributes` e `visualQCId`. O agente de vídeo consome só entries `APPROVED`.

## Adherence Score

`AdherenceScore` multidimensional. `weightedOverall(assetType, score)` aplica pesos por classe
(START_FRAME, INSERT, ATMOSPHERE, REFERENCE).
