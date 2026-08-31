# BRECHA Platform

Fundação do control plane para uma plataforma multiagente de produção documental cinematográfica. O sistema governa projetos por contratos versionados, estado explícito, registries de artefatos e checkpoints recuperáveis, sem acoplar lógica de negócio a runtimes ou providers.

## Arquitetura

- `core/contracts` e `core/schemas`: contratos compartilhados e validação Zod.
- `core/state-machine`: estados e transições permitidas do pipeline.
- `core/registry`: registries em memória para projetos, runs, artefatos e checkpoints.
- `core/checkpoints`: snapshots imutáveis e metadata de recuperação.
- `core/control-plane`: criação, despacho governado, logs e checkpoints.
- `agents`: pontos de extensão e `MockAgent` da fundação.
- `providers`: interfaces para drivers LLM, imagem, vídeo, áudio e browser.
- `runtimes`: adaptadores para ambientes de execução; o core desconhece cada runtime.
- `apps`: superfícies futuras de API, console e worker.
- `outputs`: acervo estratégico, visual e de pesquisa do BRECHA.

## Comandos

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

## Implementado nesta fase

- dez contratos base com `schemaVersion` e campos de governança;
- schemas Zod validáveis em runtime;
- state machine global com transições explícitas e função pura;
- registries em memória com criação, atualização, leitura, listagem e proteção contra duplicidade;
- checkpoint manager com snapshots, recuperação, flags e causa;
- logger estruturado em memória;
- interfaces `Agent`, `RuntimeAdapter`, `ProviderAdapter`, `CheckpointStore`, `Registry`, `StateMachine` e `Logger`;
- control plane mínimo com projeto, run, `MockAgent`, checkpoints antes/depois e estado final;
- testes de contratos, estado, registries, checkpoints e happy path.

A memória foi escolhida para o bootstrap por manter testes determinísticos e o núcleo livre de I/O. As interfaces permitem adicionar stores duráveis sem alterar os consumidores.

## Fora do escopo

Ainda não há providers reais, geração de imagem/vídeo/voz, assembly, filas, persistência durável, UI operacional, agentes criativos finais ou adaptadores concretos para Codex, Antigravity, Claude Code e OpenRouter. Esses ambientes serão conectados exclusivamente por adaptadores.

Consulte [`docs/architecture.md`](docs/architecture.md) para invariantes e fluxo de execução.
