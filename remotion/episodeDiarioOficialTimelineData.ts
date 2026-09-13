import fs from 'fs';
import path from 'path';
import scenesData from '../contracts/episodes/diario-oficial-3-da-madrugada.scenes.json';
import type { SceneVisualContract } from '../contracts/sceneVisualContract';
import type { RawSceneInput } from '../contracts/buildSceneContracts';
import { MotionDirectorAgent } from '../pipeline/agents/motionDirectorAgent';
import {
  CalculatedTimeline,
  TimelineContractInput,
  parseAndCalculateTimeline
} from '../contracts/timelineContract';

export interface SceneTimelineItem {
  sceneId: string;
  order: number;
  chapterId: string;
  chapterTitle: string;
  name: string;
  voiceover: string;
  visualSubject: string;
  take_type: 'KEYFRAME_DOSSIER' | 'CINEMATIC_TAKE';
  allowed_sources: Array<'firefly' | 'bank' | 'dossier'>;
  durationSeconds: number;
  durationFrames: number;
  startFrame: number;
  endFrame: number;
  audioFile: string;
  sfxFile: string;
  videoFile: string;
  motionMode?: 'slow_push_in' | 'crash_push_in' | 'dramatic_pull_out' | 'pan_right' | 'pan_left' | 'cinematic_drift';
}

export const EPISODE_DIARIO_OFICIAL_FPS = 30;

const SCENE_DURATION_OVERRIDES: Record<string, number> = {
  SC_001: 10.0,
  SC_002: 9.5,
  SC_003: 11.0,
  SC_004: 10.0,
  SC_005: 9.0,
  SC_006: 10.5,
  SC_007: 11.2,
  SC_008: 9.5,
  SC_009: 10.0,
  SC_010: 10.0,
  SC_011: 11.0,
  SC_012: 11.5,
  SC_013: 10.0,
  SC_014: 10.0,
  SC_015: 9.5,
  SC_016: 10.5,
  SC_017: 11.0,
  SC_018: 11.0,
  SC_019: 11.2,
  SC_020: 10.0,
  SC_021: 11.0,
  SC_022: 10.5,
  SC_023: 10.0,
  SC_024: 11.5,
  SC_025: 10.0,
  SC_026: 11.0,
  SC_027: 10.5,
  SC_028: 10.0,
  SC_029: 10.5,
  SC_030: 12.0
};

export function buildDiarioOficialTimeline(
  sceneContracts?: SceneVisualContract[],
  runId: string = 'latest'
): SceneTimelineItem[] {
  const raw: RawSceneInput[] = scenesData as RawSceneInput[];
  const scenesToUse = raw.map((r) => ({
    sceneId: r.sceneId,
    voiceover: r.voiceover,
    visualSubject: r.visualSubject || '',
    take_type: (r.take_type === 'KEYFRAME_DOSSIER' ? 'KEYFRAME_DOSSIER' : 'CINEMATIC_TAKE') as 'KEYFRAME_DOSSIER' | 'CINEMATIC_TAKE',
    allowed_sources: r.take_type === 'KEYFRAME_DOSSIER' ? (['dossier'] as Array<'firefly' | 'bank' | 'dossier'>) : (['firefly', 'bank'] as Array<'firefly' | 'bank' | 'dossier'>),
    targetSeconds: SCENE_DURATION_OVERRIDES[r.sceneId] || r.targetSeconds || 10.0
  }));

  let accumulatedFrames = 0;
  const timeline: SceneTimelineItem[] = [];

  const chapterTitles = [
    'O SILÊNCIO DAS 03:00',
    'O CARIMBO DA FORÇA DE LEI',
    'A ESTEIRA AUTOMATIZADA DE DIAGRAMAÇÃO',
    'A JANELA CRÍTICA DAS 04:59',
    'O GARGALO DO ERRO IRREVOGÁVEL',
    'O VEREDITO DO ESTADO'
  ];

  for (let i = 0; i < scenesToUse.length; i++) {
    const sc = scenesToUse[i];
    const durationSeconds = sc.targetSeconds;
    const durationFrames = Math.round(durationSeconds * EPISODE_DIARIO_OFICIAL_FPS);
    const startFrame = accumulatedFrames;
    const endFrame = startFrame + durationFrames;
    accumulatedFrames = endFrame;

    const chapterNum = Math.min(Math.floor(i / 5) + 1, 6);
    const chapterTitle = chapterTitles[chapterNum - 1];

    timeline.push({
      sceneId: sc.sceneId,
      order: i + 1,
      chapterId: `ATO_${chapterNum}`,
      chapterTitle,
      name: `Cena ${i + 1} - ${sc.sceneId}`,
      voiceover: sc.voiceover,
      visualSubject: sc.visualSubject,
      take_type: sc.take_type,
      allowed_sources: sc.allowed_sources,
      durationSeconds,
      durationFrames,
      startFrame,
      endFrame,
      audioFile: `episodes/diario-oficial-3-da-madrugada/audio/narration/${sc.sceneId}.mp3`,
      sfxFile: `audio/sfx/cinematic/whooshes/whoosh_cinematic_transition.mp3`,
      videoFile: `episodes/diario-oficial-3-da-madrugada/takes/${sc.sceneId}.mp4`,
      motionMode: i % 2 === 0 ? 'slow_push_in' : 'cinematic_drift'
    });
  }

  return timeline;
}

