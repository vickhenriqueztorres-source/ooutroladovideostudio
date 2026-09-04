import {spawnSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import {validateVideoWithFfprobe} from '../../media/mediaValidator';
import {HslGeneratedAssetIntakeManifest} from '../../production-bridge/fireflyToIntake';
import {HslExecutableScene, HslExecutableVisualShot, HslExecutionPlan} from '../execution/types/execution';
import {buildMotionDesign} from '../motion/motionDesign';
import {HslSoundFxRuntime, HslSoundFxRuntimeResult} from './soundFxRuntime';
import {DialogLevelingAgent, LoudnessQaAgent, NarrationPerformanceAgent} from './narrationAudioRuntime';
import {HybridSoundBedAgent, NativeGeneratedAudioAgent} from './nativeGeneratedAudioRuntime';
import {assertOfficialHslNarrationConfig} from '../../config/hslProductionRules';
import {ElevenLabsAdapter} from '../../adapters/elevenLabsAdapter';

export interface HslLicensedAssetItem {
  readonly scene_id: string;
  readonly file_path: string;
  readonly source_url: string;
  readonly license_status: 'APPROVED';
  readonly license_reference: string;
}

export interface HslPostproductionResult {
  readonly success: true;
  readonly finalVideoPath: string;
  readonly renderManifestPath: string;
  readonly soundFxPlanPath: string;
  readonly soundFxBedPath: string;
  readonly narrationLeveledPath: string;
  readonly narrationAudioQaPath: string;
  readonly narrationPerformancePlanPath: string;
  readonly nativeAudioPlanPath: string;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export class NarrationVoiceAgent {
  async generate(text: string, outputPath: string): Promise<string> {
    assertOfficialHslNarrationConfig();
    if (!text.trim()) throw new Error('HSL_NARRATION_TEXT_REQUIRED');
    const adapter = new ElevenLabsAdapter();
    await adapter.initialize();
    if (!await adapter.checkHealth()) throw new Error('HSL_ELEVENLABS_HEALTHCHECK_FAILED');
    await adapter.synthesizeText(text, outputPath);
    return outputPath;
  }

  private chunkLongForm(text: string, maxCharacters = 9000): string[] {
    const paragraphs = text.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
    const chunks: string[] = [];
    let current = '';
    for (const paragraph of paragraphs) {
      if (paragraph.length > maxCharacters) throw new Error('HSL_ELEVENLABS_PARAGRAPH_TOO_LONG');
      const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
      if (candidate.length <= maxCharacters) current = candidate;
      else {
        chunks.push(current);
        current = paragraph;
      }
    }
    if (current) chunks.push(current);
    if (!chunks.length) throw new Error('HSL_NARRATION_TEXT_REQUIRED');
    return chunks;
  }

  private async generateWithVoicebox(text: string, outputPath: string): Promise<string> {
    const apiUrl = (process.env.HSL_VOICEBOX_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const profileId = process.env.HSL_VOICEBOX_PROFILE_ID;
    if (!profileId) throw new Error('HSL_VOICEBOX_PROFILE_ID_REQUIRED');
    if (!text.trim()) throw new Error('HSL_NARRATION_TEXT_REQUIRED');
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});

    const chunks = this.chunkLongForm(text, Number(process.env.HSL_VOICEBOX_MAX_CHUNK_CHARS || 1800));
    const chunkPaths: string[] = [];
    for (let index = 0; index < chunks.length; index += 1) {
      process.stderr.write(`HSL_VOICEBOX_CHUNK ${index + 1}/${chunks.length}\n`);
      chunkPaths.push(await this.generateVoiceboxChunk(apiUrl, profileId, chunks[index], outputPath, index));
    }
    const concatPath = `${outputPath}.voicebox.concat.txt`;
    fs.writeFileSync(concatPath, `${chunkPaths.map((item) => `file '${item.replace(/'/g, "'\\''")}'`).join('\n')}\n`, 'utf8');
    const encoded = spawnSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', concatPath,
      '-c:a', 'libmp3lame', '-b:a', '192k', outputPath
    ], {encoding: 'utf8', maxBuffer: 1024 * 1024 * 20});
    chunkPaths.forEach((item) => fs.unlinkSync(item));
    fs.unlinkSync(concatPath);
    if (encoded.status !== 0) throw new Error(`HSL_VOICEBOX_ENCODE_FAILED:${encoded.stderr || encoded.stdout || ''}`);
    return outputPath;
  }

  private async generateVoiceboxChunk(apiUrl: string, profileId: string, text: string, outputPath: string, index: number): Promise<string> {
    const response = await fetch(`${apiUrl}/generate`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        profile_id: profileId,
        text,
        language: process.env.HSL_VOICEBOX_LANGUAGE || 'en',
        engine: process.env.HSL_VOICEBOX_ENGINE || 'kokoro',
        max_chunk_chars: Number(process.env.HSL_VOICEBOX_MAX_CHUNK_CHARS || 1800),
        crossfade_ms: Number(process.env.HSL_VOICEBOX_CROSSFADE_MS || 80),
        normalize: true
      })
    });
    if (!response.ok) throw new Error(`HSL_VOICEBOX_REQUEST_FAILED:${response.status}:${await response.text()}`);
    const generation = await response.json() as {id?: string};
    if (!generation.id) throw new Error('HSL_VOICEBOX_GENERATION_ID_REQUIRED');

    const deadline = Date.now() + Number(process.env.HSL_VOICEBOX_TIMEOUT_MS || 30 * 60 * 1000);
    let history: {status?: string; error?: string | null} | undefined;
    while (Date.now() < deadline) {
      const historyResponse = await fetch(`${apiUrl}/history/${generation.id}`);
      if (!historyResponse.ok) throw new Error(`HSL_VOICEBOX_HISTORY_FAILED:${historyResponse.status}`);
      history = await historyResponse.json() as {status?: string; error?: string | null};
      if (history.status === 'completed') break;
      if (history.status === 'failed') throw new Error(`HSL_VOICEBOX_GENERATION_FAILED:${history.error || 'UNKNOWN'}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (history?.status !== 'completed') throw new Error('HSL_VOICEBOX_GENERATION_TIMEOUT');

    const audioResponse = await fetch(`${apiUrl}/audio/${generation.id}`);
    if (!audioResponse.ok) throw new Error(`HSL_VOICEBOX_AUDIO_DOWNLOAD_FAILED:${audioResponse.status}`);
    const wavPath = `${outputPath}.voicebox.part-${String(index + 1).padStart(3, '0')}.wav`;
    fs.writeFileSync(wavPath, Buffer.from(await audioResponse.arrayBuffer()));
    return wavPath;
  }
}

export class LicensedAssetAgent {
  read(manifestPath: string | undefined): Map<string, HslLicensedAssetItem> {
    if (!manifestPath || !fs.existsSync(manifestPath)) return new Map();
    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {items?: HslLicensedAssetItem[]};
    const map = new Map<string, HslLicensedAssetItem>();
    for (const item of parsed.items || []) {
      if (item.license_status !== 'APPROVED' || !item.source_url || !item.license_reference || !fs.existsSync(item.file_path)) throw new Error(`HSL_LICENSED_ASSET_INVALID:${item.scene_id}`);
      map.set(item.scene_id, item);
    }
    return map;
  }
}

export class TypographyQaAgent {
  validate(scene: HslExecutableScene): void {
    if (scene.visual_subject.length > 180) throw new Error(`HSL_TYPOGRAPHY_SUBJECT_TOO_LONG:${scene.scene_id}`);
    if (scene.remotion_choreography.some((cue) => cue.text && cue.text.length > 240)) throw new Error(`HSL_TYPOGRAPHY_CUE_TOO_LONG:${scene.scene_id}`);
  }
}

export class MonetizationSafetyQaAgent {
  validate(scenes: readonly HslExecutableScene[], licensed: ReadonlyMap<string, HslLicensedAssetItem>): void {
    for (const scene of scenes) {
      if (scene.visual_mode === 'generated_ai' && !scene.ai_disclosure_required) throw new Error(`HSL_AI_DISCLOSURE_REQUIRED:${scene.scene_id}`);
      if (scene.visual_mode === 'licensed_real' && !licensed.has(scene.scene_id)) throw new Error(`HSL_LICENSED_ASSET_REQUIRED:${scene.scene_id}`);
    }
  }
}

export class SoundDesignAgent {
  validateNarration(narrationPath: string): void {
    if (!fs.existsSync(narrationPath) || fs.statSync(narrationPath).size === 0) throw new Error('HSL_NARRATION_AUDIO_REQUIRED');
  }

  createSoundFx(scenes: readonly HslExecutableScene[], outputDirectory: string, suppressSceneIds?: ReadonlySet<string>): HslSoundFxRuntimeResult {
    return new HslSoundFxRuntime().run({scenes, outputDirectory, fps: 30, suppressSceneIds});
  }
}

export class FinalRenderQaAgent {
  validate(videoPath: string) {
    const validation = validateVideoWithFfprobe(videoPath);
    const validMaster = validation.valid &&
      validation.width === 1920 && validation.height === 1080 &&
      Math.abs(validation.fps - 30) < 0.01 && validation.codec === 'h264' &&
      validation.pixel_format === 'yuv420p' && validation.has_audio &&
      validation.audio_codec === 'aac' && validation.audio_sample_rate === 48000 &&
      (validation.audio_channels || 0) >= 2 && validation.sha256.length === 64;
    if (!validMaster) throw new Error(`HSL_FINAL_RENDER_QA_FAILED:${JSON.stringify(validation)}`);
    return validation;
  }
}

export class RemotionAssemblyAgent {
  render(propsPath: string, outputPath: string): void {
    const remotionCli = path.resolve(process.cwd(), 'node_modules/@remotion/cli/remotion-cli.js');
    if (!fs.existsSync(remotionCli)) throw new Error(`HSL_REMOTION_CLI_REQUIRED:${remotionCli}`);
    const rawRenderPath = `${outputPath}.remotion.mp4`;
    const result = spawnSync(process.execPath, [
      remotionCli, 'render', 'remotion/index.ts', 'HslEpisode', rawRenderPath,
      `--props=${propsPath}`, '--codec=h264', '--crf=18', '--timeout=120000'
    ], {
      cwd: process.cwd(), encoding: 'utf8', maxBuffer: 1024 * 1024 * 20
    });
    if (result.status !== 0) {
      const processError = result.error ? `\n${result.error.name}: ${result.error.message}` : '';
      throw new Error(`HSL_REMOTION_RENDER_FAILED:${result.stdout || ''}\n${result.stderr || ''}${processError}`);
    }
    const normalize = spawnSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error', '-i', rawRenderPath,
      '-map', '0:v:0', '-map', '0:a:0', '-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p',
      '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-r', '30',
      '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-map_metadata', '-1',
      '-movflags', '+faststart', outputPath
    ], {cwd: process.cwd(), encoding: 'utf8', maxBuffer: 1024 * 1024 * 20});
    if (normalize.status !== 0) {
      const processError = normalize.error ? `\n${normalize.error.name}: ${normalize.error.message}` : '';
      throw new Error(`HSL_MASTER_NORMALIZATION_FAILED:${normalize.stdout || ''}\n${normalize.stderr || ''}${processError}`);
    }
    fs.unlinkSync(rawRenderPath);
  }
}

export class HslPostproductionRuntime {
  async run(input: Readonly<{
    productionId: string;
    executionPlanPath: string;
    intakeManifestPath: string;
    licensedAssetManifestPath?: string;
    narrationPath?: string;
    outputDirectory: string;
  }>): Promise<HslPostproductionResult> {
    const executionPath = path.resolve(input.executionPlanPath);
    const executionPlan = JSON.parse(fs.readFileSync(executionPath, 'utf8')) as HslExecutionPlan;
    const executionRoot = path.dirname(executionPath);
    const scenes = executionPlan.scenes.map((relative) => JSON.parse(fs.readFileSync(path.resolve(executionRoot, relative), 'utf8')) as HslExecutableScene);
    const intake = JSON.parse(fs.readFileSync(input.intakeManifestPath, 'utf8')) as HslGeneratedAssetIntakeManifest;
    const generatedByShot = new Map(intake.items.map((item) => [item.shot_id, item]));
    const licensed = new LicensedAssetAgent().read(input.licensedAssetManifestPath);
    new MonetizationSafetyQaAgent().validate(scenes, licensed);
    const typographyQa = new TypographyQaAgent();
    scenes.forEach((scene) => typographyQa.validate(scene));
    const outputRoot = path.resolve(input.outputDirectory);
    const publicRoot = path.resolve(__dirname, '../../public/hsl-runs', input.productionId);
    fs.mkdirSync(publicRoot, {recursive: true});
    const renderScenes = scenes.flatMap((scene) => {
      const shots = scene.visual_shots?.length ? scene.visual_shots : [this.legacyShot(scene)];
      const sceneFrames = Math.max(1, Math.round(scene.planned_duration_seconds * 30));
      let consumedFrames = 0;
      return shots.map((shot, index) => {
        let mediaSrc: string | undefined;
        if (shot.visual_mode === 'generated_ai') {
          const asset = generatedByShot.get(shot.shot_id);
          if (!asset) throw new Error(`HSL_GENERATED_VIDEO_REQUIRED:${shot.shot_id}`);
          const destination = path.join(publicRoot, `${shot.shot_id}.mp4`);
          fs.copyFileSync(asset.video_path, destination);
          mediaSrc = `hsl-runs/${input.productionId}/${path.basename(destination)}`;
        }
        if (shot.visual_mode === 'licensed_real') {
          const asset = licensed.get(scene.scene_id)!;
          const destination = path.join(publicRoot, `${shot.shot_id}${path.extname(asset.file_path) || '.mp4'}`);
          fs.copyFileSync(asset.file_path, destination);
          mediaSrc = `hsl-runs/${input.productionId}/${path.basename(destination)}`;
        }
        const durationInFrames = index === shots.length - 1
          ? Math.max(1, sceneFrames - consumedFrames)
          : Math.max(1, Math.round(shot.planned_duration_seconds * 30));
        consumedFrames += durationInFrames;
        return {
          sceneId: scene.scene_id, shotId: shot.shot_id, variant: shot.variant,
          chapterTitle: scene.chapter_id, narrativeFunction: scene.narrative_function,
          visualMode: shot.visual_mode, visualSubject: shot.visual_subject,
          ...(shot.visual_mode === 'remotion' ? {motionDesign: shot.motion_design || buildMotionDesign({
            narrativeFunction: scene.narrative_function, visualSubject: shot.visual_subject,
            voiceover: scene.voiceover, variant: shot.variant
          })} : {}),
          ...(shot.generation_strategy === 'VEO_REMOTION_HYBRID' ? {motionDesign: shot.motion_design || buildMotionDesign({
            narrativeFunction: scene.narrative_function, visualSubject: shot.visual_subject,
            voiceover: scene.voiceover, variant: shot.variant
          })} : {}),
          generationStrategy: shot.generation_strategy,
          durationInFrames, mediaSrc, aiDisclosureRequired: shot.ai_disclosure_required,
          transition: index === shots.length - 1 ? scene.transition.type : 'CUT'
        };
      });
    });
    let narrationPath = input.narrationPath ? path.resolve(input.narrationPath) : path.join(outputRoot, 'narration.mp3');
    if (!fs.existsSync(narrationPath)) await new NarrationVoiceAgent().generate(scenes.map((scene) => scene.voiceover).join('\n\n'), narrationPath);
    new SoundDesignAgent().validateNarration(narrationPath);
    const narrationPerformancePlanPath = path.join(outputRoot, 'narration-performance-plan.json');
    writeJson(narrationPerformancePlanPath, new NarrationPerformanceAgent().run(scenes));
    const narrationLeveledPath = new DialogLevelingAgent().level(narrationPath, path.join(outputRoot, 'audio', 'narration-leveled.wav'));
    const narrationAudioQa = new LoudnessQaAgent().validate(narrationLeveledPath);
    const narrationAudioQaPath = path.join(outputRoot, 'narration-audio-qa.json');
    writeJson(narrationAudioQaPath, narrationAudioQa);
    const narrationPublic = path.join(publicRoot, 'narration-leveled.wav');
    fs.copyFileSync(narrationLeveledPath, narrationPublic);
    const nativeAudioSceneIds = new Set(scenes.filter((scene) => {
      const shots = scene.visual_shots?.length ? scene.visual_shots : [this.legacyShot(scene)];
      return shots.some((shot) => generatedByShot.get(shot.shot_id)?.native_audio_status === 'PRESENT_VALIDATED');
    }).map((scene) => scene.scene_id));
    const soundFx = new SoundDesignAgent().createSoundFx(scenes, path.join(outputRoot, 'soundfx'), nativeAudioSceneIds);
    let cursorFrames = 0;
    const nativeTimeline = renderScenes.map((scene) => {
      const item = {
        shotId: scene.shotId, startSeconds: cursorFrames / 30,
        durationSeconds: scene.durationInFrames / 30
      };
      cursorFrames += scene.durationInFrames;
      return item;
    });
    const nativeAudio = new NativeGeneratedAudioAgent().create({
      timeline: nativeTimeline, assets: generatedByShot,
      totalDurationSeconds: renderScenes.reduce((sum, scene) => sum + scene.durationInFrames, 0) / 30,
      outputDirectory: path.join(outputRoot, 'native-audio')
    });
    const combinedSoundFxPath = new HybridSoundBedAgent().mix(
      soundFx.bedPath, nativeAudio.bedPath, path.join(outputRoot, 'soundfx', 'hybrid-soundfx-bed.wav')
    );
    const soundFxPublic = path.join(publicRoot, 'soundfx-bed.wav');
    fs.copyFileSync(combinedSoundFxPath, soundFxPublic);
    const props = {
      title: 'O Outro Lado', fps: 30, width: 1920, height: 1080,
      totalDurationInFrames: renderScenes.reduce((sum, scene) => sum + scene.durationInFrames, 0),
      scenes: renderScenes, narrationSrc: `hsl-runs/${input.productionId}/narration-leveled.wav`,
      soundFxSrc: `hsl-runs/${input.productionId}/soundfx-bed.wav`, soundFxVolume: 1,
      showGlobalOverlays: process.env.HSL_SHOW_GLOBAL_OVERLAYS === 'true',
      showHybridTextOverlay: process.env.HSL_SHOW_HYBRID_TEXT_OVERLAY === 'true',
      showMasterStopwatch: process.env.HSL_SHOW_MASTER_STOPWATCH === 'true'
    };
    const propsPath = path.join(outputRoot, 'remotion-props.json');
    writeJson(propsPath, props);
    const finalVideoPath = path.join(outputRoot, 'HSL_FINAL_DOCUMENTARY.mp4');
    new RemotionAssemblyAgent().render(propsPath, finalVideoPath);
    const validation = new FinalRenderQaAgent().validate(finalVideoPath);
    const renderManifestPath = path.join(outputRoot, 'final-render-manifest.json');
    writeJson(renderManifestPath, {
      production_id: input.productionId, episode_id: executionPlan.episode_id,
      narration: {
        source_path: narrationPath,
        leveled_path: narrationLeveledPath,
        performance_plan_path: narrationPerformancePlanPath,
        qa_path: narrationAudioQaPath,
        qa: narrationAudioQa
      },
      soundfx: {plan_path: soundFx.planPath, bed_path: combinedSoundFxPath, qa: soundFx.qa},
      native_generated_audio: nativeAudio,
      video: validation, status: 'FINAL_RENDER_QA_PASS'
    });
    return {
      success: true, finalVideoPath, renderManifestPath,
      soundFxPlanPath: soundFx.planPath, soundFxBedPath: soundFx.bedPath,
      narrationLeveledPath, narrationAudioQaPath, narrationPerformancePlanPath,
      nativeAudioPlanPath: nativeAudio.planPath
    };
  }

  private legacyShot(scene: HslExecutableScene): HslExecutableVisualShot {
    return {
      schema: 'hsl.execution.visual-shot.v1', schema_version: '1.0.0', episode_id: scene.episode_id,
      parent_scene_id: scene.scene_id, shot_id: scene.scene_id, shot_index: 1, variant: 'ESTABLISH',
      visual_mode: scene.visual_mode as HslExecutableVisualShot['visual_mode'], visual_subject: scene.visual_subject,
      planned_duration_seconds: scene.planned_duration_seconds, evidence_status: scene.evidence_status,
      ai_disclosure_required: scene.ai_disclosure_required, visual_function: scene.visual_function || null,
      start_frame_prompt: scene.start_frame_prompt, motion: scene.motion
    };
  }
}
