import {
  NARRATIVE_BEAT_SEMANTIC_FUNCTIONS,
  NarrativeBeatDirectorResult,
  NarrativeBeatImportance,
  NarrativeBeatSceneInput,
  NarrativeBeatSemanticFunction,
  NarrativeBeatV1
} from '../types/cinematicPlans';
import {CinematicTelemetryPort} from '../telemetry/cinematicTelemetry';
import {exactScriptSpan, normalizeScriptWord, tokenizeScriptWords} from '../services/scriptWordSpans';
import {validateNarrativeBeats} from '../validators/narrativeBeatValidator';
import {CinematicValidationError} from '../validators/cinematicValidationError';
import {
  Beat,
  BeatSchema,
  BeatsArraySchema,
  NarrativeFunction,
  EvidenceMode,
  postProcessBeats,
  deriveSemanticFunction
} from '../schemas/beatSchema';

const CLAUSE_STARTERS = new Set([
  'and', 'but', 'because', 'first', 'however', 'instead', 'meanwhile', 'only', 'then', 'when', 'while', 'yet',
  'e', 'mas', 'porque', 'porem', 'porém', 'contudo', 'enquanto', 'quando', 'entao', 'então', 'onde', 'ja', 'já', 'para'
]);

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'before', 'but', 'by', 'does', 'for', 'from',
  'has', 'in', 'into', 'is', 'it', 'of', 'on', 'only', 'or', 'that', 'the', 'then', 'this',
  'through', 'to', 'toward', 'was', 'when', 'with'
]);

const HIGH_FUNCTIONS = new Set<NarrativeBeatSemanticFunction>([
  'reveal_dependency', 'reveal_constraint', 'quantify', 'cause', 'consequence',
  'failure_trigger', 'propagation', 'tradeoff', 'limitation', 'interpretation', 'conclusion'
]);

function segmentWordRanges(words: ReturnType<typeof tokenizeScriptWords>): Array<readonly [number, number]> {
  const ranges: Array<readonly [number, number]> = [];
  let start = 0;
  for (let index = 0; index < words.length; index++) {
    const currentLength = index - start + 1;
    const terminal = /[.!?]["')\]]*$/.test(words[index].text);
    const clauseEnd = /[,;:]["')\]]*$/.test(words[index].text) && currentLength >= 3;
    const nextWord = words[index + 1]?.normalized;
    const beforeClause = Boolean(nextWord && CLAUSE_STARTERS.has(nextWord) && currentLength >= 4);
    const maximumLength = currentLength >= 14;
    if (terminal || clauseEnd || beforeClause || maximumLength || index === words.length - 1) {
      ranges.push([start, index + 1]);
      start = index + 1;
    }
  }
  return ranges;
}

function includesAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function semanticFunction(text: string, narrativeFunction: string): NarrativeBeatSemanticFunction {
  const normalized = text.toLowerCase();
  if (includesAny(normalized, ['in conclusion', 'ultimately', 'the hidden product', 'what this reveals'])) return 'conclusion';
  if (includesAny(normalized, ['recovers', 'recovery', 'restored', 'returns to normal'])) return 'recovery';
  if (includesAny(normalized, ['responds', 'response', 'operators react', 'backup system'])) return 'response';
  if (includesAny(normalized, ['spreads', 'propagates', 'cascades', 'travels through the system'])) return 'propagation';
  if (includesAny(normalized, ['fails', 'failure begins', 'breaks down', 'trigger'])) return 'failure_trigger';
  if (includesAny(normalized, ['as a result', 'therefore', 'consequently', 'which means'])) return 'consequence';
  if (includesAny(normalized, ['because', 'causes', 'leads to', 'drives'])) return 'cause';
  if (includesAny(normalized, ['trade-off', 'tradeoff', 'at the cost of', 'in exchange for'])) return 'tradeoff';
  if (includesAny(normalized, ['however', 'although', 'limitation', 'cannot explain'])) return 'limitation';
  if (includesAny(normalized, ['more than', 'less than', 'compared with', 'versus', 'rather than'])) return 'compare';
  if (/\b\d+(?:[.,]\d+)?%?\b/.test(normalized)) return 'quantify';
  if (includesAny(normalized, ['bottleneck', 'constraint', 'capacity limit', 'limited by', "isn't the real", 'cannot'])) return 'reveal_constraint';
  if (includesAny(normalized, ['depends on', 'requires', 'only then', 'does not move directly', 'cannot operate without'])) return 'reveal_dependency';
  if (includesAny(normalized, ['reaches', 'enters', 'passes to', 'transfers to', 'hands off'])) return 'handoff';
  if (includesAny(normalized, ['moves', 'flows', 'travels', 'continues toward', 'moves toward'])) return 'follow_flow';
  if (includesAny(normalized, ['works by', 'process', 'control', 'filtered', 'measured'])) return 'explain_mechanism';

  if ((NARRATIVE_BEAT_SEMANTIC_FUNCTIONS as readonly string[]).includes(narrativeFunction)) {
    return narrativeFunction as NarrativeBeatSemanticFunction;
  }
  return 'establish_context';
}

function conceptFor(text: string, semantic: NarrativeBeatSemanticFunction): string {
  const contentWords = tokenizeScriptWords(text)
    .map((word) =>
      word.text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z]/g, '')
    )
    .filter((word) => word && !STOP_WORDS.has(word));
  const unique = [...new Set(contentWords)].slice(0, 4);
  return unique.length ? unique.join('_') : semantic;
}

