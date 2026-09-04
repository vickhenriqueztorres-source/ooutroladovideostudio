import {CalculatedTimeline, TimelineContractInput, parseAndCalculateTimeline} from '../contracts/timelineContract';
import {
  ENERGIA_IA_EPISODE_ID,
  ENERGIA_IA_RUN_ID,
  ENERGIA_IA_SCENES,
} from '../episodes/energiaIaDataCentersBlueprint';

const publicBase = `editorial/execution/${ENERGIA_IA_RUN_ID}`;
const crossfadeIndexes = new Set([4, 9, 17, 22, 30, 35, 43, 48, 56, 60, 67, 72]);
const chapterBreakIndexes = new Set([13, 26, 39, 51, 63]);
const chapterCalloutIndexes = new Set([0, 13, 26, 39, 51, 62]);
const explainerScenes: Record<string, {variant: 'query-chain' | 'queue-flow' | 'thermal-stack' | 'cooling-loop' | 'rack-cross-section' | 'power-route' | 'document-forecast'; title: string; subtitle: string; source: string}> = {
  EIA_001: {variant: 'query-chain', title: 'Uma pergunta deixa a tela', subtitle: 'A resposta começa como uma cadeia física de equipamentos.', source: 'estrutura editorial do episodio'},
  EIA_007: {variant: 'queue-flow', title: 'A fila tambem consome energia', subtitle: 'Pedidos entram, aguardam memoria e ocupam capacidade de calculo.', source: 'IEA Energy and AI, 2025'},
  EIA_009: {variant: 'rack-cross-section', title: 'O acelerador esta dentro do rack', subtitle: 'A placa e o caminho eletrico importam mais do que a interface.', source: 'U.S. DOE / PNNL, 2026'},
  EIA_013: {variant: 'thermal-stack', title: 'A eletricidade termina em calor', subtitle: 'Toda carga de computacao cria uma segunda demanda: retirar calor.', source: 'IEA Energy and AI, 2025'},
  EIA_015: {variant: 'rack-cross-section', title: 'A placa concentra a carga', subtitle: 'A energia percorre componentes pequenos antes de virar trabalho computacional.', source: 'U.S. DOE / PNNL, 2026'},
  EIA_026: {variant: 'cooling-loop', title: 'O frio tambem e infraestrutura', subtitle: 'Bombas, trocadores e racks formam um circuito continuo.', source: 'IEA Energy and AI, 2025'},
  EIA_030: {variant: 'cooling-loop', title: 'Refrigerar e uma operacao permanente', subtitle: 'O sistema termico acompanha a carga enquanto os servidores estao ligados.', source: 'IEA Energy and AI, 2025'},
  EIA_032: {variant: 'thermal-stack', title: 'O contato termico decide o limite', subtitle: 'A transferencia de calor acontece no encontro entre modulo, placa e fluido.', source: 'U.S. DOE / PNNL, 2026'},
  EIA_039: {variant: 'cooling-loop', title: 'A carga encontra um gargalo material', subtitle: 'Quando o circuito termico nao acompanha, a potencia util fica limitada.', source: 'IEA Energy and AI, 2025'},
  EIA_061: {variant: 'document-forecast', title: 'A previsao aparece no papel', subtitle: 'A demanda projetada cresce antes que a rede esteja pronta para entrega-la.', source: 'EPE / Schneider Electric Brasil, 2026'},
  EIA_070: {variant: 'power-route', title: 'A resposta termina na subestacao', subtitle: 'O ultimo limite nao esta no modelo: esta no ponto fisico de conexao.', source: 'IEA Energy and AI, 2025'},
};

