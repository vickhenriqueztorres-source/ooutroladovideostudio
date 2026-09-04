import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import {FireflyAdapter} from '../adapters/fireflyAdapter';

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

export async function dispatchFireflyGuide(): Promise<void> {
  const guideArg = argValue('guide');
  if (!guideArg) throw new Error('FIREFLY_GUIDE_REQUIRED: use --guide=<path>');
  const guidePath = path.resolve(guideArg);
  if (!fs.existsSync(guidePath)) throw new Error(`FIREFLY_GUIDE_NOT_FOUND:${guidePath}`);

  if (process.argv.includes('--resume')) process.env.FIREFLY_RESUME_EXISTING_BATCH = 'true';
  const productionId = argValue('runId') || path.basename(path.dirname(guidePath));
  const runtimeRoot = path.join(path.dirname(guidePath), 'runtime');
  const adapter = new FireflyAdapter(undefined, runtimeRoot);
  await adapter.initialize();
  const result = await adapter.feedGuideAndRun(productionId, guidePath);
  process.stdout.write(`${JSON.stringify({productionId, guidePath, ...result}, null, 2)}\n`);
}

if (require.main === module) {
  dispatchFireflyGuide().catch((err) => {
    console.error(`[FIREFLY_DISPATCH_FAILED] ${err.message}`);
    process.exit(1);
  });
}