function emphasisFor(text: string): readonly string[] {
  const phrases = [
    'real bottleneck', 'only then', 'quality control', 'does not move directly',
    'cannot', 'because', 'however', 'as a result'
  ];
  const lower = text.toLowerCase();
  for (const phrase of phrases) {
    const index = lower.indexOf(phrase);
    if (index !== -1) return [text.slice(index, index + phrase.length)];
  }
  return [];
}

function importanceFor(semantic: NarrativeBeatSemanticFunction, wordCount: number): NarrativeBeatImportance {
  if (HIGH_FUNCTIONS.has(semantic)) return 'high';
  if (semantic === 'establish_context' && wordCount <= 4) return 'low';
  return 'medium';
}

function canonicalNarrativeFunction(semantic: NarrativeBeatSemanticFunction): NarrativeFunction {
  switch (semantic) {
    case 'introduce_object':
    case 'introduce_system':
    case 'establish_context':
      return 'introduce_object';
    case 'explain_mechanism':
    case 'cause':
    case 'consequence':
    case 'response':
    case 'recovery':
      return 'explain_mechanism';
    case 'quantify':
      return 'quantify';
    case 'compare':
    case 'tradeoff':
      return 'compare';
    case 'reveal_constraint':
    case 'reveal_dependency':
    case 'limitation':
      return 'reveal_constraint';
    case 'failure_trigger':
    case 'propagation':
      return 'failure_trigger';
    case 'follow_flow':
    case 'handoff':
      return 'transition';
    case 'conclusion':
    case 'interpretation':
      return 'conclusion';
    default:
      return 'explain_mechanism';
  }
}

function extractHudValue(text: string): string | null {
  const match = text.match(/\b(\d+(?:[.,]\d+)?\s*(?:m\/s|km\/h|kv|v|a|kw|kwh|hz|mhz|ghz|ms|s|min|kg|g|t|%|metros|segundos|graus|r\$))\b/i)
    || text.match(/\b(\d+(?:[.,]\d+)?)\b/);
  return match ? match[1] : null;
}

function canonicalEvidenceMode(semantic: NarrativeBeatSemanticFunction, text: string, hudValue: string | null): EvidenceMode {
  if (hudValue) return 'scale';
  switch (semantic) {
    case 'follow_flow':
    case 'handoff':
      return 'route';
    case 'explain_mechanism':
    case 'cause':
      return 'dissection';
    case 'quantify':
      return 'scale';
    case 'compare':
      return 'document';
    default:
      return 'witness';
  }
}

function synthesizeVisualClaim(text: string, semantic: NarrativeBeatSemanticFunction, concept: string): string {
  const clean = concept.replace(/_/g, ' ');
  return `painel com sensor e ${clean} operando em velocidade mecânica sob monitor e cabo conectado`;
}

export function computeTokenSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  const words2 = text2.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  if (words1.length === 0 || words2.length === 0) return 0;
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  let intersection = 0;
  for (const w of set1) {
    if (set2.has(w)) intersection++;
  }
  const union = new Set([...words1, ...words2]).size;
  return union === 0 ? 0 : Number((intersection / union).toFixed(3));
}

export class NarrativeBeatDirectorAgent {
  constructor(private readonly telemetry: CinematicTelemetryPort) {}

