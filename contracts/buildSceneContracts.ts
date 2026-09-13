import { EpisodeContract } from './episodeContract';
import {
  SceneVisualContract,
  parseSceneVisualContract,
  AllowedVisualSource,
  TakeType,
  VisualAssetClass,
  GenerationPriority,
  NarrativeArchetype
} from './sceneVisualContract';

export interface RawSceneInput {
  sceneId: string;
  voiceover: string;
  visualSubject?: string;
  visual_subject?: string;
  visual_must_include?: string[];
  visual_must_not?: string[];
  required_category?: string;
  domainTags?: string[];
  allowed_sources?: AllowedVisualSource[];
  take_type?: TakeType;
  generation_priority?: GenerationPriority;
  narrative_archetype?: NarrativeArchetype;
  targetSeconds?: number;
  chapterId?: string;
  chapterTitle?: string;
  visual_asset_class?: VisualAssetClass;
  canon_category?: 'matter' | 'evidence' | 'maps' | 'reveal';
  narration_alignment?: Array<{
    word: string;
    start_ms: number;
    end_ms: number;
    source?: string;
  }>;
}

const NO_STAGED_STOCK_PORTRAITS_DENYLIST = [
  'smiling person looking at camera',
  'presenter addressing camera',
  'commercial stock model portrait',
  'posed business portrait',
  'smiling face into camera',
  'influencer smiling selfie',
  'staged commercial advertisement photography'
];

const VISUAL_MIX_KEY_BY_CLASS: Record<VisualAssetClass, 'realisticImages' | 'videos' | 'motionGraphics' | 'motionImages'> = {
  REALISTIC_IMAGE: 'realisticImages',
  VIDEO: 'videos',
  MOTION_GRAPHICS: 'motionGraphics',
  MOTION_IMAGE: 'motionImages'
};

const GENERIC_FORBIDDEN_WORDS = new Set([
  'industrial',
  'cinematic',
  '35mm',
  'film',
  'shot',
  'take',
  'extreme',
  'realistic',
  'photography',
  'scene',
  'image',
  'video'
]);

const STANDARD_POLLUTION_DENYLIST = [
  'cargo ship',
  'warehouse conveyor',
  'water tank rooftop',
  'cell tower skyline',
  'favela panorama',
  'ocean port',
  'conveyor belt'
];

function extractKeywordsFromSubject(subject: string): string[] {
  const normalized = subject
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !GENERIC_FORBIDDEN_WORDS.has(w));

  return Array.from(new Set(normalized));
}

function deriveCategoryFromSubject(subject: string, domainTags: string[]): string {
  const normalized = subject.toLowerCase();
  if (normalized.includes('bico') || normalized.includes('nozzle') || normalized.includes('abastece')) {
    return 'fuel_dispenser_nozzle';
  }
  if (normalized.includes('painel') || normalized.includes('cluster') || normalized.includes('dashboard') || normalized.includes('ponteiro')) {
    return 'vehicle_dashboard';
  }
  if (normalized.includes('medidor') || normalized.includes('pist') || normalized.includes('vazao') || normalized.includes('bloco')) {
    return 'flow_meter_mechanism';
  }
  if (normalized.includes('pulso') || normalized.includes('sensor') || normalized.includes('hall') || normalized.includes('disco')) {
    return 'pulse_sensor_assembly';
  }
  if (normalized.includes('chip') || normalized.includes('placa') || normalized.includes('pcb') || normalized.includes('circuito') || normalized.includes('solda')) {
    return 'rogue_microchip_pcb';
  }
  if (normalized.includes('inmetro') || normalized.includes('fiscal') || normalized.includes('lacre') || normalized.includes('aferidor') || normalized.includes('perito')) {
    return 'metrology_forensics';
  }
  if (normalized.includes('posto') || normalized.includes('combustivel') || normalized.includes('tanque') || normalized.includes('bomba')) {
    return 'fuel_station_infrastructure';
  }
  
  const primaryDomain = domainTags.find(t => t !== 'industrial' && t.length > 2) || 'fuel_system';
  return `${primaryDomain}_subsystem`;
}

