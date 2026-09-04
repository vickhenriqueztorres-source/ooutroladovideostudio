import 'dotenv/config';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { getDatabase } from '../database/db';
import { ProductionStateMachine } from './stateMachine';
import { FireflyToIntakeBridge } from '../production-bridge/fireflyToIntake';
import { HiddenSystemsLabAdapter } from '../adapters/hiddenSystemsLabAdapter';
import { FireflyAdapter } from '../adapters/fireflyAdapter';
import { AntigravityAdapter } from '../adapters/antigravityAdapter';
import { CodexAdapter } from '../adapters/codexAdapter';
import { Logger } from '../event-hub/logger';
import { ProductionSafetyGuard } from '../config/productionSafetyGuard';
import {CinematicDirectionShadowRunner} from '../hsl/cinematic/runners/cinematicDirectionShadowRunner';
import {CinematicExecutionCompiler} from '../hsl/execution/cinematicExecutionCompiler';
import {HslStartFrameRuntime} from '../hsl/startframe/startFrameRuntime';
import {HslFireflyGenerationRuntime} from '../production/hslFireflyGenerationRuntime';

export class ProductionRunner {
  private hslAdapter: HiddenSystemsLabAdapter;
  private builderAdapter: AntigravityAdapter;
  private reviewerAdapter: CodexAdapter;

  constructor() {
    this.hslAdapter = new HiddenSystemsLabAdapter();
    this.builderAdapter = new AntigravityAdapter();
    this.reviewerAdapter = new CodexAdapter();
  }

  public async initialize(): Promise<void> {
    ProductionSafetyGuard.assertSafeForProduction();
    await this.hslAdapter.initialize();
    await this.builderAdapter.initialize();
    await this.reviewerAdapter.initialize();
  }

  public async runFullProduction(briefingText: string): Promise<{ success: boolean; productionId: string; finalVideoPath: string }> {
    ProductionSafetyGuard.assertSafeForProduction();
    const productionId = crypto.randomUUID();
    Logger.info('ProductionRunner', `Iniciando Produção Completa. GUID: ${productionId}`);

    // Inserir registro inicial da produção no SQLite WAL
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO productions (production_id, project_name, status, current_step, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    stmt.run(productionId, 'O Outro Lado', 'IDLE', 1);

    const sm = new ProductionStateMachine(productionId, 'IDLE');

    try {
      // Step 1: Submeter briefing
      sm.transitionTo('BRIEFING_RECEIVED', { briefing: briefingText });

      // Step 2: Pesquisa, tese, roteiro, modelo causal e plano visual do HSL.
      sm.transitionTo('HSL_EDITORIAL_PREPRODUCTION_RUNNING');
      const preproduction = await this.hslAdapter.runPreproduction(productionId, briefingText);
      const cinematic = await new CinematicDirectionShadowRunner().run({
        productionId,
        editorialPackagePath: preproduction.episodePackagePath
      });
      const execution = new CinematicExecutionCompiler().compile(preproduction.episodePackagePath, cinematic);
      const sourceFramesDirectory = process.env.HSL_START_FRAME_SOURCE_DIR;
      const approvalManifestPath = process.env.HSL_START_FRAME_APPROVAL_MANIFEST;
      if (!sourceFramesDirectory || !approvalManifestPath) {
        throw new Error('HSL_START_FRAME_INPUTS_REQUIRED: set HSL_START_FRAME_SOURCE_DIR and HSL_START_FRAME_APPROVAL_MANIFEST');
      }
      const prodDir = path.join(process.cwd(), 'runs', productionId);
      const startFrames = new HslStartFrameRuntime().run({
        productionId,
        executionPlanPath: execution.executionPlanPath,
        sourceFramesDirectory,
        approvalManifestPath,
        outputDirectory: path.join(prodDir, 'generation')
      });

      // Step 3: Pacote do episodio aprovado para geracao dos assets ilustrativos.
      sm.transitionTo('HSL_EPISODE_PACKAGE_READY', { episodePackagePath: preproduction.episodePackagePath });

      // Step 4: Converter para Guia do Firefly via Production Bridge
      sm.transitionTo('FIREFLY_INGESTION_PENDING');
      const fireflyRuntime = new HslFireflyGenerationRuntime();
      const prepared = fireflyRuntime.prepare(startFrames.handoffs, path.join(prodDir, 'firefly'));

      // Step 5: Executar geração de vídeos no Firefly
      sm.transitionTo('FIREFLY_GENERATION_RUNNING');
      const fireflyAdapter = new FireflyAdapter(undefined, path.join(prodDir, 'firefly-runtime'));
      await fireflyAdapter.initialize();
      const fireflyResult = await fireflyRuntime.dispatch(productionId, prepared, fireflyAdapter);

      // Step 6: Conclusão do Firefly
      sm.transitionTo('FIREFLY_GENERATION_COMPLETED');

      // Step 7: Validar os assets Kling antes da montagem Remotion.
      sm.transitionTo('HSL_REMOTION_POSTPRODUCTION_RUNNING');
      const intakeManifestPath = path.join(prodDir, 'hsl_kling_asset_intake.json');
      FireflyToIntakeBridge.convert(
        productionId,
        fireflyResult.completedJobs,
        intakeManifestPath,
        {...prepared.lineageByJobName}
      );

      // Step 8: Montagem Remotion, narracao, procedencia, disclosures e QA final.
      const postproduction = await this.hslAdapter.runPostproduction(productionId, intakeManifestPath);

      // Step 9: Render Final de Vídeo concluído!
      sm.transitionTo('FINAL_VIDEO_RENDERED', { finalVideoPath: postproduction.finalVideoPath });

      Logger.info('ProductionRunner', `SUCESSO TOTAL! Documentario renderizado em: ${postproduction.finalVideoPath}`);

      return {
        success: true,
        productionId,
        finalVideoPath: postproduction.finalVideoPath
      };
    } catch (err: any) {
      Logger.error('ProductionRunner', `FALHA NA PRODUÇÃO ${productionId}: ${err.message}`);
      try {
        sm.transitionTo('PRODUCTION_FAILED', { error: err.message });
      } catch (e) {
        // Estado de erro capturado
      }
      throw err;
    }
  }
}

// Permitir execução direta via CLI se chamado diretamente
if (require.main === module) {
  const runner = new ProductionRunner();
  runner.initialize().then(() => {
    runner.runFullProduction('The Hidden System That Keeps Planes Flying');
  }).catch((err) => {
    console.error('Erro na execução:', err);
  });
}
