# Contratos do Edit Blueprint

`EditBlueprint` contém sequences, shots, asset requests, continuity bible, transition plan, narration map, sound intent map, production budget, dependency graph e QC.

## Invariantes principais

- intervalos têm duração positiva e coerente;
- representação sintética exige rótulo;
- todo shot referencia um asset request;
- todo asset request informa `downstreamAgent` e critérios de rejeição;
- toda transição informa uma razão narrativa/visual;
- aprovação é inválida quando `blockingErrors` não está vazio.

Os tipos estão em `core/contracts/edit-blueprint.ts`; os schemas Zod em `core/schemas/edit-blueprint.ts`.
