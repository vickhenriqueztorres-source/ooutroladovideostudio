# Arquitetura da Fundação

## Invariantes

1. Entradas de fronteira são validadas por schemas Zod.
2. Toda mudança de fase passa pela state machine central.
3. IDs duplicados e registros ausentes geram erros explícitos.
4. Snapshots de checkpoint são cópias profundas e não compartilham mutação com o chamador.
5. O core depende somente de interfaces, nunca de Codex, Antigravity, Claude Code, OpenRouter ou provider concreto.
6. Artefatos produzidos devem ser registrados no `ArtifactRegistry` e referenciados por `artifactIds`.

## Fluxo mínimo

`createProject` cria um projeto em `CREATED`. `openRun` captura a fase vigente. `dispatch` salva um checkpoint prévio, constrói e valida o `AgentTask`, delega ao `RuntimeAdapter`, valida a transição solicitada e persiste projeto/run. Por fim, salva um checkpoint final; erros produzem run `FAILED`, blocking error, log e checkpoint recuperável.

## Extensão

Persistência em arquivo ou banco implementa `Registry`/`CheckpointStore`. Novos ambientes implementam `RuntimeAdapter`; providers implementam `ProviderAdapter`; agentes implementam `Agent`. Nenhuma dessas extensões exige alteração dos contratos ou do control plane.
