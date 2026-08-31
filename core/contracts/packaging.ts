import type{AssemblyPack,EvidenceBinding,RenderManifest}from"./final-assembly"

export type PackagingBlockingError="PACKAGING_INPUT_INVALID"|"MASTER_NOT_APPROVED"|"MASTER_RECEIPT_MISSING"|"MASTER_RECEIPT_HASH_MISMATCH"|"ASSEMBLY_PACK_VERSION_MISMATCH"|"ASSEMBLY_PACK_MUTATED"|"TITLE_CANDIDATE_MISSING"|"TITLE_CLAIM_UNSUPPORTED"|"TITLE_SENSATIONALIST"|"TITLE_LENGTH_INVALID"|"THUMBNAIL_BRIEF_MISSING"|"THUMBNAIL_FABRICATED_EVIDENCE"|"THUMBNAIL_TEXT_ILLEGIBLE"|"DESCRIPTION_CLAIM_UNSUPPORTED"|"DESCRIPTION_SOURCE_MISSING"|"CHAPTER_TIMESTAMP_INVALID"|"CHAPTER_COVERAGE_INCOMPLETE"|"SOURCE_DISCLOSURE_MISSING"|"SYNTHETIC_DISCLOSURE_MISSING"|"LOCALIZATION_MISMATCH"|"METADATA_HASH_MISSING"|"PUBLISH_APPROVAL_MISSING"|"PACKAGING_QC_FAILED"

export interface MasterApprovalReceipt{episodeId:string;projectId:string;assemblyPackId:string;assemblyPackVersion:string;state:"MASTER_APPROVED";approvedAt:string;approvedBy:string;timelineHash:string;renderManifestHash:string;captionHash:string;evidenceManifestHash:string;qcReportHash:string;blockers:string[];warnings:string[];nextAgent:"PACKAGING_AGENT"}

export type ClaimSupportStatus="VERIFIED"|"UNCERTAIN"|"UNSUPPORTED"
export interface PackagingClaimRef{claimId:string;status:ClaimSupportStatus;conditionalLanguageApproved:boolean}
export interface PackagingSource{sourceId:string;title:string;url?:string;retrievedAt:string;verified:boolean}

export interface TitleCandidate{titleId:string;text:string;claimIds:string[];rank:number;sensationalismFlags:string[];characterCount:number;status:"APPROVED"|"REJECTED"}
export interface ThumbnailBrief{briefId:string;concept:string;overlayText:string;overlayCharacterCount:number;contrastRatio:number;safeAreaValid:boolean;representationLabels:string[];depictsRealEvidence:boolean;evidenceIds:string[];status:"APPROVED"|"REJECTED"}
export interface DescriptionDraft{language:string;body:string;claimIds:string[];sourceIds:string[];disclosureIncluded:boolean;characterCount:number}
export interface Chapter{chapterId:string;title:string;startSec:number;endSec:number;blockId:string}
export interface SourceDisclosure{disclosureId:string;language:string;text:string;sourceIds:string[];complete:boolean}
export interface SyntheticDisclosure{disclosureId:string;language:string;text:string;representationTypes:string[];required:boolean;present:boolean}

export interface MetadataBundle{bundleId:string;language:string;selectedTitleId:string;titleCandidates:TitleCandidate[];thumbnailBrief:ThumbnailBrief;description:DescriptionDraft;chapters:Chapter[];sourceDisclosure:SourceDisclosure;syntheticDisclosure:SyntheticDisclosure;tags:string[];metadataHash:string}

export interface PackagingQC{receiptIntegrity:number;titleIntegrity:number;thumbnailIntegrity:number;descriptionIntegrity:number;chapterCoverage:number;disclosureIntegrity:number;localizationIntegrity:number;metadataReproducibility:number;overall:number}

export type PackagingCheckpointStage="INPUT_VALIDATED"|"RECEIPT_VERIFIED"|"TITLES_RESOLVED"|"THUMBNAIL_BRIEFED"|"DESCRIPTION_COMPILED"|"CHAPTERS_RESOLVED"|"DISCLOSURES_VERIFIED"|"PACKAGING_QC_PASSED"|"PACKAGING_READY"
export interface PackagingCheckpoint{projectId:string;runId:string;packagingPackId:string;stage:PackagingCheckpointStage;inputHash:string;artifactHash?:string;createdAt:string}

export interface PackagingInput{schemaVersion:string;projectId:string;runId:string;episodeId:string;packagingVersion:string;masterApprovalReceipt:MasterApprovalReceipt;assemblyPack:AssemblyPack;renderManifest:RenderManifest;claims:PackagingClaimRef[];sources:PackagingSource[];evidenceMatrix:EvidenceBinding[];thumbnailEvidenceIds:string[];titleSeeds:{text:string;claimIds:string[]}[];thumbnailConcept:string;descriptionSeed:string;language:string;forbiddenTitlePatterns:string[];qcThreshold:number;publishApproval?:{approvedBy:string;approvedAt:string}|null;checkpoint?:PackagingCheckpoint}

export interface PackagingPack{schemaVersion:string;projectId:string;runId:string;packagingPackId:string;episodeId:string;status:"DRAFT"|"NEEDS_REVIEW"|"BLOCKED"|"PACKAGING_READY";metadata:MetadataBundle;packagingQC:PackagingQC;blockingErrors:PackagingBlockingError[];warnings:string[];inputHashes:{masterReceipt:string;assemblyPack:string;renderManifest:string};packagingJobKey:string;checkpoint:PackagingCheckpoint;publishAuthorized:boolean;nextAgent:"PUBLISH_AGENT"|"HUMAN_REVIEW"}

export interface PackagingAdapter{buildThumbnailBrief(concept:string,overlayText:string):{contrastRatio:number;safeAreaValid:boolean}}
