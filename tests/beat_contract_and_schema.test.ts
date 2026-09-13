import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'fs';
import path from 'path';
import {
  BeatSchema,
  BeatsArraySchema,
  postProcessBeats,
  hasValidGerundOrParticiple,
  mapCategoryToNarrativeFunction,
  containsImageTextViolation,
  validateHudValueAgainstTranscript,
  assertBeatScriptSpanCoherent,
  deriveSemanticFunction,
  Beat
} from '../hsl/cinematic/schemas/beatSchema';
import {
  NarrativeBeatDirectorAgent,
  computeTokenSimilarity
} from '../hsl/cinematic/agents/narrativeBeatDirectorAgent';
import {NarrativeBeatSceneInput} from '../hsl/cinematic/types/cinematicPlans';
import {CinematicValidationError} from '../hsl/cinematic/validators/cinematicValidationError';
import {CinematicTelemetryPort} from '../hsl/cinematic/telemetry/cinematicTelemetry';
import {reanchorBeatsToNarration} from '../hsl/cinematic/services/reanchorBeats';
import {assertBeatsTimingAnchored} from '../pipeline/canonBalanceCheck';

class SilentTelemetry implements CinematicTelemetryPort {
  emit(): void {}
}

function makeBeatInput(overrides: Record<string, any> = {}): any {
  const transcript = overrides.transcript_span ?? 'esteira acelerando em regime industrial contínuo';
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  const id = overrides.id ?? 'beat_test_01';
  return {
    id,
    beat_id: overrides.beat_id ?? id,
    scene_id: overrides.scene_id ?? 'SC_TEST_01',
    claim_id: overrides.claim_id !== undefined ? overrides.claim_id : null,
    t_start: overrides.t_start ?? 0,
    t_end: overrides.t_end ?? 3.5,
    transcript_span: transcript,
    narrative_function: overrides.narrative_function ?? 'introduce_object',
    evidence_mode: overrides.evidence_mode ?? 'witness',
    visual_claim: overrides.visual_claim ?? 'esteira tracionando bagagem pesada em alta precisão mecânica observável',
    visual_must_include: overrides.visual_must_include ?? [],
    visual_must_not: overrides.visual_must_not ?? [],
    hud_value: overrides.hud_value !== undefined ? overrides.hud_value : null,
    script_span: overrides.script_span ?? { start_word: 0, end_word: wordCount },
    concept: overrides.concept ?? 'esteira_teste',
    importance: overrides.importance ?? 'medium',
    emphasis: overrides.emphasis ?? [],
    cut_candidate: overrides.cut_candidate ?? false,
    visual_change_candidate: overrides.visual_change_candidate ?? false,
    timing: overrides.timing ?? { source: 'tts_word_timestamps' },
    ...overrides
  };
}

const baseBeat: Beat = {
  id: 'b1',
  beat_id: 'b1',
  scene_id: 'S1',
  claim_id: null,
  t_start: 0.0,
  t_end: 3.5,
  transcript_span: 'esteira acelerando',
  narrative_function: 'introduce_object',
  evidence_mode: 'witness',
  visual_claim: 'esteira tracionando bagagem pesada em alta precisão mecânica observável',
  visual_must_include: ['esteira'],
  visual_must_not: [],
  hud_value: null,
  script_span: { start_word: 0, end_word: 2 },
  concept: 'esteira',
  importance: 'medium',
  emphasis: [],
  cut_candidate: true,
  visual_change_candidate: false,
  timing: { source: 'tts_word_timestamps' }
};

test('1. hasValidGerundOrParticiple rejects nouns in -ndo/-ado/-ido (ex: o mundo no lado do mercado)', () => {
  assert.equal(hasValidGerundOrParticiple('o mundo no lado do mercado'), false);
  assert.equal(hasValidGerundOrParticiple('o estado do segundo resultado no fundo'), false);
  assert.equal(hasValidGerundOrParticiple('esteira tracionando bagagem pesada'), true);
  assert.equal(hasValidGerundOrParticiple('lacre numerado rompido sobre o chassi'), true);
});

