const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const thumbDir = path.resolve('public/episodes/raio-x-aeroporto/thumbnails');
const brainDir = 'C:/Users/brend/.gemini/antigravity/brain/409cadce-edc4-48eb-ad29-edbcc7166ce3';

fs.mkdirSync(thumbDir, { recursive: true });
fs.mkdirSync(brainDir, { recursive: true });

const officialVariants = [
  {
    id: 'variant_a',
    hypothesis: 'NEGACAO_MODELO_MENTAL_MECANISMO',
    filename4k: 'thumb_variant_a_4k.png',
    filename720p: 'thumb_variant_a_1280x720.jpg',
    filenameMobile: 'thumb_variant_a_mobile_320x180.jpg',
    baseImageSrc: 'base_variant_a_rx012.png',
    headlineLines: ['NÃO ADIANTA', 'ESCONDER.'],
    subheadline: 'O QUE O FISCAL VÊ EM 2 SEGUNDOS NA ESTEIRA',
    textSide: 'LEFT',
    pairedTitle: 'O que a máquina do aeroporto realmente vê quando sua mala passa na esteira'
  },
  {
    id: 'variant_b',
    hypothesis: 'RISCO_PONTO_CRITICO_CODIGO_COR',
    filename4k: 'thumb_variant_b_4k.png',
    filename720p: 'thumb_variant_b_1280x720.jpg',
    filenameMobile: 'thumb_variant_b_mobile_320x180.jpg',
    baseImageSrc: 'base_variant_b_orange.png',
    headlineLines: ['SE FICAR', 'LARANJA...'],
    subheadline: 'A COR QUE FAZ A ALFÂNDEGA ABRIR SUA MALA',
    textSide: 'LEFT',
    pairedTitle: 'Por que a alfândega procura a cor laranja na sua mala? (Não é raio-x comum)'
  },
  {
    id: 'variant_c',
    hypothesis: 'QUEBRA_DE_MITO_GARGALO_FISICO',
    filename4k: 'thumb_variant_c_4k.png',
    filename720p: 'thumb_variant_c_1280x720.jpg',
    filenameMobile: 'thumb_variant_c_mobile_320x180.jpg',
    baseImageSrc: 'base_variant_c_blackblock.png',
    headlineLines: ['O ERRO DO', 'ALUMÍNIO.'],
    subheadline: 'A MANCHA PRETA QUE TRAVA A ESTEIRA NA HORA',
    textSide: 'RIGHT',
    pairedTitle: 'O mito de embrulhar em papel alumínio: por que o scanner do aeroporto pega na hora'
  }
];

console.log('══════════════════════════════════════════════════════════════════');
console.log('🚀 RENDERIZANDO NOVO PACOTE OFICIAL DE THUMBNAILS — RAIO-X AEROPORTO');
console.log('══════════════════════════════════════════════════════════════════\n');

for (const v of officialVariants) {
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

  const out4k = path.join(thumbDir, v.filename4k);
  const out720 = path.join(thumbDir, v.filename720p);
  const outMobile = path.join(thumbDir, v.filenameMobile);

  console.log(`\n▶ Processando ${v.id.toUpperCase()} [${v.hypothesis}]...`);

  // 1. Render 4K Master (3840x2160 PNG)
  console.log(`   Renderizando 4K Master -> ${v.filename4k}...`);
  execSync(`npx remotion still remotion/thumbnailEntry.ts HslThumbnail "${out4k}" --public-dir="public/episodes/raio-x-aeroporto/thumbnails" --props="${propsJson}" --image-format=png`, { stdio: 'inherit' });

  // 2. Render 720p HD Preview (1280x720 JPG)
  console.log(`   Renderizando 720p Preview -> ${v.filename720p}...`);
  execSync(`npx remotion still remotion/thumbnailEntry.ts HslThumbnail "${out720}" --public-dir="public/episodes/raio-x-aeroporto/thumbnails" --props="${propsJson}" --scale=0.33333333 --image-format=jpeg --jpeg-quality=92`, { stdio: 'inherit' });

  // 3. Render Mobile Audit (320x180 JPG)
  console.log(`   Renderizando Mobile 320x180 -> ${v.filenameMobile}...`);
  execSync(`npx remotion still remotion/thumbnailEntry.ts HslThumbnail "${outMobile}" --public-dir="public/episodes/raio-x-aeroporto/thumbnails" --props="${propsJson}" --scale=0.08333333 --image-format=jpeg --jpeg-quality=85`, { stdio: 'inherit' });

  // Copia para artifacts directory
  fs.copyFileSync(out4k, path.join(brainDir, v.filename4k));
  fs.copyFileSync(out720, path.join(brainDir, v.filename720p));
  fs.copyFileSync(outMobile, path.join(brainDir, v.filenameMobile));

  console.log(`   ✓ ${v.id} concluído com sucesso em todas as resoluções!`);
}

// 4. Gera Contact Sheet Mobile (960x180) para comparação imediata dos 3 ângulos
console.log('\n▶ Gerando Contact Sheet Mobile (960x180)...');
const contactSheetMobile = path.join(thumbDir, 'thumbnail_contact_sheet_mobile_960x180.jpg');
const mobA = path.join(thumbDir, officialVariants[0].filenameMobile);
const mobB = path.join(thumbDir, officialVariants[1].filenameMobile);
const mobC = path.join(thumbDir, officialVariants[2].filenameMobile);

execSync(`ffmpeg -y -hide_banner -loglevel error -i "${mobA}" -i "${mobB}" -i "${mobC}" -filter_complex hstack=inputs=3 "${contactSheetMobile}"`, { stdio: 'inherit' });
fs.copyFileSync(contactSheetMobile, path.join(brainDir, 'thumbnail_contact_sheet_mobile_960x180.jpg'));
console.log('   ✓ Contact Sheet Mobile gerado!');

// 5. Gera Contact Sheet 720p (3840x720) para comparação em alta resolução
console.log('\n▶ Gerando Contact Sheet HD (3840x720)...');
const contactSheetHD = path.join(thumbDir, 'thumbnail_contact_sheet_720p.jpg');
const hdA = path.join(thumbDir, officialVariants[0].filename720p);
const hdB = path.join(thumbDir, officialVariants[1].filename720p);
const hdC = path.join(thumbDir, officialVariants[2].filename720p);

execSync(`ffmpeg -y -hide_banner -loglevel error -i "${hdA}" -i "${hdB}" -i "${hdC}" -filter_complex hstack=inputs=3 "${contactSheetHD}"`, { stdio: 'inherit' });
fs.copyFileSync(contactSheetHD, path.join(brainDir, 'thumbnail_contact_sheet_720p.jpg'));
console.log('   ✓ Contact Sheet HD gerado!');

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('🎉 TODAS AS THUMBNAILS 4K, 720P E MOBILE FORAM RENDERIZADAS COM SUCESSO!');
console.log('══════════════════════════════════════════════════════════════════');
