import { z } from 'zod';
import { tokenizeScriptWords, exactScriptSpan } from '../services/scriptWordSpans';
import { CinematicValidationError } from '../validators/cinematicValidationError';

export const TIMING_SOURCES = [
  'tts_word_timestamps',
  'forced_alignment',
  'estimated_wpm'
] as const;

export type TimingSource = typeof TIMING_SOURCES[number];

export const NARRATIVE_FUNCTIONS = [
  'introduce_object',
  'explain_mechanism',
  'quantify',
  'compare',
  'reveal_constraint',
  'failure_trigger',
  'transition',
  'conclusion'
] as const;

export type NarrativeFunction = typeof NARRATIVE_FUNCTIONS[number];

export const NARRATIVE_TO_SEMANTIC_MAP: Record<NarrativeFunction, string> = {
  introduce_object: 'introduce_object',
  explain_mechanism: 'explain_mechanism',
  quantify: 'quantify',
  compare: 'compare',
  reveal_constraint: 'reveal_constraint',
  failure_trigger: 'failure_trigger',
  transition: 'transition',
  conclusion: 'conclusion'
};

export function deriveSemanticFunction(narrative: NarrativeFunction): string {
  const mapped = NARRATIVE_TO_SEMANTIC_MAP[narrative];
  if (!mapped) {
    throw new Error(`UNMAPPED_NARRATIVE_FUNCTION: Não foi possível derivar semantic_function de '${narrative}'`);
  }
  return mapped;
}

export const EVIDENCE_MODES = [
  'witness',
  'document',
  'route',
  'dissection',
  'scale'
] as const;

export type EvidenceMode = typeof EVIDENCE_MODES[number];

// Mapeamento explícito e estrito: required_category / canon_category -> narrative_function
export const REQUIRED_CATEGORY_TO_NARRATIVE_FUNCTION: Record<string, NarrativeFunction> = {
  // Categorias canônicas visuais do canal
  'matter': 'introduce_object',
  'evidence': 'explain_mechanism',
  'maps': 'transition',
  'reveal': 'reveal_constraint',
  // Funções narrativas canônicas diretas
  'introduce_object': 'introduce_object',
  'explain_mechanism': 'explain_mechanism',
  'quantify': 'quantify',
  'compare': 'compare',
  'reveal_constraint': 'reveal_constraint',
  'failure_trigger': 'failure_trigger',
  'transition': 'transition',
  'conclusion': 'conclusion',
  // Extensões semânticas editoriais
  'introduce_system': 'introduce_object',
  'establish_context': 'introduce_object',
  'cause': 'explain_mechanism',
  'consequence': 'explain_mechanism',
  'response': 'explain_mechanism',
  'recovery': 'explain_mechanism',
  'tradeoff': 'compare',
  'reveal_dependency': 'reveal_constraint',
  'limitation': 'reveal_constraint',
  'propagation': 'failure_trigger',
  'follow_flow': 'transition',
  'handoff': 'transition',
  'interpretation': 'conclusion'
};

export function mapCategoryToNarrativeFunction(category: string): NarrativeFunction {
  if (!category || typeof category !== 'string') {
    throw new Error("UNMAPPED_REQUIRED_CATEGORY: categoria vazia ou inválida.");
  }
  const normalized = category.toLowerCase().trim();
  const fn = REQUIRED_CATEGORY_TO_NARRATIVE_FUNCTION[normalized];
  if (!fn) {
    throw new Error(`UNMAPPED_REQUIRED_CATEGORY: categoria '${category}' não possui mapeamento explícito para narrative_function na tabela.`);
  }
  return fn;
}

// Palavras proibidas de câmera (Fronteira de autoridade do ShotDirector)
const FORBIDDEN_CAMERA_WORDS = [
  'câmera', 'camera', 'plano', 'lente', 'tracking', 'push-in', 'estático', 'estatico', 'parada'
];