test('2. BeatSchema rejects visual_claim with false-positive nouns', () => {
  assert.throws(() => {
    BeatSchema.parse(makeBeatInput({
      id: 'beat_fake_verbs',
      transcript_span: 'o mercado no mundo',
      visual_claim: 'o mundo no lado do mercado sem nenhuma ação presente'
    }));
  }, /verbo legítimo no gerúndio ou particípio/);
});

test('3. Rule SEM TEXTO NA IMAGEM: rejects digits, acronyms in parentheses, and forbidden words', () => {
  // Rejeita dígitos numéricos em visual_claim
  assert.throws(() => {
    BeatSchema.parse(makeBeatInput({
      id: 'b_digits',
      transcript_span: 'esteira acelerando',
      visual_claim: 'esteira acelerando a 10 metros por segundo com rotação contínua de roletes'
    }));
  }, /SEM TEXTO NA IMAGEM/);

  // Rejeita sigla ou código entre parênteses
  assert.throws(() => {
    BeatSchema.parse(makeBeatInput({
      id: 'b_sigla',
      transcript_span: 'raio-X analisando',
      visual_claim: 'monitor mostrando mapa de densidade (Z_eff) com separação espectral observável'
    }));
  }, /SEM TEXTO NA IMAGEM/);

  // Rejeita palavras proibidas: inscrição, valor numérico, marcação, escala de, legenda, rótulo, texto
  assert.throws(() => {
    BeatSchema.parse(makeBeatInput({
      id: 'b_words',
      transcript_span: 'painel aceso',
      visual_claim: 'painel com inscrição de perigo acendendo em lâmpada piloto de alta visibilidade'
    }));
  }, /SEM TEXTO NA IMAGEM/);

  assert.throws(() => {
    BeatSchema.parse(makeBeatInput({
      id: 'b_include_word',
      transcript_span: 'painel aceso',
      visual_claim: 'painel metálico industrial acendendo sob luz prática de inspeção contínua',
      visual_must_include: ['gráfico técnico com escala de intensidade']
    }));
  }, /SEM TEXTO NA IMAGEM/);

  assert.throws(() => {
    BeatSchema.parse(makeBeatInput({
      id: 'b_not_word',
      transcript_span: 'painel aceso',
      visual_claim: 'painel metálico industrial acendendo sob luz prática de inspeção contínua',
      visual_must_not: ['etiqueta com valor numérico visível']
    }));
  }, /Regra SEM TEXTO NA IMAGEM/);

  // Word boundary regex: "placa de circuito impresso" -> aceita
  assert.doesNotThrow(() => {
    BeatSchema.parse(makeBeatInput({
      id: 'b_placa_circuito',
      transcript_span: 'placa de circuito analisada',
      visual_claim: 'placa de circuito impresso com trilhas de cobre foscas operando sob inspeção direta',
      visual_must_include: ['placa de circuito impresso']
    }));
  });

  // "placa de aviso" -> rejeita
  assert.throws(() => {
    BeatSchema.parse(makeBeatInput({
      id: 'b_placa_aviso',
      transcript_span: 'placa de aviso visível',
      visual_claim: 'painel industrial exibindo placa de aviso com sinais amarelos alertando perigo mecânico'
    }));
  }, /Regra SEM TEXTO NA IMAGEM/);

  // "contexto industrial" -> aceita (não é a palavra "texto")
  assert.doesNotThrow(() => {
    BeatSchema.parse(makeBeatInput({
      id: 'b_contexto',
      transcript_span: 'contexto industrial observado',
      visual_claim: 'galpão logístico em contexto industrial operando com guindastes de esteira contínua'
    }));
  });

  // "texto no painel" -> rejeita
  assert.throws(() => {
    BeatSchema.parse(makeBeatInput({
      id: 'b_texto_painel',
      transcript_span: 'texto no painel',
      visual_claim: 'console metálico exibindo texto no painel com instruções operacionais para o usuário'
    }));
  }, /Regra SEM TEXTO NA IMAGEM/);

  // hud_value refine: "160 kV" com locução sem número -> rejeita
  assert.throws(() => {
    BeatSchema.parse(makeBeatInput({
      id: 'b_hud_unreferenced',
      transcript_span: 'o gerador dispara dois feixes de raio-X com energias diferentes.',
      visual_claim: 'tubo emissor de raios X em invólucro blindado acoplado a colimador de fenda estreita',
      hud_value: '160 kV'
    }));
  }, /não está fundamentado no transcript_span/);

  // hud_value refine: "0,5 m/s" com locução contendo o valor -> aceita
  assert.doesNotThrow(() => {
    BeatSchema.parse(makeBeatInput({
      id: 'b_hud_referenced',
      transcript_span: 'Quando a esteira acelera a 0,5 metros por segundo,',
      evidence_mode: 'scale',
      visual_claim: 'esteira transportadora industrial tracionando bagagem pesada sob luz prática de inspeção',
      hud_value: '0,5 m/s'
    }));
  });
});

