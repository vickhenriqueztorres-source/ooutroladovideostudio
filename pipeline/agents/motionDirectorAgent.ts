import path from 'path';
import fs from 'fs';
import { MotionPackage, MotionSceneAssignment, MotionPackageSchema } from '../../contracts/motionContract';
import { TimelineCallout } from '../../contracts/timelineContract';
import { DocumentaryMotionRecipe, DocumentaryMotionRecipeSchema } from '../../contracts/documentaryMotionContract';
import { Logger } from '../../event-hub/logger';
import { MotionSquadOrchestrator, SquadDevelopmentResult } from '../motion-squad/motionSquadOrchestrator';

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
  enableAutonomous3DSquad?: boolean;
}

interface ParsedMetric {
  value: number;
  stringValue: string;
  unit: string;
  full: string;
}

export class MotionDirectorAgent {
  private name = 'MotionDirectorAgent';

  /**
   * Extrai métricas e unidades de um texto (ex: "7.5 GHz", "256 bits", "80 toneladas", "15 km", "5.000 dobras").
   */
  private extractMetric(text: string): ParsedMetric | null {
    const regex = /(\d+[\.,]?\d*)\s*(ghz|mhz|khz|hz|bits?|kbps|mbps|gbps|km|m\b|cm|mm|µm|nm|ms|s\b|db|mw|kw|gw|toneladas?|ton|t\b|%|volts?|v\b|amperes?|a\b|dobras?)/i;
    const match = text.match(regex);
    if (!match) return null;

    const numStr = match[1].replace(',', '.');
    const num = parseFloat(numStr);
    if (isNaN(num)) return null;

    const unit = match[2];
    return {
      value: num,
      stringValue: match[1],
      unit,
      full: `${match[1]} ${unit}`
    };
  }

  /**
   * Detecta o arquétipo 3D/CAD ideal para o TechnicalCutawaySchematic a partir da semântica da cena.
   */
  private detectArchetype(
    text: string
  ): 'conduit_gallery' | 'chassis_terminal' | 'orbital_satellite' | 'electronic_rack' | 'aircraft' {
    if (
      text.includes('satélite') ||
      text.includes('órbita') ||
      text.includes('antena') ||
      text.includes('transponder') ||
      text.includes('banda x') ||
      text.includes('sgdc') ||
      text.includes('uplink')
    ) {
      return 'orbital_satellite';
    }
    if (
      text.includes('avião') ||
      text.includes('aeronave') ||
      text.includes('vc-1') ||
      text.includes('fuselagem') ||
      text.includes('voo') ||
      text.includes('aéreo')
    ) {
      return 'aircraft';
    }
    if (
      text.includes('terminal') ||
      text.includes('monofone') ||
      text.includes('telefone') ||
      text.includes('teclado') ||
      text.includes('aparelho') ||
      text.includes('chassi') ||
      text.includes('chip') ||
      text.includes('prensa') ||
      text.includes('cédula') ||
      text.includes('moeda')
    ) {
      return 'chassis_terminal';
    }
    if (
      text.includes('rack') ||
      text.includes('servidor') ||
      text.includes('processador') ||
      text.includes('comutador') ||
      text.includes('painel') ||
      text.includes('painéis')
    ) {
      return 'electronic_rack';
    }
    return 'conduit_gallery';
  }

