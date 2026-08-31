# Contratos de áudio

`AudioGenerationInput` reúne versões de roteiro/timeline, narração, blocos, clipes aprovados, SoundBible, providers, catálogo, cues e constraints.

`AudioPack` registra narração compilada, cues, mix plan, assets aprovados/rejeitados, retries, Audio QC, hashes de vídeo, `narrationJobKey`, checkpoint e próximo agente.

## Fronteiras

- `AudioRenderAdapter` é a única fronteira de provider.
- `ApprovedAudioVideoClip` exige aprovação e rastreabilidade explícitas.
- `SoundCatalogAsset` carrega hash, licença, escopo, aprovação e decodificação.
- `MixPlan.analysisPerformed=false` impede alegações falsas de medição.
- Falhas críticas são códigos tipados e sempre bloqueiam o pack.