test('4. BeatsArraySchema enforces contiguity: beats[0].t_start === 0.0 and no gaps/overlaps', () => {
  // Rejeita se beats[0].t_start > 0.05
  assert.throws(() => {
    BeatsArraySchema.parse([{ ...baseBeat, t_start: 0.5, t_end: 3.5 }]);
  }, /violação de contiguidade temporal/);

  // Rejeita gap de 1 s entre beats (> 50ms)
  const gap1sBeats: Beat[] = [
    { ...baseBeat, t_start: 0.0, t_end: 3.5 },
    { ...baseBeat, id: 'b2', beat_id: 'b2', t_start: 4.5, t_end: 7.0 } // gap de 1.0 s
  ];
  assert.throws(() => {
    BeatsArraySchema.parse(gap1sBeats);
  }, /violação de contiguidade temporal/);

  // Rejeita overlap de 1 s entre beats (> 50ms)
  const overlap1sBeats: Beat[] = [
    { ...baseBeat, t_start: 0.0, t_end: 3.5 },
    { ...baseBeat, id: 'b2', beat_id: 'b2', t_start: 2.5, t_end: 6.0 } // overlap de 1.0 s
  ];
  assert.throws(() => {
    BeatsArraySchema.parse(overlap1sBeats);
  }, /violação de contiguidade temporal/);

  // Válido se contíguo (delta <= 50ms)
  const validBeats: Beat[] = [
    { ...baseBeat, t_start: 0.0, t_end: 3.5 },
    { ...baseBeat, id: 'b2', beat_id: 'b2', t_start: 3.5, t_end: 6.0 }
  ];
  assert.doesNotThrow(() => BeatsArraySchema.parse(validBeats));
});

test('5. beat_id must strictly equal id (refine)', () => {
  const valid = makeBeatInput({
    id: 'beat_test_01',
    beat_id: 'beat_test_01'
  });
  assert.doesNotThrow(() => BeatSchema.parse(valid));

  // Rejeita quando beat_id !== id
  assert.throws(() => {
    BeatSchema.parse({
      ...valid,
      id: 'beat_test_01',
      beat_id: 'beat_divergente_02'
    });
  }, /beat_id deve ser estritamente idêntico a id/);
});

