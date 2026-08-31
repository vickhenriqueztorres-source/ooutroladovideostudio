# Runbook do pipeline de áudio

## Fluxo

1. Validar roteiro, timeline, vídeo, SoundBible, provider e catálogo.
2. Compilar narração sem alterar texto ou claims.
3. Planejar cues somente com função editorial.
4. Validar hashes, licenças, escopo e decodificação.
5. Construir buses, ducking, silêncios e master policy.
6. Executar Audio QC e registrar ausência de análise real no mock.
7. Persistir checkpoint e propagar somente pack aprovado.

## Falhas

Clipes não aprovados, claims unsupported, licenças inválidas, colisão, clipping, timestamps inválidos e assets corrompidos bloqueiam. Retries são causais e preservam prioridade da narração, roteiro e claims.

## Retomada

`AudioGenerationControlPlane.resume` reutiliza a chave e o cache da entrada. Um AudioPack aprovado nunca é alterado; mudanças de versão produzem uma nova chave.

## Segurança

Logs registram apenas IDs, status e contagens. Texto, claims, licenças e credenciais não são logados.
