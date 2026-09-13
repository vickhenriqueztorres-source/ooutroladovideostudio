import { NarrativeBeatSceneInput, Beat } from '../types/cinematicPlans';
import { BeatSchema, BeatsArraySchema, validateHudValueAgainstTranscript } from '../schemas/beatSchema';
import { tokenizeScriptWords, exactScriptSpan } from '../services/scriptWordSpans';
import { CinematicValidationError } from '../validators/cinematicValidationError';
import { callCodexTextClient, appendLlmCallLog } from './codexTextClient';

const BEAT_DIRECTOR_SYSTEM_PROMPT = `Você é o Diretor de Decupagem Narrativa Sênior do canal "O Outro Lado" (Hidden Systems Lab).
Sua missão é decupar o roteiro aprovado de uma cena documental investigativa em BEATS narrativos contíguos com fidelidade absoluta à regra inviolável de segmentação por beats (Dossiê do Sistema 35mm).

LEIS INVIOLÁVEIS DO BEAT DIRECTOR:
1. NÃO PRODUZIMOS CENAS, PRODUZIMOS BEATS:
   Um beat é a menor unidade de significado que a imagem precisa PROVAR.
   Em média, 15 segundos de locução contêm de 3 a 4 beats.
   - Duração mínima: 2,0 s (t_duration >= 2.0s).
   - Duração máxima: 6,0 s (t_duration <= 6.0s). Duração recomendada: 2,5s a 4,5s.

2. GATILHOS DE CORTE OBRIGATÓRIOS:
   - Número, medida ou quantidade enunciada -> corte para beat quantify (com hud_value).
   - Causa -> Efeito ("porque", "então", "isso faz com que") -> dois beats obrigatórios: causa e efeito.
   - Novo substantivo concreto entra na locução (objeto específico, componente, máquina).
   - Mudança de escala (território -> máquina -> micro componente).
   - Virada dramática (gargalo, limite físico, falha, contradição).
   - Comparação ("diferente de", "enquanto que", "ao contrário de").

3. FÓRMULA SINTÁTICA DO visual_claim:
   "O que esta imagem PROVA que a locução apenas AFIRMA?"
   Fórmula: [sujeito] [ação/estado observável] [evidência visível]
   - Mínimo de 6 palavras.
   - OBRIGATORIAMENTE pelo menos um verbo legítimo no gerúndio ou particípio (ex: "tracionando", "rompido", "girando", "acionando", "alinhada", "flexionando").
   - Substantivos terminados em -ndo/-ado/-ido (mundo, lado, estado, sentido, segundo, fundo, resultado, mercado) NÃO contam como verbo.

4. O TESTE DO ÁUDIO DESLIGADO:
   Se desligarmos o áudio da locução, o espectador DEVE compreender a física do sistema observando a imagem.
   Proibido plano-ilustração estático. O sujeito DEVE estar em ação mecânica observável.

5. REGRA SEM TEXTO NA IMAGEM:
   - visual_claim, visual_must_include e visual_must_not NUNCA podem conter texto legível, placas com texto, cartazes, legendas, rótulos, inscrições.
   - PROIBIDO dígitos numéricos (0-9) e siglas em parênteses em campos visuais. Números vão exclusivamente para hud_value!

6. FILMABILIDADE E INDICADORES FÍSICOS:
   Fenômenos invisíveis (raio-X, sinais de rádio, campo magnético, corrente elétrica, dados, fótons, feixes) NUNCA são descritos diretamente.
   Descreva sempre o INDICADOR FÍSICO: lâmpada piloto âmbar acendendo, relé de alta tensão acionando, agulha de manômetro oscilando, LED indicador piscando, cristal cintilador reagindo.

7. NÚMEROS & hud_value:
   - hud_value só pode conter valor presente literalmente em transcript_span.
   - Se a locução não disse um número no beat, hud_value DEVE ser null. PROIBIDO inventar palavras (ex: "leitura", "processamento").

8. FRONTEIRA DE RESPONSABILIDADE:
   - NUNCA mencione termos de câmera (câmera, plano, lente, tracking, push-in, estático, parada) em nenhum campo do beat. A câmera é decidida pelo ShotDirector.
   - NUNCA mencione termos de HUD, overlay, layout, texto na tela ou legenda em campos visuais do beat.

9. TIPAGEM ESTRITA:
   - narrative_function: introduce_object | explain_mechanism | quantify | compare | reveal_constraint | failure_trigger | transition | conclusion
   - evidence_mode: witness | document | route | dissection | scale
   - timing.source: "tts_word_timestamps"

10. COERÊNCIA TOTAL DE SCRIPT_SPAN E CONTIGUIDADE:
   Você receberá a lista de palavras do roteiro indexadas de [0 a N-1].
   Cada beat DEVE conter:
   - script_span: { "start_word": i, "end_word": j } (com j > i)
   - transcript_span: o texto exato correspondente às palavras [i até j-1].
   - t_start e t_end: se timestamps por palavra forem fornecidos, use exatamente o start_ms da palavra i e end_ms da palavra j-1 (convertidos em segundos: ms / 1000).
   - O primeiro beat DEVE começar em t_start = 0.0.
   - Cada beat subsequente DEVE ter t_start == beat_anterior.t_end.
   - A união de todos os beats DEVE cobrir 100% das palavras do roteiro, de 0 até N, sem buracos e sem sobreposição.

FEW-SHOT EXEMPLO DA SAÍDA JSON ESPERADA:
[
  {
    "beat_id": "RX_001_B001",
    "id": "RX_001_B001",
    "scene_id": "RX_001",
    "claim_id": "CLM_XRAY_DUAL_ENERGY",
    "narrative_function": "introduce_object",
    "evidence_mode": "scale",
    "visual_claim": "esteira transportadora com roletes metálicos tracionando carga sob iluminação prática",
    "visual_must_include": ["esteira transportadora", "roletes metálicos"],
    "visual_must_not": ["marca comercial", "texto"],
    "hud_value": "0,5 m/s",
    "script_span": { "start_word": 0, "end_word": 9 },
    "transcript_span": "Quando a esteira acelera a 0,5 metros por segundo,",
    "concept": "esteira_roletes_metalicos",
    "importance": "high",
    "emphasis": ["0,5 metros por segundo"],
    "cut_candidate": true,
    "visual_change_candidate": true,
    "t_start": 0.0,
    "t_end": 3.61,
    "timing": { "source": "tts_word_timestamps" }
  }
]

Retorne estritamente um array JSON de objetos Beat válidos, sem markdown, sem crases, sem explicações.`;

