import test from 'node:test';
import assert from 'node:assert';
import {
  ThumbnailCopyBrief,
  ThumbnailCopyVariant,
  ThumbnailPlan,
  computeBriefHash,
  computeTitleHash
} from '../packaging-agent/types/editorialContract';
import { PackagingValidators } from '../packaging-agent/validators/packagingValidators';
import { ThumbnailPlanner } from '../packaging-agent/planner/thumbnail-planner';
import { TitlePlanner } from '../packaging-agent/planner/title-planner';

test('Packaging V2 - validateHeadlineCopy aceita headlines concisas e bloqueia sensacionalismo', () => {
  // Caso Válido: 3 palavras concretas
  const resValid = PackagingValidators.validateHeadlineCopy('NÃO É PAPEL', ['100', 'algodao']);
  assert.strictEqual(resValid.valid, true);
  assert.strictEqual(resValid.blockers.length, 0);

  // Caso Inválido: > 5 palavras
  const resLong = PackagingValidators.validateHeadlineCopy('ESTA NOTA DE CEM REAIS NUNCA FOI PAPEL');
  assert.strictEqual(resLong.valid, false);
  assert.ok(resLong.blockers.some((b) => b.includes('HEADLINE_TOO_LONG')));

  // Caso Inválido: Termo sensacionalista proibido
  const resClickbait = PackagingValidators.validateHeadlineCopy('O SEGREDO PROIBIDO DO BANCO');
  assert.strictEqual(resClickbait.valid, false);
  assert.ok(resClickbait.blockers.some((b) => b.includes('HEADLINE_DISALLOWED_VOCABULARY')));

  // Caso Inválido: Pronome abstrato sem referente
  const resAbstract = PackagingValidators.validateHeadlineCopy('ISSO MUDA TUDO');
  assert.strictEqual(resAbstract.valid, false);
  assert.ok(resAbstract.blockers.some((b) => b.includes('HEADLINE_TOO_ABSTRACT')));

  // Caso Inválido: Número inventado/não aprovado
  const resFakeNum = PackagingValidators.validateHeadlineCopy('500 MIL NOTAS', ['80', '100']);
  assert.strictEqual(resFakeNum.valid, false);
  assert.ok(resFakeNum.blockers.some((b) => b.includes('FABRICATED_NUMBER')));
});

test('Packaging V2 - validateClaimSupport exige vínculo com claims do episódio', () => {
  const brief: ThumbnailCopyBrief = {
    episodeId: 'nota-100-reais',
    approvedTitle: 'A Física da Nota de 100',
    centralQuestion: 'Como a nota resiste à máquina de lavar?',
    thesis: 'Dinheiro é 100% algodão prensado sob 80 toneladas',
    objectOrFlow: 'Cédula de 100 Reais',
    system: 'Casa da Moeda do Brasil',
    targetAudience: 'Investigação',
    primaryClaimIds: ['CLAIM_COTTON', 'CLAIM_CALCOGRAPHY', 'CLAIM_MAGNETIC'],
    supportedEntities: ['BACEN', 'CMB'],
    approvedNumbers: ['80', '100'],
    visualEvidenceIds: ['EVID_01'],
    syntheticVisualsPresent: false,
    thumbnailFormat: 'XRAY_MECHANISM'
  };

  const validVariant: ThumbnailCopyVariant = {
    variantId: 'A',
    hypothesis: 'MECHANISM',
    format: 'XRAY_MECHANISM',
    visualConcept: 'Corte da nota com fibras de algodão',
    focalObject: 'Cédula de 100 em corte',
    focalRelationship: 'Fibras de algodão reveladas',
    headline: 'NÃO É PAPEL',
    headlineWords: ['NÃO', 'É', 'PAPEL'],
    headlineLength: 3,
    titleRelationship: 'COMPLEMENTARY',
    curiosityQuestion: 'De que matéria é feita a nota?',
    supportedClaimIds: ['CLAIM_COTTON'],
    disallowedElements: [],
    confidence: 0.95
  };

  const resValid = PackagingValidators.validateClaimSupport(validVariant, brief);
  assert.strictEqual(resValid.valid, true);

  const invalidVariant: ThumbnailCopyVariant = {
    ...validVariant,
    supportedClaimIds: ['CLAIM_UNKNOWN_FAKE']
  };
  const resInvalid = PackagingValidators.validateClaimSupport(invalidVariant, brief);
  assert.strictEqual(resInvalid.valid, false);
  assert.ok(resInvalid.blockers.some((b) => b.includes('HEADLINE_UNSUPPORTED')));
});

