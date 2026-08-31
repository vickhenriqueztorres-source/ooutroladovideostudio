# Provider Capability Validation

Valida um provider explicitamente autorizado contra cada PromptUnit, sem escolher provider, alterar PromptPack ou enviar jobs.

## Severidade

- CRITICAL parcial, desconhecida ou ausente: bloqueio.
- REQUIRED parcial: adaptação auditável e revisão.
- PREFERRED ausente: warning/revisão.

Evidência exige preservação nativa; vídeo protege start frame; texto crítico continua em pós-produção. O execution plan contém somente referências de payload, idempotency keys e gates pre/postflight.

## Garantias

A validação é determinística, imutável, versionada e retomável. Fallback alternativo requer autorização e nova validação completa; nenhuma adaptação pode alterar significado editorial ou factual.
