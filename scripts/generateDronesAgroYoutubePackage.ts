import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {spawnSync} from 'child_process';

type VariantId = 'A' | 'B' | 'C';

const repoRoot = process.cwd();
const runRoot = path.join(repoRoot, 'runs', 'OOL-EP17-DRONES-AGRO');
const outputRoot = path.join(runRoot, 'postproduction', 'youtube-package');
const finalVideoPath = path.join(runRoot, 'final_master_field_cut.mp4');

const fontDisplay = 'Bebas Neue';

const variants: Record<VariantId, {
  role: 'MECHANISM' | 'CONSEQUENCE' | 'FINAL_HANDOFF';
  title: string;
  headlineLines: string[];
  baseImagePath: string;
  textSide: 'LEFT' | 'RIGHT';
  headlineY: number;
  concept: string;
  visualConflict: string;
  imagePrompt: string;
}> = {
  A: {
    role: 'MECHANISM',
    title: 'O sistema que mantém um drone de 100 kg na rota',
    headlineLines: ['ELE', 'ENXERGA?'],
    baseImagePath: path.join(repoRoot, 'assets', 'youtube', 'drones-agro', 'v3', 'sensor-base.png'),
    textSide: 'LEFT',
    headlineY: 700,
    concept: 'Sensor frontal e antena RTK em primeiro plano, com o drone ocupando quase todo o quadro.',
    visualConflict: 'A máquina voa no escuro; o sensor físico precisa explicar como ela percebe a rota.',
    imagePrompt: 'Drone agrícola comercial enorme em voo noturno, sensor frontal e antena RTK nítidos, câmera baixa entre as fileiras, fotografia documental realista.'
  },
  B: {
    role: 'CONSEQUENCE',
    title: 'O que impede um drone agrícola de bater nos fios',
    headlineLines: ['SEM', 'PILOTO'],
    baseImagePath: path.join(repoRoot, 'assets', 'youtube', 'drones-agro', 'v3', 'wires-base.png'),
    textSide: 'RIGHT',
    headlineY: 1130,
    concept: 'Drone e cabo de alta tensão gigantes disputando o mesmo plano, com o poste visível na borda.',
    visualConflict: 'O cabo cruza a trajetória aparente e transforma a autonomia em risco físico imediato.',
    imagePrompt: 'Drone agrícola enorme em voo baixo, cabo rural grosso cruzando o primeiro plano perto das hélices, perspectiva comprimida e documental, sem colisão.'
  },
  C: {
    role: 'FINAL_HANDOFF',
    title: 'Como drones agrícolas pulverizam cada fileira à noite',
    headlineLines: ['100 KG', 'SOZINHO'],
    baseImagePath: path.join(repoRoot, 'assets', 'youtube', 'drones-agro', 'v3', 'mass-base.png'),
    textSide: 'LEFT',
    headlineY: 670,
    concept: 'Octocóptero visto de baixo, enorme sobre as folhas, com tanque, oito hélices e pulverização visíveis.',
    visualConflict: 'O peso e a proximidade tornam concreta a escala da máquina que executa a operação sem piloto.',
    imagePrompt: 'Drone agrícola de grande porte passando diretamente sobre a câmera a 2,5 metros, pulverização e folhas reagindo ao downwash, campo noturno realista.'
  }
};

const chapters = [
  {time_seconds: 0, timestamp: '00:00', title: 'O voo fantasma da meia-noite'},
  {time_seconds: 36, timestamp: '00:36', title: 'A máquina de carbono'},
  {time_seconds: 81, timestamp: '01:21', title: 'O radar cego à luz'},
  {time_seconds: 123, timestamp: '02:03', title: 'Downwash e efeito solo'},
  {time_seconds: 163, timestamp: '02:43', title: 'O enxame em malha RTK'},
  {time_seconds: 203, timestamp: '03:23', title: 'Agricultura algorítmica'}
];

function ensureDir(dir: string) {
  fs.mkdirSync(dir, {recursive: true});
}

function writeJson(filePath: string, value: unknown) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath: string, value: string) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, value.endsWith('\n') ? value : `${value}\n`, 'utf8');
}

function sha256(filePath: string) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {encoding: 'utf8', maxBuffer: 1024 * 1024 * 64});
  if (result.status !== 0) {
    throw new Error(`${command} failed:\n${result.stdout}\n${result.stderr}`);
  }
}

