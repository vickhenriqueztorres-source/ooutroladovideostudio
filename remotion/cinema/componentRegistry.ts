import React from 'react';
import * as DocumentaryComponents from '../documentary';

/**
 * 📦 componentRegistry: Dicionário e Autoridade de Componentes Cinematográficos
 * Mapeia strings declaradas em contratos de timeline para componentes JSX de documentary/.
 */
export const SCENE_COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  // Mídia Dinâmica e B-Roll
  DynamicDocumentaryMedia: DocumentaryComponents.DynamicDocumentaryMedia,
  CinematicKeyframeDossier: DocumentaryComponents.CinematicKeyframeDossier,
  KenBurnsCinematicFrame: DocumentaryComponents.KenBurnsCinematicFrame,

  // HUDs e Dossiês Técnicos Industriais
  FlowMeterPulserSchematicHUD: DocumentaryComponents.FlowMeterPulserSchematicHUD,
  TechnicalCutawaySchematic: DocumentaryComponents.TechnicalCutawaySchematic,
  FlowDiscrepancyHUD: DocumentaryComponents.FlowDiscrepancyHUD,
  Iso20022PacketInspector: DocumentaryComponents.Iso20022PacketInspector,
  OnScreenResearchLapse: DocumentaryComponents.OnScreenResearchLapse,
  LaserRevealWipe: DocumentaryComponents.LaserRevealWipe,
  InfraredPlateScanner3D: DocumentaryComponents.InfraredPlateScanner3D,
  LaserScanDossier: DocumentaryComponents.LaserScanDossier,
  IndustrialXRayHUD: DocumentaryComponents.IndustrialXRayHUD,
  AtomicStopwatch: DocumentaryComponents.AtomicStopwatch,
  KineticEditorialCallout: DocumentaryComponents.KineticEditorialCallout,
  KineticNumberCounter: DocumentaryComponents.KineticNumberCounter,
  DocumentaryTextTyper: DocumentaryComponents.DocumentaryTextTyper,
  DynamicSpotlightFocus: DocumentaryComponents.DynamicSpotlightFocus,
  EnergyFrequencyOscillator: DocumentaryComponents.EnergyFrequencyOscillator,
  TechnicalSplitComparison: DocumentaryComponents.TechnicalSplitComparison,
  PowerBalanceMeter: DocumentaryComponents.PowerBalanceMeter,
  BigStatExplainer: DocumentaryComponents.BigStatExplainer,

  // Módulos Forenses Logísticos (Encomenda China / Curitiba)
  GlobalRouteTracker: DocumentaryComponents.GlobalRouteTracker,
  CrossBeltSorterHUD: DocumentaryComponents.CrossBeltSorterHUD,
  XRayTomographyDossier: DocumentaryComponents.XRayTomographyDossier,
  BarcodeVerificationMatrix: DocumentaryComponents.BarcodeVerificationMatrix,

  // 3D e Modelos Físicos
  SubmarineCableCrossSection3D: DocumentaryComponents.SubmarineCableCrossSection3D,
  AtlanticBathymetryMap: DocumentaryComponents.AtlanticBathymetryMap,
  ErbiumOpticalAmplifier: DocumentaryComponents.ErbiumOpticalAmplifier,
  BgpFailoverInspector: DocumentaryComponents.BgpFailoverInspector,
  InductionLoopCrossSection3D: DocumentaryComponents.InductionLoopCrossSection3D,
  VelocityPhysicsCalculationHUD: DocumentaryComponents.VelocityPhysicsCalculationHUD,
  AsphaltThermalDeformation3D: DocumentaryComponents.AsphaltThermalDeformation3D,
  ParallaxRackFocus: DocumentaryComponents.ParallaxRackFocus,
  CyberMapTrace: DocumentaryComponents.CyberMapTrace,
  SmartphoneBankingMockup: DocumentaryComponents.SmartphoneBankingMockup,
  VlfSubmarineAntennaTrace: DocumentaryComponents.VlfSubmarineAntennaTrace,
  FieldDocumentaryScene: DocumentaryComponents.FieldDocumentaryScene,
  EnergyInfrastructureExplainerScene: DocumentaryComponents.EnergyInfrastructureExplainerScene,
  DroneAgroMatterScene: DocumentaryComponents.DroneAgroMatterScene,
  DroneAgroEvidenceScene: DocumentaryComponents.DroneAgroEvidenceScene,
  DroneAgroRouteMapScene: DocumentaryComponents.DroneAgroRouteMapScene,
  DroneAgroTechnicalRevealScene: DocumentaryComponents.DroneAgroTechnicalRevealScene,
  MilkDocumentaryScene: DocumentaryComponents.MilkDocumentaryScene,  RaioxaeroportoVolumetricCutawayRX005Scene: DocumentaryComponents.RaioxaeroportoVolumetricCutawayRX005Scene,
  RaioxaeroportoVolumetricCutawayRX009Scene: DocumentaryComponents.RaioxaeroportoVolumetricCutawayRX009Scene,
  RaioxaeroportoVolumetricCutawayRX015Scene: DocumentaryComponents.RaioxaeroportoVolumetricCutawayRX015Scene,
  RaioxaeroportoVolumetricCutawayRX016Scene: DocumentaryComponents.RaioxaeroportoVolumetricCutawayRX016Scene,
  RaioxaeroportoTechnical3DRX026Scene: DocumentaryComponents.RaioxaeroportoTechnical3DRX026Scene,
  RaioxaeroportoVolumetricCutawayRX027Scene: DocumentaryComponents.RaioxaeroportoVolumetricCutawayRX027Scene,
  RaioxaeroportoVolumetricCutawayRX028Scene: DocumentaryComponents.RaioxaeroportoVolumetricCutawayRX028Scene,
  LinhasegurapresidencialMicroStructureSC004Scene: DocumentaryComponents.LinhasegurapresidencialMicroStructureSC004Scene,
  LinhasegurapresidencialVolumetricCutawaySC007Scene: DocumentaryComponents.LinhasegurapresidencialVolumetricCutawaySC007Scene,
  LinhasegurapresidencialMicroStructureSC014Scene: DocumentaryComponents.LinhasegurapresidencialMicroStructureSC014Scene,
  LinhasegurapresidencialVolumetricCutawaySC030Scene: DocumentaryComponents.LinhasegurapresidencialVolumetricCutawaySC030Scene,
  LinhasegurapresidencialVolumetricCutawaySC004Scene: DocumentaryComponents.LinhasegurapresidencialVolumetricCutawaySC004Scene,
  LinhasegurapresidencialFlowDynamicsSC014Scene: DocumentaryComponents.LinhasegurapresidencialFlowDynamicsSC014Scene,
  LinhasegurapresidencialVolumetricCutawaySC006Scene: DocumentaryComponents.LinhasegurapresidencialVolumetricCutawaySC006Scene,
  LinhasegurapresidencialVolumetricCutawaySC001Scene: DocumentaryComponents.LinhasegurapresidencialVolumetricCutawaySC001Scene,
  LinhasegurapresidencialVolumetricCutawaySC022Scene: DocumentaryComponents.LinhasegurapresidencialVolumetricCutawaySC022Scene,
  Redeeletrica60hzVolumetricCutawaySC007Scene: DocumentaryComponents.Redeeletrica60hzVolumetricCutawaySC007Scene,
  Redeeletrica60hzVolumetricCutawaySC011Scene: DocumentaryComponents.Redeeletrica60hzVolumetricCutawaySC011Scene,
  Redeeletrica60hzVolumetricCutawaySC018Scene: DocumentaryComponents.Redeeletrica60hzVolumetricCutawaySC018Scene,
  Redeeletrica60hzVolumetricCutawaySC021Scene: DocumentaryComponents.Redeeletrica60hzVolumetricCutawaySC021Scene,
  Redeeletrica60hzVolumetricCutawaySC025Scene: DocumentaryComponents.Redeeletrica60hzVolumetricCutawaySC025Scene,
  Redeeletrica60hzVolumetricCutawaySC030Scene: DocumentaryComponents.Redeeletrica60hzVolumetricCutawaySC030Scene,
  EncomendachinacuritibaVolumetricCutawaySC005Scene: DocumentaryComponents.EncomendachinacuritibaVolumetricCutawaySC005Scene,
  EncomendachinacuritibaVolumetricCutawaySC017Scene: DocumentaryComponents.EncomendachinacuritibaVolumetricCutawaySC017Scene,
  EncomendachinacuritibaVolumetricCutawaySC019Scene: DocumentaryComponents.EncomendachinacuritibaVolumetricCutawaySC019Scene,
  EncomendachinacuritibaTechnical3DSC030Scene: DocumentaryComponents.EncomendachinacuritibaTechnical3DSC030Scene,
};

