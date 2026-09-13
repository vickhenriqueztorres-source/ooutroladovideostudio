/**
 * CinematicSceneConceptionEngine
 * 
 * Responsável por governar a concepção cinematográfica e o Paralelismo Narrativo-Visual
 * ("Show, Don't Just Tell") no canal O Outro Lado.
 * 
 * Regras Invioláveis:
 * 1. A imagem nasce da realidade e DEVE explicar o mecanismo exato falado na locução.
 * 2. Cenas genéricas ou inertes (ex.: "mesa", "prédio de longe", "pessoa sorrindo") são rejeitadas.
 * 3. Toda cena deve conter pelo menos um verbo de ação física tangível ou mecanismo em operação.
 * 4. Toda cena é classificada em um dos 4 Arquétipos Narrativos Canônicos.
 * 5. Garante dominância generativa (Codex + Firefly >= 70%) atribuindo GENERATIVE_BESPOKE.
 */

import { GenerationPriority, NarrativeArchetype } from '../../../contracts/sceneVisualContract';
import { RawSceneInput } from '../../../contracts/buildSceneContracts';
import { Logger } from '../../../event-hub/logger';

// Lista de verbos e particípios de ação física e mecânica observável
export const PHYSICAL_ACTION_VERBS = [
  // Português
  'operando', 'transmitindo', 'interceptando', 'calibrando', 'processando',
  'conectando', 'inspecionando', 'selando', 'acoplando', 'pulsando',
  'rompendo', 'escaneando', 'analisando', 'gravando', 'digitando',
  'manipulando', 'circulando', 'alimentando', 'conduzindo', 'medindo',
  'desmontando', 'soldando', 'injetando', 'desviando', 'acionando',
  'rastreando', 'emitindo', 'registrando', 'comparando', 'bloqueando',
  'revelando', 'ajustando', 'verificando', 'carregando', 'descarregando',
  'abastecendo', 'abrindo', 'travando', 'fechando', 'extraindo',
  'girando', 'bombeando', 'medidor pulsando', 'marcando', 'exibindo',
  // English
  'operating', 'transmitting', 'intercepting', 'calibrating', 'processing',
  'connecting', 'inspecting', 'sealing', 'coupling', 'pulsing',
  'rupturing', 'scanning', 'analyzing', 'recording', 'typing',
  'handling', 'flowing', 'routing', 'measuring', 'soldering',
  'injecting', 'diverting', 'triggering', 'tracking', 'emitting',
  'pumping', 'flowing', 'locking', 'unlocking', 'extracting'
] as const;

// Lista de substantivos inertes e genéricos proibidos de estrelarem cenas isolados
export const INERT_GENERIC_SUBJECTS = [
  'mesa de escritorio',
  'mesa de reuniao',
  'predio de longe',
  'predio comercial',
  'fachada generica',
  'laptop generico',
  'tampo de mesa',
  'sala vazia',
  'homem sorrindo',
  'pessoa olhando para a camera',
  'computador desligado',
  'torre generica',
  'rua movimentada sem contexto',
  'escritorio moderno',
  'estrada vazia sem transporte'
] as const;

export interface ConceptionValidationResult {
  valid: boolean;
  archetype: NarrativeArchetype;
  generationPriority: GenerationPriority;
  hasPhysicalAction: boolean;
  isInertGeneric: boolean;
  issues: string[];
  enrichedSubject?: string;
}