  /**
   * Gera callout editorial cinético contextualizado com garantia de 100% de cobertura.
   */
  private generateCallout(
    sc: MotionDirectorInput['rawScenes'][number],
    index: number,
    total: number,
    episodeId: string
  ): TimelineCallout | undefined {
    const voLower = (sc.voiceover || '').toLowerCase();
    const visualSubject = sc.visualSubject || (sc.visual_must_include ? sc.visual_must_include.join(', ') : '');
    const subjLower = visualSubject.toLowerCase();
    const combined = `${voLower} ${subjLower}`;

    const metric = this.extractMetric(combined);

    let catText: string | null = null;
    let mainTxt: string | null = null;
    let subTxt: string | null = null;

    if (metric) {
      const u = metric.unit.toLowerCase();
      if (u.includes('ghz') || u.includes('mhz') || u.includes('khz') || u.includes('hz')) {
        catText = 'ESTABILIDADE DE REDE';
        mainTxt = metric.full.toUpperCase();
        subTxt = 'TOLERÂNCIA CRÍTICA DO SISTEMA';
      } else if (u.includes('kv') || u.includes('volt') || u.includes('v')) {
        catText = 'TENSÃO DE TRANSMISSÃO';
        mainTxt = metric.full.toUpperCase();
        subTxt = 'CORREDOR DE ULTRA-ALTA TENSÃO';
      } else if (u.includes('mw') || u.includes('kw') || u.includes('gw')) {
        catText = 'POTÊNCIA ELÉTRICA ATIVA';
        mainTxt = metric.full.toUpperCase();
        subTxt = 'DEMANDA INSTANTÂNEA NACIONAL';
      } else if (u.includes('km')) {
        catText = 'ESCALA TERRITORIAL';
        mainTxt = metric.full.toUpperCase();
        subTxt = 'EXTENSÃO DO LINHÃO NACIONAL';
      } else if (u.includes('bit')) {
        catText = 'CHAVE CRIPTOGRÁFICA';
        mainTxt = metric.full.toUpperCase();
        subTxt = 'ENCRIPTAÇÃO ASSIMÉTRICA MILITAR';
      } else if (u.includes('ton')) {
        catText = 'MASSA DO ROTOR';
        mainTxt = metric.full.toUpperCase();
        subTxt = 'INÉRCIA MECÂNICA DAS TURBINAS';
      } else {
        catText = 'PARÂMETRO VERIFICADO';
        mainTxt = metric.full.toUpperCase();
        subTxt = visualSubject.slice(0, 32).toUpperCase() || 'AUDITORIA FORENSE';
      }
    } else if (combined.includes('frequência') || combined.includes('60 hz') || combined.includes('hertz') || combined.includes('oscila')) {
      catText = 'ESTABILIDADE CONTINENTAL';
      mainTxt = '60 CICLOS POR SEGUNDO';
      subTxt = 'EQUILÍBRIO INSTÁVEL DE REDE';
    } else if (combined.includes('tomada') || combined.includes('plugue') || combined.includes('carregador') || combined.includes('bateria') || combined.includes('armazenad')) {
      catText = 'MECANISMO OCULTO';
      mainTxt = 'ZERO ESTOQUE FÍSICO';
      subTxt = 'GERAÇÃO E CONSUMO SIMULTÂNEOS';
    } else if (combined.includes('itaipu') || combined.includes('belo monte') || combined.includes('hidrelétrica') || combined.includes('turbina')) {
      catText = 'GERAÇÃO DE POTÊNCIA';
      mainTxt = 'TURBINAS GIGANTES';
      subTxt = 'CONVERSÃO HIDRÁULICA DIRETA';
    } else if (combined.includes('transformador') || combined.includes('subestação') || combined.includes('disjuntor') || combined.includes('sf6')) {
      catText = 'INFRAESTRUTURA FÍSICA';
      mainTxt = 'PÁTIO DE SUBESTAÇÃO';
      subTxt = 'EXTINÇÃO DE ARCO POR GÁS SF6';
    } else if (combined.includes('ons') || combined.includes('sin') || (combined.includes('despacho') && episodeId.includes('rede-eletrica')) || combined.includes('despacho de carga')) {
      catText = 'CONTROLE CENTRALIZADO';
      mainTxt = 'SISTEMA INTERLIGADO (SIN)';
      subTxt = 'DESPACHO NACIONAL EM TEMPO REAL';
    } else if (combined.includes('curitiba') || combined.includes('ceint') || combined.includes('cross-belt')) {
      catText = 'HUB INTERNACIONAL';
      mainTxt = 'CEINT CURITIBA';
      subTxt = 'TRIAGEM DE 400.000 PACOTES/DIA';
    } else if (combined.includes('pacote') || combined.includes('palete') || combined.includes('despacho')) {
      catText = 'LOGÍSTICA INTERNACIONAL';
      mainTxt = 'CONSOLIDAÇÃO DE CARGA';
      subTxt = 'LOGÍSTICA DE ESCALA GLOBAL';
    } else if (combined.includes('linha') || combined.includes('transmissão') || combined.includes('800 kv') || combined.includes('hvdc') || combined.includes('torre')) {
      catText = 'TRANSPORTE DE ENERGIA';
      mainTxt = 'LINHÃO DE 800 KV DC';
      subTxt = 'TRANSPORTE POR 2.500 KM';
    } else if (combined.includes('apagão') || combined.includes('queda') || combined.includes('relé') || combined.includes('gargalo') || combined.includes('erac') || combined.includes('colapso')) {
      catText = 'PONTO CRÍTICO';
      mainTxt = 'CORTE AUTOMÁTICO DE CARGA';
      subTxt = 'PROTEÇÃO DAS TURBINAS DO PAÍS';
    } else if (combined.includes('watt') || combined.includes('filamento') || combined.includes('led') || combined.includes('elétron') || combined.includes('lâmpada')) {
      catText = 'FÍSICA DA ELETRICIDADE';
      mainTxt = '1 WATT EM TEMPO REAL';
      subTxt = 'TRABALHO ELÉTRICO INSTANTÂNEO';
    } else if (index === 0) {
      catText = 'INVESTIGAÇÃO FORENSE';
      mainTxt = 'O OUTRO LADO DA TOMADA';
      subTxt = 'A MÁQUINA DE 60 HERTZ';
    } else if (index === total - 1) {
      catText = 'VEREDITO DO SISTEMA';
      mainTxt = 'A MÁQUINA QUE NÃO PARA';
      subTxt = 'CONEXÃO DIRETA COM A USINA';
    } else {
      // Fallback inteligente para garantir 100% de cenas explicativas
      catText = 'DOSSIÊ TÉCNICO // O OUTRO LADO';
      mainTxt = (sc.visualSubject || 'INFRAESTRUTURA CRÍTICA').slice(0, 36).toUpperCase();
      subTxt = 'ANÁLISE DE ENGENHARIA FORENSE';
    }

    const durationSeconds = 2.0;

    return {
      categoryText: catText,
      mainText: mainTxt,
      subText: subTxt,
      position: index === total - 1 ? 'center' : 'bottom_left',
      startSeconds: 0.45,
      durationSeconds
    };
  }

