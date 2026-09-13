import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FireflyAdapter } from '../adapters/fireflyAdapter';
import { Logger } from '../event-hub/logger';

const EPISODE_ID = 'raio-x-aeroporto';
const projectRoot = process.cwd();
const fireflyRoot = path.join(projectRoot, 'agente firefly');
const fireflyImagesDir = path.join(fireflyRoot, 'imagens');
const fireflyPromptsDir = path.join(fireflyImagesDir, 'prompts');
const fireflyDataImagesDir = path.join(fireflyRoot, 'data', 'imagens');
const publicImagesDir = path.join(projectRoot, 'public', 'episodes', EPISODE_ID, 'images');
const publicTakesDir = path.join(projectRoot, 'public', 'episodes', EPISODE_ID, 'takes');
const runsScenesDir = path.join(projectRoot, 'runs', EPISODE_ID, 'scenes');

fs.mkdirSync(fireflyImagesDir, { recursive: true });
fs.mkdirSync(fireflyPromptsDir, { recursive: true });
fs.mkdirSync(fireflyDataImagesDir, { recursive: true });
fs.mkdirSync(publicTakesDir, { recursive: true });

// As 22 cenas de matéria real que requerem vídeo temporal do Firefly/Kling
const FIREFLY_SCENE_ITEMS: Array<{ sceneId: string; motionPrompt: string }> = [
  { sceneId: 'RX_001', motionPrompt: 'Slow subtle tracking shot of travel suitcase moving on black rubber conveyor belt into lead curtain tunnel, authentic mechanical vibration' },
  { sceneId: 'RX_002', motionPrompt: 'Cinematic macro observation of suitcase zipper and dark fabric, shallow depth of field, subtle rack focus' },
  { sceneId: 'RX_003', motionPrompt: 'Atmospheric camera drift towards heavy lead inspection tunnel entrance with yellow radiation warning sign, subtle ambient dust' },
  { sceneId: 'RX_004', motionPrompt: 'Observational documentary shot of rotating tungsten anode x-ray tube generator, subtle mechanical hum, copper cooling elements' },
  { sceneId: 'RX_006', motionPrompt: 'Static documentary split view, subtle light flicker on medical x-ray viewer and color spectrum display console' },
  { sceneId: 'RX_007', motionPrompt: 'Slow lateral pan across hospital x-ray single-beam tube collimator, clinical ambient light' },
  { sceneId: 'RX_008', motionPrompt: 'Slow push in on dual-energy industrial slit collimator emitting split photons, precision engineering' },
  { sceneId: 'RX_010', motionPrompt: 'Macro drift along circuit board with linear array of scintillation photodiodes, glowing telemetry indicators' },
  { sceneId: 'RX_011', motionPrompt: 'Digital attenuation curve graphic on inspection screen, subtle refresh rate scanlines and pulse' },
  { sceneId: 'RX_012', motionPrompt: 'Close observational shot of airport security console monitor showing multi-colored spectral luggage scan' },
  { sceneId: 'RX_013', motionPrompt: 'Screen highlighting organic materials in glowing sodium amber orange (#FF5500), subtle pan across items' },
  { sceneId: 'RX_014', motionPrompt: 'Layered forensic view of dense stacked textiles and paper currency under X-ray absorption' },
  { sceneId: 'RX_017', motionPrompt: 'Monitor view displaying green shades for glass and aluminum components inside suitcase' },
  { sceneId: 'RX_018', motionPrompt: 'Forensic inspection bench with opened luggage, stainless steel tools, subtle camera drift' },
  { sceneId: 'RX_019', motionPrompt: 'X-ray display showing deep cobalt blue high-density metallic components with sharp edge outlines' },
  { sceneId: 'RX_020', motionPrompt: 'Macro rack focus on steel gun barrel and metal springs under dual-energy absorption' },
  { sceneId: 'RX_021', motionPrompt: 'Black opaque rectangular block absorbing all photons, dense lead shielding demonstration' },
  { sceneId: 'RX_022', motionPrompt: 'Cyan alert warning box flashing on customs console indicating high-density anomaly' },
  { sceneId: 'RX_023', motionPrompt: 'Forensic examination of lead foil wrap and aluminum layers on steel workbench' },
  { sceneId: 'RX_024', motionPrompt: 'Customs forensic inspector in black nitrile gloves examining internal lining of suspect luggage under halogen desk lamp' },
  { sceneId: 'RX_025', motionPrompt: 'Slow monumental tracking shot of circular airport computed tomography gantry rotating around conveyor belt' },
  { sceneId: 'RX_030', motionPrompt: 'Slow atmospheric pull-back shot of traveler silhouette walking across dark airport concourse pulling suitcase towards distant illuminated departure gates' }
];

