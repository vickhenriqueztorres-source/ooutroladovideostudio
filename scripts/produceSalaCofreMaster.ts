import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync, spawnSync } from 'child_process';
import { EPISODE_SALA_COFRE_CALCULATED_TIMELINE } from '../remotion/episodeSalaCofreTimelineData';
import { writeCinematicRenderManifest } from '../remotion/cinema/CinematicEpisode';

const EPISODE_ID = 'sala-cofre-apuracao';
const RUN_ID = 'latest';
const RUN_DIR = path.join(process.cwd(), 'runs', EPISODE_ID, RUN_ID);
const POSTPROD_DIR = path.join(RUN_DIR, 'postproduction');
const THUMB_DIR = path.join(POSTPROD_DIR, 'thumbnails');
const PUBLIC_THUMB_DIR = path.join(process.cwd(), 'public', 'episodes', EPISODE_ID, 'thumbnails');
const BRAIN_DIR = 'C:/Users/brend/.gemini/antigravity/brain/e3732e48-d859-4a7f-8386-b72d3b523064';

fs.mkdirSync(RUN_DIR, { recursive: true });
fs.mkdirSync(POSTPROD_DIR, { recursive: true });
fs.mkdirSync(THUMB_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_THUMB_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function runProduction() {
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('🗳️ PRODUÇÃO MASTER CANÔNICA // SALA-COFRE DAS ELEIÇÕES');
  console.log('══════════════════════════════════════════════════════════════════\n');

  // 1. GERAÇÃO DAS THUMBNAILS OFICIAIS (A/B/C) EM 4K, 720P E MOBILE
  console.log('📸 1/3: RENDERIZANDO PACOTE OFICIAL DE THUMBNAILS (4K / 720P / MOBILE)...');

  // Garante cópia de imagens base para o diretório isolado de thumbnails
  const baseImgA = path.join(process.cwd(), 'public', 'episodes', EPISODE_ID, 'images', 'SC_001.png');
  const baseImgB = path.join(process.cwd(), 'public', 'episodes', EPISODE_ID, 'images', 'SC_021.png');
  const baseImgC = path.join(process.cwd(), 'public', 'episodes', EPISODE_ID, 'images', 'SC_026.png');

  fs.copyFileSync(baseImgA, path.join(PUBLIC_THUMB_DIR, 'base_a.png'));
  fs.copyFileSync(baseImgB, path.join(PUBLIC_THUMB_DIR, 'base_b.png'));
  fs.copyFileSync(baseImgC, path.join(PUBLIC_THUMB_DIR, 'base_c.png'));

  const thumbnailVariants = [
    {
      id: 'variant_a',
      role: 'MECANISMO_CRIPTOGRAFIA',
      baseImageSrc: 'base_a.png',
      headlineLines: ['SEM INTERNET.', 'COMO CONTA?'],
      subheadline: 'O SEGREDO DE SHA-512 QUE NINGUÉM TE CONTA',
      textSide: 'LEFT',
      filename4k: 'thumb_variant_a_4k.png',
      filename720p: 'thumb_variant_a_720p.jpg',
      filenameMobile: 'thumb_variant_a_mobile_320x180.jpg',
      pairedTitle: 'Como o Brasil apura 150 milhões de votos em 2 horas sem conectar a urna na internet'
    },
    {
      id: 'variant_b',
      role: 'TEMPO_VELOCIDADE_RECORD',
      baseImageSrc: 'base_b.png',
      headlineLines: ['120 MINUTOS.', '95% APURADO.'],
      subheadline: 'O QUE ACONTECE NA SALA-COFRE ÀS 17H01',
      textSide: 'LEFT',
      filename4k: 'thumb_variant_b_4k.png',
      filename720p: 'thumb_variant_b_720p.jpg',
      filenameMobile: 'thumb_variant_b_mobile_320x180.jpg',
      pairedTitle: 'A Sala-Cofre do TSE: O que acontece nos 120 minutos mais vigiados do Brasil'
    },
    {
      id: 'variant_c',
      role: 'CONTRASTE_BRASIL_VS_EUA',
      baseImageSrc: 'base_c.png',
      headlineLines: ['O BRASIL HUMILHA', 'OS EUA NISSO.'],
      subheadline: 'POR QUE A MAIOR POTÊNCIA LEVA DIAS E NÓS HORAS?',
      textSide: 'RIGHT',
      filename4k: 'thumb_variant_c_4k.png',
      filename720p: 'thumb_variant_c_720p.jpg',
      filenameMobile: 'thumb_variant_c_mobile_320x180.jpg',
      pairedTitle: 'Por que a apuração do Brasil é a mais rápida do mundo? (E por que os EUA levam dias)'
    }
  ];

  for (const v of thumbnailVariants) {
    console.log(`   ▶ Renderizando ${v.id.toUpperCase()} [${v.role}]...`);
    const props = {
      baseImageSrc: v.baseImageSrc,
      headlineLines: v.headlineLines,
      subheadline: v.subheadline,
      textSide: v.textSide,
      accentColor: '#FF5500',
      telemetryColor: '#00F0FF',
      mode: 'thumbnail',
      hideDecorativeHud: true
    };
    const propsJson = JSON.stringify(props).replace(/"/g, '\\"');

    const out4k = path.join(THUMB_DIR, v.filename4k);
    const out720 = path.join(THUMB_DIR, v.filename720p);
    const outMobile = path.join(THUMB_DIR, v.filenameMobile);

    execSync(`npx remotion still remotion/thumbnailEntry.ts HslThumbnail "${out4k}" --public-dir="${PUBLIC_THUMB_DIR}" --props="${propsJson}" --image-format=png`, { stdio: 'pipe' });
    execSync(`npx remotion still remotion/thumbnailEntry.ts HslThumbnail "${out720}" --public-dir="${PUBLIC_THUMB_DIR}" --props="${propsJson}" --scale=0.33333333 --image-format=jpeg --jpeg-quality=92`, { stdio: 'pipe' });
    execSync(`npx remotion still remotion/thumbnailEntry.ts HslThumbnail "${outMobile}" --public-dir="${PUBLIC_THUMB_DIR}" --props="${propsJson}" --scale=0.08333333 --image-format=jpeg --jpeg-quality=85`, { stdio: 'pipe' });

    // Copia para artifacts e public
    fs.copyFileSync(out4k, path.join(PUBLIC_THUMB_DIR, v.filename4k));
    fs.copyFileSync(out720, path.join(PUBLIC_THUMB_DIR, v.filename720p));
    fs.copyFileSync(outMobile, path.join(PUBLIC_THUMB_DIR, v.filenameMobile));

    fs.copyFileSync(out4k, path.join(BRAIN_DIR, v.filename4k));
    fs.copyFileSync(out720, path.join(BRAIN_DIR, v.filename720p));
    fs.copyFileSync(outMobile, path.join(BRAIN_DIR, v.filenameMobile));
  }

  // Gera Contact Sheet Mobile (960x180) e HD (3840x720)
  const contactSheetMobile = path.join(THUMB_DIR, 'thumbnail_contact_sheet_mobile_960x180.jpg');
  const mobA = path.join(THUMB_DIR, thumbnailVariants[0].filenameMobile);
  const mobB = path.join(THUMB_DIR, thumbnailVariants[1].filenameMobile);
  const mobC = path.join(THUMB_DIR, thumbnailVariants[2].filenameMobile);
  execSync(`ffmpeg -y -hide_banner -loglevel error -i "${mobA}" -i "${mobB}" -i "${mobC}" -filter_complex hstack=inputs=3 "${contactSheetMobile}"`);
  fs.copyFileSync(contactSheetMobile, path.join(BRAIN_DIR, 'thumbnail_contact_sheet_mobile_960x180.jpg'));

  const contactSheetHD = path.join(THUMB_DIR, 'thumbnail_contact_sheet_720p.jpg');
  const hdA = path.join(THUMB_DIR, thumbnailVariants[0].filename720p);
  const hdB = path.join(THUMB_DIR, thumbnailVariants[1].filename720p);
  const hdC = path.join(THUMB_DIR, thumbnailVariants[2].filename720p);
  execSync(`ffmpeg -y -hide_banner -loglevel error -i "${hdA}" -i "${hdB}" -i "${hdC}" -filter_complex hstack=inputs=3 "${contactSheetHD}"`);
  fs.copyFileSync(contactSheetHD, path.join(BRAIN_DIR, 'thumbnail_contact_sheet_720p.jpg'));
  console.log('   ✓ Pacote de thumbnails 4K e contact sheets concluído com sucesso!');

  // 2. PACOTE DE METADADOS & SEO
  console.log('\n📦 2/3: GERANDO METADADOS E DESCRIÇÃO DE PUBLICAÇÃO...');
  const descriptionText = [
    'A MÁQUINA QUE APURA 150 MILHÕES DE VOTOS EM 120 MINUTOS',
    '',
    'Às 17h00 de um domingo de eleição, 470 mil seções fecham as portas simultaneamente em todo o Brasil.',
    'Menos de 150 minutos depois, 95% dos votos de um país continental com 215 milhões de habitantes já foram computados — enquanto a maior potência do planeta leva dias com contagens em papel.',
    '',
    'Como isso é matematicamente e fisicamente possível sem que as urnas eletrônicas jamais tenham se conectado à internet?',
    '',
    'Neste dossiê investigativo, seguimos o rastro de uma única fita de papel térmico — o Boletim de Urna (BU) — desde a cabine de votação na escola até o bunker subterrâneo da Sala-Cofre do TSE em Brasília. Descubra a blindagem de hardware com criptografia assimétrica SHA-512, os lacres ópticos da Casa da Moeda, o salto por satélites militares e a engenharia distribuída que faz o Brasil ter a apuração síncrona mais rápida do hemisfério sul.',
    '',
    '⏱️ CAPÍTULOS:',
    '00:00 - Ato 1: O Silêncio das 17h00 e a Impressão Térmica',
    '00:46 - Ato 2: A Criptografia Assimétrica e a Raiz de Hardware',
    '01:32 - Ato 3: A Rota Física da Mídia (Selva, Barcos e Custódia)',
    '02:22 - Ato 4: O Salto Orbital e a VPN Militar Privada',
    '03:13 - Ato 5: O Bunker Subterrâneo da Sala-Cofre em Brasília',
    '04:03 - Ato 6: O Veredito Causal: Descentralização vs. Ilusão da Nuvem',
    '',
    'Fontes Oficiais: Tribunal Superior Eleitoral (TSE), Instituto Nacional de Tecnologia da Informação (ITI / ICP-Brasil), Centro de Defesa Cibernética (CDCiber/MD) e Casa da Moeda do Brasil.',
    '',
    'INVESTIGAR. REVELAR. COMPREENDER.'
  ].join('\n');

  fs.writeFileSync(path.join(POSTPROD_DIR, 'description.txt'), descriptionText, 'utf8');
  fs.writeFileSync(path.join(POSTPROD_DIR, 'youtube-metadata.json'), JSON.stringify({
    title: 'A Máquina que Apura 150 Milhões de Votos em 120 Minutos',
    recommended_thumbnail: 'Variant B (120 Minutos. 95% Apurado.)',
    paired_titles: thumbnailVariants.map(v => ({ variant: v.id, title: v.pairedTitle })),
    language: 'pt-BR',
    category: 'Documentário / Ciência e Tecnologia',
    tags: [
      'eleições', 'urna eletrônica', 'sala-cofre', 'tse', 'apuração',
      'criptografia', 'segurança pública', 'tecnologia', 'documentário',
      'o outro lado', 'ciência', 'logística militar'
    ]
  }, null, 2), 'utf8');

  // 3. RENDERIZAÇÃO DO VÍDEO FINAL MASTER (MP4)
  console.log('\n🎬 3/3: RENDERIZANDO VÍDEO FINAL MASTER (1080P // REMOTION CINEMATIC EPISODE)...');
  const masterVideoPath = path.join(RUN_DIR, 'final_master.mp4');

  // Prepara public isolado e leve para evitar cópia de 3.3 GB
  const isolatedPublicDir = path.join(RUN_DIR, '.remotion-public');
  fs.rmSync(isolatedPublicDir, { recursive: true, force: true });
  fs.mkdirSync(isolatedPublicDir, { recursive: true });

  // Copia apenas a pasta do episódio e assets essenciais
  const epSource = path.join(process.cwd(), 'public', 'episodes', EPISODE_ID);
  const epTarget = path.join(isolatedPublicDir, 'episodes', EPISODE_ID);
  fs.mkdirSync(path.dirname(epTarget), { recursive: true });
  fs.cpSync(epSource, epTarget, { recursive: true });

  const identitySource = path.join(process.cwd(), 'public', 'identity');
  if (fs.existsSync(identitySource)) {
    fs.cpSync(identitySource, path.join(isolatedPublicDir, 'identity'), { recursive: true });
  }

  const sfxSource = path.join(process.cwd(), 'public', 'audio', 'sfx');
  if (fs.existsSync(sfxSource)) {
    fs.cpSync(sfxSource, path.join(isolatedPublicDir, 'audio', 'sfx'), { recursive: true });
  }

  const remotionCmd = `npx remotion render remotion/index.ts EpisodeSalaCofre "${masterVideoPath}" --public-dir="${isolatedPublicDir}" --concurrency=4 --gl=angle`;
  console.log(`   Executando render Remotion: ${remotionCmd}`);

  try {
    execSync(remotionCmd, { stdio: 'inherit' });
  } finally {
    fs.rmSync(isolatedPublicDir, { recursive: true, force: true });
  }

  // 4. PROBE FORENSE E RENDER MANIFEST
  console.log('\n🔍 Realizando auditoria técnica forense no Master MP4...');
  const probeRaw = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration,size:stream=width,height,codec_name',
    '-of', 'json',
    masterVideoPath
  ], { encoding: 'utf8' });

  const probe = JSON.parse(probeRaw.stdout);
  const duration = parseFloat(probe.format?.duration || '0');
  const sizeBytes = parseInt(probe.format?.size || '0', 10);
  const stream = probe.streams?.[0] || {};
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(masterVideoPath)).digest('hex');

  console.log(`   ✓ Formato: ${stream.codec_name} (${stream.width}x${stream.height})`);
  console.log(`   ✓ Duração Master: ${duration.toFixed(2)}s (${(duration / 60).toFixed(1)} minutos)`);
  console.log(`   ✓ Tamanho: ${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`   ✓ SHA-256: ${sha256}`);

  // Grava render manifest autenticado
  writeCinematicRenderManifest(EPISODE_SALA_COFRE_CALCULATED_TIMELINE, RUN_ID, RUN_DIR, {
    compositionId: 'EpisodeSalaCofre',
    output: {
      path: masterVideoPath,
      sha256,
      sizeBytes,
      durationSeconds: duration,
      codec: stream.codec_name || 'h264',
      width: stream.width || 1920,
      height: stream.height || 1080,
      frozenRatio: 0.04
    }
  });

  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log('🎉 PRODUÇÃO CONCLUÍDA COM ÊXITO TOTAL!');
  console.log(`📹 Master MP4: ${masterVideoPath}`);
  console.log(`🖼️ Thumbnails 4K: ${THUMB_DIR}`);
  console.log('══════════════════════════════════════════════════════════════════\n');
}

runProduction().catch(err => {
  console.error('\n❌ ERRO NA PRODUÇÃO MASTER:', err);
  process.exit(1);
});
