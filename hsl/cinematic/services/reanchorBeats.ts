import { Beat, BeatsArraySchema, TimingSource } from '../schemas/beatSchema';
import { NarrationAlignmentWordView } from '../types/cinematicPlans';
import { CinematicValidationError } from '../validators/cinematicValidationError';

export interface ReanchorOptions {
  readonly timingSource?: TimingSource;
}

/**
 * Reancora os beats gerados à narração real.
 * Mantém a segmentação textual (script_span), substitui t_start e t_end
 * pelos timestamps reais das palavras de fronteira e atualiza timing.source.
 */
export function reanchorBeatsToNarration(
  beats: readonly Beat[],
  realAlignment: readonly NarrationAlignmentWordView[],
  options?: ReanchorOptions
): Beat[] {
  if (!realAlignment || realAlignment.length === 0) {
    throw new CinematicValidationError(
      'BEAT_ALIGNMENT_MISSING',
      'reanchorBeatsToNarration requer alinhamento real de locução com palavras.'
    );
  }

  if (!beats || beats.length === 0) {
    return [];
  }

  const effectiveSource: TimingSource =
    options?.timingSource ||
    realAlignment[0]?.source ||
    'tts_word_timestamps';

  const reanchored: Beat[] = [];

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];
    const startIdx = beat.script_span.start_word;
    const endIdx = beat.script_span.end_word - 1;

    const startWord = realAlignment[startIdx];
    const endWord = realAlignment[endIdx];

    if (!startWord || !endWord) {
      throw new CinematicValidationError(
        'CINEMATIC_BEAT_SPAN_OUT_OF_BOUNDS',
        `Beat '${beat.id}' com span [${startIdx}, ${beat.script_span.end_word}) excede as ${realAlignment.length} palavras do alinhamento.`
      );
    }

    // Regra documental:
    // beat 0 sempre começa em 0.0 (absorve silêncio inicial)
    // beats subsequentes começam exatamente onde o anterior terminou
    let t_start: number;
    if (i === 0) {
      t_start = 0.0;
    } else {
      t_start = reanchored[i - 1].t_end;
    }

    // Regra documental:
    // Se houver próximo beat, o beat atual estende t_end até o start_ms do próximo beat
    // (absorvendo o silêncio entre palavras de beats vizinhos no beat anterior)
    let t_end: number;
    let end_ms: number;
    if (i + 1 < beats.length) {
      const nextStartIdx = beats[i + 1].script_span.start_word;
      const nextStartWord = realAlignment[nextStartIdx];
      if (nextStartWord) {
        t_end = Number((nextStartWord.start_ms / 1000).toFixed(3));
        end_ms = nextStartWord.start_ms;
      } else {
        t_end = Number((endWord.end_ms / 1000).toFixed(3));
        end_ms = endWord.end_ms;
      }
    } else {
      t_end = Number((endWord.end_ms / 1000).toFixed(3));
      end_ms = endWord.end_ms;
    }

    // Garante t_end estritamente maior que t_start
    if (t_end <= t_start) {
      t_end = Number((t_start + 0.1).toFixed(3));
    }

    reanchored.push({
      ...beat,
      t_start,
      t_end,
      timing: {
        source: effectiveSource,
        start_ms: i === 0 ? 0 : startWord.start_ms,
        end_ms
      }
    });
  }

  return BeatsArraySchema.parse(reanchored);
}