const motionAgent = new MotionDirectorAgent();
const motionPackage = motionAgent.buildMotionPackage({
  episodeId: 'diario-oficial-3-da-madrugada',
  rawScenes: scenesData as any,
  enableAutonomous3DSquad: true
});

const SPECIALIZED_SCENES: Record<
  string,
  {
    component: string;
    props?: Record<string, any>;
    title?: string;
    subtitle?: string;
    systemTitle?: string;
    compartmentName?: string;
    documentTitle?: string;
    criticalClause?: string;
    archetype?: 'conduit_gallery' | 'chassis_terminal' | 'orbital_satellite' | 'electronic_rack' | 'aircraft';
    nodeTitle?: string;
    nodeStatus?: string;
    nodeLayer?: string;
    metricLabel?: string;
    metricValue?: string;
  }
> = {
  SC_002: {
    component: 'LaserScanDossier',
    title: 'TERMINAL DE DATACENTER // 03:14 AM',
    subtitle: 'FILA DE PROCESSAMENTO NOTURNO DO ESTADO',
    documentTitle: 'SISTEMA INCOM // ENVIO ELETRÔNICO',
    criticalClause: 'TRANSMISSÃO CRIPTOGRAFADA DE MATÉRIAS URGENTES'
  },
  SC_004: {
    component: 'LaserScanDossier',
    title: 'CÓDIGO XML DO DECRETO // ANÁLISE DE ESTRUTURA',
    subtitle: 'METADADOS DE ASSINATURA E IDENTIFICADOR ÚNICO',
    documentTitle: 'MINUTA OFICIAL // DECRETO PRESIDENCIAL',
    criticalClause: 'ESTRUTURAÇÃO FORMAL SEGUNDO DECRETO 9.215/2017'
  },
  SC_007: {
    component: 'TechnicalCutawaySchematic',
    archetype: 'electronic_rack',
    systemTitle: 'DIÁRIO OFICIAL DA UNIÃO // ARQUITETURA TRIPARTIDA',
    compartmentName: 'SEÇÃO 1 (ATOS) // SEÇÃO 2 (PESSOAL) // SEÇÃO 3 (CONTRATOS)'
  },
  SC_008: {
    component: 'LaserScanDossier',
    title: 'TOKEN DE HARDWARE // CERTIFICADO ICP-BRASIL',
    subtitle: 'CRIPTOANÁLISE ASSIMÉTRICA // 4096 BITS',
    documentTitle: 'CERTIFICADO A3 // VALIDAÇÃO DE AUTORIA',
    criticalClause: 'AUTENTICIDADE JURÍDICA IRREVOGÁVEL'
  },
  SC_011: {
    component: 'TechnicalCutawaySchematic',
    archetype: 'chassis_terminal',
    systemTitle: 'MOTOR DE DIAGRAMAÇÃO // PAGINAÇÃO AUTOMÁTICA',
    compartmentName: 'COMPILAÇÃO EM 3 COLUNAS ALINHADAS POR ALGORITMO'
  },
  SC_012: {
    component: 'BigStatExplainer',
    title: 'VOLUME DE COMPILAÇÃO // UMA ÚNICA MADRUGADA',
    subtitle: 'EDIÇÕES HISTÓRICAS DE FECHAMENTO DE ORÇAMENTO',
    props: {
      badgeText: 'ESCALA DOCUMENTAL DA REPÚBLICA',
      statValue: '3.000',
      unitText: 'PÁGINAS',
      title: 'VOLUME RECORDE DO DIÁRIO OFICIAL',
      description: 'Milhares de atos administrativos, portarias e alíquotas condensados em colunas tipográficas rígidas antes das 5h.',
      contextNote: 'Maior periódico jurídico oficial da América Latina',
      sourceText: 'IMPRENSA NACIONAL // BALANÇO DE PUBLICAÇÃO ANUAL',
      accentColor: '#FF5500'
    }
  },
  SC_016: {
    component: 'IndustrialXRayHUD',
    title: 'CONTAGEM REGRESSIVA FORENSE // JANELA DAS 04:59',
    subtitle: 'HORA LEGAL BRASILEIRA // SINCRONISMO DE RELÓGIO ATÔMICO',
    nodeTitle: 'SISTEMA DE PUBLICIDADE ELETRÔNICA',
    nodeStatus: 'CONGELAMENTO DE EDICÃO ATIVO',
    nodeLayer: 'CAMADA TEMPORAL DE PRECISÃO',
    metricLabel: 'TEMPO PARA CORTE',
    metricValue: '00:00:58'
  },
  SC_017: {
    component: 'LaserScanDossier',
    title: 'CARIMBO SHA-256 // BLOQUEIO CRIPTOGRÁFICO',
    subtitle: 'HASH DEFINITIVO // IMPOSSIBILIDADE DE ADULTERAÇÃO POSTERIOR',
    documentTitle: 'REGISTRO DE FECHAMENTO DA EDIÇÃO',
    criticalClause: 'SELAMENTO MATEMÁTICO INVIOLÁVEL DA HORA LEGAL'
  },
  SC_020: {
    component: 'CyberMapTrace',
    title: 'REDE DE DISTRIBUIÇÃO // SERVIDORES ESPELHO',
    subtitle: 'REPLICAÇÃO SIMULTÂNEA PARA AS 5 REGIÕES DO BRASIL'
  },
  SC_021: {
    component: 'LaserScanDossier',
    title: 'PRINCÍPIO CONSTITUCIONAL DA PUBLICIDADE',
    subtitle: 'EFICÁCIA JURÍDICA IMEDIATA APÓS A TRANSMISSÃO',
    documentTitle: 'CONSTITUIÇÃO FEDERAL // ART. 37',
    criticalClause: 'INEXISTÊNCIA DE MECANISMO DE CANCELAMENTO RETROATIVO'
  },
  SC_024: {
    component: 'TechnicalCutawaySchematic',
    archetype: 'electronic_rack',
    systemTitle: 'MERCADO FINANCEIRO // REAÇÃO EM CADEIA B3',
    compartmentName: 'RECALIBRAÇÃO DE CONTRATOS E JUROS ÀS 09:00'
  },
  SC_026: {
    component: 'TechnicalSplitComparison',
    title: 'MITO DO DISCURSO // REALIDADE DO SERVIDOR',
    subtitle: 'ONDE DE FATO OPERA O PODER DO ESTADO',
    props: {
      leftTitle: 'ILUSÃO POPULAR',
      leftSubtitle: 'O PLENÁRIO TELEVISIONADO',
      leftValue: '0% EFICÁCIA IMEDIATA',
      leftNote: 'Discursos públicos não têm força cogente de lei sem publicação formal',
      rightTitle: 'MÁQUINA REAL',
      rightSubtitle: 'O SERVIDOR DAS 04:59',
      rightValue: '100% VIGÊNCIA',
      rightNote: 'O carimbo de tempo sela a regra obrigatória para 215 milhões de cidadãos',
      verdictBadge: 'VEREDITO FORENSE // ESTADO EM CÓDIGO',
      source: 'IMPRENSA NACIONAL // DECRETO FEDERAL 9.215'
    }
  },
  SC_028: {
    component: 'BigStatExplainer',
    title: 'ALCANCE NACIONAL // SINCRONISMO CONTINENTAL',
    subtitle: 'CIDADÃOS SOB A MESMA ORDEM JURÍDICA ÀS 05:00',
    props: {
      badgeText: 'POPUlAÇÃO IMPACTADA',
      statValue: '215',
      unitText: 'MILHÕES',
      title: 'ORDEM JURÍDICA EM TEMPO REAL',
      description: 'Cada cidadão, empresa e tribunal acorda sob os parâmetros normativos selados no silêncio da madrugada.',
      contextNote: 'Sincronizado diariamente às cinco horas da manhã',
      sourceText: 'IBGE / IMPRENSA NACIONAL // REPÚBLICA FEDERATIVA DO BRASIL',
      accentColor: '#FF5500'
    }
  },
  SC_030: {
    component: 'TechnicalCutawaySchematic',
    archetype: 'electronic_rack',
    systemTitle: 'O OUTRO LADO // DOSSIÊ DO DIÁRIO OFICIAL',
    compartmentName: 'INVESTIGAR. REVELAR. COMPREENDER.'
  }
};

