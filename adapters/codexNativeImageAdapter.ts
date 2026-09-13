import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import { spawn } from 'child_process';
import { BaseAdapter } from './baseAdapter';
import { Logger } from '../event-hub/logger';
import { AgentTelemetryAdapter } from './agentTelemetryAdapter';

export interface CodexImageResult {
  prompt: string;
  outputPath: string;
  sha256: string;
  width: number;
  height: number;
  provider: 'CODEX_NATIVE_DALLE3';
  status: 'SUCCESS' | 'FAILED';
  error?: string;
}

export class CodexNativeImageAdapter extends BaseAdapter {
  private telemetry: AgentTelemetryAdapter;
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    super('CodexNativeImageAdapter');
    this.telemetry = AgentTelemetryAdapter.getInstance();
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
  }

  public async initialize(): Promise<void> {
    Logger.info(this.name, 'Inicializando adaptador nativo de imagens do Codex CLI (OpenAI Codex / Terminal)');
  }

  public async checkHealth(): Promise<boolean> {
    return true;
  }

  /**
   * Executa a geração direta de imagem via CLI do Codex no terminal
   */
  public async generateImage(
    productionId: string,
    sceneId: string,
    prompt: string,
    outputPath: string
  ): Promise<CodexImageResult> {
    Logger.info(this.name, `[CODEX_IMAGE] Gerando frame para ${sceneId}: "${prompt.slice(0, 50)}..."`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    this.telemetry.recordEvent({
      run_id: productionId,
      production_id: productionId,
      agent_id: 'CodexNativeImageAgent',
      provider: 'CODEX',
      task_id: `GENERATE_${sceneId}`,
      type: 'JOB_SUBMITTED',
      status: 'PENDING',
      message: `Solicitação de imagem nativa do Codex para a cena ${sceneId}.`,
      attempt: 1
    });

    // 1. Se houver chave OPENAI_API_KEY configurada no ambiente Codex
    if (this.apiKey) {
      try {
        const imageUrl = await this.callOpenAiImagesApi(prompt);
        if (imageUrl) {
          await this.downloadImage(imageUrl, outputPath);
          const buffer = fs.readFileSync(outputPath);
          const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

          this.telemetry.recordEvent({
            run_id: productionId,
            production_id: productionId,
            agent_id: 'CodexNativeImageAgent',
            provider: 'CODEX',
            task_id: `GENERATE_${sceneId}`,
            type: 'JOB_COMPLETED',
            status: 'SUCCESS',
            message: `Imagem nativa do Codex gerada com sucesso para ${sceneId}.`,
            artifact_path: outputPath,
            attempt: 1
          });

          return {
            prompt,
            outputPath,
            sha256,
            width: 1792,
            height: 1024,
            provider: 'CODEX_NATIVE_DALLE3',
            status: 'SUCCESS'
          };
        }
      } catch (err: any) {
        Logger.warn(this.name, `Aviso na chamada direta da API OpenAI: ${err.message}. Alternando para Codex CLI via terminal.`);
      }
    }

    // 2. Geração primária via Codex CLI no terminal
    return this.generateViaCodexCli(sceneId, prompt, outputPath);
  }

  /**
   * Executa a geração via terminal usando a CLI do Codex (OpenAI Codex CLI)
   */
  public async generateViaCodexCli(
    sceneId: string,
    prompt: string,
    outputPath: string,
    timeoutMs: number = 180000
  ): Promise<CodexImageResult> {
    Logger.info(this.name, `[CODEX_CLI] Disparando geração via codex.cmd no terminal para cena ${sceneId}...`);
    const resolvedOut = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });

    const instruction = `TASK: Generate an authentic documentary 16:9 widescreen frame for scene ${sceneId} using your built-in image_gen tool and save it.
Target File: ${resolvedOut}

Image prompt:
${prompt}

STEPS:
1. Immediately call your built-in image_gen tool with the prompt above.
2. Copy the resulting image file from $CODEX_HOME/generated_images/... to the exact target path: ${resolvedOut}.
3. Ensure the destination directory exists and the output file is saved as a valid PNG.
`;

    return new Promise((resolve) => {
      let stdoutData = '';
      let stderrData = '';
      const proc = spawn('codex.cmd', ['exec', '--dangerously-bypass-approvals-and-sandbox', '--ephemeral', '-'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      const timer = setTimeout(() => {
        Logger.warn(this.name, `[CODEX_CLI] Timeout (${timeoutMs}ms) na cena ${sceneId}. Encerrando processo.`);
        try {
          proc.kill();
        } catch {}
      }, timeoutMs);

      proc.stdout.on('data', (d) => {
        stdoutData += d.toString();
      });
      proc.stderr.on('data', (d) => {
        stderrData += d.toString();
      });

      proc.stdin.write(instruction);
      proc.stdin.end();

      proc.on('close', (code) => {
        clearTimeout(timer);

        // Auto-recuperação de imagem caso o Codex CLI a tenha salvo em $CODEX_HOME/generated_images
        if (!fs.existsSync(resolvedOut) || fs.statSync(resolvedOut).size <= 1024 * 50) {
          try {
            const codexGenDir = path.join(process.env.USERPROFILE || 'C:\\Users\\brend', '.codex', 'generated_images');
            if (fs.existsSync(codexGenDir)) {
              let newestFile: string | null = null;
              let newestMtime = 0;
              const sessions = fs.readdirSync(codexGenDir);
              for (const session of sessions) {
                const sessionPath = path.join(codexGenDir, session);
                if (fs.statSync(sessionPath).isDirectory()) {
                  const files = fs.readdirSync(sessionPath);
                  for (const f of files) {
                    if (f.endsWith('.png') || f.endsWith('.jpg')) {
                      const fPath = path.join(sessionPath, f);
                      const mtime = fs.statSync(fPath).mtimeMs;
                      if (mtime > newestMtime && (Date.now() - mtime) < 240000) {
                        newestMtime = mtime;
                        newestFile = fPath;
                      }
                    }
                  }
                }
              }
              if (newestFile && fs.statSync(newestFile).size > 1024 * 50) {
                fs.copyFileSync(newestFile, resolvedOut);
                Logger.info(this.name, `[CODEX_CLI] 🔄 Auto-recuperado arquivo gerado em ${newestFile} -> ${resolvedOut}`);
              }
            }
          } catch (e: any) {
            Logger.warn(this.name, `Aviso na varredura de auto-recuperação: ${e.message}`);
          }
        }

        if (fs.existsSync(resolvedOut) && fs.statSync(resolvedOut).size > 1024 * 50) {
          const buffer = fs.readFileSync(resolvedOut);
          const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
          Logger.info(
            this.name,
            `[CODEX_CLI] ✅ Imagem para ${sceneId} gerada com sucesso via CLI! (${buffer.length} bytes)`
          );
          resolve({
            prompt,
            outputPath: resolvedOut,
            sha256,
            width: 1672,
            height: 941,
            provider: 'CODEX_NATIVE_DALLE3',
            status: 'SUCCESS'
          });
        } else {
          Logger.error(
            this.name,
            `[CODEX_CLI] ❌ Falha na geração via CLI (código ${code}): ${stderrData || stdoutData.slice(-300)}`
          );
          resolve({
            prompt,
            outputPath: resolvedOut,
            sha256: '',
            width: 0,
            height: 0,
            provider: 'CODEX_NATIVE_DALLE3',
            status: 'FAILED',
            error: `CODEX_CLI_FAILED_CODE_${code}`
          });
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        Logger.error(this.name, `[CODEX_CLI] Erro no spawn do codex.cmd: ${err.message}`);
        resolve({
          prompt,
          outputPath: resolvedOut,
          sha256: '',
          width: 0,
          height: 0,
          provider: 'CODEX_NATIVE_DALLE3',
          status: 'FAILED',
          error: `CODEX_CLI_SPAWN_ERROR: ${err.message}`
        });
      });
    });
  }

  private async callOpenAiImagesApi(prompt: string): Promise<string | null> {
    const postData = JSON.stringify({
      model: 'dall-e-3',
      prompt: `${prompt}, 35mm anamorphic photograph, chiaroscuro lighting, monumental, raw documentary realism, 8k, no text, no watermark`,
      n: 1,
      size: '1792x1024',
      quality: 'standard'
    });

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.openai.com',
          port: 443,
          path: '/v1/images/generations',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Length': Buffer.byteLength(postData)
          }
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              const data = JSON.parse(body);
              if (data?.data?.[0]?.url) {
                resolve(data.data[0].url);
              } else {
                reject(new Error(data?.error?.message || 'Resposta inesperada da API OpenAI'));
              }
            } catch (e: any) {
              reject(e);
            }
          });
        }
      );

      req.on('error', (e) => reject(e));
      req.write(postData);
      req.end();
    });
  }

  private async downloadImage(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      https
        .get(url, (response) => {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        })
        .on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
    });
  }
}