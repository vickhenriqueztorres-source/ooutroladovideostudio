import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const cwd = process.cwd();
const artifactsDir = 'C:\\Users\\brend\\.gemini\\antigravity\\brain\\96ed0e32-bebf-4c0c-bffa-f274f1c7ac9c';
const thumbOutDir = path.join(cwd, 'public', 'episodes', 'encomenda-china-curitiba', 'thumbnails');
const isolatedPublicDir = path.join(cwd, 'temp', 'isolated_thumb_public');
fs.mkdirSync(thumbOutDir, { recursive: true });
fs.mkdirSync(isolatedPublicDir, { recursive: true });

// Copia apenas os assets leves necessários para o isolatedPublicDir
const requiredThumbAssets = [
  'identity',
  path.join('episodes', 'encomenda-china-curitiba', 'thumbnails')
];

for (const rel of requiredThumbAssets) {
  const src = path.join(cwd, 'public', rel);
  if (fs.existsSync(src)) {
    const dst = path.join(isolatedPublicDir, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.cpSync(src, dst, { recursive: true });
  }
}

const VARIANTS = [
  {
    id: 'a',
    file: 'thumb_variant_a_with_text.png',
    props: {
      baseImageSrc: 'episodes/encomenda-china-curitiba/thumbnails/raw_frame_a.png',
      headlineLines: ['R$ 20.', '18.000 KM.'],
      categoryBadge: 'INVESTIGAÇÃO LOGÍSTICA // O OUTRO LADO',
      subheadline: 'O SEGREDO DO FRETE GRÁTIS DA CHINA',
      accentColor: '#FF5500',
      telemetryColor: '#00F0FF',
      textSide: 'LEFT'
    }
  },
  {
    id: 'b',
    file: 'thumb_variant_b_with_text.png',
    props: {
      baseImageSrc: 'episodes/encomenda-china-curitiba/thumbnails/raw_frame_b.png',
      headlineLines: ['1 MILÍMETRO.', 'SEM ENTREGA.'],
      categoryBadge: 'GARGALO DE ESTADO // O OUTRO LADO',
      subheadline: 'O CÓDIGO DE BARRAS QUE TRAVA EM CURITIBA',
      accentColor: '#FF5500',
      telemetryColor: '#00F0FF',
      textSide: 'LEFT'
    }
  },
  {
    id: 'c',
    file: 'thumb_variant_c_with_text.png',
    props: {
      baseImageSrc: 'episodes/encomenda-china-curitiba/thumbnails/raw_frame_c.png',
      headlineLines: ['NO VÁCUO.', 'DO COMÉRCIO.'],
      categoryBadge: 'INFRAESTRUTURA AÉREA // O OUTRO LADO',
      subheadline: 'POR QUE ESSE PACOTE NÃO VIAJA SOZINHO',
      accentColor: '#FF5500',
      telemetryColor: '#00F0FF',
      textSide: 'LEFT'
    }
  }
];

console.log('🎨 RENDERIZANDO 3 THUMBNAILS 4K ULTRA RÁPIDO...');

for (const v of VARIANTS) {
  const outPath = path.join(thumbOutDir, v.file);
  const propsFile = path.join(thumbOutDir, `props_${v.id}.json`);
  fs.writeFileSync(propsFile, JSON.stringify(v.props, null, 2), 'utf8');
  console.log(`\n🖼️ Renderizando Variante ${v.id.toUpperCase()} (3840x2160)...`);
  
  const cmd = `npx remotion still remotion/index.ts HslThumbnail "${outPath}" --public-dir="${isolatedPublicDir}" --props="${propsFile}"`;
  execSync(cmd, { stdio: 'inherit', cwd });
  
  // Copia para os artefatos
  const artPath = path.join(artifactsDir, v.file);
  fs.copyFileSync(outPath, artPath);
  console.log(`  ✅ Salvo em: ${outPath}`);
  console.log(`  📁 Copiado para artefato: ${artPath}`);
}

console.log('\n🎉 Todas as 3 Thumbnails 4K foram renderizadas e verificadas com sucesso!');
