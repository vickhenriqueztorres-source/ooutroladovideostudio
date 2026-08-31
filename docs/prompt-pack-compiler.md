# Prompt Pack Compiler

Transforma exclusivamente um `EditBlueprint` com `EDIT_BLUEPRINT_APPROVED` em especificações operacionais normalizadas. O Edit Blueprint decide o que o corte precisa; o Prompt Pack preserva essa decisão em sujeito, contexto, composição, câmera, luz, movimento, factual boundary, continuidade, referências, restrições e gates, sem escolher provider ou gerar assets.

## Portabilidade

Portabilidade significa contrato semântico comum, não pixels idênticos. Adapters podem traduzir campos para uma engine, mas não mudar função narrativa, entidade, época, dispositivo, representação, composição crítica, movimento essencial ou proibições.

## Regra editorial

IA representa; evidência confirma. `VERIFIED` exige fonte preservada; `INFERRED` usa linguagem condicional; `UNCERTAIN` mantém incerteza; claim sem suporte bloqueia. Dramatização, reconstrução e interface fictícia exigem rótulo, e texto crítico fica em pós-produção.

## Compilação

A pipeline valida o blueprint, resolve requests, boundaries e referências, compila prompt units e specs de imagem, vídeo, motion, evidência e interface, declara capabilities, constrói grafo, calcula budget e executa QC. SHA-256 sobre JSON canônico garante identidade determinística.

## Adapters

O core declara capabilities abstratas. Falta crítica resulta em `BLOCKED` ou `HUMAN_REQUIRED`; qualquer adaptação com perda exige versão derivada, diff e nova aprovação.
