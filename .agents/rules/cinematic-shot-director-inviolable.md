# 🛡️ REGRA INVIOLÁVEL: DIREÇÃO DE SHOTS (CINEMATIC SHOT DIRECTOR) — O OUTRO LADO

> **ESTA REGRA É PERMANENTE E SOBERANA PARA A CAMADA CINEMATOGRÁFICA DE SHOTS.**  
> O `CinematicShotDirectorAgent` é a autoridade exclusiva sobre enquadramento, lente, movimento de câmera e composição visual a partir dos BEATS gerados pelo `NarrativeBeatDirectorAgent`.

---

## 1. FRONTEIRA DE AUTORIDADE

1. **Separação Rígida:**
   - O `BeatDirector` decide **O QUE** é provado fisicamente (`visual_claim`, `evidence_mode`, `hud_value`).
   - O `CinematicShotDirectorAgent` decide **COMO A CÂMERA OBSERVA** essa prova (`shot_type`, `shot_size`, `lens_language`, `camera_movement`, `composition`, `negative_space`).
2. **Imutabilidade do Beat:** O ShotDirector nunca altera, resume ou reescreve o `transcript_span` nem o `visual_claim` do beat.

---

## 2. REGRAS DE DECOMPOSIÇÃO DE SHOTS POR FUNÇÃO NARRATIVA

### Exceção Obrigatória: Mecânica e Macro
- Para beats com `narrative_function: "explain_mechanism"`:
  - **Duração \(\ge 5,0\,\text{s}\):** É obrigatório decompor em sequência par `MECHANICAL_DETAIL` \(\longrightarrow\) `MACRO_DETAIL`.
  - **Duração \(< 5,0\,\text{s}\):** É proibido forçar dois planos. Mantém-se um único plano consolidado em `MECHANICAL_DETAIL`.

---

## 3. VOCABULÁRIO DE LENTE E MOVIMENTO

- **Lentes Canônicas:** `WIDE_24`, `DOCUMENTARY_35`, `NATURAL_50`, `DETAIL_85`, `MACRO`.
- **Movimentos Canônicos:** `STATIC`, `SLOW_DOLLY_IN`, `SLOW_DOLLY_OUT`, `TRACK_LEFT`, `TRACK_RIGHT`, `PAN_LEFT`, `PAN_RIGHT`, `SUBTLE_CRANE_UP`, `SUBTLE_CRANE_DOWN`, `TOPDOWN_DESCEND`, `PARALLAX_PUSH`.
- **Intensidade:** `NONE`, `LOW`, `MEDIUM`. Nunca usar movimentos rápidos, chicotes ou rotações artificiais.
- **Espaço Negativo Intencional:** Sempre motivado (`ROOM_FOR_FUTURE_CALLOUT`, `ROOM_FOR_FUTURE_METRIC`, `ROOM_FOR_VISUAL_REVEAL`, `ROOM_FOR_EVIDENCE`).
