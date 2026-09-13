import fs from 'fs';
import path from 'path';
import {
  WebFootageCandidate,
  WebFootageSanitizeResult,
  WebFootageReceipt
} from './webFootageTypes';
import { STOCK_TAG_BLACKLIST, GLOBAL_NEGATIVE } from '../../../config/visualIdentity';
import { VideoRepositoryMatcher } from '../videoRepositoryMatcher';
import { VideoCatalogEntry } from '../types';
import { Logger } from '../../../event-hub/logger';

export interface TrustGateEvaluationResult {
  passed: boolean;
  rejectionReason?: string;
  receipt?: WebFootageReceipt;
  catalogEntry?: VideoCatalogEntry;
}

export const OFF_TOPIC_BLACKLIST: readonly string[] = Object.freeze([
  'mosque', 'church', 'cathedral', 'temple', 'shrine', 'synagogue', 'basilica',
  'resort', 'hotel', 'vacation', 'tourism', 'tourist', 'holiday', 'beach resort',
  'wedding', 'party', 'nightclub', 'disco', 'celebration', 'festival', 'carnival',
  'fashion', 'runway model', 'swimwear', 'bikini', 'glamour',
  'cooking recipe', 'restaurant food', 'spa', 'massage', 'yoga'
]);

const KEYWORD_SYNONYMS: Record<string, string[]> = {
  telefone: ['phone', 'telephone', 'handset', 'receiver', 'desk'],
  monofone: ['handset', 'receiver', 'phone', 'telephone'],
  celular: ['smartphone', 'mobile', 'cellphone', 'screen'],
  smartphone: ['smartphone', 'mobile', 'cellphone', 'screen'],
  antena: ['antenna', 'dish', 'satellite', 'telecom', 'mast'],
  satelite: ['satellite', 'orbit', 'earth', 'space'],
  servidor: ['server', 'datacenter', 'rack', 'network'],
  computador: ['computer', 'screen', 'monitor', 'terminal', 'keyboard'],
  cabo: ['cable', 'cables', 'fiber', 'wire'],
  fibra: ['fiber', 'optical', 'cables'],
  navio: ['ship', 'vessel', 'cargo', 'container', 'boat'],
  cargueiro: ['cargo', 'container', 'ship', 'vessel'],
  conteiner: ['container', 'shipping', 'cargo'],
  porto: ['port', 'harbor', 'terminal', 'dock', 'shipping'],
  guindaste: ['crane', 'port', 'cargo'],
  colheitadeira: ['harvester', 'combine', 'harvest', 'crop'],
  soja: ['soybean', 'soy', 'grain', 'crop', 'field'],
  lavoura: ['field', 'crop', 'farm', 'agriculture'],
  trator: ['tractor', 'field', 'farm'],
  caminhao: ['truck', 'semi', 'highway', 'freight'],
  rodovia: ['highway', 'road', 'asphalt', 'traffic'],
  trem: ['train', 'railway', 'tracks', 'freight'],
  ferrovia: ['railway', 'rail', 'tracks', 'train'],
  refinaria: ['refinery', 'oil', 'pipeline', 'petrochemical'],
  gasolina: ['fuel', 'oil', 'gasoline', 'petroleum', 'refinery'],
  combustivel: ['fuel', 'petroleum', 'tank', 'refinery'],
  tubulacao: ['pipe', 'pipes', 'pipeline', 'industrial'],
  valvula: ['valve', 'pipeline', 'pressure', 'industrial'],
  bomba: ['pump', 'fuel', 'dispenser', 'station'],
  medidor: ['meter', 'flow', 'gauge', 'measurement'],
  bico: ['nozzle', 'fuel', 'dispenser'],
  lacre: ['seal', 'meter', 'inspection'],
  documento: ['document', 'documents', 'paper', 'contract', 'paperwork'],
  papel: ['paper', 'papers', 'document'],
  bunker: ['bunker', 'underground', 'facility', 'vault'],
  porta: ['door', 'vault', 'steel', 'gate'],
  detector: ['detector', 'sensor', 'scanner', 'inspection'],
  fragmentador: ['shredder', 'machine', 'paper']
};

export class WebFootageTrustGate {
  private static readonly APPROVED_LICENSES = new Set([
    'Pexels_Free',
    'Pixabay_Free',
    'NASA_Public_Domain',
    'Public_Domain',
    'CC0',
    'CC_BY'
  ]);

