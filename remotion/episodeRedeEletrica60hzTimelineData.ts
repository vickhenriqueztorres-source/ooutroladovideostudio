import fs from 'fs';
import path from 'path';
import scenesData from '../contracts/episodes/rede-eletrica-60hz.scenes.json';
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

export const EPISODE_REDE_ELETRICA_FPS = 30;

const SCENE_DURATION_OVERRIDES: Record<string, number> = {
  SC_001: 10.0,
  SC_002: 10.0,
  SC_003: 9.0,
  SC_004: 9.5,
  SC_005: 8.0,
  SC_006: 9.0,
  SC_007: 11.8,
  SC_008: 11.0,
  SC_009: 8.0,
  SC_010: 11.0,
  SC_011: 9.0,
  SC_012: 11.4,
  SC_013: 11.4,
  SC_014: 11.7,
  SC_015: 11.2,
  SC_016: 8.5,
  SC_017: 11.0,
  SC_018: 11.5,
  SC_019: 10.5,
  SC_020: 9.5,
  SC_021: 11.8,
  SC_022: 10.0,
  SC_023: 12.2,
  SC_024: 11.0,
  SC_025: 10.0,
  SC_026: 7.5,
  SC_027: 8.0,
  SC_028: 6.5,
  SC_029: 8.5,
  SC_030: 11.5
};

export function buildRedeEletricaTimeline(
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
    'O MILISSEGUNDO INVISÍVEL',
    'A FÁBRICA DA GRAVIDADE',
    'O RIO INVISÍVEL DE 800 KV',
    'O CORAÇÃO OCULTO DE BRASÍLIA',
    'O GARGALO MORTAL DOS 60 HERTZ',
    'O VEREDITO DA REDE'
  ];

  for (let i = 0; i < scenesToUse.length; i++) {
    const sc = scenesToUse[i];
    const durationSeconds = sc.targetSeconds;
    const durationFrames = Math.round(durationSeconds * EPISODE_REDE_ELETRICA_FPS);
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
      audioFile: `episodes/rede-eletrica-60hz/audio/narration/${sc.sceneId}.mp3`,
      sfxFile: `audio/sfx/cinematic/whooshes/whoosh_cinematic_transition.mp3`,
      videoFile: `episodes/rede-eletrica-60hz/takes/${sc.sceneId}.mp4`,
      motionMode: i % 2 === 0 ? 'slow_push_in' : 'cinematic_drift'
    });
  }

  return timeline;
}

