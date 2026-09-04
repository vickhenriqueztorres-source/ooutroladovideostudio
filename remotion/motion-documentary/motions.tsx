import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {
  DocumentaryMotionRecipe,
  DocumentaryMotionZone,
  NormalizedPoint,
} from '../../contracts/documentaryMotionContract';
import {
  drawProgress,
  formatDocumentaryNumber,
  LeaderLine,
  MarkerRing,
  motionEnvelope,
  MotionLabel,
  MotionPanel,
  OverlaySvg,
  polylinePath,
  px,
  SourceLine,
  trackedPoint,
} from './primitives';
import {colorForRole, DOCUMENTARY_MOTION_TOKENS, zoneStyle} from './tokens';

type RecipeOf<T extends DocumentaryMotionRecipe['type']> = Extract<DocumentaryMotionRecipe, {type: T}>;
type MotionProps<T extends DocumentaryMotionRecipe['type']> = {
  recipe: RecipeOf<T>;
  durationInFrames: number;
};

function labelAnchor(zone: DocumentaryMotionZone): NormalizedPoint {
  const x = zone.includes('left') ? 0.28 : zone.includes('right') ? 0.72 : 0.5;
  const y = zone.includes('top') ? 0.16 : zone.includes('bottom') ? 0.84 : 0.5;
  return {x, y};
}

export const FieldMarkerMotion: React.FC<MotionProps<'field_marker'>> = ({recipe, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opacity = motionEnvelope(frame, durationInFrames);
  const progress = drawProgress(frame, durationInFrames);
  const target = labelAnchor(recipe.zone);
  const anchor = trackedPoint(recipe.binding, recipe.anchor, frame, fps);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity}}>
      <OverlaySvg>
        <MarkerRing point={anchor} progress={progress} role={recipe.colorRole} />
        <LeaderLine from={anchor} to={target} progress={progress} role={recipe.colorRole} />
      </OverlaySvg>
      <div style={zoneStyle(recipe.zone)}>
        <MotionPanel opacity={opacity} role={recipe.colorRole} compact>
          <MotionLabel label={recipe.label} detail={recipe.detail} role={recipe.colorRole} />
          <SourceLine source={recipe.source} />
        </MotionPanel>
      </div>
    </AbsoluteFill>
  );
};

export const EvidenceFreezeMotion: React.FC<MotionProps<'evidence_freeze'>> = ({recipe, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opacity = motionEnvelope(frame, durationInFrames);
  const progress = drawProgress(frame, durationInFrames);
  const target = labelAnchor(recipe.zone);
  const anchor = trackedPoint(recipe.binding, recipe.anchor, frame, fps);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity, border: `2px solid rgba(244,244,240,${opacity * 0.36})`, boxSizing: 'border-box'}}>
      <OverlaySvg>
        <MarkerRing point={anchor} progress={progress} role="evidence" radius={24} />
        <LeaderLine from={anchor} to={target} progress={progress} role="evidence" />
      </OverlaySvg>
      <div style={zoneStyle(recipe.zone)}>
        <MotionPanel opacity={opacity} role="evidence" compact>
          <div style={{fontFamily: DOCUMENTARY_MOTION_TOKENS.typography.mono, fontSize: 13, color: DOCUMENTARY_MOTION_TOKENS.colors.evidence, marginBottom: 6, letterSpacing: 0}}>
            EVIDENCIA OBSERVADA
          </div>
          <MotionLabel label={recipe.label} />
          <SourceLine source={recipe.source} />
        </MotionPanel>
      </div>
    </AbsoluteFill>
  );
};

