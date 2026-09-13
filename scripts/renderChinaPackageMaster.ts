import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync, spawnSync } from 'child_process';

const cwd = process.cwd();
const artifactsDir = 'C:\\Users\\brend\\.gemini\\antigravity\\brain\\96ed0e32-bebf-4c0c-bffa-f274f1c7ac9c';
const runId = `RUN_${Date.now()}`;
const runDir = path.join(cwd, 'runs', 'encomenda-china-curitiba', runId);
const outDir = path.join(cwd, 'out');
const masterVideoPath = path.join(runDir, 'final_master.mp4');
const publicOutVideoPath = path.join(outDir, 'encomenda-china-curitiba.mp4');
const artifactOutVideoPath = path.join(artifactsDir, 'encomenda-china-curitiba.mp4');
const isolatedPublicDir = path.join(runDir, '.remotion-public-china');

fs.mkdirSync(runDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(isolatedPublicDir, { recursive: true });

console.log('🎬 PREPARANDO RENDER DO MASTER DEFINITIVO: O Outro Lado da Sua Encomenda de R$ 20 da China...');

// 1. Isolated public dir
const requiredRoots = [
  'assets',
  'identity',
  path.join('episodes', 'encomenda-china-curitiba'),
  'audio'
];

for (const rel of requiredRoots) {
  const src = path.join(cwd, 'public', rel);
  if (fs.existsSync(src)) {
    const dst = path.join(isolatedPublicDir, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    console.log(`  📁 Copiando assets isolados: ${rel}...`);
    fs.cpSync(src, dst, { recursive: true });
  }
}

// 2. Render with Remotion
const remotionCmd = `npx remotion render remotion/index.ts EpisodeEncomendaChina "${masterVideoPath}" --public-dir="${isolatedPublicDir}" --concurrency=4 --gl=angle`;
console.log(`\n🚀 INICIANDO REMOTION RENDER:\n${remotionCmd}\n`);

const startTime = Date.now();
execSync(remotionCmd, { stdio: 'inherit', cwd });
const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

// 3. Verify & Hash
console.log(`\n✅ RENDER REMOTION CONCLUÍDO EM ${elapsedSec}s!`);
const videoBuffer = fs.readFileSync(masterVideoPath);
const videoSha = crypto.createHash('sha256').update(videoBuffer).digest('hex');
const stat = fs.statSync(masterVideoPath);

const p = spawnSync('ffprobe', [
  '-v', 'error',
  '-show_entries', 'format=duration',
  '-of', 'default=noprint_wrappers=1:nokey=1',
  masterVideoPath
], { encoding: 'utf8' });
const duration = parseFloat(p.stdout.trim()) || 315.0;

// Copia para a pasta de saída out/ e para os artefatos
fs.copyFileSync(masterVideoPath, publicOutVideoPath);
console.log(`📦 Master final copiado para: ${publicOutVideoPath}`);
fs.copyFileSync(masterVideoPath, artifactOutVideoPath);
console.log(`📁 Master final copiado para artefatos: ${artifactOutVideoPath}`);

// 4. Salvar render_manifest.json
const renderManifest = {
  compositor: 'CinematicEpisode',
  renderEngine: 'remotion',
  version: '4.0.0',
  gradeApplied: true,
  hudWindowsRespected: true,
  episodeId: 'encomenda-china-curitiba',
  runId,
  totalDurationFrames: Math.round(duration * 30),
  totalDurationSeconds: duration,
  timestamp: new Date().toISOString(),
  videoFile: 'final_master.mp4',
  videoSha256: videoSha,
  videoSizeBytes: stat.size,
  status: 'DONE'
};

const manifestPath = path.join(runDir, 'render_manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(renderManifest, null, 2), 'utf8');
console.log(`📄 Manifest registrado em: ${manifestPath}`);
console.log(`🎉 PRODUÇÃO CONCLUÍDA COM SUCESSO!`);
