# 🛡️ REGRA INVIOLÁVEL: SEGMENTAÇÃO POR BEATS (SUBSTITUIÇÃO DE 1 CENA = 1 PLANO) — O OUTRO LADO

> **ESTA REGRA É PERMANENTE E SOBERANA: NÃO PRODUZIMOS CENAS, PRODUZIMOS BEATS.**  
> Um beat é a menor unidade de significado que a imagem precisa provar.

---

## 1. DEFINIÇÃO & CADÊNCIA TEMPORAL

- **Um trecho de locução de 15 segundos contém, em média, 3 a 4 beats.**
- **Cadência obrigatória:**
  - **Mínimo:** Nunca menos de 1 beat a cada 6 segundos de locução (\(t_{duration} \le 6.0\,\text{s}\)).
  - **Máximo:** Nunca mais de 1 beat a cada 2 segundos de locução (\(t_{duration} \ge 2.0\,\text{s}\)).
- **Duração padrão recomendada por beat:** 2,5s a 4,5s.

---

## 2. PROCESSO DE SEGMENTAÇÃO EM TRÊS PASSOS

### Passo 1: Marcar os Gatilhos de Corte na Transcrição
Qualquer um dos gatilhos abaixo obriga o corte para um novo beat:
1. **Número, medida ou quantidade enunciada** (`quantify`).
2. **Relação Causa \(\rightarrow\) Efeito** ("porque", "então", "isso faz com que") \(\rightarrow\) **dois beats obrigatórios**: beat de causa e beat de efeito.
3. **Novo substantivo concreto entra em cena** (objeto específico, lugar, componente, material).
4. **Mudança de escala** (do macro/território para a máquina, da máquina para o micro/componente).
5. **Virada dramática** (falha, limite físico, gargalo, revelação técnica, contradição).
6. **Comparação** ("diferente de", "enquanto que", "ao contrário de").

---

### Passo 2: Redação Mandatória do `visual_claim`
Toda imagem deve responder à pergunta:
> *"O que esta imagem PROVA que a locução apenas AFIRMA?"*

- **Fórmula Sintática Obrigatória:**
  `[sujeito] [ação/estado observável] [evidência visível]`
- **Restrição Estrita:** Mínimo de 6 palavras e obrigatoriamente pelo menos um verbo legítimo no gerúndio ou no particípio. Substantivos e adjetivos terminados em -ndo/-ado/-ido (*mundo, lado, estado, sentido, segundo, fundo, resultado, mercado, etc.*) NÃO contam como verbo.

- **Exemplos VÁLIDOS:**
  - *"cabo de fibra sendo puxado por guincho hidráulico, tensão visível na bobina"*
  - *"selo de lacre numerado rompido sobre a tampa do terminal"*
  - *"lâmpada de status X-RAY ON acendendo em âmbar no painel do túnel enquanto o relé de alta tensão estala, cabos blindados vibrando levemente"*

- **Exemplos INVÁLIDOS (Rejeição Imediata):**
  - *"cabo de fibra"* (substantivo solto, sem ação ou estado observável)
  - *"imagem de infraestrutura"* (genérico, sem sujeito definido)
  - *"o mundo no lado do mercado"* (não contém verbo, apenas substantivos com terminações nominais)
  - *"mostra o conceito de X"* (abstrato, não filmável)

---

### Passo 3: Tipagem Estrita de Função e Modo

- **`narrative_function`:**
  - `introduce_object`
  - `explain_mechanism`
  - `quantify`
  - `compare`
  - `reveal_constraint`
  - `failure_trigger`
  - `transition`
  - `conclusion`

- **`evidence_mode`:**
  - `witness` (mostra o objeto agindo e operando no mundo físico)
  - `document` (prova documental em papel, carimbo, log ou tela de sistema)
  - `route` (onde e por onde a matéria se desloca no território)
  - `dissection` (dentro do objeto, corte técnico, raio-x, tomografia)
  - `scale` (quanto e quão monumental / minúsculo é o volume ou grandeza)

---

## 3. FILMABILIDADE

O `visual_claim` só pode descrever o que um sensor de câmera registra. Fenômenos invisíveis (raio-X, radiofrequência, campo magnético, corrente elétrica, dados) **NUNCA** são filmados diretamente. Filme o **INDICADOR**: lâmpada de status acendendo, relé estalando, ponteiro subindo, LED de atividade, display mudando de valor, material reagindo. Se o claim contiver *"emitindo feixe"*, *"onda"*, *"sinal"*, *"pulso"* ou *"energia"* sem um indicador físico, rejeite e reescreva.

