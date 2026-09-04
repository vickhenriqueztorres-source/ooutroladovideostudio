import path from 'path';
import fs from 'fs';
import { MotionPackage, MotionSceneAssignment, MotionPackageSchema } from '../../contracts/motionContract';
import { TimelineCallout } from '../../contracts/timelineContract';
import { Logger } from '../../event-hub/logger';

export interface MotionDirectorInput {
  episodeId: string;
  runId?: string;
  rawScenes: Array<{
    sceneId: string;
    voiceover: string;
    visualSubject?: string;
    visual_must_include?: string[];
    canon_category?: string;
    required_category?: string;
    take_type: string;
    targetSeconds: number;
    order?: number;
  }>;
  episodeContract?: any;
}

export class MotionDirectorAgent {
  private name = 'MotionDirectorAgent';

  public buildMotionPackage(input: MotionDirectorInput): MotionPackage {
    Logger.info(this.name, `Gerando contrato de Motion Graphics para episódio '${input.episodeId}' (${input.rawScenes.length} cenas)...`);

    const assignments: Record<string, MotionSceneAssignment> = {};
    let matterCount = 0;
    let evidenceCount = 0;
    let mapsCount = 0;
    let revealCount = 0;
    let totalCallouts = 0;

    const total = input.rawScenes.length;

    for (let i = 0; i < total; i++) {
      const sc = input.rawScenes[i];
      const scId = sc.sceneId;
      const voLower = (sc.voiceover || '').toLowerCase();
      const visualSubject = sc.visualSubject || (sc.visual_must_include ? sc.visual_must_include.join(', ') : '');
      const subjLower = visualSubject.toLowerCase();
      const canonCat = String(sc.canon_category || '').toLowerCase();
      const reqCat = String(sc.required_category || '').toLowerCase();
      const isDossier = sc.take_type === 'KEYFRAME_DOSSIER' || ['evidence', 'maps', 'reveal'].includes(canonCat);

      let component = 'DynamicDocumentaryMedia';
      let props: Record<string, any> = {
        sceneNumber: scId,
        isDossierTake: isDossier,
        dossierTag: `EVIDÊNCIA FORENSE // ${scId}`
      };
      let callout: TimelineCallout | undefined;
      let motionMode: 'slow_push_in' | 'crash_push_in' | 'dramatic_pull_out' | 'pan_right' | 'pan_left' | 'cinematic_drift' =
        i % 2 === 0 ? 'slow_push_in' : 'cinematic_drift';
      let camera: 'pushIn' | 'drift' | 'tension' | 'static' | 'pullOut' | 'panRight' | 'panLeft' =
        isDossier ? 'drift' : 'pushIn';
      let transition: 'crossfade' | 'dipToBlack' | 'whipPan' | 'hardCut' | 'laserWipe' | 'wipe' | 'cut' =
        (i === 5 || i === 15 || i === 25) ? 'dipToBlack' : 'crossfade';

      if (!isDossier) {
        // Cenas de matéria observacional e filmagem bruta (50-60%)
        matterCount++;
        component = 'DynamicDocumentaryMedia';
      } else {
        // Classificação e alocação de componentes especializados de Motion Design
        const isMap = canonCat === 'maps' || reqCat.includes('map') || voLower.includes('mapa') || subjLower.includes('mapa') || voLower.includes('rota') || subjLower.includes('rota');
        const isReveal = canonCat === 'reveal' || reqCat.includes('cutaway') || reqCat.includes('schematic') || voLower.includes('prensa') || subjLower.includes('prensa') || voLower.includes('corte') || subjLower.includes('caldeira') || subjLower.includes('pistão') || voLower.includes('cilindro');
        const isScannerOrLaser = reqCat.includes('laser') || reqCat.includes('scan') || voLower.includes('laser') || subjLower.includes('laser') || voLower.includes('scanner') || subjLower.includes('scanner') || voLower.includes('fita magnética') || subjLower.includes('fita magnética') || voLower.includes('ultravioleta') || voLower.includes('infravermelho');

        if (isMap) {
          mapsCount++;
          component = 'CyberMapTrace';
          props = {
            ...props,
            routeTitle: `ROTA DE CUSTÓDIA // ${input.episodeId.toUpperCase()}`,
            originNode: 'POLO TÊXTIL / MATÉRIA-PRIMA',
            destNode: 'CASA DA MOEDA DO BRASIL',
            nodesCount: 12,
            accentColor: '#FF5500',
            telemetryColor: '#00F0FF'
          };
        } else if (isReveal) {
          revealCount++;
          component = 'TechnicalCutawaySchematic';
          props = {
            ...props,
            systemTitle: `SISTEMA INDUSTRIAL // ${scId}`,
            compartmentName: subjLower.includes('prensa') ? 'PRENSA CALCOGRÁFICA 80T' : 'UNIDADE TÉRMICA DE PROCESSAMENTO',
            compartmentSpecs: [
              'PRESSÃO NOMINAL: 80.000 KG',
              'MATRIZ: AÇO FUNDIDO USINADO',
              'CALIBRAÇÃO: TOLERÂNCIA ±0.01MM'
            ],
            schematicTag: `CORTE TÉCNICO // ${scId}`,
            accentColor: '#FF5500',
            telemetryColor: '#00F0FF'
          };
        } else if (isScannerOrLaser) {
          evidenceCount++;
          component = 'LaserScanDossier';
          props = {
            ...props,
            documentTitle: `VARREDURA ESPECTRAL // ${scId}`,
            documentSource: 'BANCO CENTRAL DO BRASIL // DEPARTAMENTO DO MEIO CIRCULANTE',
            criticalClause: 'PADRÃO DE AUTENTICIDADE // LEITURA ÓPTICA-MAGNÉTICA',
            clauseContext: 'CAMADA DE SEGURANÇA NÃO-REPRODUZÍVEL',
            stampText: 'FORENSE // NÍVEL 1',
            accentColor: '#FF5500'
          };
        } else {
          // Default de evidência: IndustrialXRayHUD
          evidenceCount++;
          component = 'IndustrialXRayHUD';
          props = {
            ...props,
            title: `ANÁLISE ESTRUTURAL // ${scId}`,
            subtitle: visualSubject.slice(0, 70),
            sceneNumber: scId,
            sourceText: 'FONTE: LAUDO TÉCNICO // CASA DA MOEDA',
            dateText: 'TELEMETRIA DOCUMENTAL ATIVA',
            latencyMs: 12,
            transactionsPerSec: '5.000 dobras',
            systemStressPercent: 88,
            accentColor: '#FF5500',
            telemetryColor: '#00F0FF'
          };
        }
      }

      // Injeção de Tipografia Cinética Editorial (KineticEditorialCallout) em cenas com dados de impacto
      if (
        isDossier ||
        voLower.includes('cem') ||
        voLower.includes('mil') ||
        voLower.includes('80') ||
        voLower.includes('algod') ||
        voLower.includes('fibra') ||
        voLower.includes('segredo') ||
        voLower.includes('press') ||
        voLower.includes('dobra') ||
        voLower.includes('ouro') ||
        i === 0 ||
        i === total - 1
      ) {
        let catText = 'INVESTIGAÇÃO FORENSE';
        let mainTxt = 'EVIDÊNCIA DO SISTEMA';
        let subTxt = 'ANÁLISE DOCUMENTAL';

        if (voLower.includes('algod') || voLower.includes('fibra')) {
          catText = 'MICROESTRUTURA TÊXTIL';
          mainTxt = '100% ALGODÃO NOBRE';
          subTxt = 'FIBRAS ENTRELAÇADAS PURAS';
        } else if (voLower.includes('80') || voLower.includes('prensa') || voLower.includes('tonelada')) {
          catText = 'PRESSÃO MECÂNICA';
          mainTxt = '80 TONELADAS';
          subTxt = 'CALCOGRAFIA CILÍNDRICA';
        } else if (voLower.includes('dobra') || voLower.includes('5000') || voLower.includes('cinco mil')) {
          catText = 'RESISTÊNCIA FÍSICA';
          mainTxt = '5.000 DOBRAS DUPLAS';
          subTxt = 'ENSAIO DE FADIGA ISO';
        } else if (voLower.includes('laser') || voLower.includes('infravermelho') || voLower.includes('sensor')) {
          catText = 'CAMADA DE SEGURANÇA';
          mainTxt = 'RESPOSTA MAGNÉTICA';
          subTxt = 'DETECÇÃO ÓPTICA AUTOMATIZADA';
        } else if (voLower.includes('jeans') || voLower.includes('atrito') || i === 0) {
          catText = 'CONDIÇÃO EXTREMA';
          mainTxt = 'ATRITO E UMIDADE';
          subTxt = 'DEGRADAÇÃO FÍSICA CONTÍNUA';
        } else if (i === total - 1) {
          catText = 'VERIFICAÇÃO FINAL';
          mainTxt = 'SISTEMA INCLONÁVEL';
          subTxt = 'FÍSICA DA MOEDA REAL';
        }

        callout = {
          categoryText: catText,
          mainText: mainTxt,
          subText: subTxt,
          position: i === total - 1 ? 'center' : 'bottom_left',
          startSeconds: 0.45,
          durationSeconds: 1.8
        };
        totalCallouts++;
      }

      assignments[scId] = {
        sceneId: scId,
        component,
        props,
        callout,
        motionMode,
        camera,
        transition
      };
    }

    // Janelas de HUD Global (HudDirector)
    const hudWindows = [
      {
        id: 'HUD_FORENSE_MASTER',
        component: 'AtomicStopwatch',
        componentName: 'AtomicStopwatch',
        props: { label: 'CRONÔMETRO DE ANÁLISE FORENSE // CASA DA MOEDA DO BRASIL' },
        zone: 'top_center' as const,
        appearances: [
          { startScene: 3, seconds: 8 },
          { startScene: 14, seconds: 8 },
          { startScene: 24, seconds: 8 }
        ]
      }
    ];

    const motionCount = evidenceCount + mapsCount + revealCount;
    const motionGraphicsPercentage = Math.round((motionCount / total) * 100);

    // Avaliação de Score de Qualidade (0 a 10)
    let qualityScore = 10;
    if (motionGraphicsPercentage < 15) qualityScore -= 3;
    if (totalCallouts < 6) qualityScore -= 3;
    if (hudWindows.length === 0) qualityScore -= 2;

    const distributionReport = {
      totalScenes: total,
      matterCount,
      evidenceCount,
      mapsCount,
      revealCount,
      motionGraphicsPercentage,
      totalCallouts,
      qualityScore
    };

    const motionPackage: MotionPackage = {
      episodeId: input.episodeId,
      runId: input.runId,
      sceneAssignments: assignments,
      hudWindows,
      distributionReport,
      compiledAt: new Date().toISOString()
    };

    // Validação estrita Zod
    return MotionPackageSchema.parse(motionPackage);
  }
}
