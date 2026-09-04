# LEI DE IDENTIDADE INVIOLAVEL - CANAL O OUTRO LADO

> Esta regra tem precedencia maxima para todo agente que criar, selecionar, editar ou renderizar cenas.

- Direcao aprovada: DOCUMENTARIO DE CAMPO INVESTIGATIVO v4.0.
- Fonte humana: IDENTIDADE_VISUAL.md.
- Fonte executavel: config/visualIdentity.ts.
- Tese: A imagem nasce da realidade atual; a edicao organiza a evidencia.
- Slogan: O que acontece depois que voce clica, compra, liga ou aperta.
- Assinatura: INVESTIGAR. REVELAR. COMPREENDER.

## 1. Realidade Comanda

Toda imagem e todo plano devem mostrar o ambiente verdadeiro do assunto, tecnologia comercial plausivel, iluminacao pratica e acao fisica observavel. "Campo" significa estar no local real do sistema: lavoura, fabrica, estrada, porto, sala tecnica, documento ou interface realmente usada.

A camada editorial apenas localiza, compara ou prova. Ela nunca substitui o sujeito fotografado.

Proibido: cyberpunk, hologramas, laser decorativo, neon dominante, interfaces flutuantes, fumaca cenografica, equipamento inventado, fotografia de banco generica, pose publicitaria e pessoa olhando para a camera.

## 2. Distribuicao Visual

- matter 50-60%, alvo 55%: materia observacional e operacao real.
- evidence 20-30%, alvo 20%: macro, documento, componente e consequencia fisica.
- maps 10-20%, alvo 15%: escala, territorio, rota e relacao espacial real.
- reveal 5-15%, alvo 10%: freeze curto, comparacao e anotacao tecnica discreta.

## 3. Tratamento

- Base Rec.709 natural, contraste moderado e sombras legiveis.
- Cores do local levemente dessaturadas, sem deslocamento global para ciano.
- Laranja #FF5500 somente em fonte pratica quente, evidencia ou risco pontual.
- Ciano #00F0FF somente em telemetria e coordenada verificavel.
- Grao 35mm fino, halation apenas ao redor de lampadas reais, bloom baixo e vinheta suave.
- Neblina apenas quando causada por poeira, vapor, pulverizacao, umidade ou clima real.
- Formato mestre 16:9, sem letterbox permanente.

## 4. Camera E Montagem

- Observacao: leve deriva de ombro e reenquadramento humano.
- Processo: tracking lateral acompanhando a unidade-personagem.
- Evidencia: macro e rack focus entre componente e efeito.
- Escala: plano elevado lento guiado pela geometria real do ambiente.
- Planos de 2,5 a 4,5 segundos.
- J-cuts, L-cuts e match cuts por forma, materia ou movimento.
- Crossfade de 6 a 8 frames; dip to black apenas em mudanca de capitulo.
- Freeze de evidencia por no maximo 0,8-1,2 segundo.

Proibido: push-in digital permanente, loop de zoom, Ken Burns, parallax falso, movimento uniforme em todas as cenas e plano congelado registrado como video.

## 5. Grafismo Documental

- Texto ocupa no maximo 12% do quadro.
- Nunca usar tarja preta permanente ou titulo gigante cobrindo a evidencia.
- Mapas sao planos, cartograficos e sem brilho.
- Anotacoes sao marcas de auditoria: linha fina, circulo, coordenada e fonte.
- O sujeito principal permanece visivel durante todo grafismo.

## 6. Prompt Global

Todo prompt generativo deve ser criado por buildFireflyPrompt. O sujeito fisico vem primeiro, a identidade de config/visualIdentity.ts vem por ultimo e GLOBAL_NEGATIVE e aplicado integralmente.

O prompt deve especificar ambiente, periodo, equipamento e acao do tema. Nunca injetar lavoura, noite, industria ou qualquer outro dominio quando nao pertencer ao episodio.

## 7. Firefly

Antes de produzir takes, executar pnpm firefly:doctor ou npm run firefly:doctor.

- Sessao autenticada real e obrigatoria.
- Takes de materia devem ser videos temporais reais do Firefly ou clipes aprovados do banco.
- Zero fallbacks sinteticos, loops de PNG, Ken Burns ou derivados de imagem marcados como video.
- Falhas permanecem FAILED; nunca publicar como DONE ou mascarar como DEGRADED.

## 8. Composicao E Render

- Episodios novos usam contracts/episodes/<id>.episode.json e TimelineContract.
- Todo episodio renderiza por CinematicEpisode em remotion/cinema/CinematicEpisode.tsx.
- FilmGrade, HudDirector, SceneTransition, CameraLanguage e CinematicAudioMix sao obrigatorios.
- Proibido assembler artesanal que contorne Remotion.
- Antes de concluir: npm run check e gates de identidade, contrato e movimento.
- Run somente pode ser DONE com MP4 reproduzivel e render_manifest.json autenticado com compositor CinematicEpisode, engine Remotion e SHA-256 do master.

## 9. Voz Oficial

- Provedor: ElevenLabs.
- Voz: Chris.
- Voice ID: iP95p4xoKVk53GoZ742B.
- Modelo: eleven_multilingual_v2.
- Tom: moderno, intimo, sobrio e autoritario, aproximadamente 146 WPM.

## 10. Orquestracao Codex e Emdash

- Emdash gerencia tarefas, branches, worktrees e terminais; o pipeline TypeScript continua sendo a autoridade de producao.
- Agentes Codex especializados vivem em `.codex/agents/`. Use agentes paralelos para exploracao, arquitetura, testes e mudancas independentes.
- Nunca paralelizar duas escritas sobre o mesmo modulo, a mesma run, `runs/`, `public/editorial/execution/`, perfis de navegador ou recursos de render compartilhados.
- Producao real e serial: primeiro `npm run firefly:doctor`, depois `npm run produce:episode -- --episode=<slug> --dry-run`, e somente entao uma run autorizada.
- Firefly, ElevenLabs, dispatch pago, selecao final e publicacao exigem autorizacao humana explicita. Nenhum agente pode fabricar aprovacao ou converter falha em DONE.
- Worktrees devem ficar fora do OneDrive. Elas partem de commits e nao incluem automaticamente alteracoes locais ainda nao commitadas.
- O guia operacional completo esta em `docs/EMDASH_ORCHESTRATION.md`.
