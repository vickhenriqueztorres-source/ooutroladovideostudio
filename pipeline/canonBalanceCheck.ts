import fs from 'fs';
import path from 'path';
import { CANONICAL_PROPORTIONS } from '../config/visualIdentity';

export type CanonCategory = 'matter' | 'evidence' | 'maps' | 'reveal';

export interface CanonBalanceCounts {
  matter: number;
  evidence: number;
  maps: number;
  reveal: number;
}

export interface CanonBalanceRatios {
  matter: number;
  evidence: number;
  maps: number;
  reveal: number;
}

export interface CanonBalanceResult {
  valid: boolean;
  totalScenes: number;
  counts: CanonBalanceCounts;
  ratios: CanonBalanceRatios;
  violations: string[];
}

/**
 * Classifica uma cena individual em uma das 4 categorias do Dossiê do Sistema v3.0:
 * 1. matter (50–60%): Realidade e matéria física bruta observada (35mm)
 * 2. evidence (20–30%): Documentos, registros, dados e provas (KeyframeDossier)
 * 3. maps (10–20%): Mapas, timelines e gráficos editoriais (RouteMap, Timeline)
 * 4. reveal (05–15%): Reconstruções 3D, raio-x volumétrico e cortes técnicos (Cutaway)
 */
export function classifySceneCategory(scene: {
  takeType?: string;
  take_type?: string;
  category?: string;
  required_category?: string;
  name?: string;
  visual_subject?: string;
  visualSubject?: string;
  tags?: string[];
  canon_category?: CanonCategory;
}): CanonCategory {
  if (scene.canon_category) {
    return scene.canon_category;
  }

  const takeType = scene.takeType || scene.take_type || '';
  const category = (scene.category || scene.required_category || '').toLowerCase();
  const name = (scene.name || '').toLowerCase();
  const subject = (scene.visual_subject || scene.visualSubject || '').toLowerCase();
  const tags = (scene.tags || []).map(t => t.toLowerCase());

  // 1. Mapas e Timelines
  if (
    category.includes('map') || category.includes('timeline') || category.includes('chart') ||
    name.includes('map') || name.includes('timeline') || name.includes('grafico') ||
    tags.includes('map') || tags.includes('timeline') || tags.includes('chart') || tags.includes('rota') ||
    subject.includes('mapa') || subject.includes('timeline') || subject.includes('linha do tempo') || subject.includes('traçado')
  ) {
    return 'maps';
  }

  // 2. Reconstruções 3D e Revelações Técnicas
  if (
    category.includes('reveal') || category.includes('cutaway') || category.includes('cross_section') || category.includes('3d') ||
    name.includes('reveal') || name.includes('cutaway') || name.includes('raio_x') ||
    tags.includes('reveal') || tags.includes('cutaway') || tags.includes('3d_model') ||
    subject.includes('corte transversal') || subject.includes('raio-x 3d') || subject.includes('esquema 3d') || subject.includes('cutaway')
  ) {
    return 'reveal';
  }

  // 3. Documentos e Evidências
  if (
    takeType === 'KEYFRAME_DOSSIER' ||
    category.includes('document') || category.includes('dossier') || category.includes('evidence') || category.includes('audit') || category.includes('forensic') ||
    name.includes('dossier') || name.includes('document') || name.includes('evidence') ||
    tags.includes('document') || tags.includes('dossier') || tags.includes('evidencia') ||
    subject.includes('documento') || subject.includes('relatório') || subject.includes('laudo') || subject.includes('contrato') || subject.includes('comprovante')
  ) {
    return 'evidence';
  }

  // 4. Matéria Bruta / Realidade Cinematográfica 35mm
  return 'matter';
}

/**
 * Carrega todos os planos de cena (scene_plan.json) de um run
 */
export function loadScenesFromRunDirectory(runDirectory: string): Array<{ sceneId: string; [key: string]: any }> {
  const candidateDirs = [
    path.join(runDirectory, 'editorial', 'execution', 'scenes'),
    path.join(runDirectory, 'scenes'),
    runDirectory
  ];

  for (const dir of candidateDirs) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      const subdirs = fs.readdirSync(dir);
      const scenePlans: Array<{ sceneId: string; [key: string]: any }> = [];

      for (const sub of subdirs) {
        const planPath = path.join(dir, sub, 'scene_plan.json');
        if (fs.existsSync(planPath)) {
          try {
            const data = JSON.parse(fs.readFileSync(planPath, 'utf8'));
            scenePlans.push(data);
          } catch {}
        }
      }

      if (scenePlans.length > 0) {
        return scenePlans;
      }
    }
  }

  return [];
}

/**
 * Validador estrito de proporções canônicas de produção (Dossiê do Sistema v3.0).
 * Executa antes do render para garantir que o episódio mantenha a distribuição exigida:
 * matter (50-60%), evidence (20-30%), maps (10-20%), reveal (5-15%).
 */
