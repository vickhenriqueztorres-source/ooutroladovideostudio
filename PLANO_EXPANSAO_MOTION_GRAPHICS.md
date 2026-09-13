# 📐 PLANO DE CORREÇÃO & EXPANSÃO DE MOTION GRAPHICS
## Canal O Outro Lado // Direção: Dossiê do Sistema 3.0 (Denis Villeneuve Chiaroscuro 35mm)

---

## 1. DIAGNÓSTICO & ANÁLISE CRÍTICA DO ESTADO ATUAL

Foi realizada uma varredura completa na arquitetura de motion graphics do projeto, abrangendo os contratos (`contracts/documentaryMotionContract.ts`, `contracts/timelineContract.ts`), o orquestrador (`pipeline/agents/motionDirectorAgent.ts`), os motores de renderização (`remotion/cinema/`, `remotion/documentary/`, `remotion/motion-documentary/`) e os dados calculados do episódio `rede-eletrica-60hz`.

### 1.1 Fontes Excessivamente Pequenas (Ilegíveis em Telas Comuns e Mobile)
As escalas tipográficas atuais foram dimensionadas com parâmetros de UI desktop/tooltips em vez de computação gráfica para vídeo 1080p:
- **`remotion/cinema/typography.ts`**:
  - `DOSSIER_TITLE`: **38px** (muito tímido para títulos de revelação).
  - `SECTION_HEADER`: **26px** (perde autoridade visual).
  - `PRIMARY_LABEL`: **18px** (quase imperceptível no mobile).
  - `TELEMETRY_DATA`: **16px** (ilegível sem zoom).
  - `FOOTNOTE`: **14px** (microscópico).
- **`remotion/documentary/KineticEditorialCallout.tsx`**:
  - `categoryText`: **12px** (0.6% da altura do quadro — completamente invisível no YouTube em smartphones).
  - `displayText`: **26px a 30px** (sem impacto documental, parece legenda padrão).
  - `subText`: **12px** (ilegível).
- **`remotion/motion-documentary/tokens.ts` & `motions.tsx`**:
  - `source`: **14px**.
  - `detail`: **18px**.
  - `label`: **24px**.
  - `value`: **46px** (insuficiente para números de choque como "800.000 V").
  - `lineWidth`: **2px** (desaparece sob compressão h264 do YouTube).
  - `panelMaxWidth`: **440px** (força quebra de linha prematura).
- **`remotion/cinema/HudDirector.tsx`**:
  - Caixas de telemetria fixadas com fontes de **15px** e **17px**.

### 1.2 Biblioteca Restrita e Pouco Explicativa
A biblioteca atual em `remotion/motion-documentary/` possui 14 receitas pontuais, mas peca na profundidade didática:
- **Ausência de Diagramas de Mecanismos:** Não há componentes para ilustrar sistemas dinâmicos (como osciladores de frequência senoidal 60 Hz, balança de carga vs geração, ou divisões explicativas de tela).
- **Subutilização de Receitas:** Na prática, 63.3% das cenas receberam apenas `source_caption` (uma legenda estática de fonte), sem nenhuma animação de fluxo, mapa ou medição.
- **Falta de Destaque Numérico:** Ausência de cartões para números colossais (grandes métricas de engenharia).

### 1.3 Baixa Frequência e Densidade nos Vídeos
Auditoria estatística realizada no episódio de 30 cenas:
- **Cenas com Callout Editorial:** Apenas **8 de 30 (26.7%)**. Ou seja, **73.3% do vídeo não teve títulos/callouts explicativos**.
- **Cenas com Gráficos Reais:** Apenas **11 de 30 (36.7%)** tiveram gráficos de fato (contadores, correntes de processo ou locais). As outras 19 cenas exibiram apenas crédito de rodapé.
- **Duração Curta:** Os gráficos duravam em média apenas 1.8s a 2.4s. Como cada cena tem entre 8s e 12s, **mais de 75% da duração de cada cena ficava sem nenhum suporte gráfico explicativo**, tornando o documentário visualmente estático e menos pedagógico.
- **Atribuição Rígida e Falha em `motionDirectorAgent.ts`:**
  - O agente continha regras de correspondência textual baseadas em palavras de episódios antigos (`duto`, `subterr`, `algodão`, `planalto`).
  - Como consequência, cenas da rede elétrica receberam callouts genéricos como `"DUTOS SUBTERRÂNEOS"` (SC_006, SC_008, SC_028) ou `"35 MM"` (SC_024), que não explicavam o assunto da cena.

