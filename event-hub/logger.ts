import fs from 'fs';
import path from 'path';

export class Logger {
  private static logFilePath: string | null = null;
  private static jsonlFilePath: string | null = null;

  /**
   * Configura o diretório onde os logs da run serão gravados de forma persistente.
   * Cria 'orchestrator.log' (texto formatado) e 'events.jsonl' (JSON estruturado).
   */
  public static configureRunLogger(logsDir: string): void {
    try {
      fs.mkdirSync(logsDir, { recursive: true });
      this.logFilePath = path.join(logsDir, 'orchestrator.log');
      this.jsonlFilePath = path.join(logsDir, 'events.jsonl');

      const banner = `═══════════════════════════════════════════════════════════════════════\n` +
        `[${new Date().toISOString()}] LOG INICIADO - RUN ORCHESTRATOR\n` +
        `═══════════════════════════════════════════════════════════════════════\n`;
      fs.appendFileSync(this.logFilePath, banner, 'utf8');
    } catch (err: any) {
      console.error(`[Logger] Falha ao configurar diretório de logs em '${logsDir}': ${err.message}`);
    }
  }

  /**
   * Fecha e limpa o apontamento do logger persistente da run ativa.
   */
  public static closeRunLogger(): void {
    if (this.logFilePath && fs.existsSync(this.logFilePath)) {
      try {
        const footer = `\n[${new Date().toISOString()}] LOG FINALIZADO - RUN ORCHESTRATOR ENCERRADA\n`;
        fs.appendFileSync(this.logFilePath, footer, 'utf8');
      } catch {}
    }
    this.logFilePath = null;
    this.jsonlFilePath = null;
  }

  public static getLogPaths(): { logFilePath: string | null; jsonlFilePath: string | null } {
    return {
      logFilePath: this.logFilePath,
      jsonlFilePath: this.jsonlFilePath
    };
  }

  private static writeToDisk(level: 'INFO' | 'WARN' | 'ERROR', timestamp: string, context: string, message: string, data?: any): void {
    if (!this.logFilePath) return;

    try {
      const dataStr = data !== undefined
        ? (typeof data === 'string' ? data : (data instanceof Error ? (data.stack || data.message) : JSON.stringify(data)))
        : '';
      const line = `[${timestamp}] [${level}] [${context}] ${message}${dataStr ? ' ' + dataStr : ''}\n`;
      fs.appendFileSync(this.logFilePath, line, 'utf8');

      if (this.jsonlFilePath) {
        const jsonRecord = {
          timestamp,
          level,
          context,
          message,
          data: data instanceof Error ? { message: data.message, stack: data.stack } : data
        };
        fs.appendFileSync(this.jsonlFilePath, JSON.stringify(jsonRecord) + '\n', 'utf8');
      }
    } catch (diskErr: any) {
      console.error(`[Logger] Falha ao gravar log em disco: ${diskErr.message}`);
    }
  }

  public static info(context: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] [${context}] ${message}`, data ? JSON.stringify(data) : '');
    this.writeToDisk('INFO', timestamp, context, message, data);
  }

  public static warn(context: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] [${context}] ${message}`, data ? JSON.stringify(data) : '');
    this.writeToDisk('WARN', timestamp, context, message, data);
  }

  public static error(context: string, message: string, error?: any) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] [${context}] ${message}`, error || '');
    this.writeToDisk('ERROR', timestamp, context, message, error);
  }
}
