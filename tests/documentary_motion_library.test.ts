import assert from 'node:assert/strict';
import {
  DOCUMENTARY_MOTION_TYPES,
  DocumentaryMotionRecipeListSchema,
  DocumentaryMotionRecipeSchema,
} from '../contracts/documentaryMotionContract';
import {parseAndCalculateTimeline} from '../contracts/timelineContract';
import {remapFrameForEvidenceFreeze} from '../remotion/motion-documentary';
import {DOCUMENTARY_MOTION_TOKENS} from '../remotion/motion-documentary/tokens';

const source = 'Relatorio tecnico verificado, 2026';
const trackedBinding = (point: {x: number; y: number}, durationSeconds: number) => ({
  mediaSha256: 'a'.repeat(64),
  trackingMethod: 'manual_keyframes' as const,
  confidence: 0.92,
  keyframes: [
    {atSeconds: 0, point},
    {atSeconds: durationSeconds, point: {x: Math.min(1, point.x + 0.015), y: Math.min(1, point.y + 0.008)}},
  ],
});

const validRecipes = [
  {id: 'm1', type: 'field_marker', startSeconds: 0, durationSeconds: 2, anchor: {x: .4, y: .5}, binding: trackedBinding({x: .4, y: .5}, 2), label: 'Sensor real'},
  {id: 'm2', type: 'evidence_freeze', startSeconds: 2, durationSeconds: 1, anchor: {x: .5, y: .5}, binding: trackedBinding({x: .5, y: .5}, 1), label: 'Evidencia', source},
  {id: 'm3', type: 'measurement_bracket', startSeconds: 3, durationSeconds: 2, from: {x: .2, y: .5}, to: {x: .8, y: .5}, value: '2,5 m'},
  {id: 'm4', type: 'verified_counter', startSeconds: 5, durationSeconds: 2, endValue: 28, suffix: ' km/h', label: 'Velocidade', source, verifiedData: true},
  {id: 'm5', type: 'source_caption', startSeconds: 7, durationSeconds: 2, text: 'Registro de campo', source},
  {id: 'm6', type: 'process_chain', startSeconds: 9, durationSeconds: 2, steps: ['Mapear', 'Calcular', 'Aplicar'], activeStep: 1},
  {id: 'm7', type: 'route_trace', startSeconds: 11, durationSeconds: 2, points: [{x: .1, y: .7}, {x: .5, y: .4}, {x: .9, y: .6}], label: 'Rota observada', source},
  {id: 'm8', type: 'comparison', startSeconds: 13, durationSeconds: 2, left: {label: 'Antes', value: '12 min'}, right: {label: 'Depois', value: '4 min'}, source},
  {id: 'm9', type: 'document_highlight', startSeconds: 15, durationSeconds: 2, documentTitle: 'Manual', excerpt: 'Trecho exato verificado.', source},
  {id: 'm10', type: 'data_bars', startSeconds: 17, durationSeconds: 2, title: 'Comparacao', items: [{label: 'A', value: 10}, {label: 'B', value: 20}], source},
  {id: 'm11', type: 'timeline_marks', startSeconds: 19, durationSeconds: 2, events: [{label: 'Inicio', date: '00:00'}, {label: 'Fim', date: '00:12'}], activeIndex: 1, source},
  {id: 'm12', type: 'location_stamp', startSeconds: 21, durationSeconds: 2, place: 'Cristalina, GO', coordinates: '16.7676 S, 47.6131 W', source, colorRole: 'telemetry', verifiedData: true},
  {id: 'm13', type: 'area_outline', startSeconds: 23, durationSeconds: 2, points: [{x: .2, y: .2}, {x: .8, y: .2}, {x: .7, y: .8}], label: 'Area medida', source},
  {id: 'm14', type: 'risk_marker', startSeconds: 25, durationSeconds: 2, anchor: {x: .7, y: .3}, binding: trackedBinding({x: .7, y: .3}, 2), label: 'Fio de alta tensao', source, colorRole: 'risk'},
] as const;

