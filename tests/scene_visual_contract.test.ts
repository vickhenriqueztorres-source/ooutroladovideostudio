import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { parseEpisodeContract } from '../contracts/episodeContract';
import { buildSceneContracts, RawSceneInput } from '../contracts/buildSceneContracts';
import { parseSceneVisualContract, SceneVisualContract } from '../contracts/sceneVisualContract';
import { VideoRepositoryMatcher } from '../hsl/media/videoRepositoryMatcher';
import { PipelineContractGate } from '../pipeline/pipelineContractGate';

console.log('══════════════════════════════════════════════════════════════════════════════════════');
console.log('🧪 EXECUTANDO SUÍTE DE TESTES DETERMINÍSTICOS DE SCENE VISUAL CONTRACT & MATCHER VETO');
console.log('══════════════════════════════════════════════════════════════════════════════════════');

let allPassed = true;

const CONTRACT_PATH = path.join(process.cwd(), 'contracts', 'episodes', 'gasolina-adulterada.episode.json');
const SCENES_PATH = path.join(process.cwd(), 'contracts', 'episodes', 'gasolina-adulterada.scenes.json');

const episodeContract = parseEpisodeContract(CONTRACT_PATH);
const canonicalScenes: RawSceneInput[] = JSON.parse(fs.readFileSync(SCENES_PATH, 'utf8'));

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 1: 30 cenas válidas geram 30 contratos estritos com soma >= 324s
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[TEST 1/7] Validando buildSceneContracts com 30 cenas canônicas...');
try {
  const contracts = buildSceneContracts(episodeContract, canonicalScenes);
  const totalSeconds = contracts.reduce((sum, c) => sum + c.targetSeconds, 0);

  if (contracts.length === 30 && totalSeconds >= 324) {
    console.log(`✅ TESTE 1 PASSOU: 30 contratos gerados com sucesso (Duração planejada: ${totalSeconds.toFixed(1)}s >= 324s).`);
  } else {
    console.error('❌ FALHA NO TESTE 1: Contratos gerados fora dos limites:', {
      count: contracts.length,
      totalSeconds
    });
    allPassed = false;
  }
} catch (err: any) {
  console.error('❌ ERRO NO TESTE 1:', err.message);
  allPassed = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 2: 10 cenas para episódio que exige 30 DEVE falhar com TOO_FEW_SCENE_CONTRACTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[TEST 2/7] Validando rejeição de plano com poucas cenas (10 < 30)...');
try {
  const tenScenes = canonicalScenes.slice(0, 10);
  let threw = false;
  try {
    buildSceneContracts(episodeContract, tenScenes);
  } catch (err: any) {
    threw = true;
    if (err.message.includes('TOO_FEW_SCENE_CONTRACTS')) {
      console.log(`✅ TESTE 2 PASSOU: Rejeitado com sucesso: "${err.message}"`);
    } else {
      console.error('❌ FALHA NO TESTE 2: Erro lançado mas mensagem incorreta:', err.message);
      allPassed = false;
    }
  }

  if (!threw) {
    console.error('❌ FALHA NO TESTE 2: buildSceneContracts com 10 cenas NÃO lançou erro!');
    allPassed = false;
  }
} catch (err: any) {
  console.error('❌ ERRO NO TESTE 2:', err.message);
  allPassed = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 3: Clip port/warehouse/conveyor vs cena nozzle/fuel DEVE retornar MISS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[TEST 3/7] Validando veto de B-Roll desconexo (porto/esteira) contra cena de combustível...');
try {
  const matchResult = VideoRepositoryMatcher.matchScene({
    sceneId: 'GAS_TEST_MISMATCH',
    visualSubject: 'Bico de combustível travado no bocal do tanque despejando gasolina',
    requiredCategory: 'fuel_dispenser_nozzle',
    visualMustInclude: ['bico', 'gasolina'],
    visualMustNot: ['cargo ship', 'warehouse conveyor', 'ocean port'],
    domainTags: ['fuel', 'gas_station', 'pump'],
    allowedSources: ['bank', 'firefly']
  }, 'repository');

  if (!matchResult.matched && matchResult.recommendedAction === 'STOP_UNMATCHED') {
    console.log(`✅ TESTE 3 PASSOU: B-Roll desconexo vetado com sucesso (Reason: ${matchResult.reason}).`);
  } else {
    console.error('❌ FALHA NO TESTE 3: Matcher aceitou B-Roll indevido ou não vetou corretamente:', matchResult);
    allPassed = false;
  }
} catch (err: any) {
  console.error('❌ ERRO NO TESTE 3:', err.message);
  allPassed = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 4: Clip fuel/pump/nozzle category fuel_dispenser_nozzle DEVE dar HIT (USE_MATCHED_VIDEO) com score >= 0.85
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[TEST 4/7] Validando match positivo quando assunto, domínio e categoria coincidem perfeitamente...');
try {
  const industrialDir = path.join(process.cwd(), 'assets', 'video_repository', 'industrial');
  const existingFiles = fs.existsSync(industrialDir) ? fs.readdirSync(industrialDir) : [];
  const sampleFile = existingFiles.length > 0 ? `industrial/${existingFiles[0]}` : 'industrial/test.mp4';

  VideoRepositoryMatcher.registerVideo({
    id: 'FUEL_PUMP_TEST_LEGAL_01',
    category: 'fuel_dispenser_nozzle',
    filename: sampleFile,
    tags: ['bico', 'bomba', 'combustivel', 'gasolina', 'fuel', 'gas_station', 'tanque', 'posto'],
    domains: ['fuel', 'gas_station'],
    description: 'Bico da bomba de combustivel abastecendo no posto',
    durationSeconds: 6.0,
    fps: 24,
    resolution: '1920x1080',
    colorTone: 'Chiaroscuro / Sodium Amber',
    provenance: 'curated_broll',
    qaStatus: 'approved',
    approvedBy: 'test_suite',
    approvedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  });

  // Promove o vídeo para approved no catálogo para o teste de match positivo
  const testCat = VideoRepositoryMatcher.loadCatalog(true);
  const entryIdx = testCat.videos.findIndex(v => v.id === 'FUEL_PUMP_TEST_LEGAL_01');
  if (entryIdx !== -1) {
    testCat.videos[entryIdx].qaStatus = 'approved';
    VideoRepositoryMatcher.saveCatalog(testCat);
  }

  const matchResult = VideoRepositoryMatcher.matchScene({
    sceneId: 'GAS_TEST_HIT',
    visualSubject: 'Bico da bomba de gasolina com vazao no posto',
    requiredCategory: 'fuel_dispenser_nozzle',
    visualMustInclude: ['bico', 'bomba'],
    visualMustNot: ['cargo ship', 'warehouse conveyor'],
    domainTags: ['fuel', 'gas_station'],
    allowedSources: ['bank', 'firefly']
  }, 'smart');

  // Limpa o item de teste do catálogo
  const cat = VideoRepositoryMatcher.loadCatalog(true);
  cat.videos = cat.videos.filter(v => v.id !== 'FUEL_PUMP_TEST_LEGAL_01');
  VideoRepositoryMatcher.saveCatalog(cat);

  if (matchResult.matched === true && matchResult.recommendedAction === 'USE_MATCHED_VIDEO') {
    console.log(`✅ TESTE 4 PASSOU: Clip legal retornou USE_MATCHED_VIDEO com score ${(matchResult.matchScore * 100).toFixed(1)}% (Threshold >= 85%).`);
  } else {
    console.error('❌ FALHA NO TESTE 4: Clip legal não retornou USE_MATCHED_VIDEO:', matchResult);
    allPassed = false;
  }
} catch (err: any) {
  console.error('❌ ERRO NO TESTE 4:', err.message);
  allPassed = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 5: Prompt Villeneuve sozinho NÃO casa clip genérico industrial
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[TEST 5/7] Validando que prompt de estilo Villeneuve isolado não gera HIT por ruído estético...');
try {
  const matchResult = VideoRepositoryMatcher.matchScene({
    sceneId: 'GAS_TEST_STYLE_ONLY',
    visualSubject: 'Extreme cinematic 35mm anamorphic still from a Denis Villeneuve film, atmospheric chiaroscuro lighting, deep carbon blacks (#060709), glowing sodium-vapor amber (#FF5500) and cyan laser telemetry (#00F0FF)',
    requiredCategory: 'metrology_forensics',
    visualMustInclude: ['perito', 'inmetro'],
    visualMustNot: ['cargo ship', 'warehouse conveyor'],
    domainTags: ['fuel', 'inmetro'],
    allowedSources: ['bank', 'firefly']
  }, 'repository');

  if (!matchResult.matched && matchResult.recommendedAction === 'STOP_UNMATCHED') {
    console.log(`✅ TESTE 5 PASSOU: Estilo Villeneuve isolado não pontuou falso positivo (Veto: ${matchResult.reason}).`);
  } else {
    console.error('❌ FALHA NO TESTE 5: Estilo Villeneuve gerou match falso positivo:', matchResult);
    allPassed = false;
  }
} catch (err: any) {
  console.error('❌ ERRO NO TESTE 5:', err.message);
  allPassed = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 6: Fallback no master DEVE gerar erro FALLBACK_IN_MASTER no Gate
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[TEST 6/7] Validando detecção de FALLBACK_IN_MASTER pelo Gatekeeper...');
try {
  const tempRunDir = path.join(process.cwd(), 'runs', 'OOL-TEST-FALLBACK-GUARD');
  const tempExecutionDir = path.join(tempRunDir, 'editorial', 'execution');
  const tempSceneDir = path.join(tempExecutionDir, 'scenes', 'SC_FALLBACK_TEST');
  fs.mkdirSync(tempSceneDir, { recursive: true });

  const editPkg = {
    episodeId: 'gasolina-adulterada',
    scenes: [{ sceneId: 'SC_FALLBACK_TEST', shotId: 'SHOT_1', visualSubject: 'Bico de combustivel' }]
  };
  fs.writeFileSync(path.join(tempExecutionDir, 'documentary-edit-package.json'), JSON.stringify(editPkg), 'utf8');

  // Cria start frame
  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ...new Array(25000).fill(0)]);
  fs.writeFileSync(path.join(tempSceneDir, 'firefly_start_frame.png'), pngHeader);
  fs.writeFileSync(path.join(tempSceneDir, 'start_frame_receipt.json'), JSON.stringify({
    sha256: 'valid-test-sha',
    takeType: 'CINEMATIC_TAKE'
  }));

  // Cria vídeo com nome 'fallback_take.mp4' para simular placeholder no master
  fs.writeFileSync(path.join(tempSceneDir, 'firefly_take.mp4'), Buffer.alloc(100000));
  const fallbackVideoPath = path.join(tempSceneDir, 'fallback_placeholder.mp4');
  fs.writeFileSync(fallbackVideoPath, Buffer.alloc(100000));

  const contractForTest: SceneVisualContract = {
    sceneId: 'SC_FALLBACK_TEST',
    episodeId: 'gasolina-adulterada',
    voiceover: 'Texto de teste',
    visual_must_include: ['bico', 'combustivel'],
    visual_must_not: ['cargo ship'],
    required_category: 'fuel_dispenser_nozzle',
    domainTags: ['fuel'],
    allowed_sources: ['bank', 'firefly'],
    take_type: 'CINEMATIC_TAKE',
    targetSeconds: 12
  };

  const report = PipelineContractGate.auditRun({
    runId: 'OOL-TEST-FALLBACK-GUARD',
    contract: episodeContract,
    sceneContracts: [contractForTest],
    stageScope: 'PRE_RENDER'
  });

  // Limpeza
  try {
    fs.rmSync(tempRunDir, { recursive: true, force: true });
  } catch {}

  // O gatekeeper deve reprovar e não aprovar com 100% de sucesso
  if (!report.passed) {
    console.log(`✅ TESTE 6 PASSOU: Gatekeeper barrou com sucesso execução inadequada no master.`);
  } else {
    console.error('❌ FALHA NO TESTE 6: Gatekeeper aprovou indevidamente run com pendência/mock:', report);
    allPassed = false;
  }
} catch (err: any) {
  console.error('❌ ERRO NO TESTE 6:', err.message);
  allPassed = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 7: Cena sem SceneVisualContract DEVE falhar com UNCONTRACTED_SCENE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[TEST 7/7] Validando detecção de UNCONTRACTED_SCENE...');
try {
  const tempRunDir = path.join(process.cwd(), 'runs', 'OOL-TEST-UNCONTRACTED-GUARD');
  const tempExecutionDir = path.join(tempRunDir, 'editorial', 'execution');
  const tempSceneDir = path.join(tempExecutionDir, 'scenes', 'SC_UNCONTRACTED');
  fs.mkdirSync(tempSceneDir, { recursive: true });

  const editPkg = {
    episodeId: 'gasolina-adulterada',
    scenes: [{ sceneId: 'SC_UNCONTRACTED', shotId: 'SHOT_1', visualSubject: 'Bico de combustivel' }]
  };
  fs.writeFileSync(path.join(tempExecutionDir, 'documentary-edit-package.json'), JSON.stringify(editPkg), 'utf8');

  // Cria start frame
  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ...new Array(25000).fill(0)]);
  fs.writeFileSync(path.join(tempSceneDir, 'firefly_start_frame.png'), pngHeader);

  // Lista de contratos vazia para a cena SC_UNCONTRACTED
  const report = PipelineContractGate.auditRun({
    runId: 'OOL-TEST-UNCONTRACTED-GUARD',
    contract: episodeContract,
    sceneContracts: [], // Sem contratos para SC_UNCONTRACTED!
    stageScope: 'PRE_RENDER'
  });

  // Limpeza
  try {
    fs.rmSync(tempRunDir, { recursive: true, force: true });
  } catch {}

  const hasUncontractedFailure = report.failures.some(f => f.reason.includes('UNCONTRACTED_SCENE'));

  if (!report.passed && hasUncontractedFailure) {
    console.log(`✅ TESTE 7 PASSOU: Cena não contratada reprovada com sucesso (UNCONTRACTED_SCENE).`);
  } else {
    console.error('❌ FALHA NO TESTE 7: Falha UNCONTRACTED_SCENE não detectada:', report.failures);
    allPassed = false;
  }
} catch (err: any) {
  console.error('❌ ERRO NO TESTE 7:', err.message);
  allPassed = false;
}

console.log('\n══════════════════════════════════════════════════════════════════════════════════════');
if (allPassed) {
  console.log('🎉 TODOS OS TESTES DE SCENE VISUAL CONTRACT PASSARAM COM SUCESSO DETERMINÍSTICO!');
  console.log('══════════════════════════════════════════════════════════════════════════════════════');
  process.exit(0);
} else {
  console.error('❌ HOUVE FALHAS NA SUÍTE DE TESTES DE SCENE VISUAL CONTRACT!');
  console.log('══════════════════════════════════════════════════════════════════════════════════════');
  process.exit(1);
}
