# Edit Timeline Compiler

O estágio transforma um `ScriptPackage` aprovado em um `EditBlueprint` determinístico, executável e validado. O core agrupa beats, atribui função dramática, cria cobertura e assets, resolve representação/continuidade, planeja transições e som, calcula dependências e budget e executa QC.

## Garantias

- aceita apenas `SCRIPT_APPROVED`;
- preserva claims, evidências e loops por referência;
- IDs são derivados de run/beat/shot;
- IA representa, mas nunca confirma fatos;
- texto crítico e rótulos ficam em pós-produção;
- erro bloqueante impede `EDIT_BLUEPRINT_APPROVED`;
- o estado global só muda pela state machine.

## Estrutura

- `core/edit-timeline`: funções puras e QC;
- `agents/edit`: agente governado;
- `providers/edit`: planners mock determinísticos;
- `core/control-plane/edit-timeline.ts`: execução, cache, artefatos, logs e retomada;
- `tests/edit-timeline*.test.ts`: cobertura unitária e integrada.