  /**
   * Verifica a relevância semântica do vídeo contra o assunto, categorias e termos obrigatórios
   */
  public static verifySemanticRelevance(
    candidate: WebFootageCandidate,
    context: {
      category?: string;
      visualSubject?: string;
      visualMustInclude?: string[];
      visualMustNot?: string[];
      domainTags?: string[];
    }
  ): { passed: boolean; score: number; reason?: string } {
    const textCorpus = [
      candidate.title,
      candidate.description || '',
      ...candidate.tags
    ].join(' ').toLowerCase();

    // 1. Off-Topic Domain Rejection (Mesquitas, igrejas, turismo, resort, festas)
    for (const badConcept of OFF_TOPIC_BLACKLIST) {
      const escaped = badConcept.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(textCorpus)) {
        return {
          passed: false,
          score: 0,
          reason: `OFF_TOPIC_DOMAIN_REJECTED: Contexto proibido '${badConcept}' detectado no vídeo.`
        };
      }
    }

    // 2. Scene specific visual_must_not
    if (context.visualMustNot && context.visualMustNot.length > 0) {
      for (const forbidden of context.visualMustNot) {
        const forbiddenLower = forbidden.toLowerCase().trim();
        if (forbiddenLower.length >= 3) {
          const escaped = forbiddenLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
          const regex = new RegExp(`\\b${escaped}\\b`, 'i');
          if (regex.test(textCorpus)) {
            return {
              passed: false,
              score: 0,
              reason: `VISUAL_MUST_NOT_VIOLATION: Termo proibido '${forbidden}' encontrado no vídeo.`
            };
          }
        }
      }
    }

    // 3. Match against visual_must_include or visualSubject or category
    const targetKeywords = new Set<string>();

    const rawInputs = [
      ...(context.visualMustInclude || []),
      context.visualSubject || '',
      context.category || '',
      ...(context.domainTags || [])
    ];

    for (const input of rawInputs) {
      const tokens = input
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 3);

