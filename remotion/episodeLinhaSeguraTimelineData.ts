import fs from 'fs';
import path from 'path';
import scenesData from '../contracts/episodes/linha-segura-presidencial.scenes.json';
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

export const EPISODE_LINHA_SEGURA_FPS = 30;

const SCENE_DURATION_OVERRIDES: Record<string, number> = {
  SC_001: 9.5,
  SC_002: 8.0,
  SC_003: 10.0,
  SC_004: 7.5,
  SC_005: 9.5,
  SC_006: 9.0,
  SC_007: 9.0,
  SC_008: 8.0,
  SC_009: 10.0,
  SC_010: 9.0,
  SC_011: 7.5,
  SC_012: 11.0,
  SC_013: 9.0,
  SC_014: 10.0,
  SC_015: 7.5,
  SC_016: 10.0,
  SC_017: 10.0,
  SC_018: 9.5,
  SC_019: 10.5,
  SC_020: 10.0,
  SC_021: 9.0,
  SC_022: 9.0,
  SC_023: 8.5,
  SC_024: 10.0,
  SC_025: 9.5,
  SC_026: 8.5,
  SC_027: 10.0,
  SC_028: 8.5,
  SC_029: 9.0,
  SC_030: 8.5
};

export function buildLinhaSeguraTimeline(
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
    'O DISPARO INVISÍVEL',
    'A GAIOLA DE FARADAY',
    'A ROTA SUBTERRÂNEA',
    'O SALTO ORBITAL BANDA X',
    'O ESCUDO AÉREO DO VC-1',
    'O VEREDITO DA SOBERANIA'
  ];

  for (let i = 0; i < scenesToUse.length; i++) {
    const sc = scenesToUse[i];
    const durationSeconds = sc.targetSeconds;
    const durationFrames = Math.round(durationSeconds * EPISODE_LINHA_SEGURA_FPS);
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
      audioFile: `episodes/linha-segura-presidencial/audio/narration/${sc.sceneId}.mp3`,
      sfxFile: `audio/sfx/cinematic/whooshes/whoosh_cinematic_transition.mp3`,
      videoFile: `episodes/linha-segura-presidencial/takes/${sc.sceneId}.mp4`,
      motionMode: i % 2 === 0 ? 'slow_push_in' : 'cinematic_drift'
    });
  }

  return timeline;
}

const motionAgent = new MotionDirectorAgent();
const motionPackage = motionAgent.buildMotionPackage({
  episodeId: 'linha-segura-presidencial',
  rawScenes: scenesData as any,
  enableAutonomous3DSquad: true
});

