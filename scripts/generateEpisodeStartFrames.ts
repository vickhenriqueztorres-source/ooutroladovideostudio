import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { StartFrameGenerator, StartFrameGenerationItem } from '../hsl/startframe/startFrameGenerator';
import { ImageGenerationConfig } from '../config/imageGenerationConfig';
import { buildFireflyPrompt } from '../contracts/buildFireflyPrompt';
import { Logger } from '../event-hub/logger';

async function main() {
  const episodeId = process.argv.find((a) => a.startsWith('--episode='))?.split('=')[1] || 'nota-100-reais';
  const scenesFile = path.join(process.cwd(), 'contracts', 'episodes', `${episodeId}.scenes.json`);

  if (!fs.existsSync(scenesFile)) {
    throw new Error(`Arquivo de cenas não encontrado: ${scenesFile}`);
  }

  const rawScenes: any[] = JSON.parse(fs.readFileSync(scenesFile, 'utf8'));
  const sceneFilter = process.argv.find((a) => a.startsWith('--scene='))?.split('=')[1];
  const limitArg = process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1];
  let scenesToProcess = rawScenes;
  if (sceneFilter) {
    scenesToProcess = scenesToProcess.filter((s) => s.sceneId === sceneFilter);
  }
  if (limitArg) {
    scenesToProcess = scenesToProcess.slice(0, parseInt(limitArg, 10));
  }

  Logger.info('StartFrameRunner', `Carregadas ${scenesToProcess.length} cenas para processamento do episódio ${episodeId}.`);

  const outputBaseDir = path.join(process.cwd(), 'runs', episodeId);
  fs.mkdirSync(outputBaseDir, { recursive: true });

  const items: StartFrameGenerationItem[] = scenesToProcess.map((scene) => {
    const fireflyPrompt = buildFireflyPrompt(scene);
    return {
      sceneId: scene.sceneId,
      prompt: fireflyPrompt.prompt,
      subject: scene.visualSubject || fireflyPrompt.prompt.slice(0, 50),
      forbidPeople: true
    };
  });

  const generator = new StartFrameGenerator();
  Logger.info('StartFrameRunner', `Disparando geração para ${items.length} quadros via ${ImageGenerationConfig.getActiveProvider()}...`);

  const results = await generator.generateAll(episodeId, outputBaseDir, items);
  Logger.info('StartFrameRunner', `🎉 Geração concluída! ${results.length} frames gerados com sucesso.`);

  // Sumário de Auditoria
  console.log('\n📊 RESUMO DE QUALIDADE E PROVENIÊNCIA:');
  for (const r of results) {
    const receiptPath = path.join(outputBaseDir, 'scenes', r.sceneId, 'start_frame_receipt.json');
    let receipt: any = {};
    if (fs.existsSync(receiptPath)) {
      receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
    }
    console.log(
      `- [${r.sceneId}] Provedor: ${receipt.provider} | Qualidade: ${receipt.qualityScore}/100 | SHA256: ${r.sha256.slice(0, 12)}...`
    );
  }
}

main().catch((err) => {
  Logger.error('StartFrameRunner', `Falha na geração dos frames: ${err.message}`);
  process.exit(1);
});
