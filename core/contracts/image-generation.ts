import type{EvidencePromptSpec,ImagePromptSpec,ReferenceManifest}from"./prompt-pack"
import type{ProviderExecutionPlan}from"./provider-capability"

export type ImageAssetType="REFERENCE"|"START_FRAME"|"INSERT"|"ATMOSPHERE"
export type ImageAssetStatus="APPROVED"|"REVIEW_REQUIRED"|"REJECTED"|"DEPRECATED"
export type ReferenceStatus="APPROVED"|"REVIEW_REQUIRED"|"REJECTED"
export type ImageRepresentationType="REAL_EVIDENCE"|"RECONSTRUCTION"|"DRAMATIZATION"|"FICTIONAL_INTERFACE"|"ILLUSTRATION"|"EXPLANATORY_GRAPHIC"

export interface CharacterReference{referenceId:string;entityId:string;entityType:"CHARACTER";imageAssetIds:string[];strictLocks:string[];mediumLocks:string[];variableAttributes:string[];approvedAngles:string[];approvedExpressions:string[];status:ReferenceStatus}
export interface LocationReference{referenceId:string;entityId:string;entityType:"LOCATION";imageAssetIds:string[];strictLocks:string[];layoutLocks:string[];paletteLocks:string[];lightingLocks:string[];variableAttributes:string[];status:ReferenceStatus}
export interface ObjectReference{referenceId:string;entityId:string;entityType:"OBJECT"|"DEVICE";imageAssetIds:string[];strictLocks:string[];geometryLocks:string[];colorLocks:string[];interfaceLocks?:string[];status:ReferenceStatus}
export interface StyleReference{referenceId:string;entityId:string;entityType:"STYLE";imageAssetIds:string[];palette:string[];contrast:string;grain:string;highlightRollOff:string;saturation:string;forbiddenStyles:string[];status:ReferenceStatus}
export type CanonicalReference=CharacterReference|LocationReference|ObjectReference|StyleReference

export interface ReferenceAsset{referenceId:string;entityId:string;entityType:string;role:"IDENTITY"|"LOCATION"|"OBJECT"|"DEVICE"|"STYLE"|"COMPOSITION"|"EVIDENCE";assetIds:string[];locks:string[];forbiddenDrift:string[];status:ReferenceStatus;sourceManifestId:string}

export interface CalibrationTestCase{caseId:string;assetClass:string;description:string;requiredScore:number}
export interface CalibrationReport{calibrationId:string;providerId:string;runtime:string;adapterVersion:string;testCases:CalibrationTestCase[];requiredDimensions:string[];scores:{identity:number;environment:number;objectGeometry:number;palette:number;lighting:number;composition:number;representation:number};allowedAssetTypes:string[];blockedAssetTypes:string[];status:"PENDING"|"APPROVED"|"REJECTED";evidenceRefs:string[]}

export interface ImageGenerationJob{imageJobId:string;promptId:string;assetRequestId:string;shotId:string;assetType:ImageAssetType;providerId:string;runtime:string;adapterVersion:string;promptVersion:string;promptHash:string;referenceManifestId:string;approvedReferenceIds:string[];parameters:{aspectRatio:string;resolution?:string;seed?:string|number;referenceStrength?:number;styleStrength?:number;outputCount?:number};strictLocks:string[];negativeConstraints:string[];representationType:string;postProductionRequirements:string[];idempotencyKey:string}

export interface AdherenceScore{identity:number;environment:number;objectGeometry:number;palette:number;lighting:number;composition:number;period:number;narrativeFunction:number;representation:number;technicalQuality:number;overall:number}

export interface GeneratedImageAsset{assetId:string;imageJobId:string;promptId:string;shotId:string;assetType:ImageAssetType;assetPath:string;sha256:string;representationType:string;providerId:string;runtime:string;adapterVersion:string;promptHash:string;referenceIds:string[];adherence:AdherenceScore;hardFails:string[];status:ImageAssetStatus;attempt:number;simulated:true}
export interface RejectedImageAsset{assetId:string;imageJobId:string;promptId:string;assetType:ImageAssetType;reasonCodes:string[];adherence:AdherenceScore;retryable:boolean}

