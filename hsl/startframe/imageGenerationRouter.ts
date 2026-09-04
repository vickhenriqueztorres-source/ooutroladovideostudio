import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Logger } from '../../event-hub/logger';
import { ImageGenerationConfig, ImageProviderType, ExecutionEnvironment } from '../../config/imageGenerationConfig';
import { ChatGptImageBotAdapter } from '../../adapters/chatgptImageBotAdapter';
import { CodexNativeImageAdapter } from '../../adapters/codexNativeImageAdapter';

export interface ImageGenerationRequestItem {
  sceneId: string;
  prompt: string;
  targetPath: string;
  forbidPeople?: boolean;
}

export interface ImageGenerationResultItem {
  sceneId: string;
  targetPath: string;
  sha256: string;
  provider: ImageProviderType;
  environment: ExecutionEnvironment;
  status: 'SUCCESS' | 'FAILED';
  qualityScore?: number;
  error?: string;
}

export class ImageGenerationRouter {
  private static instance: ImageGenerationRouter;
  private readonly name = 'ImageGenerationRouter';
  private chatgptAdapter: ChatGptImageBotAdapter;
  private codexAdapter: CodexNativeImageAdapter;

  private constructor() {
    this.chatgptAdapter = new ChatGptImageBotAdapter();
    this.codexAdapter = new CodexNativeImageAdapter();
  }

  public static getInstance(): ImageGenerationRouter {
    if (!ImageGenerationRouter.instance) {
      ImageGenerationRouter.instance = new ImageGenerationRouter();
    }
    return ImageGenerationRouter.instance;
  }

  /**
   * Retorna o status de roteamento e ambiente ativo
   */
  public getStatus(): { environment: ExecutionEnvironment; provider: ImageProviderType } {
    return {
      environment: ImageGenerationConfig.detectEnvironment(),
      provider: ImageGenerationConfig.getActiveProvider()
    };
  }

  /**
   * Despacha a geração de imagens para o bot/serviço apropriado
   */
  public async generateFrames(
    episodeId: string,
    items: ImageGenerationRequestItem[],
    options: { autoRunBot?: boolean } = {}
  ): Promise<ImageGenerationResultItem[]> {
    const { environment, provider } = this.getStatus();
    Logger.info(
      this.name,
      `[ROUTER] Roteando ${items.length} frames para [${provider.toUpperCase()}] no ambiente [${environment}]`
    );

    if (provider === 'codex_cli' || provider === 'codex_native') {
      return this.generateWithCodexNative(episodeId, items);
    }

    // ChatGPT Image Bot
    return this.generateWithChatGptBot(episodeId, items, options.autoRunBot !== false);
  }

  /**
   * Rota Antigravity: ChatGPT Image Bot
   */
  private async generateWithChatGptBot(
    episodeId: string,
    items: ImageGenerationRequestItem[],
    autoRunBot: boolean
  ): Promise<ImageGenerationResultItem[]> {
    Logger.info(this.name, `[ANTIGRAVITY] Utilizando ChatGPT Image Bot para o episódio ${episodeId}...`);
    await this.chatgptAdapter.initialize();

    const prompts = items.map((it) => it.prompt);
    const results: ImageGenerationResultItem[] = [];

    // Submete e aguarda/executa o bot do ChatGPT
    let completedImages: any[] = [];
    if (autoRunBot) {
      const execution = await this.chatgptAdapter.submitPromptsAndExecute(episodeId, prompts);
      completedImages = execution.completedImages;
    } else {
      // Apenas lê entradas existentes do manifesto
      completedImages = this.chatgptAdapter.getManifestEntries().filter((m) => m.status === 'success');
    }

    const outputDir = path.join(process.cwd(), 'chatgpt-image-bot', 'output');

    for (const item of items) {
      fs.mkdirSync(path.dirname(item.targetPath), { recursive: true });

      // 1. Procura por correspondência direta de prompt
      const matchByPrompt = completedImages.find((img) => img.prompt === item.prompt && fs.existsSync(img.filepath));

      // 2. Procura por arquivo com nome do sceneId no output
      let matchedFilePath: string | null = null;
      if (matchByPrompt) {
        matchedFilePath = matchByPrompt.filepath;
      } else if (fs.existsSync(outputDir)) {
        const directFile = path.join(outputDir, `${item.sceneId}.png`);
        if (fs.existsSync(directFile) && fs.statSync(directFile).size > 1024 * 30) {
          matchedFilePath = directFile;
        } else {
          const files = fs.readdirSync(outputDir);
          const found = files.find(
            (f) => f.toLowerCase().includes(item.sceneId.toLowerCase()) && (f.endsWith('.png') || f.endsWith('.jpg'))
          );
          if (found) {
            const foundPath = path.join(outputDir, found);
            if (fs.statSync(foundPath).size > 1024 * 30) {
              matchedFilePath = foundPath;
            }
          }
        }
      }

      if (matchedFilePath && fs.existsSync(matchedFilePath)) {
        fs.copyFileSync(matchedFilePath, item.targetPath);
        const buffer = fs.readFileSync(item.targetPath);
        const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

        results.push({
          sceneId: item.sceneId,
          targetPath: item.targetPath,
          sha256,
          provider: 'chatgpt_image_bot',
          environment: 'ANTIGRAVITY',
          status: 'SUCCESS'
        });
      } else {
        results.push({
          sceneId: item.sceneId,
          targetPath: item.targetPath,
          sha256: '',
          provider: 'chatgpt_image_bot',
          environment: 'ANTIGRAVITY',
          status: 'FAILED',
          error: 'IMAGE_NOT_FOUND_IN_CHATGPT_BOT_OUTPUT'
        });
      }
    }

    return results;
  }

  /**
   * Rota Codex: Bot Nativo do Codex
   */
  private async generateWithCodexNative(
    episodeId: string,
    items: ImageGenerationRequestItem[]
  ): Promise<ImageGenerationResultItem[]> {
    Logger.info(this.name, `[CODEX] Utilizando Bot Nativo do Codex para o episódio ${episodeId}...`);
    await this.codexAdapter.initialize();

    const { environment, provider } = this.getStatus();
    const results: ImageGenerationResultItem[] = [];

    for (const item of items) {
      const res = await this.codexAdapter.generateImage(episodeId, item.sceneId, item.prompt, item.targetPath);

      results.push({
        sceneId: item.sceneId,
        targetPath: item.targetPath,
        sha256: res.sha256,
        provider: provider,
        environment: environment,
        status: res.status,
        error: res.error
      });
    }

    return results;
  }
}