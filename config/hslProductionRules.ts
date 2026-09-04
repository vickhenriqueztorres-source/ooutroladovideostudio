export const HSL_OFFICIAL_PRODUCTION_RULES = {
  narrationProvider: 'elevenlabs',
  officialVoiceName: 'Chris',
  elevenLabsVoiceId: 'iP95p4xoKVk53GoZ742B',
  elevenLabsModelId: 'eleven_multilingual_v2',
  narrationWpm: 146,
  /** Compatibilidade de leitura para contratos antigos; não é uma configuração ativa. */
  voiceboxPresetVoiceId: 'am_echo',
  minimumGeneratedCoverageRatio: 0.7,
  maximumRemotionCoverageRatio: 0.22,
  maximumConsecutiveRemotionShots: 1,
  requirePhotorealStartFrames: true,
  forbidLocalProxyAssets: true,
  forbidFlatDiagramStartFrames: true,
  visualIdentityContractVersion: 'HSL_DOCUMENTARY_FIELD_V4',
  requireApprovedVisualReferenceLineage: true,
  forbidProceduralPrevisAsProductionFrame: true,
  requireApprovalBoundToContactSheetHash: true,
  forbidAutomaticHumanApproval: true,
  defaultFireflyModel: 'Kling 2.5 Turbo',
  defaultVeoModel: 'Veo 3.1 Fast'
} as const;

export function assertOfficialHslNarrationConfig(env: NodeJS.ProcessEnv = process.env): void {
  const provider = (env.HSL_NARRATION_PROVIDER || '').trim().toLowerCase();
  const voiceName = (env.ELEVENLABS_VOICE_NAME || env.HSL_NARRATION_VOICE || '').trim().toLowerCase();
  const voiceId = (env.ELEVENLABS_VOICE_ID || '').trim();
  const modelId = (env.ELEVENLABS_MODEL_ID || '').trim();
  if (provider !== HSL_OFFICIAL_PRODUCTION_RULES.narrationProvider) {
    throw new Error(`HSL_OFFICIAL_ELEVENLABS_REQUIRED: expected HSL_NARRATION_PROVIDER=elevenlabs, got ${provider || 'EMPTY'}`);
  }
  if (voiceName !== HSL_OFFICIAL_PRODUCTION_RULES.officialVoiceName.toLowerCase()) {
    throw new Error(`HSL_OFFICIAL_CHRIS_VOICE_REQUIRED: expected Chris, got ${voiceName || 'EMPTY'}`);
  }
  if (voiceId !== HSL_OFFICIAL_PRODUCTION_RULES.elevenLabsVoiceId) {
    throw new Error(`HSL_OFFICIAL_CHRIS_ID_REQUIRED: expected ${HSL_OFFICIAL_PRODUCTION_RULES.elevenLabsVoiceId}, got ${voiceId || 'EMPTY'}`);
  }
  if (modelId !== HSL_OFFICIAL_PRODUCTION_RULES.elevenLabsModelId) {
    throw new Error(`HSL_OFFICIAL_ELEVENLABS_MODEL_REQUIRED: expected ${HSL_OFFICIAL_PRODUCTION_RULES.elevenLabsModelId}, got ${modelId || 'EMPTY'}`);
  }
}
