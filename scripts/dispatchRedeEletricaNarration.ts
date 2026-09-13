import 'dotenv/config';
import path from 'path';
import { runNarrationDispatch } from './dispatchNarrationBatch';

async function main() {
  const contractPath = path.join(process.cwd(), 'contracts', 'episodes', 'rede-eletrica-60hz.episode.json');
  const scenesPath = path.join(process.cwd(), 'contracts', 'episodes', 'rede-eletrica-60hz.scenes.json');

  console.log('🎙️ INICIANDO SÍNTESE OFICIAL ELEVENLABS CHRIS PARA REDE ELÉTRICA 60 HZ...');
  const result = await runNarrationDispatch({
    forceDispatch: true,
    contractPath,
    scenesPath
  });

  console.log('✅ SÍNTESE CONCLUÍDA:', result.wordStatus);
}

main().catch((err) => {
  console.error('❌ ERRO NA SÍNTESE:', err);
  process.exit(1);
});
