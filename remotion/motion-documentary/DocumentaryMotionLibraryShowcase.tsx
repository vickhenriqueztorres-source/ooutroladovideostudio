import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {DocumentaryMotionRecipeSchema} from '../../contracts/documentaryMotionContract';
import {DocumentaryMotionStage, DocumentaryOverlayDirector} from './DocumentaryOverlayDirector';

const source = 'Demonstracao da biblioteca Documentario de Campo Investigativo';
const trackedBinding = (point: {x: number; y: number}, durationSeconds: number) => ({
  mediaSha256: 'b'.repeat(64),
  trackingMethod: 'manual_keyframes' as const,
  confidence: 0.9,
  keyframes: [
    {atSeconds: 0, point},
    {atSeconds: durationSeconds, point: {x: point.x + 0.012, y: point.y + 0.006}},
  ],
});

const rawRecipes = [
  {id: 'field', type: 'field_marker', startSeconds: 0.4, durationSeconds: 2.2, zone: 'bottom_left', colorRole: 'evidence', anchor: {x: .63, y: .39}, binding: trackedBinding({x: .63, y: .39}, 2.2), label: 'Equipamento em operacao', detail: 'Materia observada'},
  {id: 'freeze', type: 'evidence_freeze', startSeconds: 3.2, durationSeconds: 1, zone: 'bottom_left', colorRole: 'evidence', anchor: {x: .62, y: .39}, binding: trackedBinding({x: .62, y: .39}, 1), label: 'Sensor identificado', source},
  {id: 'measure', type: 'measurement_bracket', startSeconds: 6.2, durationSeconds: 2.3, colorRole: 'neutral', from: {x: .35, y: .62}, to: {x: .72, y: .62}, value: '2,5 m', label: 'Faixa observada'},
  {id: 'counter', type: 'verified_counter', startSeconds: 9.2, durationSeconds: 2.4, zone: 'bottom_right', colorRole: 'telemetry', endValue: 28, decimals: 0, suffix: ' km/h', label: 'Velocidade medida', source, verifiedData: true},
  {id: 'caption', type: 'source_caption', startSeconds: 12.2, durationSeconds: 2.4, zone: 'bottom_left', text: 'Operacao registrada em campo', source},
  {id: 'chain', type: 'process_chain', startSeconds: 15.2, durationSeconds: 2.4, zone: 'bottom_center', colorRole: 'evidence', title: 'Ciclo operacional', steps: ['Mapear', 'Calcular', 'Aplicar'], activeStep: 1},
  {id: 'route', type: 'route_trace', startSeconds: 18.2, durationSeconds: 2.4, zone: 'top_left', colorRole: 'telemetry', points: [{x: .13, y: .72}, {x: .38, y: .52}, {x: .63, y: .44}, {x: .86, y: .31}], label: 'Rota medida', coordinates: '16.7676 S, 47.6131 W', source, verifiedData: true},
  {id: 'compare', type: 'comparison', startSeconds: 21.2, durationSeconds: 2.4, zone: 'bottom_center', colorRole: 'evidence', title: 'Tempo operacional', left: {label: 'Processo anterior', value: '12 min'}, right: {label: 'Operacao atual', value: '4 min'}, source},
  {id: 'document', type: 'document_highlight', startSeconds: 24.2, durationSeconds: 2.4, zone: 'center_right', colorRole: 'evidence', documentTitle: 'Relatorio operacional', excerpt: 'A altura deve permanecer dentro da faixa medida durante toda a aplicacao.', page: 'p. 14', source},
  {id: 'bars', type: 'data_bars', startSeconds: 27.2, durationSeconds: 2.4, zone: 'bottom_right', colorRole: 'evidence', title: 'Cobertura por passagem', unit: '%', items: [{label: 'Linha A', value: 82}, {label: 'Linha B', value: 94}, {label: 'Linha C', value: 88}], source},
  {id: 'timeline', type: 'timeline_marks', startSeconds: 30.2, durationSeconds: 2.4, zone: 'bottom_center', colorRole: 'evidence', title: 'Uma operacao', events: [{label: 'Decolagem', date: '00:00'}, {label: 'Mapeamento', date: '00:18'}, {label: 'Aplicacao', date: '00:42'}], activeIndex: 1, source},
  {id: 'location', type: 'location_stamp', startSeconds: 33.2, durationSeconds: 2.4, zone: 'top_left', colorRole: 'telemetry', place: 'Cristalina, GO', coordinates: '16.7676 S, 47.6131 W', context: 'Registro de campo', source, verifiedData: true},
  {id: 'area', type: 'area_outline', startSeconds: 36.2, durationSeconds: 2.4, zone: 'bottom_left', colorRole: 'evidence', points: [{x: .2, y: .3}, {x: .72, y: .27}, {x: .82, y: .72}, {x: .3, y: .78}], label: 'Area delimitada', value: '1 hectare', source},
  {id: 'risk', type: 'risk_marker', startSeconds: 39.2, durationSeconds: 2.4, zone: 'bottom_right', colorRole: 'risk', anchor: {x: .73, y: .28}, binding: trackedBinding({x: .73, y: .28}, 2.4), label: 'Ponto de risco', consequence: 'Obstaculo dentro da rota', source},
];

const recipes = rawRecipes.map((recipe) => DocumentaryMotionRecipeSchema.parse(recipe));

export const DOCUMENTARY_MOTION_SHOWCASE_FRAMES = 42 * 30;

export const DocumentaryMotionLibraryShowcase: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#060709'}}>
    <DocumentaryMotionStage recipes={recipes} fps={30}>
      <Img
        src={staticFile('identity/documentary-field-v4/observational-field.png')}
        style={{width: '100%', height: '100%', objectFit: 'cover'}}
      />
    </DocumentaryMotionStage>
    <DocumentaryOverlayDirector recipes={recipes} fps={30} />
  </AbsoluteFill>
);
