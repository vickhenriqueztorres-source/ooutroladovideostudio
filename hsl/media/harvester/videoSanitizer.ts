import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { WebFootageSanitizeOptions, WebFootageSanitizeResult } from './webFootageTypes';
import { Logger } from '../../../event-hub/logger';

export class VideoSanitizer {
  /**
   * Baixa um arquivo de vídeo a partir de uma URL e salva no destino local
   */
  public static async downloadVideo(url: string, destPath: string, timeoutMs: number = 60000): Promise<string> {
    const parentDir = path.dirname(destPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'OOutroLado-Bot/1.0 (video-harvester)' }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText} ao baixar ${url}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
      return destPath;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Executa ffprobe para inspecionar trilhas e metadados de vídeo
   */
  public static probeVideo(filePath: string): {
    valid: boolean;
    duration: number;
    width: number;
    height: number;
    fps: number;
    audioTracks: number;
    codec: string;
  } {
    if (!fs.existsSync(filePath)) {
      return { valid: false, duration: 0, width: 0, height: 0, fps: 0, audioTracks: 0, codec: 'missing' };
    }

    try {
      const probe = spawnSync('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate',
        '-of', 'json',
        filePath
      ], { encoding: 'utf8' });

      if (probe.status !== 0) {
        return { valid: false, duration: 0, width: 0, height: 0, fps: 0, audioTracks: 0, codec: 'error' };
      }

      const parsed = JSON.parse(probe.stdout);
      const duration = parseFloat(parsed.format?.duration || '0');
      const streams: any[] = parsed.streams || [];
      const videoStream = streams.find((s) => s.codec_type === 'video');
      const audioStreams = streams.filter((s) => s.codec_type === 'audio');

      let fps = 24;
      if (videoStream?.r_frame_rate) {
        const parts = videoStream.r_frame_rate.split('/');
        if (parts.length === 2 && parseInt(parts[1], 10) > 0) {
          fps = Math.round(parseInt(parts[0], 10) / parseInt(parts[1], 10));
        }
      }

      return {
        valid: duration > 0 && Boolean(videoStream),
        duration,
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        fps,
        audioTracks: audioStreams.length,
        codec: videoStream?.codec_name || 'unknown'
      };
    } catch {
      return { valid: false, duration: 0, width: 0, height: 0, fps: 0, audioTracks: 0, codec: 'exception' };
    }
  }

  /**
   * Executa a higienização com FFmpeg:
   * - ZERO ÁUDIO (-an)
   * - Conformação 1080p 16:9
   * - Conformação 24fps
   * - Trim temporal inteligente
   * - Extração de start frame
   */
  public static sanitize(
    rawVideoPath: string,
    outputVideoPath: string,
    options: WebFootageSanitizeOptions = {}
  ): WebFootageSanitizeResult {
    if (!fs.existsSync(rawVideoPath)) {
      return {
        success: false,
        sanitizedPath: '',
        startFramePath: '',
        durationSeconds: 0,
        width: 0,
        height: 0,
        fps: 0,
        hasAudio: false,
        rawSha256: '',
        sanitizedSha256: '',
        error: `Arquivo bruto não encontrado: ${rawVideoPath}`
      };
    }

    const rawBytes = fs.readFileSync(rawVideoPath);
    const rawSha256 = crypto.createHash('sha256').update(rawBytes).digest('hex');

    const initialProbe = this.probeVideo(rawVideoPath);
    if (!initialProbe.valid) {
      return {
        success: false,
        sanitizedPath: '',
        startFramePath: '',
        durationSeconds: 0,
        width: 0,
        height: 0,
        fps: 0,
        hasAudio: false,
        rawSha256,
        sanitizedSha256: '',
        error: 'Arquivo bruto de vídeo corrompido ou sem fluxo de vídeo válido.'
      };
    }

    const targetWidth = options.targetWidth || 1920;
    const targetHeight = options.targetHeight || 1080;
    const targetFps = options.targetFps || 24;
    const targetDuration = options.targetDurationSeconds;

    const outDir = path.dirname(outputVideoPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Calcula recorte temporal: se o vídeo for longo, recorta trecho central
    let seekArg: string[] = [];
    if (targetDuration && initialProbe.duration > targetDuration + 1.0) {
      const startOffset = Math.max(0, Math.floor((initialProbe.duration - targetDuration) / 2));
      seekArg = ['-ss', String(startOffset), '-t', String(targetDuration)];
    }

    // Filtros de vídeo:
    // 1. Escala e padding para 16:9 exato sem distorção anamórfica
    // 2. Grão fino ou curva sutil Rec.709
    const vfFilters = [
      `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease`,
      `pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black`,
      'format=yuv420p'
    ];

    const ffmpegArgs = [
      '-y',
      ...seekArg,
      '-i', rawVideoPath,
      '-an', // ZERO-AUDIO GUARANTEE (Anti Content ID)
      '-vf', vfFilters.join(','),
      '-r', String(targetFps),
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '19',
      '-movflags', '+faststart',
      outputVideoPath
    ];

    Logger.info('VideoSanitizer', `Executando sanitização FFmpeg para: ${path.basename(outputVideoPath)}`);
    const ffmpegRes = spawnSync('ffmpeg', ffmpegArgs, { encoding: 'utf8' });

    if (ffmpegRes.status !== 0) {
      Logger.error('VideoSanitizer', `Erro na execução do FFmpeg: ${ffmpegRes.stderr?.slice(-500)}`);
      return {
        success: false,
        sanitizedPath: '',
        startFramePath: '',
        durationSeconds: 0,
        width: 0,
        height: 0,
        fps: 0,
        hasAudio: false,
        rawSha256,
        sanitizedSha256: '',
        error: `FFmpeg falhou com código ${ffmpegRes.status}`
      };
    }

    // Extrai Start Frame em PNG 1080p na marca de 1 segundo
    const startFramePath = path.join(outDir, 'start_frame.png');
    spawnSync('ffmpeg', [
      '-y',
      '-ss', '00:00:01',
      '-i', outputVideoPath,
      '-frames:v', '1',
      '-q:v', '2',
      startFramePath
    ], { encoding: 'utf8' });

    // Inspeciona resultado final
    const finalProbe = this.probeVideo(outputVideoPath);
    const sanitizedBytes = fs.readFileSync(outputVideoPath);
    const sanitizedSha256 = crypto.createHash('sha256').update(sanitizedBytes).digest('hex');

    return {
      success: finalProbe.valid && finalProbe.audioTracks === 0,
      sanitizedPath: outputVideoPath,
      startFramePath,
      durationSeconds: finalProbe.duration,
      width: finalProbe.width,
      height: finalProbe.height,
      fps: finalProbe.fps,
      hasAudio: finalProbe.audioTracks > 0,
      rawSha256,
      sanitizedSha256
    };
  }
}
