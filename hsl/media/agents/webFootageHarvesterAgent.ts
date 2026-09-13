import fs from 'fs';
import path from 'path';
import {
  WebFootageCandidate,
  WebFootageSearchQuery,
  WebFootageReceipt
} from '../harvester/webFootageTypes';
import { PexelsVideoAdapter } from '../harvester/adapters/pexelsVideoAdapter';
import { PixabayVideoAdapter } from '../harvester/adapters/pixabayVideoAdapter';
import { OpenArchiveVideoAdapter } from '../harvester/adapters/openArchiveVideoAdapter';
import { VideoSanitizer } from '../harvester/videoSanitizer';
import { WebFootageTrustGate } from '../harvester/webFootageTrustGate';
import { VideoCatalogEntry } from '../types';
import { Logger } from '../../../event-hub/logger';

export interface HarvestSceneRequest {
  sceneId: string;
  visualSubject: string;
  visualMustInclude?: string[];
  visualMustNot?: string[];
  category: string;
  domainTags?: string[];
  targetDurationSeconds?: number;
  allowWebSources?: boolean;
}

export interface HarvestSceneResult {
  found: boolean;
  sceneId: string;
  videoPath?: string;
  startFramePath?: string;
  receipt?: WebFootageReceipt;
  catalogEntry?: VideoCatalogEntry;
  candidate?: WebFootageCandidate;
  reason: string;
}

// 1. Dicionário de Hardware Físico e Objetos Concretos (Prioridade Máxima / Sujeito Principal)
const PHYSICAL_SUBJECT_DICT: Record<string, string> = {
  'monofone': 'telephone handset',
  'telefone': 'telephone desk',
  'celular': 'smartphone screen desk',
  'smartphone': 'smartphone screen',
  'antena': 'satellite dish antenna telecommunications',
  'satelite': 'satellite earth orbit',
  'servidor': 'datacenter server rack',
  'computador': 'computer screen terminal',
  'rack': 'server rack datacenter',
  'cabo': 'fiber optic cables network',
  'fibra': 'fiber optic cables',
  'optica': 'optical fiber cables',
  'blindagem': 'copper mesh electronic shield',
  'cobre': 'copper wire mesh',
  'colheitadeira': 'combine harvester field',
  'trator': 'tractor agricultural field',
  'soja': 'soybean field harvest',
  'navio': 'cargo container ship',
  'cargueiro': 'container ship maritime',
  'conteiner': 'shipping container port',
  'guindaste': 'port crane shipping',
  'esteira': 'conveyor belt logistics',
  'empilhadeira': 'forklift warehouse logistics',
  'caminhao': 'semi truck highway logistics',
  'trem': 'freight train tracks',
  'ferrovia': 'railway tracks freight',
  'aviao': 'airplane tarmac runway',
  'aeronave': 'airplane tarmac runway',
  'drone': 'drone flight survey',
  'valvula': 'industrial valve pipeline',
  'tubulacao': 'industrial pipes pipeline',
  'bomba': 'fuel pump dispenser',
  'medidor': 'fuel flow meter',
  'bico': 'fuel dispenser nozzle',
  'lacre': 'metrology security seal',
  'detector': 'electronic sensor inspection',
  'fragmentador': 'industrial document shredder',
  'documento': 'official paperwork documents table',
  'papel': 'printed document paperwork',
  'porta': 'heavy vault door steel',
  'tomada': 'electrical outlet socket',
  'varredura': 'technical inspection device'
};

// 2. Modificadores de Contexto e Ambiente (Secundários, qualificam o sujeito)
const CONTEXT_MODIFIER_DICT: Record<string, string> = {
  'palacio': 'executive office',
  'planalto': 'presidential office',
  'congresso': 'government chamber',
  'esplanada': 'government district',
  'porto': 'seaport cargo terminal',
  'refinaria': 'oil refinery industrial',
  'gasolina': 'fuel storage refinery',
  'combustivel': 'fuel terminal refinery',
  'armazem': 'distribution warehouse',
  'galpao': 'industrial warehouse',
  'lavoura': 'agricultural field',
  'agro': 'agriculture farming',
  'rodovia': 'highway asphalt traffic',
  'pista': 'airport runway tarmac',
  'bunker': 'underground facility',
  'subterranea': 'underground corridor',
  'galeria': 'underground tunnel',
  'seguranca': 'security inspection',
  'reuniao': 'boardroom table paperwork',
  'rua': 'city street asphalt',
  'asfalto': 'asphalt wet night',
  'cidade': 'city skyline architecture',
  'concreto': 'concrete structure monumental',
  'espaco': 'space satellite orbit',
  'orbita': 'earth orbit space',
  'pacote': 'parcel logistics',
  'triagem': 'sorting logistics'
};

export class WebFootageHarvesterAgent {
  private pexels: PexelsVideoAdapter;
  private pixabay: PixabayVideoAdapter;
  private openArchive: OpenArchiveVideoAdapter;
  private stagingDir: string;

