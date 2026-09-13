import scenesData from '../contracts/episodes/encomenda-china-curitiba.scenes.json';
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

export const EPISODE_ENCOMENDA_CHINA_FPS = 30;

const SCENE_DURATION_OVERRIDES: Record<string, number> = {
  SC_001: 9.5,
  SC_002: 8.5,
  SC_003: 11.5,
  SC_004: 9.0,
  SC_005: 12.0,
  SC_006: 8.5,
  SC_007: 11.5,
  SC_008: 9.0,
  SC_009: 11.0,
  SC_010: 8.5,
  SC_011: 11.5,
  SC_012: 9.0,
  SC_013: 11.0,
  SC_014: 8.5,
  SC_015: 11.5,
  SC_016: 9.0,
  SC_017: 11.5,
  SC_018: 8.5,
  SC_019: 11.0,
  SC_020: 8.5,
  SC_021: 11.5,
  SC_022: 9.0,
  SC_023: 11.0,
  SC_024: 8.5,
  SC_025: 11.5,
  SC_026: 9.0,
  SC_027: 11.0,
  SC_028: 8.5,
  SC_029: 11.0,
  SC_030: 12.5
};

export function buildEncomendaChinaTimeline(
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
    targetSeconds: SCENE_DURATION_OVERRIDES[r.sceneId] || r.targetSeconds || 10.5
  }));

  let accumulatedFrames = 0;
  const timeline: SceneTimelineItem[] = [];

  const chapterTitles = [
    'O CLIQUE E O VAZIO DO PORÃO',
    'A PONTE AÉREA TRANSCONTINENTAL',
    'O FUNIL DE VIRACOPOS E CURITIBA',
    'A VISÃO RAIO-X DA RECEITA FEDERAL',
    'O SORTER A 3 M/S E O CÓDIGO DE BARRAS',
    'A ÚLTIMA MILHA E O VEREDITO CAUSAL'
  ];

  for (let i = 0; i < scenesToUse.length; i++) {
    const sc = scenesToUse[i];
    const durationSeconds = sc.targetSeconds;
    const durationFrames = Math.round(durationSeconds * EPISODE_ENCOMENDA_CHINA_FPS);
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
      audioFile: `episodes/encomenda-china-curitiba/audio/narration/${sc.sceneId}.mp3`,
      sfxFile: `audio/sfx/cinematic/whooshes/whoosh_cinematic_transition.mp3`,
      videoFile: `episodes/encomenda-china-curitiba/takes/${sc.sceneId}.mp4`,
      motionMode: i % 2 === 0 ? 'slow_push_in' : 'cinematic_drift'
    });
  }

  return timeline;
}

