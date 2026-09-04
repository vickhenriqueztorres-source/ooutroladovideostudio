import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { Logger } from '../event-hub/logger';
import { WorkflowTracker } from '../pipeline/orchestration/workflowTracker';
import { executeWithRetry } from '../pipeline/orchestration/retryEngine';
import { AgentCommunicationBridge } from '../event-hub/agentCommunicationBridge';

test('Orchestrator Resilience - Logger grava logs em disco e fecha com segurança', () => {
  const testDir = path.join(process.cwd(), 'runs', 'test_logger_run');
  fs.mkdirSync(testDir, { recursive: true });

  try {
    Logger.configureRunLogger(testDir);
    Logger.info('TestContext', 'Mensagem de teste informativa', { foo: 'bar' });
    Logger.warn('TestContext', 'Mensagem de teste de aviso');
    Logger.error('TestContext', 'Mensagem de teste de erro', new Error('Erro simulado'));

    const { logFilePath, jsonlFilePath } = Logger.getLogPaths();
    assert.ok(logFilePath && fs.existsSync(logFilePath), 'Arquivo orchestrator.log deve existir');
    assert.ok(jsonlFilePath && fs.existsSync(jsonlFilePath), 'Arquivo events.jsonl deve existir');

    const logContent = fs.readFileSync(logFilePath, 'utf8');
    assert.match(logContent, /Mensagem de teste informativa/);
    assert.match(logContent, /Mensagem de teste de aviso/);
    assert.match(logContent, /Mensagem de teste de erro/);

    const jsonlContent = fs.readFileSync(jsonlFilePath, 'utf8');
    const lines = jsonlContent.trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(lines.length, 3, 'Devem existir exatamente 3 registros no events.jsonl');
    assert.equal(lines[0].level, 'INFO');
    assert.equal(lines[1].level, 'WARN');
    assert.equal(lines[2].level, 'ERROR');

    Logger.closeRunLogger();
    const closedPaths = Logger.getLogPaths();
    assert.equal(closedPaths.logFilePath, null);
    assert.equal(closedPaths.jsonlFilePath, null);
  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

test('Orchestrator Resilience - WorkflowTracker gerencia etapas e persiste workflow_status.json', () => {
  const testDir = path.join(process.cwd(), 'runs', 'test_workflow_run');
  fs.mkdirSync(testDir, { recursive: true });

  try {
    const stages = ['cinematic_direction', 'narration', 'visuals', 'render', 'contract_gate'];
    const tracker = new WorkflowTracker({
      runId: 'RUN_TEST_123',
      episodeId: 'test-episode',
      runDir: testDir,
      stages
    });

    tracker.start();
    let state = tracker.getState();
    assert.equal(state.status, 'RUNNING');
    assert.equal(state.currentStageName, 'cinematic_direction');
    assert.equal(state.progressPercent, 0);

    tracker.transitionToStage('narration', 'Gerando voz do Chris...');
    state = tracker.getState();
    assert.equal(state.currentStageName, 'narration');
    assert.equal(state.currentStageIndex, 1);
    assert.equal(state.progressPercent, 20); // 1 de 5 concluídas = 20%

    tracker.completeStage('narration');
    tracker.transitionToStage('visuals', 'Gerando 30 quadros...');
    state = tracker.getState();
    assert.equal(state.progressPercent, 40); // 2 de 5 concluídas = 40%

    tracker.updateSubStep('Gerando quadro 15/30', 55);
    state = tracker.getState();
    assert.equal(state.subStep, 'Gerando quadro 15/30');
    assert.equal(state.progressPercent, 55);

    tracker.complete();
    state = tracker.getState();
    assert.equal(state.status, 'COMPLETED');
    assert.equal(state.progressPercent, 100);

    const statusFile = path.join(testDir, 'workflow_status.json');
    assert.ok(fs.existsSync(statusFile), 'workflow_status.json deve ser persistido em disco');
    const persistedState = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
    assert.equal(persistedState.status, 'COMPLETED');
    assert.equal(persistedState.progressPercent, 100);
  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

test('Orchestrator Resilience - RetryEngine recupera de falhas transitórias com backoff', async () => {
  let attempts = 0;
  const result = await executeWithRetry(
    'TransientServiceTest',
    async (currentAttempt) => {
      attempts = currentAttempt;
      if (currentAttempt < 3) {
        throw new Error('ETIMEDOUT: Falha transitória simulada');
      }
      return 'SUCESSO_NA_TERCEIRA_TENTATIVA';
    },
    {
      maxAttempts: 3,
      initialDelayMs: 20,
      maxDelayMs: 100,
      jitter: false
    }
  );

  assert.equal(attempts, 3, 'Deve ter executado exatamente 3 tentativas');
  assert.equal(result, 'SUCESSO_NA_TERCEIRA_TENTATIVA');
});

test('Orchestrator Resilience - RetryEngine falha imediatamente em erro fatal sem tentar novamente', async () => {
  let attempts = 0;
  await assert.rejects(
    async () => {
      await executeWithRetry(
        'FatalErrorTest',
        async (currentAttempt) => {
          attempts = currentAttempt;
          throw new Error('CONTRACT_FILE_NOT_FOUND: Erro fatal');
        },
        {
          maxAttempts: 3,
          initialDelayMs: 10
        }
      );
    },
    /CONTRACT_FILE_NOT_FOUND/
  );

  assert.equal(attempts, 1, 'Erros contratuais fatais devem falhar na 1ª tentativa');
});

test('Orchestrator Resilience - AgentCommunicationBridge publica, subscreve e correlaciona mensagens', async () => {
  const bridge = AgentCommunicationBridge.getInstance();
  const receivedMessages: any[] = [];

  const unsubscribe = bridge.subscribe<any>('TEST_TOPIC', (msg) => {
    receivedMessages.push(msg);
  });

  const published = bridge.publish({
    sender: 'AgentA',
    recipient: 'AgentB',
    topic: 'TEST_TOPIC',
    payload: { action: 'DO_WORK', value: 42 }
  });

  assert.equal(receivedMessages.length, 1);
  assert.equal(receivedMessages[0].messageId, published.messageId);
  assert.equal(receivedMessages[0].payload.value, 42);

  unsubscribe();
  bridge.publish({
    sender: 'AgentA',
    recipient: 'AgentB',
    topic: 'TEST_TOPIC',
    payload: { action: 'IGNORED' }
  });
  assert.equal(receivedMessages.length, 1, 'Após unsubscribe não deve receber novas mensagens');
});
