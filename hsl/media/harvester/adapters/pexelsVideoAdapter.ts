import { WebFootageCandidate, WebFootageSearchQuery } from '../webFootageTypes';
import { Logger } from '../../../../event-hub/logger';

export class PexelsVideoAdapter {
  private static readonly API_URL = 'https://api.pexels.com/videos/search';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PEXELS_API_KEY || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  }

  /**
   * Busca vídeos em landscape/1080p na API do Pexels
   */
  public async searchVideos(query: WebFootageSearchQuery): Promise<WebFootageCandidate[]> {
    const candidates: WebFootageCandidate[] = [];
    if (!this.isConfigured()) {
      return candidates;
    }

    const searchTerm = query.query.trim();
    if (!searchTerm) return candidates;

    try {
      const url = new URL(PexelsVideoAdapter.API_URL);
      url.searchParams.set('query', searchTerm);
      url.searchParams.set('per_page', String(query.limit || 5));
      url.searchParams.set('orientation', 'landscape');

      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': this.apiKey,
          'User-Agent': 'OOutroLado-Bot/1.0'
        }
      });

      if (!res.ok) {
        Logger.warn('PexelsVideoAdapter', `Pexels API retornou status HTTP ${res.status}`);
        return candidates;
      }

      const data: any = await res.json();
      const videos = data.videos || [];

      for (const v of videos) {
        const videoFiles: any[] = v.video_files || [];
        // Encontra o melhor arquivo MP4 (preferência para 1080p / HD)
        const bestFile = videoFiles.find((f) => f.quality === 'hd' && f.width >= 1920 && f.file_type === 'video/mp4') ||
                         videoFiles.find((f) => f.width >= 1920 && f.file_type === 'video/mp4') ||
                         videoFiles.find((f) => f.quality === 'hd' && f.file_type === 'video/mp4') ||
                         videoFiles[0];

        if (!bestFile || !bestFile.link) continue;

        candidates.push({
          id: `PEXELS_${v.id}`,
          provider: 'pexels',
          title: `Pexels Video ${v.id}`,
          description: `Vídeo da comunidade Pexels por ${v.user?.name || 'anônimo'}`,
          downloadUrl: bestFile.link,
          previewImageUrl: v.image,
          license: 'Pexels_Free',
          author: v.user?.name || 'Pexels Creator',
          sourcePageUrl: v.url,
          width: bestFile.width || 1920,
          height: bestFile.height || 1080,
          durationSeconds: v.duration || 10,
          fps: bestFile.fps || 24,
          tags: [searchTerm, 'pexels', 'royalty_free', 'commercial_safe']
        });
      }
    } catch (err: any) {
      Logger.warn('PexelsVideoAdapter', `Erro ao buscar no Pexels: ${err.message}`);
    }

    return candidates;
  }
}
