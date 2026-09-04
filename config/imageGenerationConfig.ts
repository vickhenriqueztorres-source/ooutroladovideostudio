/**
 * Configuração e Roteamento de Geração de Imagens
 * Chaveia dinamicamente entre ChatGPT Image Bot (Antigravity) e Bot Nativo (Codex).
 */

export type ImageProviderType = 'codex_cli' | 'chatgpt_image_bot' | 'codex_native';

export type ExecutionEnvironment = 'ANTIGRAVITY' | 'CODEX' | 'UNKNOWN';

export class ImageGenerationConfig {
  /**
   * Detecta o ambiente de execução atual
   */
  public static detectEnvironment(): ExecutionEnvironment {
    // 1. Verificação explícita de Codex / Emdash
    if (
      process.env.CODEX === '1' ||
      process.env.CODEX === 'true' ||
      process.env.CODEX_THREAD_ID ||
      process.env.EMDASH_TASK_ID ||
      process.env.AGENT_PLATFORM?.toUpperCase() === 'CODEX'
    ) {
      return 'CODEX';
    }

    // 2. Verificação explícita de Antigravity
    if (
      process.env.ANTIGRAVITY === '1' ||
      process.env.ANTIGRAVITY === 'true' ||
      process.env.ANTIGRAVITY_AGENT ||
      process.env.AGENT_PLATFORM?.toUpperCase() === 'ANTIGRAVITY'
    ) {
      return 'ANTIGRAVITY';
    }

    // Padrão do projeto quando operando localmente no IDE Antigravity
    return 'ANTIGRAVITY';
  }

  /**
   * Retorna o provedor de imagens ativo com base no ambiente ou override
   */
  public static getActiveProvider(): ImageProviderType {
    // Override manual se fornecido
    const manualOverride = process.env.IMAGE_PROVIDER?.toLowerCase();
    if (manualOverride === 'chatgpt_image_bot' || manualOverride === 'chatgpt') {
      return 'chatgpt_image_bot';
    }
    if (manualOverride === 'codex_native') {
      return 'codex_native';
    }
    if (manualOverride === 'codex_cli' || manualOverride === 'codex') {
      return 'codex_cli';
    }

    // Configuração oficial: Geração via Terminal com a CLI do Codex
    return 'codex_cli';
  }

  public static isAntigravity(): boolean {
    return this.detectEnvironment() === 'ANTIGRAVITY';
  }

  public static isCodex(): boolean {
    return this.detectEnvironment() === 'CODEX';
  }
}