---

## 4. NÚMEROS & `hud_value`

- `hud_value` só pode conter valor presente literalmente em `transcript_span` ou em campo verificado do contrato de roteiro.
- **Valor não roteirizado = `null`.**
- **Nunca inferir especificação técnica que a locução não disse.**
- Se o beat não puder ser dividido por causa do piso de 2 s, mantenha a `narrative_function` original mas force `evidence_mode: scale` e preencha `hud_value`.

---

## 5. PROIBIÇÕES DE CONTEÚDO

`visual_must_include` e `visual_claim` não podem conter marcas, nomes de fabricantes, logotipos ou modelos comerciais. Descreva a função e a aparência, nunca o fabricante.

---

## 6. FRONTEIRA DE RESPONSABILIDADE

- O `BeatDirector` não decide câmera. Palavras como *"câmera"*, *"plano"*, *"lente"*, *"tracking"*, *"push-in"*, *"estático"*, *"parada"* são terminantemente proibidas em qualquer campo do beat. Movimento de câmera é atributo exclusivo do shot, decidido pelo `CinematicShotDirectorAgent`.
- **Também são terminantemente proibidas nos campos do beat referências a HUD, overlay, texto na tela, texto sobreposto, percentual de tela e legenda.** Decisões de interface e pós-produção pertencem às camadas gráficas e de composição, não ao conteúdo do beat.

---

---

## 7. SEM TEXTO NA IMAGEM (REGRA INVIOLÁVEL)

`visual_claim`, `visual_must_include` e `visual_must_not` não podem exigir texto legível, números, siglas, inscrições, rótulos, displays com valores ou marcações de escala dentro da imagem. Modelos generativos não renderizam texto. O que precisa ser lido vai para `hud_value` e é composto pelo compositor. Descreva o suporte físico (painel, display, etiqueta) sem o conteúdo escrito.

- **Rejeição Automática por Schema (refine):** É sumariamente rejeitado qualquer campo visual que contiver:
  - Dígitos numéricos (`\d`);
  - Siglas ou códigos entre parênteses (ex: `(Z_eff)`);
  - As palavras ou expressões proibidas: `inscrição`, `valor numérico`, `marcação`, `escala de`, `legenda`, `rótulo`, `texto`.

---

## 8. PROIBIÇÃO ABSOLUTA DO PLANO-ILUSTRAÇÃO

- É expressamente proibido gerar um beat cujo `visual_claim` apenas repita o substantivo da locução.
- Se a locução diz *"o servidor"*, a imagem **NÃO** é um servidor estático. A imagem é o servidor **FAZENDO algo que a frase seguinte vai explicar**: LEDs piscando em rajada de tráfego, mão técnica sacando uma lâmina de disco quente, condensação de duto térmico na saída de ar frio.
- **O Teste do Áudio Desligado:**
  > *"Se eu tirar o áudio, o espectador entenderia a mecânica do que está acontecendo apenas olhando para a imagem?"*  
  > Se a resposta for **NÃO**, o beat está sumariamente rejeitado.

---

## 9. PÓS-PROCESSAMENTO DETERMINÍSTICO & RESEGMENTAÇÃO

1. **`postProcessBeats` NÃO subdivide diretamente.** Ele executa:
   - (a) Funde beats com duração \(< 2,0\,\text{s}\) com o vizinho de mesma `narrative_function`.
   - (b) Para spans \(> 6,0\,\text{s}\), devolve a lista de spans a resegmentar (`spansToResegment`).
2. O agente consome `spansToResegment` reenviando cada span ao modelo com a instrução: *"produza exatamente 2 beats com visual_claim distintos para este trecho"*.
3. O agente aceita no máximo 2 tentativas por span. Se após 2 tentativas a subdivisão não produzir 2 beats válidos, contíguos, com a mesma duração total e com claims distintos (similaridade de tokens \(< 60\%\)), lança `CinematicValidationError('BEAT_RESEGMENTATION_FAILED')`.

---

## 10. CONTRATO DE SAÍDA & CONTIGUIDADE TEMPORAL (SCHEMA ZOD)