test('6. postProcessBeats does NOT subdivide; fuses < 2s and flags > 6s for resegmentation', () => {
  const beatsToProcess: Beat[] = [
    {
      id: 'b1',
      beat_id: 'b1',
      t_start: 0.0,
      t_end: 3.5,
      transcript_span: 'Primeiro trecho explicativo,',
      narrative_function: 'explain_mechanism',
      evidence_mode: 'witness',
      visual_claim: 'engrenagens girando em alta precisão mecânica com óleo lubrificante escorrendo',
      visual_must_include: ['engrenagem'],
      visual_must_not: [],
      hud_value: null,
      scene_id: 'SC_01',
      claim_id: null,
      script_span: { start_word: 0, end_word: 3 },
      concept: 'engrenagens_base',
      importance: 'medium',
      emphasis: [],
      cut_candidate: false,
      visual_change_candidate: false,
      timing: { source: 'tts_word_timestamps' }
    },
    {
      id: 'b2',
      beat_id: 'b2',
      t_start: 3.5,
      t_end: 4.8, // 1.3s (< 2s)
      transcript_span: 'com o rotor acoplado.',
      narrative_function: 'explain_mechanism', // Mesma função -> deve fundir
      evidence_mode: 'witness',
      visual_claim: 'rotor balanceado girando em alta rotação mecânica dentro da carcaça metálica',
      visual_must_include: ['rotor'],
      visual_must_not: [],
      hud_value: null,
      scene_id: 'SC_01',
      claim_id: null,
      script_span: { start_word: 3, end_word: 7 },
      concept: 'rotor_acoplado',
      importance: 'medium',
      emphasis: [],
      cut_candidate: false,
      visual_change_candidate: false,
      timing: { source: 'tts_word_timestamps' }
    },
    {
      id: 'b3',
      beat_id: 'b3',
      t_start: 4.8,
      t_end: 12.0, // 7.2s (> 6s) -> NÃO subdivide aqui, devolve em spansToResegment!
      transcript_span: 'Um trecho longo de narrativa contínua sem nenhum ponto de corte que ultrapassa o limite de seis segundos.',
      narrative_function: 'introduce_object',
      evidence_mode: 'witness',
      visual_claim: 'sistema de distribuição operando em regime de alta tensão com conectores blindados vibrando',
      visual_must_include: ['distribuição'],
      visual_must_not: [],
      hud_value: null,
      scene_id: 'SC_01',
      claim_id: null,
      script_span: { start_word: 7, end_word: 25 },
      concept: 'sistema_distribuicao',
      importance: 'medium',
      emphasis: [],
      cut_candidate: true,
      visual_change_candidate: false,
      timing: { source: 'tts_word_timestamps' }
    }
  ];

  const result = postProcessBeats(beatsToProcess);
  // b1 e b2 foram fundidos em 1 beat de 4.8s
  assert.equal(result.beats.length, 2);
  assert.equal(result.beats[0].id, 'b1');
  assert.equal(result.beats[0].t_end, 4.8);

  // b3 NÃO foi subdividido, mas está presente em spansToResegment
  assert.equal(result.spansToResegment.length, 1);
  assert.equal(result.spansToResegment[0].id, 'b3');
});

test('7. Model resegmentation loop: span of 9 s -> 2 beats, distinct claims (< 60% token similarity), contiguous, sum == 9 s', () => {
  const agent = new NarrativeBeatDirectorAgent(new SilentTelemetry());
  const span9s: Beat = {
    ...baseBeat,
    id: 'b_long_9s',
    beat_id: 'b_long_9s',
    t_start: 0.0,
    t_end: 9.0,
    transcript_span: 'O sistema mecânico é acionado enquanto os roletes iniciam o movimento contínuo da correia principal.',
    narrative_function: 'explain_mechanism',
    evidence_mode: 'witness',
    visual_claim: 'conjunto de engrenagens girando em alta rotação mecânica com óleo lubrificante escorrendo',
    visual_must_include: [],
    visual_must_not: [],
    hud_value: null,
    script_span: { start_word: 0, end_word: 15 },
    concept: 'sistema_mecanico',
    timing: { source: 'tts_word_timestamps' }
  };

  // Mock do modelo que atende à instrução "produza exatamente 2 beats com visual_claim distintos para este trecho"
  const mockModel = (_prompt: string, span: Beat): [Beat, Beat] => {
    return [
      {
        ...span,
        id: `${span.id}_p1`,
        beat_id: `${span.id}_p1`,
        t_start: 0.0,
        t_end: 4.5,
        transcript_span: 'O sistema mecânico é acionado',
        script_span: { start_word: 0, end_word: 5 },
        concept: 'sistema_mecanico_acionado',
        visual_claim: 'conjunto mecânico de engrenagens girando em alta rotação sob lubrificação prática contínua',
        timing: { source: 'tts_word_timestamps' }
      },
      {
        ...span,
        id: `${span.id}_p2`,
        beat_id: `${span.id}_p2`,
        t_start: 4.5,
        t_end: 9.0,
        transcript_span: 'enquanto os roletes iniciam o movimento contínuo da correia principal.',
        script_span: { start_word: 5, end_word: 15 },
        concept: 'dissipador_termico_roletes',
        visual_claim: 'superfície metálica de dissipador térmico vibrando sob fluxo de ventilação forçada',
        timing: { source: 'tts_word_timestamps' }
      }
    ];
  };

  const [b1, b2] = agent.resegmentSpanWithModel(span9s, mockModel);

  // 1. Duração somada == 9 s
  const totalDuration = (b1.t_end - b1.t_start) + (b2.t_end - b2.t_start);
  assert.equal(totalDuration, 9.0);

  // 2. Contíguos
  assert.equal(b1.t_start, 0.0);
  assert.equal(b1.t_end, 4.5);
  assert.equal(b2.t_start, 4.5);
  assert.equal(b2.t_end, 9.0);

  // 3. Similaridade de tokens < 60% (claims estritamente distintos)
  const similarity = computeTokenSimilarity(b1.visual_claim, b2.visual_claim);
  assert.ok(similarity < 0.60, `similaridade de tokens (${similarity}) deve ser menor que 0.60`);

  // 4. Válidos por schema
  assert.doesNotThrow(() => BeatsArraySchema.parse([b1, b2]));
});