export function buildSceneContracts(
  episodeContract: EpisodeContract,
  scenes: RawSceneInput[]
): SceneVisualContract[] {
  if (!scenes || scenes.length < episodeContract.minScenes) {
    throw new Error(
      `TOO_FEW_SCENE_CONTRACTS: O episódio '${episodeContract.episodeId}' exige no mínimo ${episodeContract.minScenes} contratos de cena, mas recebeu apenas ${scenes?.length || 0}.`
    );
  }

  // Validação de negativos específicos: proibido copiar visual_must_not idêntico em todas as cenas
  if (scenes.length > 1) {
    const firstNeg = scenes[0].visual_must_not ? JSON.stringify([...scenes[0].visual_must_not].sort()) : null;
    if (firstNeg !== null) {
      const allIdentical = scenes.every(sc => {
        const currentNeg = sc.visual_must_not ? JSON.stringify([...sc.visual_must_not].sort()) : null;
        return currentNeg === firstNeg;
      });
      if (allIdentical) {
        throw new Error(
          `SCENES_NEGATIVE_NOT_SPECIFIC: O episódio '${episodeContract.episodeId}' possui 'visual_must_not' idêntico em todas as ${scenes.length} cenas (negativo copiado). Cada cena deve conter negações específicas do seu contexto.`
        );
      }
    }
  }

  const contracts: SceneVisualContract[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];

    if (!sc.visualSubject || sc.visualSubject.trim().length === 0) {
      throw new Error(`SCENE_SUBJECT_REQUIRED: Cena '${sc.sceneId || `INDEX_${i}`}' não possui visualSubject definido.`);
    }

    const subjectTrimmed = sc.visualSubject.trim();

    // 1. visual_must_include
    let mustInclude = sc.visual_must_include;
    if (!mustInclude || mustInclude.length === 0) {
      const extracted = extractKeywordsFromSubject(subjectTrimmed);
      mustInclude = extracted;
    }

    // Filtrar termos proibidos
    const validMustInclude = mustInclude.filter(term => {
      const clean = term.toLowerCase().trim();
      return !GENERIC_FORBIDDEN_WORDS.has(clean) && clean !== 'industrial cinematic';
    });

    if (validMustInclude.length < 2) {
      throw new Error(
        `INVALID_VISUAL_MUST_INCLUDE: Cena '${sc.sceneId}' possui termos genéricos proibidos ou menos de 2 elementos específicos. Requer pelo menos 2 termos concretos do assunto.`
      );
    }

    // 2. visual_must_not
    const subjectLower = subjectTrimmed.toLowerCase();
    const filteredStandardDenylist = STANDARD_POLLUTION_DENYLIST.filter(term => {
      return !subjectLower.includes(term.toLowerCase());
    });

    const combinedMustNot = Array.from(new Set([
      ...filteredStandardDenylist,
      ...(sc.visual_must_not || []),
      ...(episodeContract.startFramePeoplePolicy === 'FORBIDDEN' ? NO_STAGED_STOCK_PORTRAITS_DENYLIST : [])
    ]));

    if (combinedMustNot.length < 1) {
      combinedMustNot.push('warehouse conveyor');
    }

    // 3. required_category
    let category = sc.required_category?.toLowerCase().trim();
    if (category === 'industrial') {
      throw new Error(
        `FORBIDDEN_GENERIC_CATEGORY: Categoria 'industrial' genérica é proibida na cena '${sc.sceneId}'. Utilize um slug específico do assunto.`
      );
    }
    if (!category) {
      category = deriveCategoryFromSubject(subjectTrimmed, episodeContract.domainTags);
    }

    // 4. domainTags
    const mergedDomainTags = Array.from(new Set([
      ...episodeContract.domainTags,
      ...(sc.domainTags || [])
    ]));

    // 5. take_type & allowed_sources
    const visualAssetClass: VisualAssetClass = sc.visual_asset_class || (
      sc.take_type === 'KEYFRAME_DOSSIER' ? 'MOTION_IMAGE' : 'VIDEO'
    );
    const expectedTakeType: TakeType = visualAssetClass === 'VIDEO' ? 'CINEMATIC_TAKE' : 'KEYFRAME_DOSSIER';
    if (sc.take_type && sc.take_type !== expectedTakeType) {
      throw new Error(
        `VISUAL_ASSET_CLASS_TAKE_TYPE_MISMATCH:${sc.sceneId}:${visualAssetClass}:${sc.take_type}`
      );
    }
    const takeType: TakeType = sc.take_type || expectedTakeType;
    const allowedSources: AllowedVisualSource[] = sc.allowed_sources && sc.allowed_sources.length > 0
      ? sc.allowed_sources
      : (takeType === 'KEYFRAME_DOSSIER' ? ['dossier'] : ['firefly', 'bank']);

    // 6. targetSeconds
    const targetSeconds = sc.targetSeconds && sc.targetSeconds > 0
      ? sc.targetSeconds
      : Math.round((episodeContract.targetDurationSeconds / scenes.length) * 10) / 10;

    const sceneWords = (sc.voiceover || '').trim().split(/\s+/).filter(Boolean);
    const msPerWord = Math.round(60000 / 146);
    const estimatedAlignment = sceneWords.map((word, wIdx) => ({
      word,
      start_ms: wIdx * msPerWord,
      end_ms: (wIdx + 1) * msPerWord,
      source: 'tts_word_timestamps'
    }));

    const rawContract = {
      sceneId: sc.sceneId,
      episodeId: episodeContract.episodeId,
      voiceover: sc.voiceover,
      visualSubject: subjectTrimmed,
      visual_subject: subjectTrimmed,
      generation_priority: sc.generation_priority || 'GENERATIVE_BESPOKE',
      narrative_archetype: sc.narrative_archetype,
      chapterId: sc.chapterId,
      chapterTitle: sc.chapterTitle,
      visual_must_include: validMustInclude,
      visual_must_not: combinedMustNot,
      required_category: category,
      domainTags: mergedDomainTags,
      allowed_sources: allowedSources,
      take_type: takeType,
      visual_asset_class: visualAssetClass,
      canon_category: sc.canon_category || (
        sc.required_category === 'matter' || sc.required_category === 'evidence' || sc.required_category === 'maps' || sc.required_category === 'reveal'
          ? sc.required_category
          : undefined
      ),
      narration_alignment: (sc.narration_alignment && sc.narration_alignment.length > 0)
        ? sc.narration_alignment
        : estimatedAlignment,
      targetSeconds
    };

    const validated = parseSceneVisualContract(rawContract);
    contracts.push(validated);
  }

  // Validação da duração total do plano de cenas
  const totalTargetSeconds = contracts.reduce((sum, c) => sum + c.targetSeconds, 0);
  const minAllowedSeconds = episodeContract.targetDurationSeconds * episodeContract.minDurationRatio;

  if (totalTargetSeconds < minAllowedSeconds) {
    throw new Error(
      `SCENE_DURATION_PLAN_SHORT: A soma dos targetSeconds das cenas (${totalTargetSeconds.toFixed(1)}s) é menor que o mínimo exigido pelo contrato (${minAllowedSeconds.toFixed(1)}s / ${episodeContract.targetDurationSeconds}s * ${episodeContract.minDurationRatio}).`
    );
  }

  if (episodeContract.visualMix) {
    const actualCounts = {
      realisticImages: 0,
      videos: 0,
      motionGraphics: 0,
      motionImages: 0
    };
    for (const contract of contracts) {
      const assetClass = contract.visual_asset_class || (
        contract.take_type === 'KEYFRAME_DOSSIER' ? 'MOTION_IMAGE' : 'VIDEO'
      );
      actualCounts[VISUAL_MIX_KEY_BY_CLASS[assetClass]]++;
    }
    const planned = episodeContract.visualMix.plannedCounts;
    for (const key of Object.keys(planned) as Array<keyof typeof planned>) {
      if (actualCounts[key] !== planned[key]) {
        throw new Error(
          `VISUAL_MIX_COUNT_MISMATCH:${key}:planned=${planned[key]}:actual=${actualCounts[key]}`
        );
      }
    }
  }

  return contracts;
}