export function validateCanonBalance(
  input: string | Array<{ [key: string]: any }>,
  opts?: { throwOnViolation?: boolean }
): CanonBalanceResult {
  const scenes = typeof input === 'string' ? loadScenesFromRunDirectory(input) : input;

  if (!scenes || scenes.length === 0) {
    throw new Error('CANON_BALANCE_NO_SCENES: Nenhuma cena encontrada para validação de proporções canônicas.');
  }

  const total = scenes.length;
  const counts: CanonBalanceCounts = {
    matter: 0,
    evidence: 0,
    maps: 0,
    reveal: 0
  };

  for (const sc of scenes) {
    const category = classifySceneCategory(sc);
    counts[category]++;
  }

  const ratios: CanonBalanceRatios = {
    matter: Math.round((counts.matter / total) * 1000) / 1000,
    evidence: Math.round((counts.evidence / total) * 1000) / 1000,
    maps: Math.round((counts.maps / total) * 1000) / 1000,
    reveal: Math.round((counts.reveal / total) * 1000) / 1000
  };

  const violations: string[] = [];

  if (ratios.matter < CANONICAL_PROPORTIONS.matterMin || ratios.matter > CANONICAL_PROPORTIONS.matterMax) {
    violations.push(
      `matter: ${(ratios.matter * 100).toFixed(1)}% (${counts.matter}/${total}) [Canônico: ${(CANONICAL_PROPORTIONS.matterMin * 100).toFixed(0)}%–${(CANONICAL_PROPORTIONS.matterMax * 100).toFixed(0)}%]`
    );
  }

  if (ratios.evidence < CANONICAL_PROPORTIONS.evidenceMin || ratios.evidence > CANONICAL_PROPORTIONS.evidenceMax) {
    violations.push(
      `evidence: ${(ratios.evidence * 100).toFixed(1)}% (${counts.evidence}/${total}) [Canônico: ${(CANONICAL_PROPORTIONS.evidenceMin * 100).toFixed(0)}%–${(CANONICAL_PROPORTIONS.evidenceMax * 100).toFixed(0)}%]`
    );
  }

  if (ratios.maps < CANONICAL_PROPORTIONS.mapsMin || ratios.maps > CANONICAL_PROPORTIONS.mapsMax) {
    violations.push(
      `maps: ${(ratios.maps * 100).toFixed(1)}% (${counts.maps}/${total}) [Canônico: ${(CANONICAL_PROPORTIONS.mapsMin * 100).toFixed(0)}%–${(CANONICAL_PROPORTIONS.mapsMax * 100).toFixed(0)}%]`
    );
  }

  if (ratios.reveal < CANONICAL_PROPORTIONS.revealMin || ratios.reveal > CANONICAL_PROPORTIONS.revealMax) {
    violations.push(
      `reveal: ${(ratios.reveal * 100).toFixed(1)}% (${counts.reveal}/${total}) [Canônico: ${(CANONICAL_PROPORTIONS.revealMin * 100).toFixed(0)}%–${(CANONICAL_PROPORTIONS.revealMax * 100).toFixed(0)}%]`
    );
  }

  const valid = violations.length === 0;

  if (!valid && opts?.throwOnViolation !== false) {
    const errorReport = [
      `CANON_PROPORTIONS_VIOLATED: A distribuição de cenas violou os limites canônicos do Dossiê do Sistema v3.0:`,
      ...violations.map(v => `  • ${v}`),
      `Distribuição Completa:`,
      `  - matter: ${(ratios.matter * 100).toFixed(1)}% (esperado: 50%–60%)`,
      `  - evidence: ${(ratios.evidence * 100).toFixed(1)}% (esperado: 20%–30%)`,
      `  - maps: ${(ratios.maps * 100).toFixed(1)}% (esperado: 10%–20%)`,
      `  - reveal: ${(ratios.reveal * 100).toFixed(1)}% (esperado: 5%–15%)`
    ].join('\n');

    throw new Error(errorReport);
  }

  return {
    valid,
    totalScenes: total,
    counts,
    ratios,
    violations
  };
}

/**
 * Gate canônico de ancoragem temporal de beats:
 * Qualquer beat com timing.source === 'estimated_wpm' no momento da montagem da timeline
 * aborta a produção com o erro TIMING_NOT_ANCHORED.
 * Ambientes de Shadow ou dry-run têm permissão para prosseguir com estimated_wpm.
 */
export function assertBeatsTimingAnchored(
  beats: readonly { id?: string; beat_id?: string; timing?: { source?: string } }[],
  opts?: { isProduction?: boolean; dryRun?: boolean; isShadow?: boolean }
): void {
  const isProduction = opts?.isProduction ?? (!opts?.dryRun && !opts?.isShadow);

  for (const beat of beats) {
    if (beat?.timing?.source === 'estimated_wpm') {
      const beatId = beat.id || beat.beat_id || 'unknown';
      if (!isProduction) {
        console.warn(
          `[canonBalanceCheck] WARNING: Beat '${beatId}' usa estimativa WPM (permitido apenas em shadow/dry-run).`
        );
        continue;
      }
      throw new Error(
        `TIMING_NOT_ANCHORED: Beats ainda usam estimativa WPM. Execute a locução real antes de produzir os planos. Beat '${beatId}' possui timing.source === 'estimated_wpm'.`
      );
    }
  }
}
