import fs from 'fs';
import path from 'path';
import { NarrativeBeatDirectorAgent, BeatDirectorModelCall } from '../../hsl/cinematic/agents/narrativeBeatDirectorAgent';
import { CinematicShotDirectorAgent, ShotDirectorModelCall } from '../../hsl/cinematic/agents/cinematicShotDirectorAgent';
import { callBeatDirectorModel } from '../../hsl/cinematic/llm/beatDirectorModelClient';
import { callShotDirectorModel } from '../../hsl/cinematic/llm/shotDirectorModelClient';
import { reanchorBeatsToNarration } from '../../hsl/cinematic/services/reanchorBeats';
import { NarrativeBeatSceneInput, CinematicShotDirectorInput, Beat } from '../../hsl/cinematic/types/cinematicPlans';
import { BeatsArraySchema } from '../../hsl/cinematic/schemas/beatSchema';
import { HSL_CINEMATIC_BRAND_RULES } from '../../hsl/cinematic/config/hslCinematicShotGrammar';
import { validateShotPlan } from '../../hsl/cinematic/validators/cinematicPlanValidator';
import { aggregateEpisodeMetrics } from '../../hsl/cinematic/schemas/shotPlanSchema';

class CapturingTelemetry {
  events: any[] = [];
  emit(name: string, data: any) {
    this.events.push({ name, data });
  }
}