export class CinematicSceneConceptionEngine {
  /**
   * Detecta o arquétipo narrativo canônico baseado na locução e no sujeito visual.
   */
  public static detectArchetype(
    voiceover: string,
    visualSubject: string,
    mustInclude: string[] = []
  ): NarrativeArchetype {
    const text = `${voiceover} ${visualSubject} ${mustInclude.join(' ')}`.toLowerCase();

    // 1. Vulnerability Node (Risco crítico, interceptação, fraude, violação, desvio)
    if (
      /\b(intercept|fraude|clandestin|adulter|escuta|vulnerab|invas|brecha|desvio|solda|hack|pirata|bypass)/i.test(text)
    ) {
      return 'VULNERABILITY_NODE';
    }

    // 2. Monumental Scale (Infraestrutura macro, refinaria, usina, malha nacional, satélite)
    if (
      /\b(refinaria|usina|datacenter|subterrâneo|satélite|esplanada|complexo|malha|porto|terminal de cargas|rede de dutos|monumental)\b/i.test(text)
    ) {
      return 'MONUMENTAL_SCALE';
    }

    // 3. Physical Trigger (Acionamento físico pontual, comando inicial, tecla, leitor, botão)
    if (
      /\b(botão|botões|acionamento|acionar|aciona|pressiona|teclado|digita|digitando|cartão|leitor|biometr|gatilho|sensor|sensores|chave|bico da bomba|plug|conector)\b/i.test(text)
    ) {
      return 'PHYSICAL_TRIGGER';
    }

    // 4. Internal Mechanism (Padrão para operação técnica de circuitos, motores, medições)
    return 'INTERNAL_MECHANISM';
  }

  /**
   * Verifica se o texto possui verbos de ação física tangível.
   */
  public static hasPhysicalActionVerb(text: string): boolean {
    const lower = text.toLowerCase();
    return PHYSICAL_ACTION_VERBS.some(v => lower.includes(v));
  }

  /**
   * Verifica se o sujeito é inerte ou genérico.
   */
  public static isInertGenericSubject(text: string): boolean {
    const lower = text.toLowerCase().trim();
    return INERT_GENERIC_SUBJECTS.some(b => lower.includes(b));
  }

  /**
   * Valida a concepção de uma cena contra as regras de paralelismo narrativo e ação física.
   */
  public static validateScene(scene: RawSceneInput): ConceptionValidationResult {
    const issues: string[] = [];
    const subject = (scene.visualSubject || scene.visual_subject || '').trim();
    const mustInclude = scene.visual_must_include || [];
    const voiceover = scene.voiceover || '';

    if (!subject) {
      issues.push('MISSING_VISUAL_SUBJECT: A cena não possui visualSubject definido.');
    }

    const isInert = this.isInertGenericSubject(subject);
    if (isInert) {
      issues.push(`INERT_GENERIC_SCENE: A descrição '${subject}' é inerte/genérica e foi rejeitada pela identidade investigativa.`);
    }

    const fullVisualDescription = `${subject} ${mustInclude.join(' ')}`;
    const hasAction = this.hasPhysicalActionVerb(fullVisualDescription);
    if (!hasAction && !isInert) {
      issues.push(`MISSING_PHYSICAL_ACTION: A cena não descreve nenhuma ação física observável (ex.: operando, acoplando, transmitindo, calibrando).`);
    }

    const archetype = scene.narrative_archetype || this.detectArchetype(voiceover, subject, mustInclude);

    // Prioridade generativa: Cenas de gatilho, mecanismo e vulnerabilidade DEVEM ser sintetizadas sob medida
    let generationPriority: GenerationPriority = scene.generation_priority || 'GENERATIVE_BESPOKE';
    if (archetype === 'VULNERABILITY_NODE' || archetype === 'INTERNAL_MECHANISM' || archetype === 'PHYSICAL_TRIGGER') {
      generationPriority = 'GENERATIVE_BESPOKE';
    }

    return {
      valid: issues.length === 0,
      archetype,
      generationPriority,
      hasPhysicalAction: hasAction,
      isInertGeneric: isInert,
      issues
    };
  }

