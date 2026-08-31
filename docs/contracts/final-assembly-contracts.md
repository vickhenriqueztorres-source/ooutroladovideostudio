# Contratos de Final Assembly

`FinalAssemblyInput` exige blueprint aprovado, packs aprovados, matriz de evidência, regras de representação e delivery profile. `AssemblyPack` registra timeline, links de assets, findings de sync, caption track, preview/final, render manifest, QC, hashes e checkpoint.

## Identidade
`assemblyJobKey = sha256(projectId + editBlueprintVersion + videoPackHash + audioPackHash + deliveryProfileHash)`.

## Bloqueios
Os contratos incluem inputs/packs inválidos, resolução/hash/licença de assets, overlap/gap/duração, sync, caption, representação/evidência, encode/output/hash e Output QC. `ASSET HASHMISMATCH` é normalizado como `ASSET_HASH_MISMATCH`.

## Mock
`FinalAssemblyAdapter` devolve somente metadados determinísticos. `outputExists` representa o resultado declarado pelo adapter; o mock não cria arquivo físico.
