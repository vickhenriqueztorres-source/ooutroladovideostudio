# Runbook — Packaging & Distribution

## Pré-condições

1. Confirme projeto em `MASTER_APPROVED`.
2. Confirme `AssemblyPack.status: DELIVERY_APPROVED` e `RenderManifest.status: RENDERED`.
3. Recalcule os hashes do `MasterApprovalReceipt`.
4. Confirme fontes, claims, Evidence Matrix, perfil do tópico, perfil do canal, políticas e estratégia.

## Execução

1. Execute `runPackaging(input, adapter)` ou `PackagingControlPlane.execute(input)`.
2. Verifique `blockingErrors` antes de considerar scores agregados.
3. Revise as três thumbnails em 3840×2160 e suas prévias 320×180.
4. Revise os três pares de título+thumbnail e confirme a promessa no primeiro minuto.
5. Revise descrição, tags, capítulos e os 3–5 cortes verticais.
6. Confirme `policyValidation.status: APPROVED` e manifest `READY_FOR_REVIEW`.
7. Registre a seleção humana com IDs pareados, revisor e timestamp.
8. Reexecute com `publishApproval`; confirme `DELIVERY_APPROVED` e `READY_FOR_PUBLISH`.

## Falhas e retomada

Use o último item de `checkpointTrail` para identificar o estágio. Corrija a entrada, incremente `packagingVersion` quando o pacote aprovado mudar e reexecute. Não sobrescreva um pacote aprovado.

## Proibições

- não inventar claims, números, imagens ou fontes;
- não alterar o vídeo final;
- não publicar automaticamente;
- não gravar artefatos mock em `outputs/`;
- não aceitar seleção humana com título e thumbnail de pares diferentes.

## Comandos de validação

```bash
pnpm exec vitest run tests/packaging.test.ts tests/packaging-integration.test.ts
pnpm typecheck
pnpm test
pnpm build
git status --short -- outputs/
```
