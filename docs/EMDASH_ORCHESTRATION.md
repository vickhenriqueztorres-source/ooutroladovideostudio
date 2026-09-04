# Orquestração com Emdash e Codex

## Objetivo

O Emdash supervisiona tarefas, terminais, branches e worktrees. O Codex executa cada tarefa e pode delegar subtarefas aos agentes especializados de `.codex/agents`. O orquestrador TypeScript continua sendo a autoridade para a produção de episódios.

Essa separação evita transformar cada classe de domínio em um processo independente e mantém contratos, checkpoints e gates determinísticos no centro do sistema.

## Arquitetura operacional

| Camada | Responsabilidade |
|---|---|
| Emdash | Cria uma branch e uma worktree por tarefa, mantém terminais e mostra diffs. |
| Codex principal | Entende a solicitação, coordena o trabalho e integra os resultados. |
| Agentes Codex | Fazem exploração, arquitetura, implementação, QA ou operação de produção em escopos delimitados. |
| Pipeline TypeScript | Executa contratos, checkpoints, providers, render e gates da produção. |
| Gate humano | Aprova decisões editoriais, start frames, dispatch pago, seleção final e publicação. |

## Papéis disponíveis

- `code_mapper`: exploração somente leitura.
- `pipeline_architect`: arquitetura e desenho de mudanças, somente leitura.
- `implementation_worker`: implementação delimitada em uma worktree.
- `qa_gatekeeper`: validação independente sem corrigir o próprio patch.
- `production_operator`: execução serial de uma run real, apenas com autorização explícita.

## Regras de concorrência

Pode rodar em paralelo:

- mapeamento de código;
- pesquisa e arquitetura;
- implementações em módulos distintos;
- testes direcionados e revisão de diffs.

Deve rodar de forma serial:

- Firefly e sessões de navegador;
- ElevenLabs e outros provedores pagos;
- escrita em `runs/` e `public/editorial/execution/` para a mesma run;
- render Remotion que compartilhe GPU ou mídia;
- seleção final, upload e publicação.

O limite inicial é de quatro subagentes por sessão. Aumente apenas depois de medir RAM, CPU, espaço em disco e conflitos.

## Configuração recomendada no Emdash

1. Adicione a raiz deste repositório como projeto.
2. Mantenha worktrees habilitadas.
3. Use um diretório fora do OneDrive, por exemplo `C:\Users\brend\emdash\worktrees`.
4. Use `origin/feature/full-e2e-real` como base enquanto essa for a branch padrão do remoto.
5. Selecione Codex como provider e atualize a detecção em Settings quando necessário.
6. O `.emdash.json` copia apenas arquivos `.env*` locais e executa `npm ci` ao preparar uma worktree.

Não crie tarefas paralelas a partir de um checkout com alterações ainda não consolidadas: worktrees nascem do commit selecionado e não recebem automaticamente o estado não commitado do checkout principal.

## Modelo de fluxo para mudança de código

1. Tarefa de análise: peça ao `code_mapper` e ao `pipeline_architect` um mapa e um plano.
2. Tarefa de implementação: entregue um único objetivo ao `implementation_worker`.
3. Tarefa de QA: peça ao `qa_gatekeeper` para revisar a branch contra a base e executar gates direcionados.
4. Revise o diff no Emdash e integre somente após os gates passarem.

Prompt inicial sugerido:

```text
Mapeie esta solicitação com code_mapper e pipeline_architect. Depois implemente apenas o plano aprovado com implementation_worker. Peça ao qa_gatekeeper uma revisão independente. Preserve alterações preexistentes e não execute produção real nem provedores externos.
```

## Modelo de fluxo para produzir um episódio

A produção real deve usar um único checkout operacional e um único `production_operator`.

```powershell
npm run firefly:doctor
npm run produce:episode -- --episode=<slug> --dry-run
```

Depois do dry-run e dos gates humanos, autorize explicitamente a execução real:

```powershell
npm run produce:episode -- --episode=<slug> --runId=<RUN_ID>
```

Nunca rode duas produções reais da mesma run em worktrees diferentes. Artefatos de mídia, credenciais, perfis de navegador e decisões humanas não devem ser tratados como código concorrente.

## Bloqueio atual antes da primeira tarefa paralela

O checkout principal precisa estar limpo ou ter um commit de integração deliberado. Antes disso, o Emdash pode cadastrar o projeto, mas tarefas em worktrees enxergarão apenas o último commit e não as alterações locais atuais.