  /**
   * Gera receitas de motion graphics documentais (DocumentaryOverlayDirector)
   * garantindo ausência de colisão com KineticEditorialCallout e alto valor didático.
   */
  private generateMotionRecipes(
    sc: MotionDirectorInput['rawScenes'][number],
    callout: TimelineCallout | undefined,
    episodeId: string
  ): DocumentaryMotionRecipe[] {
    const voLower = (sc.voiceover || '').toLowerCase();
    const visualSubject = sc.visualSubject || (sc.visual_must_include ? sc.visual_must_include.join(', ') : '');
    const combined = `${voLower} ${visualSubject.toLowerCase()}`;
    const targetSec = sc.targetSeconds || 8.0;

    const startSeconds = callout ? 2.6 : 1.0;
    const maxAllowedDuration = targetSec - startSeconds - 0.4;
    if (maxAllowedDuration < 1.0) return [];

    const durationSeconds = Math.min(4.5, Math.max(1.5, Math.round(maxAllowedDuration * 10) / 10));
    const recipes: DocumentaryMotionRecipe[] = [];
    const scId = sc.sceneId;

    if (
      combined.includes('itaipu') ||
      combined.includes('belo monte') ||
      combined.includes('brasília') ||
      combined.includes('xingu')
    ) {
      const place = combined.includes('itaipu')
        ? 'USINA HIDRELÉTRICA ITAIPU BINACIONAL'
        : combined.includes('belo monte')
        ? 'UHE BELO MONTE // RIO XINGU'
        : 'SALA DE CONTROLE ONS // BRASÍLIA-DF';

      const coords = combined.includes('itaipu')
        ? '25°24\'28"S 54°35\'24"W'
        : combined.includes('belo monte')
        ? '03°07\'27"S 51°42\'01"W'
        : '15°47\'56"S 47°51\'39"W';

      const recipeCandidate = {
        id: `LOC_${scId}`,
        type: 'location_stamp' as const,
        startSeconds,
        durationSeconds,
        zone: 'bottom_left' as const,
        colorRole: 'telemetry' as const,
        verifiedData: true,
        source: 'CARTOGRAFIA OFICIAL // SIN',
        place,
        coordinates: coords,
        context: 'NÓ ESTRATÉGICO DA REDE NACIONAL'
      };
      const parsed = DocumentaryMotionRecipeSchema.safeParse(recipeCandidate);
      if (parsed.success) recipes.push(parsed.data);
    } else if (
      combined.includes('60 hz') ||
      combined.includes('frequência') ||
      combined.includes('hertz') ||
      combined.includes('59,5') ||
      combined.includes('59.5')
    ) {
      const isTrip = combined.includes('59,5') || combined.includes('59.5');
      const recipeCandidate = {
        id: `CNT_${scId}`,
        type: 'verified_counter' as const,
        startSeconds,
        durationSeconds,
        zone: 'bottom_right' as const,
        colorRole: isTrip ? ('evidence' as const) : ('telemetry' as const),
        verifiedData: true,
        source: 'ONS // PROCEDIMENTOS DE REDE 2.3',
        startValue: isTrip ? 60.0 : 59.0,
        endValue: isTrip ? 59.5 : 60.0,
        decimals: 2,
        suffix: ' Hz',
        label: isTrip ? 'SUB-FREQUÊNCIA CRÍTICA (ERAC)' : 'FREQUÊNCIA SINCRONIZADA'
      };
      const parsed = DocumentaryMotionRecipeSchema.safeParse(recipeCandidate);
      if (parsed.success) recipes.push(parsed.data);
    } else if (
      combined.includes('apagão') ||
      combined.includes('colapso') ||
      combined.includes('relé') ||
      combined.includes('gargalo')
    ) {
      const recipeCandidate = {
        id: `CMP_${scId}`,
        type: 'comparison' as const,
        startSeconds,
        durationSeconds,
        zone: 'bottom_right' as const,
        colorRole: 'risk' as const,
        verifiedData: true,
        source: 'ONS // ESQUEMA REGIONAL DE ALÍVIO DE CARGA',
        title: 'CORTE AUTOMÁTICO EM CASCATA',
        left: { label: 'POTÊNCIA CORTADA', value: '3.400 MW' },
        right: { label: 'OBJETIVO DA DEFESA', value: 'SALVAR TURBINAS' }
      };
      const parsed = DocumentaryMotionRecipeSchema.safeParse(recipeCandidate);
      if (parsed.success) {
        recipes.push(parsed.data);
      } else {
        console.error(`[RECIPE_PARSE_ERROR] ${scId} (CMP-RISK):`, JSON.stringify(parsed.error.issues, null, 2));
      }
    } else if (
      combined.includes('bateria') ||
      combined.includes('estoque') ||
      combined.includes('reserva') ||
      combined.includes('armazen')
    ) {
      const recipeCandidate = {
        id: `CMP_${scId}`,
        type: 'comparison' as const,
        startSeconds,
        durationSeconds,
        zone: 'bottom_right' as const,
        colorRole: 'evidence' as const,
        verifiedData: true,
        source: 'LEI DA CONSERVAÇÃO // ELETRODINÂMICA',
        title: 'PARADIGMA DA REDE',
        left: { label: 'CRENÇA POPULAR', value: 'BATERIA' },
        right: { label: 'REALIDADE FÍSICA', value: '0 ms DE ESTOQUE' }
      };
      const parsed = DocumentaryMotionRecipeSchema.safeParse(recipeCandidate);
      if (parsed.success) recipes.push(parsed.data);
    } else if (
      combined.includes('etapa') ||
      combined.includes('transmissão') ||
      combined.includes('caminho') ||
      combined.includes('trajeto') ||
      combined.includes('distribui')
    ) {
      const recipeCandidate = {
        id: `PRC_${scId}`,
        type: 'process_chain' as const,
        startSeconds,
        durationSeconds,
        zone: 'bottom_center' as const,
        colorRole: 'neutral' as const,
        source: 'ONS // FLUXO DO SISTEMA INTERLIGADO',
        title: 'CADEIA DA ELETRICIDADE',
        steps: ['TURBINA', 'SUBESTAÇÃO ELEVADORA', '800 KV DC', 'SUBESTAÇÃO ABAIXADORA', 'TOMADA'],
        activeStep: 2
      };
      const parsed = DocumentaryMotionRecipeSchema.safeParse(recipeCandidate);
      if (parsed.success) {
        recipes.push(parsed.data);
      } else {
        console.error(`[RECIPE_PARSE_ERROR] ${scId} (type ${recipeCandidate.type}):`, JSON.stringify(parsed.error.issues, null, 2));
      }
    } else {
      const metric = this.extractMetric(combined);
      if (metric && metric.value > 0) {
        const recipeCandidate = {
          id: `CNT_${scId}`,
          type: 'verified_counter' as const,
          startSeconds,
          durationSeconds,
          zone: 'bottom_right' as const,
          colorRole: 'evidence' as const,
          verifiedData: true,
          source: 'METROLOGIA E NORMAS TÉCNICAS ABNT/ONS',
          startValue: 0,
          endValue: metric.value,
          suffix: ` ${metric.unit.toUpperCase()}`,
          label: 'PARÂMETRO VERIFICADO'
        };
        const parsed = DocumentaryMotionRecipeSchema.safeParse(recipeCandidate);
        if (parsed.success) {
          recipes.push(parsed.data);
        } else {
          console.error(`[RECIPE_PARSE_ERROR] ${scId} (CNT):`, JSON.stringify(parsed.error.issues, null, 2));
        }
      } else {
        const text = sc.voiceover && sc.voiceover.length > 20
          ? (sc.voiceover.length > 100 ? `${sc.voiceover.slice(0, 97)}...` : sc.voiceover)
          : 'AUDITORIA FORENSE DO SISTEMA INTERLIGADO NACIONAL';
        const recipeCandidate = {
          id: `SRC_${scId}`,
          type: 'source_caption' as const,
          startSeconds,
          durationSeconds,
          zone: 'bottom_center' as const,
          colorRole: 'neutral' as const,
          source: 'DOCUMENTÁRIO INVESTIGATIVO // O OUTRO LADO',
          text
        };
        const parsed = DocumentaryMotionRecipeSchema.safeParse(recipeCandidate);
        if (parsed.success) {
          recipes.push(parsed.data);
        } else {
          console.error(`[RECIPE_PARSE_ERROR] ${scId} (SRC):`, JSON.stringify(parsed.error.issues, null, 2));
        }
      }
    }

    return recipes;
  }