      for (const tok of tokens) {
        targetKeywords.add(tok);
        if (KEYWORD_SYNONYMS[tok]) {
          for (const syn of KEYWORD_SYNONYMS[tok]) {
            targetKeywords.add(syn);
          }
        }
      }
    }

    if (targetKeywords.size === 0) {
      return { passed: true, score: 0.5 };
    }

    let matchCount = 0;
    const matchedTerms: string[] = [];
    for (const kw of targetKeywords) {
      const escaped = kw.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(textCorpus)) {
        matchCount++;
        matchedTerms.push(kw);
      }
    }

    // Score calculation
    const score = Math.min(1.0, matchCount / Math.min(4, Math.max(1, targetKeywords.size / 2)));

    // Se temos visualMustInclude ou visualSubject específicos, exige no mínimo 1 termo semântico correspondente
    const hasSpecificSubject = (context.visualMustInclude && context.visualMustInclude.length > 0) ||
      (context.visualSubject && context.visualSubject.trim().length > 0);

    if (hasSpecificSubject && matchCount === 0) {
      return {
        passed: false,
        score: 0,
        reason: `SEMANTIC_RELEVANCE_FAILED: Vídeo não possui correspondência semântica com o assunto da cena (esperado termos como: ${Array.from(targetKeywords).slice(0, 5).join(', ')}).`
      };
    }

    return {
      passed: true,
      score: Math.max(0.6, score),
      reason: `SEMANTIC_MATCH: ${matchCount} termos correspondentes [${matchedTerms.slice(0, 4).join(', ')}]`
    };
  }

  /**
   * Avalia um candidato a vídeo da internet contra as regras de blindagem e identidade
   */
  public static evaluateCandidate(
    candidate: WebFootageCandidate,
    sanitized: WebFootageSanitizeResult,
    category: string = 'industrial',
    domainTags: string[] = [],
    visualMustInclude: string[] = [],
    visualSubject: string = '',
    visualMustNot: string[] = []
  ): TrustGateEvaluationResult {
    // 1. Verificação de Licença de Direitos Autorais
    if (!this.APPROVED_LICENSES.has(candidate.license)) {
      return {
        passed: false,
        rejectionReason: `UNAPPROVED_LICENSE: Licença '${candidate.license}' não autorizada para produção livre de Content ID.`
      };
    }

    // 2. Verificação de Higienização de Áudio (Zero-Audio Guarantee)
    if (sanitized.hasAudio) {
      return {
        passed: false,
        rejectionReason: 'AUDIO_TRACK_DETECTED: O vídeo ainda contém fluxo de áudio, violando o protocolo anti-Content-ID.'
      };
    }

    // 3. Verificação de Resolução e Duração
    if (sanitized.width < 1920 || sanitized.height < 1080) {
      return {
        passed: false,
        rejectionReason: `RESOLUTION_BELOW_1080P: Resolução sanitizada ${sanitized.width}x${sanitized.height} inferior a 1920x1080.`
      };
    }

    if (sanitized.durationSeconds < 2.0) {
      return {
        passed: false,
        rejectionReason: `DURATION_TOO_SHORT: Duração ${sanitized.durationSeconds.toFixed(1)}s inferior a 2.0s.`
      };
    }

    // 4. Verificação de Blacklist de Estética Stock Corporativa Falsa
    const textCorpus = [
      candidate.title,
      candidate.description || '',
      ...candidate.tags
    ].join(' ').toLowerCase();

    for (const badTag of STOCK_TAG_BLACKLIST) {
      if (textCorpus.includes(badTag.toLowerCase())) {
        return {
          passed: false,
          rejectionReason: `STOCK_AESTHETIC_REJECTED: Vídeo contém termo proibido de stock corporativo ('${badTag}').`
        };
      }
    }

    for (const forbidden of ['watermark', 'marca d\'água', 'shutterstock', 'getty', 'pond5']) {
      if (textCorpus.includes(forbidden)) {
        return {
          passed: false,
          rejectionReason: `COMMERCIAL_WATERMARK_RISK: Suspeita de marca comercial protegida ('${forbidden}').`
        };
      }
    }

    // 5. Verificação de Relevância Semântica e Negação de Domínios Desconectados
    const semanticCheck = this.verifySemanticRelevance(candidate, {
      category,
      domainTags,
      visualMustInclude,
      visualSubject,
      visualMustNot
    });

    if (!semanticCheck.passed) {
      return {
        passed: false,
        rejectionReason: semanticCheck.reason || 'SEMANTIC_RELEVANCE_FAILED'
      };
    }

    // 6. Emissão do Recibo Auditável
    const receipt: WebFootageReceipt = {
      schema: 'hsl.web_footage.provenance.v1',
      candidateId: candidate.id,
      provider: candidate.provider,
      license: candidate.license,
      sourceUrl: candidate.downloadUrl,
      sourcePageUrl: candidate.sourcePageUrl,
      author: candidate.author,
      rawSha256: sanitized.rawSha256,
      sanitizedSha256: sanitized.sanitizedSha256,
      audioStripped: true,
      durationSeconds: sanitized.durationSeconds,
      resolution: `${sanitized.width}x${sanitized.height}`,
      fps: sanitized.fps,
      category,
      tags: candidate.tags,
      domains: domainTags.length > 0 ? domainTags : [category],
      semanticScore: semanticCheck.score,
      timestamp: new Date().toISOString()
    };

    // 6. Preparação da Entrada no Catálogo Central
    const catalogEntry: VideoCatalogEntry = {
      id: candidate.id,
      category,
      filename: `${category}/${path.basename(sanitized.sanitizedPath)}`,
      tags: Array.from(new Set([...candidate.tags, category, '35mm', 'real_world_footage'])),
      domains: domainTags.length > 0 ? domainTags : [category],
      description: candidate.title || `Take documental de ${category} em 35mm.`,
      durationSeconds: sanitized.durationSeconds,
      fps: sanitized.fps,
      resolution: `${sanitized.width}x${sanitized.height}`,
      colorTone: 'documentary-low-key',
      recommendedMotion: 'cinematic_drift',
      sha256: sanitized.sanitizedSha256,
      provenance: 'stock_curated',
      qaStatus: 'approved',
      approvedBy: `web_harvester_${candidate.provider}`,
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    return {
      passed: true,
      receipt,
      catalogEntry
    };
  }

  /**
   * Salva o recibo oficial em disco e registra o vídeo no catálogo central se solicitado
   */
  public static commitToRepository(
    sanitizedVideoPath: string,
    startFramePath: string,
    catalogEntry: VideoCatalogEntry,
    receipt: WebFootageReceipt
  ): void {
    const repoBase = path.join(process.cwd(), 'assets', 'video_repository');
    const destDir = path.join(repoBase, catalogEntry.category);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const destVideoPath = path.join(repoBase, catalogEntry.filename);
    if (path.resolve(sanitizedVideoPath) !== path.resolve(destVideoPath)) {
      fs.copyFileSync(sanitizedVideoPath, destVideoPath);
    }

    // Salva o recibo junto com o vídeo no repositório
    const receiptPath = destVideoPath.replace(/\.mp4$/i, '_web_receipt.json');
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), 'utf8');

    // Registra no catalog.json central com origin manual_ingest
    VideoRepositoryMatcher.upsertEntries([catalogEntry], 'manual_ingest');

    // Promove para 'approved' já que passou com 100% de sucesso pelo WebFootageTrustGate
    const catalog = VideoRepositoryMatcher.loadCatalog(true);
    const entryInCat = catalog.videos.find((v) => v.id === catalogEntry.id);
    if (entryInCat) {
      entryInCat.qaStatus = 'approved';
      entryInCat.provenance = 'stock_curated';
      entryInCat.approvedBy = `web_harvester_${receipt.provider}`;
      entryInCat.approvedAt = new Date().toISOString();
      VideoRepositoryMatcher.saveCatalog(catalog);
    }

    Logger.info('WebFootageTrustGate', `Take ${catalogEntry.id} registrado com sucesso em assets/video_repository/`);
  }
}