const motionAgent = new MotionDirectorAgent();
const motionPackage = motionAgent.buildMotionPackage({
  episodeId: 'encomenda-china-curitiba',
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
    component: 'KineticEditorialCallout',
    props: {
      tag: 'PARADOXO MATEMÁTICO // E-COMMERCE',
      title: 'O CLIQUE DE R$ 20 COM FRETE GRÁTIS',
      description: 'O custo real de despacho individual pelo correio comum ultrapassaria 4 vezes o preço do produto.',
      accentColor: '#FF5500'
    }
  },
  SC_002: {
    component: 'BigStatExplainer',
    title: 'PESAGEM VOLUMÉTRICA INDUSTRIAL',
    subtitle: 'UNIDADE-PERSONAGEM: 150 GRAMAS DE CARGA MARGINAL',
    props: {
      badgeText: 'CARGA PADRÃO INTERNACIONAL',
      statValue: '150',
      unitText: 'GRAMAS',
      title: 'PACOTE POLIETILENO CINZA FOSCO',
      description: 'Dimensão compacta projetada para preencher os vazios de contêineres aéreos intercontinentais.',
      contextNote: 'Custo marginal de transporte calculado em centavos por unidade consolidada',
      sourceText: 'DIRETRIZES UPU // UNIÃO POSTAL UNIVERSAL',
      accentColor: '#FF5500'
    }
  },
  SC_005: {
    component: 'TechnicalCutawaySchematic',
    archetype: 'chassis_terminal',
    systemTitle: 'PALETE AERONÁUTICO ULD // CUBAGEM MÁXIMA',
    compartmentName: 'APROVEITAMENTO DE 98% DO VOLUME // SEM AR RESIDUAL'
  },
  SC_008: {
    component: 'GlobalRouteTracker',
    title: 'A ROTA DOS 18.340 QUILÔMETROS',
    subtitle: 'ARCO GEODÉSICO: SHENZHEN (SZX) -> VIRACOPOS (VCP) -> CEINT CURITIBA',
    props: {
      distanceKm: 18340,
      originName: 'SHENZHEN HUB // GUANGDONG [22.54°N, 114.05°E]',
      destinationName: 'CEINT CORREIOS // CURITIBA [-25.42°S, -49.27°W]',
      elapsedTime: '26H 40M TEMPO DE TRÂNSITO'
    }
  },
  SC_009: {
    component: 'IndustrialXRayHUD',
    title: 'CABINE PRESSURIZADA A 11.000 METROS',
    subtitle: 'BOEING 777F // TEMPERATURA EXTERNA: -50°C',
    nodeTitle: 'SISTEMA DE CONTROLE TÉRMICO E PRESSÃO',
    nodeStatus: 'PROTEÇÃO DE BATERIAS DE ÍON-LÍTIO ATIVA',
    nodeLayer: 'CONVÉS PRINCIPAL DE CARGA',
    metricLabel: 'VELOCIDADE EM ROTA',
    metricValue: '910 KM/H'
  },
  SC_010: {
    component: 'LaserScanDossier',
    title: 'MANIFESTO XML DE CARGA AÉREA ANTECIPADA',
    subtitle: 'TRANSMISSÃO CRIPTOGRAFADA PARA A RECEITA FEDERAL',
    documentTitle: 'DECLARAÇÃO DE REMESSA CONFORME',
    criticalClause: 'CRUZAMENTO AUTOMÁTICO DE CPF E VALOR DECLARADO ANTES DO POUSO'
  },
  SC_013: {
    component: 'LaserScanDossier',
    title: 'LACRE ELETRÔNICO DE ALTA SEGURANÇA',
    subtitle: 'TRANSFERÊNCIA RODOVIÁRIA VIRACOPOS -> CURITIBA',
    documentTitle: 'GUIA DE TRÂNSITO ADUANEIRO (DTA)',
    criticalClause: 'RASTREAMENTO SATELITAL INVIOLÁVEL ATÉ O CEINT'
  },
  SC_016: {
    component: 'IndustrialXRayHUD',
    title: 'TÚNEL DE BLINDAGEM DE CHUMBO DA RECEITA FEDERAL',
    subtitle: 'SCANNER ESPECTRAL CONTÍNUO // SEM PARADA DE ESTEIRA',
    nodeTitle: 'GERADOR DE RAIOS-X DE DUPLA ENERGIA',
    nodeStatus: 'VARREDURA ATÔMICA ATIVA',
    nodeLayer: 'ALFÂNDEGA INTERNACIONAL',
    metricLabel: 'TAXA DE INSPEÇÃO',
    metricValue: '1200 PC/H'
  },
  SC_017: {
    component: 'XRayTomographyDossier',
    title: 'ESPECTROMETRIA DE DUPLA ENERGIA (140kV & 100kV)',
    subtitle: 'MEDICÃO DE ATENUAÇÃO ATÔMICA POR NÚMERO EFETIVO Z_eff',
    props: {
      matchScore: '99.4% CONFORME',
      declaredCategory: 'FONE DE OUVIDO SEM FIO // BLUETOOTH',
      detectedMaterial: 'POLÍMEROS (LARANJA) + BATERIA DE LÍTIO (AZUL)'
    }
  },
  SC_018: {
    component: 'TechnicalSplitComparison',
    title: 'ATENUAÇÃO ATÔMICA // ESPECTRO DE COR',
    subtitle: 'COMO A RECEITA FEDERAL ENXERGA O INTERIOR DO PACOTE',
    props: {
      leftTitle: 'MATÉRIA ORGÂNICA',
      leftSubtitle: 'Z_eff: 6 A 8 // LARANJA ÂMBAR',
      leftValue: 'POLÍMEROS',
      leftNote: 'Plásticos, papel, tecido e revestimentos isolantes',
      rightTitle: 'METAIS PESADOS',
      rightSubtitle: 'Z_eff: 26+ // AZUL COBALTO',
      rightValue: 'LÍTIO / COBRE',
      rightNote: 'Células de bateria, condutores e circuitos integrados',
      accentColor: '#FF5500'
    }
  },
  SC_019: {
    component: 'XRayTomographyDossier',
    title: 'ALGORITMO NEURAL DA RECEITA FEDERAL',
    subtitle: 'CRUZAMENTO DA FORMA 3D COM A DECLARAÇÃO ADUANEIRA',
    props: {
      matchScore: '99.4% CONFORME',
      declaredCategory: 'ELETRÔNICO PORTÁTIL // ISENTO DE ANÁLISE MANUAL',
      detectedMaterial: 'DISPOSITIVO DE ÁUDIO COM ESTOJO DE RECARGA'
    }
  },
  SC_020: {
    component: 'LaserScanDossier',
    title: 'PROTOCOLO DE DESEMBARAÇO // REMESSA CONFORME',
    subtitle: 'TRIBUTAÇÃO PRÉ-PAGA E LIQUIDAÇÃO AUTOMÁTICA',
    documentTitle: 'SISTEMA DE COMÉRCIO EXTERIOR (SISCOMEX)',
    criticalClause: 'LIBERAÇÃO DIRETA PARA A MALHA DE DISTRIBUIÇÃO NACIONAL'
  },
  SC_021: {
    component: 'CrossBeltSorterHUD',
    title: 'CROSS-BELT SORTER // O MONSTRO MECÂNICO DO CEINT',
    subtitle: 'CIRCUITO FECHADO DE BANDEJAS MOTORIZADAS A 3,2 M/S',
    props: {
      speedMps: 3.2,
      throughputDay: '400.000 PACOTES / DIA',
      ejectionPulseMs: 100
    }
  },
  SC_024: {
    component: 'BarcodeVerificationMatrix',
    title: 'DECODIFICAÇÃO ÓPTICA // PADRÃO GS1-128',
    subtitle: 'LEITURA EM 20 MILISSEGUNDOS POR PÓRTICO OMNIDIRECIONAL',
    props: {
      toleranceMm: 0.12,
      barcodeStandard: 'CODE 128 + DATAMATRIX 2D',
      errorRisk: 'DESVIO DE ROTA EVITADO // ROTEAMENTO EM TEMPO REAL'
    }
  },
  SC_026: {
    component: 'BarcodeVerificationMatrix',
    title: 'O GARGALO REAL // O CÓDIGO DE BARRAS DE 1MM',
    subtitle: 'UM RASGO MILIMÉTRICO EJETA O PACOTE PARA A TRIAGEM MANUAL',
    props: {
      toleranceMm: 0.12,
      barcodeStandard: 'ETIQUETA TÉRMICA AUTOADESIVA',
      errorRisk: 'RETENÇÃO EM GALPÃO MANUAL COM 500 MIL PACOTES PARADOS'
    }
  },
  SC_030: {
    component: 'BigStatExplainer',
    title: 'VEREDITO FORENSE // A ENGENHARIA DO INVISÍVEL',
    subtitle: '18.000 KM PERCORRIDOS EM MENOS DE 10 DIAS ÚTEIS',
    props: {
      badgeText: 'VEREDITO CAUSAL // O OUTRO LADO',
      statValue: '18.340',
      unitText: 'KM',
      title: 'A SINCRONIA QUE NUNCA PODE PARAR',
      description: 'O produto não é barato porque a logística é simples; é barato porque viajou no vácuo de uma máquina transcontinental bilionária.',
      contextNote: 'Sustentado por um código de barras de um milímetro',
      sourceText: 'INVESTIGAR. REVELAR. COMPREENDER.',
      accentColor: '#FF5500'
    }
  }
};

