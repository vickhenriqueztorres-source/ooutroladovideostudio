import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Logger } from '../../event-hub/logger';
import { ProductionSafetyGuard } from '../../config/productionSafetyGuard';
import { ImageGenerationRouter, ImageGenerationRequestItem } from './imageGenerationRouter';
import { ImageGenerationConfig, ImageProviderType } from '../../config/imageGenerationConfig';
import { ImageQualityValidator } from '../../quality/imageQualityValidator';

const NO_PEOPLE_PROMPT_TERMS = [
  'smiling person looking at camera',
  'presenter addressing camera',
  'commercial stock model portrait',
  'posed business portrait',
  'smiling face into camera',
  'influencer smiling selfie'
];

export interface StartFrameGenerationItem {
  sceneId: string;
  prompt: string;
  subject: string;
  chapterTitle?: string;
  forbidPeople?: boolean;
}

export interface GeneratedStartFrameResult {
  sceneId: string;
  filePath: string;
  sha256: string;
  width: number;
  height: number;
}

export class StartFrameGenerator {
  private readonly name = 'StartFrameGenerator';
  private readonly chatgptOutputDir = path.join(process.cwd(), 'chatgpt-image-bot', 'output');

  constructor() {}

  /**
   * Tenta sincronizar a imagem real gerada pelo ChatGPT Image Bot
   */
  private syncFromChatGptBot(sceneId: string, targetPath: string): boolean {
    if (!fs.existsSync(this.chatgptOutputDir)) return false;

    // Procura por ID direto (ex: OOL_001.png) ou em arquivos do manifest
    const directFile = path.join(this.chatgptOutputDir, `${sceneId}.png`);
    if (fs.existsSync(directFile) && fs.statSync(directFile).size > 1024 * 50) {
      fs.copyFileSync(directFile, targetPath);
      Logger.info(this.name, `[BOT_SYNC] Frame ${sceneId} sincronizado do ChatGPT Image Bot (${directFile})`);
      return true;
    }

    // Procura em arquivos com o padrão do sceneId
    const allFiles = fs.readdirSync(this.chatgptOutputDir);
    const match = allFiles.find(f => f.toLowerCase().includes(sceneId.toLowerCase()) && (f.endsWith('.png') || f.endsWith('.jpg')));
    if (match) {
      const matchPath = path.join(this.chatgptOutputDir, match);
      if (fs.statSync(matchPath).size > 1024 * 50) {
        fs.copyFileSync(matchPath, targetPath);
        Logger.info(this.name, `[BOT_SYNC] Frame ${sceneId} sincronizado do ChatGPT Image Bot (${matchPath})`);
        return true;
      }
    }

    return false;
  }

