# Contratos do Packaging & Distribution Agent

## PackagingInput

`PackagingInput` combina governança do master com estratégia editorial e de distribuição:

```json
{
  "schemaVersion": "1.0.0",
  "projectId": "brecha-0001",
  "runId": "run-packaging-0001",
  "episodeId": "episode-0001",
  "packagingVersion": "1.0.0",
  "masterApprovalReceipt": { "state": "MASTER_APPROVED" },
  "assemblyPack": { "status": "DELIVERY_APPROVED" },
  "renderManifest": { "status": "RENDERED" },
  "topicProfile": {},
  "channelProfile": {},
  "platformPolicies": {},
  "distributionStrategy": {
    "primaryPlatform": "youtube",
    "secondaryPlatforms": ["tiktok", "instagram"],
    "publishMode": "manual",
    "scheduledTime": null
  },
  "thumbnailConcepts": [
    { "role": "MECHANISM" },
    { "role": "CONSEQUENCE" },
    { "role": "FINAL_HANDOFF" }
  ],
  "titleSeeds": [{}, {}, {}],
  "publishApproval": null
}
```

O schema Zod bloqueia ausência dos perfis, políticas, estratégia, três conceitos ou seeds. A validação semântica recompõe hashes e bloqueia qualquer mutação posterior ao master aprovado.

## PackagingPack

O resultado mantém `status: PACKAGING_READY` para o estado global e separa a aprovação de entrega em `deliveryStatus`:

```json
{
  "packagingPackId": "packaging-...",
  "status": "PACKAGING_READY",
  "deliveryStatus": "HUMAN_SELECTION_REQUIRED",
  "metadata": {
    "titleCandidates": [],
    "thumbnailOptions": [],
    "recommendedSelection": {},
    "description": {},
    "tagBundle": {},
    "chapters": [],
    "shortsCuts": {},
    "policyValidation": {},
    "publishingManifest": {},
    "metadataHash": "sha256:..."
  },
  "checkpointTrail": [],
  "publishAuthorized": false,
  "nextAgent": "HUMAN_REVIEW"
}
```

## Gates obrigatórios

- `PromiseAlignmentGate`: título, headline, hook, evidência e payoff pertencem à mesma promessa.
- `ThumbnailTechnicalQaGate`: três conceitos distintos, headline de 1–5 palavras, contraste, safe area, paleta, legibilidade mobile e lineage.
- `PublicationPackagingQaGate`: títulos honestos, SEO, capítulos, Shorts, disclosures, políticas e manifest íntegros.
- `HumanSelectionGate`: permanece `HUMAN_SELECTION_REQUIRED` até uma combinação A/B/C ser aprovada por pessoa identificada.

## Idempotência

`packagingJobKey` deriva de `projectId`, hash do `AssemblyPack`, hash da estratégia de distribuição e `packagingVersion`. O control plane armazena o resultado em cache e não recria checkpoints ao retomar a mesma entrada. Mudanças exigem incremento da versão e produzem novo pacote.