const SPECIALIZED_SCENES: Record<
  string,
  {
    component: string;
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
  SC_001: {
    component: 'IndustrialXRayHUD',
    title: 'TERMINAL SEGURO PRESIDENCIAL // GABINETE PLANALTO',
    subtitle: 'TELEFONE CRIPTOGRÁFICO DE ESTADO // SEM LINK COMERCIAL',
    nodeTitle: 'TERMINAL SEGURO // GABINETE PLANALTO',
    nodeStatus: 'CANAL CRIPTOGRAFADO ATIVO',
    nodeLayer: 'COMUNICAÇÃO DE SOBERANIA',
    metricLabel: 'BLINDAGEM TEMPEST',
    metricValue: 'CLASSIFICADA'
  },
  SC_003: {
    component: 'LaserScanDossier',
    title: 'ESPECTRÔMETRO DE RF // SINAIS MILITARES',
    subtitle: 'VARREDURA DE ONDAS E ANÁLISE DE INTERCEPTAÇÃO',
    documentTitle: 'ESPECTRÔMETRO DE RF // SINAIS MILITARES',
    criticalClause: 'VARREDURA DE ONDAS E ANÁLISE DE INTERCEPTAÇÃO'
  },
  SC_004: {
    component: 'IndustrialXRayHUD',
    title: 'CHIP CRIPTOGRÁFICO // HARDWARE DEDICADO',
    subtitle: 'PROCESSADOR DE ENCRIPTAÇÃO MILITAR NACIONAL',
    nodeTitle: 'CHIP CRIPTOGRÁFICO // HARDWARE',
    nodeStatus: 'ENCRIPTAÇÃO ATIVA',
    nodeLayer: 'CAMADA FÍSICA CLASSIFICADA',
    metricLabel: 'TAMANHO DA CHAVE',
    metricValue: '256 BITS'
  },
  SC_006: {
    component: 'TechnicalCutawaySchematic',
    archetype: 'conduit_gallery',
    systemTitle: 'PALÁCIO DO PLANALTO // COMPLEXO PRESIDENCIAL',
    compartmentName: 'GALERIAS DE CONCRETO SUBTERRÂNEAS E REDE DEDICADA'
  },
  SC_007: {
    component: 'TechnicalCutawaySchematic',
    archetype: 'chassis_terminal',
    systemTitle: 'BLINDAGEM ACÚSTICA // VIDRAÇA PLANALTO',
    compartmentName: 'DISPOSITIVO PIEZOELÉTRICO ANTIVIBRAÇÃO'
  },
  SC_008: {
    component: 'LaserScanDossier',
    title: 'CANCELAMENTO ACÚSTICO // RUÍDO BRANCO',
    subtitle: 'SOBREPOSIÇÃO DE FASE CONTRA MICROFONES LASER',
    documentTitle: 'CANCELAMENTO ACÚSTICO // RUÍDO BRANCO',
    criticalClause: 'SOBREPOSIÇÃO DE FASE CONTRA MICROFONES LASER'
  },
  SC_012: {
    component: 'TechnicalCutawaySchematic',
    archetype: 'conduit_gallery',
    systemTitle: 'DUTOS SUBTERRÂNEOS // EIXO MONUMENTAL',
    compartmentName: 'GALERIAS DE CONCRETO COM CABOS DE FIBRA BLINDADA'
  },
  SC_014: {
    component: 'IndustrialXRayHUD',
    title: 'FUSÃO ÓPTICA // NÚCLEO DE QUARTZO',
    subtitle: 'AUDITORIA DE DISCREPÂNCIA FOTÔNICA E REFLEXÃO',
    nodeTitle: 'NÚCLEO ÓPTICO // QUARTZO PURO',
    nodeStatus: 'REFLEXÃO NULA',
    nodeLayer: 'CAMADA FOTÔNICA',
    metricLabel: 'ATENUAÇÃO DE SINAL',
    metricValue: '0.02 dB/km'
  },
  SC_016: {
    component: 'CyberMapTrace',
    title: 'UPLINK SATELITAL // BANDA X MILITAR',
    subtitle: 'BRASÍLIA-DF -> SATÉLITE GEOESTACIONÁRIO SGDC-1'
  },
  SC_017: {
    component: 'LaserScanDossier',
    title: 'BANDA X MILITAR // ISOLAMENTO ESPECTRAL',
    subtitle: 'FREQUÊNCIA RESERVADA IMUNE À REDE PÚBLICA COMERCIAL',
    documentTitle: 'BANDA X MILITAR // ISOLAMENTO ESPECTRAL',
    criticalClause: 'FREQUÊNCIA RESERVADA IMUNE À REDE PÚBLICA COMERCIAL'
  },
  SC_020: {
    component: 'TechnicalCutawaySchematic',
    archetype: 'aircraft',
    systemTitle: 'ESCUDO ELETRÔNICO // FAB VC-1',
    compartmentName: 'ENLACE SATELITAL CRIPTOGRAFADO EM VOO PRESIDENCIAL'
  },
  SC_022: {
    component: 'LaserScanDossier',
    title: 'PROTOCOLO DE ISOLAMENTO // TERMINAIS CIVIS',
    subtitle: 'VETO DE SMARTPHONES CONVENCIONAIS EM AMBIENTES CLASSIFICADOS',
    documentTitle: 'PROTOCOLO DE ISOLAMENTO // TERMINAIS CIVIS',
    criticalClause: 'VETO DE SMARTPHONES CONVENCIONAIS EM AMBIENTES CLASSIFICADOS'
  },
  SC_027: {
    component: 'IndustrialXRayHUD',
    title: 'EXPURGO DE MEMÓRIA VOLÁTIL // BUFFER WIPED',
    subtitle: 'DESTRUIÇÃO CRIPTOGRÁFICA DE CHAVES EFÊMERAS',
    nodeTitle: 'MEMÓRIA VOLÁTIL // BUFFER EFÊMERO',
    nodeStatus: 'ZEROIZADO',
    nodeLayer: 'CAMADA CRIPTOGRÁFICA',
    metricLabel: 'CHAVES RESIDUAIS',
    metricValue: '0 CHAVES'
  },
  SC_030: {
    component: 'TechnicalCutawaySchematic',
    archetype: 'electronic_rack',
    systemTitle: 'O OUTRO LADO // ARQUIVO EDITORIAL',
    compartmentName: 'INVESTIGAR. REVELAR. COMPREENDER.'
  }
};

