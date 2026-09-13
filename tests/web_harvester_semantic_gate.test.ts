import test from 'node:test';
import assert from 'node:assert/strict';
import { WebFootageHarvesterAgent } from '../hsl/media/agents/webFootageHarvesterAgent';
import { WebFootageTrustGate, OFF_TOPIC_BLACKLIST } from '../hsl/media/harvester/webFootageTrustGate';
import { WebFootageCandidate, WebFootageSanitizeResult } from '../hsl/media/harvester/webFootageTypes';

test('Web Footage Semantic Gate & Subject-First Query Suite', async (t) => {
  const harvester = new WebFootageHarvesterAgent();

  const dummySanitized: WebFootageSanitizeResult = {
    success: true,
    sanitizedPath: 'temp/clean.mp4',
    startFramePath: 'temp/start.png',
    durationSeconds: 5.0,
    width: 1920,
    height: 1080,
    fps: 24,
    hasAudio: false,
    rawSha256: 'a'.repeat(64),
    sanitizedSha256: 'b'.repeat(64)
  };

  await t.test('1. Subject-First Query Generation prioritizes concrete hardware over architecture', () => {
    // Caso de estudo real: Gabinete presidencial com telefone criptografado
    const terms = harvester.buildSearchTerms(
      'Mesa de madeira no Palácio do Planalto com telefone criptografado',
      ['telefone', 'palacio'],
      ['comunicacao_governamental']
    );

    assert(terms.length > 0, 'Deve gerar termos de busca');
    // O primeiro termo DEVE ser o sujeito físico (telefone/mesa), NUNCA "presidential palace architecture"
    const firstTerm = terms[0].toLowerCase();
    assert(
      firstTerm.includes('telephone') || firstTerm.includes('handset'),
      `Primeiro termo deve focar no hardware principal (esperado telephone/handset, obtido: "${firstTerm}")`
    );

    // Garante que termos genéricos de arquitetura não aparecem como queries vazias/isoladas
    for (const q of terms) {
      assert.notEqual(q, 'presidential palace architecture', 'Não deve gerar query genérica isolada de palácio');
      assert.notEqual(q, 'government architecture building', 'Não deve gerar query genérica de arquitetura');
    }
  });

  await t.test('2. TrustGate strictly rejects Kazan Mosque drone footage for presidential secure line', () => {
    // Candidato idêntico ao que foi baixado indevidamente pelo pipeline anterior
    const mosqueCandidate: WebFootageCandidate = {
      id: 'COMMONS_84808136',
      provider: 'wikimedia',
      title: 'Drone Kremlin Kazan - Qolsharif Mosque - DJI Inspire 1 Drone (Казань)',
      downloadUrl: 'https://upload.wikimedia.org/example.webm',
      license: 'Public_Domain',
      author: 'Drone Addicts',
      width: 1920,
      height: 1080,
      durationSeconds: 5.0,
      tags: ['presidential palace architecture', 'wikimedia_commons', 'open_archive']
    };

    const evalResult = WebFootageTrustGate.evaluateCandidate(
      mosqueCandidate,
      dummySanitized,
      'presidential_terminal_desk',
      ['presidential_terminal_desk'],
      ['telefone', 'palacio'],
      'Mesa de madeira no Palácio do Planalto com telefone criptografado'
    );

    assert.equal(evalResult.passed, false, 'Kazan Mosque DEVE ser rejeitado para cena de telefone presidencial');
    assert(
      evalResult.rejectionReason?.includes('OFF_TOPIC_DOMAIN_REJECTED') ||
      evalResult.rejectionReason?.includes('SEMANTIC_RELEVANCE_FAILED'),
      `Motivo de rejeição deve ser semântico ou domínio proibido: ${evalResult.rejectionReason}`
    );
  });

  await t.test('3. TrustGate approves authentic telephone hardware video candidate', () => {
    const phoneCandidate: WebFootageCandidate = {
      id: 'PEXELS_PHONE_001',
      provider: 'pexels',
      title: 'Telephone handset on wooden office desk',
      downloadUrl: 'https://example.com/phone.mp4',
      license: 'Pexels_Free',
      author: 'Cinematographer',
      width: 1920,
      height: 1080,
      durationSeconds: 5.0,
      tags: ['telephone', 'phone', 'desk', 'office']
    };

    const evalResult = WebFootageTrustGate.evaluateCandidate(
      phoneCandidate,
      dummySanitized,
      'presidential_terminal_desk',
      ['presidential_terminal_desk'],
      ['telefone', 'mesa'],
      'Mesa de madeira no Palácio do Planalto com telefone criptografado'
    );

    assert.equal(evalResult.passed, true, 'Vídeo de telefone real em mesa deve ser aprovado');
    assert(evalResult.receipt?.semanticScore && evalResult.receipt.semanticScore >= 0.75,
      `Score semântico deve ser >= 0.75 (obtido: ${evalResult.receipt?.semanticScore})`);
  });

  await t.test('4. TrustGate enforces visual_must_not contract rules', () => {
    const candidate: WebFootageCandidate = {
      id: 'PEXELS_WAREHOUSE_001',
      provider: 'pexels',
      title: 'Industrial warehouse conveyor belt logistics',
      downloadUrl: 'https://example.com/conveyor.mp4',
      license: 'Pexels_Free',
      width: 1920,
      height: 1080,
      durationSeconds: 4.0,
      tags: ['warehouse', 'conveyor belt']
    };

    const evalResult = WebFootageTrustGate.evaluateCandidate(
      candidate,
      dummySanitized,
      'fuel_system_subsystem',
      ['fuel'],
      ['nozzle', 'meter'],
      'Bico abastecedor',
      ['conveyor belt', 'warehouse'] // visual_must_not proíbe esteira de armazém
    );

    assert.equal(evalResult.passed, false, 'Deve rejeitar candidato contendo visual_must_not');
    assert(evalResult.rejectionReason?.includes('VISUAL_MUST_NOT_VIOLATION'));
  });

  await t.test('5. OFF_TOPIC_BLACKLIST covers tourist, religious, resort and lifestyle terms without false positives', () => {
    assert(OFF_TOPIC_BLACKLIST.includes('mosque'), 'Deve incluir mosque');
    assert(OFF_TOPIC_BLACKLIST.includes('church'), 'Deve incluir church');
    assert(OFF_TOPIC_BLACKLIST.includes('resort'), 'Deve incluir resort');
    assert(OFF_TOPIC_BLACKLIST.includes('vacation'), 'Deve incluir vacation');

    // Verifica que 'space' (satélite) não sofre colisão falsa com 'spa'
    const spaceCandidate: WebFootageCandidate = {
      id: 'NASA_SAT_001',
      provider: 'nasa',
      title: 'Satellite orbiting planet earth in deep space telemetry',
      downloadUrl: 'https://example.com/sat.mp4',
      license: 'NASA_Public_Domain',
      width: 1920,
      height: 1080,
      durationSeconds: 6.0,
      tags: ['satellite', 'earth', 'orbit', 'space']
    };

    const evalResult = WebFootageTrustGate.evaluateCandidate(
      spaceCandidate,
      dummySanitized,
      'cyber_telemetry',
      ['space', 'satellite'],
      ['satelite', 'antena'],
      'Antena rastreando satélite no espaço'
    );

    assert.equal(evalResult.passed, true, 'Space/satellite não pode ser confundido com spa de resort');
  });
});