test('8. Model resegmentation fails after 2 attempts -> throws BEAT_RESEGMENTATION_FAILED', () => {
  const agent = new NarrativeBeatDirectorAgent(new SilentTelemetry());
  const span9s: Beat = {
    ...baseBeat,
    id: 'b_fail_9s',
    beat_id: 'b_fail_9s',
    t_start: 0.0,
    t_end: 9.0,
    transcript_span: 'O sistema mecânico é acionado enquanto os roletes iniciam o movimento contínuo.',
    narrative_function: 'explain_mechanism',
    evidence_mode: 'witness',
    visual_claim: 'conjunto mecânico de engrenagens girando em alta rotação sob lubrificação prática contínua',
    visual_must_include: [],
    visual_must_not: [],
    hud_value: null,
    script_span: { start_word: 0, end_word: 12 },
    concept: 'sistema_mecanico_fail',
    timing: { source: 'tts_word_timestamps' }
  };

  let attempts = 0;
  const promptsReceived: string[] = [];
  // Mock que falha (retorna claims idênticos, similaridade == 1.0)
  const mockFailingModel = (prompt: string, span: Beat): [Beat, Beat] => {
    attempts++;
    promptsReceived.push(prompt);
    return [
      {
        ...span,
        id: `${span.id}_p1`,
        beat_id: `${span.id}_p1`,
        t_start: 0.0,
        t_end: 4.5,
        transcript_span: 'O sistema mecânico é acionado',
        script_span: { start_word: 0, end_word: 5 },
        concept: 'sistema_parte_um',
        visual_claim: 'conjunto mecânico de engrenagens girando em alta rotação sob lubrificação prática contínua',
        timing: { source: 'tts_word_timestamps' }
      },
      {
        ...span,
        id: `${span.id}_p2`,
        beat_id: `${span.id}_p2`,
        t_start: 4.5,
        t_end: 9.0,
        transcript_span: 'enquanto os roletes iniciam o movimento contínuo.',
        script_span: { start_word: 5, end_word: 12 },
        concept: 'sistema_parte_dois',
        visual_claim: 'conjunto mecânico de engrenagens girando em alta rotação sob lubrificação prática contínua', // Idêntico!
        timing: { source: 'tts_word_timestamps' }
      }
    ];
  };

  assert.throws(() => {
    agent.resegmentSpanWithModel(span9s, mockFailingModel);
  }, (err: any) => {
    assert.ok(err instanceof CinematicValidationError);
    assert.equal(err.code, 'BEAT_RESEGMENTATION_FAILED');
    return true;
  });

  // Garante que tentou exatamente o máximo de 2 tentativas
  assert.equal(attempts, 2);
  // Garante que na 2ª tentativa anexou o motivo da falha da 1ª
  assert.match(promptsReceived[1], /tentativa anterior: similaridade 1.00, claims quase iguais/);
});

