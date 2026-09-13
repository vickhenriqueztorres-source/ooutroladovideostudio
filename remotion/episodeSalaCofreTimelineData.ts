import fs from 'fs';
import path from 'path';
import scenesData from '../contracts/episodes/sala-cofre-apuracao.scenes.json';
import type { SceneVisualContract } from '../contracts/sceneVisualContract';
import type { RawSceneInput } from '../contracts/buildSceneContracts';
import {
  CalculatedTimeline,
  TimelineContractInput,
  parseAndCalculateTimeline
} from '../contracts/timelineContract';
import { MotionDirectorAgent } from '../pipeline/agents/motionDirectorAgent';

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

export const EPISODE_SALA_COFRE_FPS = 30;

import audioTimingsData from './salaCofreAudioTimings.json';

const SCENE_BREATH_OVERRIDES: Record<string, number> = {
  SC_001: 0.8, // 8.03 + 0.8 = 8.8s
  SC_002: 0.8, // 8.54 + 0.8 = 9.3s (Cold Open total = 18.1s, perfeitamente entre 15s e 20s)
  SC_003: 2.0, // 10.5s (Dossiê BU)
  SC_004: 0.5, // 8.3s (Corte ágil de rua)
  SC_005: 2.2, // 10.9s (Dossiê esquemático hardware)
  SC_006: 0.4, // 7.9s (Corte de corredor)
  SC_007: 1.8, // 8.7s (Dossiê microchip)
  SC_008: 1.0, // 11.5s (Dossiê chaves SHA-512)
  SC_009: 0.5, // 9.0s (Corte LCD)
  SC_010: 2.0, // 10.0s (Dossiê integridade matemática)
  SC_011: 0.4, // 7.8s (Corte retirada de mídia)
  SC_012: 1.8, // 10.2s (Dossiê lacre Casa da Moeda)
  SC_013: 0.5, // 8.5s (Corte transporte viatura)
  SC_014: 1.8, // 11.2s (Plano contemplativo barco Amazônia)
  SC_015: 0.6, // 9.2s (Corte C-105 Pantanal)
  SC_016: 1.6, // 10.8s (Terminal cartório)
  SC_017: 0.5, // 8.4s (Corte rack óptico)
  SC_018: 1.5, // 10.5s (Antena satélite crepúsculo)
  SC_019: 2.2, // 11.6s (Dossiê mapa nacional)
  SC_020: 0.6, // 8.8s (Fachada TSE Brasília)
  SC_021: 1.8, // 10.9s (Porta de aço bunker)
  SC_022: 2.4, // 11.8s (Dossiê corte estrutural Sala-Cofre)
  SC_023: 0.5, // 8.4s (Corredor frio datacenter)
  SC_024: 1.8, // 10.8s (Dossiê cluster de validação)
  SC_025: 0.6, // 8.8s (Monitores de totalização)
  SC_026: 2.2, // 11.5s (Dossiê relógio 19h30 95%)
  SC_027: 0.5, // 8.5s (Cédulas papel EUA)
  SC_028: 1.8, // 10.8s (Cabine vazia manhã)
  SC_029: 2.2, // 11.8s (Dossiê arquitetura distribuída)
  SC_030: 2.5  // 12.8s (Plano mestre horizonte Brasília)
};

export function buildSalaCofreTimeline(
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
    targetSeconds: r.targetSeconds || 10.0
  }));

  let accumulatedFrames = 0;
  const timeline: SceneTimelineItem[] = [];

  const chapterTitles = [
    'O SILÊNCIO DAS 17H00',
    'A CRIPTOGRAFIA ASSIMÉTRICA',
    'A ROTA FÍSICA DA MÍDIA',
    'O SALTO ORBITAL',
    'A SALA-COFRE SUBTERRÂNEA',
    'O VEREDITO CAUSAL'
  ];

  const timingsRecord = audioTimingsData as Record<string, { audioDuration: number }>;

  for (let i = 0; i < scenesToUse.length; i++) {
    const sc = scenesToUse[i];
    const timing = timingsRecord[sc.sceneId];
    const breath = SCENE_BREATH_OVERRIDES[sc.sceneId] ?? 0.8;
    const audioDur = timing ? timing.audioDuration : (sc.targetSeconds || 8.0);
    const durationSeconds = parseFloat((audioDur + breath).toFixed(1));
    const durationFrames = Math.round(durationSeconds * EPISODE_SALA_COFRE_FPS);
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
      audioFile: `episodes/sala-cofre-apuracao/audio/narration/${sc.sceneId}.mp3`,
      sfxFile: `audio/sfx/cinematic/whooshes/whoosh_cinematic_transition.mp3`,
      videoFile: `episodes/sala-cofre-apuracao/takes/${sc.sceneId}.mp4`,
      motionMode: i % 2 === 0 ? 'slow_push_in' : 'cinematic_drift'
    });
  }

  return timeline;
}

const motionAgent = new MotionDirectorAgent();
const motionPackage = motionAgent.buildMotionPackage({
  episodeId: 'sala-cofre-apuracao',
  rawScenes: scenesData as any
});

const SPECIALIZED_SCENES: Record<
  string,
  { component: string; title?: string; subtitle?: string }
