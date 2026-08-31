# Video Generation & Motion Consistency

O pipeline anima exclusivamente `StartFrameRegistryEntry.status === APPROVED`. O core resolve um Motion Manifest por shot, valida autorização e calibração do provider/runtime/adapter, cria jobs reproduzíveis e delega a produção ao adapter autorizado.

## Gates

1. Start frame aprovado e hash presente.
2. Motion Manifest resolvido com uma ação principal.
3. Provider autorizado e calibrado para a classe de movimento.
4. Job idempotente com prompt final, inputs, parâmetros e versões.
5. Motion QC multidimensional e Motion Vetos.
6. Comparação do primeiro frame, estado final e drift.
7. Propagação exclusiva de clipes aprovados.

Os testes usam `MockVideoProviderAdapter`; nenhum vídeo real é gerado ou enviado.