export const MeasurementBracketMotion: React.FC<MotionProps<'measurement_bracket'>> = ({recipe, durationInFrames}) => {
  const frame = useCurrentFrame();
  const opacity = motionEnvelope(frame, durationInFrames);
  const progress = drawProgress(frame, durationInFrames);
  const a = px(recipe.from);
  const b = px(recipe.to);
  const mid = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
  const color = colorForRole(recipe.colorRole);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity}}>
      <OverlaySvg>
        <LeaderLine from={recipe.from} to={recipe.to} progress={progress} role={recipe.colorRole} />
        <line x1={a.x} y1={a.y - 12} x2={a.x} y2={a.y + 12} stroke={color} strokeWidth={2} opacity={progress} />
        <line x1={b.x} y1={b.y - 12} x2={b.x} y2={b.y + 12} stroke={color} strokeWidth={2} opacity={progress} />
        <rect x={mid.x - 92} y={mid.y - 54} width={184} height={42} rx={3} fill="rgba(6,7,9,0.68)" opacity={opacity} />
        <text x={mid.x} y={mid.y - 26} textAnchor="middle" fill={DOCUMENTARY_MOTION_TOKENS.colors.white} fontFamily={DOCUMENTARY_MOTION_TOKENS.typography.mono} fontSize={24} fontWeight={700}>
          {recipe.value}
        </text>
        {recipe.label ? (
          <text x={mid.x} y={mid.y + 34} textAnchor="middle" fill={DOCUMENTARY_MOTION_TOKENS.colors.muted} fontFamily={DOCUMENTARY_MOTION_TOKENS.typography.editorial} fontSize={18}>
            {recipe.label}
          </text>
        ) : null}
      </OverlaySvg>
    </AbsoluteFill>
  );
};

export const VerifiedCounterMotion: React.FC<MotionProps<'verified_counter'>> = ({recipe, durationInFrames}) => {
  const frame = useCurrentFrame();
  const opacity = motionEnvelope(frame, durationInFrames);
  const progress = interpolate(frame, [0, Math.max(1, durationInFrames * 0.55)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const value = recipe.startValue + (recipe.endValue - recipe.startValue) * progress;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={zoneStyle(recipe.zone)}>
        <MotionPanel opacity={opacity} role={recipe.colorRole} compact>
          <div style={{fontSize: 16, color: DOCUMENTARY_MOTION_TOKENS.colors.muted, marginBottom: 4, letterSpacing: 0}}>{recipe.label}</div>
          <div style={{fontFamily: DOCUMENTARY_MOTION_TOKENS.typography.mono, fontSize: DOCUMENTARY_MOTION_TOKENS.typography.value, fontWeight: 700, color: colorForRole(recipe.colorRole), letterSpacing: 0, fontVariantNumeric: 'tabular-nums'}}>
            {recipe.prefix || ''}{formatDocumentaryNumber(value, recipe.decimals)}{recipe.suffix || ''}
          </div>
          <SourceLine source={recipe.source} />
        </MotionPanel>
      </div>
    </AbsoluteFill>
  );
};

export const SourceCaptionMotion: React.FC<MotionProps<'source_caption'>> = ({recipe, durationInFrames}) => {
  const frame = useCurrentFrame();
  const opacity = motionEnvelope(frame, durationInFrames);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={zoneStyle(recipe.zone, 520)}>
        <MotionPanel opacity={opacity} compact width={520}>
          <MotionLabel label={recipe.text} />
          <SourceLine source={recipe.source} />
        </MotionPanel>
      </div>
    </AbsoluteFill>
  );
};

export const ProcessChainMotion: React.FC<MotionProps<'process_chain'>> = ({recipe, durationInFrames}) => {
  const frame = useCurrentFrame();
  const opacity = motionEnvelope(frame, durationInFrames);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={zoneStyle(recipe.zone, 720)}>
        <MotionPanel opacity={opacity} width={720} compact>
          {recipe.title ? <div style={{fontSize: 18, fontWeight: 700, marginBottom: 12, letterSpacing: 0}}>{recipe.title}</div> : null}
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            {recipe.steps.map((step, index) => (
              <React.Fragment key={`${recipe.id}_${step}`}>
                <div style={{flex: 1, minWidth: 0, color: index === recipe.activeStep ? colorForRole(recipe.colorRole) : DOCUMENTARY_MOTION_TOKENS.colors.muted, fontFamily: DOCUMENTARY_MOTION_TOKENS.typography.mono, fontSize: 15, fontWeight: index === recipe.activeStep ? 700 : 400, letterSpacing: 0, overflowWrap: 'anywhere'}}>
                  {String(index + 1).padStart(2, '0')} {step}
                </div>
                {index < recipe.steps.length - 1 ? <div style={{width: 22, height: 1, background: DOCUMENTARY_MOTION_TOKENS.colors.line}} /> : null}
              </React.Fragment>
            ))}
          </div>
        </MotionPanel>
      </div>
    </AbsoluteFill>
  );
};

