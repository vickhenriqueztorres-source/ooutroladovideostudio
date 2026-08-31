# Packaging & Metadata QC

O módulo `core/packaging` consome exclusivamente um `MasterApprovalReceipt` válido, o `AssemblyPack` em `DELIVERY_APPROVED` e o `RenderManifest` em `RENDERED`. Ele recompute os hashes do receipt a partir dos artefatos recebidos e rejeita qualquer divergência antes de compilar metadados.

## Contrato de entrada
O receipt é a única chave que destrava a fase. Ele precisa declarar `state: MASTER_APPROVED`, `nextAgent: PACKAGING_AGENT`, lista de bloqueios vazia e os hashes de timeline, render manifest, captions, evidência e relatório de QC. Hash divergente em timeline, captions, evidência ou QC é tratado como `ASSEMBLY_PACK_MUTATED`; divergência isolada do manifest é `MASTER_RECEIPT_HASH_MISMATCH`.

## Garantias
- títulos declaram explicitamente os claims que sustentam, e claims `UNSUPPORTED` ou `UNCERTAIN` sem linguagem condicional aprovada bloqueiam a seleção;
- números presentes em título ou descrição precisam existir no corpus de captions aprovado;
- padrões sensacionalistas configurados bloqueiam o candidato;
- o overlay da thumbnail é derivado do título selecionado, nunca redigido livremente;
- evidência sintética nunca é apresentada como registro real, e evidência real não verificada bloqueia a thumbnail;
- capítulos derivam da timeline compilada, exigem início em zero, ordem crescente e cobertura integral da duração;
- disclosure de fontes exige fonte verificada; disclosure sintético é obrigatório quando existe reconstrução, dramatização, interface fictícia ou gráfico explicativo;
- idioma dos metadados precisa coincidir com o idioma das captions;
- bloqueios críticos prevalecem sobre o score agregado, inclusive com `qcThreshold` igual a zero;
- o `metadataHash` é determinístico, permitindo reprodução e comparação entre revisões.

## Publicação
O agente nunca publica. Com metadados aprovados o estado governado avança apenas `MASTER_APPROVED → PACKAGING_READY`. Sem `publishApproval` explícito o pack registra o aviso `PUBLISH_APPROVAL_MISSING`, mantém `publishAuthorized: false` e aponta `nextAgent: HUMAN_REVIEW`. Somente com aprovação humana registrada o próximo passo passa a ser `PUBLISH_AGENT`.