// Palavras proibidas de display, HUD e overlay na descrição de beats
const FORBIDDEN_DISPLAY_WORDS = [
  'hud', 'overlay', 'texto na tela', 'texto sobreposto', 'percentual de tela', 'legenda'
];

// Fenômenos invisíveis que não podem ser descritos diretamente sem indicador físico
const INVISIBLE_PHENOMENA_TERMS = [
  'emitindo feixe', 'onda', 'sinal', 'pulso', 'energia'
];

// Indicadores físicos observáveis
const PHYSICAL_INDICATOR_TERMS = [
  'lâmpada', 'lampada', 'led', 'relé', 'rele', 'ponteiro', 'display', 'painel',
  'cabo', 'conector', 'faísca', 'faisca', 'fumaça', 'fumaca', 'vibração', 'vibrando',
  'calor', 'aquecimento', 'cintilando', 'mostrador', 'sensor', 'leitor', 'tela', 'monitor',
  'estalando', 'acendendo', 'piscando', 'mudando', 'subindo', 'descendo', 'oscilando', 'medidor'
];

// Fabricantes e marcas comerciais proibidas
const FORBIDDEN_BRAND_TERMS = [
  'heimann', 'smiths detection', 'rapiscan', 'leidos', 'nuctech', 'cisco', 'huawei',
  'sony', 'arri', 'red', 'siemens', 'schneider', 'apple', 'samsung'
];

// Substantivos e termos falsos-positivos terminados em -ndo, -ado, -ido que NÃO são verbos
const FALSE_POSITIVE_VERB_NOUNS = new Set([
  'mundo', 'mundos',
  'lado', 'lados',
  'estado', 'estados',
  'sentido', 'sentidos',
  'segundo', 'segundos',
  'fundo', 'fundos',
  'resultado', 'resultados',
  'mercado', 'mercados',
  'dado', 'dados',
  'pedido', 'pedidos',
  'tecido', 'tecidos',
  'fluido', 'fluidos',
  'ruido', 'ruídos', 'ruidos',
  'metodo', 'método', 'metodos', 'métodos',
  'periodo', 'período', 'periodos', 'períodos'
]);

const GERUND_OR_PARTICIPLE_REGEX = /\b\w+(?:ando|endo|indo|ado|ada|ados|adas|ido|ida|idos|idas|to|ta|tos|tas|so|sa|sos|sas|posto|posta|postos|postas|feito|feita|feitos|feitas|dito|dita|ditos|ditas|aberto|aberta|abertos|abertas|rompido|rompida|rompidos|rompidas|aceso|acesa|acesos|acesas|ing|ed)\b/i;

export function hasValidGerundOrParticiple(text: string): boolean {
  // Limpa pontuação e quebra em palavras
  const words = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  for (const word of words) {
    if (FALSE_POSITIVE_VERB_NOUNS.has(word)) {
      continue;
    }
    if (GERUND_OR_PARTICIPLE_REGEX.test(word)) {
      return true;
    }
  }
  return false;
}

function containsForbiddenWord(text: string, wordList: readonly string[]): string | null {
  const lower = text.toLowerCase();
  for (const word of wordList) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lower)) return word;
  }
  return null;
}

function violatesFilmability(text: string): boolean {
  const lower = text.toLowerCase();
  const hasInvisible = INVISIBLE_PHENOMENA_TERMS.some((term) => lower.includes(term));
  if (!hasInvisible) return false;
  const hasIndicator = PHYSICAL_INDICATOR_TERMS.some((ind) => lower.includes(ind));
  return !hasIndicator;
}

// Termos proibidos pela regra SEM TEXTO NA IMAGEM (com fronteira de palavra)
const FORBIDDEN_TEXT_WORDS = [
  'inscrição', 'inscricao', 'inscrições', 'inscricoes',
  'valor numérico', 'valor numerico', 'valores numéricos', 'valores numericos',
  'marcação', 'marcacao', 'marcações', 'marcacoes',
  'escala de',
  'legenda', 'legendas',
  'rótulo', 'rotulo', 'rótulos', 'rotulos',
  'texto', 'textos',
  'placa de aviso', 'placa de avisos',
  'placa de sinalização', 'placa de sinalizacao', 'placas de sinalização', 'placas de sinalizacao',
  'placa com texto', 'placas com texto'
];

