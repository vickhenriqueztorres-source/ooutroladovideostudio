import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { WebFootageHarvesterAgent } from '../hsl/media/agents/webFootageHarvesterAgent';
import { WebFootageTrustGate } from '../hsl/media/harvester/webFootageTrustGate';
import { WebFootageCandidate, WebFootageSanitizeResult } from '../hsl/media/harvester/webFootageTypes';
import { VideoSanitizer } from '../hsl/media/harvester/videoSanitizer';

test('Web Footage Harvester & Anti-Copyright Shield Suite', async (t) => {

  await t.test('1. Heuristic dictionary translates Portuguese documentary terms to English search keywords', () => {
    const agent = new WebFootageHarvesterAgent();

    const terms1 = agent.buildSearchTerms(
      'Navio cargueiro atracando no porto de Santos com guindaste',
      ['navio', 'porto', 'conteiner'],
      ['logistica', 'maritimo']
    );

    assert(terms1.length > 0, 'Deve gerar pelo menos um termo de busca');
    const combined = terms1.join(' ').toLowerCase();
    assert(combined.includes('ship') || combined.includes('port') || combined.includes('crane'),
      `Termos traduzidos devem conter equivalentes em inglês: ${combined}`);

    const terms2 = agent.buildSearchTerms(
      'Colheitadeira operando em lavoura de soja no campo',
      ['colheitadeira', 'soja'],
      ['agro']
    );
    const combinedAgro = terms2.join(' ').toLowerCase();
    assert(combinedAgro.includes('harvester') || combinedAgro.includes('soybean') || combinedAgro.includes('field'),
      `Termos agrícolas devem ser traduzidos para busca global: ${combinedAgro}`);
  });

  await t.test('2. WebFootageTrustGate approves compliant free-license candidate', () => {
    const candidate: WebFootageCandidate = {
      id: 'TEST_PEXELS_001',
      provider: 'pexels',
      title: 'Container vessel at shipping terminal',
      downloadUrl: 'https://example.com/video.mp4',
      license: 'Pexels_Free',
      author: 'Documentary Filmmaker',
      width: 1920,
      height: 1080,
      durationSeconds: 6.0,
      tags: ['shipping', 'container', 'port', 'logistics']
    };

    const sanitized: WebFootageSanitizeResult = {
      success: true,
      sanitizedPath: 'temp/clean.mp4',
      startFramePath: 'temp/start.png',
      durationSeconds: 5.0,
      width: 1920,
      height: 1080,
      fps: 24,
      hasAudio: false, // ZERO ÁUDIO
      rawSha256: 'a'.repeat(64),
      sanitizedSha256: 'b'.repeat(64)
    };

    const evalResult = WebFootageTrustGate.evaluateCandidate(candidate, sanitized, 'industrial', ['logistics', 'port']);

    assert.equal(evalResult.passed, true, 'Candidato com licença Pexels_Free e áudio zero deve ser aprovado');
    assert(evalResult.receipt, 'Deve emitir recibo auditável');
    assert.equal(evalResult.receipt.audioStripped, true);
    assert.equal(evalResult.receipt.license, 'Pexels_Free');
    assert.equal(evalResult.catalogEntry?.qaStatus, 'approved');
    assert.equal(evalResult.catalogEntry?.provenance, 'stock_curated');
  });

  await t.test('3. WebFootageTrustGate rejects candidate if audio was not stripped (fail-closed)', () => {
    const candidate: WebFootageCandidate = {
      id: 'TEST_AUDIO_RISK_001',
      provider: 'pixabay',
      title: 'Industrial factory assembly line',
      downloadUrl: 'https://example.com/audio_risk.mp4',
      license: 'Pixabay_Free',
      width: 1920,
      height: 1080,
      durationSeconds: 4.0,
      tags: ['factory', 'industrial']
    };

    const sanitizedWithAudio: WebFootageSanitizeResult = {
      success: true,
      sanitizedPath: 'temp/dirty.mp4',
      startFramePath: 'temp/start.png',
      durationSeconds: 4.0,
      width: 1920,
      height: 1080,
      fps: 24,
      hasAudio: true, // FALHA NO PROTOCOLO: CONTÉM ÁUDIO!
      rawSha256: 'c'.repeat(64),
      sanitizedSha256: 'd'.repeat(64)
    };

    const evalResult = WebFootageTrustGate.evaluateCandidate(candidate, sanitizedWithAudio, 'industrial');
    assert.equal(evalResult.passed, false, 'Deve rejeitar vídeo que contenha áudio');
    assert(evalResult.rejectionReason?.includes('AUDIO_TRACK_DETECTED'), 'Motivo deve indicar detecção de áudio');
  });

  await t.test('4. WebFootageTrustGate rejects unapproved licenses or proprietary copyrights', () => {
    const candidate: any = {
      id: 'TEST_COPYRIGHT_001',
      provider: 'pexels',
      title: 'Commercial broadcast footage',
      downloadUrl: 'https://example.com/broadcast.mp4',
      license: 'All_Rights_Reserved', // LICENÇA PROIBIDA
      width: 1920,
      height: 1080,
      durationSeconds: 4.0,
      tags: ['tv', 'broadcast']
    };

    const sanitized: WebFootageSanitizeResult = {
      success: true,
      sanitizedPath: 'temp/clean.mp4',
      startFramePath: 'temp/start.png',
      durationSeconds: 4.0,
      width: 1920,
      height: 1080,
      fps: 24,
      hasAudio: false,
      rawSha256: 'e'.repeat(64),
      sanitizedSha256: 'f'.repeat(64)
    };

    const evalResult = WebFootageTrustGate.evaluateCandidate(candidate, sanitized, 'industrial');
    assert.equal(evalResult.passed, false);
    assert(evalResult.rejectionReason?.includes('UNAPPROVED_LICENSE'));
  });

  await t.test('5. WebFootageTrustGate rejects stock corporate smile / fake aesthetics', () => {
    const candidate: WebFootageCandidate = {
      id: 'TEST_STOCK_TAG_001',
      provider: 'pexels',
      title: 'Corporate business meeting with smiling person',
      downloadUrl: 'https://example.com/smile.mp4',
      license: 'Pexels_Free',
      width: 1920,
      height: 1080,
      durationSeconds: 4.0,
      tags: ['corporate_smile', 'lifestyle_pose'] // TAGS NA BLACKLIST!
    };

    const sanitized: WebFootageSanitizeResult = {
      success: true,
      sanitizedPath: 'temp/clean.mp4',
      startFramePath: 'temp/start.png',
      durationSeconds: 4.0,
      width: 1920,
      height: 1080,
      fps: 24,
      hasAudio: false,
      rawSha256: '1'.repeat(64),
      sanitizedSha256: '2'.repeat(64)
    };

    const evalResult = WebFootageTrustGate.evaluateCandidate(candidate, sanitized, 'industrial');
    assert.equal(evalResult.passed, false, 'Deve vetar tags da STOCK_TAG_BLACKLIST');
    assert(evalResult.rejectionReason?.includes('STOCK_AESTHETIC_REJECTED'));
  });

  await t.test('6. NASA and Wikimedia public domain licenses are approved', () => {
    const candidateNasa: WebFootageCandidate = {
      id: 'NASA_EARTH_001',
      provider: 'nasa',
      title: 'Earth from orbit satellite telemetry',
      downloadUrl: 'https://images-assets.nasa.gov/video/earth.mp4',
      license: 'NASA_Public_Domain',
      author: 'NASA Earth Observatory',
      width: 1920,
      height: 1080,
      durationSeconds: 8.0,
      tags: ['satellite', 'earth', 'space']
    };

    const sanitized: WebFootageSanitizeResult = {
      success: true,
      sanitizedPath: 'temp/clean.mp4',
      startFramePath: 'temp/start.png',
      durationSeconds: 6.0,
      width: 1920,
      height: 1080,
      fps: 24,
      hasAudio: false,
      rawSha256: '3'.repeat(64),
      sanitizedSha256: '4'.repeat(64)
    };

    const evalResult = WebFootageTrustGate.evaluateCandidate(candidateNasa, sanitized, 'cyber_telemetry', ['space', 'satellite']);
    assert.equal(evalResult.passed, true, 'NASA Public Domain deve ser aceito');
    assert.equal(evalResult.receipt?.provider, 'nasa');
    assert.equal(evalResult.receipt?.license, 'NASA_Public_Domain');
  });

  await t.test('7. Real FFmpeg sanitization produces zero audio, conformed 1080p and valid start frame', () => {
    const sampleVideo = path.join(process.cwd(), 'banco de videos', 'Car_crossing_neighborhood_street_202608281234.mp4');
    if (!fs.existsSync(sampleVideo)) {
      return; // Skip if sample file is not present
    }

    const testOutDir = path.join(process.cwd(), 'temp', 'test_sanitize');
    const testOutVideo = path.join(testOutDir, 'test_sanitized.mp4');

    const result = VideoSanitizer.sanitize(sampleVideo, testOutVideo, {
      targetWidth: 1920,
      targetHeight: 1080,
      targetFps: 24,
      targetDurationSeconds: 3.0,
      stripAudio: true
    });

    assert.equal(result.success, true, `Sanitização deve ter sucesso: ${result.error}`);
    assert.equal(result.hasAudio, false, 'Vídeo sanitizado DEVE ter exatamente zero canais de áudio');
    assert.equal(result.width, 1920, 'Largura deve ser 1920');
    assert.equal(result.height, 1080, 'Altura deve ser 1080');
    assert.equal(result.fps, 24, 'FPS deve ser 24');
    assert(result.durationSeconds > 0, 'Duração deve ser positiva');
    assert(fs.existsSync(result.startFramePath), 'Start frame PNG deve existir');
    assert(fs.statSync(result.startFramePath).size > 1000, 'Start frame deve ter tamanho válido');

    // Limpa arquivos de teste
    try {
      if (fs.existsSync(testOutVideo)) fs.unlinkSync(testOutVideo);
      if (fs.existsSync(result.startFramePath)) fs.unlinkSync(result.startFramePath);
    } catch {}
  });
});