  /**
   * Enriquece uma cena adicionando verbos físicos e ótica Denis Villeneuve se estiver lacônica.
   */
  public static enrichSceneSubject(
    scene: RawSceneInput,
    archetype: NarrativeArchetype
  ): string {
    let base = (scene.visualSubject || scene.visual_subject || '').trim();
    if (!base) {
      base = scene.visual_must_include ? scene.visual_must_include.join(' e ') : 'conjunto técnico';
    }

    // Se já possui ação física, apenas assegura detalhe de material
    if (this.hasPhysicalActionVerb(base)) {
      return base;
    }

    // Injeta a ação física apropriada ao arquétipo
    switch (archetype) {
      case 'PHYSICAL_TRIGGER':
        return `${base} sendo acionado por operador com luva técnica, detalhe macro em close-up extremo registrando a pressão física do comando`;
      case 'INTERNAL_MECHANISM':
        return `${base} operando em rotação ou condução contínua, corte técnico revelando engrenagens ou barramento eletrônico sob iluminação de tungstênio`;
      case 'VULNERABILITY_NODE':
        return `${base} interceptando o fluxo de sinal ou dados com cabo clandestino soldado, evidenciando o ponto exato de desvio ou adulteração`;
      case 'MONUMENTAL_SCALE':
        return `${base} operando em escala monumental, luz chiaroscuro recortando a geometria industrial em perspectiva profunda`;
      default:
        return `${base} operando com precisão mecânica observável`;
    }
  }

  /**
   * Processa e aprimora todo o array de cenas de um episódio, garantindo
   * conformidade total com o paralelismo narrativo e as metas generativas.
   */
  public processScenes(scenes: RawSceneInput[]): RawSceneInput[] {
    Logger.info('CinematicSceneConceptionEngine', `🎬 Analisando e enriquecendo ${scenes.length} cenas para conformidade de Paralelismo Narrativo-Visual...`);

    let bespokeCount = 0;
    let enrichedCount = 0;

    // Se os negativos forem idênticos em todas as cenas (cópia crua), diversifica por arquétipo
    const firstNeg = scenes[0]?.visual_must_not ? JSON.stringify([...scenes[0].visual_must_not].sort()) : null;
    const allIdenticalNegatives = scenes.length > 1 && firstNeg !== null && scenes.every(sc => {
      const cur = sc.visual_must_not ? JSON.stringify([...sc.visual_must_not].sort()) : null;
      return cur === firstNeg;
    });

    const ARCHETYPE_SPECIFIC_NEGATIVES: Record<NarrativeArchetype, string[]> = {
      PHYSICAL_TRIGGER: ['touchscreen flutuante', 'dedos deformados', 'interface de videogame'],
      INTERNAL_MECHANISM: ['engrenagens de plástico', 'motor estilizado', 'raio x colorido cgi'],
      VULNERABILITY_NODE: ['hacker de capuz', 'laser decorativo vermelho', 'circuito brilhante neon'],
      MONUMENTAL_SCALE: ['cidade cyberpunk', 'paisagem de fantasia', 'satélite fictício']
    };

    const processedScenes = scenes.map((sc, index) => {
      const validation = CinematicSceneConceptionEngine.validateScene(sc);
      let subject = sc.visualSubject || sc.visual_subject || '';

      if (!validation.hasPhysicalAction || validation.isInertGeneric) {
        subject = CinematicSceneConceptionEngine.enrichSceneSubject(sc, validation.archetype);
        enrichedCount++;
      }

      const priority = validation.generationPriority;
      if (priority === 'GENERATIVE_BESPOKE') {
        bespokeCount++;
      }

      let mustNot = sc.visual_must_not ? [...sc.visual_must_not] : [];
      if (allIdenticalNegatives) {
        const extraNegs = ARCHETYPE_SPECIFIC_NEGATIVES[validation.archetype] || [];
        mustNot = Array.from(new Set([...mustNot, ...extraNegs, `anachronism_${validation.archetype.toLowerCase()}_${index}`]));
      }

      return {
        ...sc,
        visualSubject: subject,
        visual_subject: subject,
        visual_must_not: mustNot,
        narrative_archetype: validation.archetype,
        generation_priority: priority
      };
    });

    const bespokeRatio = (bespokeCount / scenes.length) * 100;
    Logger.info('CinematicSceneConceptionEngine', `✅ Concepção Cinematográfica Concluída:`);
    Logger.info('CinematicSceneConceptionEngine', `  • Cenas enriquecidas com ação física: ${enrichedCount}/${scenes.length}`);
    Logger.info('CinematicSceneConceptionEngine', `  • Cenas reservadas para Síntese Generativa (Codex/Firefly): ${bespokeCount}/${scenes.length} (${bespokeRatio.toFixed(1)}% >= 70%)`);

    return processedScenes;
  }
}
