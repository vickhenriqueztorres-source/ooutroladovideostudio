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
  MilkDocumentaryScene: DocumentaryComponents.MilkDocumentaryScene,
};

/**
 * Valida se um nome de componente existe no registro oficial.
 */
export function isRegisteredComponent(componentName: string): boolean {
  return typeof componentName === 'string' && componentName in SCENE_COMPONENT_REGISTRY;
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
  throw new Error(`TIMELINE_UNKNOWN_COMPONENT: O componente '${componentName}' não existe no registro cinematográfico.`);
}
