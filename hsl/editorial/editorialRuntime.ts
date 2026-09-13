import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {HslEpisodeBrief, HslScene, validateHslEpisode} from '../../production/hslEpisodeGate';
import {HSL_PILOT_EPISODE_SEED} from './config/pilotEpisodeSeed';
import {AttentionArchitectureAgent, HslAttentionArchitecture, PhraseOriginalityGate} from './attention/attentionArchitecture';
import {ReferenceInsightIngestAgent} from './reference/referenceInsightIngestAgent';
import {
  AudienceStrategyAgent,
  EugeneRagIngestAgent,
  EugeneRagOriginalityGate,
  HslAudienceStrategy,
  PromiseDeliveryGate
} from './eugene/eugeneRagRuntime';
import {
  HslClaim,
  HslEditorialPackage,
  HslEditorialRunResult,
  HslEditorialSceneContract,
  HslEpisodeSeed,
  HslVisualMode
} from './types/editorial';

function sha(value: string | Buffer): string {
  return `sha256_${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function atomicJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  const temp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temp, filePath);
}

function artifactRelative(runDir: string, artifactPath: string): string {
  return path.relative(runDir, artifactPath).replace(/\\/g, '/');
}

function provenanceFor(mode: HslVisualMode): HslScene['asset_provenance'] {
  if (mode === 'generated_ai') return 'generated_ai';
  if (mode === 'licensed_real') return 'licensed_stock';
  return 'original_remotion';
}

export class EpisodeBriefAgent {
  run(seed: Readonly<HslEpisodeSeed>, attention: Readonly<HslAttentionArchitecture>, audience: Readonly<HslAudienceStrategy>): Omit<HslEpisodeBrief, 'sources' | 'scenes'> & {
    counterintuitive_angle: string;
    viewer_question: string;
    promised_payoff: string;
    audience_relevance: string;
    primary_audience: string;
    audience_awareness_level: number;
    topic_sophistication_level: number;
    mass_desire: string;
    knowledge_gap: string;
    approved_title_promise: string;
  } {
    if (seed.human_approval_status !== 'APPROVED') throw new Error('HSL_IDEA_HUMAN_APPROVAL_REQUIRED');
    return {
      episode_id: seed.episode_id, title: seed.title, language: 'en', format: seed.format,
      target_duration_minutes: seed.target_duration_minutes, central_question: seed.central_question,
      original_thesis: seed.thesis, object_or_flow: seed.object_or_flow,
      system_being_analyzed: seed.system_being_analyzed, main_constraint: seed.main_constraint,
      primary_consequence: seed.primary_consequence, hero_visual: seed.hero_visual,
      original_interpretation: seed.original_interpretation,
      counterargument_or_limitation: seed.counterargument_or_limitation,
      counterintuitive_angle: attention.counterintuitive_angle,
      viewer_question: attention.hook.viewer_question,
      promised_payoff: attention.promised_payoff,
      audience_relevance: audience.human_conflict,
      primary_audience: audience.primary_audience,
      audience_awareness_level: audience.awareness.level,
      topic_sophistication_level: audience.topic_sophistication.level,
      mass_desire: audience.desire.mass_desire,
      knowledge_gap: audience.awareness.knowledge_gap,
      approved_title_promise: audience.promise,
      human_approval_status: 'APPROVED'
    };
  }
}

export class SystemsResearchAgent {
  run(seed: Readonly<HslEpisodeSeed>) {
    const categories = new Set(seed.sources.map((source) => source.category));
    for (const required of ['primary', 'technical', 'independent']) {
      if (!categories.has(required as 'primary')) throw new Error(`HSL_RESEARCH_SOURCE_CATEGORY_MISSING:${required}`);
    }
    for (const source of seed.sources) {
      if (!/^https:\/\//.test(source.url) || !source.claims.length) throw new Error(`HSL_RESEARCH_SOURCE_INVALID:${source.source_id}`);
    }
    return {episode_id: seed.episode_id, sources: seed.sources};
  }
}

export class ClaimRegistryAgent {
  run(seed: Readonly<HslEpisodeSeed>): readonly HslClaim[] {
    return seed.sources.flatMap((source, sourceIndex) => source.claims.map((text, claimIndex) => ({
      claim_id: `C${String(sourceIndex * 10 + claimIndex + 1).padStart(3, '0')}`,
      text,
      source_ids: [source.source_id],
      evidence_status: 'fact' as const
    })));
  }
}

export class ThesisAgent {
  run(seed: Readonly<HslEpisodeSeed>) {
    return {thesis: seed.thesis, constraint: seed.main_constraint, consequence: seed.primary_consequence, interpretation: seed.original_interpretation};
  }
}

export class CausalModelAgent {
  run(seed: Readonly<HslEpisodeSeed>) {
    return {
      hero_visual: seed.hero_visual,
      flow: seed.causal_flow || ['refinery', 'distribution_terminal', 'airport_fuel_farm', 'hydrant_or_refueler', 'aircraft_wing'],
      interfaces: seed.system_interfaces || ['custody_transfer', 'storage', 'quality_control', 'dispensing'],
      constraint: seed.main_constraint,
      consequence: seed.primary_consequence
    };
  }
}

export class DocumentaryScriptAgent {
  run(seed: Readonly<HslEpisodeSeed>, attention: Readonly<HslAttentionArchitecture>, audience: Readonly<HslAudienceStrategy>) {
    const attentionByScene = new Map(attention.scene_roles.map((role) => [role.scene_id, role]));
    return {
      language: 'en' as const,
      title: seed.title,
      reference_policy: 'STRUCTURE_ONLY_NO_STYLE_COPY' as const,
      original_phrase_patterns: attention.original_phrase_patterns,
      audience_strategy: {
        awareness: audience.awareness,
        topic_sophistication: audience.topic_sophistication,
        promise: audience.promise,
        mechanism: audience.mechanism,
        belief_requirement: audience.belief_requirement,
        progression: audience.script_progression,
        retrieval_revisions: audience.retrievals.filter((item) => item.stage === 'HOOK_AND_SCRIPT').map((item) => item.retrieval_revision)
      },
      scenes: seed.scenes.map((scene) => ({
        scene_id: scene.scene_id,
        chapter_id: scene.chapter_id,
        voiceover: scene.voiceover,
        attention_role: attentionByScene.get(scene.scene_id)?.attention_role || 'NONE',
        attention_loop_id: attentionByScene.get(scene.scene_id)?.loop_id || null
      })),
      full_text: seed.scenes.map((scene) => scene.voiceover).join('\n\n')
    };
  }
}

export class HslVisualPlanBuilder {
  run(seed: Readonly<HslEpisodeSeed>, audience: Readonly<HslAudienceStrategy>) {
    const scenes = seed.scenes.map((scene) => ({
      scene_id: scene.scene_id,
      mode: scene.visual_mode,
      subject: scene.visual_subject,
      visual_function: scene.visual_function || null,
      ai_disclosure_required: scene.visual_mode === 'generated_ai'
    }));
    const counts = Object.fromEntries(['remotion', 'licensed_real', 'generated_ai', 'typography'].map((mode) => [mode, scenes.filter((scene) => scene.mode === mode).length]));
    return {
      aspect_ratio: '16:9', fps: 30, scenes, counts,
      thumbnail_strategy: audience.thumbnail_strategy,
      title_thumbnail_promise: audience.promise,
      eugene_retrieval_revision: audience.retrievals.find((item) => item.stage === 'ANGLE_TITLE_THUMBNAIL')?.retrieval_revision
    };
  }
}

export class OriginalitySafetyGate {
  run(episode: HslEpisodeBrief) {
    const result = validateHslEpisode(episode);
    if (result.status !== 'PASS') throw new Error(`HSL_EPISODE_GATE_FAILED:${[...result.errors, ...result.warnings].join(',')}`);
    return result as typeof result & {status: 'PASS'};
  }
}

export class HslEditorialRuntime {
  run(productionId: string, outputDirectory: string, seed: Readonly<HslEpisodeSeed> = HSL_PILOT_EPISODE_SEED): HslEditorialRunResult {
    const runDir = path.resolve(outputDirectory);
    fs.mkdirSync(runDir, {recursive: true});
    const references = new ReferenceInsightIngestAgent().run();
    const eugene = new EugeneRagIngestAgent().run();
    const audience = new AudienceStrategyAgent().run(seed, eugene);
    const attention = new AttentionArchitectureAgent().run(seed, references, audience);
    const brief = new EpisodeBriefAgent().run(seed, attention, audience);
    const sourcePack = new SystemsResearchAgent().run(seed);
    const claims = new ClaimRegistryAgent().run(seed);
    const thesis = new ThesisAgent().run(seed);
    const causalModel = new CausalModelAgent().run(seed);
    const script = new DocumentaryScriptAgent().run(seed, attention, audience);
    const referenceOriginality = new PhraseOriginalityGate().run(seed, references);
    const eugeneOriginality = new EugeneRagOriginalityGate().run(seed, eugene);
    const promiseDelivery = new PromiseDeliveryGate().run(seed, audience, attention);
    const visualPlan = new HslVisualPlanBuilder().run(seed, audience);
    const attentionByScene = new Map(attention.scene_roles.map((role) => [role.scene_id, role]));
    const sourceById = new Map(seed.sources.map((source) => [source.source_id, source]));
    const claimBySourceId = new Map<string, string>();
    claims.forEach((claim) => claim.source_ids.forEach((sourceId) => { if (!claimBySourceId.has(sourceId)) claimBySourceId.set(sourceId, claim.claim_id); }));
    const rawWpm = process.env.HSL_NARRATION_WPM;
    if (!rawWpm) {
      throw new Error('CONFIG_ERROR: HSL_NARRATION_WPM environment variable is required for editorialRuntime estimation.');
    }
    const configuredWpm = Number(rawWpm);
    if (!Number.isFinite(configuredWpm) || configuredWpm < 100 || configuredWpm > 220) {
      throw new Error(`CONFIG_ERROR: HSL_NARRATION_WPM must be between 100 and 220, got '${rawWpm}'`);
    }
    const msPerWord = Math.round(60000 / configuredWpm);
    const sceneContracts: HslEditorialSceneContract[] = seed.scenes.map((scene) => {
      const primarySource = scene.claim_source_ids.map((sourceId) => sourceById.get(sourceId)).find(Boolean);
      const claimId = scene.claim_source_ids.map((sourceId) => claimBySourceId.get(sourceId)).find(Boolean) || null;
      const generated = scene.visual_mode === 'generated_ai';
      const attentionRole = attentionByScene.get(scene.scene_id);
      const sceneWords = (scene.voiceover || '').trim().split(/\s+/).filter(Boolean);
      const narrationAlignment = sceneWords.map((word, wIdx) => ({
        word,
        start_ms: wIdx * msPerWord,
        end_ms: (wIdx + 1) * msPerWord,
        source: 'estimated_wpm' as const
      }));
      return {
        scene_id: scene.scene_id, chapter_id: scene.chapter_id, chapter_title: scene.chapter_title,
        claim_id: claimId, narrative_function: scene.narrative_function, voiceover: scene.voiceover,
        script_text: scene.voiceover, visual_mode: scene.visual_mode, visual_subject: scene.visual_subject,
        evidence_status: generated ? 'illustrative' : claimId ? 'fact' : 'inference',
        asset_provenance: provenanceFor(scene.visual_mode),
        source_url: primarySource?.url || null,
        license_status: scene.visual_mode === 'licensed_real' ? 'required_before_assembly' : 'not_applicable',
        original_contribution: `Episode-specific ${scene.narrative_function} treatment for ${scene.visual_subject}`,
        ai_disclosure_required: generated,
        narration_alignment: narrationAlignment,
        ...(generated ? {on_screen_label: 'AI VISUALIZATION' as const} : {}),
        ...(scene.visual_function ? {visual_function: scene.visual_function} : {}),
        ...(attentionRole ? {
          attention_role: attentionRole.attention_role,
          attention_loop_id: attentionRole.loop_id,
          pause_after_ms: attentionRole.pause_after_ms
        } : {}),
        review_status: 'APPROVED',
        source_scene_revision: sha(JSON.stringify(scene))
      };
    });
    const gateEpisode: HslEpisodeBrief = {...brief, sources: [...seed.sources], scenes: sceneContracts.map((scene) => ({
      scene_id: scene.scene_id, claim_id: scene.claim_id, narrative_function: scene.narrative_function,
      visual_mode: scene.visual_mode, evidence_status: scene.evidence_status, asset_provenance: scene.asset_provenance,
      source_url: scene.source_url, license_status: scene.license_status, original_contribution: scene.original_contribution,
      ai_disclosure_required: scene.ai_disclosure_required, ...(scene.on_screen_label ? {on_screen_label: scene.on_screen_label} : {})
    }))};
    const gate = new OriginalitySafetyGate().run(gateEpisode);
    const artifacts = {
      references: path.join(runDir, '00-reference-insights.json'),
      eugene: path.join(runDir, '00a-eugene-rag-retrieval.json'),
      audience: path.join(runDir, '00b-audience-strategy.json'),
      brief: path.join(runDir, '01-episode-brief.json'), sourcePack: path.join(runDir, '02-source-pack.json'),
      claims: path.join(runDir, '03-claim-registry.json'), thesis: path.join(runDir, '04-thesis.json'),
      causal: path.join(runDir, '05-causal-model.json'), script: path.join(runDir, '06-script-approved.json'),
      attention: path.join(runDir, '06b-attention-architecture.json'),
      referenceOriginality: path.join(runDir, '06c-reference-originality-gate.json'),
      eugeneOriginality: path.join(runDir, '06d-eugene-originality-gate.json'),
      promiseDelivery: path.join(runDir, '08a-promise-delivery-gate.json'),
      visual: path.join(runDir, '07-visual-plan.json'), gate: path.join(runDir, '08-originality-safety-gate.json')
    };
    atomicJson(artifacts.references, {
      schema: references.schema,
      schema_version: references.schema_version,
      reference_only: true,
      source_directory_label: references.source_directory_label,
      asr_quality_policy: references.asr_quality_policy,
      fingerprint_policy: references.fingerprint_policy,
      fingerprint_count: references.phrase_fingerprints.length,
      lessons: references.lessons
    });
    atomicJson(artifacts.eugene, {
      schema: eugene.schema, schema_version: eugene.schema_version, reference_only: true,
      source_directory_label: eugene.source_directory_label,
      source_pdf_sha256: eugene.source_pdf_sha256, source_chroma_sha256: eugene.source_chroma_sha256,
      collection: eugene.collection, storage_policy: eugene.storage_policy,
      fingerprint_count: eugene.phrase_fingerprints.length, concepts: eugene.concepts,
      retrievals: audience.retrievals, status: 'EUGENE_RAG_READY'
    });
    atomicJson(artifacts.audience, audience);
    atomicJson(artifacts.brief, brief); atomicJson(artifacts.sourcePack, sourcePack); atomicJson(artifacts.claims, {claims});
    atomicJson(artifacts.thesis, thesis); atomicJson(artifacts.causal, causalModel); atomicJson(artifacts.script, script);
    atomicJson(artifacts.attention, attention); atomicJson(artifacts.referenceOriginality, referenceOriginality);
    atomicJson(artifacts.eugeneOriginality, eugeneOriginality); atomicJson(artifacts.promiseDelivery, promiseDelivery);
    atomicJson(artifacts.visual, visualPlan); atomicJson(artifacts.gate, gate);
    const episodePackage: HslEditorialPackage = {
      schema: 'hsl.episode.package.v1', schema_version: '1.0.0', episode_id: seed.episode_id,
      title: seed.title, human_approval_status: 'APPROVED',
      episode_brief: {artifact_path: artifactRelative(runDir, artifacts.brief)},
      source_pack: {artifact_path: artifactRelative(runDir, artifacts.sourcePack)},
      claim_registry: {artifact_path: artifactRelative(runDir, artifacts.claims), claims},
      causal_model: {artifact_path: artifactRelative(runDir, artifacts.causal), flow: causalModel.flow},
      approved_script: {artifact_path: artifactRelative(runDir, artifacts.script), language: 'en'},
      visual_plan: {artifact_path: artifactRelative(runDir, artifacts.visual)},
      reference_insights: {artifact_path: artifactRelative(runDir, artifacts.references), reference_only: true},
      attention_architecture: {artifact_path: artifactRelative(runDir, artifacts.attention), status: 'ATTENTION_ARCHITECTURE_APPROVED'},
      reference_originality_gate: {artifact_path: artifactRelative(runDir, artifacts.referenceOriginality), status: 'PASS'},
      eugene_rag: {artifact_path: artifactRelative(runDir, artifacts.eugene), reference_only: true, status: 'EUGENE_RAG_READY'},
      audience_strategy: {artifact_path: artifactRelative(runDir, artifacts.audience), status: 'AUDIENCE_STRATEGY_APPROVED'},
      eugene_originality_gate: {artifact_path: artifactRelative(runDir, artifacts.eugeneOriginality), status: 'PASS'},
      promise_delivery_gate: {artifact_path: artifactRelative(runDir, artifacts.promiseDelivery), status: 'PASS'},
      gate: {artifact_path: artifactRelative(runDir, artifacts.gate), status: 'PASS', originality_score: gate.originality_score},
      scenes: sceneContracts,
      generated_at: new Date().toISOString()
    };
    const packagePath = path.join(runDir, 'episode-package.json');
    atomicJson(packagePath, episodePackage);
    atomicJson(path.join(runDir, 'run-manifest.json'), {production_id: productionId, episode_id: seed.episode_id, episode_package_path: packagePath});
    return {success: true, episodePackagePath: packagePath, outputDirectory: runDir, episodeId: seed.episode_id};
  }
}
