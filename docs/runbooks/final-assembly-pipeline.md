# Runbook — Final Assembly

## Execução
1. Confirme projeto em `AUDIO_APPROVED`.
2. Valide hashes e status dos três inputs.
3. Compile a timeline sem reordenação.
4. Resolva assets somente pelos packs.
5. Verifique sync, captions, labels e evidências.
6. Execute preview mock e Assembly QC.
7. Execute final mock somente sem bloqueios.
8. Persista checkpoint e avance para `MASTER_APPROVED`.

## Falha
Não trunque, substitua ou esconda divergências. Corrija o input responsável e gere nova versão; não altere AssemblyPack aprovado.

## Outputs
O caminho é versionado em `outputs/<project>-final-<version>.mp4`. O mock não cria nem sobrescreve esse arquivo. Publicação e distribuição pertencem ao Packaging Agent.

## Retomada
Reexecute com a mesma chave para recuperar o resultado imutável. Mudanças em blueprint, packs ou profile criam nova chave.
