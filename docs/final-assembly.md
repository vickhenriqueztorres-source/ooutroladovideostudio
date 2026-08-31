# Final Assembly & Render QC

O módulo `core/final-assembly` consome exclusivamente EditBlueprint, VideoPack e AudioPack aprovados. Ele compila a timeline na ordem editorial, resolve assets pelos packs, verifica sync, captions, representação e evidência, produz manifests determinísticos de preview/final e aprova a entrega somente sem bloqueios.

## Garantias
- nenhum asset é buscado em diretórios;
- captions derivam literalmente da narração aprovada;
- labels de reconstrução, dramatização e interfaces fictícias são obrigatórios conforme regra;
- bloqueios prevalecem sobre o score agregado;
- o mock não escreve, remove, sobrescreve ou publica mídia;
- a execução é idempotente pelo hash dos packs, blueprint e delivery profile.

O estado governado percorre `AUDIO_APPROVED → ASSEMBLY_READY → MASTER_APPROVED`. Somente packs `DELIVERY_APPROVED` seguem para packaging.