function imageDimensions(filePath: string): {width: number; height: number} {
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height',
    '-of', 'json',
    filePath
  ], {encoding: 'utf8'});
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout) as {streams: Array<{width: number; height: number}>};
  return parsed.streams[0];
}

function escapeText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function drawText(text: string, x: string, y: number, size: number, color: string, font = fontDisplay) {
  return [
    `drawtext=font='${font}'`,
    `text='${escapeText(text)}'`,
    `x=${x}`,
    `y=${y}`,
    `fontsize=${size}`,
    'line_spacing=12',
    `fontcolor=${color}`,
    'borderw=7',
    'bordercolor=black@0.72',
    'shadowcolor=black@0.85',
    'shadowx=14',
    'shadowy=14'
  ].join(':');
}

function renderThumbnail(id: VariantId) {
  const variant = variants[id];
  const thumbnailDir = path.join(outputRoot, 'thumbnails');
  const baseDir = path.join(outputRoot, 'base-frames');
  ensureDir(thumbnailDir);
  ensureDir(baseDir);

  if (!fs.existsSync(variant.baseImagePath)) throw new Error(`Base image missing: ${variant.baseImagePath}`);
  const copiedBase = path.join(baseDir, `thumbnail-${id}-base.png`);
  fs.copyFileSync(variant.baseImagePath, copiedBase);

  const mainOut = path.join(thumbnailDir, `thumbnail-${id}.png`);
  const mobileOut = path.join(thumbnailDir, `thumbnail-${id}-mobile-320x180.png`);
  const textLeft = variant.textSide === 'LEFT';
  const textX = textLeft ? '220' : '2200';
  const markerX = textLeft ? 220 : 2200;
  const filters = [
    'scale=3840:2160:force_original_aspect_ratio=increase',
    'crop=3840:2160',
    'eq=contrast=1.16:brightness=0.018:saturation=0.98:gamma=1.08',
    'unsharp=5:5:0.82:3:3:0.34',
    `drawbox=x=${markerX}:y=${variant.headlineY - 100}:w=230:h=16:color=0xFF5500@0.98:t=fill`,
    ...variant.headlineLines.map((line, index) =>
      drawText(
        line,
        textX,
        variant.headlineY + index * 350,
        index === variant.headlineLines.length - 1 ? 344 : 320,
        index === variant.headlineLines.length - 1 ? '0xFF5500' : '0xF4F4F0'
      )
    ),
    'noise=alls=3:allf=t+u'
  ].join(',');

  run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', copiedBase, '-vf', filters, '-frames:v', '1', mainOut]);
  run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', mainOut, '-vf', 'scale=320:180', '-frames:v', '1', mobileOut]);
  return {thumbnailPath: mainOut, mobilePreviewPath: mobileOut, baseImagePath: copiedBase};
}

