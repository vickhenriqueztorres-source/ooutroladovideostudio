import {
  MotionBlueprint,
  MotionArchetype,
  PhysicalVariable,
  MotionLayer3D
} from '../../contracts/motionBlueprintContract';
import { Logger } from '../../event-hub/logger';

export interface SceneInput {
  sceneId: string;
  voiceover: string;
  visualSubject?: string;
  required_category?: string;
  canon_category?: string;
  take_type?: string;
  targetSeconds?: number;
}

export class ScriptPhysicsDeconstructor {
  private static readonly NAME = 'ScriptPhysicsDeconstructor';

  /**
   * Disseca semanticamente e fisicamente o texto do narrador e a descrição visual da cena,
   * extraindo variáveis metrológicas, camadas mecânicas e o arquétipo 3D.
   */
  public static deconstruct(scene: SceneInput, episodeSlug: string): MotionBlueprint {
    Logger.info(this.NAME, `Dissecando física da cena '${scene.sceneId}' para o episódio '${episodeSlug}'...`);

    const text = `${scene.voiceover} ${scene.visualSubject || ''} ${scene.required_category || ''}`.toLowerCase();

    // 1. Determina o Arquétipo 3D
    const archetype = this.detectArchetype(text, scene.canon_category);

    // 2. Extrai Variáveis Físicas e Métricas Reais do Roteiro
    const physicalVariables = this.extractPhysicalVariables(text, scene.sceneId);

    // 3. Modela as Camadas 3D (Layers) Físicas
    const layers = this.modelLayers(text, scene.sceneId, archetype);

    // 4. Determina Título e Subtítulo Técnico CAD
    const title = this.generateTechnicalTitle(scene, archetype);
    const subtitle = this.generateTechnicalSubtitle(scene, physicalVariables);

    // 5. Nome do Componente Canônico
    const componentName = this.determineComponentName(scene.sceneId, episodeSlug, archetype);

    return {
      sceneId: scene.sceneId,
      archetype,
      title,
      subtitle,
      mechanismDescription: scene.voiceover,
      physicalVariables,
      layers,
      cameraMotion: archetype === 'VOLUMETRIC_CUTAWAY' ? 'axial_slice' : 'isometric_drift',
      colorHierarchy: {
        background: '#060709',
        surface: '#0D0E15',
        accentCritical: '#FF5500',
        telemetry: '#00F0FF',
        textPrimary: '#F4F4F0',
        textMuted: '#8A8D9F'
      },
      componentName,
      generatedAt: new Date().toISOString()
    };
  }

  private static detectArchetype(text: string, canonCat?: string): MotionArchetype {
    if (text.includes('fatiar') || text.includes('corte') || text.includes('volumétrico') || text.includes('ao meio')) {
      return 'VOLUMETRIC_CUTAWAY';
    }
    if (text.includes('microscópio') || text.includes('fibra') || text.includes('micrômetro') || text.includes('nanômetro')) {
      return 'MICROSCOPIC_STRUCTURE';
    }
    if (text.includes('pressão') || text.includes('fluxo') || text.includes('duto') || text.includes('vazão') || text.includes('caldeira')) {
      return 'FLOW_DYNAMICS';
    }
    if (text.includes('fadiga') || text.includes('atrito') || text.includes('dobra') || text.includes('tensão') || text.includes('temperatura')) {
      return 'METROLOGICAL_STRESS';
    }
    if (text.includes('mapa') || text.includes('rota') || text.includes('nó') || text.includes('logística') || text.includes('custódia')) {
      return 'INFRASTRUCTURE_NODES';
    }
    if (text.includes('camada') || text.includes('fita') || text.includes('filtro') || text.includes('anéis')) {
      return 'LAYER_EXPLODED_VIEW';
    }
    return 'VOLUMETRIC_CUTAWAY';
  }

