import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { HybridVideoEngine, HybridSceneInput } from '../pipeline/hybridVideoEngine';
import { FireflyAdapter } from '../adapters/fireflyAdapter';

test('HybridVideoEngine Generative Priority Suite', async (t) => {
  const tmpRunDir = path.join(process.cwd(), 'runs', 'test-generative-priority-suite');
  const tmpPubDir = path.join(process.cwd(), 'public', 'editorial', 'execution', 'test-generative-priority-suite', 'scenes');

  // Prepara diretórios de teste
  fs.mkdirSync(tmpRunDir, { recursive: true });
  fs.mkdirSync(tmpPubDir, { recursive: true });

  const originalInit = FireflyAdapter.prototype.initialize;
  const originalFeed = FireflyAdapter.prototype.feedGuideAndRun;

  FireflyAdapter.prototype.initialize = async () => {};
  const sampleMp4 = path.join(process.cwd(), 'agente firefly', 'saida', 'HSL2_001_V01_TAKE_01.mp4');
  FireflyAdapter.prototype.feedGuideAndRun = async (runId: string, guidePath: string) => {
    const guide = JSON.parse(fs.readFileSync(guidePath, 'utf8'));
    const items = guide.items || [];
    const completedJobs = items.map((j: any) => {
      const dummyVideo = path.join(tmpRunDir, `${j.name}.mp4`);
      fs.copyFileSync(sampleMp4, dummyVideo);
      return {
        name: j.name,
        output_path: dummyVideo,
        status: 'COMPLETED'
      };
    });
    return {
      success: true,
      runId,
      completedJobs,
      failedJobs: []
    } as any;
  };

  t.after(() => {
    FireflyAdapter.prototype.initialize = originalInit;
    FireflyAdapter.prototype.feedGuideAndRun = originalFeed;
    try {
      fs.rmSync(tmpRunDir, { recursive: true, force: true });
      fs.rmSync(tmpPubDir, { recursive: true, force: true });
    } catch {
      // clean up
    }
  });

  await t.test('1. GENERATIVE_BESPOKE scene skips bank and web footage, routing directly to Firefly real synthesis', async () => {
    const sceneId = 'BESPOKE_SC_01';
    const bespokeScene: HybridSceneInput = {
      scene_id: sceneId,
      chapter_id: 'CH_1',
      chapter_title: 'Capítulo 1',
      name: 'Cena Bespoke 01',
      voiceover_text: 'O presidente utiliza a linha segura para autorizar a operação sigilosa.',
      visual_subject: 'terminal telefônico seguro de alta criptografia com monofone pesado cinza sobre mesa de madeira escura',
      take_type: 'CINEMATIC_TAKE',
      generation_priority: 'GENERATIVE_BESPOKE',
      narrative_archetype: 'PHYSICAL_TRIGGER',
      visual_must_include: ['monofone cinza de baquelite', 'display fosforescente verde com coordenada criptográfica'],
      visual_must_not: ['holograma', 'neon'],
      required_category: 'presidential_terminal_desk',
      tags: ['presidential', 'cryptography'],
      allowed_sources: ['firefly', 'bank']
    };

    // Prepara um start frame 1080p válido para o teste
    const sceneRunDir = path.join(tmpRunDir, 'editorial', 'execution', 'scenes', sceneId);
    fs.mkdirSync(sceneRunDir, { recursive: true });
    const samplePng = path.join(process.cwd(), 'runs', 'OOL-EP02-CABOS', 'editorial', 'execution', 'scenes', 'SC_001', 'firefly_start_frame.png');
    fs.copyFileSync(samplePng, path.join(sceneRunDir, 'firefly_start_frame.png'));

    const engine = new HybridVideoEngine();
    const result = await engine.processEpisodeScenes({
      runId: 'RUN_TEST_BESPOKE',
      scenes: [bespokeScene],
      runDirectory: tmpRunDir,
      publicExecutionDirectory: tmpPubDir,
      mode: 'smart'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.matchedFromBank, 0, 'Cena bespoke não deve ser buscada no banco');
    assert.strictEqual(result.generatedByFirefly, 1, 'Cena bespoke deve ser enfileirada no Firefly');

    const outcome = result.sceneOutcomes[sceneId];
    assert.strictEqual(outcome.action, 'DISPATCH_FIREFLY_ON_DEMAND');
    assert.strictEqual(outcome.takeOrigin, 'firefly_real');
    assert.strictEqual(outcome.reason, 'FIREFLY_GENERATED_SUCCESS');
  });

  await t.test('2. KEYFRAME_DOSSIER correctly sets dossier 2.5D outcome without searching bank or web video', async () => {
    const sceneId = 'DOSSIER_SC_02';
    const dossierScene: HybridSceneInput = {
      scene_id: sceneId,
      chapter_id: 'CH_1',
      chapter_title: 'Capítulo 1',
      name: 'Cena Dossie 02',
      voiceover_text: 'A tabela com a análise espectral revela os elementos adulterados.',
      visual_subject: 'dossiê técnico com tabela comparativa de espectrometria forense sob luz rasante',
      take_type: 'KEYFRAME_DOSSIER',
      generation_priority: 'GENERATIVE_BESPOKE',
      narrative_archetype: 'VULNERABILITY_NODE',
      visual_must_include: ['documento pericial com carimbo', 'gráfico de cromatografia gasosa'],
      visual_must_not: ['interface flutuante'],
      required_category: 'forensic_investigation',
      tags: ['forensics', 'dossier'],
      allowed_sources: ['dossier']
    };

    const sceneRunDir = path.join(tmpRunDir, 'editorial', 'execution', 'scenes', sceneId);
    fs.mkdirSync(sceneRunDir, { recursive: true });
    const samplePng = path.join(process.cwd(), 'runs', 'OOL-EP02-CABOS', 'editorial', 'execution', 'scenes', 'SC_001', 'firefly_start_frame.png');
    fs.copyFileSync(samplePng, path.join(sceneRunDir, 'firefly_start_frame.png'));

    const engine = new HybridVideoEngine();
    const result = await engine.processEpisodeScenes({
      runId: 'RUN_TEST_DOSSIER',
      scenes: [dossierScene],
      runDirectory: tmpRunDir,
      publicExecutionDirectory: tmpPubDir,
      mode: 'smart'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.dossiers25D, 1);
    const outcome = result.sceneOutcomes[sceneId];
    assert.strictEqual(outcome.action, 'KEYFRAME_DOSSIER_2.5D');
    assert.strictEqual(outcome.takeOrigin, 'dossier_25d');
  });

});
