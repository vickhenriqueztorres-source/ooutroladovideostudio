import test from 'node:test';
import assert from 'node:assert';
import { buildFireflyPrompt, assertDocumentaryRealityPrompt } from '../contracts/buildFireflyPrompt';
import { IDENTITY_SUFFIX } from '../config/visualIdentity';

test('Firefly Prompt Cinematic Injection & Narrative Preservation Suite', async (t) => {

  await t.test('1. Preserves full narrative visualSubject and does not truncate to must_include list', () => {
    const fullNarrativeSubject = 'linha de solda manual acoplando o circuito clandestino ao pulsador mecânico da bomba sob iluminação quente de tungstênio';
    const result = buildFireflyPrompt({
      sceneId: 'SC_PROMPT_01',
      visualSubject: fullNarrativeSubject,
      visual_must_include: ['circuito clandestino', 'pulsador mecânico'],
      visual_must_not: ['holograma'],
      required_category: 'matter',
      domainTags: ['fuel', 'pump']
    });

    assert.ok(result.prompt.includes(fullNarrativeSubject), 'O prompt DEVE conter a descrição rica completa do visualSubject');
    assert.ok(result.prompt.startsWith('circuito clandestino and pulsador mecânico, physically present and clearly observable'));
    assert.ok(result.prompt.endsWith(IDENTITY_SUFFIX));
  });

  await t.test('2. Injects 35mm anamorphic optics and camera movement by archetype', () => {
    // Physical Trigger
    const triggerResult = buildFireflyPrompt({
      sceneId: 'SC_TRIGGER',
      visualSubject: 'operador acionando o botão vermelho com luva técnica',
      visual_must_include: ['botão de emergência', 'console de controle'],
      visual_must_not: ['neon'],
      required_category: 'matter',
      narrative_archetype: 'PHYSICAL_TRIGGER'
    });
    assert.ok(triggerResult.prompt.includes('extreme macro probe lens'), 'PHYSICAL_TRIGGER deve injetar lente macro probe');

    // Vulnerability Node
    const vulnResult = buildFireflyPrompt({
      sceneId: 'SC_VULN',
      visualSubject: 'escuta clandestina gravando pulsos na fiação telefônica',
      visual_must_include: ['escuta clandestina', 'fio de cobre'],
      visual_must_not: ['laser'],
      required_category: 'vulnerability_node',
      narrative_archetype: 'VULNERABILITY_NODE'
    });
    assert.ok(vulnResult.prompt.includes('85mm telephoto prime'), 'VULNERABILITY_NODE deve injetar teleobjetiva 85mm com foco crítico');

    // Monumental Scale
    const scaleResult = buildFireflyPrompt({
      sceneId: 'SC_SCALE',
      visualSubject: 'malha de tanques e dutos da refinaria operando em perspectiva monumental',
      visual_must_include: ['tanques industriais', 'dutos'],
      visual_must_not: ['cyberpunk'],
      required_category: 'matter',
      narrative_archetype: 'MONUMENTAL_SCALE'
    });
    assert.ok(scaleResult.prompt.includes('24mm wide angle cinematic lens'), 'MONUMENTAL_SCALE deve injetar grande angular 24mm');
  });

  await t.test('3. Injects explicit cinematic_shot directions from CinematicShotDirector', () => {
    const customShotResult = buildFireflyPrompt({
      sceneId: 'SC_CUSTOM',
      visualSubject: 'unidade de telemetria medindo o fluxo sob atmosfera chiaroscuro',
      visual_must_include: ['unidade de telemetria', 'sensor de fluxo'],
      visual_must_not: ['ruído visual'],
      required_category: 'matter',
      cinematic_shot: {
        lens_language: 'anamorphic prime 50mm T1.3',
        camera_movement: 'smooth lateral tracking shot following physical unit',
        composition: 'rule of thirds with negative space for telemetry HUD',
        depth_design: 'shallow depth of field with creamy anamorphic oval bokeh'
      }
    });

    assert.ok(customShotResult.prompt.includes('anamorphic prime 50mm T1.3'));
    assert.ok(customShotResult.prompt.includes('smooth lateral tracking shot following physical unit'));
    assert.ok(customShotResult.prompt.includes('shallow depth of field with creamy anamorphic oval bokeh'));
  });

  await t.test('4. Fail-closed: Strictly vetoes futuristic and sci-fi blacklist keywords', () => {
    assert.throws(
      () => {
        buildFireflyPrompt({
          sceneId: 'SC_FAIL',
          visualSubject: 'interface futurista com holograma azul flutuante',
          visual_must_include: ['holograma', 'painel'],
          visual_must_not: ['foto stock'],
          required_category: 'matter'
        });
      },
      /VISUAL_IDENTITY_FUTURISM_FORBIDDEN/
    );
  });

});
