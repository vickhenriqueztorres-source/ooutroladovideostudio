# Contratos editoriais

Todos os objetos persistidos possuem schema validável por Zod. Os contratos base permanecem na versão `1.0.0`.

## Principais schemas

- `TopicBrief`: briefing, runtime e restrições de produção/editoriais.
- `TopicCandidate`: score/confiança entre 0 e 1; `GREENLIT` requer confiança mínima de 0,70 e nenhum bloqueio.
- `EvidenceClaim`: union por `classification`; `VERIFIED` exige fonte e `UNSUPPORTED` exige `status: REMOVE`.
- `EvidenceMatrix`: não pode ser `VERIFIED` com claim sem fonte ou unsupported.
- `VisualJob`, `AssetRequest` e `TransitionPlan`: unions discriminadas por `kind`.
- `ScriptBeat`: tempo positivo, função dramática, objetivos, narração, evidência, visual e pós-produção.
- `OpenLoop`: `CLOSED` exige beat de destino e claim de resposta.
- `ScriptQC`: `SCRIPT_APPROVED` não admite finding bloqueante.
- `ScriptPackage`: aprovação exige QC aprovado e zero `blockingErrors`.

Referência de implementação: `core/contracts/editorial.ts` e `core/schemas/editorial.ts`.