export const RouteTraceMotion: React.FC<MotionProps<'route_trace'>> = ({recipe, durationInFrames}) => {
  const frame = useCurrentFrame();
  const opacity = motionEnvelope(frame, durationInFrames);
  const progress = drawProgress(frame, durationInFrames);
  const color = colorForRole(recipe.colorRole);
  const last = recipe.points[recipe.points.length - 1];
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity}}>
      <OverlaySvg>
        <path d={polylinePath(recipe.points)} pathLength={1} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={1} strokeDashoffset={1 - progress} />
        {recipe.points.map((point, index) => {
          const p = px(point);
          const visible = progress >= index / Math.max(1, recipe.points.length - 1);
          return <circle key={`${recipe.id}_${index}`} cx={p.x} cy={p.y} r={index === 0 || point === last ? 7 : 4} fill={visible ? color : 'transparent'} />;
        })}
      </OverlaySvg>
      {recipe.label || recipe.coordinates ? (
        <div style={zoneStyle(recipe.zone)}>
          <MotionPanel opacity={opacity} role={recipe.colorRole} compact>
            {recipe.label ? <MotionLabel label={recipe.label} detail={recipe.coordinates} role={recipe.colorRole} /> : null}
            <SourceLine source={recipe.source} />
          </MotionPanel>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const ComparisonMotion: React.FC<MotionProps<'comparison'>> = ({recipe, durationInFrames}) => {
  const frame = useCurrentFrame();
  const opacity = motionEnvelope(frame, durationInFrames);
  const side = (data: typeof recipe.left, active: boolean) => (
    <div style={{flex: 1, minWidth: 0}}>
      <div style={{fontSize: 16, color: DOCUMENTARY_MOTION_TOKENS.colors.muted, letterSpacing: 0}}>{data.label}</div>
      <div style={{fontFamily: DOCUMENTARY_MOTION_TOKENS.typography.mono, fontSize: 34, fontWeight: 700, color: active ? colorForRole(recipe.colorRole) : DOCUMENTARY_MOTION_TOKENS.colors.white, marginTop: 4, letterSpacing: 0}}>{data.value}</div>
      {data.detail ? <div style={{fontSize: 15, color: DOCUMENTARY_MOTION_TOKENS.colors.muted, marginTop: 4, letterSpacing: 0}}>{data.detail}</div> : null}
    </div>
  );
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={zoneStyle(recipe.zone, 650)}>
        <MotionPanel opacity={opacity} role={recipe.colorRole} width={650}>
          {recipe.title ? <div style={{fontSize: 18, fontWeight: 700, marginBottom: 12, letterSpacing: 0}}>{recipe.title}</div> : null}
          <div style={{display: 'flex', gap: 22, alignItems: 'stretch'}}>
            {side(recipe.left, false)}
            <div style={{width: 1, background: DOCUMENTARY_MOTION_TOKENS.colors.line}} />
            {side(recipe.right, true)}
          </div>
          <SourceLine source={recipe.source} />
        </MotionPanel>
      </div>
    </AbsoluteFill>
  );
};

export const DocumentHighlightMotion: React.FC<MotionProps<'document_highlight'>> = ({recipe, durationInFrames}) => {
  const frame = useCurrentFrame();
  const opacity = motionEnvelope(frame, durationInFrames);
  const highlight = interpolate(frame, [4, Math.min(18, durationInFrames / 2)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={zoneStyle(recipe.zone, 560)}>
        <MotionPanel opacity={opacity} role="evidence" width={560}>
          <div style={{display: 'flex', justifyContent: 'space-between', gap: 16, fontFamily: DOCUMENTARY_MOTION_TOKENS.typography.mono, fontSize: 14, color: DOCUMENTARY_MOTION_TOKENS.colors.muted, letterSpacing: 0}}>
            <span>{recipe.documentTitle}</span><span>{recipe.page || ''}</span>
          </div>
          <div style={{position: 'relative', marginTop: 13, padding: '10px 12px', fontSize: 20, lineHeight: 1.4, color: DOCUMENTARY_MOTION_TOKENS.colors.white, letterSpacing: 0}}>
            <div style={{position: 'absolute', inset: 0, background: `rgba(255,85,0,${0.12 * highlight})`, borderLeft: `3px solid ${DOCUMENTARY_MOTION_TOKENS.colors.evidence}`, transform: `scaleX(${highlight})`, transformOrigin: 'left center'}} />
            <span style={{position: 'relative'}}>{recipe.excerpt}</span>
          </div>
          <SourceLine source={recipe.source} />
        </MotionPanel>
      </div>
    </AbsoluteFill>
  );
};

export const DataBarsMotion: React.FC<MotionProps<'data_bars'>> = ({recipe, durationInFrames}) => {
  const frame = useCurrentFrame();
  const opacity = motionEnvelope(frame, durationInFrames);
  const progress = drawProgress(frame, durationInFrames);
  const maximum = Math.max(1, ...recipe.items.map((item) => item.value));
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={zoneStyle(recipe.zone, 500)}>
        <MotionPanel opacity={opacity} role={recipe.colorRole} width={500}>
          <div style={{fontSize: 19, fontWeight: 700, marginBottom: 13, letterSpacing: 0}}>{recipe.title}</div>
          {recipe.items.map((item) => (
            <div key={`${recipe.id}_${item.label}`} style={{display: 'grid', gridTemplateColumns: '120px 1fr 74px', alignItems: 'center', gap: 10, marginTop: 8}}>
              <div style={{fontSize: 15, color: DOCUMENTARY_MOTION_TOKENS.colors.muted, overflowWrap: 'anywhere', letterSpacing: 0}}>{item.label}</div>
              <div style={{height: 8, background: 'rgba(244,244,240,0.16)'}}>
                <div style={{height: '100%', width: `${(item.value / maximum) * progress * 100}%`, background: colorForRole(recipe.colorRole)}} />
              </div>
              <div style={{fontFamily: DOCUMENTARY_MOTION_TOKENS.typography.mono, fontSize: 14, textAlign: 'right', color: DOCUMENTARY_MOTION_TOKENS.colors.white, letterSpacing: 0}}>{item.displayValue || item.value}{recipe.unit || ''}</div>
            </div>
          ))}
          <SourceLine source={recipe.source} />
        </MotionPanel>
      </div>
    </AbsoluteFill>
  );
};

export const TimelineMarksMotion: React.FC<MotionProps<'timeline_marks'>> = ({recipe, durationInFrames}) => {
  const frame = useCurrentFrame();
  const opacity = motionEnvelope(frame, durationInFrames);
  const progress = drawProgress(frame, durationInFrames);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={zoneStyle(recipe.zone, 820)}>
        <MotionPanel opacity={opacity} role={recipe.colorRole} width={820} compact>
          {recipe.title ? <div style={{fontSize: 17, fontWeight: 700, marginBottom: 16, letterSpacing: 0}}>{recipe.title}</div> : null}
          <div style={{position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 16}}>
            <div style={{position: 'absolute', left: 0, right: 0, top: 8, height: 2, background: DOCUMENTARY_MOTION_TOKENS.colors.line, transform: `scaleX(${progress})`, transformOrigin: 'left center'}} />
            {recipe.events.map((event, index) => (
              <div key={`${recipe.id}_${event.date}`} style={{position: 'relative', flex: 1, paddingTop: 23, color: index === recipe.activeIndex ? colorForRole(recipe.colorRole) : DOCUMENTARY_MOTION_TOKENS.colors.muted}}>
                <div style={{position: 'absolute', top: 2, left: 0, width: 14, height: 14, borderRadius: '50%', background: index === recipe.activeIndex ? colorForRole(recipe.colorRole) : DOCUMENTARY_MOTION_TOKENS.colors.white}} />
                <div style={{fontFamily: DOCUMENTARY_MOTION_TOKENS.typography.mono, fontSize: 14, fontWeight: 700, letterSpacing: 0}}>{event.date}</div>
                <div style={{fontSize: 14, marginTop: 4, color: DOCUMENTARY_MOTION_TOKENS.colors.white, letterSpacing: 0}}>{event.label}</div>
              </div>
            ))}
          </div>
          <SourceLine source={recipe.source} />
        </MotionPanel>
      </div>
    </AbsoluteFill>
  );
};

