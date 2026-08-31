import type{CalibrationReport,ImageAssetType}from"../contracts/image-generation"

// Calibration is per provider/runtime/adapter AND per asset class. A provider approved for
// ATMOSPHERE may be blocked for START_FRAME. Approval is never global.
export interface CalibrationLookup{providerId:string;runtime:string;adapterVersion:string}

export function findCalibration(reports:CalibrationReport[],lookup:CalibrationLookup):CalibrationReport|undefined{
  return reports.find(r=>r.providerId===lookup.providerId&&r.runtime===lookup.runtime&&r.adapterVersion===lookup.adapterVersion)
}

export function isCalibratedFor(reports:CalibrationReport[],lookup:CalibrationLookup,assetType:ImageAssetType):boolean{
  const report=findCalibration(reports,lookup)
  if(!report||report.status!=="APPROVED")return false
  if(report.blockedAssetTypes.includes(assetType))return false
  return report.allowedAssetTypes.includes(assetType)
}

export function calibrationBlockReason(reports:CalibrationReport[],lookup:CalibrationLookup,assetType:ImageAssetType):string|null{
  const report=findCalibration(reports,lookup)
  if(!report)return"IMAGE_PROVIDER_NOT_CALIBRATED"
  if(report.status!=="APPROVED")return"IMAGE_PROVIDER_NOT_CALIBRATED"
  if(report.blockedAssetTypes.includes(assetType))return"IMAGE_PROVIDER_NOT_CALIBRATED"
  if(!report.allowedAssetTypes.includes(assetType))return"IMAGE_PROVIDER_NOT_CALIBRATED"
  return null
}

// Mixing providers within a sequence requires a fresh calibration and continuity re-review.
export function detectSilentProviderMix(providersInUse:Set<string>,allowMix:boolean):boolean{
  return providersInUse.size>1&&!allowMix
}
