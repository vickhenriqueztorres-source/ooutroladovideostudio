import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { MotionDirectorAgent } from '../pipeline/agents/motionDirectorAgent';
import { MotionQualityGate } from '../pipeline/gates/motionQualityGate';

test('MotionDirectorAgent & MotionQualityGate - Geração e Validação de Contrato de Motion', () => {
  const scenesPath = path.join(process.cwd(), 'contracts', 'episodes', 'nota-100-reais.scenes.json');
  const rawScenes = JSON.parse(fs.readFileSync(scenesPath, 'utf8'));

  const agent = new MotionDirectorAgent();
  const pkg = agent.buildMotionPackage({
    episodeId: 'nota-100-reais',
    runId: 'TEST_MOTION_RUN',
    rawScenes
  });

  assert.ok(pkg, 'MotionPackage deve ser gerado');
  assert.equal(pkg.episodeId, 'nota-100-reais');
  assert.equal(Object.keys(pkg.sceneAssignments).length, 30, 'Devem existir 30 atribuições de cenas');

  // Verifica que cenas de dossiê receberam componentes de motion graphics especializados
  const n100_004 = pkg.sceneAssignments['N100_004'];
  assert.equal(n100_004.component, 'IndustrialXRayHUD', 'N100_004 deve receber IndustrialXRayHUD');

  const n100_005 = pkg.sceneAssignments['N100_005'];
  assert.equal(n100_005.component, 'CyberMapTrace', 'N100_005 deve receber CyberMapTrace');

  const n100_009 = pkg.sceneAssignments['N100_009'];
  assert.equal(n100_009.component, 'TechnicalCutawaySchematic', 'N100_009 deve receber TechnicalCutawaySchematic');

  const n100_024 = pkg.sceneAssignments['N100_024'];
  assert.equal(n100_024.component, 'LaserScanDossier', 'N100_024 deve receber LaserScanDossier');

  // Verifica presença de callouts
  assert.ok(pkg.distributionReport.totalCallouts >= 6, 'Devem existir pelo menos 6 callouts cinéticos');
  assert.ok(pkg.distributionReport.motionGraphicsPercentage >= 15, 'Percentual de motion deve ser >= 15%');
  assert.ok(pkg.hudWindows.length >= 1, 'Deve conter pelo menos 1 janela de HUD');

  // Validação pelo Gatekeeper
  const validation = MotionQualityGate.validate(pkg);
  assert.equal(validation.valid, true, `Validação deve passar: ${validation.reasons.join('; ')}`);
  assert.ok(validation.score >= 7, `Score deve ser >= 7 (obteve ${validation.score})`);
});

test('MotionQualityGate - Rejeita pacote com falhas estruturais', () => {
  const invalidPkg: any = {
    episodeId: 'invalid-ep',
    sceneAssignments: {
      'SC_001': {
        sceneId: 'SC_001',
        component: 'NonExistentComponent',
        props: {}
      }
    },
    hudWindows: [],
    distributionReport: {
      totalScenes: 1,
      matterCount: 1,
      evidenceCount: 0,
      mapsCount: 0,
      revealCount: 0,
      motionGraphicsPercentage: 0,
      totalCallouts: 0,
      qualityScore: 2
    },
    compiledAt: new Date().toISOString()
  };

  const validation = MotionQualityGate.validate(invalidPkg);
  assert.equal(validation.valid, false, 'Deve rejeitar pacote inválido');
  assert.ok(validation.score < 7, 'Score deve ser menor que 7');
  assert.ok(validation.reasons.length > 0, 'Deve conter razões de rejeição');
});