function motionsFor(index: number): NonNullable<TimelineContractInput['scenes'][number]['motionRecipes']> {
  const common = {startSeconds: 1.0, durationSeconds: 1.55, zone: 'bottom_right' as const, verifiedData: true};
  switch (index) {
    case 10:
      return [{...common, id: 'EIA_M01_VARIABLE_QUERY', type: 'comparison', source: 'IEA Energy and AI, 2025', title: 'ENERGIA POR RESPOSTA', left: {label: 'PERGUNTA CURTA', value: 'VARIÁVEL'}, right: {label: 'RESPOSTA LONGA', value: 'VARIÁVEL'}}];
    case 18:
      return [{...common, id: 'EIA_M02_RACK_POWER', type: 'verified_counter', source: 'U.S. DOE / PNNL, 2026', startValue: 0, endValue: 120, suffix: ' kW', label: 'RACK DE IA ATUAL'}];
    case 37:
      return [{...common, id: 'EIA_M03_COOLING_SHARE', type: 'data_bars', source: 'IEA Energy and AI, 2025', title: 'PARTE DA ENERGIA EM REFRIGERAÇÃO', unit: '%', items: [{label: 'EFICIENTE', value: 7, displayValue: '7%'}, {label: 'MENOS EFICIENTE', value: 30, displayValue: '30%'}]}];
    case 47:
      return [{...common, id: 'EIA_M04_GRID_LOCATION', type: 'source_caption', source: 'IEA Energy and AI, 2025', text: 'A potência precisa existir no ponto físico de conexão.'}];
    case 52:
      return [{...common, id: 'EIA_M05_EPE_FORECAST', type: 'document_highlight', source: 'Empresa de Pesquisa Energética', documentTitle: 'DEMANDA DE DATA CENTERS NO SIN', excerpt: '53 MW médios em 2025 para 1.020 MW médios em 2029.'}];
    case 61:
      return [{...common, id: 'EIA_M06_BRAZIL_SCENARIOS', type: 'comparison', source: 'Schneider Electric Brasil / MDIC, 2026', title: 'CAPACIDADE NO BRASIL EM 2050', left: {label: 'CENÁRIO RESTRITO', value: '26 GW'}, right: {label: 'CENÁRIO EXPANDIDO', value: '45 GW'}}];
    case 63:
      return [{...common, id: 'EIA_M07_PROCESS_CHAIN', type: 'process_chain', title: 'UMA RESPOSTA', steps: ['GPU', 'RACK', 'REFRIGERAÇÃO', 'UPS', 'SUBESTAÇÃO'], activeStep: 4}];
    case 71:
      return [{...common, id: 'EIA_M08_NO_SUBSTATION', type: 'source_caption', source: 'IEA Energy and AI, 2025', text: 'Eficiência reduz consumo; não substitui conexão elétrica.'}];
    default:
      return [];
  }
}

export function buildEnergiaIaDataCentersTimelineContract(): TimelineContractInput {
  return {
    episodeId: ENERGIA_IA_EPISODE_ID,
    motionLanguage: 'documentary-field-v4',
    fps: 30,
    coldOpen: {sceneIds: ENERGIA_IA_SCENES.slice(0, 4).map((scene) => scene.sceneId)},
    actBreaks: [13, 26, 39, 51],
    hudWindows: [],
    audio: {
      musicBed: `${publicBase}/audio/music/bed.wav`,
      sfxBed: `${publicBase}/audio/sfx/bed.wav`,
      musicVolume: 0.2,
      voiceoverVolume: 1,
      sfxVolume: 0.34,
      ducking: true,
      duckedVolume: 0.08,
    },
    scenes: ENERGIA_IA_SCENES.map((scene, index) => ({
      id: scene.sceneId,
      name: scene.visualSubject,
      chapterId: scene.chapterId,
      chapterTitle: scene.chapterTitle,
      component: explainerScenes[scene.sceneId] ? 'EnergyInfrastructureExplainerScene' : 'FieldDocumentaryScene',
      durationSeconds: scene.targetSeconds,
      transition: chapterBreakIndexes.has(index) ? 'dipToBlack' : crossfadeIndexes.has(index) ? 'crossfade' : 'cut',
      camera: 'static',
      take_type: 'CINEMATIC_TAKE',
      voiceoverFile: `${publicBase}/audio/narration/${scene.sceneId}.mp3`,
      voiceoverText: scene.voiceover,
      mediaFile: `${publicBase}/scenes/${scene.sceneId}/firefly_take.mp4`,
      visualSubject: scene.visualSubject,
      callout: chapterCalloutIndexes.has(index)
        ? {
            categoryText: `CAPÍTULO ${Number(scene.chapterId.replace('CH', ''))}`,
            mainText: scene.title || scene.chapterTitle,
            subText: scene.subtitle || 'a evidência permanece no quadro',
            position: 'bottom_left',
            startSeconds: 0.4,
            durationSeconds: 1.6,
          }
        : undefined,
      motionRecipes: motionsFor(index),
      props: {
        sceneId: scene.sceneId,
        mediaPath: `${publicBase}/scenes/${scene.sceneId}/firefly_take.mp4`,
        durationInFrames: Math.round(scene.targetSeconds * 30),
        evidenceLabel: scene.required_category === 'matter' ? undefined : scene.required_category.toUpperCase(),
        ...(explainerScenes[scene.sceneId] ? {
          explainerVariant: explainerScenes[scene.sceneId].variant,
          explainerTitle: explainerScenes[scene.sceneId].title,
          explainerSubtitle: explainerScenes[scene.sceneId].subtitle,
          explainerSource: explainerScenes[scene.sceneId].source,
        } : {}),
      },
    })),
  };
}

export const ENERGIA_IA_TIMELINE_CONTRACT = buildEnergiaIaDataCentersTimelineContract();
export const EPISODE_ENERGIA_IA_CALCULATED_TIMELINE: CalculatedTimeline = parseAndCalculateTimeline(ENERGIA_IA_TIMELINE_CONTRACT);
export const EPISODE_ENERGIA_IA_TOTAL_FRAMES = EPISODE_ENERGIA_IA_CALCULATED_TIMELINE.totalDurationFrames;
