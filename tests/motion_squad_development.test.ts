import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { ScriptPhysicsDeconstructor } from '../pipeline/motion-squad/scriptPhysicsDeconstructor';
import { Isometric3DArtDirector } from '../pipeline/motion-squad/isometric3DArtDirector';
import { RemotionMotionDeveloper } from '../pipeline/motion-squad/remotionMotionDeveloper';
import { MotionSquadOrchestrator } from '../pipeline/motion-squad/motionSquadOrchestrator';
import { isRegisteredComponent } from '../remotion/cinema/componentRegistry';

test('ScriptPhysicsDeconstructor - Dissecação física de roteiro de engenharia', () => {
  const sceneInput = {
    sceneId: 'TEST_TURBINA_001',
    voiceover: 'A água despenca sob pressão de 80 toneladas e atinge o rotor da turbina girando com tolerância micrométrica de 110 micrômetros.',
    visualSubject: 'Corte transversal volumétrico 3D do rotor da turbina de aço com fluxo pressurizado',
    required_category: 'hydraulic_turbine_cutaway',
    canon_category: 'reveal',
    take_type: 'KEYFRAME_DOSSIER'
  };

  const blueprint = ScriptPhysicsDeconstructor.deconstruct(sceneInput, 'turbina-itaipu');

  assert.equal(blueprint.sceneId, 'TEST_TURBINA_001');
  assert.equal(blueprint.archetype, 'VOLUMETRIC_CUTAWAY');
  assert.ok(blueprint.physicalVariables.length >= 2, 'Deve extrair pelo menos 2 variáveis metrológicas');

  // Verifica extração de pressão de 80 toneladas
  const pressVar = blueprint.physicalVariables.find((v) => v.name.includes('PRESSÃO'));
  assert.ok(pressVar, 'Variável de pressão mecânica deve ter sido extraída');
  assert.equal(pressVar?.value, '80');

  // Verifica camadas 3D
  assert.ok(blueprint.layers.length >= 3, 'Deve modelar pelo menos 3 camadas estruturais');
  const criticalLayer = blueprint.layers.find((l) => l.critical);
  assert.ok(criticalLayer, 'Deve existir pelo menos uma camada crítica no corte');
});

test('Isometric3DArtDirector - Cinematografia isométrica e cores canônicas', () => {
  const sceneInput = {
    sceneId: 'TEST_MICROSCOPIA_002',
    voiceover: 'Ao analisarmos a microestrutura da fibra sob microscópio óptico, vemos as densidades entrelaçadas.',
    visualSubject: 'Microestrutura de fibras com retícula de telemetria',
    required_category: 'fiber_microstructure',
    canon_category: 'reveal',
    take_type: 'KEYFRAME_DOSSIER'
  };

  const blueprint = ScriptPhysicsDeconstructor.deconstruct(sceneInput, 'fibras-nobres');
  const choreography = Isometric3DArtDirector.direct(blueprint, 30);

  assert.ok(choreography.viewport.rotateX > 40 && choreography.viewport.rotateX < 70, 'Ângulo rotateX deve ser isométrico');
  assert.ok(choreography.viewport.rotateZ < 0, 'Ângulo rotateZ deve ser negativo para perspectiva isométrica');
  assert.equal(choreography.lighting.criticalGlow, '#FF5500', 'Acento crítico deve ser Sodium-Vapor Orange (#FF5500)');
  assert.equal(choreography.lighting.telemetryGlow, '#00F0FF', 'Telemetria deve ser Laser Cyan (#00F0FF)');
  assert.ok(choreography.timing.laserSliceDurationFrames > 0, 'Laser slice deve ter duração positiva');
});

test('MotionSquadOrchestrator - Orquestração e desenvolvimento autônomo', () => {
  const testScenes = [
    {
      sceneId: 'SQ_TEST_01',
      voiceover: 'Se fatiarmos o rotor ao meio, veremos o corte volumétrico das bobinas de cobre operando sob 80 toneladas.',
      visualSubject: 'Corte técnico 3D das bobinas',
      required_category: 'copper_coils_cutaway',
      canon_category: 'reveal',
      take_type: 'KEYFRAME_DOSSIER'
    },
    {
      sceneId: 'SQ_TEST_02',
      voiceover: 'O operário observa a carcaça de aço na usina.',
      visualSubject: 'Operário observando usina',
      required_category: 'plant_observation',
      canon_category: 'matter',
      take_type: 'CINEMATIC_TAKE'
    }
  ];

  const results = MotionSquadOrchestrator.developMotionsForEpisode('teste-squad-unit', testScenes);

  // Apenas a cena SQ_TEST_01 (reveal/corte) deve gerar um motion 3D desenvolvido
  assert.ok(results['SQ_TEST_01'], 'Cena SQ_TEST_01 deve ser desenvolvida');
  assert.equal(results['SQ_TEST_02'], undefined, 'Cena de matéria (matter) não deve gerar componente 3D');

  const developed = results['SQ_TEST_01'];
  assert.ok(fs.existsSync(developed.filePath), 'Arquivo .tsx deve existir no disco');

  // Verifica registro no componentRegistry e index.ts
  const regPath = path.join(process.cwd(), 'remotion', 'cinema', 'componentRegistry.ts');
  const regInitial = fs.readFileSync(regPath, 'utf8');
  assert.ok(regInitial.includes(developed.componentName), `Componente ${developed.componentName} deve estar registrado no componentRegistry.ts`);

  const indexPath = path.join(process.cwd(), 'remotion', 'documentary', 'index.ts');
  const indexInitial = fs.readFileSync(indexPath, 'utf8');
  assert.ok(indexInitial.includes(developed.componentName), `Componente ${developed.componentName} deve estar exportado no index.ts`);

  // Limpeza do arquivo de teste gerado para não poluir o repositório
  if (fs.existsSync(developed.filePath)) {
    fs.unlinkSync(developed.filePath);
  }

  // Remove do index.ts e componentRegistry.ts a linha do teste temporário
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  indexContent = indexContent.replace(new RegExp(`export \\* from './${developed.componentName}';\\r?\\n?`, 'g'), '');
  fs.writeFileSync(indexPath, indexContent, 'utf8');

  let regContent = fs.readFileSync(regPath, 'utf8');
  regContent = regContent.replace(new RegExp(`\\s*${developed.componentName}: DocumentaryComponents\\.${developed.componentName},\\r?\\n?`, 'g'), '');
  fs.writeFileSync(regPath, regContent, 'utf8');
});