export const rawItems = buildEncomendaChinaTimeline();

const contractInput: TimelineContractInput = {
  episodeId: 'encomenda-china-curitiba',
  fps: EPISODE_ENCOMENDA_CHINA_FPS,
  coldOpen: {
    sceneIds: ['SC_001', 'SC_002']
  },
  actBreaks: [6, 14, 22],
  hudWindows: motionPackage.hudWindows,
  audio: {
    musicBed: 'audio/music/cinematic/suspense/suspense_unseen_horrors.mp3',
    musicVolume: 0.20,
    voiceoverVolume: 1.0,
    sfxVolume: 0.40,
    ducking: true,
    duckedVolume: 0.10
  },
  scenes: rawItems.map((item) => {
    const specialized = SPECIALIZED_SCENES[item.sceneId];
    const assignment = motionPackage.sceneAssignments[item.sceneId];
    const isDossier = item.take_type === 'KEYFRAME_DOSSIER';
    const componentName = specialized?.component || assignment?.component || 'DynamicDocumentaryMedia';

    return {
      id: item.sceneId,
      name: item.name,
      chapterTitle: item.chapterTitle,
      component: componentName,
      take_type: item.take_type,
      allowed_sources: item.allowed_sources,
      durationSeconds: item.durationSeconds,
      visualSubject: item.visualSubject,
      integratedText: item.chapterTitle,
      callout: specialized ? undefined : assignment?.callout,
      motionRecipes: assignment?.motionRecipes || [],
      motionMode: assignment?.motionMode || item.motionMode,
      camera: specialized ? 'static' : (assignment?.camera || (isDossier ? 'drift' : 'pushIn')),
      transition: assignment?.transition || 'crossfade',
      voiceoverFile: `episodes/encomenda-china-curitiba/audio/narration/${item.sceneId}.mp3`,
      mediaFile: `episodes/encomenda-china-curitiba/takes/${item.sceneId}.mp4`,
      props: {
        ...(assignment?.props || {}),
        title: specialized?.title || assignment?.props?.title || item.name,
        subtitle: specialized?.subtitle || assignment?.props?.subtitle || item.chapterTitle,
        documentTitle: specialized?.documentTitle || specialized?.title || assignment?.props?.documentTitle || item.name,
        criticalClause: specialized?.criticalClause || specialized?.subtitle || assignment?.props?.criticalClause || item.chapterTitle,
        systemTitle: specialized?.systemTitle || specialized?.title || assignment?.props?.systemTitle || item.name,
        compartmentName: specialized?.compartmentName || specialized?.subtitle || assignment?.props?.compartmentName || item.chapterTitle,
        archetype: specialized?.archetype || assignment?.props?.archetype || 'chassis_terminal',
        nodeTitle: specialized?.nodeTitle || assignment?.props?.nodeTitle,
        nodeStatus: specialized?.nodeStatus || assignment?.props?.nodeStatus,
        metricLabel: specialized?.metricLabel || assignment?.props?.metricLabel,
        metricValue: specialized?.metricValue || assignment?.props?.metricValue,
        accentColor: '#FF5500',
        telemetryColor: '#00F0FF',
        durationInFrames: item.durationFrames,
        mediaPath: `episodes/encomenda-china-curitiba/takes/${item.sceneId}.mp4`,
        isDossierTake: false,
        imageSrc: `episodes/encomenda-china-curitiba/images/${item.sceneId}.png`,
        ...(specialized?.props || {})
      }
    };
  })
};

export const EPISODE_ENCOMENDA_CHINA_CALCULATED_TIMELINE: CalculatedTimeline = parseAndCalculateTimeline(contractInput);
export const EPISODE_ENCOMENDA_CHINA_TOTAL_SECONDS = EPISODE_ENCOMENDA_CHINA_CALCULATED_TIMELINE.totalDurationSeconds;
export const EPISODE_ENCOMENDA_CHINA_TOTAL_FRAMES = EPISODE_ENCOMENDA_CHINA_CALCULATED_TIMELINE.totalDurationFrames;
export const EPISODE_ENCOMENDA_CHINA_TIMELINE = EPISODE_ENCOMENDA_CHINA_CALCULATED_TIMELINE.scenes;