  /**
   * Gera ou sincroniza Start Frames autênticos gerados por IA para cada cena
   */
  public async generateAll(
    episodeId: string,
    outputBaseDir: string,
    items: StartFrameGenerationItem[]
  ): Promise<GeneratedStartFrameResult[]> {
    Logger.info(this.name, `Iniciando síntese/sincronização de ${items.length} Start Frames para o episódio: ${episodeId}`);
    const results: GeneratedStartFrameResult[] = [];
    const missingScenes: string[] = [];

    const router = ImageGenerationRouter.getInstance();
    const routerStatus = router.getStatus();
    Logger.info(
      this.name,
      `[ROUTER_INIT] Provedor de geração ativo: [${routerStatus.provider.toUpperCase()}] no ambiente [${routerStatus.environment}]`
    );

    // Identificar quais cenas necessitam de geração
    const neededItems: ImageGenerationRequestItem[] = [];
    for (const item of items) {
      const sceneDir = path.join(outputBaseDir, 'scenes', item.sceneId);
      const targetPath = path.join(sceneDir, 'firefly_start_frame.png');
      const receiptPath = path.join(sceneDir, 'start_frame_receipt.json');

      // Reutiliza frames já gerados na pasta do episódio (runs/<episodeId>/scenes)
      const canonicalSceneDir = path.join(process.cwd(), 'runs', episodeId, 'scenes', item.sceneId);
      const canonicalTargetPath = path.join(canonicalSceneDir, 'firefly_start_frame.png');
      const canonicalReceiptPath = path.join(canonicalSceneDir, 'start_frame_receipt.json');
      if (!fs.existsSync(targetPath) && fs.existsSync(canonicalTargetPath)) {
        fs.mkdirSync(sceneDir, { recursive: true });
        fs.copyFileSync(canonicalTargetPath, targetPath);
        if (fs.existsSync(canonicalReceiptPath)) {
          fs.copyFileSync(canonicalReceiptPath, receiptPath);
        }
      }

      let hasValidFrame = false;
      if (fs.existsSync(targetPath) && fs.existsSync(receiptPath)) {
        try {
          const existingReceipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
          const existingSha = crypto.createHash('sha256').update(fs.readFileSync(targetPath)).digest('hex');
          if (existingReceipt.sha256 === existingSha) {
            hasValidFrame = true;
          }
        } catch {}
      }

      if (!hasValidFrame) {
        neededItems.push({
          sceneId: item.sceneId,
          prompt: item.prompt,
          targetPath,
          forbidPeople: item.forbidPeople
        });
      }
    }

    if (neededItems.length > 0) {
      try {
        await router.generateFrames(episodeId, neededItems, { autoRunBot: true });
      } catch (err: any) {
        Logger.warn(this.name, `Aviso na execução do router: ${err.message}`);
      }
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const sceneDir = path.join(outputBaseDir, 'scenes', item.sceneId);
      fs.mkdirSync(sceneDir, { recursive: true });

      const targetPath = path.join(sceneDir, 'firefly_start_frame.png');
      const receiptPath = path.join(sceneDir, 'start_frame_receipt.json');
      Logger.info(this.name, `[${i + 1}/${items.length}] Processando frame da cena ${item.sceneId}: "${item.subject.slice(0, 45)}..."`);

      // 1. Tentar obter do provedor roteado (NVIDIA NIM, Cloudflare, Codex Nativo, etc.)
      let provider: ImageProviderType | 'openai_imagegen' | null = null;
      if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 1024 * 20) {
        provider = routerStatus.provider;
      } else if (!item.forbidPeople && this.syncFromChatGptBot(item.sceneId, targetPath)) {
        provider = 'chatgpt_image_bot';
      }

      // Reuso idempotente somente quando o frame existente possui recibo verificável.
      if (!provider && fs.existsSync(targetPath) && fs.existsSync(receiptPath)) {
        try {
          const existingReceipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
          const existingSha = crypto.createHash('sha256').update(fs.readFileSync(targetPath)).digest('hex');
          const existingProvider = existingReceipt.provider || existingReceipt.sourceSystem;
          const receiptPrompt = String(existingReceipt.prompt || '').toLowerCase();
          const peoplePolicyVerified = existingReceipt.peoplePolicy === 'FORBIDDEN' ||
            NO_PEOPLE_PROMPT_TERMS.every((term) => receiptPrompt.includes(term));
          if (
            existingReceipt.sha256 === existingSha &&
            (existingProvider === 'codex_cli' ||
              existingProvider === 'chatgpt_image_bot' ||
              existingProvider === 'codex_native' ||
              existingProvider === 'openai_imagegen' ||
              existingProvider === 'bank') &&
            (!item.forbidPeople || peoplePolicyVerified)
          ) {
            provider = existingProvider;
          }
        } catch {
          provider = null;
        }
      }

      // 3. ZERO FALLBACK FAKE: Se não conseguiu gerar imagem real, registra cena faltante
      if (!provider || !fs.existsSync(targetPath) || fs.statSync(targetPath).size < 1024 * 20) {
        missingScenes.push(item.sceneId);
        Logger.error(this.name, `❌ Frame de IA ausente para ${item.sceneId}. Não será gerado mock fraudulento.`);
        continue;
      }

      const fileBuffer = fs.readFileSync(targetPath);
      const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Garantia de Qualidade Visual
      const qReport = ImageQualityValidator.validate(targetPath);
      if (!qReport.isValid) {
        missingScenes.push(item.sceneId);
        Logger.error(this.name, `❌ Frame de IA para ${item.sceneId} reprovado no Quality Gate: ${qReport.rejectionReason}`);
        continue;
      }

      // Gravar comprovante de proveniência oficial da IA
      const receipt = {
        sceneId: item.sceneId,
        sha256,
        provider,
        environment: routerStatus.environment,
        status: 'AUTHENTIC_AI_GENERATED',
        qualityScore: qReport.score,
        dimensions: {
          width: qReport.width || 1920,
          height: qReport.height || 1080,
          aspectRatio: qReport.aspectRatio || 1.778
        },
        entropyVariance: qReport.entropyVariance,
        prompt: item.prompt,
        peoplePolicy: item.forbidPeople ? 'FORBIDDEN' : 'CONTEXTUAL',
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), 'utf8');

      ProductionSafetyGuard.assertNoReusedStartFrames([targetPath], episodeId);

      results.push({
        sceneId: item.sceneId,
        filePath: targetPath,
        sha256,
        width: 1920,
        height: 1080
      });
    }

    if (missingScenes.length > 0) {
      throw new Error(
        `[START_FRAME_GENERATION_FAILED] ${missingScenes.length} cenas não possuem Start Frame gerado por IA: ${missingScenes.join(', ')}.`
      );
    }

    Logger.info(this.name, `✅ ${results.length} Start Frames autênticos validados para ${episodeId}!`);
    return results;
  }
}