  constructor() {
    this.pexels = new PexelsVideoAdapter();
    this.pixabay = new PixabayVideoAdapter();
    this.openArchive = new OpenArchiveVideoAdapter();
    this.stagingDir = path.join(process.cwd(), 'temp', 'web_footage_staging');
    if (!fs.existsSync(this.stagingDir)) {
      fs.mkdirSync(this.stagingDir, { recursive: true });
    }
  }

  /**
   * Tradução técnica e expansão de vocabulário Subject-First PT -> EN para busca em acervos globais
   */
  public buildSearchTerms(subject: string, mustInclude: string[] = [], domainTags: string[] = []): string[] {
    const normalizeTokens = (str: string): string[] => {
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3);
    };

    const subjectTokens = normalizeTokens(subject);
    const mustIncludeTokens = mustInclude.flatMap(normalizeTokens);
    const domainTokens = domainTags.flatMap(normalizeTokens);

    // 1. Identifica hardware físico e sujeitos prioritários
    const physicalTerms: string[] = [];
    for (const tok of [...mustIncludeTokens, ...subjectTokens]) {
      if (PHYSICAL_SUBJECT_DICT[tok] && !physicalTerms.includes(PHYSICAL_SUBJECT_DICT[tok])) {
        physicalTerms.push(PHYSICAL_SUBJECT_DICT[tok]);
      }
    }

    // 2. Identifica modificadores de ambiente/contexto
    const contextTerms: string[] = [];
    for (const tok of [...subjectTokens, ...mustIncludeTokens, ...domainTokens]) {
      if (CONTEXT_MODIFIER_DICT[tok] && !contextTerms.includes(CONTEXT_MODIFIER_DICT[tok])) {
        contextTerms.push(CONTEXT_MODIFIER_DICT[tok]);
      }
    }

    const searchQueries: string[] = [];

    // Se temos sujeito físico (ex: telefone, colheitadeira, navio, antena)
    if (physicalTerms.length > 0) {
      // Query prioritária 1: Termo físico direto (foco no objeto)
      searchQueries.push(physicalTerms[0]);

      // Query prioritária 2: Combina termo físico com contexto se houver
      if (contextTerms.length > 0) {
        searchQueries.push(`${physicalTerms[0]} ${contextTerms[0]}`);
      }

      // Query prioritária 3: Segundo termo físico se houver
      if (physicalTerms.length > 1) {
        searchQueries.push(physicalTerms[1]);
      }
    } else if (contextTerms.length > 0) {
      // Não há sujeito físico explícito, busca infraestrutura contextual
      for (const term of contextTerms.slice(0, 3)) {
        searchQueries.push(term);
      }
      if (contextTerms.length >= 2) {
        searchQueries.push(`${contextTerms[0].split(' ')[0]} ${contextTerms[1].split(' ')[0]}`);
      }
    } else {
      searchQueries.push('telecommunications antenna');
      searchQueries.push('datacenter server rack');
    }