const rawContractInput: TimelineContractInput = {
  episodeId: 'diario-oficial-3-da-madrugada',
  fps: EPISODE_DIARIO_OFICIAL_FPS,
  coldOpen: {
    sceneIds: ['SC_001', 'SC_002']
  },
  actBreaks: [6, 14, 22],
  hudWindows: motionPackage.hudWindows,
  audio: {
    musicBed: 'episodes/diario-oficial-3-da-madrugada/audio/music/bed.wav',
    musicVolume: 0.20,
    voiceoverVolume: 1.0,
    sfxVolume: 0.40,
    ducking: true,
    duckedVolume: 0.10
  },
  scenes: buildDiarioOficialTimeline().map((sc) => {
    const specialized = SPECIALIZED_SCENES[sc.sceneId];
    const assignment = motionPackage.sceneAssignments[sc.sceneId];
    const isDossier = sc.take_type === 'KEYFRAME_DOSSIER';
    const componentName = specialized?.component || assignment?.component || 'DynamicDocumentaryMedia';

    return {
      id: sc.sceneId,
      name: sc.name,
      chapterTitle: sc.chapterTitle,
      component: componentName,
      take_type: sc.take_type,
      allowed_sources: sc.allowed_sources,
      durationSeconds: sc.durationSeconds,
      visualSubject: sc.visualSubject,
      integratedText: sc.chapterTitle,
      callout: assignment?.callout,
      motionRecipes: assignment?.motionRecipes || [],
      motionMode: assignment?.motionMode || sc.motionMode,
      camera: specialized ? 'static' : (assignment?.camera || (isDossier ? 'drift' : 'pushIn')),
      transition: assignment?.transition || 'crossfade',
      voiceoverFile: `episodes/diario-oficial-3-da-madrugada/audio/narration/${sc.sceneId}.mp3`,
      mediaFile: `episodes/diario-oficial-3-da-madrugada/takes/${sc.sceneId}.mp4`,
      props: {
        ...(assignment?.props || {}),
        title: specialized?.title || assignment?.props?.title || sc.name,
        subtitle: specialized?.subtitle || assignment?.props?.subtitle || sc.chapterTitle,
        documentTitle: specialized?.documentTitle || specialized?.title || assignment?.props?.documentTitle || sc.name,
        criticalClause: specialized?.criticalClause || specialized?.subtitle || assignment?.props?.criticalClause || sc.chapterTitle,
        systemTitle: specialized?.systemTitle || specialized?.title || assignment?.props?.systemTitle || sc.name,
        compartmentName: specialized?.compartmentName || specialized?.subtitle || assignment?.props?.compartmentName || sc.chapterTitle,
        archetype: specialized?.archetype || assignment?.props?.archetype || 'electronic_rack',
        nodeTitle: specialized?.nodeTitle || assignment?.props?.nodeTitle,
        nodeStatus: specialized?.nodeStatus || assignment?.props?.nodeStatus,
        metricLabel: specialized?.metricLabel || assignment?.props?.metricLabel,
        metricValue: specialized?.metricValue || assignment?.props?.metricValue,
        routeTitle: specialized?.title || assignment?.props?.routeTitle || `FLUXO REGULATÓRIO // ${sc.sceneId}`,
        originNode: 'GABINETE MINISTERIAL / PRESIDÊNCIA',
        destNode: 'IMPRENSA NACIONAL // PUBLICAÇÃO OFICIAL',
        sceneNumber: sc.sceneId,
        accentColor: '#FF5500',
        telemetryColor: '#00F0FF',
        durationInFrames: sc.durationFrames,
        imageSrc: `episodes/diario-oficial-3-da-madrugada/images/${sc.sceneId}.png`,
        mediaPath: `episodes/diario-oficial-3-da-madrugada/takes/${sc.sceneId}.mp4`,
        isDossierTake: isDossier,
        ...(specialized?.props || {})
      }
    };
  })
};

export const EPISODE_DIARIO_OFICIAL_CALCULATED_TIMELINE: CalculatedTimeline = parseAndCalculateTimeline(rawContractInput);
export const EPISODE_DIARIO_OFICIAL_TOTAL_SECONDS = EPISODE_DIARIO_OFICIAL_CALCULATED_TIMELINE.totalDurationSeconds;
export const EPISODE_DIARIO_OFICIAL_TOTAL_FRAMES = EPISODE_DIARIO_OFICIAL_CALCULATED_TIMELINE.totalDurationFrames;
export const EPISODE_DIARIO_OFICIAL_TIMELINE = EPISODE_DIARIO_OFICIAL_CALCULATED_TIMELINE.scenes;
