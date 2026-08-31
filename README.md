# BRECHA Platform

Plataforma multiagente governada por contratos para produção documental cinematográfica. O core usa estado explícito, registries, artefatos e checkpoints recuperáveis sem conhecer Codex, Antigravity, Claude Code, OpenRouter ou qualquer provider.

## Arquitetura

- `core/contracts` e `core/schemas`: contratos base e editoriais validados por Zod.
- `core/state-machine`: única autoridade para transições globais.
- `core/editorial`: políticas puras de duração, budget e Script QC.
- `core/edit-timeline`: compiler determinístico de sequences, shots, assets, continuidade, transições, som, budget, dependências e Edit QC.
- `core/prompt-pack`: compiler provider-agnostic de prompt units, referências, boundaries factuais, specs, capabilities, dependências, budget e Prompt QC.
- `core/control-plane`: execução governada, idempotência, retomada e observabilidade.
- `agents/strategy` e `agents/editorial`: Topic Scout, Topic Greenlight, Research Integrity, Documentary Script Compiler e Script QC.
- `providers/editorial`: interfaces e mocks determinísticos.
- `core/registry` e `core/checkpoints`: persistência inicial em memória.
- `outputs`: acervo original do BRECHA, preservado sem alterações.

## Pipeline editorial mock

```text
Topic Scout -> Topic Greenlight -> Research Integrity
-> Documentary Script Compiler -> Script QC
-> SCRIPT_APPROVED | HUMAN_REQUIRED | BLOCKED
-> Edit Timeline Compiler -> Edit QC -> EDIT_BLUEPRINT_APPROVED | NEEDS_REVISION | BLOCKED
-> Prompt Pack Compiler -> Prompt Pack QC -> PROMPT_PACK_APPROVED | NEEDS_REVISION | BLOCKED
```

O cenário executável está coberto em `tests/editorial-pipeline.test.ts`. Ele cria/reutiliza o projeto, abre uma run, valida cada tarefa e resultado, registra cinco artefatos, cria checkpoints antes/depois de cada agente e aplica `CREATED -> TOPIC_APPROVED -> SCRIPT_APPROVED` apenas pela state machine.

## Comandos

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

## Implementado

- contratos base compatíveis e contratos editoriais com unions discriminadas;
- Evidence Matrix com `VERIFIED`, `INFERRED`, `UNCERTAIN` e `UNSUPPORTED`;
- roteiro audiovisual com beats, evidências, loops, visual jobs, assets, budget, som e continuidade;
- estimativa configurável de narração e tolerância de runtime;
- gates de confiança, integridade factual, payoff, filmabilidade e budget;
- providers mock determinísticos sem URLs ou fatos inventados;
- pipeline idempotente e retomável por checkpoint;
- logs estruturados para início, validação, QC, checkpoint, transição, bloqueio e conclusão;
- fixtures positiva e negativa explicitamente marcadas como MOCK.

## Limites desta fase

Não há geração real de imagem, vídeo, voz ou áudio; browser automation; assembly; provider externo; fila; banco durável ou UI operacional. A persistência em memória é deliberada para o bootstrap e pode ser substituída pelas interfaces existentes.

Consulte `docs/editorial-pipeline.md`, `docs/edit-timeline-compiler.md`, `docs/prompt-pack-compiler.md`, `docs/contracts/prompt-pack-contracts.md` e `docs/runbooks/prompt-pack-pipeline.md`.
