import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface CodexCallParams {
  sceneId: string;
  agentName: 'beat_director' | 'shot_director';
  attempt: number;
  systemPrompt: string;
  userPrompt: string;
  checkpointsDir?: string;
}

export interface CodexCallResult {
  rawOutput: string;
  cleanedJson: string;
  durationMs: number;
  responseSize: number;
}

export interface LlmCallLogRecord {
  timestamp: string;
  scene_id: string;
  agent: 'beat_director' | 'shot_director';
  attempt: number;
  duration_ms: number;
  response_size: number;
  parse_ok: boolean;
  error: string | null;
}

export function appendLlmCallLog(record: LlmCallLogRecord, checkpointsDir?: string): void {
  try {
    const targetDir = checkpointsDir || path.join(process.cwd(), 'checkpoints');
    fs.mkdirSync(targetDir, { recursive: true });
    const logFile = path.join(targetDir, 'llm_calls.jsonl');
    fs.appendFileSync(logFile, JSON.stringify(record) + '\n', 'utf8');
  } catch (err) {
    console.error('[codexTextClient] Falha ao registrar em llm_calls.jsonl:', err);
  }
}

export async function callCodexTextClient(params: CodexCallParams): Promise<CodexCallResult> {
  const timeoutMs = Number(process.env.HSL_LLM_TIMEOUT_MS) || 120000;
  const startTime = Date.now();

  const fullPrompt = `ATENÇÃO: responda apenas com o JSON, não execute comandos, não leia arquivos.

${params.systemPrompt}

${params.userPrompt}`;

  return new Promise<CodexCallResult>((resolve, reject) => {
    let stdoutData = '';
    let stderrData = '';

    const proc = spawn('codex.cmd', ['exec', '--sandbox', 'read-only', '--ephemeral', '-'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        proc.kill();
      } catch {}

      const durationMs = Date.now() - startTime;
      appendLlmCallLog(
        {
          timestamp: new Date().toISOString(),
          scene_id: params.sceneId,
          agent: params.agentName,
          attempt: params.attempt,
          duration_ms: durationMs,
          response_size: stdoutData.length,
          parse_ok: false,
          error: `LLM_TIMEOUT: cena='${params.sceneId}', agente='${params.agentName}', tentativa=${params.attempt}`
        },
        params.checkpointsDir
      );

      reject(
        new Error(
          `LLM_TIMEOUT: cena='${params.sceneId}', agente='${params.agentName}', tentativa=${params.attempt} excedeu timeout de ${timeoutMs}ms`
        )
      );
    }, timeoutMs);

    proc.stdout.on('data', (d) => {
      stdoutData += d.toString();
    });

    proc.stderr.on('data', (d) => {
      stderrData += d.toString();
    });

    proc.stdin.write(fullPrompt);
    proc.stdin.end();

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return;

      const durationMs = Date.now() - startTime;

      if (code !== 0 && !stdoutData.trim()) {
        const errMsg = `Codex CLI exit with code ${code}: ${stderrData}`;
        appendLlmCallLog(
          {
            timestamp: new Date().toISOString(),
            scene_id: params.sceneId,
            agent: params.agentName,
            attempt: params.attempt,
            duration_ms: durationMs,
            response_size: 0,
            parse_ok: false,
            error: errMsg
          },
          params.checkpointsDir
        );
        reject(new Error(errMsg));
        return;
      }

      let cleaned = stdoutData.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }

      const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        cleaned = match[0];
      }

      resolve({
        rawOutput: stdoutData,
        cleanedJson: cleaned,
        durationMs,
        responseSize: stdoutData.length
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      if (timedOut) return;
      const durationMs = Date.now() - startTime;
      appendLlmCallLog(
        {
          timestamp: new Date().toISOString(),
          scene_id: params.sceneId,
          agent: params.agentName,
          attempt: params.attempt,
          duration_ms: durationMs,
          response_size: 0,
          parse_ok: false,
          error: err.message
        },
        params.checkpointsDir
      );
      reject(err);
    });
  });
}
