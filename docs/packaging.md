# Packaging & Distribution Agent

O módulo `core/packaging` implementa o Prompt 11 do BRECHA. Ele só aceita um `AssemblyPack` em `DELIVERY_APPROVED`, um `MasterApprovalReceipt` íntegro e um `RenderManifest` renderizado. O agente compila um pacote de publicação sem modificar o master e sem publicar em plataforma externa.

## Fluxo governado

```text
MASTER_APPROVED
→ PACKAGING_INPUT_VALIDATED
→ THUMBNAIL_GENERATED
→ TITLE_COMPILED
→ DESCRIPTION_COMPILED
→ TAGS_GENERATED
→ CHAPTERS_RESOLVED
→ SHORTS_PLANNED
→ POLICY_VALIDATED
→ MANIFEST_BUILT
→ HUMAN_SELECTION_REQUIRED
→ DELIVERY_APPROVED
```

O estado global avança de `MASTER_APPROVED` para `PACKAGING_READY` quando o pacote editorial passa nos gates. `DELIVERY_APPROVED` exige seleção humana registrada de uma combinação válida de título e thumbnail. O agente nunca aplica `PUBLISHED`.

## Entradas obrigatórias

- receipt e `AssemblyPack` aprovados, sem divergência de hashes;
- `topicProfile`, com palavra-chave, hook e promessa;
- `channelProfile`, com CTA, hashtags e paleta BRECHA;
- políticas de YouTube e das plataformas secundárias solicitadas;
- estratégia de distribuição manual ou agendada;
- claims, fontes e Evidence Matrix;
- exatamente três conceitos de thumbnail: `MECHANISM`, `CONSEQUENCE` e `FINAL_HANDOFF`;
- três opções de título sustentadas por claims.

## Pacote A/B/C

Cada conceito de thumbnail precisa representar uma hipótese editorial diferente, usar somente evidência presente no episódio e registrar SHA-256 da base, da imagem final e da prévia mobile. A headline possui de uma a cinco palavras, safe area válida, contraste mínimo, aderência à paleta e CTR estimado acima do gate configurado.

Cada título é pareado com uma thumbnail. O título contém a palavra-chave nos primeiros 40 caracteres, não repete a headline, respeita o limite da plataforma e não pode introduzir número ou claim ausente das captions e evidências aprovadas.

`metadata.recommendedSelection` registra:

- título principal recomendado;
- thumbnail recomendada, ID e headline;
- combinação exata de publicação inicial;
- alternativas A/B/C para teste.

## Distribuição

O pacote inclui descrição com hook nas duas primeiras linhas, contexto, capítulos, fontes, CTA e hashtags; tags primárias, secundárias e long-tail; três a cinco cortes verticais de 15–60 segundos; validação específica para YouTube, TikTok e Instagram; e `publishingManifest` com paths e hashes do master e da thumbnail.

Os paths em `outputs/` são apenas referências no manifest. O agente mock não escreve, sobrescreve ou publica arquivos.

## Aprovação humana

Sem `publishApproval`, o resultado é `PACKAGING_READY`, `deliveryStatus: HUMAN_SELECTION_REQUIRED`, manifest `READY_FOR_REVIEW`, `publishAuthorized: false` e `nextAgent: HUMAN_REVIEW`.

Uma aprovação válida registra `approvedBy`, `approvedAt`, `selectedTitleId` e `selectedThumbnailId`. Os IDs precisam formar um par A/B/C aprovado. Só então o resultado recebe `deliveryStatus: DELIVERY_APPROVED`, manifest `READY_FOR_PUBLISH` e handoff para `PUBLISH_AGENT`; nenhum upload é executado.

Consulte `docs/contracts/packaging-contracts.md` e `docs/runbooks/packaging-pipeline.md`.