test('9. mapCategoryToNarrativeFunction: explicit table mapping and throws on unmapped', () => {
  assert.equal(mapCategoryToNarrativeFunction('matter'), 'introduce_object');
  assert.equal(mapCategoryToNarrativeFunction('evidence'), 'explain_mechanism');
  assert.equal(mapCategoryToNarrativeFunction('maps'), 'transition');
  assert.equal(mapCategoryToNarrativeFunction('reveal'), 'reveal_constraint');
  assert.equal(mapCategoryToNarrativeFunction('quantify'), 'quantify');

  // Categoria sem mapeamento explícito DEVE lançar erro e NÃO cair em default
  assert.throws(
    () => mapCategoryToNarrativeFunction('categoria_desconhecida_sem_mapeamento'),
    /UNMAPPED_REQUIRED_CATEGORY/
  );
});

test('10. Demonstration beats from tests/fixtures/xray_15s.beats.json conform 100% to BeatsArraySchema', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'xray_15s.beats.json');
  const rawText = fs.readFileSync(fixturePath, 'utf8');
  const demonstrationBeats: Beat[] = JSON.parse(rawText);

  const result = BeatsArraySchema.safeParse(demonstrationBeats);
  if (!result.success) {
    console.error('TEST_10_ISSUES:', JSON.stringify(result.error.issues, null, 2));
  }
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.length, 4);
    assert.equal(result.data[0].id, 'beat_001');
    assert.equal(result.data[0].hud_value, '0,5 m/s');
    assert.equal(result.data[0].scene_id, 'RX_001');
    assert.equal(result.data[0].timing.source, 'tts_word_timestamps');
    assert.equal(result.data[1].id, 'beat_002');
    assert.equal(result.data[1].hud_value, null);
    assert.equal(result.data[2].id, 'beat_003');
    assert.equal(result.data[2].hud_value, null);
    assert.equal(result.data[3].id, 'beat_004');
    assert.equal(result.data[3].hud_value, null);
  }
});

test('11. resegmentSpanWithModel sem modelCall lança BEAT_RESEGMENTATION_NO_MODEL', () => {
  const agent = new NarrativeBeatDirectorAgent(new SilentTelemetry());
  const span9s: Beat = {
    ...baseBeat,
    id: 'b_no_model',
    beat_id: 'b_no_model',
    t_start: 0.0,
    t_end: 9.0,
    transcript_span: 'O sistema mecânico é acionado enquanto os roletes iniciam o movimento contínuo.',
    narrative_function: 'explain_mechanism',
    evidence_mode: 'witness',
    visual_claim: 'conjunto mecânico de engrenagens girando em alta rotação sob lubrificação prática contínua',
    visual_must_include: [],
    visual_must_not: [],
    hud_value: null,
    script_span: { start_word: 0, end_word: 11 },
    concept: 'sistema_mecanico_no_model',
    timing: { source: 'tts_word_timestamps' }
  };
  assert.throws(() => {
    agent.resegmentSpanWithModel(span9s, undefined);
  }, (err: any) => {
    assert.ok(err instanceof CinematicValidationError);
    assert.equal(err.code, 'BEAT_RESEGMENTATION_NO_MODEL');
    return true;
  });
});

