# Runbook — Provider Capability Pipeline

1. Confirmar PROMPT_PACK_APPROVED e autorização explícita.
2. Fixar providerId, adapterVersion, manifestVersion e policyVersion.
3. Validar manifest, calibração e limites.
4. Avaliar cada PromptUnit e criar mappings com hash.
5. Bloquear capabilities críticas e evidência não preservável.
6. Registrar adaptações semânticas como proibidas e demais como revisão.
7. Persistir checkpoint PROMPTS_ASSESSED.
8. Executar QC e criar execution plan somente quando seguro.
9. Transicionar para PROVIDER_PLAN_APPROVED.

Na retomada, reutilizar a mesma chave idempotente e o mesmo manifest. Provider alternativo exige autorização e nova execução completa.
