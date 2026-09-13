import test from 'node:test';
import assert from 'node:assert';
import {
  CinematicSceneConceptionEngine,
  PHYSICAL_ACTION_VERBS,
  INERT_GENERIC_SUBJECTS
} from '../hsl/cinematic/agents/cinematicSceneConceptionEngine';
import { RawSceneInput } from '../contracts/buildSceneContracts';

test('CinematicSceneConceptionEngine Suite', async (t) => {

  await t.test('1. Detects and rejects generic/inert scene subjects', () => {
    const inertScene: RawSceneInput = {
      sceneId: 'SC_TEST_01',
      voiceover: 'O presidente faz uma ligação sigilosa para o ministro.',
      visualSubject: 'mesa de escritorio',
      visual_must_include: ['mesa de madeira', 'telefone cinza'],
      visual_must_not: ['holograma'],
      required_category: 'matter'
    };

    const result = CinematicSceneConceptionEngine.validateScene(inertScene);
    assert.strictEqual(result.valid, false, 'Deveria invalidar cena com sujeito genérico/inerte');
    assert.strictEqual(result.isInertGeneric, true);
    assert.ok(result.issues.some(i => i.includes('INERT_GENERIC_SCENE')));
  });

  await t.test('2. Detects missing physical action verb and enforces action verb requirement', () => {
    const staticScene: RawSceneInput = {
      sceneId: 'SC_TEST_02',
      voiceover: 'A frequência viaja pelo espaço aéreo até a antena receptora.',
      visualSubject: 'antena de comunicação no topo da colina',
      visual_must_include: ['antena parabólica', 'cabo coaxial'],
      visual_must_not: ['neon'],
      required_category: 'matter'
    };

    const result = CinematicSceneConceptionEngine.validateScene(staticScene);
    assert.strictEqual(result.hasPhysicalAction, false);
    assert.ok(result.issues.some(i => i.includes('MISSING_PHYSICAL_ACTION')));
  });

  await t.test('3. Approves valid cinematic scene with observable physical mechanism and action verbs', () => {
    const validScene: RawSceneInput = {
      sceneId: 'SC_TEST_03',
      voiceover: 'O sinal é interceptado a quilômetros de distância por um receptor clandestino.',
      visualSubject: 'analisador de espectro militar interceptando os pulsos de radiofrequência com cabo coaxial blindado acoplado',
      visual_must_include: ['analisador de espectro', 'cabo coaxial blindado'],
      visual_must_not: ['holograma decorativo'],
      required_category: 'vulnerability_node'
    };

    const result = CinematicSceneConceptionEngine.validateScene(validScene);
    assert.strictEqual(result.valid, true, 'Cena com ação física observável deve ser válida');
    assert.strictEqual(result.hasPhysicalAction, true);
    assert.strictEqual(result.archetype, 'VULNERABILITY_NODE');
    assert.strictEqual(result.generationPriority, 'GENERATIVE_BESPOKE');
  });

  await t.test('4. Correctly classifies the 4 canonical narrative archetypes', () => {
    // Physical Trigger
    const trigger = CinematicSceneConceptionEngine.detectArchetype(
      'O operador pressiona o botão de emergência selando o cofre.',
      'dedo enluvado pressionando o botão de emergência vermelho no console de controle'
    );
    assert.strictEqual(trigger, 'PHYSICAL_TRIGGER');

    // Vulnerability Node
    const vuln = CinematicSceneConceptionEngine.detectArchetype(
      'Uma escuta clandestina foi instalada no conduíte do palácio.',
      'microfone espião soldado clandestinamente aos fios de cobre do terminal'
    );
    assert.strictEqual(vuln, 'VULNERABILITY_NODE');

    // Monumental Scale
    const scale = CinematicSceneConceptionEngine.detectArchetype(
      'A malha nacional de distribuição de combustível cobre milhares de quilômetros.',
      'refinaria monumental recortada contra o céu crepuscular com torres de craqueamento operando'
    );
    assert.strictEqual(scale, 'MONUMENTAL_SCALE');

    // Internal Mechanism
    const mech = CinematicSceneConceptionEngine.detectArchetype(
      'O combustível passa pelo bloco medidor acionando o pistão volumétrico.',
      'corte técnico do medidor de vazão com pistões internos girando em óleo mineral'
    );
    assert.strictEqual(mech, 'INTERNAL_MECHANISM');
  });

  await t.test('5. Enriches inert or static scenes with Denis Villeneuve 35mm mechanical action', () => {
    const staticScene: RawSceneInput = {
      sceneId: 'SC_TEST_05',
      voiceover: 'O microchip fraudulento desviava 50 mililitros por litro abastecido.',
      visualSubject: 'placa de circuito com chip eprom',
      visual_must_include: ['chip eprom', 'placa de circuito'],
      visual_must_not: ['luz laser'],
      required_category: 'evidence'
    };

    const enriched = CinematicSceneConceptionEngine.enrichSceneSubject(staticScene, 'VULNERABILITY_NODE');
    assert.ok(enriched.includes('interceptando') || enriched.includes('desvio') || enriched.includes('soldado'), 'Deve enriquecer com ação física de vulnerabilidade');
    assert.ok(CinematicSceneConceptionEngine.hasPhysicalActionVerb(enriched), 'Texto enriquecido deve conter verbo de ação física');
  });

  await t.test('6. Batch processScenes enforces >= 70% GENERATIVE_BESPOKE priority and upgrades all scenes', () => {
    const engine = new CinematicSceneConceptionEngine();
    const rawScenes: RawSceneInput[] = [
      {
        sceneId: 'SC_01',
        voiceover: 'O motorista encaixa o bico da bomba no tanque.',
        visualSubject: 'bico da bomba sendo acoplado no bocal metálico do veículo',
        visual_must_include: ['bico de combustível', 'bocal metálico'],
        visual_must_not: ['sorriso'],
        required_category: 'matter'
      },
      {
        sceneId: 'SC_02',
        voiceover: 'O combustível começa a circular pela mangueira transparente.',
        visualSubject: 'combustível circulando sob pressão pela mangueira transparente',
        visual_must_include: ['mangueira transparente', 'fluxo de combustível'],
        visual_must_not: ['holograma'],
        required_category: 'matter'
      },
      {
        sceneId: 'SC_03',
        voiceover: 'O chip clandestino intercepta o sinal do pulsador eletrônico.',
        visualSubject: 'solda clandestina interceptando o barramento de pulsos eletrônicos',
        visual_must_include: ['solda clandestina', 'pulsador eletrônico'],
        visual_must_not: ['neon'],
        required_category: 'vulnerability_node'
      },
      {
        sceneId: 'SC_04',
        voiceover: 'A refinaria de onde parte todo o suprimento.',
        visualSubject: 'refinaria monumental operando em perspectiva profunda chiaroscuro',
        visual_must_include: ['torres de destilação', 'dutos industriais'],
        visual_must_not: ['cyberpunk'],
        required_category: 'matter'
      }
    ];

    const processed = engine.processScenes(rawScenes);
    assert.strictEqual(processed.length, 4);

    const bespokeScenes = processed.filter(s => s.generation_priority === 'GENERATIVE_BESPOKE');
    const bespokeRatio = (bespokeScenes.length / processed.length);

    assert.ok(bespokeRatio >= 0.70, `Proporção generativa deve ser >= 70% (obtido: ${(bespokeRatio * 100).toFixed(1)}%)`);
    assert.ok(processed.every(s => s.visualSubject && s.visualSubject.length > 10));
    assert.ok(processed.every(s => s.narrative_archetype !== undefined));
  });

});
