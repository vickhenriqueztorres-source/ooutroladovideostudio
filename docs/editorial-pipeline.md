# Pipeline editorial

## Fluxo

1. **Topic Scout** valida `TopicBrief` e propõe candidatos como hipótese explicável.
2. **Topic Greenlight** avalia pergunta, promessa, ângulo, evidência, risco, budget e payoff. Confiança abaixo de 0,70 exige humano.
3. **Research Integrity** produz Evidence Matrix; ausência de fonte permanece lacuna explícita.
4. **Documentary Script Compiler** cria uma especificação audiovisual com beats, loops, visual jobs, asset requests, sound map e continuidade.
5. **Script QC** bloqueia claims sem suporte, loops não pagos, beats não filmáveis, duração incompatível e budget excedido.

## Governança

Cada estágio cria checkpoint antes/depois, valida input/output com Zod, persiste um `ArtifactRecord` e emite logs estruturados. Marcos globais usam somente `CREATED -> TOPIC_APPROVED -> SCRIPT_APPROVED`; desvios usam `HUMAN_REQUIRED` ou `BLOCKED`.

## Políticas

Duração estimada: `wordCount / wordsPerMinute * 60`, acrescida da margem configurada para pausas. O budget é adaptativo e medido pelos `budgetUnits` dos assets, sem quotas fixas por mídia.

## Troca de provider

Implemente `TopicProvider`, `ResearchProvider` ou `ScriptModel` e injete a implementação no agente. O core, os contratos, QC e control plane não mudam.
