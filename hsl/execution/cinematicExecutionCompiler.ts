import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {CinematicScenePlanV1, CinematicShadowRunResult} from '../cinematic/types/cinematicPlans';
import {HslEditorialPackage} from '../editorial/types/editorial';
import {DocumentaryEditorAgent} from '../editorial/documentaryEditorAgent';
import {
  CinematicEditQaAgent,
  EditRhythmDirectorAgent,
  KlingMotionDirectorAgent,
  RemotionChoreographyAgent,
  SceneChoreographyAgent,
  TransitionDirectorAgent,
  VisualShotDirectorAgent
} from './agents/executionAgents';
import {HslExecutableScene, HslExecutionPlan} from './types/execution';
import {
  HSL_PREMIUM_MOTION_REFERENCE_SET,
  HSL_VISUAL_IDENTITY_CONTRACT_VERSION
} from '../../config/hslVisualIdentity';
import {buildFireflyPrompt} from '../../contracts/buildFireflyPrompt';

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(',')}}`;
  return JSON.stringify(value);
}

function sha(value: unknown): string {
  return `sha256_${crypto.createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex')}`;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  const temp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temp, filePath);
}

export interface HslExecutionCompileResult {
  readonly executionPlanPath: string;
  readonly visualCoverageReportPath: string;
  readonly scenePaths: readonly string[];
  readonly generatedScenePaths: readonly string[];
  readonly generatedShotIds: readonly string[];
  readonly totalVisualShots: number;
}

