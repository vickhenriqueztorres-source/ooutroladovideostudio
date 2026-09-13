import 'dotenv/config';
import path from 'path';
process.env.HSL_CINEMATIC_PIPELINE_V1 = process.env.HSL_CINEMATIC_PIPELINE_V1 || 'true';
import { runEpisodeProduction } from '../pipeline/episodeProductionRunner';

export async function produceLinhaSeguraEpisode(dryRun: boolean = false) {
  return await runEpisodeProduction({
    contractPath: path.join(process.cwd(), 'contracts', 'episodes', 'linha-segura-presidencial.episode.json'),
    scenesPath: path.join(process.cwd(), 'contracts', 'episodes', 'linha-segura-presidencial.scenes.json'),
    dryRun
  });
}

if (require.main === module) {
  const isDryRun = process.argv.some(arg => arg.includes('dry-run')) || process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
  console.log(`[produceLinhaSegura] isDryRun: ${isDryRun} (argv: ${JSON.stringify(process.argv)})`);
  produceLinhaSeguraEpisode(isDryRun).catch((err) => {
    console.error('\n❌ ERRO FATAL NA PRODUÇÃO DO DOCUMENTÁRIO (LINHA SEGURA):', err.message);
    process.exit(1);
  });
}