/**
 * Registra dinamicamente um componente na tabela em runtime.
 */
export function registerSceneComponent(componentName: string, component: React.ComponentType<any>): void {
  SCENE_COMPONENT_REGISTRY[componentName] = component;
}

/**
 * Valida se um nome de componente existe no registro oficial.
 */
export function isRegisteredComponent(componentName: string): boolean {
  if (typeof componentName !== 'string') return false;
  if (componentName in SCENE_COMPONENT_REGISTRY) return true;
  try {
    const fs = require('fs');
    const path = require('path');
    const compFile = path.join(process.cwd(), 'remotion', 'documentary', `${componentName}.tsx`);
    if (fs.existsSync(compFile)) {
      return true;
    }
  } catch (e) {}
  return false;
}

/**
 * Resolve o componente React a partir do nome registrado.
 * Lança erro se o componente não existir.
 */
export function resolveSceneComponent(componentName: string): React.ComponentType<any> {
  const comp = SCENE_COMPONENT_REGISTRY[componentName];
  if (comp) {
    return comp;
  }
  try {
    const docComp = require('../documentary');
    if (docComp[componentName]) {
      SCENE_COMPONENT_REGISTRY[componentName] = docComp[componentName];
      return docComp[componentName];
    }
  } catch (e) {}
  throw new Error(`TIMELINE_UNKNOWN_COMPONENT: O componente '${componentName}' não existe no registro cinematográfico.`);
}