export class CinematicExecutionCompiler {
  compile(editorialPackagePath: string, cinematic: Readonly<CinematicShadowRunResult>): HslExecutionCompileResult {
    const packagePath = path.resolve(editorialPackagePath);
    const episode = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as HslEditorialPackage;
    if (episode.human_approval_status !== 'APPROVED' || episode.gate.status !== 'PASS') throw new Error('HSL_EXECUTION_SOURCE_NOT_APPROVED');
    if (episode.episode_id !== cinematic.episodeId) throw new Error('HSL_EXECUTION_EPISODE_MISMATCH');
    const cinematicByScene = new Map(cinematic.scenePlanPaths.map((filePath) => {
      const plan = JSON.parse(fs.readFileSync(filePath, 'utf8')) as CinematicScenePlanV1;
      return [plan.scene_id, plan] as const;
    }));
    const outputDirectory = path.join(path.dirname(packagePath), 'execution');
    const choreography = new SceneChoreographyAgent();
    const rhythm = new EditRhythmDirectorAgent();
    const transitions = new TransitionDirectorAgent();
    const remotion = new RemotionChoreographyAgent();
    const kling = new KlingMotionDirectorAgent();
    const qa = new CinematicEditQaAgent();
    const visualShotDirector = new VisualShotDirectorAgent();
    const scenePaths: string[] = [];
    const generatedScenePaths: string[] = [];
    episode.scenes.forEach((scene, index) => {
      const source = cinematicByScene.get(scene.scene_id);
      if (!source) throw new Error(`HSL_CINEMATIC_PLAN_REQUIRED:${scene.scene_id}`);
      const timing = rhythm.run(scene);
      const motion = kling.run(scene, source);
      const startFramePrompt = scene.visual_mode === 'generated_ai'
        ? buildFireflyPrompt({
          sceneId: scene.scene_id,
          visualSubject: scene.visual_subject,
          visual_must_include: [scene.visual_subject],
          visual_must_not: [],
          required_category: scene.visual_function || 'documentary_evidence',
        }).prompt
        : null;
      const seed: Omit<HslExecutableScene, 'execution_revision'> = {
        schema: 'hsl.execution.scene.v1', schema_version: '1.0.0', episode_id: episode.episode_id,
        scene_id: scene.scene_id, chapter_id: scene.chapter_id, narrative_function: scene.narrative_function,
        voiceover: scene.voiceover, visual_mode: scene.visual_mode, visual_subject: scene.visual_subject,
        evidence_status: scene.evidence_status, ai_disclosure_required: scene.ai_disclosure_required,
        visual_function: scene.visual_function || null, cinematic_source_revision: source.cinematic_plan_revision,
        ...(scene.attention_role ? {
          attention_role: scene.attention_role,
          attention_loop_id: scene.attention_loop_id || null,
          pause_after_ms: (scene as any).pause_after_ms || 0
        } : {}),
        energy: timing.energy, planned_duration_seconds: timing.plannedDurationSeconds,
        shot: source.shot, camera: source.camera, continuity: source.continuity,
        micro_events: choreography.run(scene, source), transition: transitions.run(source, index === episode.scenes.length - 1),
        remotion_choreography: remotion.run(scene), start_frame_prompt: startFramePrompt, motion,
        visual_shots: visualShotDirector.run(scene, source, timing.plannedDurationSeconds)
      };
      qa.validate(seed);
      const executable: HslExecutableScene = {...seed, execution_revision: sha(seed)};
      const scenePath = path.join(outputDirectory, 'scenes', `${scene.scene_id}.execution.json`);
      writeJson(scenePath, executable);
      scenePaths.push(scenePath);
      if (executable.visual_shots.some((shot) => shot.visual_mode === 'generated_ai')) generatedScenePaths.push(scenePath);
    });
    const executableScenes = scenePaths.map((scenePath) => JSON.parse(fs.readFileSync(scenePath, 'utf8')) as HslExecutableScene);
    const allShots = executableScenes.flatMap((scene) => scene.visual_shots);
    const generatedShotIds = executableScenes.flatMap((scene) => scene.visual_shots
      .filter((shot) => shot.visual_mode === 'generated_ai')
      .map((shot) => shot.shot_id));
    const durations = allShots.map((shot) => shot.planned_duration_seconds).sort((a, b) => a - b);
    const modes = allShots.reduce<Record<string, number>>((result, shot) => {
      result[shot.visual_mode] = (result[shot.visual_mode] || 0) + 1;
      return result;
    }, {});
    const strategies = allShots.reduce<Record<string, number>>((result, shot) => {
      const strategy = shot.generation_strategy || 'UNSPECIFIED';
      result[strategy] = (result[strategy] || 0) + 1;
      return result;
    }, {});
    const percentile = (ratio: number) => durations[Math.min(durations.length - 1, Math.ceil(durations.length * ratio) - 1)];
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    const generatedEditorialSeconds = allShots.filter((shot) => shot.visual_mode === 'generated_ai').reduce((sum, shot) => sum + shot.planned_duration_seconds, 0);
    const remotionSeconds = allShots.filter((shot) => shot.visual_mode === 'remotion').reduce((sum, shot) => sum + shot.planned_duration_seconds, 0);
    const addressableSeconds = allShots.filter((shot) => shot.visual_mode !== 'licensed_real').reduce((sum, shot) => sum + shot.planned_duration_seconds, 0);
    const generatedRatio = addressableSeconds ? generatedEditorialSeconds / addressableSeconds : 0;
    const remotionRatio = addressableSeconds ? remotionSeconds / addressableSeconds : 0;
    const minimumGeneratedRatio = Number(process.env.HSL_MIN_GENERATED_COVERAGE_RATIO || .7);
    const maximumRemotionRatio = Number(process.env.HSL_MAX_REMOTION_COVERAGE_RATIO || .22);
    let consecutiveRemotion = 0;
    let maximumConsecutiveRemotion = 0;
    for (const shot of allShots) {
      consecutiveRemotion = shot.visual_mode === 'remotion' ? consecutiveRemotion + 1 : 0;
      maximumConsecutiveRemotion = Math.max(maximumConsecutiveRemotion, consecutiveRemotion);
    }
    if (generatedRatio < minimumGeneratedRatio) throw new Error(`HSL_CINEMATIC_GENERATED_COVERAGE_TOO_LOW:${generatedRatio.toFixed(3)}`);
    if (remotionRatio > maximumRemotionRatio) throw new Error(`HSL_REMOTION_COVERAGE_TOO_HIGH:${remotionRatio.toFixed(3)}`);
    if (maximumConsecutiveRemotion > 1) throw new Error(`HSL_CONSECUTIVE_REMOTION_LIMIT_EXCEEDED:${maximumConsecutiveRemotion}`);
    const generatedSourceSeconds = allShots.reduce((sum, shot) => {
      if (shot.visual_mode !== 'generated_ai') return sum;
      return sum + (shot.veo_motion?.duration_seconds || 10);
    }, 0);
    const visualCoverageReportPath = path.join(outputDirectory, 'visual-coverage.json');
    writeJson(visualCoverageReportPath, {
      schema: 'hsl.execution.visual-coverage.v1', schema_version: '1.0.0', episode_id: episode.episode_id,
      status: 'VISUAL_COVERAGE_QA_PASS', narrative_scene_count: executableScenes.length,
      visual_shot_count: allShots.length, generated_shot_count: generatedShotIds.length,
      mode_distribution: modes, generation_strategy_distribution: strategies,
      cinematic_coverage_policy: {
        minimum_generated_ratio: minimumGeneratedRatio, maximum_remotion_ratio: maximumRemotionRatio,
        generated_ratio: Math.round(generatedRatio * 1000) / 1000,
        remotion_ratio: Math.round(remotionRatio * 1000) / 1000,
        maximum_consecutive_remotion_shots: maximumConsecutiveRemotion,
        status: 'CINEMATIC_COVERAGE_QA_PASS'
      },
      total_timeline_seconds: Math.round(totalDuration * 1000) / 1000,
      average_shot_seconds: Math.round((totalDuration / allShots.length) * 1000) / 1000,
      median_shot_seconds: percentile(.5), p90_shot_seconds: percentile(.9), maximum_shot_seconds: durations[durations.length - 1],
      target_visual_cadence_seconds: visualShotDirector.targetCadenceSeconds,
      generated_editorial_seconds: Math.round(generatedEditorialSeconds * 1000) / 1000,
      generated_source_seconds: generatedSourceSeconds,
      firefly_source_seconds: generatedSourceSeconds, firefly_loop_required: false
    });
    const docEditor = new DocumentaryEditorAgent();
    docEditor.compileDocumentaryPackage(
      episode.episode_id,
      executableScenes.map((s) => ({
        sceneId: s.scene_id,
        shotId: s.visual_shots[0]?.shot_id || s.scene_id,
        narrativeFunction: s.narrative_function,
        visualSubject: s.visual_subject
      })),
      outputDirectory
    );

    const planSeed = {
      schema: 'hsl.execution.episode.v1' as const, schema_version: '1.0.0' as const,
      episode_id: episode.episode_id, source_episode_package: packagePath,
      source_cinematic_plan: cinematic.episodePlanPath, status: 'EXECUTION_PLAN_APPROVED' as const,
      scenes: scenePaths.map((filePath) => path.relative(outputDirectory, filePath).replace(/\\/g, '/')),
      generated_scene_ids: generatedScenePaths.map((filePath) => path.basename(filePath).split('.')[0]),
      generated_shot_ids: generatedShotIds,
      total_visual_shots: executableScenes.reduce((sum, scene) => sum + scene.visual_shots.length, 0),
      target_visual_cadence_seconds: visualShotDirector.targetCadenceSeconds,
      visual_coverage_report: path.relative(outputDirectory, visualCoverageReportPath).replace(/\\/g, '/'),
      visual_identity_contract_version: HSL_VISUAL_IDENTITY_CONTRACT_VERSION,
      required_visual_reference_set: HSL_PREMIUM_MOTION_REFERENCE_SET.name
    };
    const executionRevision = sha(planSeed);
    const planPath = path.join(outputDirectory, 'episode.execution.json');
    const existing = fs.existsSync(planPath) ? JSON.parse(fs.readFileSync(planPath, 'utf8')) as Partial<HslExecutionPlan> : null;
    const plan: HslExecutionPlan = {...planSeed, execution_revision: executionRevision, generated_at: existing?.execution_revision === executionRevision && existing.generated_at ? existing.generated_at : new Date().toISOString()};
    writeJson(planPath, plan);
    return {executionPlanPath: planPath, visualCoverageReportPath, scenePaths, generatedScenePaths, generatedShotIds, totalVisualShots: plan.total_visual_shots};
  }
}
