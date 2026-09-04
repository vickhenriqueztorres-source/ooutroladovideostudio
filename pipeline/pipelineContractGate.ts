import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { RunManifest } from './runManifest';
import { EpisodeContract, parseEpisodeContract } from '../contracts/episodeContract';
import { SceneVisualContract } from '../contracts/sceneVisualContract';
import { TimelineContractSchema } from '../contracts/timelineContract';
import {
  HSL_BYTE_CONSTRAINTS,
  HSL_MAX_AUDIO_VIDEO_DESYNC_SECONDS,
  HSL_CANONICAL_THUMBNAILS
} from '../spec/hsl-spec';

export interface BeatValidationFailure {
  sceneId: string;
  shotId: string;
  index: number;
  assetType: 'START_FRAME' | 'VIDEO_TAKE' | 'VOICEOVER' | 'PACKAGING' | 'TIMING';
  expectedPath: string;
  reason: string;
  actualSizeBytes?: number;
  actualDurationSeconds?: number;
}

export interface RunContractValidationOptions {
  runId: string;
  runsDir?: string;
  publicDir?: string;
  stageScope?: 'PRE_RENDER' | 'PRE_MUX' | 'FULL_PACKAGE';
  allowedTimingDeltaSeconds?: number;
  targetDurationMinutes?: number;
  contract?: EpisodeContract;
  contractPath?: string;
  sceneContracts?: SceneVisualContract[];
  allowDegraded?: boolean;
}

export interface RunValidationReport {
  runId: string;
  contract?: EpisodeContract;
  totalScenesExpected: number;
  validStartFrames: number;
  validVideoTakes: number;
  validDossierVisuals: number;
  validAudioClips: number;
  narrationDurationSeconds: number;
  timelineDurationSeconds: number;
  timingDeltaSeconds: number;
  packagingValid: boolean;
  degradedScenes: Array<{ sceneId: string; reason?: string }>;
  failures: BeatValidationFailure[];
  passed: boolean;
}

export class PipelineContractGate {
  private static readonly MIN_PNG_BYTES = HSL_BYTE_CONSTRAINTS.MIN_START_FRAME_BYTES;
  private static readonly MIN_MP4_BYTES = HSL_BYTE_CONSTRAINTS.MIN_VIDEO_TAKE_BYTES;
  private static readonly MIN_AUDIO_BYTES = HSL_BYTE_CONSTRAINTS.MIN_AUDIO_NARRATION_BYTES;
  private static readonly DEFAULT_TIMING_TOLERANCE = HSL_MAX_AUDIO_VIDEO_DESYNC_SECONDS;

