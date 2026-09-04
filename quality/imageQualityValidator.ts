import fs from 'fs';
import path from 'path';
import { Logger } from '../event-hub/logger';

export interface QualityReport {
  isValid: boolean;
  score: number; // 0 a 100
  format?: 'png' | 'jpeg' | 'webp' | 'unknown';
  width?: number;
  height?: number;
  aspectRatio?: number;
  sizeBytes: number;
  entropyVariance: number;
  rejectionReason?: string;
}

export class ImageQualityValidator {
  private static readonly TAG = 'ImageQualityValidator';
  private static readonly MIN_SIZE_BYTES = 20 * 1024; // Mínimo de 20KB para descartar placeholders e erros HTML
  private static readonly MIN_ENTROPY_VARIANCE = 8.0; // Desvio padrão mínimo para evitar telas pretas/brancas puras

  /**
   * Valida a integridade técnica e qualidade do arquivo de imagem
   */
  public static validate(filePath: string): QualityReport {
    if (!fs.existsSync(filePath)) {
      return {
        isValid: false,
        score: 0,
        sizeBytes: 0,
        entropyVariance: 0,
        rejectionReason: `ARQUIVO_INEXISTENTE: ${path.basename(filePath)} não encontrado.`
      };
    }

    const stat = fs.statSync(filePath);
    const sizeBytes = stat.size;

    // 1. Verificação de Tamanho Mínimo
    if (sizeBytes < this.MIN_SIZE_BYTES) {
      return {
        isValid: false,
        score: 10,
        sizeBytes,
        entropyVariance: 0,
        rejectionReason: `ARQUIVO_MUITO_PEQUENO: Tamanho de ${sizeBytes} bytes abaixo do limite de ${this.MIN_SIZE_BYTES} bytes.`
      };
    }

    const buffer = fs.readFileSync(filePath);

    // 2. Verificação de Magic Bytes / Formato
    const format = this.detectFormat(buffer);
    if (format === 'unknown') {
      return {
        isValid: false,
        score: 15,
        format,
        sizeBytes,
        entropyVariance: 0,
        rejectionReason: `FORMATO_INVALIDO: Assinatura de arquivo desconhecida ou corrompida.`
      };
    }

    // 3. Extração de Dimensões
    const dimensions = this.extractDimensions(buffer, format);
    let aspectRatio = 0;
    if (dimensions.width && dimensions.height && dimensions.height > 0) {
      aspectRatio = Number((dimensions.width / dimensions.height).toFixed(3));
    }

    // 4. Verificação de Entropia Visual (Evitar tela preta ou cor sólida uniforme)
    const entropyVariance = this.calculateEntropyVariance(buffer);
    if (entropyVariance < this.MIN_ENTROPY_VARIANCE) {
      return {
        isValid: false,
        score: 25,
        format,
        width: dimensions.width,
        height: dimensions.height,
        aspectRatio,
        sizeBytes,
        entropyVariance,
        rejectionReason: `FRAME_VAZIO_DETECTADO: Variância de cor de ${entropyVariance.toFixed(2)} indica tela preta, branca ou uniforme.`
      };
    }

    // 5. Cálculo de Score de Qualidade
    let score = 70;
    if (dimensions.width && dimensions.width >= 1024) score += 15;
    if (aspectRatio >= 1.5 && aspectRatio <= 1.85) score += 15; // Próximo de 16:9 (~1.777)

    return {
      isValid: true,
      score,
      format,
      width: dimensions.width,
      height: dimensions.height,
      aspectRatio,
      sizeBytes,
      entropyVariance
    };
  }

  /**
   * Detecta formato através dos magic bytes do cabeçalho
   */
  private static detectFormat(buffer: Buffer): 'png' | 'jpeg' | 'webp' | 'unknown' {
    if (buffer.length < 12) return 'unknown';

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'png';
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'jpeg';
    }

    // WebP: RIFF ... WEBP
    if (
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return 'webp';
    }

    return 'unknown';
  }

  /**
   * Extrai largura e altura sem dependências pesadas externas
   */
  private static extractDimensions(
    buffer: Buffer,
    format: 'png' | 'jpeg' | 'webp' | 'unknown'
  ): { width?: number; height?: number } {
    try {
      if (format === 'png' && buffer.length >= 24) {
        // Chunk IHDR: width em 16..20, height em 20..24
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      }

      if (format === 'jpeg') {
        let offset = 2;
        while (offset < buffer.length - 8) {
          if (buffer[offset] !== 0xff) {
            offset++;
            continue;
          }
          const marker = buffer[offset + 1];
          // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
          if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);
            return { width, height };
          }
          const length = buffer.readUInt16BE(offset + 2);
          offset += 2 + length;
        }
      }

      if (format === 'webp' && buffer.length >= 30) {
        // VP8: offset 26, VP8L: offset 21
        const type = buffer.toString('ascii', 12, 16);
        if (type === 'VP8 ' && buffer.length >= 30) {
          const width = buffer.readUInt16LE(26) & 0x3fff;
          const height = buffer.readUInt16LE(28) & 0x3fff;
          return { width, height };
        }
      }
    } catch (e: any) {
      Logger.warn(this.TAG, `Falha na extração de dimensões: ${e.message}`);
    }

    return {};
  }

  /**
   * Calcula o desvio padrão de uma amostra regular de bytes da imagem
   * para detectar imagens monocráticas ou completamente pretas.
   */
  private static calculateEntropyVariance(buffer: Buffer): number {
    const step = Math.max(1, Math.floor(buffer.length / 2000));
    const sample: number[] = [];

    // Amostra do meio dos dados para evitar cabeçalhos fixos
    const startOffset = Math.floor(buffer.length * 0.1);
    const endOffset = Math.floor(buffer.length * 0.9);

    for (let i = startOffset; i < endOffset; i += step) {
      sample.push(buffer[i]);
    }

    if (sample.length === 0) return 0;

    const mean = sample.reduce((acc, v) => acc + v, 0) / sample.length;
    const variance =
      sample.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / sample.length;

    return Math.sqrt(variance);
  }
}