export function containsImageTextViolation(text: string): string | null {
  // 1. Contém dígitos (números)?
  if (/\d/.test(text)) {
    return 'dígitos numéricos são proibidos em campos visuais (números devem ir para hud_value)';
  }
  // 2. Contém parênteses com sigla/código? ex: (Z_eff)
  if (/\([A-Za-z0-9_ -]+\)/.test(text)) {
    return 'parênteses com sigla ou código são proibidos em campos visuais';
  }
  // 3. Contém palavras proibidas de texto/legenda/rótulo com fronteira de palavra estrita \b...\b?
  for (const phrase of FORBIDDEN_TEXT_WORDS) {
    const regex = new RegExp(`\\b${phrase}\\b`, 'i');
    if (regex.test(text)) {
      return `termo proibido de texto em imagem: '${phrase}'`;
    }
  }
  return null;
}

const NUMBER_WORDS_MAP: Record<string, string[]> = {
  '0': ['zero'],
  '0,5': ['meio', 'zero virgula cinco', 'zero vírgula cinco'],
  '0.5': ['meio', 'zero virgula cinco', 'zero vírgula cinco'],
  '1': ['um', 'uma'],
  '2': ['dois', 'duas'],
  '3': ['tres', 'três'],
  '4': ['quatro'],
  '5': ['cinco'],
  '6': ['seis'],
  '7': ['sete'],
  '8': ['oito'],
  '9': ['nove'],
  '10': ['dez'],
  '20': ['vinte'],
  '30': ['trinta'],
  '40': ['quarenta'],
  '50': ['cinquenta', 'cinqüenta'],
  '60': ['sessenta'],
  '70': ['setenta'],
  '80': ['oitenta'],
  '90': ['noventa'],
  '100': ['cem', 'cento'],
  '140': ['cento e quarenta'],
  '160': ['cento e sessenta']
};

const UNIT_WORDS_MAP: Record<string, string[]> = {
  'm/s': ['metros por segundo', 'metro por segundo', 'm/s'],
  'km/h': ['quilometros por hora', 'quilômetros por hora', 'km/h'],
  'kv': ['quilovolts', 'quilovolt', 'kilovolts', 'kilovolt', 'kv'],
  'kev': ['quiloeletronvolts', 'quiloelétron-volts', 'quiloelétron-volt', 'kev'],
  'rpm': ['rotacoes por minuto', 'rotações por minuto', 'rpm'],
  'mm': ['milimetros', 'milímetros', 'milimetro', 'milímetro', 'mm'],
  'cm': ['centimetros', 'centímetros', 'cm'],
  'm': ['metros', 'metro', 'm'],
  's': ['segundos', 'segundo', 's']
};

export function validateHudValueAgainstTranscript(hudValue: string | null, transcriptSpan: string): string | null {
  if (hudValue === null || hudValue.trim() === '') return null;
  const normTranscript = transcriptSpan
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Extrai tokens significativos do hud_value (ex: "0,5", "m/s", "140", "kV", "ORGANICO", etc.)
  const rawTokens = hudValue
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/[a-z0-9]+(?:[,.][0-9]+)?(?:\/[a-z]+)?/g) || [];

  for (const token of rawTokens) {
    // 1. Verificação direta se o token exato está na transcrição
    const tokenRegex = new RegExp(`\\b${token.replace('/', '\\/')}\\b`, 'i');
    if (tokenRegex.test(normTranscript)) {
      continue;
    }

    // 2. Mapeamento de dígitos para número por extenso
    const numberWords = NUMBER_WORDS_MAP[token];
    if (numberWords && numberWords.some((nw) => normTranscript.includes(nw))) {
      continue;
    }

    // 3. Mapeamento de unidade abreviada para termo por extenso
    const unitWords = UNIT_WORDS_MAP[token];
    if (unitWords && unitWords.some((uw) => normTranscript.includes(uw))) {
      continue;
    }

    return `Token '${token}' do hud_value não está fundamentado no transcript_span ('${transcriptSpan}')`;
  }
  return null;
}