  public resegmentSpanWithModel(
    span: Beat,
    modelCall?: (prompt: string, span: Beat) => [Beat, Beat]
  ): [Beat, Beat] {
    if (!modelCall) {
      throw new CinematicValidationError(
        'BEAT_RESEGMENTATION_NO_MODEL',
        `Tentativa de resegmentar o span '${span.id}' (> 6s) sem modelCall fornecido.`
      );
    }

    const basePrompt = 'produza exatamente 2 beats com visual_claim distintos para este trecho';
    const MAX_ATTEMPTS = 2;
    let previousFailureReason = '';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const prompt = attempt === 2 && previousFailureReason
        ? `${basePrompt} (tentativa anterior: ${previousFailureReason})`
        : basePrompt;

      try {
        const candidateBeats = modelCall(prompt, span);

        if (!Array.isArray(candidateBeats) || candidateBeats.length !== 2) {
          previousFailureReason = 'o modelo não retornou exatamente 2 beats';
          continue;
        }
        const [b1, b2] = candidateBeats;
        BeatSchema.parse(b1);
        BeatSchema.parse(b2);

        // Contiguidade e soma == duração do span (tolerância de 50ms)
        const expectedDuration = Number((span.t_end - span.t_start).toFixed(3));
        const totalDuration = Number(((b1.t_end - b1.t_start) + (b2.t_end - b2.t_start)).toFixed(3));
        const durationMatch = Math.abs(totalDuration - expectedDuration) <= 0.05;
        if (!durationMatch) {
          previousFailureReason = `soma ${totalDuration.toFixed(1)} s != ${expectedDuration.toFixed(1)} s`;
          continue;
        }

        const contiguous = Math.abs(b2.t_start - b1.t_end) <= 0.05;
        if (!contiguous) {
          previousFailureReason = `beats não contíguos (gap/overlap de ${Math.abs(b2.t_start - b1.t_end).toFixed(2)}s)`;
          continue;
        }

        const startMatch = Math.abs(b1.t_start - span.t_start) <= 0.05;
        const endMatch = Math.abs(b2.t_end - span.t_end) <= 0.05;
        if (!startMatch || !endMatch) {
          previousFailureReason = `limites do span incompatíveis com o original`;
          continue;
        }

        // Similaridade de tokens < 60%
        const similarity = computeTokenSimilarity(b1.visual_claim, b2.visual_claim);
        if (similarity >= 0.60) {
          previousFailureReason = `similaridade ${similarity.toFixed(2)}, claims quase iguais`;
          continue;
        }

        return [b1, b2];
      } catch (err: any) {
        previousFailureReason = err instanceof Error ? err.message : String(err);
      }
    }
    throw new CinematicValidationError(
      'BEAT_RESEGMENTATION_FAILED',
      `Falha na resegmentação do beat '${span.id}' após ${MAX_ATTEMPTS} tentativas com a instrução: "${basePrompt}". Motivo da última falha: ${previousFailureReason}`
    );
  }

  public generateBeats(
    input: Readonly<NarrativeBeatSceneInput>,
    modelCall?: (prompt: string, span: Beat) => [Beat, Beat]
  ): Beat[] {
    const result = this.run(input);
    const post = postProcessBeats([...result.beats]);
    if (post.spansToResegment.length === 0) {
      return post.beats;
    }

    const finalBeats: Beat[] = [];
    for (const beat of post.beats) {
      if (post.spansToResegment.some((s) => s.id === beat.id)) {
        const [sub1, sub2] = this.resegmentSpanWithModel(beat, modelCall);
        finalBeats.push(sub1, sub2);
      } else {
        finalBeats.push(beat);
      }
    }
    BeatsArraySchema.parse(finalBeats);
    return finalBeats;
  }

  public run(input: Readonly<NarrativeBeatSceneInput>): NarrativeBeatDirectorResult {
    this.telemetry.emit('cinematic.beats.started', {
      productionId: input.productionId,
      episodeId: input.episodeId,
      sceneId: input.sceneId
    });

    try {
      const words = tokenizeScriptWords(input.approvedScriptText);
      if (words.length === 0) {
        throw new CinematicValidationError('CINEMATIC_APPROVED_SCRIPT_REQUIRED', input.sceneId);
      }
      const ranges = segmentWordRanges(words);

      let previousEnd = 0.0;
      const sceneOffsetMs = input.narrationAlignment && input.narrationAlignment.length > 0
        ? input.narrationAlignment[0].start_ms
        : 0;

      const beats: Beat[] = ranges.map(([startWord, endWord], index) => {
        const text = exactScriptSpan(input.approvedScriptText, words, startWord, endWord);
        const semantic = semanticFunction(text, input.narrativeFunction);
        const alignedStart = input.narrationAlignment?.[startWord];
        const alignedEnd = input.narrationAlignment?.[endWord - 1];

        // Regra 1: FAIL-CLOSED total em timestamps. Proibido inventar tempos ou usar fallbacks.
        if (!alignedStart || !alignedEnd) {
          throw new CinematicValidationError(
            'BEAT_ALIGNMENT_MISSING',
            JSON.stringify({ sceneId: input.sceneId, beatIndex: index })
          );
        }
        if (alignedEnd.end_ms <= alignedStart.start_ms) {
          throw new CinematicValidationError('CINEMATIC_BEAT_TIMING_INVALID', input.sceneId);
        }

        const importance = importanceFor(semantic, endWord - startWord);
        const beatId = `${input.sceneId}_B${String(index + 1).padStart(3, '0')}`;
        const hudValue = extractHudValue(text);
        const narrativeFn = canonicalNarrativeFunction(semantic);
        const evidenceMode = canonicalEvidenceMode(semantic, text, hudValue);

        // Regra 4: Contiguidade estrita relativa à cena (beats[0].t_start === 0.0)
        const tStart = index === 0 ? 0.0 : previousEnd;
        const tEnd = Number(((alignedEnd.end_ms - sceneOffsetMs) / 1000).toFixed(3));
        const finalEnd = tEnd > tStart ? tEnd : Number((tStart + 0.05).toFixed(3));
        previousEnd = finalEnd;

        const concept = conceptFor(text, semantic);
        const visualClaim = synthesizeVisualClaim(text, semantic, concept);

        return {
          id: beatId,
          beat_id: beatId,
          scene_id: input.sceneId,
          claim_id: input.claimId,
          script_span: {start_word: startWord, end_word: endWord},
          transcript_span: text,
          t_start: tStart,
          t_end: finalEnd,
          narrative_function: narrativeFn,
          evidence_mode: evidenceMode,
          visual_claim: visualClaim,
          visual_must_include: [
            `superfície observável de ${concept.replace(/_/g, ' ')} em operação`,
            `estrutura física de ancoragem com desgaste visível`
          ],
          visual_must_not: [
            `ilustração gráfica abstrata sem ancoragem física`,
            `intervenção digital desconectada da evidência documental`
          ],
          hud_value: hudValue,
          concept,
          importance,
          emphasis: [...emphasisFor(text)],
          cut_candidate: /[.!?]["')\]]*$/.test(text) || index === ranges.length - 1,
          visual_change_candidate: importance === 'high' || semantic === 'handoff',
          timing: {
            source: (alignedStart.source as any) || (input.narrationAlignment ? 'tts_word_timestamps' : 'estimated_wpm'),
            start_ms: alignedStart.start_ms,
            end_ms: alignedEnd.end_ms
          }
        };
      });

      // Validação estrita por BeatSchema
      BeatsArraySchema.parse(beats);

      const coveragePercent = validateNarrativeBeats(beats, {
        sceneId: input.sceneId,
        approvedScriptText: input.approvedScriptText,
        existingClaimIds: input.existingClaimIds,
        narrationAlignment: input.narrationAlignment
      });
      const metrics = {
        beatCount: beats.length,
        scriptWordCount: words.length,
        coveragePercent,
        cutCandidateCount: beats.filter((beat) => beat.cut_candidate).length,
        visualChangeCandidateCount: beats.filter((beat) => beat.visual_change_candidate).length,
        highImportanceCount: beats.filter((beat) => beat.importance === 'high').length,
        timingSource: beats[0]?.timing?.source || 'estimated_wpm'
      };
      const primaryBeat = beats.find((beat) => beat.importance === 'high') || beats[0];
      const derivedSemantic = deriveSemanticFunction(primaryBeat.narrative_function);
      const narrativeIntent = `Shift viewer understanding toward ${derivedSemantic.replace(/_/g, ' ')}: ${primaryBeat.concept.replace(/_/g, ' ')}.`;

      this.telemetry.emit('cinematic.beats.generated', {
        productionId: input.productionId,
        episodeId: input.episodeId,
        sceneId: input.sceneId,
        metrics
      });
      this.telemetry.emit('cinematic.beats.completed', {
        productionId: input.productionId,
        episodeId: input.episodeId,
        sceneId: input.sceneId,
        metrics
      });
      return {beats, narrativeIntent, metrics};
    } catch (error) {
      if (error instanceof CinematicValidationError) {
        this.telemetry.emit('cinematic.beats.validation_failed', {
          productionId: input.productionId,
          episodeId: input.episodeId,
          sceneId: input.sceneId,
          errorCode: error.code,
          message: error.message
        });
      }
      this.telemetry.emit('cinematic.beats.failed', {
        productionId: input.productionId,
        episodeId: input.episodeId,
        sceneId: input.sceneId,
        errorCode: error instanceof CinematicValidationError ? error.code : 'CINEMATIC_BEATS_FAILED',
        message: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