const motionAgent = new MotionDirectorAgent();
const motionPackage = motionAgent.buildMotionPackage({
  episodeId: 'rede-eletrica-60hz',
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
  SC_001: {
    component: 'TechnicalSplitComparison',
    title: 'MITO DO ARMAZENAMENTO // REALIDADE DA FÍSICA',
    subtitle: 'ENERGIA ELÉTRICA EM CORRENTE ALTERNADA',
    props: {
      leftTitle: 'MODELO MENTAL COMUM',
      leftSubtitle: 'ARMAZENAMENTO ESTÁTICO',
      leftValue: '0% RESERVA',
      leftNote: 'A rede CA não é uma bateria química gigante esperando na tomada',
      rightTitle: 'REALIDADE DA FÍSICA',
      rightSubtitle: 'GERAÇÃO NO MESMO MILISSEGUNDO',
      rightValue: '60.00 HZ',
      rightNote: 'Consumo e geração instantâneos e sincronizados no mesmo ciclo',
      verdictBadge: 'QUEBRA DE MITO // FLUXO CONTÍNUO',
      source: 'ONS // FÍSICA DO SISTEMA INTERLIGADO NACIONAL'
    }
  },
  SC_002: {
    component: 'EnergyFrequencyOscillator',
    title: 'OSCILOSCÓPIO DIGITAL // CALIBRAÇÃO DE ONDA',
    subtitle: 'ONDA SENOIDAL PURA // 60.00 HZ EM TEMPO REAL',
    nodeTitle: 'MEDIÇÃO SENOIDAL // MALHA RESIDENCIAL',
    nodeStatus: 'SINCRONISMO CONTINENTAL ATIVO',
    nodeLayer: 'CAMADA DE FREQUÊNCIA',
    metricLabel: 'FREQUÊNCIA NOMINAL',
    metricValue: '60.00 HZ',
    props: {
      currentHz: 60.00,
      deltaHz: 0.00,
      showLimits: true,
      statusLabel: 'FREQUÊNCIA NOMINAL ESTÁVEL // SIN',
      sourceText: 'TELEMETRIA ONS // 60.00 HZ EM TEMPO REAL'
    }
  },
  SC_004: {
    component: 'PowerBalanceMeter',
    title: 'BALANÇO INSTANTÂNEO DE POTÊNCIA // ONS',
    subtitle: 'EQUILÍBRIO ENTRE GERAÇÃO E DEMANDA NACIONAL',
    props: {
      generationMW: 85200,
      demandMW: 85200,
      targetHz: 60.00,
      imbalanceMW: 0,
      systemState: 'EQUILÍBRIO ESTÁVEL',
      source: 'ONS // SALA DE CONTROLE DE CARGA'
    }
  },
  SC_007: {
    component: 'TechnicalCutawaySchematic',
    archetype: 'conduit_gallery',
    systemTitle: 'TURBINA FRANCIS 700 MW // ITAIPU BINACIONAL',
    compartmentName: 'ROTOR DE 2.000 TONELADAS SOB PRESSÃO HIDRÁULICA'
  },
  SC_009: {
    component: 'IndustrialXRayHUD',
    title: 'TACÔMETRO DE PRECISÃO // ROTOR PRINCIPAL',
    subtitle: 'VELOCIDADE ANGULAR // 90.0 RPM NOMINAIS',
    nodeTitle: 'EIXO DA TURBINA // GERAÇÃO',
    nodeStatus: 'ROTAÇÃO SINCRONIZADA',
    nodeLayer: 'INÉRCIA MECÂNICA',
    metricLabel: 'VELOCIDADE ANGULAR',
    metricValue: '90.0 RPM'
  },
  SC_011: {
    component: 'BigStatExplainer',
    title: 'LINHÃO UHVDC 800 KV // BELO MONTE -> SUDESTE',
    subtitle: 'CORREDOR XINGU-RIO // 2.543 KM DE EXTENSÃO',
    props: {
      badgeText: 'TRANSMISSÃO DE ULTRA-ALTA TENSÃO (UHVDC)',
      statValue: '800.000',
      unitText: 'VOLTS',
      title: 'CORREDOR XINGU-RIO // 2.543 KM',
      description: 'Corrente contínua atravessando 5 estados para alimentar o polo industrial do Sudeste sem perda reativa.',
      contextNote: 'Maior linhão de transmissão contínua do hemisfério sul',
      sourceText: 'FURNAS / STATE GRID // OPERADOR NACIONAL DO SISTEMA',
      accentColor: '#FF5500'
    }
  },
  SC_013: {
    component: 'LaserScanDossier',
    title: 'CÂMERA ULTRAVIOLETA // EFEITO CORONA',
    subtitle: 'IONIZAÇÃO DO AR PERIFÉRICO // CONDUTORES DE ALTA TENSÃO',
    documentTitle: 'LAUDO DE INSPEÇÃO // DISPERSÃO CORONA',
    criticalClause: 'RUPTURA DIELÉTRICA DO AR SOB 800 KV'
  },
  SC_015: {
    component: 'CyberMapTrace',
    title: 'PERFIL TOPOGRÁFICO // TRAVESSIA DA SERRA DO MAR',
    subtitle: 'DESNÍVEL DE 800 METROS // ENTRADA NO POLO CONSUMIDOR'
  },
  SC_018: {
    component: 'CyberMapTrace',
    title: 'SISTEMA INTERLIGADO NACIONAL // 4 SUBSISTEMAS',
    subtitle: 'NORTE - NORDESTE - SUL - SUDESTE / CENTRO-OESTE'
  },
  SC_019: {
    component: 'IndustrialXRayHUD',
    title: 'PAINEL SCADA ONS // TELEMETRIA DE FREQUÊNCIA',
    subtitle: '60.002 HZ // MONITORAMENTO CONTINENTAL CONTÍNUO',
    nodeTitle: 'CENTRO NACIONAL DE OPERAÇÃO // BRASÍLIA',
    nodeStatus: 'REDE EM EQUILÍBRIO ESTÁVEL',
    nodeLayer: 'TELEMETRIA EM TEMPO REAL',
    metricLabel: 'FREQUÊNCIA MEDIDA',
    metricValue: '60.002 HZ'
  },
  SC_021: {
    component: 'TechnicalCutawaySchematic',
    archetype: 'electronic_rack',
    systemTitle: 'GERADOR SÍNCRONO // ENTREFERRO ESTATOR-ROTOR',
    compartmentName: 'TORQUE MAGNÉTICO RESISTENTE // EFEITO DE FRENAGEM'
  },
  SC_022: {
    component: 'EnergyFrequencyOscillator',
    title: 'SUB-FREQUÊNCIA CRÍTICA // ALERTA ERAC',
    subtitle: 'DESACELERAÇÃO DO ROTOR // 59.48 HZ REGISTRADOS',
    props: {
      currentHz: 59.48,
      deltaHz: -0.52,
      showLimits: true,
      statusLabel: 'SUB-FREQUÊNCIA CRÍTICA // CORTE IMINENTE',
      sourceText: 'RELÉ MICROPROCESSADO IED // LIMIAR DE CORTE'
    }
  },
  SC_023: {
    component: 'LaserScanDossier',
    title: 'RELÉ MICROPROCESSADO IED // DISPARO ERAC',
    subtitle: 'ESQUEMA REGIONAL DE ALÍVIO DE CARGA // ESTÁGIO 1',
    documentTitle: 'PROTOCOLO AUTOMÁTICO DE CORTE // PROTEÇÃO',
    criticalClause: 'DESCONEXÃO DE BLOCOS URBANOS PARA SALVAR TURBINAS'
  },
  SC_024: {
    component: 'PowerBalanceMeter',
    title: 'DESBALANÇO DE CARGA // QUEDA DE GERAÇÃO',
    subtitle: 'PERDA DE CIRCUITO // AUMENTO SÚBITO DE RESISTÊNCIA MECÂNICA',
    props: {
      generationMW: 72400,
      demandMW: 81800,
      targetHz: 59.40,
      imbalanceMW: -9400,
      systemState: 'SUB-FREQUÊNCIA ERAC',
      source: 'ONS // PROTOCOLO AUTOMÁTICO DE DEFESA'
    }
  },
  SC_025: {
    component: 'CyberMapTrace',
    title: 'DEFESA DE ILHAMENTO // CONTINGÊNCIA CONTINENTAL',
    subtitle: 'SEPARAÇÃO EM BLOCOS INDEPENDENTES CONTRA BLECAUTE'
  },
  SC_028: {
    component: 'BigStatExplainer',
    title: 'ESCALA DA MALHA SÍNCRONA // CAPACIDADE TOTAL',
    subtitle: '100.000 MW DE POTÊNCIA INSTALADA INTEGRADA',
    props: {
      badgeText: 'CAPACIDADE INSTALADA DO BRASIL',
      statValue: '100.000',
      unitText: 'MEGAWATTS',
      title: 'SISTEMA INTERLIGADO NACIONAL (SIN)',
      description: '180.000 km de linhas de transmissão unificando 99,3% de todo o consumo elétrico do país.',
      contextNote: 'Quarta maior malha interligada síncrona do planeta',
      sourceText: 'EPE // BALANÇO ENERGÉTICO NACIONAL',
      accentColor: '#FF5500'
    }
  },
  SC_030: {
    component: 'TechnicalCutawaySchematic',
    archetype: 'electronic_rack',
    systemTitle: 'O OUTRO LADO // DOSSIÊ DA REDE ELÉTRICA',
    compartmentName: 'INVESTIGAR. REVELAR. COMPREENDER.'
  }
};

const rawContractInput: TimelineContractInput = {
  episodeId: 'rede-eletrica-60hz',
  fps: EPISODE_REDE_ELETRICA_FPS,
  coldOpen: {
    sceneIds: ['SC_001', 'SC_002']
  },
  actBreaks: [6, 14, 22],
  hudWindows: motionPackage.hudWindows,
  audio: {
    musicBed: 'episodes/rede-eletrica-60hz/audio/music/bed.wav',
    musicVolume: 0.20,
    voiceoverVolume: 1.0,
    sfxVolume: 0.40,
    ducking: true,
    duckedVolume: 0.10
  },
  scenes: buildRedeEletricaTimeline().map((sc) => {
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
      voiceoverFile: `episodes/rede-eletrica-60hz/audio/narration/${sc.sceneId}.mp3`,
      mediaFile: `episodes/rede-eletrica-60hz/takes/${sc.sceneId}.mp4`,
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
        routeTitle: specialized?.title || assignment?.props?.routeTitle || `ROTA DE POTÊNCIA // ${sc.sceneId}`,
        originNode: 'USINA HIDRELÉTRICA ITAIPU / BELO MONTE',
        destNode: 'MALHA DE DISTRIBUIÇÃO URBANA // 60 HZ',
        sceneNumber: sc.sceneId,
        accentColor: '#FF5500',
        telemetryColor: '#00F0FF',
        durationInFrames: sc.durationFrames,
        imageSrc: `episodes/rede-eletrica-60hz/images/${sc.sceneId}.png`,
        mediaPath: `episodes/rede-eletrica-60hz/takes/${sc.sceneId}.mp4`,
        isDossierTake: isDossier,
        ...(specialized?.props || {})
      }
    };
  })
};

export const EPISODE_REDE_ELETRICA_CALCULATED_TIMELINE: CalculatedTimeline = parseAndCalculateTimeline(rawContractInput);
export const EPISODE_REDE_ELETRICA_TOTAL_SECONDS = EPISODE_REDE_ELETRICA_CALCULATED_TIMELINE.totalDurationSeconds;
export const EPISODE_REDE_ELETRICA_TOTAL_FRAMES = EPISODE_REDE_ELETRICA_CALCULATED_TIMELINE.totalDurationFrames;
export const EPISODE_REDE_ELETRICA_TIMELINE = EPISODE_REDE_ELETRICA_CALCULATED_TIMELINE.scenes;
