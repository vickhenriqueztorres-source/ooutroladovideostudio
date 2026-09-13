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
        <MarkerRing point={anchor} progress={progress} role="evidence" radius={32} />
        <LeaderLine from={anchor} to={target} progress={progress} role="evidence" />
      </OverlaySvg>
      <div style={zoneStyle(recipe.zone)}>
        <MotionPanel opacity={opacity} role="evidence" compact>
          <div style={{fontFamily: DOCUMENTARY_MOTION_TOKENS.typography.mono, fontSize: 22, fontWeight: 800, color: DOCUMENTARY_MOTION_TOKENS.colors.evidence, marginBottom: 8, letterSpacing: 1}}>
            EVIDÊNCIA OBSERVADA
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
        <line x1={a.x} y1={a.y - 16} x2={a.x} y2={a.y + 16} stroke={color} strokeWidth={3} opacity={progress} />
        <line x1={b.x} y1={b.y - 16} x2={b.x} y2={b.y + 16} stroke={color} strokeWidth={3} opacity={progress} />
        <rect x={mid.x - 140} y={mid.y - 70} width={280} height={64} rx={4} fill="rgba(6,7,9,0.85)" opacity={opacity} />
        <text x={mid.x} y={mid.y - 26} textAnchor="middle" fill={DOCUMENTARY_MOTION_TOKENS.colors.white} fontFamily={DOCUMENTARY_MOTION_TOKENS.typography.mono} fontSize={44} fontWeight={800}>
          {recipe.value}
        </text>
        {recipe.label ? (
          <text x={mid.x} y={mid.y + 44} textAnchor="middle" fill={DOCUMENTARY_MOTION_TOKENS.colors.muted} fontFamily={DOCUMENTARY_MOTION_TOKENS.typography.editorial} fontSize={26} fontWeight={600}>
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
          <div style={{fontSize: 24, fontWeight: 700, color: DOCUMENTARY_MOTION_TOKENS.colors.muted, marginBottom: 6, letterSpacing: 0}}>{recipe.label}</div>
          <div style={{fontFamily: DOCUMENTARY_MOTION_TOKENS.typography.mono, fontSize: DOCUMENTARY_MOTION_TOKENS.typography.value, fontWeight: 800, color: colorForRole(recipe.colorRole), letterSpacing: 0, fontVariantNumeric: 'tabular-nums', textShadow: '0 4px 20px rgba(0,0,0,0.95)'}}>
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
      <div style={zoneStyle(recipe.zone, 760)}>
        <MotionPanel opacity={opacity} compact width={760}>
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
      <div style={zoneStyle(recipe.zone, 920)}>
        <MotionPanel opacity={opacity} width={920} compact>
          {recipe.title ? <div style={{fontSize: 32, fontWeight: 800, marginBottom: 16, letterSpacing: 0}}>{recipe.title}</div> : null}
          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
            {recipe.steps.map((step, index) => (
              <React.Fragment key={`${recipe.id}_${step}`}>
                <div style={{flex: 1, minWidth: 0, color: index === recipe.activeStep ? colorForRole(recipe.colorRole) : DOCUMENTARY_MOTION_TOKENS.colors.muted, fontFamily: DOCUMENTARY_MOTION_TOKENS.typography.mono, fontSize: 22, fontWeight: index === recipe.activeStep ? 800 : 500, letterSpacing: 0, overflowWrap: 'anywhere'}}>
                  {String(index + 1).padStart(2, '0')} {step}
                </div>
                {index < recipe.steps.length - 1 ? <div style={{width: 28, height: 2, background: DOCUMENTARY_MOTION_TOKENS.colors.line}} /> : null}
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
        <path d={polylinePath(recipe.points)} pathLength={1} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={1} strokeDashoffset={1 - progress} />
        {recipe.points.map((point, index) => {
          const p = px(point);
          const visible = progress >= index / Math.max(1, recipe.points.length - 1);
          return <circle key={`${recipe.id}_${index}`} cx={p.x} cy={p.y} r={index === 0 || point === last ? 9 : 6} fill={visible ? color : 'transparent'} />;
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
      <div style={{fontSize: 24, color: DOCUMENTARY_MOTION_TOKENS.colors.muted, fontWeight: 600, letterSpacing: 0}}>{data.label}</div>
      <div style={{fontFamily: DOCUMENTARY_MOTION_TOKENS.typography.mono, fontSize: 52, fontWeight: 800, color: active ? colorForRole(recipe.colorRole) : DOCUMENTARY_MOTION_TOKENS.colors.white, marginTop: 6, letterSpacing: 0}}>{data.value}</div>
      {data.detail ? <div style={{fontSize: 22, color: DOCUMENTARY_MOTION_TOKENS.colors.muted, marginTop: 6, letterSpacing: 0}}>{data.detail}</div> : null}
    </div>
  );
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={zoneStyle(recipe.zone, 820)}>
        <MotionPanel opacity={opacity} role={recipe.colorRole} width={820}>
          {recipe.title ? <div style={{fontSize: 32, fontWeight: 800, marginBottom: 16, letterSpacing: 0}}>{recipe.title}</div> : null}
          <div style={{display: 'flex', gap: 28, alignItems: 'stretch'}}>
            {side(recipe.left, false)}
            <div style={{width: 2, background: DOCUMENTARY_MOTION_TOKENS.colors.line}} />
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
      <div style={zoneStyle(recipe.zone, 760)}>
        <MotionPanel opacity={opacity} role="evidence" width={760}>
          <div style={{display: 'flex', justifyContent: 'space-between', gap: 16, fontFamily: DOCUMENTARY_MOTION_TOKENS.typography.mono, fontSize: 20, color: DOCUMENTARY_MOTION_TOKENS.colors.muted, letterSpacing: 0}}>
            <span>{recipe.documentTitle}</span><span>{recipe.page || ''}</span>
          </div>
          <div style={{position: 'relative', marginTop: 14, padding: '14px 16px', fontSize: 30, lineHeight: 1.35, color: DOCUMENTARY_MOTION_TOKENS.colors.white, letterSpacing: 0}}>
            <div style={{position: 'absolute', inset: 0, background: `rgba(255,85,0,${0.14 * highlight})`, borderLeft: `4px solid ${DOCUMENTARY_MOTION_TOKENS.colors.evidence}`, transform: `scaleX(${highlight})`, transformOrigin: 'left center'}} />
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
      <div style={zoneStyle(recipe.zone, 700)}>
        <MotionPanel opacity={opacity} role={recipe.colorRole} width={700}>
          <div style={{fontSize: 32, fontWeight: 800, marginBottom: 16, letterSpacing: 0}}>{recipe.title}</div>
          {recipe.items.map((item) => (
            <div key={`${recipe.id}_${item.label}`} style={{display: 'grid', gridTemplateColumns: '180px 1fr 110px', alignItems: 'center', gap: 14, marginTop: 12}}>
              <div style={{fontSize: 22, color: DOCUMENTARY_MOTION_TOKENS.colors.muted, overflowWrap: 'anywhere', letterSpacing: 0}}>{item.label}</div>
              <div style={{height: 12, background: 'rgba(244,244,240,0.16)', borderRadius: 2}}>
                <div style={{height: '100%', width: `${(item.value / maximum) * progress * 100}%`, background: colorForRole(recipe.colorRole), borderRadius: 2}} />
              </div>
              <div style={{fontFamily: DOCUMENTARY_MOTION_TOKENS.typography.mono, fontSize: 22, fontWeight: 700, textAlign: 'right', color: DOCUMENTARY_MOTION_TOKENS.colors.white, letterSpacing: 0}}>{item.displayValue || item.value}{recipe.unit || ''}</div>
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
      <div style={zoneStyle(recipe.zone, 980)}>
        <MotionPanel opacity={opacity} role={recipe.colorRole} width={980} compact>
          {recipe.title ? <div style={{fontSize: 32, fontWeight: 800, marginBottom: 18, letterSpacing: 0}}>{recipe.title}</div> : null}
          <div style={{position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 20}}>
            <div style={{position: 'absolute', left: 0, right: 0, top: 10, height: 3, background: DOCUMENTARY_MOTION_TOKENS.colors.line, transform: `scaleX(${progress})`, transformOrigin: 'left center'}} />
            {recipe.events.map((event, index) => (
              <div key={`${recipe.id}_${event.date}`} style={{position: 'relative', flex: 1, paddingTop: 26, color: index === recipe.activeIndex ? colorForRole(recipe.colorRole) : DOCUMENTARY_MOTION_TOKENS.colors.muted}}>
                <div style={{position: 'absolute', top: 2, left: 0, width: 18, height: 18, borderRadius: '50%', background: index === recipe.activeIndex ? colorForRole(recipe.colorRole) : DOCUMENTARY_MOTION_TOKENS.colors.white}} />
                <div style={{fontFamily: DOCUMENTARY_MOTION_TOKENS.typography.mono, fontSize: 22, fontWeight: 800, letterSpacing: 0}}>{event.date}</div>
                <div style={{fontSize: 20, marginTop: 6, color: DOCUMENTARY_MOTION_TOKENS.colors.white, letterSpacing: 0}}>{event.label}</div>
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
          <div style={{fontSize: 36, fontWeight: 850, letterSpacing: 0}}>{recipe.place}</div>
          <div style={{fontFamily: DOCUMENTARY_MOTION_TOKENS.typography.mono, fontSize: 22, color: colorForRole(recipe.colorRole), marginTop: 6, letterSpacing: 1}}>{recipe.coordinates}</div>
          {recipe.context ? <div style={{fontSize: 22, color: DOCUMENTARY_MOTION_TOKENS.colors.muted, marginTop: 6, letterSpacing: 0}}>{recipe.context}</div> : null}
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
        <path d={polylinePath(recipe.points, true)} pathLength={1} fill={`rgba(255,85,0,${0.08 * progress})`} stroke={colorForRole(recipe.colorRole)} strokeWidth={4} strokeDasharray={1} strokeDashoffset={1 - progress} />
        <rect x={c.x - 160} y={c.y - 45} width={320} height={90} rx={4} fill="rgba(6,7,9,0.85)" />
        <text x={c.x} y={c.y - 4} textAnchor="middle" fill={DOCUMENTARY_MOTION_TOKENS.colors.white} fontFamily={DOCUMENTARY_MOTION_TOKENS.typography.editorial} fontSize={30} fontWeight={800}>{recipe.label}</text>
        {recipe.value ? <text x={c.x} y={c.y + 28} textAnchor="middle" fill={colorForRole(recipe.colorRole)} fontFamily={DOCUMENTARY_MOTION_TOKENS.typography.mono} fontSize={22} fontWeight={700}>{recipe.value}</text> : null}
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
        <MarkerRing point={anchor} progress={progress} role="risk" radius={30} />
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
