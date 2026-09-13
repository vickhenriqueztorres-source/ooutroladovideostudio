import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { WebFootageHarvesterAgent } from '../hsl/media/agents/webFootageHarvesterAgent';
import { VideoSanitizer } from '../hsl/media/harvester/videoSanitizer';
import { WebFootageTrustGate } from '../hsl/media/harvester/webFootageTrustGate';

function parseArgs(): {
  query: string;
  category: string;
  count: number;
  tags: string[];
  duration: number;
} {
  const args = process.argv.slice(2);
  let query = '';
  let category = 'industrial';
  let count = 1;
  let tags: string[] = [];
  let duration = 5.0;

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--query' || args[i] === '-q') && args[i + 1]) {
      query = args[i + 1];
      i++;
    } else if ((args[i] === '--category' || args[i] === '-c') && args[i + 1]) {
      category = args[i + 1];
      i++;
    } else if ((args[i] === '--count' || args[i] === '-n') && args[i + 1]) {
      count = parseInt(args[i + 1], 10) || 1;
      i++;
    } else if ((args[i] === '--tags' || args[i] === '-t') && args[i + 1]) {
      tags = args[i + 1].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      i++;
    } else if ((args[i] === '--duration' || args[i] === '-d') && args[i + 1]) {
      duration = parseFloat(args[i + 1]) || 5.0;
      i++;
    }
  }

  return { query, category, count, tags, duration };
}

async function main(): Promise<void> {
  const { query, category, count, tags, duration } = parseArgs();

  if (!query) {
    console.log(`\n[USO] npx ts-node scripts/harvestWebFootage.ts --query "termo de busca" [--category industrial] [--count 1] [--duration 5]\n`);
    console.log(`Exemplos:`);
    console.log(`  npx ts-node scripts/harvestWebFootage.ts --query "porto navio conteiner" --category industrial --count 2`);
    console.log(`  npx ts-node scripts/harvestWebFootage.ts --query "colheitadeira soja campo" --category industrial --count 1\n`);
    process.exit(1);
  }

  console.log(`══════════════════════════════════════════════════════════════════════════════════════`);
  console.log(`🌐 WEB FOOTAGE HARVESTER: MINERAÇÃO DE VÍDEOS REAIS COM BLINDAGEM ANTI-COPYRIGHT`);
  console.log(`══════════════════════════════════════════════════════════════════════════════════════`);
  console.log(`• Busca: "${query}"`);
  console.log(`• Categoria: ${category}`);
  console.log(`• Quantidade desejada: ${count}`);
  console.log(`• Duração alvo: ${duration}s | Formato: 1080p 24fps | Áudio: Zero (Stripped)\n`);

  const harvester = new WebFootageHarvesterAgent();
  const searchTerms = harvester.buildSearchTerms(query, tags);
  console.log(`[TERMOS_EXPANDIDOS] ${searchTerms.join(' | ')}`);

  const candidates = await harvester.searchCandidates({
    query: searchTerms[0] || query,
    keywords: searchTerms,
    category,
    limit: count * 3
  });

  if (candidates.length === 0) {
    console.log(`\n❌ Nenhum vídeo encontrado nas fontes verificadas (Pexels, Pixabay, Wikimedia, NASA).`);
    process.exit(0);
  }

  console.log(`\n🎯 Encontrados ${candidates.length} candidatos na web. Iniciando pipeline de higienização...\n`);

  const stagingDir = path.join(process.cwd(), 'temp', 'harvest_cli');
  if (!fs.existsSync(stagingDir)) {
    fs.mkdirSync(stagingDir, { recursive: true });
  }

  let downloadedCount = 0;

  for (const candidate of candidates) {
    if (downloadedCount >= count) break;

    console.log(`--------------------------------------------------------------------------------------`);
    console.log(`[CANDIDATO ${downloadedCount + 1}/${count}] ${candidate.title}`);
    console.log(`• Provedor: ${candidate.provider} | Licença: ${candidate.license}`);
    console.log(`• Autor: ${candidate.author || 'N/A'}`);
    console.log(`• URL Original: ${candidate.downloadUrl.slice(0, 70)}...`);

    const rawFile = path.join(stagingDir, `raw_${candidate.id}.mp4`);
    const sanitizedFile = path.join(stagingDir, `clean_${candidate.id}.mp4`);

    try {
      console.log(`  📥 Baixando arquivo bruto...`);
      await VideoSanitizer.downloadVideo(candidate.downloadUrl, rawFile);

      console.log(`  ⚙️ Executando sanitização FFmpeg (Zero Áudio, 1080p 24fps, trim ${duration}s)...`);
      const sanitizeRes = VideoSanitizer.sanitize(rawFile, sanitizedFile, {
        targetWidth: 1920,
        targetHeight: 1080,
        targetFps: 24,
        targetDurationSeconds: duration,
        stripAudio: true
      });

      if (!sanitizeRes.success) {
        console.log(`  ⚠️ Falha na sanitização FFmpeg: ${sanitizeRes.error}`);
        continue;
      }

      console.log(`  🛡️ Avaliando Portão de Confiança e Licença...`);
      const evaluation = WebFootageTrustGate.evaluateCandidate(
        candidate,
        sanitizeRes,
        category,
        tags.length > 0 ? tags : [category]
      );

      if (!evaluation.passed) {
        console.log(`  ⛔ Rejeitado pelo Trust Gate: ${evaluation.rejectionReason}`);
        continue;
      }

      console.log(`  💾 Ingerindo no Repositório Central de Vídeos (assets/video_repository/)...`);
      WebFootageTrustGate.commitToRepository(
        sanitizedFile,
        sanitizeRes.startFramePath,
        evaluation.catalogEntry!,
        evaluation.receipt!
      );

      downloadedCount++;
      console.log(`  ✅ SUCESSO: Take ${candidate.id} arquivado e pronto para uso em produção!`);
      console.log(`     - Duração: ${sanitizeRes.durationSeconds.toFixed(1)}s | Resolução: ${sanitizeRes.width}x${sanitizeRes.height}`);
      console.log(`     - SHA-256 Sanitizado: ${sanitizeRes.sanitizedSha256.slice(0, 16)}...`);
      console.log(`     - Recibo: assets/video_repository/${category}/${path.basename(sanitizedFile).replace(/\.mp4$/i, '_web_receipt.json')}`);
    } catch (err: any) {
      console.log(`  ❌ Erro ao processar candidato: ${err.message}`);
    } finally {
      if (fs.existsSync(rawFile)) {
        try { fs.unlinkSync(rawFile); } catch {}
      }
    }
  }

  console.log(`\n══════════════════════════════════════════════════════════════════════════════════════`);
  console.log(`🎉 MINERAÇÃO CONCLUÍDA! Total de vídeos ingeridos com segurança: ${downloadedCount}/${count}`);
  console.log(`══════════════════════════════════════════════════════════════════════════════════════\n`);
}

main().catch((err) => {
  console.error('[FATAL_ERROR]', err.message);
  process.exit(1);
});
