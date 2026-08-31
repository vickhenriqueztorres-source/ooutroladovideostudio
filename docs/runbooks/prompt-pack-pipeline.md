# Runbook — Prompt Pack

1. Confirme projeto e blueprint em `EDIT_BLUEPRINT_APPROVED`.
2. Execute `PromptPackControlPlane.execute(projectId, blueprint, { taskId })`.
3. Inspecione `blockingErrors`, manifests, factual boundaries, capabilities e budget.
4. Para falha após `PROMPTS_COMPILED`, use `resume(projectId, taskId)`; a cache idempotente evita recompilação.
5. Nunca remova requisito crítico para acomodar provider. Encaminhe ausência crítica para bloqueio ou revisão humana.

## Checkpoints

São persistidos input validado, prompt units compiladas, pack persistido e contexto de falha recuperável com `resumeFrom`. Repetir a mesma task retorna o artefato existente.

## Revisão humana

Revisar referências ausentes, labels de reconstrução/dramatização, integridade de fontes, texto crítico, capacidades indisponíveis e qualquer adaptação com warning antes de uma nova versão.
