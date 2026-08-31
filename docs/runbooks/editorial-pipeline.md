# Runbook do pipeline editorial

## Executar e testar

Use `pnpm test`. O happy path mock está em `tests/editorial-pipeline.test.ts`; as fixtures ficam em `tests/fixtures` e são identificadas como MOCK.

## Inspecionar checkpoints

Use `CheckpointManager.listByRun(runId)` para a linha do tempo e `recover(checkpointId)` para ler o snapshot. O snapshot informa `stage`, `phase`, task e artifact. `EditorialControlPlane.resume(checkpointId, brief)` continua a mesma run e reutiliza tarefas já concluídas.

## Interpretar bloqueios

- `HUMAN_REQUIRED`: confiança abaixo da política ou decisão que não pode ser automatizada.
- `NEEDS_RESEARCH`: fonte ausente, claim unsupported ou matriz insuficiente.
- `NEEDS_SCRIPT_REVISION`: loop, runtime, beat, asset ou budget inválido.
- `BLOCKED`: impedimento sem próximo passo automatizado.

Consulte `ScriptQC.findings`, `blockingReasons`, `run.blocked` e o último checkpoint.

## Adicionar agente

Implemente `Agent`, valide input/output por Zod, registre no `AgentRegistry` e adicione o estágio ao control plane com checkpoint e artefato. Nunca atualize estado global diretamente.

## Trocar model/provider

Implemente uma interface em `providers/editorial` e injete no agente correspondente. Adaptadores de Codex, Antigravity ou Claude Code pertencem a `runtimes/`; nenhuma decisão editorial deve ser duplicada neles.