export async function runRealExecutionPipeline() {
  const SCRIPT = 'Quando a esteira acelera a 0,5 metros por segundo, o gerador dispara dois feixes de raio-X com energias diferentes. Isso faz com que a densidade da matéria seja calculada instantaneamente, antes mesmo da mala sair do túnel blindado.';
  const root = process.cwd();
  const alignmentPath = path.join(root, 'tests', 'fixtures', 'xray_15s.alignment.json');
  const manualBeatsPath = path.join(root, 'tests', 'fixtures', 'xray_15s.beats.json');

  const rawAlignment = JSON.parse(fs.readFileSync(alignmentPath, 'utf8'));
  const manualBeats: Beat[] = JSON.parse(fs.readFileSync(manualBeatsPath, 'utf8'));

  const beatSceneInput: NarrativeBeatSceneInput = {
    productionId: 'PROD_XRAY_D1_REAL',
    episodeId: 'raio-x-aeroporto',
    sceneId: 'RX_001',
    claimId: 'CLM_XRAY_DUAL_ENERGY',
    existingClaimIds: new Set(['CLM_XRAY_DUAL_ENERGY']),
    narrativeFunction: 'introduce_object',
    approvedScriptText: SCRIPT,
    narrationAlignment: rawAlignment
  };

  console.log('\n=================== D1. EXECUÇÃO REAL BEAT DIRECTOR ===================');
  let beatAttemptCount = 0;
  let beatAttempt1Violations: any[] = [];

  const instrumentedBeatModelCall: BeatDirectorModelCall = async (prompt, sceneInp) => {
    beatAttemptCount++;
    console.log(`[BeatDirector] Tentativa ${beatAttemptCount}...`);
    const beats = await callBeatDirectorModel(prompt, sceneInp, beatAttemptCount);
    const parse = BeatsArraySchema.safeParse(beats);
    if (!parse.success) {
      if (beatAttemptCount === 1) {
        beatAttempt1Violations = parse.error.errors;
      }
      console.log(`[BeatDirector] Tentativa ${beatAttemptCount} teve ${parse.error.errors.length} erros de schema.`);
    } else {
      console.log(`[BeatDirector] Tentativa ${beatAttemptCount} gerou ${beats.length} beats válidos!`);
    }
    return beats;
  };

  const beatAgent = new NarrativeBeatDirectorAgent(new CapturingTelemetry() as any);
  const generatedBeats = await beatAgent.generateBeats(beatSceneInput, instrumentedBeatModelCall);

  console.log(`\n[BeatDirector] Finalizado em ${beatAttemptCount} tentativa(s).`);
  console.log(`Beats gerados pelo modelo real: ${generatedBeats.length}`);
  console.log(JSON.stringify(generatedBeats, null, 2));

  // Comparação com o fixture manual
  console.log('\n=== COMPARAÇÃO COM FIXTURE MANUAL ===');
  console.log(`Quantidade: Manual=${manualBeats.length}, Gerado=${generatedBeats.length}`);
  console.log('Funções Narrativas:');
  console.log(` - Manual: ${manualBeats.map(b => b.narrative_function).join(' -> ')}`);
  console.log(` - Gerado: ${generatedBeats.map(b => b.narrative_function).join(' -> ')}`);
  console.log('Visual Claims Gerados:');
  generatedBeats.forEach((b, i) => {
    console.log(` [Beat ${i + 1}] (${b.narrative_function}): "${b.visual_claim}"`);
  });

  // Reancora para precisão exata de locução
  const reanchoredBeats = reanchorBeatsToNarration(generatedBeats, rawAlignment, SCRIPT);

  console.log('\n=================== ENCADEMENTO: BEATS REAIS -> SHOT DIRECTOR ===================');
  const shotInput: CinematicShotDirectorInput = {
    productionId: 'PROD_XRAY_D1_REAL',
    episodeId: 'raio-x-aeroporto',
    sceneId: 'RX_001',
    narrativeFunction: 'introduce_object',
    visualMode: 'licensed_real',
    narrativeIntent: 'Demonstrar a esteira acelerando a mala para dentro do túnel de inspeção enquanto o gerador de raios-x dispara fótons de dupla energia.',
    beats: reanchoredBeats,
    focusTargetCandidates: [
      'esteira transportadora industrial',
      'tubo emissor de raio-x blindado',
      'sensor linear cintilador de matriz dupla',
      'cortina de tiras plumbíferas'
    ],
    sceneContext: { chapterId: 'CH_01', chapterTitle: 'A Esteira e o Disparo' },
    brandRules: HSL_CINEMATIC_BRAND_RULES
  };

  let shotAttemptCount = 0;
  let shotAttempt1Violations: any[] = [];

  const instrumentedShotModelCall: ShotDirectorModelCall = async (prompt, bts) => {
    shotAttemptCount++;
    console.log(`[ShotDirector] Tentativa ${shotAttemptCount}...`);
    const plan = await callShotDirectorModel(prompt, bts, shotAttemptCount);
    const violations = validateShotPlan(plan, bts);
    console.log(`[ShotDirector] Tentativa ${shotAttemptCount} retornou ${plan.shots.length} shots com ${violations.length} violações.`);
    if (shotAttemptCount === 1) {
      shotAttempt1Violations = violations;
    }
    return plan;
  };

  const shotAgent = new CinematicShotDirectorAgent(new CapturingTelemetry() as any);
  const finalPlan = await shotAgent.planSceneShots(shotInput, instrumentedShotModelCall);

  console.log('\n=================== PLANO CINEMATOGRÁFICO FINAL ===================');
  console.log(`Tentativas ShotDirector: ${shotAttemptCount}`);
  console.log(JSON.stringify(finalPlan, null, 2));

  const episodeMetrics = aggregateEpisodeMetrics([finalPlan]);
  console.log('\n=== MÉTRICAS AGREGADAS DO EPISÓDIO ===');
  console.log(JSON.stringify(episodeMetrics, null, 2));

  const outPath = path.join(root, 'tests', 'fixtures', 'generated', 'xray_real_llm_result.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify({
      beatAttemptCount,
      beatAttempt1Violations,
      generatedBeats,
      shotAttemptCount,
      shotAttempt1Violations,
      finalPlan,
      episodeMetrics
    }, null, 2),
    'utf8'
  );

  return {
    generatedBeats,
    beatAttemptCount,
    beatAttempt1Violations,
    finalPlan,
    shotAttemptCount,
    shotAttempt1Violations,
    episodeMetrics
  };
}

if (process.env.HSL_RUN_REAL_LLM === '1') {
  runRealExecutionPipeline().catch((err) => {
    console.error('ERRO NA EXECUÇÃO REAL D1:', err);
    process.exit(1);
  });
}
