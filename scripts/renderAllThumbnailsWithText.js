const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const outDir = path.join(process.cwd(), 'public', 'episodes', 'nota-100-reais', 'thumbnails');
const brainDir = path.join('C:', 'Users', 'brend', '.gemini', 'antigravity', 'brain', '409cadce-edc4-48eb-ad29-edbcc7166ce3');

const variants = [
  {
    id: 'A',
    filename: 'thumb_variant_a_with_text.png',
    baseImageSrc: 'episodes/nota-100-reais/thumbnails/thumb_variant_a.jpg',
    headlineLines: ['NUNCA FOI', 'PAPEL.'],
    subheadline: 'O SEGREDO QUE NENHUMA GRÁFICA REVELA',
    categoryBadge: 'INVESTIGAÇÃO // O OUTRO LADO',
    textSide: 'LEFT',
    accentColor: '#FF5500',
    telemetryColor: '#00F0FF',
    revealPercentage: 88,
    coordinates: '22.9042° S, 43.1729° W'
  },
  {
    id: 'B',
    filename: 'thumb_variant_b_with_text.png',
    baseImageSrc: 'episodes/nota-100-reais/thumbnails/thumb_variant_b.jpg',
    headlineLines: ['1 FALHA:', 'TRITURADA.'],
    subheadline: 'SENSOR DE 850NM // REJEIÇÃO EM 0.1 SEGUNDO',
    categoryBadge: 'VULNERABILIDADE // BANCO CENTRAL',
    textSide: 'LEFT',
    accentColor: '#FF5500',
    telemetryColor: '#00F0FF',
    revealPercentage: 94,
    coordinates: '15.7975° S, 47.8919° W'
  },
  {
    id: 'C',
    filename: 'thumb_variant_c_with_text.png',
    baseImageSrc: 'episodes/nota-100-reais/thumbnails/thumb_variant_c.jpg',
    headlineLines: ['IMPOSSÍVEL', 'DE CLONAR.'],
    subheadline: 'CALCOGRAFIA // 80 TONELADAS DE FORÇA',
    categoryBadge: 'FORJA FORENSE // CASA DA MOEDA',
    textSide: 'LEFT',
    accentColor: '#FF5500',
    telemetryColor: '#00F0FF',
    revealPercentage: 99,
    coordinates: '22.9035° S, 43.1732° W'
  }
];

for (const v of variants) {
  const outPath = path.join(outDir, v.filename);
  const brainPath = path.join(brainDir, v.filename);
  const propsFile = path.join(process.cwd(), 'scratch', `thumb_${v.id}_props.json`);

  const props = {
    baseImageSrc: v.baseImageSrc,
    headlineLines: v.headlineLines,
    subheadline: v.subheadline,
    categoryBadge: v.categoryBadge,
    textSide: v.textSide,
    accentColor: v.accentColor,
    telemetryColor: v.telemetryColor,
    revealPercentage: v.revealPercentage,
    coordinates: v.coordinates
  };

  fs.writeFileSync(propsFile, JSON.stringify(props), 'utf8');

  console.log(`\n🎨 Renderizando Thumbnail ${v.id} (${v.headlineLines.join(' ')})...`);
  const cmd = `npx remotion still remotion/index.ts HslThumbnail "${outPath}" --props="${propsFile}"`;
  execSync(cmd, { stdio: 'inherit' });

  // Copia para o diretório de artifacts do brain
  fs.copyFileSync(outPath, brainPath);

  // Gera versão 1280x720 para YouTube upload rápido e 320x180 para simulação mobile
  const ytPath = path.join(outDir, `thumb_variant_${v.id.toLowerCase()}_1280x720.jpg`);
  const mobilePath = path.join(outDir, `thumb_variant_${v.id.toLowerCase()}_mobile_320x180.jpg`);
  execSync(`ffmpeg -y -i "${outPath}" -vf scale=1280:720 -q:v 2 "${ytPath}"`, { stdio: 'pipe' });
  execSync(`ffmpeg -y -i "${outPath}" -vf scale=320:180 -q:v 2 "${mobilePath}"`, { stdio: 'pipe' });

  console.log(`✅ Thumbnail ${v.id} concluída:`);
  console.log(`   - 4K Master: ${outPath}`);
  console.log(`   - YouTube (1280x720): ${ytPath}`);
  console.log(`   - Mobile (320x180): ${mobilePath}`);
}

console.log('\n🎉 TODAS AS 3 THUMBNAILS COM TEXTOS DE IMPACTO FORAM RENDERIZADAS COM SUCESSO!');