O `BeatsArraySchema` aplica validação estrita de contiguidade temporal:
- `beats[0].t_start === 0.0` relativo à cena (tolerância máxima de 50 ms / 0.05 s).
- `beats[i].t_start === beats[i-1].t_end` (tolerância máxima de 50 ms / 0.05 s).
- Gaps e overlaps entre beats são sumariamente rejeitados.
- `beat_id === id` obrigatório em cada beat.

```typescript
export const BeatsArraySchema = z.array(BeatSchema).refine((beats) => {
  if (beats.length === 0) return true;
  if (Math.abs(beats[0].t_start - 0.0) > 0.05) return false;
  for (let i = 1; i < beats.length; i++) {
    if (Math.abs(beats[i].t_start - beats[i - 1].t_end) > 0.05) return false;
  }
  return true;
});
```

---

## 11. DEMONSTRAÇÃO CANÔNICA VALIDADA

Trecho de locução (15,0 s):
> *"Quando a esteira acelera a 0,5 metros por segundo, o gerador dispara dois feixes de raio-X com energias diferentes. Isso faz com que a densidade da matéria seja calculada instantaneamente, antes mesmo da mala sair do túnel blindado."*

```json
[
  {
    "id": "beat_001",
    "beat_id": "beat_001",
    "t_start": 0.0,
    "t_end": 3.5,
    "transcript_span": "Quando a esteira acelera a 0,5 metros por segundo,",
    "narrative_function": "introduce_object",
    "evidence_mode": "scale",
    "visual_claim": "esteira transportadora industrial tracionando bagagem pesada, roletes metálicos girando em velocidade calibrada sob luz de tungstênio",
    "visual_must_include": [
      "roletes mecânicos em rotação contínua",
      "ranhuras de atrito e desgaste no chassi de aço",
      "vibração física na borracha da correia"
    ],
    "visual_must_not": [
      "passageiros olhando para frente",
      "ilustração em três dimensões sem desgaste físico",
      "esteira vazia sem carga"
    ],
    "hud_value": "0,5 m/s"
  },
  {
    "id": "beat_002",
    "beat_id": "beat_002",
    "t_start": 3.5,
    "t_end": 7.2,
    "transcript_span": "o gerador dispara dois feixes de raio-X com energias diferentes.",
    "narrative_function": "explain_mechanism",
    "evidence_mode": "witness",
    "visual_claim": "lâmpada piloto âmbar acendendo no painel superior do túnel enquanto o relé de alta tensão estala, cabos blindados vibrando levemente",
    "visual_must_include": [
      "lâmpada piloto âmbar acesa",
      "cabos industriais espessos com blindagem dielétrica",
      "carcaça de aço do túnel com rebites aparentes"
    ],
    "visual_must_not": [
      "feixes gráficos de ficção científica",
      "luzes decorativas",
      "aparelho médico hospitalar"
    ],
    "hud_value": null
  },
  {
    "id": "beat_003",
    "beat_id": "beat_003",
    "t_start": 7.2,
    "t_end": 11.5,
    "transcript_span": "Isso faz com que a densidade da matéria seja calculada instantaneamente,",
    "narrative_function": "explain_mechanism",
    "evidence_mode": "document",
    "visual_claim": "monitor analítico de operador processando mapa de densidade espectral, separando matéria orgânica em tons de laranja e metais densos em azul cobalto",
    "visual_must_include": [
      "interface técnica de inspeção com separação visual de materiais",
      "histograma de densidade na borda da tela",
      "regiões da imagem pulsando entre laranja e azul"
    ],
    "visual_must_not": [
      "interface futurista de videogame",
      "efeitos de distorção cibernética",
      "ícones flutuantes tridimensionais"
    ],
    "hud_value": null
  },
  {
    "id": "beat_004",
    "beat_id": "beat_004",
    "t_start": 11.5,
    "t_end": 15.0,
    "transcript_span": "antes mesmo da mala sair do túnel blindado.",
    "narrative_function": "reveal_constraint",
    "evidence_mode": "witness",
    "visual_claim": "cortina de tiras de borracha plumbífera pesada sendo empurrada pela mala, poeira e arranhões visíveis na saída do túnel de inspeção",
    "visual_must_include": [
      "tiras grossas de proteção de chumbo flexionando",
      "carcaça de policarbonato da mala com etiqueta de voo desgastada",
      "iluminação de piso frio com sombra projetada"
    ],
    "visual_must_not": [
      "ambiente limpo de estúdio comercial",
      "reflexo de operador em vidro",
      "iluminação artificial de estúdio publicitário"
    ],
    "hud_value": null
  }
]
```