    return Array.from(new Set(searchQueries)).filter(Boolean);
  }

  /**
   * Executa busca multi-fontes e retorna os candidatos classificados por relevância
   */
  public async searchCandidates(query: WebFootageSearchQuery, visualMustNot: string[] = []): Promise<WebFootageCandidate[]> {
    const queries = query.keywords && query.keywords.length > 0
      ? query.keywords
      : [query.query];

    let allCandidates: WebFootageCandidate[] = [];

    for (const qStr of queries) {
      const subQuery: WebFootageSearchQuery = { ...query, query: qStr };
      Logger.info('WebFootageHarvesterAgent', `Buscando vídeos na web para: "${qStr}"...`);

      const [pexelsHits, pixabayHits, nasaHits, wikiHits] = await Promise.all([
        this.pexels.searchVideos(subQuery),
        this.pixabay.searchVideos(subQuery),
        this.openArchive.searchNasaVideos(subQuery),
        this.openArchive.searchWikimediaVideos(subQuery)
      ]);

      allCandidates.push(...pexelsHits, ...pixabayHits, ...nasaHits, ...wikiHits);
      if (allCandidates.length >= 8) break;
    }

    // Deduplica candidatos pelo URL de download
    const seen = new Set<string>();
    const deduplicated: WebFootageCandidate[] = [];
    for (const c of allCandidates) {
      if (!seen.has(c.downloadUrl)) {
        seen.add(c.downloadUrl);
        deduplicated.push(c);
      }
    }

    // Pré-triagem semântica: filtra candidatos fora de tópico ou proibidos, e ordena por relevância
    const rankedCandidates: Array<{ candidate: WebFootageCandidate; score: number }> = [];
    for (const c of deduplicated) {
      const semCheck = WebFootageTrustGate.verifySemanticRelevance(c, {
        category: query.category,
        domainTags: query.domainTags,
        visualMustInclude: query.keywords,
        visualSubject: query.query,
        visualMustNot
      });

      if (semCheck.passed) {
        rankedCandidates.push({ candidate: c, score: semCheck.score });
      } else {
        Logger.info('WebFootageHarvesterAgent', `  [Ignorado na pré-triagem] [${c.provider}] ${c.title} -> ${semCheck.reason}`);
      }
    }

    rankedCandidates.sort((a, b) => b.score - a.score);
    return rankedCandidates.map((r) => r.candidate);
  }

  /**
   * Orquestra a busca, download, higienização FFmpeg e portão de confiança para uma cena
   */
  public async harvestForScene(request: HarvestSceneRequest): Promise<HarvestSceneResult> {
    Logger.info('WebFootageHarvesterAgent', `[${request.sceneId}] Iniciando busca de vídeo real na internet para: "${request.visualSubject}"`);

    const searchQueries = this.buildSearchTerms(
      request.visualSubject,
      request.visualMustInclude,
      request.domainTags
    );

    const candidates = await this.searchCandidates({
      query: searchQueries[0] || request.visualSubject,
      keywords: searchQueries,
      category: request.category,
      domainTags: request.domainTags,
      limit: 6
    }, request.visualMustNot || []);

    if (candidates.length === 0) {
      Logger.info('WebFootageHarvesterAgent', `  ℹ️ [${request.sceneId}] Nenhum vídeo compatível encontrado na internet.`);
      return {
        found: false,
        sceneId: request.sceneId,
        reason: 'NO_WEB_CANDIDATES: Nenhum vídeo compatível com o tema nas fontes livres verificadas.'
      };
    }

    Logger.info('WebFootageHarvesterAgent', `  🎯 [${request.sceneId}] ${candidates.length} candidatos encontrados na web. Baixando e higienizando o melhor candidato...`);

    // Tenta baixar e validar candidatos em ordem de relevância
    for (let idx = 0; idx < candidates.length; idx++) {
      const candidate = candidates[idx];
      const rawFile = path.join(this.stagingDir, `${request.sceneId}_raw_${candidate.id}.mp4`);
      const sanitizedFile = path.join(this.stagingDir, `${request.sceneId}_clean_${candidate.id}.mp4`);

      try {
        Logger.info('WebFootageHarvesterAgent', `  📥 [${request.sceneId}] Baixando candidato [${candidate.provider}]: ${candidate.title}`);
        await VideoSanitizer.downloadVideo(candidate.downloadUrl, rawFile);

        // Higienização com FFmpeg (Zero Audio + 1080p + 24fps)
        const sanitizeResult = VideoSanitizer.sanitize(rawFile, sanitizedFile, {
          targetWidth: 1920,
          targetHeight: 1080,
          targetFps: 24,
          targetDurationSeconds: request.targetDurationSeconds || 5.0,
          stripAudio: true
        });

        if (!sanitizeResult.success) {
          Logger.warn('WebFootageHarvesterAgent', `  ⚠️ [${request.sceneId}] Falha na sanitização FFmpeg: ${sanitizeResult.error}`);
          continue;
        }

        // Avaliação do Portão de Confiança e Blindagem de Direitos Autorais
        const trustEvaluation = WebFootageTrustGate.evaluateCandidate(
          candidate,
          sanitizeResult,
          request.category,
          request.domainTags || [],
          request.visualMustInclude || [],
          request.visualSubject,
          request.visualMustNot || []
        );

        if (!trustEvaluation.passed) {
          Logger.warn('WebFootageHarvesterAgent', `  ⛔ [${request.sceneId}] Candidato rejeitado pelo Trust Gate: ${trustEvaluation.rejectionReason}`);
          continue;
        }

        // Auto-ingestão permanente no Banco Central de Vídeos apenas se alta confiança semântica (>= 0.75)
        const semanticScore = trustEvaluation.receipt?.semanticScore ?? 1.0;
        if (trustEvaluation.catalogEntry && trustEvaluation.receipt && semanticScore >= 0.75) {
          WebFootageTrustGate.commitToRepository(
            sanitizedFile,
            sanitizeResult.startFramePath,
            trustEvaluation.catalogEntry,
            trustEvaluation.receipt
          );
        }

        Logger.info('WebFootageHarvesterAgent', `  ✅ [${request.sceneId}] Take aprovado com sucesso via ${candidate.provider}! Blindagem anti-copyright ativa.`);

        return {
          found: true,
          sceneId: request.sceneId,
          videoPath: sanitizedFile,
          startFramePath: sanitizeResult.startFramePath,
          receipt: trustEvaluation.receipt,
          catalogEntry: trustEvaluation.catalogEntry,
          candidate,
          reason: `WEB_HARVEST_SUCCESS: Take real obtido de ${candidate.provider} (${candidate.license}) e higienizado.`
        };
      } catch (err: any) {
        Logger.warn('WebFootageHarvesterAgent', `  ⚠️ [${request.sceneId}] Erro ao processar candidato ${candidate.id}: ${err.message}`);
      } finally {
        // Remove arquivo bruto para liberar espaço em disco
        if (fs.existsSync(rawFile)) {
          try { fs.unlinkSync(rawFile); } catch {}
        }
      }
    }

    return {
      found: false,
      sceneId: request.sceneId,
      reason: 'ALL_CANDIDATES_REJECTED: Nenhum dos candidatos atendeu aos critérios de resolução ou trust gate.'
    };
  }
}
