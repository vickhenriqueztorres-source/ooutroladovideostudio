import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const thumbDir = path.join(process.cwd(), 'public', 'episodes', 'nota-100-reais', 'thumbnails');
const brainDir = 'C:/Users/brend/.gemini/antigravity/brain/409cadce-edc4-48eb-ad29-edbcc7166ce3';

fs.mkdirSync(thumbDir, { recursive: true });

const thumbnailsToRender = [
  {
    filename: 'thumb_variant_a_final.jpg',
    baseImageSrc: 'episodes/nota-100-reais/thumbnails/thumb_variant_a.jpg',
    headlineLines: ['NÃO É', 'PAPEL.'],
    subheadline: 'A FÍSICA DA NOTA DE 100 REAIS.',
    textSide: 'LEFT' as const,
    revealPercentage: 88,
    coordinates: '22.9042° S, 43.1729° W'
  },
  {
    filename: 'thumb_variant_b_final.jpg',
    baseImageSrc: 'episodes/nota-100-reais/thumbnails/thumb_variant_b.jpg',
    headlineLines: ['1 FALHA:', 'TRITURADA.'],
    subheadline: 'O TESTE DOS 850 NANÔMETROS.',
    textSide: 'LEFT' as const,
    revealPercentage: 94,
    coordinates: '22.9068° S, 43.1729° W'
  },
  {
    filename: 'thumb_variant_c_final.jpg',
    baseImageSrc: 'episodes/nota-100-reais/thumbnails/thumb_variant_c.jpg',
    headlineLines: ['80', 'TONELADAS.'],
    subheadline: 'A FORÇA DA CALCOGRAFIA.',
    textSide: 'LEFT' as const,
    revealPercentage: 73,
    coordinates: '22.9035° S, 43.1731° W'
  }
];

console.log('══════════════════════════════════════════════════════════════════');
console.log('🎨 RENDERIZANDO THUMBNAILS 4K COM TIPOGRAFIA OFICIAL — O OUTRO LADO');
console.log('══════════════════════════════════════════════════════════════════\n');

for (const t of thumbnailsToRender) {
  const outPath = path.join(thumbDir, t.filename);
  const props = {
    baseImageSrc: t.baseImageSrc,
    headlineLines: t.headlineLines,
    subheadline: t.subheadline,
    textSide: t.textSide,
    revealPercentage: t.revealPercentage,
    coordinates: t.coordinates,
    accentColor: '#FF5500',
    telemetryColor: '#00F0FF'
  };

  const propsJson = JSON.stringify(props).replace(/"/g, '\\"');
  const cmd = `npx remotion still remotion/index.ts HslThumbnail "${outPath}" --props="${propsJson}" --image-format=jpeg --jpeg-quality=95`;

  console.log(`Renderizando ${t.filename} (4K 3840x2160)...`);
  execSync(cmd, { stdio: 'inherit' });

  // Copia para a pasta de artefatos da conversa
  const brainTarget = path.join(brainDir, t.filename);
  fs.copyFileSync(outPath, brainTarget);
  console.log(`✅ ${t.filename} gerada com sucesso! (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB)\n`);
}

console.log('🎉 Todas as 3 thumbnails 4K com texto foram renderizadas com sucesso!');
