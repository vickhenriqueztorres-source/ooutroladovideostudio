import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const baseDir = process.cwd();
const targetEpDir = path.join(baseDir, 'public', 'episodes', 'diario-oficial-3-da-madrugada');
const targetImagesDir = path.join(targetEpDir, 'images');
const targetTakesDir = path.join(targetEpDir, 'takes');
const targetAudioDir = path.join(targetEpDir, 'audio', 'narration');
const targetMusicDir = path.join(targetEpDir, 'audio', 'music');
const targetThumbDir = path.join(targetEpDir, 'thumbnails');

fs.mkdirSync(targetImagesDir, { recursive: true });
fs.mkdirSync(targetTakesDir, { recursive: true });
fs.mkdirSync(targetAudioDir, { recursive: true });
fs.mkdirSync(targetMusicDir, { recursive: true });
fs.mkdirSync(targetThumbDir, { recursive: true });

console.log('🏛️ PREPARANDO ASSETS PARA: O Outro Lado das 3 da Madrugada...');

// 1. Clonar assets visuais e takes canônicos correspondentes
const sourceEpDir = path.join(baseDir, 'public', 'episodes', 'linha-segura-presidencial');
const sourceImages = path.join(sourceEpDir, 'images');
const sourceTakes = path.join(sourceEpDir, 'takes');
const sourceNarration = path.join(sourceEpDir, 'audio', 'narration');

for (let i = 1; i <= 30; i++) {
  const scId = `SC_${i.toString().padStart(3, '0')}`;
  
  // Imagem
  const srcImg = path.join(sourceImages, `${scId}.png`);
  const dstImg = path.join(targetImagesDir, `${scId}.png`);
  if (fs.existsSync(srcImg) && !fs.existsSync(dstImg)) {
    fs.copyFileSync(srcImg, dstImg);
  }

  // Take de vídeo
  const srcTake = path.join(sourceTakes, `${scId}.mp4`);
  const dstTake = path.join(targetTakesDir, `${scId}.mp4`);
  if (fs.existsSync(srcTake) && !fs.existsSync(dstTake)) {
    fs.copyFileSync(srcTake, dstTake);
  }

  // Narração
  const srcAudio = path.join(sourceNarration, `${scId}.mp3`);
  const dstAudio = path.join(targetAudioDir, `${scId}.mp3`);
  if (fs.existsSync(srcAudio) && !fs.existsSync(dstAudio)) {
    fs.copyFileSync(srcAudio, dstAudio);
  }
}

// 2. Cama musical investigativa
const srcBed = path.join(baseDir, 'public', 'episodes', 'rede-eletrica-60hz', 'audio', 'music', 'bed.wav');
const dstBed = path.join(targetMusicDir, 'bed.wav');
if (fs.existsSync(srcBed) && !fs.existsSync(dstBed)) {
  fs.copyFileSync(srcBed, dstBed);
}

console.log('✅ Imagens, takes e áudios preparados com sucesso!');

// 3. Renderizar as 3 Thumbnails 4K Oficiais com Tipografia do Canal
const thumbnails = [
  {
    filename: 'thumb_variant_a_with_text.png',
    baseImageSrc: 'assets/submarine_curated/server_room_datacenter.jpg',
    headlineLines: ['ÀS', '03:00.'],
    subheadline: 'O SERVIDOR SECRETO QUE CRIA AS LEIS.',
    categoryBadge: 'INVESTIGAÇÃO FORENSE // O OUTRO LADO',
    textSide: 'LEFT' as const,
    revealPercentage: 88,
    coordinates: '15.7975° S, 47.8636° W'
  },
  {
    filename: 'thumb_variant_b_with_text.png',
    baseImageSrc: 'episodes/linha-segura-presidencial/images/SC_003.png',
    headlineLines: ['SEM', 'VOLTA.'],
    subheadline: 'A JANELA CRÍTICA DAS 04:59.',
    categoryBadge: 'GARGALO DE ESTADO // O OUTRO LADO',
    textSide: 'LEFT' as const,
    revealPercentage: 94,
    coordinates: '15.7980° S, 47.8640° W'
  },
  {
    filename: 'thumb_variant_c_with_text.png',
    baseImageSrc: 'episodes/linha-segura-presidencial/images/SC_014.png',
    headlineLines: ['NOVA', 'LEI.'],
    subheadline: '215 MILHÕES DE PESSOAS AFETADAS.',
    categoryBadge: 'INFRAESTRUTURA DE PODER // O OUTRO LADO',
    textSide: 'LEFT' as const,
    revealPercentage: 76,
    coordinates: '15.7938° S, 47.8828° W'
  }
];

console.log('\n🎨 RENDERIZANDO THUMBNAILS 4K COM TIPOGRAFIA OFICIAL...');

const brainDir = 'C:/Users/brend/.gemini/antigravity/brain/96ed0e32-bebf-4c0c-bffa-f274f1c7ac9c';

for (const t of thumbnails) {
  const outPath = path.join(targetThumbDir, t.filename);
  const props = {
    baseImageSrc: t.baseImageSrc,
    headlineLines: t.headlineLines,
    subheadline: t.subheadline,
    categoryBadge: t.categoryBadge,
    textSide: t.textSide,
    revealPercentage: t.revealPercentage,
    coordinates: t.coordinates,
    accentColor: '#FF5500',
    telemetryColor: '#00F0FF',
    mode: 'thumbnail',
    hideDecorativeHud: true
  };

  const propsJson = JSON.stringify(props).replace(/"/g, '\\"');
  const cmd = `npx remotion still remotion/index.ts HslThumbnail "${outPath}" --props="${propsJson}" --image-format=png`;

  console.log(`Renderizando ${t.filename} (4K 3840x2160)...`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    const brainTarget = path.join(brainDir, t.filename);
    fs.copyFileSync(outPath, brainTarget);
    console.log(`✅ ${t.filename} salva em public e artifacts!`);
  } catch (err: any) {
    console.error(`Erro renderizando ${t.filename}:`, err.message);
  }
}

console.log('🎉 Concluída a preparação de assets e render de thumbnails!');
