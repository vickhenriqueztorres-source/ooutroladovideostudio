# Narration, Sound Design & Audio QC

O módulo `core/audio-generation` transforma roteiro aprovado, timeline semântica e clipes de vídeo aprovados em um `AudioPack` reproduzível.

## Garantias

- aceita somente clipes `APPROVED` com `videoJobKey`, hash, shot e Motion QC sem veto;
- preserva literalmente roteiro, claims, linguagem condicional e silêncios;
- exige SoundBible, catálogo aprovado, licença verificável e função editorial por cue;
- prioriza a narração nos buses e aplica ducking planejado;
- bloqueia colisão, clipping, corrupção, timestamps e licenças inválidas;
- registra que o mock não realizou medição real de loudness;
- usa hashes, checkpoints e cache determinístico sem renderização real.

A saída aprovada segue exclusivamente para `FINAL_ASSEMBLY_AGENT`.
