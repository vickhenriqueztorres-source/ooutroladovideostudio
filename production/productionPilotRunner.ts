import fs from 'fs';
import path from 'path';
import {FIREFLY_GENERATION_PROFILE as profile} from '../config/fireflyGenerationConfig';
import { spawnSync } from 'child_process';
import Database from 'better-sqlite3';
import { ProductionSafetyGuard } from '../config/productionSafetyGuard';
import { validateVideoWithFfprobe } from '../media/mediaValidator';
import {resolveFireflyRoot} from '../config/fireflySessionLive';

export interface PilotTakeResult {
  take_name: string;
  job_id: number;
  status: 'done';
  sha256: string;
  file_path: string;
  width: number;
  height: number;
  duration_seconds: number;
  codec: string;
}

export interface PilotProductionResult {
  production_id: string;
  takes_count: number;
  takes: PilotTakeResult[];
  status: 'COMPLETED';
}

type FireflyJobRow = {
  id: number;
  name: string;
  status: string;
  output_path: string | null;
};

const FIREFLY_ROOT = resolveFireflyRoot();
const DEFAULT_PROMPT = 'Industrial documentary reconstruction of aviation fuel moving through refinery tanks, pipelines, airport storage and hydrant infrastructure, precise system geometry, no presenter, no readable text, no logos, no fabricated evidence';

export class ProductionPilotRunner {
  public static async runProductionPilot(): Promise<{ success: boolean; productions: PilotProductionResult[] }> {
    ProductionSafetyGuard.assertSafeForProduction();

    const runDir = path.resolve(process.cwd(), 'runs', 'HSL-PILOT');
    const imagesDir = path.join(runDir, 'imagens');
    const videosDir = path.join(runDir, 'videos');
    fs.rmSync(runDir, { recursive: true, force: true });
    fs.mkdirSync(imagesDir, { recursive: true });
    fs.mkdirSync(videosDir, { recursive: true });

    const sourceImage = process.env.HSL_PILOT_SOURCE_IMAGE;
    const prompt = process.env.HSL_PILOT_PROMPT || DEFAULT_PROMPT;
    if (!sourceImage || !fs.existsSync(sourceImage)) {
      throw new Error('HSL_PILOT_SOURCE_IMAGE_REQUIRED: provide a physical 16:9 start frame');
    }

    const items: Array<{ image: string; prompt: string; name: string; use_first_frame: true }> = [];
    for (let production = 1; production <= 5; production++) {
      for (let take = 1; take <= 4; take++) {
        const name = `HSL_PILOT_P${String(production).padStart(2, '0')}_TAKE_${String(take).padStart(2, '0')}`;
        const image = `${name}.png`;
        fs.copyFileSync(sourceImage, path.join(imagesDir, image));
        items.push({ image, prompt, name, use_first_frame: true });
      }
    }

    const guidePath = path.join(runDir, 'firefly_guide.json');
    fs.writeFileSync(
      guidePath,
      JSON.stringify(
        {
          model: profile.model,
          resolution: profile.resolution,
          aspect_ratio: profile.aspect_ratio,
          fps: profile.fps,
          duration_seconds: profile.duration_seconds,
          use_first_frame: profile.requires_first_frame,
          items
        },
        null,
        2
      ),
      'utf8'
    );

    const runtimeRoot = path.join(runDir, 'firefly-runtime');
    fs.mkdirSync(runtimeRoot, {recursive: true});
    this.runFirefly(['-m', 'firefly_bot.main', '--root', runtimeRoot, '--feed-guide', guidePath], path.join(runDir, 'feed_output.txt'));
    this.runFirefly(['-m', 'firefly_bot.main', '--root', runtimeRoot, '--run'], path.join(runDir, 'worker_output.txt'));

    const rows = this.readPilotRows(items.map((item) => item.name), runtimeRoot);
    const productions: PilotProductionResult[] = [];
    const ffprobeResults: unknown[] = [];

    for (let production = 1; production <= 5; production++) {
      const productionId = `HSL-PILOT-P${String(production).padStart(2, '0')}`;
      const takes: PilotTakeResult[] = [];
      for (let take = 1; take <= 4; take++) {
        const takeName = `HSL_PILOT_P${String(production).padStart(2, '0')}_TAKE_${String(take).padStart(2, '0')}`;
        const row = rows.find((candidate) => candidate.name === takeName);
        if (!row || row.status !== 'done' || !row.output_path) {
          throw new Error(`HSL pilot job did not finish as real done media: ${takeName}`);
        }

        const validation = validateVideoWithFfprobe(row.output_path);
        ffprobeResults.push({ takeName, ...validation });
        if (!validation.valid || validation.ffprobe_exit_code !== 0) {
          throw new Error(`FAILED_MEDIA_VALIDATION: ${takeName}`);
        }

        const copiedVideo = path.join(videosDir, `${takeName}.mp4`);
        fs.copyFileSync(validation.absolute_path, copiedVideo);
        takes.push({
          take_name: takeName,
          job_id: row.id,
          status: 'done',
          sha256: validation.sha256,
          file_path: copiedVideo,
          width: validation.width,
          height: validation.height,
          duration_seconds: validation.duration_seconds,
          codec: validation.codec
        });
      }

      const productionDir = path.join(runDir, productionId);
      fs.mkdirSync(productionDir, { recursive: true });
      fs.writeFileSync(
        path.join(productionDir, 'hsl_kling_asset_intake.json'),
        JSON.stringify({
          status: 'HSL_KLING_ASSET_INTAKE_READY',
          production_id: productionId,
          takes_processed: takes.length,
          evidence_status: 'illustrative',
          ai_disclosure_required: true,
          on_screen_label: 'AI VISUALIZATION',
          items: takes
        }, null, 2),
        'utf8'
      );
      fs.writeFileSync(
        path.join(productionDir, 'REPORT.md'),
        `# ${productionId}\n\nResult: PASS\n\nTakes processed: ${takes.length}\n`,
        'utf8'
      );
      productions.push({ production_id: productionId, takes_count: takes.length, takes, status: 'COMPLETED' });
    }

    fs.writeFileSync(path.join(runDir, 'ffprobe_results.json'), JSON.stringify(ffprobeResults, null, 2), 'utf8');
    fs.writeFileSync(path.join(runDir, 'pilot_results.json'), JSON.stringify({ success: true, productions }, null, 2), 'utf8');
    fs.writeFileSync(
      path.join(runDir, 'REPORT.md'),
      `# HSL-PILOT\n\nResult: PASS\n\nProductions: 5\nTakes: 20\nAll videos passed ffprobe exit code 0.\n`,
      'utf8'
    );

    return { success: true, productions };
  }

