import assert from 'node:assert/strict';
import test from 'node:test';
import {buildMotionDesign, HslMotionTemplate, stripShotIntent} from '../hsl/motion/motionDesign';

const cases = [
  ['compare_routes', 'Five transport routes branch from a refinery: pipeline, ship, barge, railcar and truck', 'BRANCHING_ROUTES'],
  ['explain_contamination', 'Water droplets and particulate are separated from an otherwise clear fuel stream', 'PROCESS_CUTAWAY'],
  ['explain_inventory', 'Three tank levels labeled received, settling or control, and available for dispatch', 'CAPACITY_VS_AVAILABILITY'],
  ['show_parallel_turnaround', 'Fueling runs beside catering, baggage, boarding and technical checks on a shared turnaround clock', 'PARALLEL_TURNAROUND'],
  ['show_vehicle_constraint', 'Three aircraft calls compete for two refuelers with different travel distances', 'BOTTLENECK'],
  ['trace_propagation', 'Delay passes from fuel dispatch to aircraft service completion and departure readiness', 'DELAY_PROPAGATION'],
  ['explain_verification', 'A sample jar, batch record and transfer valve align as three verification layers', 'EVIDENCE_CARD'],
  ['explain_status_change', 'A green available batch turns amber and stops after a failed verification checkpoint', 'STATE_TRANSITION'],
  ['compare_systems', 'Hydrant and refueler routes share the same final aircraft connection', 'BEFORE_AFTER'],
  ['reverse_map', 'The complete map resets at refinery production and begins moving forward', 'FLOW_MAP']
] as const;

test('motion director maps documentary mechanisms to the ten Remotion 2.0 modules', () => {
  const templates = new Set<HslMotionTemplate>();
  for (const [narrativeFunction, visualSubject, expected] of cases) {
    const design = buildMotionDesign({narrativeFunction, visualSubject, variant: 'PROCESS'});
    templates.add(design.template);
    assert.equal(design.template, expected);
    assert.ok(design.headline.length > 8 && design.headline.length <= 72);
    assert.ok(design.stages.length >= 3 && design.stages.length <= 5);
    assert.ok(design.takeaway.length > 8);
    assert.deepEqual(design.beats.map((beat) => beat.role), ['QUESTION', 'MECHANISM', 'CHANGE', 'CONSEQUENCE']);
  }
  assert.equal(templates.size, 10);
});

test('shot intent boilerplate is removed before any text reaches the renderer', () => {
  const source = 'Fuel is checked - resolve into the stated consequence';
  assert.equal(stripShotIntent(source), 'Fuel is checked');
  const design = buildMotionDesign({narrativeFunction: 'explain_verification', visualSubject: source, variant: 'DETAIL'});
  const visible = [design.headline, design.takeaway, ...design.stages, ...design.beats.map((beat) => beat.text)].join(' ').toLowerCase();
  assert.doesNotMatch(visible, /establish the system context|isolate the active process|critical operational detail|stated consequence/);
});

test('shot variants change visual grammar without changing the underlying explanation', () => {
  const input = {narrativeFunction: 'explain_handoff', visualSubject: 'Custody moves across four operators'};
  const templates = (['ESTABLISH', 'PROCESS', 'DETAIL', 'CONSEQUENCE'] as const)
    .map((variant) => buildMotionDesign({...input, variant}).template);
  assert.deepEqual(templates, ['FLOW_MAP', 'FLOW_MAP', 'EVIDENCE_CARD', 'BEFORE_AFTER']);
});

test('narrative function wins when a propagation scene mentions its originating constraint', () => {
  const design = buildMotionDesign({
    narrativeFunction: 'trace_propagation',
    visualSubject: 'Delay passes from fuel dispatch to aircraft service completion and departure readiness',
    voiceover: 'The delay begins at one constrained point and then travels into the departure schedule.',
    variant: 'PROCESS'
  });
  assert.equal(design.template, 'DELAY_PROPAGATION');
});

test('agricultural drone mechanisms use field-specific evidence language', () => {
  const lidar = buildMotionDesign({
    narrativeFunction: 'explain_navigation',
    visualSubject: 'LiDAR measures the terrain profile under an agricultural drone',
    variant: 'PROCESS'
  });
  const downwash = buildMotionDesign({
    narrativeFunction: 'explain_downwash',
    visualSubject: 'Downwash carries microdroplets toward the underside of the leaf',
    variant: 'PROCESS'
  });
  assert.equal(lidar.template, 'FLOW_MAP');
  assert.equal(downwash.template, 'PROCESS_CUTAWAY');
  assert.doesNotMatch([lidar, downwash].flatMap((design) => [design.eyebrow, design.headline, ...design.stages]).join(' '), /HIDDEN SYSTEM|INPUT|CONTROL|OUTPUT/);
});

test('unknown subjects preserve factual language and templates use distinct cue timing', () => {
  const unknown = buildMotionDesign({narrativeFunction: 'observe', visualSubject: 'Valve, pressure gauge, outlet pipe', variant: 'PROCESS'});
  const route = buildMotionDesign({narrativeFunction: 'reverse_map', visualSubject: 'The complete map resets at refinery production and begins moving forward', variant: 'PROCESS'});
  assert.deepEqual(unknown.stages, ['Valve', 'pressure gauge', 'outlet pipe']);
  assert.doesNotMatch([unknown.eyebrow, ...unknown.stages].join(' '), /HIDDEN SYSTEM|INPUT|CONTROL|OUTPUT/);
  assert.notDeepEqual(unknown.beats.map((beat) => beat.at_percent), route.beats.map((beat) => beat.at_percent));
});