  private static extractPhysicalVariables(text: string, sceneId: string): PhysicalVariable[] {
    const vars: PhysicalVariable[] = [];

    // Detecção de Toneladas / Pressão
    const tonMatch = text.match(/(\d+[\.,]?\d*)\s*(toneladas?|ton|t\b)/i);
    if (tonMatch) {
      vars.push({
        name: 'PRESSÃO MECÂNICA NOMINAL',
        value: tonMatch[1].replace(',', '.'),
        unit: 'TONELADAS (METRIC TON)',
        standard: 'ABNT NBR / DIN EN 10025'
      });
    }

    // Detecção de Dobras / Fadiga
    const dobrasMatch = text.match(/(\d+[\.,]?\d*|\w+)\s*(mil\s+)?dobras/i);
    if (dobrasMatch || text.includes('dobras')) {
      vars.push({
        name: 'RESISTÊNCIA À DOBRA DUPLA (FADIGA)',
        value: text.includes('cinco mil') || text.includes('5000') || text.includes('5.000') ? '5.000' : '3.000',
        unit: 'CICLOS DE DOBRA (SCHOPPER)',
        standard: 'ISO 5626'
      });
    }

    // Detecção de Micrômetros / Espessura
    if (text.includes('micrômetro') || text.includes('escala micrométrica') || text.includes('espessura')) {
      vars.push({
        name: 'ESPESSURA DO SUBSTRATO',
        value: '110',
        unit: 'MICRÔMETROS (µm)',
        standard: 'ISO 534'
      });
      vars.push({
        name: 'DENSIDADE ÓPTICA DA MARCA D\'ÁGUA',
        value: '0.42 - 1.85',
        unit: 'DENSITY UNIT (DU)',
        standard: 'BACEN DMEC SPEC-01'
      });
    }

    // Detecção de Algodão / Fibra
    if (text.includes('algodão') || text.includes('fibra')) {
      vars.push({
        name: 'COMPOSIÇÃO DE POLPA',
        value: '100%',
        unit: 'FIBRAS NOBRES DE ALGODÃO',
        standard: 'ABNT / CASA DA MOEDA'
      });
    }

    // Fallback de variáveis se nenhuma foi capturada
    if (vars.length === 0) {
      vars.push({
        name: 'TOLERÂNCIA ESTRUTURAL',
        value: '±0.01',
        unit: 'MILÍMETROS (mm)',
        standard: 'ISO 9001'
      });
      vars.push({
        name: 'ESTADO TÉCNICO',
        value: 'CALIBRADO',
        unit: 'AUDITORIA NÍVEL 1',
        standard: 'LAUDO FORENSE'
      });
    }

    return vars;
  }

