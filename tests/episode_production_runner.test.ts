import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { parseEpisodeContract } from '../contracts/episodeContract';
import { buildSceneContracts, RawSceneInput } from '../contracts/buildSceneContracts';
import { VideoRepositoryMatcher } from '../hsl/media/videoRepositoryMatcher';
import { PipelineContractGate } from '../pipeline/pipelineContractGate';
import { runEpisodeProduction } from '../pipeline/episodeProductionRunner';
import { EPISODE_GASOLINA_TOTAL_SECONDS } from '../remotion/episodeGasolinaTimelineData';
import { main as legacyFinish1 } from '../scripts/hslVideo1Finish';

console.log('══════════════════════════════════════════════════════════════════════════════════════');
console.log('🧪 EXECUTANDO SUÍTE DE TESTES DO EPISODE PRODUCTION RUNNER & REGRAS DE MASTER');
console.log('══════════════════════════════════════════════════════════════════════════════════════');

async function runTests() {
  let allPassed = true;

  const CONTRACT_PATH = path.join(process.cwd(), 'contracts', 'episodes', 'gasolina-adulterada.episode.json');
  const SCENES_PATH = path.join(process.cwd(), 'contracts', 'episodes', 'gasolina-adulterada.scenes.json');

  const episodeContract = parseEpisodeContract(CONTRACT_PATH);
  const canonicalScenes: RawSceneInput[] = JSON.parse(fs.readFileSync(SCENES_PATH, 'utf8'));

  // ─────────────────────────────────────────────────────────────────────────────
  // TESTE 1: Clip legal no banco DEVE retornar USE_MATCHED_VIDEO (não Firefly)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 1/6] Validando que clip legal do banco retorna USE_MATCHED_VIDEO com score >= 0.85...');
  try {
    const industrialDir = path.join(process.cwd(), 'assets', 'video_repository', 'industrial');
    const existingFiles = fs.existsSync(industrialDir) ? fs.readdirSync(industrialDir) : [];
    const sampleFile = existingFiles.length > 0 ? `industrial/${existingFiles[0]}` : 'industrial/test.mp4';

    VideoRepositoryMatcher.registerVideo({
      id: 'LEGAL_FUEL_NOZZLE_TEST_01',
      category: 'fuel_dispenser_nozzle',
      filename: sampleFile,
      tags: ['bico', 'bomba', 'combustivel', 'gasolina', 'fuel', 'gas_station', 'tanque'],
      description: 'Bico da bomba de combustivel abastecendo no posto em 35mm',
      durationSeconds: 6.0,
      fps: 24,
      resolution: '1920x1080',
      colorTone: 'Chiaroscuro / Sodium Amber',
      domains: ['fuel', 'gas_station'],
      provenance: 'curated_broll',
      qaStatus: 'approved',
      approvedBy: 'test_suite',
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
    const approvedCatalog = VideoRepositoryMatcher.loadCatalog(true);
    const approvedFixture = approvedCatalog.videos.find(v => v.id === 'LEGAL_FUEL_NOZZLE_TEST_01');
    assert.ok(approvedFixture, 'Fixture do banco não foi registrada');
    approvedFixture.qaStatus = 'approved';
    approvedFixture.approvedBy = 'test_suite';
    approvedFixture.approvedAt = new Date().toISOString();
    VideoRepositoryMatcher.saveCatalog(approvedCatalog);

    const matchResult = VideoRepositoryMatcher.matchScene({
      sceneId: 'GAS_MATCH_TEST',
      visualSubject: 'Bico da bomba de gasolina com vazao no posto',
      requiredCategory: 'fuel_dispenser_nozzle',
      visualMustInclude: ['bico', 'bomba'],
      visualMustNot: ['cargo ship', 'warehouse conveyor'],
      domainTags: ['fuel', 'gas_station'],
      allowedSources: ['bank', 'firefly']
    }, 'smart');

    // Limpeza
    const cat = VideoRepositoryMatcher.loadCatalog(true);
    cat.videos = cat.videos.filter(v => v.id !== 'LEGAL_FUEL_NOZZLE_TEST_01');
    VideoRepositoryMatcher.saveCatalog(cat);

    if (matchResult.matched === true && matchResult.recommendedAction === 'USE_MATCHED_VIDEO') {
      console.log(`✅ TESTE 1 PASSOU: Clip legal retornou USE_MATCHED_VIDEO com sucesso (Score: ${(matchResult.matchScore * 100).toFixed(1)}%).`);
    } else {
      console.error('❌ FALHA NO TESTE 1: Clip legal não retornou USE_MATCHED_VIDEO:', matchResult);
      allPassed = false;
    }
  } catch (err: any) {
    console.error('❌ ERRO NO TESTE 1:', err.message);
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TESTE 2: Runner sem SFX reporta MISSING_STAGE: sfx e passed === false no Gate
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 2/6] Validando que ausência de SFX causa reprovação com MISSING_STAGE: sfx...');
  try {
    const report = PipelineContractGate.auditRun({
      runId: 'OOL-EP06-GASOLINA',
      contract: episodeContract,
      stageScope: 'FULL_PACKAGE'
    });

    const hasMissingSfx = report.failures.some(f => f.reason.includes('MISSING_STAGE: sfx'));

    if (!report.passed && hasMissingSfx) {
      console.log(`✅ TESTE 2 PASSOU: Gatekeeper reprovou corretamente por ausência da etapa obrigatória de SFX (passed: false).`);
    } else {
      console.error('❌ FALHA NO TESTE 2: Falha MISSING_STAGE: sfx não foi gerada:', report);
      allPassed = false;
    }
  } catch (err: any) {
    console.error('❌ ERRO NO TESTE 2:', err.message);
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TESTE 3: 10 cenas DEVE lançar TOO_FEW_SCENE_CONTRACTS antes de ElevenLabs
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 3/6] Validando interrupção prévia por TOO_FEW_SCENE_CONTRACTS com 10 cenas...');
  try {
    const tenScenes = canonicalScenes.slice(0, 10);
    let threw = false;

    try {
      buildSceneContracts(episodeContract, tenScenes);
    } catch (err: any) {
      threw = true;
      if (err.message.includes('TOO_FEW_SCENE_CONTRACTS')) {
        console.log(`✅ TESTE 3 PASSOU: Interrompido na raiz antes de qualquer chamada externa: "${err.message}"`);
      } else {
        console.error('❌ FALHA NO TESTE 3: Erro incorreto lançado:', err.message);
        allPassed = false;
      }
    }

    if (!threw) {
      console.error('❌ FALHA NO TESTE 3: buildSceneContracts não lançou TOO_FEW_SCENE_CONTRACTS!');
      allPassed = false;
    }
  } catch (err: any) {
    console.error('❌ ERRO NO TESTE 3:', err.message);
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TESTE 4: Timeline gasolina NÃO exporta 84.03 quando contratos somam 360s
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 4/6] Validando que EPISODE_GASOLINA_TOTAL_SECONDS não é mais 84.03s...');
  try {
    const totalSecs: any = EPISODE_GASOLINA_TOTAL_SECONDS;
    if (totalSecs === 360.0 && totalSecs !== 84.03) {
      console.log(`✅ TESTE 4 PASSOU: Duração canônica da gasolina ajustada para ${totalSecs.toFixed(1)}s (soma dos contratos).`);
    } else {
      console.error('❌ FALHA NO TESTE 4: Duração canônica ainda é 84.03s ou diferente de 360s:', totalSecs);
      allPassed = false;
    }
  } catch (err: any) {
    console.error('❌ ERRO NO TESTE 4:', err.message);
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TESTE 5: EpisodeGasolina.tsx NÃO importa nem renderiza Episode02SoundTrack
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 5/6] Validando isolamento total de trilha sonora em EpisodeGasolina.tsx...');
  try {
    const componentPath = path.join(process.cwd(), 'remotion', 'EpisodeGasolina.tsx');
    const content = fs.readFileSync(componentPath, 'utf8');

    if (!content.includes('Episode02SoundTrack')) {
      console.log(`✅ TESTE 5 PASSOU: EpisodeGasolina.tsx 100% livre de Episode02SoundTrack hardcoded.`);
    } else {
      console.error('❌ FALHA NO TESTE 5: Episode02SoundTrack ainda encontrado no componente Remotion!');
      allPassed = false;
    }
  } catch (err: any) {
    console.error('❌ ERRO NO TESTE 5:', err.message);
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TESTE 6: Finish legado lança erro fatal LEGACY_FINISH_DISABLED
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 6/6] Validando bloqueio estrito de finalização legada (LEGACY_FINISH_DISABLED)...');
  try {
    let threw = false;
    try {
      await legacyFinish1();
    } catch (err: any) {
      threw = true;
      if (err.message.includes('LEGACY_FINISH_DISABLED')) {
        console.log(`✅ TESTE 6 PASSOU: Script legado bloqueado com sucesso: "${err.message}"`);
      } else {
        console.error('❌ FALHA NO TESTE 6: Mensagem de erro incorreta:', err.message);
        allPassed = false;
      }
    }

    if (!threw) {
      console.error('❌ FALHA NO TESTE 6: Script legado NÃO lançou erro!');
      allPassed = false;
    }
  } catch (err: any) {
    console.error('❌ ERRO NO TESTE 6:', err.message);
    allPassed = false;
  }

  console.log('\n══════════════════════════════════════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('🎉 TODOS OS TESTES DO EPISODE PRODUCTION RUNNER PASSARAM COM SUCESSO DETERMINÍSTICO!');
    console.log('══════════════════════════════════════════════════════════════════════════════════════');
    process.exit(0);
  } else {
    console.error('❌ HOUVE FALHAS NA SUÍTE DE TESTES DO EPISODE PRODUCTION RUNNER!');
    console.log('══════════════════════════════════════════════════════════════════════════════════════');
    process.exit(1);
  }
}

runTests();