async function main() {
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('🔥 FIREFLY / KLING 2.5 TURBO VIDEO DISPATCH — RAIO-X DO AEROPORTO');
  console.log('══════════════════════════════════════════════════════════════════\n');

  process.env.FIREFLY_ALLOW_CREDIT_SPEND = 'true';
  process.env.FIREFLY_ALLOW_TEXT_TO_VIDEO = 'true';
  process.env.FIREFLY_RESUME_EXISTING_BATCH = 'true';
  process.env.FIREFLY_CONTINUE_ON_FAILED_INFRA = 'true';
  process.env.FIREFLY_SESSION_ACTIVE = '1';

  const items: Array<{
    name: string;
    image: string;
    prompt: string;
    model: string;
    resolution: string;
    aspect_ratio: string;
    fps: number;
    duration_seconds: number;
    use_first_frame: boolean;
    generate_audio: boolean;
  }> = [];

  for (const scene of FIREFLY_SCENE_ITEMS) {
    const srcImage = path.join(publicImagesDir, `${scene.sceneId}.png`);
    if (!fs.existsSync(srcImage)) {
      console.warn(`⚠️ [SKIP] Start frame não encontrado para ${scene.sceneId}: ${srcImage}`);
      continue;
    }

    const targetImage = `${scene.sceneId}.png`;
    const destImage = path.join(fireflyImagesDir, targetImage);
    const destDataImage = path.join(fireflyDataImagesDir, targetImage);
    const promptFile = path.join(fireflyPromptsDir, `${scene.sceneId}.txt`);

    fs.copyFileSync(srcImage, destImage);
    fs.copyFileSync(srcImage, destDataImage);
    fs.writeFileSync(promptFile, scene.motionPrompt, 'utf8');

    items.push({
      name: scene.sceneId,
      image: targetImage,
      prompt: scene.motionPrompt,
      model: 'Kling 2.5 Turbo',
      resolution: '1080p',
      aspect_ratio: '16:9',
      fps: 24,
      duration_seconds: 5,
      use_first_frame: true,
      generate_audio: false
    });

    console.log(`  📦 [${scene.sceneId}] Start Frame e Motion Prompt preparados.`);
  }

  console.log(`\n📌 Total de cenas preparadas para geração no Firefly: ${items.length}/22`);

  // Salva o guia_producao.json na raiz do agente firefly
  const guidePath = path.join(fireflyRoot, 'guia_producao.json');
  const guide = {
    batch_name: `producao_${EPISODE_ID}`,
    model: 'Kling 2.5 Turbo',
    resolution: '1080p',
    aspect_ratio: '16:9',
    fps: 24,
    duration_seconds: 5,
    use_first_frame: true,
    generate_audio: false,
    items
  };

  fs.writeFileSync(guidePath, JSON.stringify(guide, null, 2), 'utf8');
  console.log(`  📄 Guia de produção gravada em: ${guidePath}`);

  // Disparo com FireflyAdapter
  console.log('\n🚀 Inicializando FireflyAdapter e despachando fila para o Kling 2.5 Turbo...');
  const adapter = new FireflyAdapter(fireflyRoot);
  await adapter.initialize();

  const result = await adapter.feedGuideAndRunReal(EPISODE_ID, guidePath);
  console.log(`\n🎉 Execução do Firefly concluída com status: ${result.success ? 'SUCESSO' : 'PENDENTE'}`);
  console.log(`  Takes concluídos: ${result.completedJobs.length}/${items.length}`);

  // Atualiza availableMedia.json
  const availableMediaPath = path.join(projectRoot, 'remotion', 'availableMedia.json');
  let availableMedia: any = {};
  if (fs.existsSync(availableMediaPath)) {
    try { availableMedia = JSON.parse(fs.readFileSync(availableMediaPath, 'utf8')); } catch {}
  }

  for (const job of result.completedJobs) {
    const sceneId = job.name;
    const destTakePublic = path.join(publicTakesDir, `${sceneId}.mp4`);
    const destTakeRun = path.join(runsScenesDir, sceneId, 'firefly_take.mp4');

    fs.mkdirSync(path.dirname(destTakeRun), { recursive: true });
    fs.copyFileSync(job.output_path, destTakePublic);
    fs.copyFileSync(job.output_path, destTakeRun);
    console.log(`  🎥 [${sceneId}] Take copiado para: ${destTakePublic}`);

    if (!availableMedia[sceneId]) {
      availableMedia[sceneId] = { hasVideo: true, hasImage: true, isDossier: false };
    } else {
      availableMedia[sceneId].hasVideo = true;
    }
  }

  fs.writeFileSync(availableMediaPath, JSON.stringify(availableMedia, null, 2), 'utf8');
  console.log('✅ availableMedia.json atualizado com os takes gerados!');
}

main().catch((err) => {
  console.error('❌ Erro no despacho do Firefly:', err);
  process.exit(1);
});
