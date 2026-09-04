import { BaseAdapter } from './baseAdapter';
import path from 'path';
import fs from 'fs';
import { execSync, spawn, ChildProcess } from 'child_process';
import Database from 'better-sqlite3';
import { Logger } from '../event-hub/logger';
import { AgentTelemetryAdapter } from './agentTelemetryAdapter';
import { ProductionSafetyGuard } from '../config/productionSafetyGuard';
import { PipelineContractGate } from '../pipeline/pipelineContractGate';
import { isFireflySessionLive, FireflySessionLiveResult, getFireflyPythonExec, resolveFireflyRoot } from '../config/fireflySessionLive';

export class FireflyAdapter extends BaseAdapter {
  private fireflyPath: string;
  private runtimeRoot: string;
  private pythonExec: string;
  private dbPath: string;
  private telemetry: AgentTelemetryAdapter;

  constructor(
    fireflyPath?: string,
    runtimeRoot?: string
  ) {
    super('FireflyAdapter');
    this.fireflyPath = path.resolve(fireflyPath || resolveFireflyRoot());
    this.runtimeRoot = path.resolve(runtimeRoot || process.env.FIREFLY_RUNTIME_ROOT || this.fireflyPath);
    const pyExec = getFireflyPythonExec(this.fireflyPath);
    this.pythonExec = pyExec || path.join(this.fireflyPath, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    this.dbPath = path.join(this.runtimeRoot, 'data', 'firefly_jobs.db');
    this.telemetry = AgentTelemetryAdapter.getInstance();
  }

  public async initialize(): Promise<void> {
    ProductionSafetyGuard.assertSafeForProduction();
    Logger.info(this.name, `Conectado ao Firefly Video Automation em: ${this.fireflyPath}; runtime: ${this.runtimeRoot}`);
    const pyExec = getFireflyPythonExec(this.fireflyPath);
    if (!pyExec) {
      throw new Error(`FIREFLY_VENV_NOT_FOUND: rode setup em ${path.basename(this.fireflyPath)}/ (.venv não encontrado)`);
    }
    this.pythonExec = pyExec;
  }

  public async checkHealth(): Promise<boolean> {
    const liveResult = await isFireflySessionLive(this.fireflyPath);
    return fs.existsSync(this.dbPath) && liveResult.live;
  }

  public async isSessionLive(): Promise<FireflySessionLiveResult> {
    return isFireflySessionLive(this.fireflyPath);
  }

  public async feedGuideAndRunReal(
    productionId: string,
    guideJsonPath: string
  ): Promise<{ success: boolean; completedJobs: Array<{ name: string; output_path: string }> }> {
    Logger.info(this.name, `[EXECUÇÃO REAL] Validando sessão e alimentando fila do Firefly com: ${guideJsonPath}`);

    ProductionSafetyGuard.assertSafeForProduction();

    // 0. Probe de Sessão Obrigatório ANTES de gastar qualquer estado
    const sessionCheck = await isFireflySessionLive(this.fireflyPath);
    if (!sessionCheck.live) {
      this.telemetry.recordEvent({
        run_id: productionId,
        production_id: productionId,
        agent_id: 'FireflyJobStore',
        provider: 'FIREFLY_BOT',
        task_id: 'SESSION_CHECK',
        type: 'AGENT_FAILED',
        status: 'FAILED',
        message: `FIREFLY_SESSION_DEAD: ${sessionCheck.reason}`,
        attempt: 1
      });
      throw new Error(`FIREFLY_SESSION_DEAD: ${sessionCheck.reason}. Rode o login interativo antes de disparar a produção.`);
    }

    this.telemetry.recordEvent({
      run_id: productionId,
      production_id: productionId,
      agent_id: 'FireflyJobStore',
      provider: 'FIREFLY_BOT',
      task_id: 'FEED_GUIDE',
      type: 'JOB_SUBMITTED',
      status: 'PENDING',
      message: `Guia de produção enviada ao Firefly JobStore: ${path.basename(guideJsonPath)}`,
      artifact_path: guideJsonPath,
      attempt: 1
    });

    // 1. Ler itens na guia para identificar nomes de saída e filtrar itens KEYFRAME_DOSSIER
    const rawGuide = fs.readFileSync(guideJsonPath, 'utf-8');
    const parsedGuide = JSON.parse(rawGuide);
    const allItems = parsedGuide.items || (Array.isArray(parsedGuide) ? parsedGuide : [parsedGuide]);
    
    // Filtra apenas itens que necessitam de renderização de vídeo pelo Firefly
    const videoItems = allItems.filter((i: any) => i.takeType !== 'KEYFRAME_DOSSIER' && !i.isDossier);
    const jobNames: string[] = videoItems.map((i: any) => i.name);
    const resumeExistingBatch = process.env.FIREFLY_RESUME_EXISTING_BATCH === 'true';

    Logger.info(this.name, `Total de cenas na guia: ${allItems.length} (${videoItems.length} vídeos no Firefly, ${allItems.length - videoItems.length} Keyframe Dossiers 2.5D)`);

    if (videoItems.length === 0) {
      Logger.info(this.name, 'Todos os itens são KEYFRAME_DOSSIER. Nenhuma geração de vídeo no Firefly necessária.');
      return { success: true, completedJobs: [] };
    }

    // Cria guia temporária contendo apenas os takes de vídeo para o Firefly
    let effectiveGuidePath = guideJsonPath;
    if (videoItems.length < allItems.length) {
      effectiveGuidePath = path.join(path.dirname(guideJsonPath), `firefly_filtered_guide_${Date.now()}.json`);
      fs.writeFileSync(effectiveGuidePath, JSON.stringify({ items: videoItems }, null, 2), 'utf-8');
    }

    if (!resumeExistingBatch) {
      const saidaDir = path.join(this.runtimeRoot, 'saida');
      for (const jobName of jobNames) {
        const existingMp4 = path.join(saidaDir, `${jobName}.mp4`);
        if (fs.existsSync(existingMp4)) {
          try {
            fs.unlinkSync(existingMp4);
            Logger.info(this.name, `Arquivo de saída antigo limpo: ${existingMp4}`);
          } catch (e: any) {
            Logger.warn(this.name, `Aviso ao remover saída antiga: ${e.message}`);
          }
        }
      }

      // 2. Limpar apenas estados reclamaveis. Falhas historicas fazem parte da
      // trilha de auditoria e nao devem ser apagadas.
      try {
        const db = new Database(this.dbPath);
        const deleteReclaimable = db.prepare("DELETE FROM jobs WHERE name = ? AND status IN ('pending', 'claimed', 'generating', 'stale_generating')");
        const deleteBatch = db.transaction((names: string[]) => {
          for (const name of names) deleteReclaimable.run(name);
        });
        deleteBatch(jobNames);
        db.prepare("UPDATE system_state SET status = 'running', reason = NULL WHERE singleton = 1").run();
        db.close();
        Logger.info(this.name, 'Base de dados do Firefly limpa apenas de jobs reclamaveis; historico preservado e system_state resetado para RUNNING.');
      } catch (e: any) {
        Logger.warn(this.name, `Aviso ao preparar banco SQLite: ${e.message}`);
      }

      try {
        const feedCmd = this.runtimeRoot !== this.fireflyPath
          ? `"${this.pythonExec}" -m firefly_bot.main --root "${this.runtimeRoot}" --feed-guide "${effectiveGuidePath}"`
          : `"${this.pythonExec}" -m firefly_bot.main --feed-guide "${effectiveGuidePath}"`;
        Logger.info(this.name, `Executando: ${feedCmd}`);
        const feedOutput = execSync(feedCmd, { cwd: this.fireflyPath, encoding: 'utf-8' });
        Logger.info(this.name, `Feed Output: ${feedOutput.trim()}`);
      } catch (err: any) {
        this.telemetry.recordEvent({
          run_id: productionId,
          production_id: productionId,
          agent_id: 'FireflyJobStore',
          provider: 'FIREFLY_BOT',
          task_id: 'FEED_GUIDE',
          type: 'AGENT_FAILED',
          status: 'FAILED',
          message: `Falha ao alimentar guia no Firefly: ${err.message}`,
          attempt: 1
        });
        throw err;
      }
    } else {
      const db = new Database(this.dbPath, {readonly: true});
      const missingJobs = jobNames.filter((jobName) => !db.prepare('SELECT id FROM jobs WHERE name = ? ORDER BY id DESC LIMIT 1').get(jobName));
      db.close();
      if (missingJobs.length > 0) {
        throw new Error(`FIREFLY_RESUME_BATCH_MISSING_JOBS: ${missingJobs.join(', ')}`);
      }
      Logger.info(this.name, `Retomando ${jobNames.length} jobs existentes sem limpar saidas ou reenfileirar geracoes.`);
    }

    Logger.info(this.name, `Monitorando jobs na base SQLite real: ${jobNames.join(', ')}`);

    // 5. Função para disparar worker do Firefly
    let runWorker: ChildProcess | null = null;
    const startWorkerProc = () => {
      const configuredConcurrency = Number(process.env.FIREFLY_WORKER_CONCURRENCY || 1);
      const concurrency = Number.isFinite(configuredConcurrency)
        ? Math.max(1, Math.min(6, Math.floor(configuredConcurrency)))
        : 1;

      const customEnv = {
        ...process.env,
        FIREFLY_CHROME_PROFILE_DIR: sessionCheck.userProfilePath
          || process.env.FIREFLY_CHROME_PROFILE_DIR
          || path.join(this.fireflyPath, 'data', 'chrome_profile'),
        FIREFLY_ALLOW_CREDIT_SPEND: 'true',
        FIREFLY_ALLOW_TEXT_TO_VIDEO: 'true',
        PYTHONUNBUFFERED: '1'
      };

      runWorker = spawn(this.pythonExec, ['-m', 'firefly_bot.main', '--root', this.runtimeRoot, '--concurrency', String(concurrency), '--run'], {
        cwd: this.fireflyPath,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: customEnv
      });

      runWorker.stdout?.on('data', (data) => {
        const line = data.toString().trim();
        if (line) Logger.info('FireflyWorkerProc', line);
      });

      runWorker.stderr?.on('data', (data) => {
        const line = data.toString().trim();
        if (line) Logger.warn('FireflyWorkerProc', line);
      });
    };

    startWorkerProc();

    // 6. Polling na tabela `jobs` do SQLite real do Firefly
    const completedJobs: Array<{ name: string; output_path: string }> = [];
    const failedInfraJobs = new Set<string>();
    const telemetrySnapshots = new Map<string, {status: string; emittedAt: number}>();
    const continueOnFailedInfra = process.env.FIREFLY_CONTINUE_ON_FAILED_INFRA === 'true';
    const configuredWaitMinutes = Number(process.env.FIREFLY_MAX_WAIT_MINUTES || 0);
    const maxWaitMinutes = Number.isFinite(configuredWaitMinutes) && configuredWaitMinutes >= 15
      ? configuredWaitMinutes
      : Math.max(60, jobNames.length * 15);
    const maxRetries = Math.ceil((maxWaitMinutes * 60) / 5);
    let retries = 0;

    while (retries < maxRetries) {
      await new Promise(r => setTimeout(r, 5000));
      retries++;

      try {
        const db = new Database(this.dbPath, { readonly: true });
        let allDone = true;
        let skippedInfraThisPoll = false;

        for (const jobName of jobNames) {
          const row: any = db.prepare('SELECT * FROM jobs WHERE name = ? ORDER BY id DESC LIMIT 1').get(jobName);
          if (row) {
            const stateReaderStatus = row.status === 'done' ? 'RESULT_READY' : (row.status === 'generating' || row.status === 'claimed' ? 'STILL_GENERATING' : row.status);
            
            const eventType = row.status === 'done' ? 'JOB_COMPLETED' : (row.status === 'generating' || row.status === 'claimed' ? 'AGENT_ACTIVITY' : 'JOB_SUBMITTED');
            const statusMap: Record<string, any> = {
              'done': 'SUCCESS',
              'generating': 'STILL_GENERATING',
              'claimed': 'STILL_GENERATING',
              'pending': 'PENDING',
              'failed-infra': 'FAILED',
              'failed-content': 'FAILED'
            };

            const now = Date.now();
            const previousSnapshot = telemetrySnapshots.get(row.name);
            const shouldEmitTelemetry = !previousSnapshot
              || previousSnapshot.status !== row.status
              || now - previousSnapshot.emittedAt >= 60_000;
            if (shouldEmitTelemetry) {
              this.telemetry.recordEvent({
                run_id: productionId,
                production_id: productionId,
                agent_id: `FireflyWorker_${row.name}`,
                provider: 'FIREFLY_BOT',
                task_id: `JOB_${row.id}`,
                type: eventType,
                status: statusMap[row.status] || 'RUNNING',
                message: `Job #${row.id} (${row.name}) - StateReader: ${stateReaderStatus} (Elapsed: ${retries * 5}s)`,
                artifact_path: row.output_path || undefined,
                attempt: row.attempts || 1,
                payload: {
                  job_id: row.id,
                  shot_id: row.name,
                  take_id: 'TAKE_01',
                  state_reader_status: stateReaderStatus,
                  elapsed_seconds: retries * 5,
                  last_observation: `Status do SQLite: ${row.status}`,
                  output_path: row.output_path
                }
              });
              telemetrySnapshots.set(row.name, {status: row.status, emittedAt: now});
            }

            if (row.status === 'done' && row.output_path && fs.existsSync(row.output_path)) {
              const stat = fs.statSync(row.output_path);
              const probe = PipelineContractGate.probeMedia(row.output_path);
              if (stat.size >= 50 * 1024 && probe.valid && probe.duration > 0) {
                if (!completedJobs.find(j => j.name === row.name)) {
                  completedJobs.push({ name: row.name, output_path: row.output_path });
                }
              } else {
                Logger.warn(this.name, `Job '${row.name}' marcado como done mas arquivo inválido (${stat.size} bytes, duração: ${probe.duration}s).`);
                allDone = false;
              }
            } else if (row.status === 'failed-infra') {
              if (continueOnFailedInfra) {
                if (!failedInfraJobs.has(row.name)) {
                  failedInfraJobs.add(row.name);
                  Logger.warn(this.name, `Job '${row.name}' falhou por infraestrutura e sera pulado nesta rodada: ${row.error || 'erro desconhecido'}`);
                }
                skippedInfraThisPoll = true;
              } else {
                db.close();
                if (runWorker) (runWorker as ChildProcess).kill();
                throw new Error(`Job '${row.name}' falhou no Firefly por infraestrutura (${row.error || 'erro desconhecido'}).`);
              }
            } else if (row.status === 'failed-content') {
              db.close();
              if (runWorker) (runWorker as ChildProcess).kill();
              this.telemetry.recordEvent({
                run_id: productionId,
                production_id: productionId,
                agent_id: `FireflyWorker_${row.name}`,
                provider: 'FIREFLY_BOT',
                task_id: `JOB_${row.id}`,
                type: 'AGENT_FAILED',
                status: 'FAILED',
                message: `Job '${row.name}' falhou por política de conteúdo.`,
                attempt: row.attempts || 1
              });
              throw new Error(`Job '${row.name}' falhou no Firefly por política de conteúdo.`);
            } else {
              allDone = false;
            }
          } else {
            allDone = false;
          }
        }

        db.close();

        if (continueOnFailedInfra && skippedInfraThisPoll) {
          try {
            const writableDb = new Database(this.dbPath);
            writableDb.prepare("UPDATE system_state SET status = 'running', reason = NULL WHERE singleton = 1").run();
            writableDb.close();
          } catch (e: any) {
            Logger.warn(this.name, `Aviso ao reabrir fila apos falha de infra: ${e.message}`);
          }

          const workerState = runWorker as ChildProcess | null;
          if (!allDone && (!workerState || workerState.exitCode !== null || workerState.killed)) {
            Logger.warn(this.name, 'Worker do Firefly saiu apos falha de infra; reiniciando para continuar jobs pendentes.');
            startWorkerProc();
          }
        }

        const workerState = runWorker as ChildProcess | null;
        if (!allDone && (!workerState || workerState.exitCode !== null || workerState.killed)) {
          Logger.info(this.name, 'Lote Firefly concluído; iniciando o próximo lote pendente da mesma fila.');
          startWorkerProc();
        }

        if (allDone && (completedJobs.length + failedInfraJobs.size) === jobNames.length) {
          if (completedJobs.length === 0) {
            if (runWorker) (runWorker as ChildProcess).kill();
            throw new Error(`FIREFLY_ALL_JOBS_FAILED_INFRA:${[...failedInfraJobs].join(',')}`);
          }
          Logger.info(this.name, `Firefly concluiu ${completedJobs.length} jobs; ${failedInfraJobs.size} falharam por infraestrutura e ficaram para reroute.`);
          if (runWorker) (runWorker as ChildProcess).kill();
          return { success: true, completedJobs };
        }
      } catch (err: any) {
        if (err.message.includes('falhou no Firefly')) {
          throw err;
        }
        Logger.warn(this.name, `Erro na leitura do SQLite: ${err.message}`);
      }
    }

    if (runWorker) (runWorker as ChildProcess).kill();
    throw new Error('TIMEOUT: O Firefly Worker não concluiu a geração dentro do tempo limite.');
  }

  public async feedGuideAndRun(
    productionId: string,
    guideJsonPath: string
  ): Promise<{ success: boolean; completedJobs: Array<{ name: string; output_path: string }> }> {
    return this.feedGuideAndRunReal(productionId, guideJsonPath);
  }
}
