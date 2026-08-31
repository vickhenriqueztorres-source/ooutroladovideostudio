# Contratos de Video Generation

Definidos em `core/contracts/video-generation.ts`:

- `MotionManifest`: movimentos permitidos, locks, ação principal e ending state.
- `VideoProviderCalibration`: calibração vinculada a provider/runtime/adapter e classes aprovadas.
- `VideoGenerationJob`: start-frame hash, prompt final, parâmetros, tentativa e idempotency key.
- `MotionQC`: identidade, geometria, luz, paleta, composição, fidelidade, estado final e vetos.
- `ContinuityComparisonSet`: primeiro/último frame e checks de drift.
- `GeneratedVideoClip`: proveniência, hashes, versão e aprovação.
- `VideoPack`: saída rastreável para Narração/SFX ou revisão.

Os schemas Zod ficam em `core/schemas/video-generation.ts`.
