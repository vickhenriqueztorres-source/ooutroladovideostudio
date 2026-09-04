import {spawnSync} from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  EPISODE_MILK_CALCULATED_TIMELINE,
  MILK_EPISODE_ID,
  MILK_RUN_ID,
} from '../remotion/episodeMilkTimelineData';
import {PipelineContractGate} from '../pipeline/pipelineContractGate';

interface BankSource {
  sceneId: string;
  pexelsId: number;
  title: string;
  author: string;
  pageUrl: string;
  downloadUrl: string;
}

const sources: BankSource[] = [
  {sceneId: 'LEITE_001', pexelsId: 3530244, title: 'Milking a Cow', author: 'Rathaphon Nanthapreecha', pageUrl: 'https://www.pexels.com/video/milking-a-cow-3530244/', downloadUrl: 'https://videos.pexels.com/video-files/3530244/3530244-hd_1920_1080_25fps.mp4'},
  {sceneId: 'LEITE_005', pexelsId: 12866315, title: 'Cows Being Milked at a Dairy Farm', author: 'Roberto Zepeda', pageUrl: 'https://www.pexels.com/video/cows-being-milked-at-a-dairy-farm-12866315/', downloadUrl: 'https://videos.pexels.com/video-files/12866315/12866315-hd_1920_1080_60fps.mp4'},
  {sceneId: 'LEITE_010', pexelsId: 13220980, title: 'Cows in Barn', author: 'Martyn Day', pageUrl: 'https://www.pexels.com/video/cows-in-barn-13220980/', downloadUrl: 'https://videos.pexels.com/video-files/13220980/13220980-hd_1920_1080_25fps.mp4'},
  {sceneId: 'LEITE_013', pexelsId: 32062726, title: 'Automated Packaging Machine in Industrial Setting', author: 'TimePRO TV', pageUrl: 'https://www.pexels.com/video/automated-packaging-machine-in-industrial-setting-32062726/', downloadUrl: 'https://videos.pexels.com/video-files/32062726/13666483_1920_1080_25fps.mp4'},
  {sceneId: 'LEITE_017', pexelsId: 4473271, title: 'Packages on the Conveyor Going Inside the Truck', author: 'Erkan Avanoğlu', pageUrl: 'https://www.pexels.com/video/packages-on-the-conveyor-going-inside-the-truck-4473271/', downloadUrl: 'https://videos.pexels.com/video-files/4473271/4473271-hd_1920_1080_30fps.mp4'},
  {sceneId: 'LEITE_020', pexelsId: 8371306, title: 'Fast Moving Cars on a Highway with Milk Truck', author: 'mark bennis', pageUrl: 'https://www.pexels.com/video/fast-moving-cars-on-a-highway-8371306/', downloadUrl: 'https://videos.pexels.com/video-files/8371306/8371306-hd_1920_1080_25fps.mp4'},
  {sceneId: 'LEITE_026', pexelsId: 37533331, title: 'Automated Conveyor with Packaging Process', author: 'Dominiquemel16 Ramos', pageUrl: 'https://www.pexels.com/video/automated-conveyor-with-packaging-process-37533331/', downloadUrl: 'https://videos.pexels.com/video-files/37533331/15902763_1920_1080_24fps.mp4'},
  {sceneId: 'LEITE_029', pexelsId: 4941360, title: 'Pipes of Various Sizes', author: 'Tima Miroshnichenko', pageUrl: 'https://www.pexels.com/video/pipes-of-various-sizes-4941360/', downloadUrl: 'https://videos.pexels.com/video-files/4941360/4941360-hd_1920_1080_25fps.mp4'},
  {sceneId: 'LEITE_032', pexelsId: 30183210, title: 'Industrial Process of Stainless Steel Tanks', author: 'Pexels contributor', pageUrl: 'https://www.pexels.com/video/industrial-process-of-stainless-steel-tanks-30183210/', downloadUrl: 'https://videos.pexels.com/video-files/30183210/12942823_1920_1080_30fps.mp4'},
  {sceneId: 'LEITE_035', pexelsId: 33632083, title: 'Cardboard Manufacturing Process in Action', author: 'Roda Films', pageUrl: 'https://www.pexels.com/video/cardboard-manufacturing-process-in-action-33632083/', downloadUrl: 'https://videos.pexels.com/video-files/33632083/14292852_1920_1080_24fps.mp4'},
  {sceneId: 'LEITE_038', pexelsId: 8720278, title: 'Empty Bottles in a Filling Machine', author: 'Prakash Chavda', pageUrl: 'https://www.pexels.com/video/empty-bottles-in-a-filling-machine-8720278/', downloadUrl: 'https://videos.pexels.com/video-files/8720278/8720278-hd_1920_1080_25fps.mp4'},
  {sceneId: 'LEITE_041', pexelsId: 3929080, title: 'Supermarket Empty Shelves', author: 'CityXcape', pageUrl: 'https://www.pexels.com/video/supermarket-empty-shelves-3929080/', downloadUrl: 'https://videos.pexels.com/video-files/3929080/3929080-hd_1920_1080_30fps.mp4'},
  {sceneId: 'LEITE_044', pexelsId: 3735225, title: 'Man Getting Food in the Freezer of a Grocery', author: 'Polina Tankilevitch', pageUrl: 'https://www.pexels.com/video/man-getting-food-in-the-freezer-of-a-grocery-3735225/', downloadUrl: 'https://videos.pexels.com/video-files/3735225/3735225-hd_1920_1080_25fps.mp4'},
  {sceneId: 'LEITE_047', pexelsId: 4121725, title: 'Samples Dropped on a Petri Dish', author: 'Edward Jenner', pageUrl: 'https://www.pexels.com/video/a-woman-dropping-samples-on-the-petri-dish-4121725/', downloadUrl: 'https://videos.pexels.com/video-files/4121725/4121725-hd_1920_1080_25fps.mp4'},
  {sceneId: 'LEITE_049', pexelsId: 8863365, title: 'Working with Samples in a Laboratory', author: 'Mikhail Nilov', pageUrl: 'https://www.pexels.com/video/a-man-working-with-samples-in-a-laboratory-8863365/', downloadUrl: 'https://videos.pexels.com/video-files/8863365/8863365-hd_1920_1080_30fps.mp4'},
];

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function remoteDuration(url: string): number {
  const probe = spawnSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', url,
  ], {encoding: 'utf8', maxBuffer: 1024 * 1024 * 8, timeout: 120000});
  const duration = Number(probe.stdout.trim());
  if (probe.status !== 0 || !Number.isFinite(duration) || duration <= 0) {
    throw new Error(`MILK_BANK_REMOTE_PROBE_FAILED:${url}:${probe.stderr || probe.stdout}`);
  }
  return duration;
}

