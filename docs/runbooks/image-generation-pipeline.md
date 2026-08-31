# Runbook — Image Generation & Visual QC

Etapa do pipeline BRECHA que produz, valida, seleciona e versiona imagens,
referências, inserts e start frames aprovados para alimentar o agente de vídeo.

## Posição no pipeline

```
EDIT_BLUEPRINT_APPROVED
  -> PROMPT_PACK_APPROVED
  -> PROVIDER_PLAN_APPROVED
  -> REFERENCES_APPROVED
  -> [Image Generation & Visual QC]  <-- esta etapa
  -> START_FRAMES_APPROVED
  -> VIDEO_GENERATION
```

## Entradas obrigatórias

- `status === "PROVIDER_PLAN_APPROVED"`
- Prompt Pack aprovado (`promptPackId`)
- Provider execution plan aprovado (`providerPlanId`)
- `references[]` com status `APPROVED` (ou explicitamente `REFERENCE_REQUIRED`)
- `imageSpecs[]` e `evidenceSpecs[]`
- `productionConstraints` com `outputDirectory`, `maxJobs` e `approvalThreshold`

## Sequência de estados

```
REFERENCES_VALIDATED
  -> CALIBRATION_PASSED
  -> IMAGE_JOBS_EXECUTED
  -> VISUAL_QC_COMPLETED
  -> START_FRAMES_REGISTERED
  -> IMAGE_PACK_APPROVED
```

Retornos negativos: `IMAGE_NEEDS_REVIEW`, `IMAGE_BLOCKED`, `HUMAN_REQUIRED`.
A transição de projeto só avança para `START_FRAMES_APPROVED` quando o pack sai
`APPROVED_FOR_VIDEO`.

## Gates (ordem fixa)

1. Reference — resolve âncoras aprovadas; referência ausente/rejeitada bloqueia.
2. Calibration — provider/runtime/adapter novo precisa de calibração POR classe de asset.
3. Generation — executa só o job aprovado; nunca altera prompt/refs sem nova versão.
4. Comparison — adherence multidimensional vs. referências, bíblia visual, continuidade e boundary factual.
5. Approval — `APPROVED` / `REVIEW_REQUIRED` / `REJECTED`.
6. Propagation — só `APPROVED` alimenta vídeo, vira referência canônica ou entra no registry.

## Hard fails (bloqueiam independentemente do score)

`IMAGE_IDENTITY_DRIFT`, `IMAGE_WARDROBE_CONFLICT`, `IMAGE_LOCATION_DRIFT`,
`IMAGE_OBJECT_GEOMETRY_CHANGED`, `IMAGE_WRONG_PERIOD`, `IMAGE_PALETTE_CONFLICT`,
`IMAGE_LIGHTING_CONFLICT`, `IMAGE_NARRATIVE_FUNCTION_MISSING`,
`IMAGE_EVIDENCE_INVENTED`, `IMAGE_EVIDENCE_ALTERED`,
`IMAGE_CRITICAL_TEXT_UNREADABLE`, `IMAGE_ANATOMICAL_DEFORMATION`,
`IMAGE_START_FRAME_UNFIT`, `IMAGE_MOTION_SPACE_MISSING`,
`IMAGE_REPRESENTATION_AMBIGUOUS`, `IMAGE_UNAPPROVED_REFERENCE_USED`,
`IMAGE_PROVIDER_NOT_CALIBRATED`.

Qualquer hard fail em qualquer asset força o pack a `BLOCKED` / `NEEDS_REVIEW`,
nunca `APPROVED_FOR_VIDEO`.

## Política de evidência

- `REAL_EVIDENCE`: nunca gerar/reconstruir; preservar source; registrar hash; só tratamento autorizado.
- `RECONSTRUCTION` / `DRAMATIZATION`: exigem label; não confirmam claim factual.
- `FICTIONAL_INTERFACE`: brandless; texto crítico em pós-produção.

## Texto crítico

Por padrão não é gerado dentro da imagem (`renderCriticalTextInPost: true`).
Nomes, datas, valores, URLs, números e labels de fonte vão para pós-produção.

## Retry controlado

Cada retry tem `reasonCode`, `changedFields` e `preservedFields` (locks preservados).
Não há retry para: evidência alterada, representação ambígua, provider incompatível,
referência crítica ausente, texto de source ilegível, provider não calibrado.

## Checkpoints

`REFERENCES_VALIDATED`, `CALIBRATION_COMPLETED`, `REFERENCE_ASSETS_APPROVED`,
`START_FRAME_JOBS_CREATED`, `START_FRAMES_GENERATED`, `START_FRAMES_QC_COMPLETED`,
`START_FRAME_REGISTRY_UPDATED`, `INSERTS_QC_COMPLETED`, `IMAGE_PACK_PERSISTED`,
`IMAGE_PACK_APPROVED`.

Retomada: não repetir calibração sem mudança de provider/runtime/versão; nunca
reprocessar assets aprovados sem mudança de versão.

## Idempotência

```
imageJobKey = sha256(
  projectId + promptId + promptVersion + promptHash +
  providerId + runtime + adapterVersion +
  referenceManifestId + referenceAssetHashes + parameters
)
```

Mesma entrada retorna o asset já validado; a task não gera duplicatas.

## Segurança

Logs não expõem credenciais, tokens, cookies ou payloads de provider. O adapter é
a única fronteira com o provider; o core permanece agnóstico de provider/runtime/IDE.
Nenhum asset real é gerado nos testes.
