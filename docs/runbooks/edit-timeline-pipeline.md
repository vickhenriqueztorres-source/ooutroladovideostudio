# Runbook — Edit Timeline Pipeline

1. Confirme que projeto e script estão em `SCRIPT_APPROVED`.
2. Registre `EditTimelineCompilerAgent` no `AgentRegistry`.
3. Abra a execução com `EditTimelineControlPlane.execute` e um `taskId` estável.
4. Inspecione o artefato `edit-blueprint`, o checkpoint final e eventos `edit.*`.
5. Se o QC falhar, corrija script/constraints e reexecute com uma nova task.
6. Se a execução falhar após o checkpoint, use `resume(checkpointId)`.

A repetição do mesmo `taskId` retorna o blueprint em cache sem criar artefato duplicado. Falhas mantêm o projeto em `SCRIPT_APPROVED`; somente QC aprovado aplica `SCRIPT_APPROVED -> EDIT_BLUEPRINT_APPROVED`.