  /**
   * Valida se um arquivo de imagem possui header PNG ou JPEG válido
   */
  public static validateImageHeader(filePath: string): boolean {
    if (!fs.existsSync(filePath)) return false;
    try {
      const buffer = Buffer.alloc(8);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 8, 0);
      fs.closeSync(fd);

      // PNG: 89 50 4E 47 0D 0A 1A 0A
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
      // JPEG: FF D8 FF
      const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
      return isPng || isJpeg;
    } catch {
      return false;
    }
  }

  /**
   * Extrai duração e codec de um arquivo de mídia via ffprobe
   */
  public static probeMedia(filePath: string): { duration: number; codec: string; width?: number; height?: number; valid: boolean } {
    if (!fs.existsSync(filePath)) return { duration: 0, codec: 'missing', valid: false };
    try {
      const probe = spawnSync('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration:stream=width,height,codec_name',
        '-of', 'json',
        filePath
      ], { encoding: 'utf8' });

      if (probe.status !== 0) return { duration: 0, codec: 'probe_error', valid: false };
      const parsed = JSON.parse(probe.stdout);
      const duration = parseFloat(parsed.format?.duration || '0');
      const firstStream = parsed.streams?.[0];
      const codec = firstStream?.codec_name || 'unknown';
      const width = firstStream?.width ? parseInt(firstStream.width, 10) : undefined;
      const height = firstStream?.height ? parseInt(firstStream.height, 10) : undefined;
      return { duration, codec, width, height, valid: duration > 0 };
    } catch {
      return { duration: 0, codec: 'exec_error', valid: false };
    }
  }

  private static luminanceCache = new Map<string, number>();

  /**
   * Calcula a luminância média de um frame ou vídeo via ffmpeg signalstats
   * Retorna valor normalizado entre 0.0 (preto absoluto) e 1.0 (branco absoluto).
   */
  public static calculateMediaLuminance(filePath: string, atSecond?: number): number {
    if (!fs.existsSync(filePath)) return 1.0;
    const cacheKey = `${filePath}_${atSecond || 0}`;
    if (this.luminanceCache.has(cacheKey)) {
      return this.luminanceCache.get(cacheKey)!;
    }

    try {
      const args = ['-nostdin', '-y', '-v', 'error'];
      if (atSecond !== undefined && atSecond > 0) {
        args.push('-ss', String(atSecond));
      }
      args.push(
        '-i', filePath,
        '-vf', 'scale=64:36,signalstats,metadata=print:file=-:key=lavfi.signalstats.YAVG',
        '-vframes', '1',
        '-f', 'null',
        '-'
      );
      const probe = spawnSync('ffmpeg', args, { encoding: 'utf8', timeout: 3000 });
      const output = (probe.stdout || '') + (probe.stderr || '');
      const match = output.match(/lavfi\.signalstats\.YAVG=([0-9.]+)/i);
      if (match) {
        const yavg = parseFloat(match[1]);
        const result = yavg / 255.0;
        this.luminanceCache.set(cacheKey, result);
        return result;
      }
    } catch {}
    this.luminanceCache.set(cacheKey, 0.5);
    return 0.5;
  }

  public static calculateFrozenRatio(filePath: string, durationSeconds?: number): number {
    const duration = durationSeconds || this.probeMedia(filePath).duration;
    if (!fs.existsSync(filePath) || duration <= 0) return 1;
    const result = spawnSync('ffmpeg', [
      '-nostdin', '-v', 'info', '-i', filePath,
      '-vf', 'freezedetect=n=-50dB:d=0.8', '-an', '-f', 'null', '-'
    ], {encoding: 'utf8', timeout: Math.max(15000, Math.ceil(duration * 3000))});
    const output = `${result.stdout || ''}\n${result.stderr || ''}`;
    const durations = [...output.matchAll(/freeze_duration:\s*([0-9.]+)/g)]
      .map((match) => Number(match[1]))
      .filter(Number.isFinite);
    const starts = [...output.matchAll(/freeze_start:\s*([0-9.]+)/g)]
      .map((match) => Number(match[1]))
      .filter(Number.isFinite);
    const ends = [...output.matchAll(/freeze_end:\s*([0-9.]+)/g)]
      .map((match) => Number(match[1]))
      .filter(Number.isFinite);
    let frozenSeconds = durations.reduce((sum, value) => sum + value, 0);
    if (starts.length > ends.length) {
      frozenSeconds += Math.max(0, duration - starts[starts.length - 1]);
    }
    return Math.min(1, frozenSeconds / duration);
  }

  public static validateCompletedRunEvidence(runDir: string, manifest: any): BeatValidationFailure[] {
    const status = String(manifest?.status || manifest?.overallStatus || '').toUpperCase();
    if (status !== 'DONE' && status !== 'COMPLETED') return [];

    const failures: BeatValidationFailure[] = [];
    const finalMasterPath = path.join(runDir, 'final_master.mp4');
    const renderManifestPath = path.join(runDir, 'render_manifest.json');
    const fail = (reason: string, expectedPath = renderManifestPath): void => {
      failures.push({
        sceneId: 'GLOBAL',
        shotId: 'RUN_COMPLETION',
        index: 0,
        assetType: 'VIDEO_TAKE',
        expectedPath,
        reason,
      });
    };

    const declaredEngine = manifest?.render?.engine || manifest?.stages?.render?.engine;
    if (declaredEngine !== 'CinematicEpisode') {
      fail(`MANIFEST_DONE_ENGINE_MISMATCH: run concluído declara engine '${declaredEngine || 'EMPTY'}', esperado 'CinematicEpisode'.`);
    }
    if (String(manifest?.stages?.visuals?.status || '').toUpperCase() !== 'DONE') {
      fail('MANIFEST_DONE_VISUALS_NOT_APPROVED: run concluído exige etapa visuals com status DONE.');
    }
    if (manifest?.fireflyFailed === true) {
      fail('MANIFEST_DONE_WITH_PROVIDER_FAILURE: run concluído ainda registra falha do Firefly.');
    }
    if (!fs.existsSync(finalMasterPath) || fs.statSync(finalMasterPath).size < 1024 * 1024) {
      fail('MANIFEST_DONE_MASTER_INVALID: final_master.mp4 ausente ou pequeno demais.', finalMasterPath);
      return failures;
    }
    if (!fs.existsSync(renderManifestPath)) {
      fail('MANIFEST_DONE_RENDER_EVIDENCE_MISSING: render_manifest.json ausente.');
      return failures;
    }

    try {
      const renderManifest = JSON.parse(fs.readFileSync(renderManifestPath, 'utf8'));
      if (
        renderManifest.compositor !== 'CinematicEpisode' ||
        renderManifest.renderEngine !== 'remotion' ||
        !renderManifest.compositionId
      ) {
        fail('MANIFEST_DONE_RENDER_EVIDENCE_INVALID: compositor, renderEngine ou compositionId incompatível.');
      }
      const actualSha = crypto.createHash('sha256').update(fs.readFileSync(finalMasterPath)).digest('hex');
      if (!renderManifest.output?.sha256 || renderManifest.output.sha256 !== actualSha) {
        fail('MANIFEST_DONE_MASTER_SHA_MISMATCH: hash do master não confere com a evidência do render.', finalMasterPath);
      }
      const probe = this.probeMedia(finalMasterPath);
      if (!probe.valid || probe.codec !== 'h264' || probe.width !== 1920 || probe.height !== 1080) {
        fail(`MANIFEST_DONE_MASTER_MEDIA_INVALID: ${JSON.stringify(probe)}`, finalMasterPath);
      }
      const frozenRatio = this.calculateFrozenRatio(finalMasterPath, probe.duration);
      if (frozenRatio >= 0.85) {
        fail(`MANIFEST_DONE_MASTER_STATIC: ${(frozenRatio * 100).toFixed(1)}% do master está congelado.`, finalMasterPath);
      }
    } catch (error: any) {
      fail(`MANIFEST_DONE_RENDER_EVIDENCE_CORRUPTED: ${error.message}`);
    }

    return failures;
  }

  /**
   * Executa a auditoria completa e determinística de contrato de uma run
   */
  public static auditRun(options: RunContractValidationOptions): RunValidationReport {
    const runsDir = options.runsDir || path.join(process.cwd(), 'runs');
    const publicDir = options.publicDir || path.join(process.cwd(), 'public');
    const runDir = path.join(runsDir, options.runId);
    const scope = options.stageScope || 'PRE_RENDER';
    const tolerance = options.allowedTimingDeltaSeconds || this.DEFAULT_TIMING_TOLERANCE;

    const failures: BeatValidationFailure[] = [];

    if (!fs.existsSync(runDir)) {
      failures.push({
        sceneId: 'ROOT',
        shotId: 'RUN_DIR',
        index: 0,
        assetType: 'TIMING',
        expectedPath: runDir,
        reason: `RUN_DIRECTORY_MISSING: O diretório da run '${runDir}' não existe no disco.`
      });
      return {
        runId: options.runId,
        totalScenesExpected: 0,
        validStartFrames: 0,
        validVideoTakes: 0,
        validDossierVisuals: 0,
        validAudioClips: 0,
        narrationDurationSeconds: 0,
        timelineDurationSeconds: 0,
        timingDeltaSeconds: 0,
        packagingValid: false,
        degradedScenes: [],
        failures,
        passed: false
      };
    }

    // Resolução antecipada do Contrato de Episódio (EpisodeContract)
    let contract: EpisodeContract | undefined = options.contract;
    if (!contract && options.contractPath) {
      try {
        contract = parseEpisodeContract(options.contractPath);
      } catch (err: any) {
        failures.push({
          sceneId: 'ROOT',
          shotId: 'CONTRACT_PARSE',
          index: 0,
          assetType: 'TIMING',
          expectedPath: options.contractPath,
          reason: err.message
        });
      }
    }

    if (!contract) {
      // Auto-descoberta de contratos de episódio em locais canônicos
      const candidatePaths = [
        path.join(runDir, 'episode.contract.json'),
        path.join(runDir, 'episode.json'),
        path.join(process.cwd(), 'contracts', 'episodes', `${options.runId}.episode.json`),
        path.join(process.cwd(), 'contracts', 'episodes', `${options.runId.toLowerCase()}.episode.json`)
      ];
      if (options.runId.includes('GASOLINA')) {
        candidatePaths.push(path.join(process.cwd(), 'contracts', 'episodes', 'gasolina-adulterada.episode.json'));
      }

      const foundContractPath = candidatePaths.find((p) => fs.existsSync(p));
      if (foundContractPath) {
        try {
          contract = parseEpisodeContract(foundContractPath);
        } catch (err: any) {
          failures.push({
            sceneId: 'ROOT',
            shotId: 'CONTRACT_PARSE',
            index: 0,
            assetType: 'TIMING',
            expectedPath: foundContractPath,
            reason: err.message
          });
        }
      }
    }

    const editPackagePath = path.join(runDir, 'editorial', 'execution', 'documentary-edit-package.json');
    const fireflyGuideCandidates = [
      path.join(runDir, 'firefly-production-guide.json'),
      path.join(runDir, 'firefly', 'firefly-production-guide.json'),
    ];
    const fireflyGuidePath = fireflyGuideCandidates.find((candidate) => fs.existsSync(candidate));

    interface SceneItem {
      sceneId: string;
      shotId: string;
      visualSubject?: string;
      mediaFile?: string;
      takeType?: string;
      visualMode?: string;
      category?: string;
      required_category?: string;
      take_type?: string;
      component?: string;
    }

    let scenes: SceneItem[] = [];

    const candidatePackagePaths = [
      editPackagePath,
      path.join(runDir, 'edit_package.json'),
      path.join(runDir, 'editorial', 'execution', 'edit_package.json'),
    ];
    const foundPkgPath = candidatePackagePaths.find(p => fs.existsSync(p));

    if (foundPkgPath) {
      try {
        const pkg = JSON.parse(fs.readFileSync(foundPkgPath, 'utf8'));
        scenes = pkg.scenes || [];
      } catch (err: any) {
        failures.push({
          sceneId: 'ROOT',
          shotId: 'EDIT_PACKAGE',
          index: 0,
          assetType: 'TIMING',
          expectedPath: foundPkgPath,
          reason: `EDIT_PACKAGE_CORRUPTED: ${err.message}`
        });
      }
    } else if (fireflyGuidePath && fs.existsSync(fireflyGuidePath)) {
      try {
        const guide = JSON.parse(fs.readFileSync(fireflyGuidePath, 'utf8'));
        scenes = (guide.items || []).map((item: any) => {
          const match = item.name.match(/SC_\d+/);
          const scId = match ? match[0] : item.name;
          return { sceneId: scId, shotId: item.name };
        });
      } catch (err: any) {
        failures.push({
          sceneId: 'ROOT',
          shotId: 'FIREFLY_GUIDE',
          index: 0,
          assetType: 'TIMING',
          expectedPath: fireflyGuidePath,
          reason: `FIREFLY_GUIDE_CORRUPTED: ${err.message}`
        });
      }
    } else {
      failures.push({
        sceneId: 'ROOT',
        shotId: 'SCENE_PLAN',
        index: 0,
        assetType: 'TIMING',
        expectedPath: editPackagePath,
        reason: 'SCENE_PLAN_NOT_FOUND: Nenhum plano de cena (documentary-edit-package.json ou firefly-production-guide.json) encontrado.'
      });
    }

    let validStartFrames = 0;
    let validVideoTakes = 0;
    let validDossierVisuals = 0;

    const contractMap = new Map<string, SceneVisualContract>();
    if (options.sceneContracts && options.sceneContracts.length > 0) {
      options.sceneContracts.forEach(sc => contractMap.set(sc.sceneId, sc));
    } else if (contract) {
      const scenesJsonPath = path.join(process.cwd(), 'contracts', 'episodes', `${contract.episodeId}.scenes.json`);
      if (fs.existsSync(scenesJsonPath)) {
        try {
          const rawScenes = JSON.parse(fs.readFileSync(scenesJsonPath, 'utf8'));
          if (Array.isArray(rawScenes)) {
            rawScenes.forEach((rawSc: any) => {
              if (rawSc.sceneId) contractMap.set(rawSc.sceneId, rawSc);
            });
          }
        } catch {}
      }
    }

    let previousAssetKey: string | null = null;
    const assetUsageMap: Record<string, number> = {};

    for (let i = 0; i < scenes.length; i++) {
      const sc = scenes[i];
      const scId = sc.sceneId;
      const shotId = sc.shotId || `SHOT_${i + 1}`;
      let frameValid = false;

      // 1. UNCONTRACTED_SCENE Check
      if ((contract || options.sceneContracts || contractMap.size > 0) && !contractMap.has(scId)) {
        failures.push({
          sceneId: scId,
          shotId,
          index: i + 1,
          assetType: 'VIDEO_TAKE',
          expectedPath: editPackagePath,
          reason: `UNCONTRACTED_SCENE: Cena '${scId}' não possui SceneVisualContract registrado.`
        });
      }

      const runFramePath = path.join(runDir, 'editorial', 'execution', 'scenes', scId, 'start_frame.png');
      const legacyRunFramePath = path.join(runDir, 'editorial', 'execution', 'scenes', scId, 'firefly_start_frame.png');
      const pubRunFramePath = path.join(publicDir, 'editorial', 'execution', options.runId, 'scenes', scId, 'firefly_start_frame.png');
      const pubDirectFramePath = path.join(publicDir, 'editorial', 'execution', scId, 'firefly_start_frame.png');
      const episodeFramePath = path.join(publicDir, 'episodes', contract?.episodeId || options.runId, 'images', `${scId}.png`);

      const resolvedFrame = [runFramePath, episodeFramePath, legacyRunFramePath, pubRunFramePath, pubDirectFramePath].find(p => fs.existsSync(p));

      // QA Visual: GATE_BLACK_FRAME (Verifica se start frame é 100% preto com luminância < 3%)
      if (resolvedFrame) {
        const frameLum = PipelineContractGate.calculateMediaLuminance(resolvedFrame);
        if (frameLum < 0.03) {
          failures.push({
            sceneId: scId,
            shotId,
            index: i + 1,
            assetType: 'START_FRAME',
            expectedPath: resolvedFrame,
            reason: `GATE_BLACK_FRAME: Cena '${scId}' possui luminância média de ${(frameLum * 100).toFixed(2)}% (< 3.0%), caracterizando frame 100% preto não intencional.`
          });
        }
      }

      if (!resolvedFrame) {
        failures.push({
          sceneId: scId,
          shotId,
          index: i + 1,
          assetType: 'START_FRAME',
          expectedPath: runFramePath,
          reason: 'START_FRAME_FILE_MISSING: O arquivo de imagem start frame não existe no disco.'
        });
      } else {
        const stat = fs.statSync(resolvedFrame);
        if (stat.size < this.MIN_PNG_BYTES) {
          failures.push({
            sceneId: scId,
            shotId,
            index: i + 1,
            assetType: 'START_FRAME',
            expectedPath: resolvedFrame,
            actualSizeBytes: stat.size,
            reason: `START_FRAME_SIZE_TOO_SMALL: Tamanho ${stat.size} bytes é menor que ${this.MIN_PNG_BYTES} bytes.`
          });
        } else if (!this.validateImageHeader(resolvedFrame)) {
          failures.push({
            sceneId: scId,
            shotId,
            index: i + 1,
            assetType: 'START_FRAME',
            expectedPath: resolvedFrame,
            actualSizeBytes: stat.size,
            reason: 'START_FRAME_HEADER_INVALID: Arquivo não possui cabeçalho PNG/JPEG válido.'
          });
        } else {
          const fileBuf = fs.readFileSync(resolvedFrame);
          const sha = crypto.createHash('sha256').update(fileBuf).digest('hex');
          const BANNED_MOCK_HASHES = new Set([
            '5103033456db9783fbf1a19fb093b41d40237fa5e73efb1c09b85c18a2862800',
            'ea34a35c4263675001ff2f58e4695e1e7925e01b38f8303fdf5a7c29beea1941',
            '3a88419cffd524bc15372ca62c3e1e976db553531b26f55463f69f201083bb72',
            '5abcd872d8de4887fc1e2ee0fbfe2fb86c2d1b7a2d4807a16adcefcfa962b1b3',
            '684a9d3964b20a3bc760e48719c8f0ec5d0034a78cb58045958611880d8591ef',
            'c18e13ff38b939fbfebec5df4471f466b0394c8e762955f269aee379c6563606',
            '8b7b7ecf5ea2ca32070e1762c262bf86b24d7ceea3c246f6630f5ba67eb7a66b',
            'd981dcbc6e987178cf7d853e414c27415aece7240c5f21226cb121289196b0bc'
          ]);
          const receiptPath = path.join(path.dirname(resolvedFrame), 'start_frame_receipt.json');
          const imageCatalogPath = path.join(process.cwd(), 'assets', 'image_repository', 'catalog.json');
          let isInCentralCatalog = false;
          if (fs.existsSync(imageCatalogPath)) {
            try {
              const imgCat = JSON.parse(fs.readFileSync(imageCatalogPath, 'utf8'));
              isInCentralCatalog = (imgCat.images || []).some((img: any) => img.sha256 === sha || img.id === `${options.runId}_${scId}`);
            } catch {}
          }

          if (fs.existsSync(receiptPath)) {
            try {
              const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
              if (receipt.sha256 && receipt.sha256 !== sha) {
                failures.push({
                  sceneId: scId,
                  shotId,
                  index: i + 1,
                  assetType: 'START_FRAME',
                  expectedPath: receiptPath,
                  reason: `PROVENANCE_SHA_MISMATCH: O hash da imagem não confere com o recibo de IA oficial (${sha.slice(0, 8)} vs ${receipt.sha256?.slice(0, 8)}).`
                });
              } else if (receipt.sourceSystem === 'remotion_deterministic_fallback' || receipt.sourceSystem === 'procedural_remotion') {
                failures.push({
                  sceneId: scId, shotId, index: i + 1, assetType: 'START_FRAME', expectedPath: receiptPath,
                  reason: 'PROVENANCE_PROCEDURAL_REJECTED: Recibo de fallback Remotion não autentica frame fotográfico de produção.'
                });
              } else if (!['openai_imagegen', 'adobe_firefly', 'firefly', 'bank'].includes(String(receipt.sourceSystem || '').toLowerCase())) {
                failures.push({
                  sceneId: scId, shotId, index: i + 1, assetType: 'START_FRAME', expectedPath: receiptPath,
                  reason: `PROVENANCE_SOURCE_UNAPPROVED: Origem '${receipt.sourceSystem || 'EMPTY'}' não é uma fonte visual aprovada.`
                });
              } else {
                validStartFrames++;
                frameValid = true;
              }
            } catch (err: any) {
              failures.push({
                sceneId: scId,
                shotId,
                index: i + 1,
                assetType: 'START_FRAME',
                expectedPath: receiptPath,
                reason: `PROVENANCE_RECEIPT_CORRUPTED: ${err.message}`
              });
            }
          } else if (isInCentralCatalog) {
            // Imagem validada e autenticada no Banco Central de Imagens
            validStartFrames++;
            frameValid = true;
          } else {
            failures.push({
              sceneId: scId,
              shotId,
              index: i + 1,
              assetType: 'START_FRAME',
              expectedPath: receiptPath,
              actualSizeBytes: stat.size,
              reason: 'UNVERIFIED_PROVENANCE_MISSING_RECEIPT: O frame não possui comprovante start_frame_receipt.json nem registro no Banco Central de Imagens.'
            });
          }
        }
      }

      const runVideoPath = path.join(runDir, 'editorial', 'execution', 'scenes', scId, 'firefly_take.mp4');
      const pubRunVideoPath = path.join(publicDir, 'editorial', 'execution', options.runId, 'scenes', scId, 'firefly_take.mp4');
      const pubDirectVideoPath = path.join(publicDir, 'editorial', 'execution', scId, 'firefly_take.mp4');
      const episodeVideoPath = sc.mediaFile && /\.mp4$/i.test(sc.mediaFile) && !path.isAbsolute(sc.mediaFile) ? path.join(publicDir, sc.mediaFile) : '';
      const repoVideoPath = (sc as any).videoFilename ? path.join(process.cwd(), 'assets', 'video_repository', (sc as any).videoFilename) : '';
      const resolvedVideo = [episodeVideoPath, runVideoPath, pubRunVideoPath, pubDirectVideoPath, repoVideoPath].filter(Boolean).find(p => fs.existsSync(p));

      const sceneContract = contractMap.get(scId) as any;
      const category = (sc as any).required_category || (sc as any).category || sceneContract?.required_category;
      const isDossierOrMotion = (sc as any).takeType === 'KEYFRAME_DOSSIER' ||
                                (sc as any).take_type === 'KEYFRAME_DOSSIER' ||
                                ['evidence', 'maps', 'reveal'].includes(String(category || '').toLowerCase()) ||
                                ((sc as any).visualMode === 'dossier' && Boolean(resolvedFrame));

      if (isDossierOrMotion && !resolvedVideo) {
        // Um dossiê pode partir de frame autenticado, mas nunca conta como take temporal.
        if (resolvedFrame && frameValid) validDossierVisuals++;
        else failures.push({sceneId: scId, shotId, index: i + 1, assetType: 'VIDEO_TAKE', expectedPath: episodeFramePath, reason: 'DOSSIER_PHYSICAL_FRAME_REQUIRED: Dossiê sem frame fotográfico autenticado.'});
        continue;
      }

      if (!resolvedVideo) {
        failures.push({
          sceneId: scId,
          shotId,
          index: i + 1,
          assetType: 'VIDEO_TAKE',
          expectedPath: pubDirectVideoPath,
          reason: `PENDING_FIREFLY: Cena '${scId}' não possui take de vídeo .mp4 gerado e está pendente de geração no Firefly.`
        });
      } else {
        let videoProvenanceValid = true;
        if (resolvedVideo.includes(path.join('public', 'episodes')) || resolvedVideo.includes(path.join('editorial', 'execution', 'scenes'))) {
          const videoReceiptCandidates = [
            path.join(path.dirname(resolvedVideo), 'firefly_take_receipt.json'),
            path.join(runDir, 'editorial', 'execution', 'scenes', scId, 'firefly_take_receipt.json')
          ];
          const videoReceipt = videoReceiptCandidates.find((candidate) => fs.existsSync(candidate)) || videoReceiptCandidates[0];
          if (!fs.existsSync(videoReceipt)) {
            videoProvenanceValid = false;
            failures.push({sceneId: scId, shotId, index: i + 1, assetType: 'VIDEO_TAKE', expectedPath: videoReceipt, reason: 'VIDEO_PROVENANCE_RECEIPT_MISSING: Todo take de produção deve informar a origem e o hash do MP4.'});
          } else {
            try {
              const receipt = JSON.parse(fs.readFileSync(videoReceipt, 'utf8'));
              const sha = crypto.createHash('sha256').update(fs.readFileSync(resolvedVideo)).digest('hex');
              const sourceSystem = String(receipt.sourceSystem || '').toLowerCase();
              if (sourceSystem === 'openai_imagegen_motion_derivative' || sourceSystem.includes('motion_derivative')) {
                videoProvenanceValid = false;
                failures.push({sceneId: scId, shotId, index: i + 1, assetType: 'VIDEO_TAKE', expectedPath: videoReceipt, reason: 'VIDEO_PROVENANCE_DERIVATIVE_FORBIDDEN: animação derivada de imagem não é um take temporal de produção.'});
              } else if (receipt.sha256 !== sha || !['adobe_firefly', 'firefly', 'bank'].includes(sourceSystem)) {
                videoProvenanceValid = false;
                failures.push({sceneId: scId, shotId, index: i + 1, assetType: 'VIDEO_TAKE', expectedPath: videoReceipt, reason: 'VIDEO_PROVENANCE_INVALID: origem ou hash do MP4 não confere.'});
              }
            } catch (error: any) {
              videoProvenanceValid = false;
              failures.push({sceneId: scId, shotId, index: i + 1, assetType: 'VIDEO_TAKE', expectedPath: videoReceipt, reason: `VIDEO_PROVENANCE_CORRUPTED:${error.message}`});
            }
          }
        }
        const lowerPath = resolvedVideo.toLowerCase();
        if (lowerPath.includes('fallback') || lowerPath.includes('placeholder') || lowerPath.includes('mock')) {
          failures.push({
            sceneId: scId,
            shotId,
            index: i + 1,
            assetType: 'VIDEO_TAKE',
            expectedPath: resolvedVideo,
            reason: `FALLBACK_IN_MASTER: Cena '${scId}' utilizou fallback procedural ou mock no master final.`
          });
        }

        const stat = fs.statSync(resolvedVideo);
        if (stat.size < this.MIN_MP4_BYTES) {
          failures.push({
            sceneId: scId,
            shotId,
            index: i + 1,
            assetType: 'VIDEO_TAKE',
            expectedPath: resolvedVideo,
            actualSizeBytes: stat.size,
            reason: `VIDEO_TAKE_SIZE_TOO_SMALL: Tamanho ${stat.size} bytes é menor que ${this.MIN_MP4_BYTES} bytes.`
          });
        } else {
          const probe = this.probeMedia(resolvedVideo);
          if (!probe.valid || probe.duration < 1.0) {
            failures.push({
              sceneId: scId,
              shotId,
              index: i + 1,
              assetType: 'VIDEO_TAKE',
              expectedPath: resolvedVideo,
              actualDurationSeconds: probe.duration,
              reason: `VIDEO_TAKE_CORRUPTED_OR_ZERO_DURATION: ffprobe retornou duração inválida (${probe.duration}s, codec: ${probe.codec}).`
            });
          } else {
            // QA Visual: GATE_BLACK_FRAME no vídeo (ao 1.0s)
            const videoLum = PipelineContractGate.calculateMediaLuminance(resolvedVideo, 1.0);
            const frozenRatio = PipelineContractGate.calculateFrozenRatio(resolvedVideo, probe.duration);
            if (videoLum < 0.03) {
              failures.push({
                sceneId: scId,
                shotId,
                index: i + 1,
                assetType: 'VIDEO_TAKE',
                expectedPath: resolvedVideo,
                reason: `GATE_BLACK_FRAME: Cena '${scId}' possui take de vídeo com luminância média de ${(videoLum * 100).toFixed(2)}% (< 3.0%), caracterizando frame 100% preto não intencional.`
              });
            }
            if (frozenRatio >= 0.85) {
              failures.push({
                sceneId: scId,
                shotId,
                index: i + 1,
                assetType: 'VIDEO_TAKE',
                expectedPath: resolvedVideo,
                actualDurationSeconds: probe.duration,
                reason: `GATE_STATIC_VIDEO: ${(frozenRatio * 100).toFixed(1)}% do take está congelado. PNG em loop não é vídeo de produção.`
              });
            }
            if (videoLum >= 0.03 && frozenRatio < 0.85 && videoProvenanceValid) validVideoTakes++;
          }
        }
      }

      // Deduplicação de Assets Adjacentes: GATE_DUPLICATE_ASSET_ADJACENT
      const currentAssetKey = resolvedVideo || (sc as any).videoFilename || (sc as any).mediaFile || (resolvedFrame ? path.basename(resolvedFrame) : null);
      if (currentAssetKey) {
        if (i > 0 && previousAssetKey && currentAssetKey === previousAssetKey) {
          failures.push({
            sceneId: scId,
            shotId,
            index: i + 1,
            assetType: 'VIDEO_TAKE',
            expectedPath: currentAssetKey,
            reason: `GATE_DUPLICATE_ASSET_ADJACENT: Cenas consecutivas '${scenes[i - 1].sceneId}' e '${scId}' utilizam o mesmo asset '${path.basename(currentAssetKey)}'.`
          });
        }
        previousAssetKey = currentAssetKey;
        assetUsageMap[currentAssetKey] = (assetUsageMap[currentAssetKey] || 0) + 1;
      }
    }

    const narrationPath1 = path.join(runDir, 'postproduction', 'narration.mp3');
    const narrationPath2 = path.join(runDir, 'narration.mp3');
    const narrationPath3 = path.join(publicDir, 'editorial', 'execution', options.runId, 'narration.mp3');
    const narrationPath4 = path.join(runDir, 'audio', 'narration', 'narration.mp3');
    const narrationPath5 = path.join(publicDir, 'episodes', contract?.episodeId || options.runId, 'audio', 'narration', 'narration.mp3');
    const narrationSceneDir = path.join(runDir, 'audio', 'narration');

    let resolvedNarration = [narrationPath4, narrationPath5, narrationPath1, narrationPath2, narrationPath3].find(p => fs.existsSync(p));

    let narrationDurationSeconds = 0;
    let timelineDurationSeconds = 0;
    let narrationSceneCount = 0;
    let narrationSceneDuration = 0;

    if (fs.existsSync(narrationSceneDir)) {
      const files = fs.readdirSync(narrationSceneDir).filter(f => f.endsWith('.mp3'));
      narrationSceneCount = files.length;
      for (const f of files) {
        const fullP = path.join(narrationSceneDir, f);
        const st = fs.statSync(fullP);
        if (st.size > 0) {
          const pr = this.probeMedia(fullP);
          narrationSceneDuration += (pr.duration > 0 ? pr.duration : 12.0);
        }
      }
    }

    if (!resolvedNarration && narrationSceneCount === 0) {
      failures.push({
        sceneId: 'GLOBAL',
        shotId: 'AUDIO_NARRATION',
        index: 0,
        assetType: 'VOICEOVER',
        expectedPath: narrationPath1,
        reason: 'NARRATION_AUDIO_MISSING: O arquivo de narração narration.mp3 não foi encontrado.'
      });
    } else if (resolvedNarration) {
      const stat = fs.statSync(resolvedNarration);
      if (stat.size < this.MIN_AUDIO_BYTES) {
        failures.push({
          sceneId: 'GLOBAL',
          shotId: 'AUDIO_NARRATION',
          index: 0,
          assetType: 'VOICEOVER',
          expectedPath: resolvedNarration,
          actualSizeBytes: stat.size,
          reason: `NARRATION_AUDIO_TOO_SMALL: Tamanho ${stat.size} bytes é menor que ${this.MIN_AUDIO_BYTES} bytes.`
        });
      } else {
        const probe = this.probeMedia(resolvedNarration);
        narrationDurationSeconds = probe.duration;
      }
    } else if (narrationSceneCount > 0) {
      narrationDurationSeconds = narrationSceneDuration;
    }

    const sceneTimingsPath = path.join(runDir, 'postproduction', 'scene_timings.json');
    if (fs.existsSync(sceneTimingsPath)) {
      try {
        const timings = JSON.parse(fs.readFileSync(sceneTimingsPath, 'utf8'));
        const sceneList = Array.isArray(timings) ? timings : (timings.scenes || []);
        if (sceneList.length > 0) {
          const last = sceneList[sceneList.length - 1];
          const totalFrames = timings.totalDurationFrames || ((last.startFrame || 0) + (last.durationFrames || 0));
          timelineDurationSeconds = timings.totalDurationSeconds || (totalFrames / 30);
        }
      } catch {}
    }

    const timingDelta = Math.abs(narrationDurationSeconds - timelineDurationSeconds);
    if (narrationDurationSeconds > 0 && timelineDurationSeconds > 0 && timingDelta > tolerance) {
      failures.push({
        sceneId: 'GLOBAL',
        shotId: 'TIMELINE_SYNC',
        index: 0,
        assetType: 'TIMING',
        expectedPath: sceneTimingsPath,
        actualDurationSeconds: timingDelta,
        reason: `TIMELINE_AUDIO_DESYNC: Descompasso de ${timingDelta.toFixed(2)}s entre timeline (${timelineDurationSeconds.toFixed(2)}s) e narração (${narrationDurationSeconds.toFixed(2)}s), tolerância é ${tolerance}s.`
      });
    }

    // DURATION GATE (Tolerância estrita de 15% em relação ao briefing/seed)
    const actualDuration = narrationDurationSeconds > 0 ? narrationDurationSeconds : timelineDurationSeconds;
    if (options.targetDurationMinutes && options.targetDurationMinutes > 0 && actualDuration > 0) {
      const expectedSeconds = options.targetDurationMinutes * 60;
      const durationDeltaPercent = Math.abs(actualDuration - expectedSeconds) / expectedSeconds;
      if (durationDeltaPercent > 0.15) {
        failures.push({
          sceneId: 'GLOBAL',
          shotId: 'EPISODE_TARGET_DURATION',
          index: 0,
          assetType: 'TIMING',
          expectedPath: editPackagePath,
          actualDurationSeconds: actualDuration,
          reason: `DURATION_TARGET_MISMATCH: Duração real (${actualDuration.toFixed(1)}s) difere em ${(durationDeltaPercent * 100).toFixed(1)}% do target do seed/briefing (${expectedSeconds.toFixed(1)}s / ${options.targetDurationMinutes} min). Limite de tolerância é 15%.`
        });
      }
    }

    // Detecção e Listagem de Cenas Degradadas / Fallback
    const degradedScenes: Array<{ sceneId: string; reason?: string }> = [];
    for (const sc of scenes) {
      const scAny = sc as any;
      if (
        scAny.isFallback ||
        scAny.degraded ||
        scAny.isDegraded ||
        scAny.visualMode === 'fallback' ||
        scAny.takeType === 'FALLBACK'
      ) {
        degradedScenes.push({
          sceneId: sc.sceneId,
          reason: scAny.fallbackReason || scAny.degradedReason || 'Cena marcada como fallback/degradada'
        });
      }
    }

    const allowDegraded = options.allowDegraded || process.env.ALLOW_DEGRADED === 'true' || process.argv.includes('--allow-degraded');
    const runManifestPath = path.join(runDir, 'run-manifest.json');
    if (fs.existsSync(runManifestPath)) {
      try {
        const runManifest = JSON.parse(fs.readFileSync(runManifestPath, 'utf8'));
        const visualStage = runManifest?.stages?.visuals || runManifest?.stages?.VISUALS;
        if (String(visualStage?.status || '').toUpperCase() === 'DEGRADED') {
          degradedScenes.push({
            sceneId: 'GLOBAL',
            reason: visualStage.fallbackReason || visualStage.reason || 'Manifesto marcou a etapa visual como DEGRADED'
          });
        }
        if (runManifest?.report?.fireflyFailed === true || runManifest?.fireflyFailed === true) {
          degradedScenes.push({sceneId: 'FIREFLY', reason: 'Manifesto registra falha do Firefly'});
        }
      } catch {
        degradedScenes.push({sceneId: 'GLOBAL', reason: 'run-manifest.json inválido'});
      }
    }
    if (degradedScenes.length > 0 && !allowDegraded) {
      failures.push({
        sceneId: 'GLOBAL',
        shotId: 'DEGRADED_SCENES',
        index: 0,
        assetType: 'VIDEO_TAKE',
        expectedPath: path.join(runDir, 'editorial', 'execution', 'scenes'),
        reason: `RUN_HAS_DEGRADED_SCENES: ${degradedScenes.length} cenas degradadas encontradas (${degradedScenes.map(d => d.sceneId).join(', ')}). Exige a flag explícita --allow-degraded para aprovação.`
      });
    }

    let packagingValid = true;
    if (scope === 'FULL_PACKAGE') {
      const requiredArtifacts = [
        ...HSL_CANONICAL_THUMBNAILS.map((t) => path.join(runDir, 'postproduction', 'thumbnails', t.filename)),
        path.join(runDir, 'postproduction', 'description.txt'),
        path.join(runDir, 'postproduction', 'youtube-metadata.json')
      ];

      for (const artifact of requiredArtifacts) {
        if (!fs.existsSync(artifact) || fs.statSync(artifact).size < HSL_BYTE_CONSTRAINTS.MIN_TEXT_METADATA_BYTES) {
          packagingValid = false;
          failures.push({
            sceneId: 'PACKAGING',
            shotId: path.basename(artifact),
            index: 0,
            assetType: 'PACKAGING',
            expectedPath: artifact,
            reason: `PACKAGING_ARTIFACT_MISSING_OR_EMPTY: O artefato '${path.basename(artifact)}' está ausente ou vazio.`
          });
        }
      }
    }

    // Validações de nível de EPISÓDIO a partir do Contrato Zod
    if (contract) {
      // 1. Duração mínima: somaDuraçõesReais >= targetDurationSeconds * minDurationRatio
      const minRequiredDuration = contract.targetDurationSeconds * contract.minDurationRatio;
      if (actualDuration < minRequiredDuration) {
        failures.push({
          sceneId: 'GLOBAL',
          shotId: 'EPISODE_DURATION',
          index: 0,
          assetType: 'TIMING',
          expectedPath: resolvedNarration || path.join(runDir, 'postproduction', 'narration.mp3'),
          actualDurationSeconds: actualDuration,
          reason: `EPISODE_TOO_SHORT: ${actualDuration.toFixed(0)}s < ${minRequiredDuration.toFixed(0)}s (meta ${contract.targetDurationSeconds}s)`
        });
      }

      // 2. Contagem mínima de cenas: numeroDeCenas >= minScenes
      if (scenes.length < contract.minScenes) {
        failures.push({
          sceneId: 'GLOBAL',
          shotId: 'SCENE_COUNT',
          index: 0,
          assetType: 'TIMING',
          expectedPath: editPackagePath,
          reason: `TOO_FEW_SCENES: ${scenes.length} cenas encontradas, mínimo exigido pelo contrato é ${contract.minScenes}.`
        });
      }

      // 3. Presença obrigatória de artefatos para cada stage em requiredStages
      const manifestPath = path.join(runDir, 'run-manifest.json');
      let manifestData: any = null;
      if (fs.existsSync(manifestPath)) {
        try {
          manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        } catch {}
      }

      for (const stage of contract.requiredStages) {
        switch (stage) {
          case 'narration': {
            const hasFullNarration = resolvedNarration && narrationDurationSeconds > 0;
            const hasAllSceneNarrations = narrationSceneCount >= contract.minScenes && narrationSceneDuration >= (contract.targetDurationSeconds * contract.minDurationRatio);

            if (!hasFullNarration && !hasAllSceneNarrations) {
              if (narrationSceneCount > 0 && narrationSceneCount < contract.minScenes) {
                failures.push({
                  sceneId: 'STAGE',
                  shotId: 'NARRATION',
                  index: 0,
                  assetType: 'VOICEOVER',
                  expectedPath: narrationSceneDir,
                  reason: `NARRATION_INCOMPLETE: ${narrationSceneCount}/${contract.minScenes}`
                });
              }
              failures.push({
                sceneId: 'STAGE',
                shotId: 'NARRATION',
                index: 0,
                assetType: 'VOICEOVER',
                expectedPath: path.join(runDir, 'postproduction', 'narration.mp3'),
                reason: 'MISSING_STAGE: narration - Trilha de narração ausente ou incompleta.'
              });
            }
            break;
          }
          case 'visuals': {
            const expectedDossiers = scenes.filter((scene) => {
              const contractScene = contractMap.get(scene.sceneId) as any;
              const sceneCategory = (scene as any).required_category || (scene as any).category || contractScene?.required_category;
              return (scene as any).takeType === 'KEYFRAME_DOSSIER' ||
                (scene as any).take_type === 'KEYFRAME_DOSSIER' ||
                (scene as any).visualMode === 'dossier' ||
                contractScene?.take_type === 'KEYFRAME_DOSSIER' ||
                contractScene?.visualMode === 'dossier';
            }).length;
            const expectedTemporalTakes = scenes.length - expectedDossiers;
            if (
              scenes.length === 0 ||
              validStartFrames < scenes.length ||
              validVideoTakes < expectedTemporalTakes ||
              validDossierVisuals < expectedDossiers
            ) {
              failures.push({
                sceneId: 'STAGE',
                shotId: 'VISUALS',
                index: 0,
                assetType: 'VIDEO_TAKE',
                expectedPath: path.join(runDir, 'editorial', 'execution', 'scenes'),
                reason: `MISSING_STAGE: visuals - Assets incompletos (${validStartFrames}/${scenes.length} frames autenticados, ${validVideoTakes}/${expectedTemporalTakes} takes temporais, ${validDossierVisuals}/${expectedDossiers} dossiês).`
              });
            }
            break;
          }
          case 'sfx': {
            const sfxSceneDir = path.join(runDir, 'audio', 'sfx');
            let sfxSceneCount = 0;
            if (fs.existsSync(sfxSceneDir)) {
              const files = fs.readdirSync(sfxSceneDir).filter(f => f.endsWith('.wav') || f.endsWith('.mp3'));
              for (const f of files) {
                if (fs.statSync(path.join(sfxSceneDir, f)).size > 100) {
                  sfxSceneCount++;
                }
              }
            }

            const sfxCandidates = [
              path.join(runDir, 'audio', 'sfx', 'bed.wav'),
              path.join(runDir, 'postproduction', 'soundfx-bed.wav'),
              path.join(runDir, 'postproduction', 'soundfx-bed.mp3'),
              path.join(runDir, 'postproduction', 'sfx_track.wav'),
              path.join(runDir, 'postproduction', 'sfx_track.mp3'),
              path.join(runDir, 'postproduction', 'sfx.wav'),
              path.join(runDir, 'postproduction', 'sfx.mp3'),
              path.join(publicDir, 'hsl-runs', options.runId, 'soundfx-bed.wav')
            ];
            const sfxFile = sfxCandidates.find((p) => fs.existsSync(p) && fs.statSync(p).size > 100);
            let sfxDuration = 0;
            if (sfxFile) {
              const probe = this.probeMedia(sfxFile);
              sfxDuration = probe.duration;
            }
            const manifestHasSfx =
              manifestData?.assetInventory &&
              Object.keys(manifestData.assetInventory).some(
                (k) => (k.includes('sfx') || k.includes('soundfx')) && manifestData.assetInventory[k].sizeBytes > 100
              );

            const hasAllSceneSfx = contract && sfxSceneCount >= contract.minScenes;
            const hasSingleSfx = (sfxFile && sfxDuration > 0) || manifestHasSfx;

            if (!hasSingleSfx && !hasAllSceneSfx) {
              if (contract && sfxSceneCount > 0 && sfxSceneCount < contract.minScenes) {
                failures.push({
                  sceneId: 'STAGE',
                  shotId: 'SFX',
                  index: 0,
                  assetType: 'VOICEOVER',
                  expectedPath: sfxSceneDir,
                  reason: `SFX_PLAN_INCOMPLETE: ${sfxSceneCount}/${contract.minScenes} - Stems de SFX parciais.`
                });
              }
              failures.push({
                sceneId: 'STAGE',
                shotId: 'SFX',
                index: 0,
                assetType: 'VOICEOVER',
                expectedPath: path.join(runDir, 'audio', 'sfx'),
                reason: 'MISSING_STAGE: sfx - Trilha ou stems de SFX ausentes ou vazios.'
              });
            }
            break;
          }
          case 'music': {
            const musicCandidates = [
              path.join(runDir, 'audio', 'music', 'bed.wav'),
              path.join(runDir, 'audio', 'music', 'bed.mp3'),
              path.join(runDir, 'postproduction', 'music_track.mp3'),
              path.join(runDir, 'postproduction', 'music_track.wav'),
              path.join(runDir, 'postproduction', 'music.mp3'),
              path.join(runDir, 'postproduction', 'music.wav'),
              path.join(runDir, 'postproduction', 'soundtrack.mp3'),
              path.join(publicDir, 'hsl-runs', options.runId, 'music.mp3')
            ];
            const musicFile = musicCandidates.find((p) => fs.existsSync(p) && fs.statSync(p).size > 100);
            let musicDuration = 0;
            if (musicFile) {
              const probe = this.probeMedia(musicFile);
              musicDuration = probe.duration;
            }
            const manifestHasMusic =
              manifestData?.assetInventory &&
              Object.keys(manifestData.assetInventory).some(
                (k) => (k.includes('music') || k.includes('soundtrack')) && manifestData.assetInventory[k].sizeBytes > 100
              );

            if ((!musicFile || musicDuration <= 0) && !manifestHasMusic) {
              failures.push({
                sceneId: 'STAGE',
                shotId: 'MUSIC',
                index: 0,
                assetType: 'VOICEOVER',
                expectedPath: path.join(runDir, 'audio', 'music', 'bed.wav'),
                reason: 'MISSING_STAGE: music - Trilha musical ausente ou com duração 0s.'
              });
            }
            break;
          }
          case 'mix': {
            const mixCandidates = [
              path.join(runDir, 'audio', 'mix', 'mix.wav'),
              path.join(runDir, 'audio', 'mix', 'mix.mp3'),
              path.join(runDir, 'postproduction', 'mixed_audio.wav'),
              path.join(runDir, 'postproduction', 'mixed_audio.mp3'),
              path.join(runDir, 'postproduction', 'master_audio.mp3'),
              path.join(runDir, 'final_master.mp4')
            ];
            const mixFile = mixCandidates.find((p) => fs.existsSync(p) && fs.statSync(p).size > 100);
            const manifestHasMix = manifestData?.stages?.FFMPEG_MUX?.status === 'DONE';

            if (!mixFile && !manifestHasMix) {
              failures.push({
                sceneId: 'STAGE',
                shotId: 'MIX',
                index: 0,
                assetType: 'VOICEOVER',
                expectedPath: path.join(runDir, 'audio', 'mix', 'mix.wav'),
                reason: 'MISSING_STAGE: mix - Áudio mixado final ausente ou vazio.'
              });
            }
            break;
          }
          case 'thumbnail': {
            if (!packagingValid && scope === 'FULL_PACKAGE') {
              failures.push({
                sceneId: 'STAGE',
                shotId: 'THUMBNAIL',
                index: 0,
                assetType: 'PACKAGING',
                expectedPath: path.join(runDir, 'postproduction', 'thumbnails'),
                reason: 'MISSING_STAGE: thumbnail - Pacote de thumbnails 4K ausente ou incompleto.'
              });
            }
            break;
          }
          case 'render': {
            const renderFile = path.join(runDir, 'final_master.mp4');
            const isRendered = fs.existsSync(renderFile) && fs.statSync(renderFile).size > 1000;
            if (!isRendered && scope === 'FULL_PACKAGE') {
              failures.push({
                sceneId: 'STAGE',
                shotId: 'RENDER',
                index: 0,
                assetType: 'VIDEO_TAKE',
                expectedPath: renderFile,
                reason: 'MISSING_STAGE: render - Vídeo final final_master.mp4 não renderizado.'
              });
            }
            break;
          }
          case 'cinematic_grade': {
            const renderManifestPath = path.join(runDir, 'render_manifest.json');
            let hasCinematicGrade = false;

            if (fs.existsSync(renderManifestPath)) {
              try {
                const renderManifest = JSON.parse(fs.readFileSync(renderManifestPath, 'utf8'));
                if (renderManifest.compositor === 'CinematicEpisode') {
                  hasCinematicGrade = true;
                }
              } catch {}
            }

            if (manifestData?.compositor === 'CinematicEpisode' || manifestData?.cinematicGradeApplied === true) {
              hasCinematicGrade = true;
            }

            if (!hasCinematicGrade && scope === 'FULL_PACKAGE') {
              failures.push({
                sceneId: 'STAGE',
                shotId: 'CINEMATIC_GRADE',
                index: 0,
                assetType: 'VIDEO_TAKE',
                expectedPath: renderManifestPath,
                reason: 'GATE_NOT_CINEMATIC: render_manifest.json ausente ou compositor !== CinematicEpisode'
              });
            }
            break;
          }
        }
      }
    }

    // Auditoria de Conformidade de Timeline Cinematográfico
    const possibleTimelinePaths = [
      path.join(runDir, 'timeline.json'),
      path.join(runDir, 'timeline_contract.json'),
      path.join(runDir, 'dispatch', 'timeline.json')
    ];

    for (const tPath of possibleTimelinePaths) {
      if (fs.existsSync(tPath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(tPath, 'utf8'));
          const result = TimelineContractSchema.safeParse(raw);
          if (!result.success) {
            const firstError = result.error.issues[0]?.message || 'Contrato de timeline inválido';
            failures.push({
              sceneId: 'TIMELINE',
              shotId: 'TIMELINE_CONTRACT',
              index: 0,
              assetType: 'TIMING',
              expectedPath: tPath,
              reason: `GATE_TIMELINE_INVALID: ${firstError}`
            });
          }
        } catch (err: any) {
          failures.push({
            sceneId: 'TIMELINE',
            shotId: 'TIMELINE_PARSE',
            index: 0,
            assetType: 'TIMING',
            expectedPath: tPath,
            reason: `GATE_TIMELINE_INVALID: Falha ao ler timeline JSON (${err.message})`
          });
        }
      }
    }

    const completionManifestPath = path.join(runDir, 'run-manifest.json');
    if (fs.existsSync(completionManifestPath)) {
      try {
        const completionManifest = JSON.parse(fs.readFileSync(completionManifestPath, 'utf8'));
        failures.push(...this.validateCompletedRunEvidence(runDir, completionManifest));
      } catch (error: any) {
        failures.push({
          sceneId: 'GLOBAL',
          shotId: 'RUN_COMPLETION',
          index: 0,
          assetType: 'VIDEO_TAKE',
          expectedPath: completionManifestPath,
          reason: `RUN_MANIFEST_CORRUPTED: ${error.message}`,
        });
      }
    }

    const passed = failures.length === 0;

    return {
      runId: options.runId,
      contract,
      totalScenesExpected: scenes.length,
      validStartFrames,
      validVideoTakes,
      validDossierVisuals,
      validAudioClips: resolvedNarration ? 1 : 0,
      narrationDurationSeconds,
      timelineDurationSeconds,
      timingDeltaSeconds: timingDelta,
      packagingValid,
      degradedScenes,
      failures,
      passed
    };
  }

  /**
   * Auditoria de recuperação: O PipelineContractGate é estritamente um auditor.
   * Regra inviolável: Não fabrica evidências, imagens sintéticas ou takes Ken Burns.
   */
  public static async healRun(options: RunContractValidationOptions): Promise<RunValidationReport> {
    console.log(`[AUDITOR_STRICT] PipelineContractGate é estritamente um auditor de integridade e não fabrica evidências ou takes sintéticos.`);
    const report = this.auditRun(options);
    this.printReport(report);
    return report;
  }

  public static assertPreRenderIntegrity(runId: string, runsDir?: string, publicDir?: string): void {
    const report = this.auditRun({
      runId,
      runsDir,
      publicDir,
      stageScope: 'PRE_RENDER'
    });

    this.printReport(report);

    if (!report.passed) {
      console.error(`\n[FATAL_GATE_ERROR] O Gate Pré-Render BARROU A PRODUÇÃO DA RUN '${runId}'.`);
      console.error(`Total de violações contratuais encontradas: ${report.failures.length}.`);
      console.error(`O Remotion NÃO iniciará até que 100% dos assets e durações estejam íntegros.\n`);
      process.exit(1);
    }
  }

  public static printReport(report: RunValidationReport): void {
    console.log(`\n══════════════════════════════════════════════════════════════════════════════════════`);
    console.log(`🛡️ RELATÓRIO DO GATE DETERMINÍSTICO DE CONTRATO // RUN: ${report.runId}`);
    console.log(`══════════════════════════════════════════════════════════════════════════════════════`);
    if (report.contract) {
      console.log(`Contrato de Episódio: ${report.contract.episodeId} ("${report.contract.title}")`);
      const minSec = (report.contract.targetDurationSeconds * report.contract.minDurationRatio).toFixed(0);
      console.log(`Meta Duração:         ${report.contract.targetDurationSeconds}s (Mínimo: ${minSec}s) | Meta Cenas: ${report.contract.minScenes}`);
      console.log(`Etapas Obrigatórias:  ${report.contract.requiredStages.join(', ')}`);
    }
    console.log(`Cenas Esperadas:      ${report.totalScenesExpected}`);
    console.log(`Start Frames Válidos: ${report.validStartFrames} / ${report.totalScenesExpected}`);
    console.log(`Takes Temporais:      ${report.validVideoTakes}`);
    console.log(`Dossiês Visuais:      ${report.validDossierVisuals}`);
    console.log(`Cenas com Visual:     ${report.validVideoTakes + report.validDossierVisuals} / ${report.totalScenesExpected}`);
    console.log(`Narração Duração:     ${report.narrationDurationSeconds.toFixed(2)}s | Timeline: ${report.timelineDurationSeconds.toFixed(2)}s (Delta: ${report.timingDeltaSeconds.toFixed(2)}s)`);
    if (report.degradedScenes && report.degradedScenes.length > 0) {
      console.log(`⚠️ Cenas em Fallback/Degradadas: ${report.degradedScenes.length} cena(s) (${report.degradedScenes.map(d => d.sceneId).join(', ')}) [REPORT ONLY]`);
    }
    console.log(`Resultado do Gate:    ${report.passed ? '✅ APROVADO (100% ÍNTEGRO)' : '❌ REPROVADO (CONTRATO VIOLADO)'}`);
    console.log(`══════════════════════════════════════════════════════════════════════════════════════`);

    if (report.failures.length > 0) {
      console.log(`\n❌ LISTA DE VIOLAÇÕES DETECTADAS (${report.failures.length} falhas):`);
      console.log(`┌─────┬──────────┬────────────────┬────────────────────────────────────────────────────────────────────────┐`);
      console.log(`│ #   │ SCENE ID │ TIPO ASSET     │ MOTIVO DA FALHA / CAMINHO                                              │`);
      console.log(`├─────┼──────────┼────────────────┼────────────────────────────────────────────────────────────────────────┤`);
      report.failures.forEach((f, idx) => {
        const num = String(idx + 1).padEnd(3);
        const sc = f.sceneId.padEnd(8);
        const type = f.assetType.padEnd(14);
        const reason = f.reason.slice(0, 70);
        console.log(`│ ${num} │ ${sc} │ ${type} │ ${reason} │`);
        console.log(`│     │          │                │ ➔ Caminho: ${f.expectedPath.slice(0, 60)} │`);
      });
      console.log(`└─────┴──────────┴────────────────┴────────────────────────────────────────────────────────────────────────┘`);
    }
  }
}
