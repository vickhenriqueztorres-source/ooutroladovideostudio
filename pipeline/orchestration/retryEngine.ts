import { Logger } from '../../event-hub/logger';
import { AgentTelemetryAdapter } from '../../adapters/agentTelemetryAdapter';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  jitter?: boolean;
  runId?: string;
  isRetryable?: (error: any) => boolean;
  onRetry?: (error: any, attempt: number, nextDelayMs: number) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'runId' | 'isRetryable' | 'onRetry'>> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 12000,
  backoffFactor: 2,
  jitter: true
};

/**
 * Avalia se o erro é tipicamente transitório (rede, processo travado, lock, rate limit)
 * ou se é um erro fatal (contrato inválido, schema quebrado, arquivo inexistente).
 */
export function defaultIsRetryable(error: any): boolean {
  if (!error) return false;

  const message = String(error.message || error).toUpperCase();

  // Erros fatais que NUNCA devem ter retry
  const fatalPatterns = [
    'ZODERROR',
    'CONTRACT_FILE_NOT_FOUND',
    'SCENE_CONTRACTS_FILE_NOT_FOUND',
    'PRODUCTION_SAFETY_ERROR',
    'SAFETY_VIOLATION',
    'SCHEMA_VALIDATION_FAILED',
    'UNAUTHORIZED_STAGE'
  ];

  for (const pattern of fatalPatterns) {
    if (message.includes(pattern)) {
      return false;
    }
  }

  // Erros transitórios conhecidos
  const transientPatterns = [
    'ETIMEDOUT',
    'ESOCKETTIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'ENOTFOUND',
    'EAI_AGAIN',
    '429', // Rate limit
    '500', // Internal server error
    '502', // Bad gateway
    '503', // Service unavailable
    '504', // Gateway timeout
    'TIMEOUT',
    'SOCKET HANG UP',
    'SPAWN_ERROR',
    'PROCESS_TIMEOUT',
    'BUSY',
    'LOCKED'
  ];

  for (const pattern of transientPatterns) {
    if (message.includes(pattern)) {
      return true;
    }
  }

  // Por padrão, se for erro de chamada externa ou processo filho, permite retry
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executa uma ação assíncrona com política de retry e backoff exponencial com jitter.
 */
export async function executeWithRetry<T>(
  taskName: string,
  action: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_RETRY_OPTIONS.maxAttempts;
  const initialDelayMs = options.initialDelayMs ?? DEFAULT_RETRY_OPTIONS.initialDelayMs;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_RETRY_OPTIONS.maxDelayMs;
  const backoffFactor = options.backoffFactor ?? DEFAULT_RETRY_OPTIONS.backoffFactor;
  const jitter = options.jitter ?? DEFAULT_RETRY_OPTIONS.jitter;
  const isRetryable = options.isRetryable ?? defaultIsRetryable;

  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await action(attempt);
    } catch (err: any) {
      lastError = err;

      // Se for a última tentativa ou se o erro não for transitório, repassa a exceção
      if (attempt >= maxAttempts || !isRetryable(err)) {
        Logger.error(
          'RetryEngine',
          `❌ [${taskName}] Falha definitiva na tentativa ${attempt}/${maxAttempts}: ${err.message}`
        );
        throw err;
      }

      // Calcula tempo de espera com backoff exponencial + jitter
      const rawDelay = initialDelayMs * Math.pow(backoffFactor, attempt - 1);
      const jitterMs = jitter ? Math.random() * (initialDelayMs * 0.5) : 0;
      const nextDelayMs = Math.min(maxDelayMs, Math.round(rawDelay + jitterMs));

      Logger.warn(
        'RetryEngine',
        `⚠️ [${taskName}] Tentativa ${attempt}/${maxAttempts} falhou: ${err.message}. Nova tentativa em ${nextDelayMs}ms...`
      );

      // Notifica callback customizado se houver
      if (options.onRetry) {
        try {
          options.onRetry(err, attempt, nextDelayMs);
        } catch {}
      }

      // Telemetria
      try {
        const runId = options.runId || 'GLOBAL';
        AgentTelemetryAdapter.getInstance().recordEvent({
          run_id: runId,
          production_id: runId,
          agent_id: taskName,
          provider: 'MISSION_CONTROL',
          task_id: `${taskName}_attempt_${attempt}`,
          type: 'AGENT_RETRYING',
          status: 'WAITING',
          message: `Falha na tentativa ${attempt}/${maxAttempts}: ${err.message}. Retentando em ${nextDelayMs}ms.`,
          attempt
        });
      } catch {}

      await sleep(nextDelayMs);
    }
  }

  throw lastError;
}