export const LocationStampMotion: React.FC<MotionProps<'location_stamp'>> = ({recipe, durationInFrames}) => {
  const frame = useCurrentFrame();
  const opacity = motionEnvelope(frame, durationInFrames);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={zoneStyle(recipe.zone)}>
        <MotionPanel opacity={opacity} role={recipe.colorRole} compact>
          <div style={{fontSize: 23, fontWeight: 700, letterSpacing: 0}}>{recipe.place}</div>
          <div style={{fontFamily: DOCUMENTARY_MOTION_TOKENS.typography.mono, fontSize: 15, color: colorForRole(recipe.colorRole), marginTop: 5, letterSpacing: 0}}>{recipe.coordinates}</div>
          {recipe.context ? <div style={{fontSize: 16, color: DOCUMENTARY_MOTION_TOKENS.colors.muted, marginTop: 5, letterSpacing: 0}}>{recipe.context}</div> : null}
          <SourceLine source={recipe.source} />
        </MotionPanel>
      </div>
    </AbsoluteFill>
  );
};

export const AreaOutlineMotion: React.FC<MotionProps<'area_outline'>> = ({recipe, durationInFrames}) => {
  const frame = useCurrentFrame();
  const opacity = motionEnvelope(frame, durationInFrames);
  const progress = drawProgress(frame, durationInFrames);
  const center = recipe.points.reduce((sum, point) => ({x: sum.x + point.x / recipe.points.length, y: sum.y + point.y / recipe.points.length}), {x: 0, y: 0});
  const c = px(center);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity}}>
      <OverlaySvg>
        <path d={polylinePath(recipe.points, true)} pathLength={1} fill={`rgba(255,85,0,${0.06 * progress})`} stroke={colorForRole(recipe.colorRole)} strokeWidth={3} strokeDasharray={1} strokeDashoffset={1 - progress} />
        <rect x={c.x - 110} y={c.y - 30} width={220} height={60} rx={3} fill="rgba(6,7,9,0.7)" />
        <text x={c.x} y={c.y - 2} textAnchor="middle" fill={DOCUMENTARY_MOTION_TOKENS.colors.white} fontFamily={DOCUMENTARY_MOTION_TOKENS.typography.editorial} fontSize={21} fontWeight={700}>{recipe.label}</text>
        {recipe.value ? <text x={c.x} y={c.y + 21} textAnchor="middle" fill={colorForRole(recipe.colorRole)} fontFamily={DOCUMENTARY_MOTION_TOKENS.typography.mono} fontSize={16}>{recipe.value}</text> : null}
      </OverlaySvg>
      <div style={zoneStyle(recipe.zone)}><div style={{opacity}}><SourceLine source={recipe.source} /></div></div>
    </AbsoluteFill>
  );
};

export const RiskMarkerMotion: React.FC<MotionProps<'risk_marker'>> = ({recipe, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opacity = motionEnvelope(frame, durationInFrames);
  const progress = drawProgress(frame, durationInFrames);
  const target = labelAnchor(recipe.zone);
  const anchor = trackedPoint(recipe.binding, recipe.anchor, frame, fps);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity}}>
      <OverlaySvg>
        <MarkerRing point={anchor} progress={progress} role="risk" radius={22} />
        <LeaderLine from={anchor} to={target} progress={progress} role="risk" dashed />
      </OverlaySvg>
      <div style={zoneStyle(recipe.zone)}>
        <MotionPanel opacity={opacity} role="risk" compact>
          <MotionLabel label={recipe.label} detail={recipe.consequence} role="risk" />
          <SourceLine source={recipe.source} />
        </MotionPanel>
      </div>
    </AbsoluteFill>
  );
};
