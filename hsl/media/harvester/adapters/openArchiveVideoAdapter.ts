import { WebFootageCandidate, WebFootageSearchQuery } from '../webFootageTypes';
import { Logger } from '../../../../event-hub/logger';

export class OpenArchiveVideoAdapter {
  private static readonly NASA_API_URL = 'https://images-api.nasa.gov/search';
  private static readonly WIKIMEDIA_API_URL = 'https://commons.wikimedia.org/w/api.php';

  /**
   * Busca vídeos na biblioteca aberta da NASA (Domínio Público Mundial - 17 U.S.C. § 105)
   */
  public async searchNasaVideos(query: WebFootageSearchQuery): Promise<WebFootageCandidate[]> {
    const candidates: WebFootageCandidate[] = [];
    const searchTerm = query.query.trim();
    if (!searchTerm) return candidates;

    try {
      const url = new URL(OpenArchiveVideoAdapter.NASA_API_URL);
      url.searchParams.set('media_type', 'video');
      url.searchParams.set('q', searchTerm);
      url.searchParams.set('page_size', String(query.limit || 5));

      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'OOutroLado-Bot/1.0 (investigative-documentary-pipeline)' }
      });

      if (!res.ok) {
        Logger.warn('OpenArchiveVideoAdapter', `NASA API retornou status HTTP ${res.status}`);
        return candidates;
      }

      const data: any = await res.json();
      const items = data.collection?.items || [];

      for (const item of items) {
        const itemData = item.data?.[0];
        if (!itemData) continue;

        const nasaId = itemData.nasa_id;
        const title = itemData.title || `NASA Video ${nasaId}`;
        const description = itemData.description || '';
        const keywords = itemData.keywords || [];

        // Para obter o link direto de MP4 do NASA media asset:
        // A API da NASA disponibiliza um manifest de assets em collection.href
        if (item.href) {
          try {
            const assetRes = await fetch(item.href);
            if (assetRes.ok) {
              const assetList: string[] = await assetRes.json();
              // Prioriza MP4 de qualidade média/alta (orig.mp4 ou ~1080p)
              const mp4Url = assetList.find(u => u.endsWith('~orig.mp4')) ||
                             assetList.find(u => u.endsWith('~medium.mp4')) ||
                             assetList.find(u => u.endsWith('.mp4'));

              if (mp4Url) {
                candidates.push({
                  id: `NASA_${nasaId.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
                  provider: 'nasa',
                  title,
                  description,
                  downloadUrl: mp4Url,
                  license: 'NASA_Public_Domain',
                  author: itemData.center || 'NASA',
                  sourcePageUrl: `https://images.nasa.gov/details-${nasaId}`,
                  width: 1920,
                  height: 1080,
                  durationSeconds: 10,
                  tags: [...keywords, 'nasa', 'public_domain', 'space', 'earth_observation']
                });
              }
            }
          } catch (e: any) {
            Logger.warn('OpenArchiveVideoAdapter', `Falha ao resolver links de mídia da NASA para ${nasaId}: ${e.message}`);
          }
        }
      }
    } catch (err: any) {
      Logger.warn('OpenArchiveVideoAdapter', `Erro ao buscar na NASA: ${err.message}`);
    }

    return candidates;
  }

  /**
   * Busca vídeos no Wikimedia Commons (CC0, CC-BY e Domínio Público)
   */
  public async searchWikimediaVideos(query: WebFootageSearchQuery): Promise<WebFootageCandidate[]> {
    const candidates: WebFootageCandidate[] = [];
    const searchTerm = query.query.trim();
    if (!searchTerm) return candidates;

    try {
      const url = new URL(OpenArchiveVideoAdapter.WIKIMEDIA_API_URL);
      url.searchParams.set('action', 'query');
      url.searchParams.set('generator', 'search');
      url.searchParams.set('gsrsearch', `filetype:video ${searchTerm}`);
      url.searchParams.set('gsrnamespace', '6'); // File namespace
      url.searchParams.set('gsrlimit', String(query.limit || 5));
      url.searchParams.set('prop', 'imageinfo');
      url.searchParams.set('iiprop', 'url|size|mime|extmetadata');
      url.searchParams.set('format', 'json');

      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'OOutroLado-Bot/1.0 (investigative-documentary-pipeline)' }
      });

      if (!res.ok) {
        Logger.warn('OpenArchiveVideoAdapter', `Wikimedia API retornou status HTTP ${res.status}`);
        return candidates;
      }

      const data: any = await res.json();
      const pages = data.query?.pages ? Object.values(data.query.pages) : [];

      for (const page of pages as any[]) {
        const info = page.imageinfo?.[0];
        if (!info || !info.url) continue;

        // Aceitamos arquivos MP4 e WebM (FFmpeg converterá WebM para MP4 1080p sem perdas)
        const isVideo = info.mime?.includes('video') || info.url.endsWith('.mp4') || info.url.endsWith('.webm');
        if (!isVideo) continue;

        const width = info.width || 1920;
        const height = info.height || 1080;
        const ext = info.extmetadata || {};
        const licenseShort = ext.LicenseShortName?.value || 'Public_Domain';
        const artist = ext.Artist?.value?.replace(/<[^>]*>?/gm, '') || 'Wikimedia Contributor';

        candidates.push({
          id: `COMMONS_${page.pageid}`,
          provider: 'wikimedia',
          title: page.title || `Wikimedia Commons Video ${page.pageid}`,
          description: ext.ObjectName?.value || ext.ImageDescription?.value || '',
          downloadUrl: info.url,
          previewImageUrl: info.thumburl,
          license: licenseShort.toLowerCase().includes('cc0') ? 'CC0' : 'Public_Domain',
          author: artist,
          sourcePageUrl: info.descriptionurl,
          width,
          height,
          durationSeconds: 8,
          tags: [searchTerm, 'wikimedia_commons', 'open_archive']
        });
      }
    } catch (err: any) {
      Logger.warn('OpenArchiveVideoAdapter', `Erro ao buscar no Wikimedia Commons: ${err.message}`);
    }

    return candidates;
  }
}