function renderTake(source: BankSource, output: string, targetSeconds: number, sourceSeconds: number): void {
  const hasEnoughDuration = sourceSeconds >= targetSeconds + 0.25;
  const seek = hasEnoughDuration ? Math.min(1.2, Math.max(0, (sourceSeconds - targetSeconds) / 2)) : 0;
  const timingFilter = hasEnoughDuration ? '' : `setpts=${(targetSeconds / sourceSeconds).toFixed(8)}*PTS,`;
  const args = [
    '-y', '-hide_banner', '-loglevel', 'error',
    ...(seek > 0 ? ['-ss', seek.toFixed(3)] : []),
    '-i', source.downloadUrl,
    '-t', targetSeconds.toFixed(6),
    '-an',
    '-vf', `${timingFilter}scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=24,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-movflags', '+faststart',
    output,
  ];
  const render = spawnSync('ffmpeg', args, {encoding: 'utf8', maxBuffer: 1024 * 1024 * 12, timeout: 600000});
  if (render.status !== 0) {
    throw new Error(`MILK_BANK_CONFORM_FAILED:${source.sceneId}:${render.stderr || render.stdout}`);
  }
}

function main(): void {
  const root = process.cwd();
  const runDir = path.join(root, 'runs', MILK_EPISODE_ID, MILK_RUN_ID);
  const publicScenes = path.join(root, 'public', 'editorial', 'execution', MILK_RUN_ID, 'scenes');
  const checkpointPath = path.join(runDir, 'checkpoints', 'approved_bank_takes.json');
  const previousReceipts = fs.existsSync(checkpointPath)
    ? ((JSON.parse(fs.readFileSync(checkpointPath, 'utf8')) as {receipts?: any[]}).receipts || [])
    : [];
  const receiptsByScene = new Map<string, any>(previousReceipts.map((receipt) => [receipt.sceneId, receipt]));
  const requestedScenes = new Set(
    (process.env.MILK_BANK_SCENES || process.argv.find((argument) => argument.startsWith('--scenes='))?.split('=')[1] || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const selectedSources = requestedScenes.size > 0
    ? sources.filter((source) => requestedScenes.has(source.sceneId))
    : sources;

  selectedSources.forEach((source, index) => {
    const timelineScene = EPISODE_MILK_CALCULATED_TIMELINE.scenes.find((scene) => scene.id === source.sceneId);
    if (!timelineScene) throw new Error(`MILK_BANK_TIMELINE_SCENE_MISSING:${source.sceneId}`);
    const targetSeconds = timelineScene.durationFrames / EPISODE_MILK_CALCULATED_TIMELINE.fps;
    const sourceSeconds = remoteDuration(source.downloadUrl);
    const sceneDir = path.join(runDir, 'editorial', 'execution', 'scenes', source.sceneId);
    const publicSceneDir = path.join(publicScenes, source.sceneId);
    fs.mkdirSync(sceneDir, {recursive: true});
    fs.mkdirSync(publicSceneDir, {recursive: true});
    const output = path.join(sceneDir, 'approved_bank_take.mp4');
    process.stdout.write(`[${index + 1}/${selectedSources.length}] ${source.sceneId} <- Pexels ${source.pexelsId}\n`);
    renderTake(source, output, targetSeconds, sourceSeconds);
    const probe = PipelineContractGate.probeMedia(output);
    if (!probe.valid || probe.codec !== 'h264' || probe.width !== 1920 || probe.height !== 1080 || Math.abs(probe.duration - targetSeconds) > 0.12) {
      throw new Error(`MILK_BANK_OUTPUT_INVALID:${source.sceneId}:${JSON.stringify({probe, targetSeconds})}`);
    }
    fs.copyFileSync(output, path.join(publicSceneDir, 'approved_bank_take.mp4'));
    const receipt = {
      schema: 'ool.approved-bank-take.v1',
      sceneId: source.sceneId,
      provider: 'Pexels',
      pexelsId: source.pexelsId,
      title: source.title,
      author: source.author,
      pageUrl: source.pageUrl,
      downloadUrl: source.downloadUrl,
      license: 'Pexels License',
      licenseUrl: 'https://www.pexels.com/license/',
      fireflyUsed: false,
      takeOrigin: 'approved_bank_temporal',
      sourceDurationSeconds: sourceSeconds,
      outputDurationSeconds: probe.duration,
      output,
      outputSha256: sha256(output),
      width: probe.width,
      height: probe.height,
      fps: 24,
      peoplePolicy: 'START_FRAME_FORBIDDEN_ONLY',
      approvedForEpisode: MILK_EPISODE_ID,
      generatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(sceneDir, 'approved_bank_take_receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(publicSceneDir, 'approved_bank_take_receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    receiptsByScene.set(source.sceneId, receipt);
  });

  const receipts = sources.map((source) => receiptsByScene.get(source.sceneId)).filter(Boolean);
  if (receipts.length !== sources.length) {
    throw new Error(`MILK_BANK_RECEIPTS_INCOMPLETE:${receipts.length}/${sources.length}`);
  }

  const checkpoint = {
    schema: 'ool.approved-bank-stage.v1',
    status: 'APPROVED_BANK_TAKES_READY',
    episodeId: MILK_EPISODE_ID,
    runId: MILK_RUN_ID,
    total: receipts.length,
    fireflyUsed: false,
    license: 'Pexels License',
    receipts,
  };
  fs.mkdirSync(path.join(runDir, 'checkpoints'), {recursive: true});
  fs.writeFileSync(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
  console.log(`MILK_APPROVED_BANK_TAKES_READY:${receipts.length}`);
}

main();
