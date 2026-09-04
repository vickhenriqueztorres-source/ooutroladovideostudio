import fs from 'fs';
import path from 'path';
import {buildFireflyPrompt} from '../contracts/buildFireflyPrompt';

type ShotPlanItem = {
  shot_id: string;
  candidate_path: string;
  motion_prompt: string;
  planned_duration_seconds?: number;
};

type ShotPlan = {
  episode_id: string;
  items: ShotPlanItem[];
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function main(): void {
  const repoRoot = process.cwd();
  const runRoot = path.join(repoRoot, 'runs', 'OOL-EP06-SEMAFORO');
  const planPath = path.join(runRoot, 'start-frame-candidates', 'start-frame-shot-plan.json');
  const guideRoot = path.join(runRoot, 'firefly-guide');
  const imagesDir = path.join(guideRoot, 'imagens');
  fs.mkdirSync(imagesDir, {recursive: true});

  const plan = readJson<ShotPlan>(planPath);
  if (plan.episode_id !== 'OOL-EP06-SEMAFORO') {
    throw new Error(`Unexpected episode_id: ${plan.episode_id}`);
  }

  const items = plan.items.map((item) => {
    if (!fs.existsSync(item.candidate_path)) {
      throw new Error(`Missing candidate frame: ${item.candidate_path}`);
    }
    const imageName = `${item.shot_id}.png`;
    fs.copyFileSync(item.candidate_path, path.join(imagesDir, imageName));
    const prompt = buildFireflyPrompt({
      sceneId: item.shot_id,
      visualSubject: `${item.motion_prompt}. One continuous five-second present-day documentary take with visible physical motion`,
      visual_must_include: ['commercial traffic signal hardware', 'real roadway operation', item.motion_prompt],
      visual_must_not: ['invented signal hardware', 'unrelated vehicles appearing suddenly'],
      required_category: 'documentary_physical_motion',
      domainTags: ['traffic-control', 'present-day-roadway', 'public-infrastructure'],
      targetSeconds: 5
    });
    return {
      name: `${item.shot_id}_TAKE_01`,
      image: imageName,
      prompt: prompt.prompt,
      model: 'Firefly Video',
      resolution: '1080p',
      aspect_ratio: '16:9',
      duration_seconds: 5,
      generate_audio: false,
      use_first_frame: false,
      input_mode: 'text_to_video_with_staged_reference'
    };
  });

  const guide = {
    batch_name: 'OOL-EP06-SEMAFORO_firefly_video',
    source_run: 'OOL-EP06-SEMAFORO',
    model: 'Firefly Video',
    resolution: '1080p',
    aspect_ratio: '16:9',
    duration_seconds: 5,
    generate_audio: false,
    use_first_frame: false,
    items
  };

  const guidePath = path.join(guideRoot, 'firefly-guide.json');
  fs.writeFileSync(guidePath, `${JSON.stringify(guide, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({
    status: 'FIREFLY_GUIDE_READY',
    guide_path: guidePath,
    image_count: items.length,
    first_item: items[0]?.name,
    last_item: items[items.length - 1]?.name
  }, null, 2)}\n`);
}

main();