export const BeatSchema = z.preprocess(
  (val: any) => {
    if (val && typeof val === 'object') {
      if (val.id && !val.beat_id) {
        return { ...val, beat_id: val.id };
      }
      if (!val.id && val.beat_id) {
        return { ...val, id: val.beat_id };
      }
    }
    return val;
  },
  z.object({
    id: z.string().min(1, 'id do beat é obrigatório'),
    beat_id: z.string().min(1, 'beat_id é obrigatório'), // Mantido como alias de id
    t_start: z.number().min(0, 't_start deve ser >= 0'),
    t_end: z.number().min(0, 't_end deve ser >= 0'),
    transcript_span: z.string().min(1, 'transcript_span é obrigatório'),
    narrative_function: z.enum(NARRATIVE_FUNCTIONS),
    evidence_mode: z.enum(EVIDENCE_MODES),
    visual_claim: z.string()
      .refine((val) => val.trim().split(/\s+/).filter(Boolean).length >= 6, {
        message: 'visual_claim deve conter no mínimo 6 palavras.'
      })
      .refine((val) => hasValidGerundOrParticiple(val), {
        message: 'visual_claim deve conter pelo menos um verbo legítimo no gerúndio ou particípio (substantivos em -ndo/-ado/-ido excluídos).'
      })
      .refine((val) => !containsForbiddenWord(val, FORBIDDEN_CAMERA_WORDS), {
        message: 'visual_claim não pode conter termos de câmera (fronteira de autoridade).'
      })
      .refine((val) => !containsForbiddenWord(val, FORBIDDEN_DISPLAY_WORDS), {
        message: 'visual_claim não pode conter referências a HUD, overlay, texto na tela ou legenda.'
      })
      .refine((val) => !containsForbiddenWord(val, FORBIDDEN_BRAND_TERMS), {
        message: 'visual_claim não pode conter marcas, nomes de fabricantes ou modelos comerciais.'
      })
      .refine((val) => !violatesFilmability(val), {
        message: 'visual_claim não pode citar fenômenos invisíveis (feixe, onda, sinal, pulso, energia) sem um indicador físico observável.'
      }),
    visual_must_include: z.array(
      z.string()
        .refine((val) => !containsForbiddenWord(val, FORBIDDEN_CAMERA_WORDS), {
          message: 'visual_must_include não pode conter termos de câmera.'
        })
        .refine((val) => !containsForbiddenWord(val, FORBIDDEN_DISPLAY_WORDS), {
          message: 'visual_must_include não pode conter referências a HUD, overlay ou texto na tela.'
        })
        .refine((val) => !containsForbiddenWord(val, FORBIDDEN_BRAND_TERMS), {
          message: 'visual_must_include não pode conter marcas ou nomes de fabricantes.'
        })
    ),
    visual_must_not: z.array(
      z.string()
        .refine((val) => !containsForbiddenWord(val, FORBIDDEN_CAMERA_WORDS), {
          message: 'visual_must_not não pode conter termos de câmera.'
        })
        .refine((val) => !containsForbiddenWord(val, FORBIDDEN_DISPLAY_WORDS), {
          message: 'visual_must_not não pode conter referências a HUD, overlay, percentual de tela ou legenda.'
        })
    ),
    hud_value: z.string().nullable().default(null),
    scene_id: z.string().min(1, 'scene_id é obrigatório e não pode ser vazio'),
    claim_id: z.string().nullable().default(null),
    script_span: z.object({
      start_word: z.number().int().min(0, 'start_word deve ser >= 0'),
      end_word: z.number().int().min(1, 'end_word deve ser >= 1')
    }),
    concept: z.string().min(1, 'concept é obrigatório e não pode ser vazio').regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, 'concept deve seguir snake_case'),
    importance: z.enum(['low', 'medium', 'high']),
    emphasis: z.array(z.string()),
    cut_candidate: z.boolean(),
    visual_change_candidate: z.boolean(),
    timing: z.object({
      source: z.enum(TIMING_SOURCES),
      start_ms: z.number().optional(),
      end_ms: z.number().optional()
    })
  })
  .superRefine((beat, ctx) => {
    if (beat.t_end <= beat.t_start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 't_end deve ser estritamente maior que t_start.',
        path: ['t_end']
      });
    }
    if (beat.beat_id !== beat.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'beat_id deve ser estritamente idêntico a id.',
        path: ['beat_id']
      });
    }

    if (beat.script_span.end_word <= beat.script_span.start_word) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'script_span.end_word deve ser estritamente maior que start_word.',
        path: ['script_span', 'end_word']
      });
    }

    const spanWords = beat.transcript_span.trim().split(/\s+/).filter(Boolean);
    const spanRange = beat.script_span.end_word - beat.script_span.start_word;
    if (spanWords.length !== spanRange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `script_span cobre ${spanRange} palavras [${beat.script_span.start_word}, ${beat.script_span.end_word}), mas transcript_span contém ${spanWords.length} palavras ('${beat.transcript_span}').`,
        path: ['script_span']
      });
    }

    const claimViolation = containsImageTextViolation(beat.visual_claim);
    if (claimViolation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Regra SEM TEXTO NA IMAGEM: ${claimViolation}`,
        path: ['visual_claim']
      });
    }

    beat.visual_must_include.forEach((item, index) => {
      const incViolation = containsImageTextViolation(item);
      if (incViolation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Regra SEM TEXTO NA IMAGEM em visual_must_include[${index}]: ${incViolation}`,
          path: ['visual_must_include', index]
        });
      }
    });

    beat.visual_must_not.forEach((item, index) => {
      const notViolation = containsImageTextViolation(item);
      if (notViolation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Regra SEM TEXTO NA IMAGEM em visual_must_not[${index}]: ${notViolation}`,
          path: ['visual_must_not', index]
        });
      }
    });

    if (beat.hud_value !== null) {
      const hudViolation = validateHudValueAgainstTranscript(beat.hud_value, beat.transcript_span);
      if (hudViolation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: hudViolation,
          path: ['hud_value']
        });
      }
    }
  })
);

/**
 * Valida a coerência estrita entre o script_span do beat e o approvedScriptText.
 * O trecho delimitado por [start_word, end_word) deve reconstruir exatamente transcript_span.
 */
export function assertBeatScriptSpanCoherent(beat: Beat, approvedScriptText: string): void {
  const words = tokenizeScriptWords(approvedScriptText);
  if (beat.script_span.start_word < 0 || beat.script_span.end_word > words.length) {
    throw new CinematicValidationError(
      'CINEMATIC_BEAT_SPAN_OUT_OF_BOUNDS',
      `script_span [${beat.script_span.start_word}, ${beat.script_span.end_word}) fora dos limites do script (${words.length} palavras)`
    );
  }
  const reconstructed = exactScriptSpan(
    approvedScriptText,
    words,
    beat.script_span.start_word,
    beat.script_span.end_word
  );
  if (beat.transcript_span !== reconstructed) {
    throw new CinematicValidationError(
      'CINEMATIC_BEAT_TEXT_MISMATCH',
      `transcript_span ('${beat.transcript_span}') não reconstrói o script_span ('${reconstructed}')`
    );
  }
}

export type Beat = z.infer<typeof BeatSchema>;
export type NarrativeBeatV1 = Beat;

/**
 * BeatsArraySchema com refinamento estrito de contiguidade temporal:
 * 1. beats[0].t_start deve ser 0.0 (tolerância de 50 ms / 0.05 s).
 * 2. beats[i].t_start deve ser igual a beats[i-1].t_end (tolerância de 50 ms / 0.05 s).
 * Gaps e overlaps acima de 50 ms são sumariamente rejeitados.
 */
export const BeatsArraySchema = z.array(BeatSchema).refine((beats) => {
  if (beats.length === 0) return true;
  if (Math.abs(beats[0].t_start - 0.0) > 0.05) {
    return false;
  }
  for (let i = 1; i < beats.length; i++) {
    const delta = Math.abs(beats[i].t_start - beats[i - 1].t_end);
    if (delta > 0.05) {
      return false;
    }
  }
  return true;
}, {
  message: 'BeatsArraySchema: violação de contiguidade temporal. beats[0].t_start deve ser 0.0 (tolerância 50ms) e beats[i].t_start deve ser igual a beats[i-1].t_end (tolerância 50ms). Gaps e overlaps proibidos.'
});

export interface PostProcessBeatsResult {
  beats: Beat[];
  spansToResegment: Beat[];
}

/**
 * postProcessBeats NÃO subdivide. Ele apenas:
 * (a) funde beats < 2 s com o vizinho de mesma narrative_function;
 * (b) para spans > 6 s, devolve a lista de spans a resegmentar.
 * Quem resegmenta é o agente, reenviando ao modelo com a instrução:
 * "produza 2 beats com visual_claim DISTINTOS para este trecho".
 */
export function postProcessBeats(rawBeats: Beat[]): PostProcessBeatsResult {
  if (!rawBeats || rawBeats.length === 0) {
    return { beats: [], spansToResegment: [] };
  }

  // Pass 1: Fusão de beats < 2s ao vizinho de mesma narrative_function
  const fused: Beat[] = [];
  let index = 0;

  while (index < rawBeats.length) {
    const current = { ...rawBeats[index] };
    const duration = current.t_end - current.t_start;

    if (duration < 2.0) {
      // Tenta fundir com o anterior se tiver a mesma narrative_function
      if (fused.length > 0 && fused[fused.length - 1].narrative_function === current.narrative_function) {
        const prev = fused[fused.length - 1];
        prev.t_end = current.t_end;
        prev.script_span = {
          start_word: prev.script_span.start_word,
          end_word: current.script_span.end_word
        };
        prev.transcript_span = `${prev.transcript_span} ${current.transcript_span}`.trim();
        prev.visual_must_include = Array.from(new Set([...prev.visual_must_include, ...current.visual_must_include]));
        prev.visual_must_not = Array.from(new Set([...prev.visual_must_not, ...current.visual_must_not]));
        if (!prev.hud_value && current.hud_value) {
          prev.hud_value = current.hud_value;
        }
        index++;
        continue;
      }

      // Tenta fundir com o próximo se tiver a mesma narrative_function
      if (index + 1 < rawBeats.length && rawBeats[index + 1].narrative_function === current.narrative_function) {
        const next = rawBeats[index + 1];
        next.t_start = current.t_start;
        next.script_span = {
          start_word: current.script_span.start_word,
          end_word: next.script_span.end_word
        };
        next.transcript_span = `${current.transcript_span} ${next.transcript_span}`.trim();
        next.visual_must_include = Array.from(new Set([...current.visual_must_include, ...next.visual_must_include]));
        next.visual_must_not = Array.from(new Set([...current.visual_must_not, ...next.visual_must_not]));
        if (!next.hud_value && current.hud_value) {
          next.hud_value = current.hud_value;
        }
        index++;
        continue;
      }

      // Piso de 2s sem vizinho compatível: mantém narrative_function e força evidence_mode: scale se houver hud_value
      if (current.hud_value) {
        current.evidence_mode = 'scale';
      }
    }

    fused.push(current);
    index++;
  }

  // Pass 2: Identificar spans > 6s sem subdividir aqui
  const spansToResegment: Beat[] = [];
  for (const beat of fused) {
    const duration = beat.t_end - beat.t_start;
    if (duration > 6.0) {
      spansToResegment.push(beat);
    }
  }

  return {
    beats: fused,
    spansToResegment
  };
}
