import fs from 'fs';
import path from 'path';
import { EventBus } from '../../event-hub/eventBus';
import { Logger } from '../../event-hub/logger';

export type WorkflowStatus =
  | 'NOT_STARTED'
  | 'RUNNING'
  | 'WAITING_FOR_AGENT'
  | 'RETRYING'
  | 'COMPLETED'
  | 'FAILED';

export interface WorkflowState {
  runId: string;
  episodeId: string;
  status: WorkflowStatus;
  stages: string[];
  currentStageIndex: number;
  currentStageName: string;
  progressPercent: number;
  subStep: string;
  startedAt: string;
  updatedAt: string;
  stageStartedAt: string;
  stageElapsedMs: Record<string, number>;
  error?: string;
}

export interface WorkflowTrackerOptions {
  runId: string;
  episodeId: string;
  runDir: string;
  stages: string[];
}

export class WorkflowTracker {
  private state: WorkflowState;
  private statusFilePath: string;
  private currentStageTimer: number | null = null;

  constructor(options: WorkflowTrackerOptions) {
    this.statusFilePath = path.join(options.runDir, 'workflow_status.json');
    this.state = {
      runId: options.runId,
      episodeId: options.episodeId,
      status: 'NOT_STARTED',
      stages: options.stages,
      currentStageIndex: 0,
      currentStageName: options.stages[0] || 'init',
      progressPercent: 0,
      subStep: 'Iniciando orquestrador de produção...',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stageStartedAt: new Date().toISOString(),
      stageElapsedMs: {}
    };
    this.persist();
  }

  public start(): void {
    this.state.status = 'RUNNING';
    this.state.startedAt = new Date().toISOString();
    this.state.updatedAt = new Date().toISOString();
    this.state.stageStartedAt = new Date().toISOString();
    this.currentStageTimer = Date.now();
    this.persist();
    this.printBanner();
  }

  public transitionToStage(stageName: string, subStep?: string): void {
    // Registra tempo decorrido do estágio anterior
    if (this.currentStageTimer && this.state.currentStageName) {
      const elapsed = Date.now() - this.currentStageTimer;
      this.state.stageElapsedMs[this.state.currentStageName] = elapsed;
    }

    const index = this.state.stages.indexOf(stageName);
    if (index >= 0) {
      this.state.currentStageIndex = index;
    }
    this.state.currentStageName = stageName;
    this.state.status = 'RUNNING';
    this.state.subStep = subStep || `Iniciando etapa: ${stageName}`;
    this.state.stageStartedAt = new Date().toISOString();
    this.state.updatedAt = new Date().toISOString();
    this.currentStageTimer = Date.now();

    // Recalcula progresso
    const total = Math.max(1, this.state.stages.length);
    const completedStages = this.state.currentStageIndex;
    this.state.progressPercent = Math.min(99, Math.round((completedStages / total) * 100));

    this.persist();
    this.printBanner();

    try {
      EventBus.getInstance().emitEvent({
        production_id: this.state.runId,
        source: 'MISSION_CONTROL',
        agent_name: 'WorkflowTracker',
        step_index: this.state.currentStageIndex + 1,
        event_type: 'STEP_STARTED',
        payload: {
          stage: stageName,
          progress: this.state.progressPercent,
          subStep: this.state.subStep
        }
      });
    } catch {}
  }

  public updateSubStep(subStep: string, customProgressPercent?: number): void {
    this.state.subStep = subStep;
    this.state.updatedAt = new Date().toISOString();
    if (typeof customProgressPercent === 'number') {
      this.state.progressPercent = Math.max(0, Math.min(100, Math.round(customProgressPercent)));
    }
    this.persist();
    Logger.info('WorkflowTracker', `[${this.state.currentStageName}] ${subStep} (${this.state.progressPercent}%)`);
  }