  private static modelLayers(text: string, sceneId: string, archetype: MotionArchetype): MotionLayer3D[] {
    if (text.includes('algodão') || text.includes('cédula') || text.includes('cem reais') || text.includes('nota')) {
      return [
        {
          id: 'LAYER_SURFACE_TOP',
          label: 'IMPRESSÃO CALCOGRÁFICA SUPERIOR (TALHO-DOCE)',
          depthOffset: 30,
          opacity: 0.95,
          material: 'cotton_fiber',
          critical: false
        },
        {
          id: 'LAYER_SECURITY_THREAD',
          label: 'FITA MAGNÉTICA DE POLÍMERO E MICROINSCRIÇÃO',
          depthOffset: 15,
          opacity: 0.9,
          material: 'polymer',
          critical: true
        },
        {
          id: 'LAYER_WATERMARK_CORE',
          label: 'NÚCLEO DE DENSIDADE VARIÁVEL (MARCA D\'ÁGUA EFÍGIE/GAROUPA)',
          depthOffset: 0,
          opacity: 0.8,
          material: 'cotton_fiber',
          critical: true
        },
        {
          id: 'LAYER_SURFACE_BOTTOM',
          label: 'BASE ESTRUTURAL TÊXTIL 100% ALGODÃO',
          depthOffset: -15,
          opacity: 0.95,
          material: 'cotton_fiber',
          critical: false
        }
      ];
    }

    if (text.includes('cabo') || text.includes('fibra óptica') || text.includes('submarino')) {
      return [
        { id: 'LAYER_OUTER_SHEATH', label: 'POLIETILENO BLINDADO', depthOffset: 40, opacity: 0.9, material: 'polymer', critical: false },
        { id: 'LAYER_ARMOR_STEEL', label: 'FIOS DE AÇO HELICOIDAIS', depthOffset: 25, opacity: 0.9, material: 'steel', critical: false },
        { id: 'LAYER_COPPER_TUBE', label: 'TUBO DE COBRE 10kV', depthOffset: 10, opacity: 0.85, material: 'copper', critical: true },
        { id: 'LAYER_FIBER_CORE', label: 'FIBRAS ÓPTICAS DE SÍLICA PURA', depthOffset: 0, opacity: 1, material: 'optical_core', critical: true }
      ];
    }

    // Default genérico industrial
    return [
      { id: 'LAYER_EXTERNAL_SHELL', label: 'BLINDAGEM EXTERNA DE AÇO', depthOffset: 30, opacity: 0.9, material: 'steel', critical: false },
      { id: 'LAYER_INTERNAL_CHAMBER', label: 'CÂMARA TÉCNICA OPERACIONAL', depthOffset: 0, opacity: 0.85, material: 'steel', critical: true },
      { id: 'LAYER_BASE_CHASSIS', label: 'BASE ESTRUTURAL DE FIXAÇÃO', depthOffset: -20, opacity: 0.95, material: 'steel', critical: false }
    ];
  }

  private static generateTechnicalTitle(scene: SceneInput, archetype: MotionArchetype): string {
    const scId = scene.sceneId;
    switch (archetype) {
      case 'VOLUMETRIC_CUTAWAY':
        return `CORTE VOLUMÉTRICO MICROMÉTRICO // ${scId}`;
      case 'MICROSCOPIC_STRUCTURE':
        return `ANÁLISE DE MICROESTRUTURA TÊXTIL // ${scId}`;
      case 'FLOW_DYNAMICS':
        return `DINÂMICA DE FLUXO PRESSURIZADO // ${scId}`;
      case 'METROLOGICAL_STRESS':
        return `ENSAIO DE FADIGA & TENSÃO // ${scId}`;
      case 'INFRASTRUCTURE_NODES':
        return `REDE DE RASTREAMENTO & CUSTÓDIA // ${scId}`;
      default:
        return `RECONSTRUÇÃO TÉCNICA 3D // ${scId}`;
    }
  }

  private static generateTechnicalSubtitle(scene: SceneInput, vars: PhysicalVariable[]): string {
    if (vars.length > 0) {
      return `${vars[0].name}: ${vars[0].value} ${vars[0].unit} | ${vars[0].standard || 'NORMA TÉCNICA'}`;
    }
    return 'TELEMETRIA DOCUMENTAL ESTRUTURAL';
  }

  private static determineComponentName(sceneId: string, episodeSlug: string, archetype: MotionArchetype): string {
    const cleanSlug = episodeSlug.replace(/[^a-zA-Z0-9]/g, '');
    const capSlug = cleanSlug.charAt(0).toUpperCase() + cleanSlug.slice(1);
    const cleanId = sceneId.replace(/[^a-zA-Z0-9]/g, '');

    switch (archetype) {
      case 'VOLUMETRIC_CUTAWAY':
        return `${capSlug}VolumetricCutaway${cleanId}Scene`;
      case 'MICROSCOPIC_STRUCTURE':
        return `${capSlug}MicroStructure${cleanId}Scene`;
      case 'FLOW_DYNAMICS':
        return `${capSlug}FlowDynamics${cleanId}Scene`;
      default:
        return `${capSlug}Technical3D${cleanId}Scene`;
    }
  }
}
