import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import {runEpisodeProduction} from '../pipeline/episodeProductionRunner';
import {EpisodeStageSchema, EpisodeStage} from '../contracts/episodeContract';

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function resolveInputPath(explicitPath: string | undefined, episodeId: string, suffix: string): string {
  const candidate = explicitPath
    ? path.resolve(explicitPath)
    : path.join(process.cwd(), 'contracts', 'episodes', `${episodeId}.${suffix}.json`);
  if (!fs.existsSync(candidate)) {
    throw new Error(`EPISODE_INPUT_NOT_FOUND:${candidate}`);
  }
  return candidate;
}

export async function produceEpisodeFromCli(): Promise<void> {
  const episodeId = argValue('episode') || argValue('episodeId');
  if (!episodeId || !/^[a-zA-Z0-9_-]+$/.test(episodeId)) {
    throw new Error('EPISODE_ID_REQUIRED: use --episode=<slug>');
  }
  const contractPath = resolveInputPath(argValue('contract'), episodeId, 'episode');
  const scenesPath = resolveInputPath(argValue('scenes'), episodeId, 'scenes');
  const runId = argValue('runId');
  const dryRun = process.argv.includes('--dry-run');
  const stagesArg = argValue('stages') || argValue('stage');
  const stages: EpisodeStage[] | undefined = stagesArg
    ? stagesArg.split(',').map((stage) => EpisodeStageSchema.parse(stage.trim()))
    : undefined;
  const visualsScopeArg = argValue('visuals-scope');
  const visualsScope = visualsScopeArg === 'firefly-videos' ? 'firefly-videos' : 'all';

  const result = await runEpisodeProduction({contractPath, scenesPath, runId, dryRun, stages, visualsScope});
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  produceEpisodeFromCli().catch((err) => {
    console.error(`[EPISODE_PRODUCTION_FAILED] ${err.message}`);
    process.exit(1);
  });
}
