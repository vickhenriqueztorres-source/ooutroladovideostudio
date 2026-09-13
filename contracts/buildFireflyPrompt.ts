import { SceneVisualContract } from './sceneVisualContract';
import { RawSceneInput } from './buildSceneContracts';
import {
  FUTURISTIC_STYLE_BLACKLIST,
  GLOBAL_NEGATIVE,
  IDENTITY_SUFFIX,
  LEGACY_STYLE_PREFIX_REGEX,
} from '../config/visualIdentity';

export interface FireflyPromptOutput {
  sceneId: string;
  category: string;
  domainTags: string[];
  mustInclude: string[];
  mustNot: string[];
  prompt: string;
  negativePrompt: string;
  aspectRatio: '16:9';
}

export interface FireflyPromptInput {
  sceneId?: string;
  scene_id?: string;
  voiceover?: string;
  visualSubject?: string;
  visual_subject?: string;
  visual_must_include?: string[];
  visual_must_not?: string[];
  required_category?: string;
  domainTags?: string[];
  allowed_sources?: string[];
  take_type?: string;
  targetSeconds?: number;
  narrative_archetype?: string;
  generation_priority?: string;
  cinematic_shot?: {
    lens_language?: string;
    composition?: string;
    depth_design?: string;
    camera_movement?: string;
    focus_target?: string;
    camera?: {
      movement?: string;
      direction?: string;
      intensity?: string;
      motivation?: string | null;
    };
  };
  lens_language?: string;
  camera_movement?: string;
  composition?: string;
}

function normalizeIdentityText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Fail closed before a positive scene description can reintroduce the legacy look. */
export function assertDocumentaryRealityPrompt(input: string, sceneId: string): void {
  const normalized = normalizeIdentityText(input);
  const forbidden = FUTURISTIC_STYLE_BLACKLIST.find((term) => normalized.includes(normalizeIdentityText(term)));
  if (forbidden) {
    throw new Error(`VISUAL_IDENTITY_FUTURISM_FORBIDDEN:${sceneId}:${forbidden}`);
  }
}

/**
 * Constrói o prompt documental contemporâneo do Firefly para uma cena.
 * REGRA INVIOLÁVEL: O prompt DEVE começar pelo SUBJECT físico substantivo (must_include),
 * seguido por contexto real e SOMENTE DEPOIS pela identidade (IDENTITY_SUFFIX).
 */
