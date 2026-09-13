import {
  NarrationAlignmentWordView,
  NarrativeBeatV1
} from '../types/cinematicPlans';
import {exactScriptSpan, normalizeScriptWord, tokenizeScriptWords} from '../services/scriptWordSpans';
import {CinematicValidationError} from './cinematicValidationError';

export interface NarrativeBeatValidationContext {
  readonly sceneId: string;
  readonly approvedScriptText: string;
  readonly existingClaimIds: ReadonlySet<string>;
  readonly narrationAlignment?: readonly NarrationAlignmentWordView[];
}

function validateAlignment(
  words: ReturnType<typeof tokenizeScriptWords>,
  alignment: readonly NarrationAlignmentWordView[]
): void {
  if (alignment.length !== words.length) {
    throw new CinematicValidationError('CINEMATIC_BEAT_TIMING_INVALID', 'alignment word count mismatch');
  }
  let previousEnd = -1;
  alignment.forEach((item, index) => {
    if (
      typeof item.word !== 'string' ||
      normalizeScriptWord(item.word) !== words[index].normalized ||
      !Number.isFinite(item.start_ms) ||
      !Number.isFinite(item.end_ms) ||
      item.start_ms < 0 ||
      item.end_ms <= item.start_ms ||
      item.start_ms < previousEnd
    ) {
      throw new CinematicValidationError('CINEMATIC_BEAT_TIMING_INVALID', `invalid alignment at word ${index}`);
    }
    previousEnd = item.end_ms;
  });
}

export function validateNarrativeBeats(
  beats: readonly NarrativeBeatV1[],
  context: Readonly<NarrativeBeatValidationContext>
): number {
  const words = tokenizeScriptWords(context.approvedScriptText);
  if (words.length === 0 || beats.length === 0) {
    throw new CinematicValidationError('CINEMATIC_BEAT_COVERAGE_INVALID', 'script and beats must be non-empty');
  }
  if (context.narrationAlignment) validateAlignment(words, context.narrationAlignment);

  let nextWord = 0;
  beats.forEach((beat, index) => {
    const expectedId = `${context.sceneId}_B${String(index + 1).padStart(3, '0')}`;
    if (
      beat.beat_id !== expectedId ||
      beat.scene_id !== context.sceneId ||
      beat.script_span.start_word !== nextWord ||
      beat.script_span.end_word <= beat.script_span.start_word ||
      beat.script_span.end_word > words.length
    ) {
      throw new CinematicValidationError('CINEMATIC_BEAT_ORDER_INVALID', expectedId);
    }

    const exactText = exactScriptSpan(
      context.approvedScriptText,
      words,
      beat.script_span.start_word,
      beat.script_span.end_word
    );
    if (beat.transcript_span !== exactText) {
      throw new CinematicValidationError('CINEMATIC_BEAT_TEXT_MISMATCH', beat.beat_id);
    }
    if (beat.claim_id !== null && !context.existingClaimIds.has(beat.claim_id)) {
      throw new CinematicValidationError('CINEMATIC_BEAT_CLAIM_INVALID', beat.claim_id);
    }
    if (beat.emphasis.some((phrase) => !beat.transcript_span.includes(phrase))) {
      throw new CinematicValidationError('CINEMATIC_BEAT_TEXT_MISMATCH', `${beat.beat_id} emphasis`);
    }

    if (context.narrationAlignment) {
      const expectedStart = context.narrationAlignment[beat.script_span.start_word].start_ms;
      const expectedEnd = context.narrationAlignment[beat.script_span.end_word - 1].end_ms;
      if (
        beat.timing.start_ms !== expectedStart ||
        beat.timing.end_ms !== expectedEnd
      ) {
        throw new CinematicValidationError('CINEMATIC_BEAT_TIMING_INVALID', beat.beat_id);
      }
    }
    nextWord = beat.script_span.end_word;
  });

  if (nextWord !== words.length) {
    throw new CinematicValidationError(
      'CINEMATIC_BEAT_COVERAGE_INVALID',
      `covered ${nextWord} of ${words.length} words`
    );
  }
  return 100;
}
