import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const runId = 'RUN_1789084210319';
const episodeId = 'linha-segura-presidencial';
const runDir = path.join(process.cwd(), 'runs', episodeId, runId);
const thumbDir = path.join(runDir, 'postproduction', 'thumbnails');
const artifactDir = 'C:/Users/brend/.gemini/antigravity/brain/b3fde7c6-6478-4bf5-a77d-53b0e1b20807';

fs.mkdirSync(thumbDir, { recursive: true });
fs.mkdirSync(artifactDir, { recursive: true });

const thumbnailsToRender = [
  {
    filename: 'thumb_viral_1_nao_e_celular.png',
    baseImageSrc: `editorial/execution/${runId}/scenes/SC_001/firefly_start_frame.png`,
    headlineLines: ['NÃO É', 'CELULAR.'],
    subheadline: 'O TERMINAL MILITAR QUE NENHUMA OPERADORA CONTROLA.',
    categoryBadge: 'SISTEMA DE DEFESA // O OUTRO LADO',
    coordinates: '-15.7997° S, -47.8645° W // GSI-DF',
    revealPercentage: 92,
    textSide: 'LEFT' as const,
  },
  {
    filename: 'thumb_viral_2_ouvem_tudo.png',
    baseImageSrc: `editorial/execution/${runId}/scenes/SC_004/firefly_start_frame.png`,
    headlineLines: ['SEM ISSO,', 'OUVEM TUDO.'],
    subheadline: 'O CHIP CRIPTOGRÁFICO QUE IMPEDE A ESPIONAGEM.',
    categoryBadge: 'CONTRA-ESPIONAGEM // O OUTRO LADO',
    coordinates: 'DCT-EB // CHAVE DE CIFRA QKD',
    revealPercentage: 85,
    textSide: 'LEFT' as const,
  },
  {
    filename: 'thumb_viral_3_aqui_nao_entra.png',
    baseImageSrc: `editorial/execution/${runId}/scenes/SC_007/firefly_start_frame.png`,
    headlineLines: ['AQUI', 'NÃO ENTRA.'],
    subheadline: 'O BUNKER SUBTERRÂNEO COM BLINDAGEM FARADAY.',
    categoryBadge: 'ÁREA RESTRITA // O OUTRO LADO',
    coordinates: 'PLANALTO SUBSOLO -3 // RF SHIELD',
    revealPercentage: 96,
    textSide: 'LEFT' as const,
  },
  {
    filename: 'thumb_viral_4_nao_passa_pela_rede.png',
    baseImageSrc: `editorial/execution/${runId}/scenes/SC_014/firefly_start_frame.png`,
    headlineLines: ['NÃO PASSA', 'PELA REDE.'],
    subheadline: 'A LINHA SUBTERRÂNEA DESCONECTADA DA INTERNET.',
    categoryBadge: 'ENGENHARIA INVISÍVEL // O OUTRO LADO',
    coordinates: 'FIBRA MILITAR PRIVADA // TELEBRAS',
    revealPercentage: 78,
    textSide: 'LEFT' as const,
  }
];

console.log('══════════════════════════════════════════════════════════════════');
console.log('🎨 RENDERIZANDO 4 THUMBNAILS VIRAIS 4K NO REMOTION');
console.log(`Episódio: ${episodeId} | Run: ${runId}`);
console.log('══════════════════════════════════════════════════════════════════\n');

for (const t of thumbnailsToRender) {
  const outPath = path.join(thumbDir, t.filename);
  const tempPropsPath = path.join(runDir, `props_${t.filename}.json`);

  const props = {
    baseImageSrc: t.baseImageSrc,
    headlineLines: t.headlineLines,
    subheadline: t.subheadline,
    categoryBadge: t.categoryBadge,
    coordinates: t.coordinates,
    revealPercentage: t.revealPercentage,
    textSide: t.textSide,
    accentColor: '#FF5500',
    telemetryColor: '#00F0FF',
    mode: 'thumbnail',
    brandMark: 'minimal'
  };

  fs.writeFileSync(tempPropsPath, JSON.stringify(props, null, 2), 'utf8');

  console.log(`🎬 Renderizando [${t.filename}]...`);
  console.log(`   Headline: "${t.headlineLines.join(' ')}"`);
  console.log(`   Imagem Base: ${t.baseImageSrc}`);

  const cmd = `npx remotion still remotion/index.ts HslThumbnail "${outPath}" --props="${tempPropsPath}" --image-format=png --gl=angle`;
  execSync(cmd, { stdio: 'inherit' });

  // Limpa props temporário
  if (fs.existsSync(tempPropsPath)) fs.unlinkSync(tempPropsPath);

  // Copia para a pasta de artefatos para visualização
  const artifactTarget = path.join(artifactDir, t.filename);
  fs.copyFileSync(outPath, artifactTarget);

  const sizeMb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
  console.log(`✅ [${t.filename}] gerada com sucesso! (${sizeMb} MB)\n`);
}

console.log('══════════════════════════════════════════════════════════════════');
console.log('🎉 TODAS AS 4 THUMBNAILS VIRAIS 4K FORAM RENDERIZADAS COM SUCESSO!');
console.log('══════════════════════════════════════════════════════════════════');
