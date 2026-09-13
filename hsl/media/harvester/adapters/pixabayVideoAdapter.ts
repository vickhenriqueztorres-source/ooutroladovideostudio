import { WebFootageCandidate, WebFootageSearchQuery } from '../webFootageTypes';
import { Logger } from '../../../../event-hub/logger';

export class PixabayVideoAdapter {
  private static readonly API_URL = 'https://pixabay.com/api/videos/';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PIXABAY_API_KEY || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  }

  /**
   * Busca vídeos cinematográficos na API do Pixabay
   */
  public async searchVideos(query: WebFootageSearchQuery): Promise<WebFootageCandidate[]> {
    const candidates: WebFootageCandidate[] = [];
    if (!this.isConfigured()) {
      return candidates;
    }

    const searchTerm = query.query.trim();
    if (!searchTerm) return candidates;

    try {
      const url = new URL(PixabayVideoAdapter.API_URL);
      url.searchParams.set('key', this.apiKey);
      url.searchParams.set('q', searchTerm);
      url.searchParams.set('video_type', 'film');
      url.searchParams.set('per_page', String(query.limit || 5));

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'OOutroLado-Bot/1.0'
        }
      });

      if (!res.ok) {
        Logger.warn('PixabayVideoAdapter', `Pixabay API retornou status HTTP ${res.status}`);
        return candidates;
      }

      const data: any = await res.json();
      const hits = data.hits || [];

      for (const hit of hits) {
        const videos = hit.videos || {};
        const chosen = videos.large || videos.medium || videos.small;
        if (!chosen || !chosen.url) continue;

        const tags = (hit.tags || '').split(',').map((t: string) => t.trim().toLowerCase());

        candidates.push({
          id: `PIXABAY_${hit.id}`,
          provider: 'pixabay',
          title: `Pixabay Video ${hit.id} (${tags.slice(0, 3).join(', ')})`,
          description: `Vídeo Pixabay por ${hit.user || 'autor'}`,
          downloadUrl: chosen.url,
          previewImageUrl: hit.picture_id ? `https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg` : undefined,
          license: 'Pixabay_Free',
          author: hit.user || 'Pixabay Contributor',
          sourcePageUrl: hit.pageURL,
          width: chosen.width || 1920,
          height: chosen.height || 1080,
          durationSeconds: hit.duration || 10,
          tags: [...tags, 'pixabay', 'commercial_safe']
        });
      }
    } catch (err: any) {
      Logger.warn('PixabayVideoAdapter', `Erro ao buscar no Pixabay: ${err.message}`);
    }

    return candidates;
  }
}
