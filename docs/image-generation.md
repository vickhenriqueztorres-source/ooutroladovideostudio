# Image Generation & Visual QC Agent

Produz, valida, seleciona e versiona imagens, referências, inserts e start frames aprovados para alimentar o agente de vídeo.

## Posição no pipeline

```
PROMPT_PACK_APPROVED
  -> PROVIDER_PLAN_APPROVED
  -> REFERENCES_APPROVED
  -> (Image Generation & Visual QC)
  -> START_FRAMES_APPROVED
```

O terminal interno do agente (`IMAGE_PACK_APPROVED`) mapeia para o estado global `START_FRAMES_APPROVED`
da `BrechaStateMachine`, o único destino válido a partir de `REFERENCES_APPROVED`.

## Independência de provider

- O core (`core/image-generation`) não conhece runtime, IDE nem provider.
- A geração só acontece por meio de um `ImageProviderAdapter` autorizado e de um `ProviderExecutionPlan` aprovado.
- O adapter mock (`providers/image/mock.ts`) é determinístico e **nunca** produz bytes reais nem contata um provider.

## Fluxo de gates

1. **Reference** — resolve manifestos; só `APPROVED` vira âncora; `REFERENCE_REQUIRED`/`MISSING` bloqueiam.
2. **Calibration** — bloqueia produção se o provider não tem calibração válida para a classe de asset.
3. **Generation** — executa apenas o job aprovado; prompt não é alterado sem nova versão.
4. **Comparison** — avaliação multidimensional (identidade, ambiente, geometria, paleta, luz, composição, época, função narrativa, representação, qualidade técnica).
5. **Approval** — `APPROVED` / `REJECTED` / `REVIEW_REQUIRED`.
6. **Propagation** — só `APPROVED` alimenta vídeo, vira referência canônica ou entra no Start Frame Registry.

## Hard fails

Bloqueiam independentemente da média ponderada. Ver `HARD_FAIL_CODES` em `core/image-generation/qc.ts`.
Um score alto nunca compensa uma falha crítica: quando há hard fail, `overall` é forçado a `0` e o asset é `REJECTED`.

## Evidência

- `EVIDENCE_SUPPORT` é roteado para fora da lista de jobs: **evidência nunca é gerada**.
- `REAL_EVIDENCE` exige source asset preservado; `RECONSTRUCTION`/`DRAMATIZATION` exigem label.
- Texto crítico vai para pós-produção (`render-critical-text-in-post`).

## Idempotência

`imagePackKey` e `imageJobKey` são hashes estáveis (sha256). A mesma entrada retorna o pack já validado do cache,
sem gerar duplicatas.

## Retry

Retries são controlados por causa (`ImageRetryRecord`) e preservam locks. Causas factuais
(evidência alterada, representação ambígua, provider não calibrado) não fazem retry.