test('Packaging V2 - validateTitleThumbnailPair bloqueia duplicação literal (Regra 1 + 1 = 3)', () => {
  const brief: ThumbnailCopyBrief = {
    episodeId: 'nota-100-reais',
    approvedTitle: 'A FÍSICA DA NOTA DE 100 REAIS',
    centralQuestion: 'O que há por dentro da nota?',
    thesis: 'Física molecular e calcografia',
    objectOrFlow: 'Nota de 100',
    system: 'Casa da Moeda',
    targetAudience: 'Investigação',
    primaryClaimIds: ['CLAIM_01'],
    supportedEntities: [],
    approvedNumbers: ['100'],
    visualEvidenceIds: [],
    syntheticVisualsPresent: false,
    thumbnailFormat: 'XRAY_MECHANISM'
  };

  const duplicateVariant: ThumbnailCopyVariant = {
    variantId: 'A',
    hypothesis: 'MECHANISM',
    format: 'XRAY_MECHANISM',
    visualConcept: 'Visual da nota',
    focalObject: 'Nota de 100',
    focalRelationship: 'Relação física',
    headline: 'FÍSICA DA NOTA', // Repete quase todo o título
    headlineWords: ['FÍSICA', 'DA', 'NOTA'],
    headlineLength: 3,
    titleRelationship: 'COMPLEMENTARY',
    curiosityQuestion: 'Como funciona?',
    supportedClaimIds: ['CLAIM_01'],
    disallowedElements: [],
    confidence: 0.90
  };

  const resDup = PackagingValidators.validateTitleThumbnailPair(brief.approvedTitle, duplicateVariant, brief);
  assert.strictEqual(resDup.valid, false);
  assert.ok(resDup.blockers.some((b) => b.includes('TITLE_THUMBNAIL_DUPLICATION')));

  const complementaryVariant: ThumbnailCopyVariant = {
    ...duplicateVariant,
    headline: 'NÃO É PAPEL',
    headlineWords: ['NÃO', 'É', 'PAPEL']
  };

  const resComp = PackagingValidators.validateTitleThumbnailPair(brief.approvedTitle, complementaryVariant, brief);
  assert.strictEqual(resComp.valid, true);
  assert.strictEqual(resComp.relationship, 'COMPLEMENTARY');
});

test('Packaging V2 - ThumbnailPlanner gera 3 hipóteses distintas com validação de status', () => {
  const brief: ThumbnailCopyBrief = {
    episodeId: 'nota-100-reais',
    approvedTitle: 'A FÍSICA DA NOTA DE 100: O Que Nenhuma Impressora Consegue Clonar',
    centralQuestion: 'Por que impressoras não conseguem falsificar a cédula?',
    thesis: 'Calcografia e fibras de algodão nobre impedem falsificação',
    objectOrFlow: 'Cédula de 100 Reais',
    system: 'Casa da Moeda do Brasil',
    targetAudience: 'Documentários de Engenharia',
    primaryClaimIds: ['CLAIM_CURRENCY_COTTON', 'CLAIM_CURRENCY_REJECTION', 'CLAIM_CURRENCY_CALCOGRAPHY'],
    supportedEntities: ['Casa da Moeda', 'Banco Central'],
    approvedNumbers: ['80', '100', '1'],
    visualEvidenceIds: ['EVID_01'],
    syntheticVisualsPresent: false,
    thumbnailFormat: 'XRAY_MECHANISM'
  };

  const planner = new ThumbnailPlanner();
  const plan = planner.planEditorial(brief);

  assert.strictEqual(plan.variants.length, 3);
  assert.strictEqual(plan.variants[0].hypothesis, 'MECHANISM');
  assert.strictEqual(plan.variants[1].hypothesis, 'RISK');
  assert.strictEqual(plan.variants[2].hypothesis, 'SCALE');

  assert.strictEqual(plan.status, 'VALIDATED');
  assert.strictEqual(plan.blockers.length, 0);
  assert.ok(plan.copyBriefHash.length > 0);
  assert.ok(plan.titleHash.length > 0);
});

test('Packaging V2 - TitlePlanner gera títulos pareados com as 3 variantes', () => {
  const titlePlanner = new TitlePlanner();
  const titles = titlePlanner.plan({
    objectOrFlow: 'Cédula de 100 Reais',
    systemBeingAnalyzed: 'Casa da Moeda do Brasil',
    centralQuestion: 'Como funciona a segurança física do dinheiro?',
    primaryConsequence: 'Destruição imediata no sensor de 850nm'
  });

  assert.strictEqual(titles.length, 3);
  assert.strictEqual(titles[0].variant_id, 'A');
  assert.strictEqual(titles[1].variant_id, 'B');
  assert.strictEqual(titles[2].variant_id, 'C');

  for (const t of titles) {
    assert.ok(t.title.length > 20, 'Título tem substância documental');
    assert.ok(t.desire_driver.length > 10, 'Tem gatilho psicológico mapeado');
  }
});