export async function callBeatDirectorModel(
  prompt: string,
  sceneInput: NarrativeBeatSceneInput,
  attempt: number = 1
): Promise<Beat[]> {
  const words = tokenizeScriptWords(sceneInput.approvedScriptText);
  const indexedWords = words.map((w, idx) => {
    const align = sceneInput.narrationAlignment?.[idx];
    return `[${idx}] "${w.text}"${align ? ` (${align.start_ms}ms -> ${align.end_ms}ms)` : ''}`;
  }).join('\n');

  const userPrompt = `ROTEIRO DA CENA (${sceneInput.sceneId}):
"${sceneInput.approvedScriptText}"

PALAVRAS INDEXADAS COM ALINHAMENTO:
${indexedWords}

METADADOS DA CENA:
- sceneId: "${sceneInput.sceneId}"
- narrativeFunction: "${sceneInput.narrativeFunction}"
- claimId: ${sceneInput.claimId ? `"${sceneInput.claimId}"` : 'null'}
- totalWords: ${words.length}

INSTRUÇÃO ATUAL:
${prompt}

Retorne estritamente um array JSON contendo os Beats da cena:`;

  const { rawOutput, cleanedJson, durationMs, responseSize } = await callCodexTextClient({
    sceneId: sceneInput.sceneId,
    agentName: 'beat_director',
    attempt,
    systemPrompt: BEAT_DIRECTOR_SYSTEM_PROMPT,
    userPrompt
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanedJson);
  } catch (err: any) {
    appendLlmCallLog({
      timestamp: new Date().toISOString(),
      scene_id: sceneInput.sceneId,
      agent: 'beat_director',
      attempt,
      duration_ms: durationMs,
      response_size: responseSize,
      parse_ok: false,
      error: `JSON_PARSE_ERROR: ${err.message}`
    });
    throw new CinematicValidationError(
      'BEAT_DIRECTOR_PARSE_FAILED',
      `Falha ao converter resposta do modelo em JSON: ${err.message}. Resposta bruta: ${rawOutput.slice(0, 300)}`
    );
  }

  // Normalização e coerência com o schema canônico
  if (Array.isArray(parsed)) {
    const offset = sceneInput.narrationAlignment?.[0]?.start_ms || 0;
    let runningEnd = 0.0;

    parsed = parsed.map((b: any, idx: number) => {
      const visual_must_include = Array.isArray(b.visual_must_include)
        ? b.visual_must_include
        : (typeof b.visual_must_include === 'string' && b.visual_must_include.trim() ? [b.visual_must_include.trim()] : ['mecanismo']);
      const visual_must_not = Array.isArray(b.visual_must_not)
        ? b.visual_must_not
        : (typeof b.visual_must_not === 'string' && b.visual_must_not.trim() ? [b.visual_must_not.trim()] : ['marcas comerciais']);

      let t_start = typeof b.t_start === 'number' ? b.t_start : (typeof b.timing?.start_s === 'number' ? b.timing.start_s : undefined);
      let t_end = typeof b.t_end === 'number' ? b.t_end : (typeof b.timing?.end_s === 'number' ? b.timing.end_s : undefined);

      if (t_start === undefined && b.script_span && sceneInput.narrationAlignment) {
        const alignStart = sceneInput.narrationAlignment[b.script_span.start_word];
        t_start = alignStart ? Number(((alignStart.start_ms - offset) / 1000).toFixed(3)) : runningEnd;
      }
      if (t_end === undefined && b.script_span && sceneInput.narrationAlignment) {
        const alignEnd = sceneInput.narrationAlignment[b.script_span.end_word - 1];
        t_end = alignEnd ? Number(((alignEnd.end_ms - offset) / 1000).toFixed(3)) : (t_start ?? 0) + 3.0;
      }

      // Garante primeiro beat em 0.0
      if (idx === 0 && (t_start === undefined || t_start < 0.05)) {
        t_start = 0.0;
      }

      runningEnd = t_end ?? runningEnd;

      // Reconstrução exata do transcript_span a partir do script_span
      let transcript_span = b.transcript_span;
      if (b.script_span && typeof b.script_span.start_word === 'number' && typeof b.script_span.end_word === 'number') {
        transcript_span = exactScriptSpan(
          sceneInput.approvedScriptText,
          words,
          b.script_span.start_word,
          b.script_span.end_word
        );
      }

      // Regra 7: Se não houver valor numérico na locução do beat, hud_value é null
      let hud_value = b.hud_value;
      if (hud_value !== null && hud_value !== undefined) {
        const hudCheck = validateHudValueAgainstTranscript(String(hud_value), transcript_span);
        if (hudCheck) {
          hud_value = null;
        }
      } else {
        hud_value = null;
      }

      // Indicador físico obrigatório em fenômenos invisíveis no visual_claim
      let visual_claim = String(b.visual_claim || 'mecanismo operando');
      const lowerClaim = visual_claim.toLowerCase();
      const hasInvisible = ['feixe', 'onda', 'sinal', 'pulso', 'energia', 'raio-x'].some((t) => lowerClaim.includes(t));
      const hasIndicator = ['lampada', 'lâmpada', 'led', 'rele', 'relé', 'ponteiro', 'display', 'painel', 'cristal', 'cintilador', 'sensor', 'medidor'].some((t) => lowerClaim.includes(t));
      if (hasInvisible && !hasIndicator) {
        visual_claim = `${visual_claim} com cristal cintilador e relé acionando sob luz prática`;
      }

      const concept = (b.concept && typeof b.concept === 'string' && /^[a-z0-9_]+$/.test(b.concept))
        ? b.concept
        : (visual_claim ? visual_claim.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) : 'mecanismo_industrial');

      const importance = (['low', 'medium', 'high'].includes(b.importance) ? b.importance : 'medium');
      const emphasis = Array.isArray(b.emphasis) ? b.emphasis : [];
      const cut_candidate = typeof b.cut_candidate === 'boolean' ? b.cut_candidate : true;
      const visual_change_candidate = typeof b.visual_change_candidate === 'boolean' ? b.visual_change_candidate : true;

      return {
        ...b,
        scene_id: b.scene_id || sceneInput.sceneId,
        claim_id: b.claim_id ?? sceneInput.claimId,
        beat_id: b.beat_id || b.id || `${sceneInput.sceneId}_B${String(idx + 1).padStart(3, '0')}`,
        id: b.id || b.beat_id || `${sceneInput.sceneId}_B${String(idx + 1).padStart(3, '0')}`,
        t_start,
        t_end,
        transcript_span,
        visual_claim,
        visual_must_include,
        visual_must_not,
        hud_value,
        concept,
        importance,
        emphasis,
        cut_candidate,
        visual_change_candidate,
        timing: {
          source: 'tts_word_timestamps',
          ...(b.timing || {})
        }
      };
    });
  }

  const result = BeatsArraySchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues || (result.error as any).errors || [];
    appendLlmCallLog({
      timestamp: new Date().toISOString(),
      scene_id: sceneInput.sceneId,
      agent: 'beat_director',
      attempt,
      duration_ms: durationMs,
      response_size: responseSize,
      parse_ok: false,
      error: `SCHEMA_ERROR: ${JSON.stringify(issues, null, 2)}`
    });
    throw new CinematicValidationError(
      'BEAT_DIRECTOR_SCHEMA_FAILED',
      `Beats gerados não atendem ao BeatsArraySchema: ${result.error.message}`,
      issues.map((e: any) => `${(e.path || []).join('.')}: ${e.message}`)
    );
  }

  appendLlmCallLog({
    timestamp: new Date().toISOString(),
    scene_id: sceneInput.sceneId,
    agent: 'beat_director',
    attempt,
    duration_ms: durationMs,
    response_size: responseSize,
    parse_ok: true,
    error: null
  });

  return result.data;
}
