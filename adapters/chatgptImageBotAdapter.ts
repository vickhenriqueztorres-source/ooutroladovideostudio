import { BaseAdapter } from './baseAdapter';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { Logger } from '../event-hub/logger';
import { AgentTelemetryAdapter } from './agentTelemetryAdapter';

export interface ChatGptImageResult {
  prompt: string;
  filename: string;
  filepath: string;
  timestamp: string;
  status: 'success' | 'failed';
  attempts: number;
  size_bytes: number;
}

export class ChatGptImageBotAdapter extends BaseAdapter {
  private botPath: string;
  private pythonExec: string;
  private queuePath: string;
  private manifestPath: string;
  private outputDir: string;
  private telemetry: AgentTelemetryAdapter;

  constructor(botPath?: string) {
    super('ChatGptImageBotAdapter');
    this.botPath = path.resolve(botPath || path.join(process.cwd(), 'chatgpt-image-bot'));
    this.pythonExec = 'python';
    this.queuePath = path.join(this.botPath, 'prompts', 'queue.txt');
    this.manifestPath = path.join(this.botPath, 'output', 'manifest.jsonl');
    this.outputDir = path.join(this.botPath, 'output');
    this.telemetry = AgentTelemetryAdapter.getInstance();
  }

  public async initialize(): Promise<void> {
    Logger.info(this.name, `Inicializando adaptador do ChatGPT Image Bot em: ${this.botPath}`);
    fs.mkdirSync(path.join(this.botPath, 'prompts'), { recursive: true });
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  public async checkHealth(): Promise<boolean> {
    return fs.existsSync(this.botPath) && fs.existsSync(path.join(this.botPath, 'src', 'main.py'));
  }

  /**
   * Lê as entradas registradas no manifest.jsonl
   */
  public getManifestEntries(): ChatGptImageResult[] {
    if (!fs.existsSync(this.manifestPath)) {
      return [];
    }

    const lines = fs.readFileSync(this.manifestPath, 'utf-8').split('\n');
    const results: ChatGptImageResult[] = [];

    for (const line of lines) {
      const clean = line.trim();
      if (clean) {
        try {
          results.push(JSON.parse(clean));
        } catch {
          // Ignora linhas malformadas
        }
      }
    }

    return results;
  }

  /**
   * Envia uma lista de prompts para a fila e executa o bot em segundo plano
   */
  public async submitPromptsAndExecute(
    productionId: string,
    prompts: string[]
  ): Promise<{ success: boolean; completedImages: ChatGptImageResult[] }> {
    Logger.info(this.name, `Submetendo ${prompts.length} prompts para o ChatGPT Image Bot...`);

    // 1. Escreve os prompts na fila
    const queueContent = prompts.filter((p) => p && p.trim()).join('\n') + '\n';
    fs.writeFileSync(this.queuePath, queueContent, 'utf-8');

    this.telemetry.recordEvent({
      run_id: productionId,
      production_id: productionId,
      agent_id: 'ChatGptImageBotAgent',
      provider: process.env.CODEX ? 'CODEX' : 'ANTIGRAVITY',
      task_id: 'SUBMIT_QUEUE',
      type: 'JOB_SUBMITTED',
      status: 'PENDING',
      message: `${prompts.length} prompts adicionados à fila de geração do ChatGPT.`,
      artifact_path: this.queuePath,
      attempt: 1
    });

    // 2. Executa o script Python
    return new Promise((resolve) => {
      Logger.info(this.name, `Iniciando execução do gerador: python -m src.main --run`);

      const pyProcess = spawn(this.pythonExec, ['-m', 'src.main', '--run'], {
        cwd: this.botPath,
        shell: true,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          PYTHONIOENCODING: 'utf-8'
        }
      });

      let stdoutData = '';
      let stderrData = '';

      pyProcess.stdout.on('data', (data) => {
        const text = data.toString();
        stdoutData += text;
        Logger.info(this.name, `[ChatGPT Bot] ${text.trim()}`);
      });

      pyProcess.stderr.on('data', (data) => {
        const text = data.toString();
        stderrData += text;
        Logger.warn(this.name, `[ChatGPT Bot STDERR] ${text.trim()}`);
      });

      pyProcess.on('close', (code) => {
        const manifestEntries = this.getManifestEntries();
        const completed = manifestEntries.filter(
          (entry) => entry.status === 'success' && prompts.includes(entry.prompt)
        );

        const success = code === 0 || completed.length > 0;

        this.telemetry.recordEvent({
          run_id: productionId,
          production_id: productionId,
          agent_id: 'ChatGptImageBotAgent',
          provider: process.env.CODEX ? 'CODEX' : 'ANTIGRAVITY',
          task_id: 'EXECUTE_QUEUE',
          type: success ? 'JOB_COMPLETED' : 'ERROR',
          status: success ? 'SUCCESS' : 'FAILED',
          message: `Execução do ChatGPT Image Bot finalizada (Código: ${code}, Imagens geradas: ${completed.length}/${prompts.length}).`,
          attempt: 1
        });

        resolve({
          success,
          completedImages: completed
        });
      });
    });
  }

  /**
   * Gera uma única imagem de forma síncrona/esperada
   */
  public async generateSingleImage(
    productionId: string,
    prompt: string
  ): Promise<ChatGptImageResult | null> {
    const result = await this.submitPromptsAndExecute(productionId, [prompt]);
    if (result.success && result.completedImages.length > 0) {
      return result.completedImages[0];
    }
    return null;
  }
}