export interface StartFrameRegistryEntry{frameId:string;shotId:string;assetId:string;assetPath:string;sha256:string;status:ImageAssetStatus;promptId:string;promptVersion:string;referenceIds:string[];preservedAttributes:string[];allowedMotion:string[];forbiddenMotion:string[];composition:string;expectedEndState:string;visualQCId:string}

export interface VisualComparisonSet{comparisonId:string;promptId:string;assetId:string;dimensions:{dimension:string;score:number;passed:boolean;notes:string}[];referenceIds:string[];briefingRef:string;visualIdentityRef:string;continuityBibleRef:string;factualBoundaryStatus:string}

export interface ImageRetryRecord{retryId:string;imageJobId:string;attempt:number;reasonCode:string;changedFields:string[];preservedFields:string[];resultingPromptHash:string;status:"SCHEDULED"|"BLOCKED"|"COMPLETED"}

export interface ProviderAdherenceProfile{providerId:string;runtime:string;adapterVersion:string;calibrationVersion:string;assetClass:string;identity:number;environment:number;objectConsistency:number;palette:number;composition:number;representation:number;textReliability:number;approved:boolean;blockedReasons:string[]}

export interface ImageVisualQC{inputApproved:boolean;providerCalibrated:boolean;referencesResolved:boolean;noUnapprovedReferenceUsed:boolean;generationSeparateFromQC:boolean;allAssetsScored:boolean;noHardFailApproved:boolean;evidenceNeverGenerated:boolean;evidenceIntegrityPreserved:boolean;reconstructionsLabeled:boolean;dramatizationsLabeled:boolean;fictionalInterfacesBrandless:boolean;criticalTextInPost:boolean;startFramesHaveMotionSpace:boolean;startFramesRegistered:boolean;onlyApprovedPropagated:boolean;retriesPreserveLocks:boolean;noSilentProviderMix:boolean;idempotencyKeysPresent:boolean;deterministicHashPresent:boolean;overall:number;warnings:string[];blockingErrors:string[]}

export interface ImageBudgetUsage{totalJobs:number;byType:Record<string,number>;references:number;startFrames:number;inserts:number;atmosphere:number;retries:number;withinLimits:boolean}
export interface ImageProductionConstraints{maxJobs:number;maxRetriesPerJob:number;approvalThreshold:number;outputDirectory:string;allowProviderMix:boolean}

export interface ImageAgentCheckpoint{projectId:string;runId:string;imagePackId:string;stage:string;inputHash:string;artifactHash?:string;generatedCount:number;approvedCount:number;rejectedCount:number;reviewRequiredCount:number;approvedStartFrameCount:number;warnings:string[];blockingErrors:string[];createdAt:string}

export interface ImageGenerationInput{schemaVersion:string;projectId:string;runId:string;promptPackId:string;providerPlanId:string;status:"PROVIDER_PLAN_APPROVED";visualIdentityRef:string;continuityBibleRef:string;references:ReferenceManifest[];imageSpecs:ImagePromptSpec[];evidenceSpecs:EvidencePromptSpec[];providerExecutionPlan:ProviderExecutionPlan;productionConstraints:ImageProductionConstraints;calibrationReports:CalibrationReport[];checkpoint?:ImageAgentCheckpoint}

export interface ImagePack{schemaVersion:string;projectId:string;runId:string;imagePackId:string;promptPackId:string;providerPlanId:string;status:"DRAFT"|"NEEDS_REVIEW"|"BLOCKED"|"APPROVED_FOR_VIDEO";referenceAssets:ReferenceAsset[];generatedAssets:GeneratedImageAsset[];approvedStartFrames:StartFrameRegistryEntry[];approvedInserts:string[];approvedAtmosphereAssets:string[];rejectedAssets:RejectedImageAsset[];comparisonSets:VisualComparisonSet[];calibrationReports:CalibrationReport[];retryHistory:ImageRetryRecord[];providerAdherence:ProviderAdherenceProfile[];visualQC:ImageVisualQC;budgetUsage:ImageBudgetUsage;warnings:string[];blockingErrors:string[];nextAgent:"PROVIDER_JOB_ORCHESTRATOR"|"VIDEO_GENERATION_AGENT"|"HUMAN_REVIEW"}