function baseTimeline(sceneOverride: Record<string, unknown> = {}) {
  return {
    episodeId: 'motion-library-test',
    fps: 30,
    coldOpen: {sceneIds: ['SC_01', 'SC_02']},
    actBreaks: [2, 4],
    scenes: [
      {id: 'SC_01', component: 'DynamicDocumentaryMedia', durationSeconds: 8, ...sceneOverride},
      {id: 'SC_02', component: 'DynamicDocumentaryMedia', durationSeconds: 8},
      {id: 'SC_03', component: 'TechnicalCutawaySchematic', durationSeconds: 5, props: {systemTitle: 'Sistema', compartmentName: 'Componente'}},
      {id: 'SC_04', component: 'FlowDiscrepancyHUD', durationSeconds: 11, props: {card1Title: 'Medicao'}},
      {id: 'SC_05', component: 'AtomicStopwatch', durationSeconds: 7, props: {label: 'Tempo'}},
      {id: 'SC_06', component: 'DynamicDocumentaryMedia', durationSeconds: 6},
    ],
  };
}

function documentaryV4Timeline() {
  const timeline = baseTimeline();
  return {
    ...timeline,
    motionLanguage: 'documentary-field-v4',
    scenes: timeline.scenes.map((scene, index) => ({
      ...scene,
      camera: 'static',
      transition: 'cut',
      mediaFile: `episodes/test/takes/SC_0${index + 1}.mp4`,
    })),
  };
}

assert.equal(DOCUMENTARY_MOTION_TYPES.length, 14);
const parsed = validRecipes.map((recipe) => DocumentaryMotionRecipeSchema.parse(recipe));
assert.deepEqual(parsed.map((recipe) => recipe.type), [...DOCUMENTARY_MOTION_TYPES]);
assert.equal(DOCUMENTARY_MOTION_TOKENS.maxTextFrameRatio, 0.12);

assert.throws(
  () => DocumentaryMotionRecipeSchema.parse({id: 'bad', type: 'evidence_freeze', startSeconds: 0, durationSeconds: 2, anchor: {x: .5, y: .5}, binding: trackedBinding({x: .5, y: .5}, 1.2), label: 'Longo', source}),
  /(?:less than or equal to|<=)\s*1\.2/
);
assert.throws(
  () => DocumentaryMotionRecipeSchema.parse({id: 'bad-cyan', type: 'location_stamp', startSeconds: 0, durationSeconds: 2, place: 'Local', coordinates: '0,0', source, colorRole: 'telemetry'}),
  /MOTION_TELEMETRY_NOT_VERIFIED/
);
assert.throws(
  () => DocumentaryMotionRecipeSchema.parse({id: 'bad-source', type: 'data_bars', startSeconds: 0, durationSeconds: 2, title: 'Dados', items: [{label: 'A', value: 1}, {label: 'B', value: 2}]}),
  /MOTION_SOURCE_REQUIRED/
);
assert.equal(DocumentaryMotionRecipeListSchema.parse(validRecipes.slice(0, 12)).length, 12);

const freezeRecipe = DocumentaryMotionRecipeSchema.parse(validRecipes[1]);
assert.equal(remapFrameForEvidenceFreeze(30, [freezeRecipe], 30), 30);
assert.equal(remapFrameForEvidenceFreeze(65, [freezeRecipe], 30), 60);
assert.equal(remapFrameForEvidenceFreeze(95, [freezeRecipe], 30), 65);

const validTimeline = parseAndCalculateTimeline(baseTimeline({
  motionRecipes: [{
    id: 'field', type: 'field_marker', startSeconds: 4.2, durationSeconds: 2,
    anchor: {x: .55, y: .44}, binding: trackedBinding({x: .55, y: .44}, 2), label: 'Sensor', source,
  }],
}));
assert.equal(validTimeline.scenes[0].motionRecipes?.length, 1);