  private static pythonExecutable(): string {
    const venvPython = path.join(FIREFLY_ROOT, '.venv', 'Scripts', 'python.exe');
    return fs.existsSync(venvPython) ? venvPython : 'python';
  }

  private static runFirefly(args: string[], outputPath: string): void {
    const result = spawnSync(this.pythonExecutable(), args, {
      cwd: FIREFLY_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        FIREFLY_CHROME_PROFILE_DIR: path.join(FIREFLY_ROOT, 'data', 'chrome_profile'),
        FIREFLY_ALLOW_CREDIT_SPEND: 'true',
        FIREFLY_ALLOW_TEXT_TO_VIDEO: profile.requires_first_frame ? 'false' : 'true',
        PYTHONUNBUFFERED: '1'
      },
      maxBuffer: 1024 * 1024 * 20
    });
    fs.writeFileSync(outputPath, `${result.stdout || ''}\n${result.stderr || ''}`, 'utf8');
    if (result.status !== 0 && result.status !== 10) {
      throw new Error(`Firefly command failed (${result.status}): ${args.join(' ')}`);
    }
  }

  private static readPilotRows(names: string[], runtimeRoot: string): FireflyJobRow[] {
    const db = new Database(path.join(runtimeRoot, 'data', 'firefly_jobs.db'), { readonly: true });
    try {
      const placeholders = names.map(() => '?').join(', ');
      return db.prepare(`SELECT id, name, status, output_path FROM jobs WHERE name IN (${placeholders}) ORDER BY id`).all(...names) as FireflyJobRow[];
    } finally {
      db.close();
    }
  }
}

if (require.main === module) {
  ProductionPilotRunner.runProductionPilot()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