---

## 2. PLANO DE CORREÇÃO E IMPLEMENTAÇÃO

O plano é estruturado em 4 pilares essenciais:

### PILAR 1: RESCALING TIPOGRÁFICO (MOBILE-FIRST & BROADCAST)

Adequação das escalas visuais para garantir legibilidade instantânea em smartphones (320x180) e displays 1080p/4K:

| Componente / Token | Tamanho Anterior | Novo Tamanho Recomendado | Justificativa Visual |
| :--- | :--- | :--- | :--- |
| **`KineticEditorialCallout` - Display Text** | 26px – 30px | **52px – 64px** | Leitura instantânea nos primeiros 2 segundos de cena |
| **`KineticEditorialCallout` - Category** | 12px | **22px – 24px** | Legibilidade da cartilha pericial (mono, bold) |
| **`KineticEditorialCallout` - Subtext** | 12px | **22px – 26px** | Compreensão do contexto técnico |
| **`DOCUMENTARY_MOTION_TOKENS.typography.value`** | 46px | **84px – 110px** | Destaque monumental para dados periciais |
| **`DOCUMENTARY_MOTION_TOKENS.typography.label`** | 24px | **38px – 44px** | Título claro sobre a mídia |
| **`DOCUMENTARY_MOTION_TOKENS.typography.detail`** | 18px | **24px – 28px** | Especificações técnicas legíveis |
| **`DOCUMENTARY_MOTION_TOKENS.typography.source`** | 14px | **18px – 20px** | Rigor documental sem sumir na tela |
| **`DOCUMENTARY_MOTION_TOKENS.geometry.lineWidth`** | 2px | **3px – 4px** | Resistência à compressão de streaming |
| **`DOCUMENTARY_MOTION_TOKENS.geometry.panelMaxWidth`**| 440px | **680px – 800px** | Acomodação fluida de termos técnicos |
| **`HudDirector` - Textos de Telemetria** | 15px – 17px | **24px – 28px** | Leitura nítida no canto superior |

---

### PILAR 2: EXPANSÃO DA BIBLIOTECA DE COMPONENTES EXPLICATIVOS

Desenvolvimento de novos componentes nativos em `remotion/documentary/` e registro no `componentRegistry.ts` e em receitas overlay (`documentaryMotionContract.ts`):

1. **`EnergyFrequencyOscillator` (Oscilador de Frequência 60.00 Hz)**
   - *Finalidade:* Exibir graficamente a onda senoidal em tempo real, com linhas de alerta vermelho/laranja em 59.5 Hz e 60.5 Hz, mostrando a oscilação crítica entre geração e consumo.
   - *Aplicações:* Cenas de equilíbrio da rede, estabilidade de turbinas, ONS e apagões.

2. **`TechnicalSplitComparison` (Split Didático: Crença Popular vs Realidade Falsa)**
   - *Finalidade:* Dividir a tela com uma linha de varredura laser, contrastando:
     - Esquerda: O modelo mental comum (ex: *"ENERGIA ESTOCADA EM BATERIA"*).
     - Direita: A realidade do sistema (ex: *"GERAÇÃO INSTANTÂNEA NO MESMO MILISSEGUNDO"*).
   - *Aplicações:* Quebra de paradigmas nos primeiros atos e conclusões causais.

3. **`PowerBalanceMeter` (Balança de Carga vs Geração em MW)**
   - *Finalidade:* Gauge/balança bidirecional com telemetria: lado esquerdo = Geração Hidrelétrica/Eólica (MW); lado direito = Demanda Nacional (MW). Exibe o balanço em 0 MW de diferença para manter os 60.00 Hz cravados.
   - *Aplicações:* Explicação do papel do SIN e do despacho centralizado.

4. **`BigStatExplainer` (Grande Revelação Numérica)**
   - *Finalidade:* Número central monumental (ex: "800.000 V", "2.500 KM", "0,001 s") com animação de contagem precisa, linha de ênfase laranja (`#FF5500`) e texto explicativo em fonte 32px.
   - *Aplicações:* Escala de infraestrutura, distâncias e tempos de propagação.

5. **`MapRouteCorridor` (Corredor de Linha de Transmissão 800 kV)**
   - *Finalidade:* Mapa vetorial cartográfico escuro com traçado da linha entre Norte/Nordeste e Sudeste, com pulsos luminosos indicando o fluxo contínuo de eletricidade e marcadores de subestações conversoras.
   - *Aplicações:* Transporte de energia e território nacional.