  public setRetrying(stageName: string, attempt: number, maxAttempts: number, reason: string): void {
    this.state.status = 'RETRYING';
    this.state.subStep = `Tentativa ${attempt}/${maxAttempts} para '${stageName}': ${reason}`;
    this.state.updatedAt = new Date().toISOString();
    this.persist();
    Logger.warn('WorkflowTracker', `🔄 [RETRY] ${this.state.subStep}`);
  }

  public completeStage(stageName: string): void {
    if (this.currentStageTimer) {
      this.state.stageElapsedMs[stageName] = Date.now() - this.currentStageTimer;
    }
    const nextIndex = this.state.currentStageIndex + 1;
    const total = Math.max(1, this.state.stages.length);
    this.state.progressPercent = Math.min(100, Math.round((nextIndex / total) * 100));
    this.state.updatedAt = new Date().toISOString();
    this.persist();

    try {
      EventBus.getInstance().emitEvent({
        production_id: this.state.runId,
        source: 'MISSION_CONTROL',
        agent_name: 'WorkflowTracker',
        step_index: this.state.currentStageIndex + 1,
        event_type: 'STEP_COMPLETED',
        payload: {
          stage: stageName,
          durationMs: this.state.stageElapsedMs[stageName] || 0,
          progress: this.state.progressPercent
        }
      });
    } catch {}
  }

  public fail(errorMessage: string): void {
    this.state.status = 'FAILED';
    this.state.error = errorMessage;
    this.state.updatedAt = new Date().toISOString();
    this.persist();

    Logger.error('WorkflowTracker', `❌ Falha crítica no workflow da run ${this.state.runId}: ${errorMessage}`);

    try {
      EventBus.getInstance().emitEvent({
        production_id: this.state.runId,
        source: 'MISSION_CONTROL',
        agent_name: 'WorkflowTracker',
        event_type: 'ERROR',
        payload: {
          stage: this.state.currentStageName,
          error: errorMessage,
          progress: this.state.progressPercent
        }
      });
    } catch {}
  }

  public complete(): void {
    this.state.status = 'COMPLETED';
    this.state.progressPercent = 100;
    this.state.subStep = 'Produção finalizada com sucesso.';
    this.state.updatedAt = new Date().toISOString();
    this.persist();

    const banner = [
      '',
      '╔══════════════════════════════════════════════════════════════════════╗',
      `║ 🎉 WORKFLOW CONCLUÍDO COM SUCESSO: ${this.state.episodeId.padEnd(33)} ║`,
      `║ Run ID: ${this.state.runId.padEnd(58)} ║`,
      '╚══════════════════════════════════════════════════════════════════════╝',
      ''
    ].join('\n');
    console.log(banner);
  }

  public getState(): Readonly<WorkflowState> {
    return { ...this.state };
  }

  private persist(): void {
    try {
      const dir = path.dirname(this.statusFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tempPath = `${this.statusFilePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.state, null, 2), 'utf8');
      fs.renameSync(tempPath, this.statusFilePath);
    } catch (err: any) {
      Logger.warn('WorkflowTracker', `Aviso ao persistir status do workflow: ${err.message}`);
    }
  }

  private printBanner(): void {
    const stageStr = `[${this.state.currentStageIndex + 1}/${this.state.stages.length}] ${this.state.currentStageName.toUpperCase()}`;
    const pctStr = `${this.state.progressPercent}%`;
    const boxWidth = 70;
    const innerWidth = boxWidth - 4;

    const titleLine = ` 🎬 ETAPA: ${stageStr} (${pctStr})`.padEnd(innerWidth);
    const subLine = ` 👉 ${this.state.subStep}`.slice(0, innerWidth).padEnd(innerWidth);

    const banner = [
      '',
      `┌${'─'.repeat(boxWidth - 2)}┐`,
      `│ ${titleLine} │`,
      `│ ${subLine} │`,
      `└${'─'.repeat(boxWidth - 2)}┘`,
      ''
    ].join('\n');

    console.log(banner);
    Logger.info('WorkflowTracker', `[STATUS] ${stageStr} (${pctStr}) - ${this.state.subStep}`);
  }
}