export function buildFireflyPrompt(scene: SceneVisualContract | RawSceneInput | FireflyPromptInput): FireflyPromptOutput {
  const sceneId = ('sceneId' in scene && scene.sceneId) ? scene.sceneId : (('scene_id' in scene && scene.scene_id) ? scene.scene_id : 'UNKNOWN_SCENE');
  const mustInclude = scene.visual_must_include || [];
  const mustNot = scene.visual_must_not || [];
  const domainTags = scene.domainTags || ('tags' in scene && Array.isArray((scene as any).tags) ? (scene as any).tags : []);
  const category = scene.required_category || 'forensic_investigation';
  const rawSubject: string = String(
    ('visualSubject' in scene && scene.visualSubject)
      ? scene.visualSubject
      : (('visual_subject' in scene && (scene as any).visual_subject) ? (scene as any).visual_subject : '')
  );

  // Higieniza o visualSubject para remover prefixos de estilo que possam ter sido injetados
  const cleanSubject = rawSubject
    .replace(LEGACY_STYLE_PREFIX_REGEX, '')
    .trim();

  assertDocumentaryRealityPrompt([cleanSubject, ...mustInclude].join(' '), sceneId);

  // 1. Subject substantivo encabeça o prompt obrigatoriamente (visual_must_include em AND + visual_subject)
  const mustIncludeClause = mustInclude.length > 0
    ? `${mustInclude.join(' and ')}, physically present and clearly observable`
    : (cleanSubject ? `${cleanSubject}, physically present and clearly observable` : 'Authentic physical mechanism, clearly observable');

  // 2. Ótica e linguagem de câmera cinematográfica (lente anamórfica 35mm, chiaroscuro, movimento de câmera)
  const cinematicShot = (scene as any).cinematic_shot || (scene as any).cinematicShot;
  const archetype = (scene as any).narrative_archetype || (scene as any).narrativeArchetype;
  const shotOptics: string[] = [];

  if (cinematicShot?.lens_language) {
    shotOptics.push(cinematicShot.lens_language);
  } else if ((scene as any).lens_language) {
    shotOptics.push((scene as any).lens_language);
  } else if (archetype === 'PHYSICAL_TRIGGER') {
    shotOptics.push('extreme macro probe lens, tactile mechanical interaction, razor-sharp focus');
  } else if (archetype === 'INTERNAL_MECHANISM') {
    shotOptics.push('35mm anamorphic prime lens, technical cutaway angle, layered mechanical depth');
  } else if (archetype === 'VULNERABILITY_NODE') {
    shotOptics.push('85mm telephoto prime, intense focus on intercept point, high contrast chiaroscuro');
  } else if (archetype === 'MONUMENTAL_SCALE') {
    shotOptics.push('24mm wide angle cinematic lens, monumental scale architectural geometry');
  } else {
    shotOptics.push('35mm anamorphic prime lens, shallow depth of field, sharp subject focus');
  }

  if (cinematicShot?.camera_movement) {
    shotOptics.push(cinematicShot.camera_movement);
  } else if ((scene as any).camera_movement) {
    shotOptics.push((scene as any).camera_movement);
  } else if (cinematicShot?.camera?.movement) {
    const mov = cinematicShot.camera.movement;
    if (mov === 'PUSH_IN') shotOptics.push('subtle slow push-in tracking physical mechanism');
    else if (mov === 'TRACKING') shotOptics.push('smooth lateral tracking shot following physical unit');
    else if (mov === 'STATIC') shotOptics.push('locked-off observational tripod frame');
    else shotOptics.push('subtle shoulder drift with observational human framing');
  } else {
    shotOptics.push('subtle slow push-in tracking physical action');
  }

  if (cinematicShot?.composition) {
    shotOptics.push(cinematicShot.composition);
  } else if ((scene as any).composition) {
    shotOptics.push((scene as any).composition);
  }

  if (cinematicShot?.depth_design) {
    shotOptics.push(cinematicShot.depth_design);
  }

  const cinematicClause = shotOptics.filter(Boolean).join(', ');

  const domainAnchor = domainTags.length > 0 ? `real present-day context of ${domainTags.join(', ')}` : '';
  const categoryAnchor = `documentary evidence category ${category.replace(/_/g, ' ')}`;

  // 3. Negative Prompt estrito: união de GLOBAL_NEGATIVE + visual_must_not da cena
  const combinedNegatives = Array.from(new Set([
    ...GLOBAL_NEGATIVE,
    ...mustNot
  ]));

  const negativePrompt = combinedNegatives.join(', ');

  // 4. O bot do Firefly aceita um único campo de prompt. Os negativos entram antes
  // da identidade para que GLOBAL_NEGATIVE seja aplicado e IDENTITY_SUFFIX permaneça por último.
  const fullPrompt = [
    mustIncludeClause,
    cleanSubject && !mustIncludeClause.toLowerCase().includes(cleanSubject.toLowerCase()) ? cleanSubject : null,
    cinematicClause || null,
    domainAnchor ? domainAnchor : null,
    categoryAnchor,
    `Avoid: ${negativePrompt}`,
    IDENTITY_SUFFIX
  ].filter(Boolean).join(', ');

  return {
    sceneId,
    category,
    domainTags,
    mustInclude,
    mustNot,
    prompt: fullPrompt,
    negativePrompt,
    aspectRatio: '16:9'
  };
}