const rawContractInput: TimelineContractInput = {
  episodeId: 'linha-segura-presidencial',
  fps: EPISODE_LINHA_SEGURA_FPS,
  coldOpen: {
    sceneIds: ['SC_001', 'SC_002']
  },
  actBreaks: [6, 14, 22],
  hudWindows: motionPackage.hudWindows,
  audio: {
    musicBed: 'episodes/linha-segura-presidencial/audio/music/bed.wav',
    musicVolume: 0.20,
    voiceoverVolume: 1.0,
    sfxVolume: 0.40,
    ducking: true,
    duckedVolume: 0.10
  },
  scenes: buildLinhaSeguraTimeline().map((sc) => {
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
      voiceoverFile: `episodes/linha-segura-presidencial/audio/narration/${sc.sceneId}.mp3`,
      mediaFile: `episodes/linha-segura-presidencial/takes/${sc.sceneId}.mp4`,
      props: {
        ...(assignment?.props || {}),
        title: specialized?.title || assignment?.props?.title || sc.name,
        subtitle: specialized?.subtitle || assignment?.props?.subtitle || sc.chapterTitle,
        documentTitle: specialized?.documentTitle || specialized?.title || assignment?.props?.documentTitle || sc.name,
        criticalClause: specialized?.criticalClause || specialized?.subtitle || assignment?.props?.criticalClause || sc.chapterTitle,
        systemTitle: specialized?.systemTitle || specialized?.title || assignment?.props?.systemTitle || sc.name,
        compartmentName: specialized?.compartmentName || specialized?.subtitle || assignment?.props?.compartmentName || sc.chapterTitle,
        archetype: specialized?.archetype || assignment?.props?.archetype || 'conduit_gallery',
        nodeTitle: specialized?.nodeTitle || assignment?.props?.nodeTitle,
        nodeStatus: specialized?.nodeStatus || assignment?.props?.nodeStatus,
        metricLabel: specialized?.metricLabel || assignment?.props?.metricLabel,
        metricValue: specialized?.metricValue || assignment?.props?.metricValue,
        routeTitle: specialized?.title || assignment?.props?.routeTitle || `ROTA DE ENLACE // ${sc.sceneId}`,
        originNode: 'PALÁCIO DO PLANALTO // BRASÍLIA-DF',
        destNode: 'SATÉLITE GEOESTACIONÁRIO SGDC-1',
        sceneNumber: sc.sceneId,
        accentColor: '#FF5500',
        telemetryColor: '#00F0FF',
        durationInFrames: sc.durationFrames,
        imageSrc: `episodes/linha-segura-presidencial/images/${sc.sceneId}.png`,
        mediaPath: `episodes/linha-segura-presidencial/takes/${sc.sceneId}.mp4`,
        isDossierTake: isDossier
      }
    };
  })
};

export const EPISODE_LINHA_SEGURA_CALCULATED_TIMELINE: CalculatedTimeline = parseAndCalculateTimeline(rawContractInput);
export const EPISODE_LINHA_SEGURA_TOTAL_SECONDS = EPISODE_LINHA_SEGURA_CALCULATED_TIMELINE.totalDurationSeconds;
export const EPISODE_LINHA_SEGURA_TOTAL_FRAMES = EPISODE_LINHA_SEGURA_CALCULATED_TIMELINE.totalDurationFrames;
export const EPISODE_LINHA_SEGURA_TIMELINE = EPISODE_LINHA_SEGURA_CALCULATED_TIMELINE.scenes;