test('12. generateBeats end-to-end: cena com span de 9s -> saída tem N+1 beats contíguos e BeatsArraySchema ok', () => {
  const agent = new NarrativeBeatDirectorAgent(new SilentTelemetry());
  const mockModel = (_prompt: string, span: Beat): [Beat, Beat] => {
    const midSec = Number(((span.t_start + span.t_end) / 2).toFixed(3));
    const words = span.transcript_span.split(/\s+/).filter(Boolean);
    const midWord = Math.max(1, Math.floor(words.length / 2));
    const span1 = words.slice(0, midWord).join(' ');
    const span2 = words.slice(midWord).join(' ');
    const b1: Beat = {
      ...span,
      id: `${span.id}_p1`,
      beat_id: `${span.id}_p1`,
      t_start: span.t_start,
      t_end: midSec,
      transcript_span: span1,
      script_span: {
        start_word: span.script_span.start_word,
        end_word: span.script_span.start_word + midWord
      },
      concept: 'conjunto_rolete_dentado',
      visual_claim: 'conjunto mecânico de roletes tracionando correia dentada sob iluminação industrial prática',
      hud_value: null,
      timing: { source: 'tts_word_timestamps' }
    };
    const b2: Beat = {
      ...span,
      id: `${span.id}_p2`,
      beat_id: `${span.id}_p2`,
      t_start: midSec,
      t_end: span.t_end,
      transcript_span: span2,
      script_span: {
        start_word: span.script_span.start_word + midWord,
        end_word: span.script_span.end_word
      },
      concept: 'chassi_estrutural_juncao',
      visual_claim: 'superfície metálica de chassi estrutural registrando desgaste abrasivo na junção mecânica',
      hud_value: null,
      timing: { source: 'tts_word_timestamps' }
    };
    return [b1, b2];
  };

  const scriptText = 'Primeira introdução mecânica aqui. ' +
    'Engrenagem central operando silenciosamente com velocidade angular calibrada ' +
    'concluindo o processo de inspeção.';
  const words = scriptText.split(/\s+/).filter(Boolean);

  // 4 palavras na intro (0-3s), 8 palavras no meio (3-12s, durando 9.0s), 5 palavras no fim (12-16s)
  const narrationAlignment = words.map((word, idx) => {
    let start_ms = 0;
    let end_ms = 0;
    if (idx < 4) {
      start_ms = idx * 750;
      end_ms = (idx + 1) * 750;
    } else if (idx < 12) {
      start_ms = 3000 + (idx - 4) * 1125;
      end_ms = 3000 + (idx - 3) * 1125;
    } else {
      start_ms = 12000 + (idx - 12) * 800;
      end_ms = 12000 + (idx - 11) * 800;
    }
    return { word, start_ms, end_ms };
  });

  const input: NarrativeBeatSceneInput = {
    productionId: 'PROD_GEN_BEATS_E2E',
    episodeId: 'EP_01',
    sceneId: 'SC_E2E_01',
    claimId: null,
    existingClaimIds: new Set(),
    narrativeFunction: 'explain_mechanism',
    approvedScriptText: scriptText,
    narrationAlignment
  };

  const initialBeats = agent.run(input).beats;
  const initialCount = initialBeats.length;

  const beats = agent.generateBeats(input, mockModel);
  // O span > 6s foi subdividido em 2, portanto N+1 beats
  assert.equal(beats.length, initialCount + 1);
  assert.doesNotThrow(() => BeatsArraySchema.parse(beats));
});

test('13. script_span negative test: displaced span or word count mismatch is strictly rejected', () => {
  const scriptText = 'Quando a esteira acelera a 0,5 metros por segundo, o gerador dispara dois feixes.';

  // 1. BeatSchema.safeParse rejeita quando script_span não coincide com a contagem de palavras do transcript_span
  const countMismatch = BeatSchema.safeParse(makeBeatInput({
    transcript_span: 'esteira acelerando aqui agora', // 4 palavras
    script_span: { start_word: 0, end_word: 6 } // span de 6 palavras
  }));
  assert.equal(countMismatch.success, false);
  if (!countMismatch.success) {
    assert.match(countMismatch.error.issues[0].message, /script_span cobre 6 palavras/);
  }

  // 2. assertBeatScriptSpanCoherent rejeita quando o span aponta para palavras diferentes no script
  const displacedBeat: Beat = {
    ...baseBeat,
    transcript_span: 'Quando a esteira acelera a',
    script_span: { start_word: 5, end_word: 10 } // aponta para 'por segundo, o gerador dispara'
  };
  assert.throws(() => {
    assertBeatScriptSpanCoherent(displacedBeat, scriptText);
  }, /não reconstrói o script_span/);

  // 3. assertBeatScriptSpanCoherent rejeita quando start_word / end_word ultrapassam o script
  const outOfBoundsBeat: Beat = {
    ...baseBeat,
    transcript_span: 'Quando a esteira',
    script_span: { start_word: 20, end_word: 23 }
  };
  assert.throws(() => {
    assertBeatScriptSpanCoherent(outOfBoundsBeat, scriptText);
  }, /fora dos limites do script/);
});