> = {
  SC_003: {
    component: 'LaserScanDossier',
    title: 'BOLETIM DE URNA // REGISTRO FÍSICO',
    subtitle: 'FITA TÉRMICA AUTENTICADA COM QR CODE ASSINADO'
  },
  SC_005: {
    component: 'TechnicalCutawaySchematic',
    title: 'ISOLAMENTO DE HARDWARE // AIR-GAP',
    subtitle: 'AUSÊNCIA TOTAL DE MÓDULOS DE RÁDIO, BLUETOOTH OU WI-FI'
  },
  SC_007: {
    component: 'IndustrialXRayHUD',
    title: 'MICROCHIP CRIPTOGRÁFICO // HSM EMBUTIDO',
    subtitle: 'GERADOR DE NÚMEROS ALEATÓRIOS VERDADEIROS (TRNG)'
  },
  SC_008: {
    component: 'TechnicalCutawaySchematic',
    title: 'PAR DE CHAVES ASSIMÉTRICAS // SHA-512',
    subtitle: 'ASSINATURA DIGITAL COM CERTIFICAÇÃO DA AUTORIDADE ICP-BRASIL'
  },
  SC_010: {
    component: 'LaserScanDossier',
    title: 'HASH DE INTEGRIDADE MATEMÁTICA',
    subtitle: 'DIVERGÊNCIA DE 1 BIT ANULA INSTANTANEAMENTE A TRANSMISSÃO'
  },
  SC_012: {
    component: 'IndustrialXRayHUD',
    title: 'LACRE ÓPTICO // CASA DA MOEDA',
    subtitle: 'FIBRAS POLIMÉRICAS COM REAÇÃO TÉRMICA E QUÍMICA'
  },
  SC_019: {
    component: 'LaserScanDossier',
    title: 'MALHA DE CONVERGÊNCIA NACIONAL',
    subtitle: '5.570 MUNICÍPIOS DISPARANDO SIMULTANEAMENTE PARA O TSE'
  },
  SC_022: {
    component: 'TechnicalCutawaySchematic',
    title: 'BUNKER DA SALA-COFRE // PROTEÇÃO FARADAY',
    subtitle: 'BLINDAGEM CONTRA PULSOS ELETROMAGNÉTICOS E FOGO POR 4 HORAS'
  },
  SC_024: {
    component: 'IndustrialXRayHUD',
    title: 'CLUSTER DE TOTALIZAÇÃO // TSE',
    subtitle: 'VALIDAÇÃO PARALELA DE 50.000 BOLETINS POR MINUTO'
  },
  SC_026: {
    component: 'LaserScanDossier',
    title: 'SINCRONISMO ATÔMICO // 19H30',
    subtitle: '95% DOS VOTOS COMPUTADOS EM MENOS DE 150 MINUTOS'
  },
  SC_029: {
    component: 'TechnicalCutawaySchematic',
    title: 'TOPOLOGIA DISTRIBUÍDA DE APURAÇÃO',
    subtitle: 'CÁLCULO NA CABINE DESCENTRALIZADA, APENAS SOMA NO CENTRO'
  }
};

const rawContractInput: TimelineContractInput = {
  episodeId: 'sala-cofre-apuracao',
  fps: EPISODE_SALA_COFRE_FPS,
  coldOpen: {
    sceneIds: ['SC_001', 'SC_002']
  },
  actBreaks: [5, 15, 25],
  hudWindows: motionPackage.hudWindows,
  audio: {
    musicBed: 'episodes/sala-cofre-apuracao/audio/music/bed.mp3',
    musicVolume: 0.20,
    voiceoverVolume: 1.0,
    sfxVolume: 0.40,
    ducking: true,
    duckedVolume: 0.10
  },
  scenes: buildSalaCofreTimeline().map((sc) => {
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
      motionMode: assignment?.motionMode || sc.motionMode,
      camera: specialized ? 'static' : (assignment?.camera || (isDossier ? 'drift' : 'pushIn')),
      transition: assignment?.transition || 'crossfade',
      voiceoverFile: `episodes/sala-cofre-apuracao/audio/narration/${sc.sceneId}.mp3`,
      mediaFile: `episodes/sala-cofre-apuracao/takes/${sc.sceneId}.mp4`,
      props: {
        ...(assignment?.props || {}),
        title: specialized?.title || assignment?.props?.title || sc.name,
        subtitle: specialized?.subtitle || assignment?.props?.subtitle || sc.chapterTitle,
        documentTitle: specialized?.title || assignment?.props?.documentTitle || sc.name,
        criticalClause: specialized?.subtitle || assignment?.props?.criticalClause || sc.chapterTitle,
        systemTitle: specialized?.title || assignment?.props?.systemTitle || sc.name,
        compartmentName: specialized?.subtitle || assignment?.props?.compartmentName || sc.chapterTitle,
        sceneNumber: sc.sceneId,
        accentColor: '#FF5500',
        telemetryColor: '#00F0FF',
        durationInFrames: sc.durationFrames,
        imageSrc: `episodes/sala-cofre-apuracao/images/${sc.sceneId}.png`,
        mediaPath: `episodes/sala-cofre-apuracao/takes/${sc.sceneId}.mp4`,
        isDossierTake: isDossier
      }
    };
  })
};

export const EPISODE_SALA_COFRE_CALCULATED_TIMELINE: CalculatedTimeline = parseAndCalculateTimeline(rawContractInput);
export const EPISODE_SALA_COFRE_TOTAL_SECONDS = EPISODE_SALA_COFRE_CALCULATED_TIMELINE.totalDurationSeconds;
export const EPISODE_SALA_COFRE_TOTAL_FRAMES = EPISODE_SALA_COFRE_CALCULATED_TIMELINE.totalDurationFrames;