6. **`ExplodedCutawayLabels` (Raio-X com Múltiplos Apontadores Físicos)**
   - *Finalidade:* Em vez de um único apontador, exibe de 2 a 4 linhas simultâneas identificando elementos físicos observados (ex: *Disjuntor a gás SF6*, *Barramento de Cobre*, *Isolador Polimérico*).
   - *Aplicações:* Cenas de equipamentos complexos e subestações.

---

### PILAR 3: AUMENTO DA QUANTIDADE E DENSIDADE (VÍDEO 100% EXPLICATIVO)

Para garantir que o vídeo seja dinâmico, didático e visualmente rico:
1. **Regra dos 100% de Cobertura Informativa:**
   - **Toda cena do documentário deve ter ao menos 1 elemento visual explicativo ativo**:
     - Cenas narrativas gerais: recebem `KineticEditorialCallout` com headline e subhead explicativa calibrada.
     - Cenas técnicas e periciais: recebem `MotionRecipe` avançada (Oscilador, Balança, Contador, Comparação ou Split).
     - Cenas de localização ou documento: recebem `LocationStamp` ou `DocumentHighlight`.
2. **Extensão do Tempo de Exibição:**
   - Aumentar a duração dos gráficos em tela de 1.8s para **3.5s a 5.5s** (permitindo leitura confortável e assimilação do raciocínio pelo espectador).
3. **Escalonamento Sem Conflito (Choreography):**
   - Segundos 0.5s – 4.0s: Callout Editorial ou Diagrama Principal.
   - Segundos 4.5s – 8.0s: Telemetria de apoio ou especificação pericial no canto seguro.
   - Evita poluição visual respeitando a regra inviolável de no máximo 12% da área útil do quadro ocupada por texto.

---

### PILAR 4: MODERNIZAÇÃO DA INTELIGÊNCIA EM `MotionDirectorAgent`

Refatoração das rotinas em `pipeline/agents/motionDirectorAgent.ts`:
1. **Dicionário Semântico Contextual por Tema:**
   - Detecção de tópicos de energia elétrica: frequência, hertz, voltagem, transformador, turbina, hidrelétrica, Itaipu, Belo Monte, subestação, disjuntor, ONS, SIN, blackout, relé.
   - Geração de callouts inteligentes baseados no conteúdo real da cena, eliminando termos como "dutos subterrâneos" ou "35mm".
2. **Priorização de Receitas Explicativas sobre Legendas de Rodapé:**
   - Restringir `source_caption` a no máximo 15% das cenas (usado estritamente quando há citação direta de fonte acadêmica/reguladora).
   - Elevar a presença de `verified_counter`, `comparison`, `process_chain`, `field_marker` e os novos componentes criados no Pilar 2 para cobrir 85%+ das cenas.

---

## 3. CRONOGRAMA DE APLICAÇÃO (POR ETAPAS)

1. **Etapa 1 (Fundação Tipográfica):**
   - Atualizar `remotion/cinema/typography.ts`.
   - Atualizar `remotion/documentary/KineticEditorialCallout.tsx`.
   - Atualizar `remotion/motion-documentary/tokens.ts` e `primitives.tsx`.
   - Atualizar `remotion/motion-documentary/motions.tsx`.
   - Atualizar `remotion/cinema/HudDirector.tsx`.

2. **Etapa 2 (Construção dos Novos Motions Explicativos):**
   - Implementar `EnergyFrequencyOscillator.tsx`.
   - Implementar `TechnicalSplitComparison.tsx`.
   - Implementar `PowerBalanceMeter.tsx`.
   - Implementar `BigStatExplainer.tsx`.
   - Registrar no `componentRegistry.ts` e exportar no index do documentary.

3. **Etapa 3 (Atualização do Motor de Atribuição):**
   - Atualizar `pipeline/agents/motionDirectorAgent.ts` com vocabulário de energia e regras de densidade 100%.
   - Atualizar `remotion/episodeRedeEletrica60hzTimelineData.ts` para refletir as novas receitas ricas em todas as 30 cenas.

4. **Etapa 4 (Validação com Suíte de Testes):**
   - Executar `npm run check` (TypeScript compilation).
   - Executar `npx ts-node tests/documentary_motion_library.test.ts` para garantir integridade dos schemas e contratos.
   - **IMPORTANTE:** Zero geração de vídeo, conforme determinação explícita do usuário.
