# Runbook — Video Generation

## Pré-condições

- Projeto em `START_FRAMES_APPROVED`.
- Todos os frames consumidos com status `APPROVED`.
- Motion Manifest único por frame/shot.
- Provider selecionado explicitamente, autorizado e calibrado.

## Execução

1. Validar input e start frames.
2. Resolver motion e rejeitar `ACTION_OVERLOAD`.
3. Validar calibração para a classe de movimento.
4. Criar job usando `videoJobKey`.
5. Executar somente o adapter autorizado.
6. Aplicar Motion QC e os 12 vetos.
7. Comparar primeiro frame e ending state.
8. Registrar retry causal apenas para falhas corrigíveis.
9. Persistir checkpoint e propagar somente clipes aprovados.

## Retomada

Repetições com a mesma entrada reutilizam o VideoPack em cache. Não alterar provider, runtime, adapter, motion manifest ou start frame durante retomada; qualquer mudança exige nova chave e nova validação.

## Segurança

Logs contêm apenas IDs, status e contagens. Tokens, cookies, credenciais e payloads completos não são registrados.