assert.throws(
  () => parseAndCalculateTimeline(baseTimeline({
    motionRecipes: [{id: 'outside', type: 'field_marker', startSeconds: 7, durationSeconds: 2, anchor: {x: .5, y: .5}, binding: trackedBinding({x: .5, y: .5}, 2), label: 'Fora'}],
  })),
  /TIMELINE_MOTION_OUTSIDE_SCENE/
);
assert.throws(
  () => parseAndCalculateTimeline(baseTimeline({
    motionRecipes: [
      {id: 'a', type: 'field_marker', startSeconds: 1, durationSeconds: 2, anchor: {x: .5, y: .5}, binding: trackedBinding({x: .5, y: .5}, 2), label: 'A'},
      {id: 'b', type: 'field_marker', startSeconds: 2, durationSeconds: 2, anchor: {x: .6, y: .5}, binding: trackedBinding({x: .6, y: .5}, 2), label: 'B'},
    ],
  })),
  /TIMELINE_MOTION_COLLISION/
);
assert.throws(
  () => parseAndCalculateTimeline(baseTimeline({
    callout: {categoryText: 'CAMPO', mainText: 'OPERACAO', subText: 'Registro'},
    motionRecipes: [{id: 'callout-hit', type: 'field_marker', startSeconds: 1, durationSeconds: 2, anchor: {x: .5, y: .5}, binding: trackedBinding({x: .5, y: .5}, 2), label: 'A'}],
  })),
  /TIMELINE_MOTION_CALLOUT_COLLISION/
);

assert.doesNotThrow(() => parseAndCalculateTimeline(documentaryV4Timeline()));
assert.throws(
  () => parseAndCalculateTimeline({
    ...documentaryV4Timeline(),
    scenes: documentaryV4Timeline().scenes.map((scene, index) => ({
      ...scene,
      callout: index < 2 ? {categoryText: 'CAMPO', mainText: `EVIDENCIA ${index + 1}`, subText: 'REGISTRO TEMPORAL'} : undefined,
    })),
  }),
  /MOTION_CALLOUT_OVERUSE/
);
assert.throws(
  () => parseAndCalculateTimeline({
    ...documentaryV4Timeline(),
    scenes: documentaryV4Timeline().scenes.map((scene) => ({...scene, mediaFile: 'episodes/test/takes/repeated.mp4'})),
  }),
  /MOTION_MEDIA_REPETITION/
);
assert.throws(
  () => parseAndCalculateTimeline({
    ...documentaryV4Timeline(),
    scenes: documentaryV4Timeline().scenes.map((scene, index) => ({...scene, transition: index < 3 ? 'crossfade' : 'cut'})),
  }),
  /MOTION_CROSSFADE_OVERUSE/
);
assert.throws(
  () => parseAndCalculateTimeline({
    ...documentaryV4Timeline(),
    scenes: documentaryV4Timeline().scenes.map((scene, index) => index === 0 ? {...scene, camera: 'pushIn'} : scene),
  }),
  /MOTION_SYNTHETIC_CAMERA_FORBIDDEN/
);
assert.throws(
  () => parseAndCalculateTimeline({
    ...documentaryV4Timeline(),
    scenes: documentaryV4Timeline().scenes.map((scene, index) => index === 0 ? {
      ...scene,
      mediaSha256: 'b'.repeat(64),
      motionRecipes: [{
        id: 'tracked', type: 'field_marker', startSeconds: 3, durationSeconds: 2,
        anchor: {x: .5, y: .5}, binding: trackedBinding({x: .5, y: .5}, 2), label: 'Objeto',
      }],
    } : scene),
  }),
  /TIMELINE_MOTION_MEDIA_HASH_MISMATCH/
);

console.log('documentary_motion_library.test.ts: PASS (14 recipes, tracking, timing and documentary-v4 quality gates)');