test('14. reanchorBeatsToNarration: word 4 taking 900ms instead of 500ms shifts t_end of beat 1 to 2.4s and shifts following beat', () => {
  const words = ['quando', 'a', 'esteira', 'acelera', 'o', 'gerador', 'dispara', 'feixes'];
  // Palavras 0..3 pertencem ao Beat 1; Palavras 4..7 pertencem ao Beat 2.
  // Palavra 3 (a 4ª palavra) demorou 900 ms (de 1500 a 2400 ms) em vez dos 500 ms originais.
  const realAlignment = [
    { word: 'quando', start_ms: 0, end_ms: 500, source: 'tts_word_timestamps' as const },
    { word: 'a', start_ms: 500, end_ms: 1000, source: 'tts_word_timestamps' as const },
    { word: 'esteira', start_ms: 1000, end_ms: 1500, source: 'tts_word_timestamps' as const },
    { word: 'acelera', start_ms: 1500, end_ms: 2400, source: 'tts_word_timestamps' as const }, // 900 ms de duração!
    { word: 'o', start_ms: 2400, end_ms: 2900, source: 'tts_word_timestamps' as const },
    { word: 'gerador', start_ms: 2900, end_ms: 3400, source: 'tts_word_timestamps' as const },
    { word: 'dispara', start_ms: 3400, end_ms: 3900, source: 'tts_word_timestamps' as const },
    { word: 'feixes', start_ms: 3900, end_ms: 4400, source: 'tts_word_timestamps' as const }
  ];

  const beats: Beat[] = [
    {
      ...baseBeat,
      id: 'beat_01',
      beat_id: 'beat_01',
      t_start: 0.0,
      t_end: 2.0, // Estimativa anterior: 4 palavras * 500ms = 2.0s
      transcript_span: 'quando a esteira acelera',
      script_span: { start_word: 0, end_word: 4 },
      concept: 'esteira_acelera',
      timing: { source: 'estimated_wpm' }
    },
    {
      ...baseBeat,
      id: 'beat_02',
      beat_id: 'beat_02',
      t_start: 2.0,
      t_end: 4.0, // Estimativa anterior: 4 palavras * 500ms = 2.0s
      transcript_span: 'o gerador dispara feixes',
      script_span: { start_word: 4, end_word: 8 },
      concept: 'gerador_dispara',
      timing: { source: 'estimated_wpm' }
    }
  ];

  const reanchored = reanchorBeatsToNarration(beats, realAlignment);

  assert.equal(reanchored.length, 2);
  // Beat 1 mudou de 2.0s para 2.4s
  assert.equal(reanchored[0].t_start, 0.0);
  assert.equal(reanchored[0].t_end, 2.4);
  assert.equal(reanchored[0].timing.source, 'tts_word_timestamps');

  // Beat 2 se deslocou proporcionalmente e inicia em 2.4s, terminando em 4.4s
  assert.equal(reanchored[1].t_start, 2.4);
  assert.equal(reanchored[1].t_end, 4.4);
  assert.equal(reanchored[1].timing.source, 'tts_word_timestamps');

  // Contiguidade perfeita preservada
  assert.doesNotThrow(() => BeatsArraySchema.parse(reanchored));
});

test('15. Gate TIMING_NOT_ANCHORED aborts in production mode and passes in shadow/dry-run mode', () => {
  const estimatedBeats = [
    { id: 'b_est', beat_id: 'b_est', timing: { source: 'estimated_wpm' } }
  ];
  const realBeats = [
    { id: 'b_real', beat_id: 'b_real', timing: { source: 'tts_word_timestamps' } }
  ];

  // 1. Em modo produção (isProduction: true), aborta com erro TIMING_NOT_ANCHORED
  assert.throws(() => {
    assertBeatsTimingAnchored(estimatedBeats, { isProduction: true });
  }, /TIMING_NOT_ANCHORED: Beats ainda usam estimativa WPM. Execute a locução real antes de produzir os planos/);

  // 2. Em modo shadow ou dry-run, tolera timing estimado sem lançar erro
  assert.doesNotThrow(() => {
    assertBeatsTimingAnchored(estimatedBeats, { dryRun: true });
  });
  assert.doesNotThrow(() => {
    assertBeatsTimingAnchored(estimatedBeats, { isShadow: true });
  });

  // 3. Com beats reais ancorados, passa em qualquer modo
  assert.doesNotThrow(() => {
    assertBeatsTimingAnchored(realBeats, { isProduction: true });
  });
});
