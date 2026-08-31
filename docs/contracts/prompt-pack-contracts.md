# Contratos do Prompt Pack

`PromptPack` agrega unidades normalizadas, manifests, specs especializadas, capabilities, grafo, budget e `PromptPackQC`. `PromptUnit` contém blocos semânticos; uma string renderizada é apenas derivada para adapters.

## Referências e continuidade

`ReferenceManifest` registra papel, status, locks e drift proibido. Somente `APPROVED` pode ancorar geração; `REFERENCE_REQUIRED` e `MISSING` bloqueiam. Locks estritos nunca são degradados silenciosamente.

## Specs

- `ImagePromptSpec`: finalidade, referências, locks, formato e política de texto.
- `VideoPromptSpec`: start frame versionado, hash, duração, estados e movimento.
- `MotionPromptSpec`: função, nós, arestas, camadas, ordem e integridade.
- `EvidencePromptSpec`: fontes, classificação, tratamentos e checks.
- `ScreenPromptSpec`: interface brandless, rótulo e limites de similaridade.

## Gates

Toda unidade exige função editorial, representação, factual boundary, capability, negative constraints, requisitos de validação e critérios de rejeição. Erro crítico prevalece sobre score.