  public buildMotionPackage(input: MotionDirectorInput): MotionPackage {
    Logger.info(
      this.name,
      `Gerando contrato dinâmico de Motion Graphics para '${input.episodeId}' (${input.rawScenes.length} cenas)...`
    );

    // Aciona o Squad de Motion Graphics se solicitado
    let developedMotions: Record<string, SquadDevelopmentResult> = {};
    if (input.enableAutonomous3DSquad) {
      developedMotions = MotionSquadOrchestrator.developMotionsForEpisode(input.episodeId, input.rawScenes);
    }

    const assignments: Record<string, MotionSceneAssignment> = {};
    let matterCount = 0;
    let evidenceCount = 0;
    let mapsCount = 0;
    let revealCount = 0;
    let totalCallouts = 0;

    const total = input.rawScenes.length;
    const epSlugUpper = input.episodeId.replace(/-/g, ' ').toUpperCase();

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

      const motionMode: 'slow_push_in' | 'crash_push_in' | 'dramatic_pull_out' | 'pan_right' | 'pan_left' | 'cinematic_drift' =
        i % 2 === 0 ? 'slow_push_in' : 'cinematic_drift';
      const camera: 'pushIn' | 'drift' | 'tension' | 'static' | 'pullOut' | 'panRight' | 'panLeft' =
        isDossier ? 'drift' : 'pushIn';
      const transition: 'crossfade' | 'dipToBlack' | 'whipPan' | 'hardCut' | 'laserWipe' | 'wipe' | 'cut' =
        (i === 5 || i === 15 || i === 25) ? 'dipToBlack' : 'crossfade';

      if (!isDossier) {
        matterCount++;
        component = 'DynamicDocumentaryMedia';
      } else {
        const isMap =
          canonCat === 'maps' ||
          reqCat.includes('map') ||
          voLower.includes('mapa') ||
          subjLower.includes('mapa') ||
          voLower.includes('rota') ||
          subjLower.includes('rota') ||
          (voLower.includes('satélite') && voLower.includes('cobertura'));

        const isReveal =
          canonCat === 'reveal' ||
          reqCat.includes('cutaway') ||
          reqCat.includes('schematic') ||
          voLower.includes('corte') ||
          subjLower.includes('corte') ||
          voLower.includes('duto') ||
          subjLower.includes('duto') ||
          voLower.includes('chassi') ||
          subjLower.includes('chassi') ||
          voLower.includes('prensa') ||
          subjLower.includes('prensa');

        const isScannerOrLaser =
          reqCat.includes('laser') ||
          reqCat.includes('scan') ||
          voLower.includes('laser') ||
          subjLower.includes('laser') ||
          voLower.includes('scanner') ||
          subjLower.includes('scanner') ||
          voLower.includes('espectr') ||
          subjLower.includes('espectr') ||
          voLower.includes('microfone laser');

        if (isMap) {
          mapsCount++;
          component = 'CyberMapTrace';
          props = {
            ...props,
            routeTitle: `ROTA DE CUSTÓDIA // ${epSlugUpper}`,
            originNode: 'ESTAÇÃO EMISSORA PRIMÁRIA',
            destNode: 'TERMINAL DE DESTINO AUTORIZADO',
            nodesCount: 12,
            accentColor: '#FF5500',
            telemetryColor: '#00F0FF'
          };
        } else if (isReveal) {
          revealCount++;
          if (developedMotions[scId]) {
            const dev = developedMotions[scId];
            component = dev.componentName;
            props = {
              ...props,
              headerTag: dev.choreography.hudProps.headerTag,
              title: dev.choreography.hudProps.title,
              subtitle: dev.choreography.hudProps.subtitle,
              accentColor: '#FF5500',
              telemetryColor: '#00F0FF'
            };
          } else {
            const archetype = this.detectArchetype(`${voLower} ${subjLower}`);
            component = 'TechnicalCutawaySchematic';
            props = {
              ...props,
              archetype,
              systemTitle: `SISTEMA TÉCNICO // ${scId}`,
              compartmentName: visualSubject ? visualSubject.slice(0, 48).toUpperCase() : `SUBSISTEMA OPERACIONAL // ${scId}`,
              compartmentSpecs: [
                'CALIBRAÇÃO: TOLERÂNCIA ±0.01MM',
                'ISOLAMENTO: CONFORME ESPECIFICAÇÃO',
                'TELEMETRIA: OPERACIONAL'
              ],
              schematicTag: `CORTE TÉCNICO // ${scId}`,
              accentColor: '#FF5500',
              telemetryColor: '#00F0FF'
            };
          }
        } else if (isScannerOrLaser) {
          evidenceCount++;
          component = 'LaserScanDossier';
          const clause = sc.voiceover.length > 70 ? `${sc.voiceover.slice(0, 67)}...` : sc.voiceover;
          props = {
            ...props,
            documentTitle: `VARREDURA ESPECTRAL // ${scId}`,
            documentSource: `AUDITORIA FORENSE // ${epSlugUpper}`,
            criticalClause: clause.toUpperCase(),
            clauseContext: 'CAMADA DE SEGURANÇA E CONFORMIDADE TÉCNICA',
            stampText: 'FORENSE // NÍVEL 1',
            accentColor: '#FF5500'
          };
        } else {
          evidenceCount++;
          component = 'IndustrialXRayHUD';
          const metric = this.extractMetric(`${voLower} ${subjLower}`);
          props = {
            ...props,
            title: `ANÁLISE ESTRUTURAL // ${scId}`,
            subtitle: visualSubject.slice(0, 70),
            sceneNumber: scId,
            nodeTitle: visualSubject.slice(0, 36).toUpperCase() || `NÓ ${scId}`,
            nodeStatus: 'OPERACIONAL // 100%',
            nodeLayer: 'CAMADA FÍSICA CLASSIFICADA',
            metricLabel: metric ? 'PARÂMETRO VERIFICADO' : 'LATÊNCIA DE ENLACE',
            metricValue: metric ? metric.full.toUpperCase() : '12 ms',
            flowTitle: 'PROTOCOLO DE TRANSMISSÃO SEGURA',
            flowStages: ['CAPTURA', 'ENCRIPTAÇÃO', 'MODULAÇÃO', 'TRANSMISSÃO'],
            currentFlowIndex: 2,
            sourceText: `FONTE: AUDITORIA FORENSE // ${epSlugUpper}`,
            dateText: 'TELEMETRIA DOCUMENTAL ATIVA',
            latencyMs: 12,
            transactionsPerSec: metric ? metric.full : '120 op/s',
            systemStressPercent: 88,
            accentColor: '#FF5500',
            telemetryColor: '#00F0FF'
          };
        }
      }

      // Tipografia Cinética Editorial Dinâmica (KineticEditorialCallout)
      const callout = this.generateCallout(sc, i, total, input.episodeId);
      if (callout) {
        totalCallouts++;
      }

      // Receitas de Motion Graphics Documentais (DocumentaryOverlayDirector)
      const motionRecipes = this.generateMotionRecipes(sc, callout, input.episodeId);

      assignments[scId] = {
        sceneId: scId,
        component,
        props,
        callout,
        motionRecipes,
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
        props: { label: `CRONÔMETRO DE AUDITORIA FORENSE // ${epSlugUpper}` },
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

    return MotionPackageSchema.parse(motionPackage);
  }
}

