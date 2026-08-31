# Contratos de Provider Capability

`ProviderCapabilityManifest` registra suporte NATIVE, ADAPTER_EMULATED, PARTIAL, UNKNOWN ou UNSUPPORTED com confiança, evidências, limites e calibração.

`ProviderPromptValidationResult` contém assessments, limites, constraints preservadas/em risco, mapping auditável, rejeição e erros. `ProviderAdaptationPlan` registra diff, impacto e aprovação; `ProviderExecutionPlan` apenas prepara jobs idempotentes sem executá-los.

`ProviderValidationQC` impede autorização ausente, manifest inválido, calibração incompatível, capability crítica incerta, omissão silenciosa, evidência reinterpretada ou plano inseguro.