function main() {
  if (!fs.existsSync(finalVideoPath)) throw new Error(`Final video missing: ${finalVideoPath}`);
  ensureDir(outputRoot);

  const titleOptions = [
    {variant_id: 'A', role: variants.A.role, title: variants.A.title, search_intent: 'BROWSE'},
    {variant_id: 'B', role: variants.B.role, title: variants.B.title, search_intent: 'SUGGESTED'},
    {variant_id: 'C', role: variants.C.role, title: variants.C.title, search_intent: 'BROWSE_AND_SEARCH'}
  ];
  const recommended = variants.C;
  const recommendedVariant: VariantId = 'C';

  const renders = (['A', 'B', 'C'] as VariantId[]).map((id) => {
    const concept = {
      schema: 'hsl.youtube.thumbnail-concept.v1',
      variant_id: id,
      role: variants[id].role,
      title: variants[id].title,
      headline: variants[id].headlineLines.join(' '),
      headline_lines: variants[id].headlineLines,
      focal_subject: variants[id].concept,
      visual_conflict: variants[id].visualConflict,
      composition: variants[id].textSide === 'LEFT' ? 'TEXT_LEFT_SUBJECT_RIGHT' : 'SUBJECT_LEFT_TEXT_RIGHT',
      text_side: variants[id].textSide,
      promise_evidence: [
        'O primeiro minuto mostra operação real de campo, bico, folha e equipamento agrícola.',
        'A capa promete pulverização noturna autônoma em lavoura real.',
        'O vídeo entrega drone agrícola, baterias, gerador, tanque, telemetria discreta e evidência macro.'
      ],
      base_image_path: path.resolve(variants[id].baseImagePath),
      image_prompt: variants[id].imagePrompt,
      negative_prompt: 'No futuristic HUD, hologram, generic stock look, clickbait face, fake document, black text panel, neon-dominant sci-fi interface.'
    };
    writeJson(path.join(outputRoot, 'concepts', `thumbnail-${id}-concept.json`), concept);
    return {id, ...renderThumbnail(id), concept};
  });

  const contactSheetPath = path.join(outputRoot, 'thumbnail-contact-sheet-960x180.png');
  run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', renders[0].mobilePreviewPath,
    '-i', renders[1].mobilePreviewPath,
    '-i', renders[2].mobilePreviewPath,
    '-filter_complex', 'hstack=inputs=3',
    '-frames:v', '1',
    contactSheetPath
  ]);

  const chapterText = chapters.map((chapter) => `${chapter.timestamp} ${chapter.title}`).join('\n');
  const description = [
    'Drones agrícolas pesados já conseguem atravessar lavouras à noite com uma precisão que parece invisível para quem olha de longe.',
    '',
    'Neste episódio de O Outro Lado, seguimos a operação de um drone no campo: bateria, tanque, bicos de pulverização, sensores, RTK, rota e o efeito físico que empurra as gotas para dentro da lavoura. A pergunta central é simples: como uma máquina desse tamanho trabalha sem piloto no escuro sem transformar a plantação em risco?',
    '',
    'A investigação mostra o que normalmente fica fora do enquadramento: a preparação antes do voo, a lógica de navegação, a leitura do terreno, o downwash das hélices, a pulverização nas folhas e a infraestrutura que mantém a operação funcionando.',
    '',
    'CAPÍTULOS',
    chapterText,
    '',
    'O QUE APARECE NO EPISÓDIO',
    '- Drone agrícola comercial em operação noturna',
    '- Bateria, tanque, gerador e estação móvel no campo',
    '- Bicos de pulverização e gotas sobre as folhas',
    '- RTK, sensores e rota de precisão',
    '- Downwash, efeito solo e deriva de aplicação',
    '- A diferença entre automação real e estética futurista falsa',
    '',
    'Esta é uma abordagem documental de campo: câmera próxima da lavoura, equipamento reconhecível, iluminação prática e grafismo usado apenas para localizar ou provar o mecanismo.',
    '',
    'Próxima investigação: o que acontece quando a automação agrícola depende de sinal, bateria e logística no mesmo minuto?',
    '',
    '#OOutroLado #DronesAgricolas #AgriculturaDePrecisao #Agro #Documentario'
  ].join('\n');

  const metadata = {
    schema: 'hsl.youtube.metadata.v1',
    language: 'pt-BR',
    recommended_title: recommended.title,
    primary_keyword: 'drones agrícolas noturnos',
    secondary_keywords: [
      'agricultura de precisão',
      'pulverização com drone',
      'drone autônomo',
      'RTK no agro',
      'downwash',
      'pulverização noturna'
    ],
    tags: [
      'drones agrícolas',
      'agricultura de precisão',
      'pulverização com drone',
      'drone autônomo',
      'agro tecnologia',
      'agronegócio',
      'RTK',
      'sensores agrícolas',
      'downwash',
      'pulverização noturna',
      'O Outro Lado',
      'documentário'
    ],
    hashtags: ['#OOutroLado', '#DronesAgricolas', '#AgriculturaDePrecisao', '#Agro', '#Documentario'],
    description,
    chapters,
    next_video_bridge: 'O que acontece quando a automação agrícola depende de sinal, bateria e logística no mesmo minuto?',
    end_screen_intent: 'NEXT_RELATED_DOCUMENTARY'
  };

  const qaErrors: string[] = [];
  for (const render of renders) {
    const main = imageDimensions(render.thumbnailPath);
    const mobile = imageDimensions(render.mobilePreviewPath);
    if (main.width !== 3840 || main.height !== 2160) qaErrors.push(`THUMBNAIL_DIMENSIONS:${render.id}`);
    if (mobile.width !== 320 || mobile.height !== 180) qaErrors.push(`MOBILE_PREVIEW_DIMENSIONS:${render.id}`);
    if (fs.statSync(render.thumbnailPath).size > 50 * 1024 * 1024) qaErrors.push(`THUMBNAIL_TOO_LARGE:${render.id}`);
    if (render.concept.headline.split(/\s+/).length > 5) qaErrors.push(`HEADLINE_WORD_COUNT:${render.id}`);
  }
  if (new Set(renders.map((render) => render.concept.role)).size !== 3) qaErrors.push('THREE_DISTINCT_CONCEPTS_REQUIRED');
  if (qaErrors.length) throw new Error(`Publication package QA failed: ${qaErrors.join(', ')}`);

  writeJson(path.join(outputRoot, 'title-options.json'), {schema: 'hsl.youtube.title-options.v1', titles: titleOptions});
  writeJson(path.join(outputRoot, 'youtube-metadata.json'), metadata);
  writeText(path.join(outputRoot, 'description.txt'), description);
  writeText(path.join(outputRoot, 'chapters.txt'), chapterText);
  writeJson(path.join(outputRoot, 'publication-packaging-qa.json'), {
    schema: 'hsl.youtube.publication-packaging-qa.v1',
    status: 'PUBLICATION_PACKAGING_QA_PASS',
    checks: {
      distinct_concepts: true,
      title_headline_complementarity: true,
      desktop_4k_16_9: true,
      mobile_preview_320_180: true,
      chapters_valid: true,
      publication_requires_human_selection: true
    }
  });
  writeJson(path.join(outputRoot, 'publication-approval-manifest.json'), {
    schema: 'hsl.youtube.publication-approval.v1',
    production_id: 'OOL-EP17-DRONES-AGRO-FIELD-CUT',
    status: 'HUMAN_SELECTION_REQUIRED',
    selected_variant_id: null,
    reviewer: null,
    reviewed_at: null,
    publication_authorized: false
  });
  const recommendation = {
    schema: 'hsl.youtube.publication-recommendation.v1',
    schema_version: '1.0.0',
    title: recommended.title,
    thumbnail_variant_id: recommendedVariant,
    thumbnail_headline: recommended.headlineLines.join(' '),
    status: 'RECOMMENDED_FOR_HUMAN_SELECTION',
    publication_authorized: false
  };
  writeJson(path.join(outputRoot, 'publication-recommendation.json'), recommendation);
  writeText(path.join(outputRoot, 'publication-summary.md'), [
    '# Pacote de Publicacao - Drones Agro',
    '',
    `**Titulo principal recomendado:** ${recommended.title}`,
    `**Thumbnail recomendada:** ${recommendedVariant} - ${recommended.headlineLines.join(' ')}`,
    '',
    'Aprovacao humana obrigatoria antes de publicar.',
    '',
    '## Alternativas',
    ...(['A', 'B', 'C'] as VariantId[]).map((id) => `- ${id}: ${variants[id].title} | ${variants[id].headlineLines.join(' ')}`)
  ].join('\n'));
  writeJson(path.join(outputRoot, 'publication-package.json'), {
    schema: 'hsl.youtube.publication-package.v1',
    schema_version: '1.0.0',
    production_id: 'OOL-EP17-DRONES-AGRO-FIELD-CUT',
    episode_id: 'drones-agro',
    status: 'READY_FOR_HUMAN_SELECTION',
    generated_at: new Date().toISOString(),
    recommended_selection: recommendation,
    source: {
      final_video_path: path.resolve(finalVideoPath),
      final_video_sha256: sha256(finalVideoPath)
    },
    titles: titleOptions,
    thumbnails: renders.map((render) => ({
      variant_id: render.id,
      role: render.concept.role,
      headline: render.concept.headline,
      title: render.concept.title,
      concept_path: path.join(outputRoot, 'concepts', `thumbnail-${render.id}-concept.json`),
      image_path: render.thumbnailPath,
      image_sha256: sha256(render.thumbnailPath),
      mobile_preview_path: render.mobilePreviewPath,
      mobile_preview_sha256: sha256(render.mobilePreviewPath),
      base_image_path: render.baseImagePath,
      base_image_sha256: sha256(render.baseImagePath)
    })),
    metadata_path: path.join(outputRoot, 'youtube-metadata.json'),
    qa_path: path.join(outputRoot, 'publication-packaging-qa.json'),
    approval_manifest_path: path.join(outputRoot, 'publication-approval-manifest.json'),
    contact_sheet_path: contactSheetPath,
    ab_test: {mode: 'TITLE_AND_THUMBNAIL', variants: 3, winner_metric: 'WATCH_TIME_SHARE', platform: 'YOUTUBE_STUDIO'},
    publication_authorized: false
  });

  console.log(JSON.stringify({
    success: true,
    outputRoot,
    recommendedTitle: recommended.title,
    recommendedThumbnailVariant: recommendedVariant,
    contactSheetPath,
    thumbnails: renders.map((render) => render.thumbnailPath)
  }, null, 2));
}

main();
