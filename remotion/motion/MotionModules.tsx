import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {HslMotionDesign} from '../../hsl/motion/motionDesign';

const palette = {
  background: '#060709', line: 'rgba(244,244,240,0.34)', text: '#F4F4F0', muted: '#A4A6AE',
  yellow: '#FF5500', blue: '#00F0FF', orange: '#FF5500',
};
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const DurationContext = React.createContext(150);
const useDuration = () => React.useContext(DurationContext);
const accentFor = (design: HslMotionDesign) => palette[design.accent];

function progress(frame: number, start: number, end: number): number {
  return interpolate(frame, [start, Math.max(start + 1, end)], [0, 1], {
    ...clamp, easing: Easing.inOut(Easing.cubic),
  });
}

function stageProgress(frame: number, duration: number, design: HslMotionDesign, index: number, total: number): number {
  const mechanismCue = design.beats.find((beat) => beat.role === 'MECHANISM')?.at_percent ?? 30;
  const consequenceCue = design.beats.find((beat) => beat.role === 'CONSEQUENCE')?.at_percent ?? 84;
  const span = Math.max(1, consequenceCue - mechanismCue);
  const atPercent = mechanismCue + (span * index) / Math.max(1, total);
  return progress(frame, duration * atPercent / 100, duration * Math.min(96, atPercent + 9) / 100);
}

const MotionCanvas: React.FC<{design: HslMotionDesign; children: React.ReactNode}> = ({design, children}) => {
  const frame = useCurrentFrame();
  const duration = useDuration();
  const opacity = Math.min(progress(frame, 0, 10), interpolate(frame, [Math.max(11, duration - 8), duration], [1, 0], clamp));
  const accent = accentFor(design);
  return (
    <AbsoluteFill style={{background: palette.background, color: palette.text, fontFamily: 'Inter, Arial, sans-serif', opacity}}>
      <div style={{position: 'absolute', left: 72, top: 58, width: 420, borderTop: `1px solid ${accent}`, paddingTop: 8}}>
        <div style={{fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: accent, letterSpacing: 0}}>{design.eyebrow}</div>
      </div>
      <div style={{position: 'absolute', inset: '142px 88px 120px'}}>{children}</div>
      <div style={{position: 'absolute', left: 72, bottom: 58, maxWidth: 720, fontSize: 16, lineHeight: 1.3, color: palette.muted}}>
        {design.takeaway}
      </div>
    </AbsoluteFill>
  );
};

const Node: React.FC<{label: string; x: number; y: number; active: number; accent: string; align?: 'left' | 'center' | 'right'}> = ({label, x, y, active, accent, align = 'center'}) => (
  <div style={{position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', width: 220, textAlign: align, opacity: 0.28 + active * 0.72}}>
    <div style={{width: 12, height: 12, borderRadius: '50%', border: `2px solid ${accent}`, background: active > 0.8 ? accent : palette.background, margin: align === 'center' ? '0 auto 12px' : align === 'right' ? '0 0 12px auto' : '0 auto 12px 0'}} />
    <div style={{fontSize: 18, lineHeight: 1.16, fontWeight: 700, color: active > 0.65 ? palette.text : palette.muted}}>{label}</div>
  </div>
);

const Route: React.FC<{design: HslMotionDesign; branching?: boolean}> = ({design, branching = false}) => {
  const frame = useCurrentFrame();
  const duration = useDuration();
  const accent = accentFor(design);
  const stages = design.stages.slice(0, 4);
  const line = progress(frame, duration * 0.14, duration * 0.64);
  return (
    <MotionCanvas design={design}>
      <svg viewBox="0 0 1744 818" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
        {branching
          ? stages.map((_, index) => <path key={index} d={`M 220 409 C 620 409, 710 ${130 + index * 185}, 1450 ${130 + index * 185}`} pathLength={1} fill="none" stroke={accent} strokeWidth="2" strokeDasharray="1" strokeDashoffset={1 - line} />)
          : <path d="M 170 409 L 1570 409" pathLength={1} fill="none" stroke={accent} strokeWidth="2" strokeDasharray="1" strokeDashoffset={1 - line} />}
      </svg>
      {stages.map((stage, index) => {
        const active = stageProgress(frame, duration, design, index, stages.length);
        const x = branching ? (index === 0 ? 12 : 84) : 10 + index * (80 / Math.max(1, stages.length - 1));
        const y = branching ? (index === 0 ? 50 : 16 + (index - 1) * 22) : 50;
        return <Node key={stage} label={stage} x={x} y={y} active={active} accent={accent} />;
      })}
    </MotionCanvas>
  );
};

export const FlowMap: React.FC<{design: HslMotionDesign}> = ({design}) => <Route design={design} />;
export const BranchingRoutes: React.FC<{design: HslMotionDesign}> = ({design}) => <Route design={design} branching />;

export const ProcessCutaway: React.FC<{design: HslMotionDesign}> = ({design}) => {
  const frame = useCurrentFrame(); const duration = useDuration(); const accent = accentFor(design);
  const flow = progress(frame, duration * 0.16, duration * 0.72);
  return <MotionCanvas design={design}>
    <svg viewBox="0 0 1744 818" style={{width: '100%', height: '100%'}}>
      <path d="M120 410 H650 C730 410 730 280 820 280 H1040 C1130 280 1130 410 1210 410 H1620" fill="none" stroke={palette.line} strokeWidth="42" strokeLinecap="round" />
      <path d="M120 410 H650 C730 410 730 280 820 280 H1040 C1130 280 1130 410 1210 410 H1620" pathLength={1} fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1 - flow} />
      <path d="M860 205 V355 M920 205 V355 M980 205 V355" stroke={accent} strokeWidth="2" opacity={progress(frame, duration * .36, duration * .5)} />
    </svg>
    {design.stages.slice(0, 3).map((stage, index, stages) => <Node key={stage} label={stage} x={[8, 53, 92][index]} y={[62, 22, 62][index]} active={stageProgress(frame, duration, design, index, stages.length)} accent={accent} />)}
  </MotionCanvas>;
};

export const StateTransition: React.FC<{design: HslMotionDesign}> = ({design}) => <FlowMap design={design} />;

export const CapacityVsAvailability: React.FC<{design: HslMotionDesign}> = ({design}) => {
  const frame = useCurrentFrame(); const duration = useDuration(); const accent = accentFor(design);
  return <MotionCanvas design={design}>
    <div style={{height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 140}}>
      {design.stages.slice(0, 3).map((stage, index) => {
        const active = stageProgress(frame, duration, design, index, Math.min(3, design.stages.length));
        const value = [86, 58, 32][index];
        return <div key={stage} style={{width: 250}}>
          <div style={{height: 420, borderLeft: `1px solid ${palette.line}`, borderBottom: `1px solid ${palette.line}`, position: 'relative'}}>
            <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: `${value * active}%`, background: index === 2 ? accent : 'rgba(244,244,240,0.22)'}} />
            <div style={{position: 'absolute', left: 16, bottom: 18, fontSize: 40, fontWeight: 750}}>{Math.round(value * active)}%</div>
          </div>
          <div style={{fontSize: 17, marginTop: 16, color: index === 2 ? accent : palette.muted}}>{stage}</div>
        </div>;
      })}
    </div>
  </MotionCanvas>;
};

export const Bottleneck: React.FC<{design: HslMotionDesign}> = ({design}) => {
  const frame = useCurrentFrame(); const duration = useDuration(); const accent = accentFor(design);
  const flow = progress(frame, duration * .12, duration * .76);
  return <MotionCanvas design={design}>
    <svg viewBox="0 0 1744 818" style={{width: '100%', height: '100%'}}>
      <path d="M100 250 H690 L830 370 H930 L1070 250 H1640 V570 H1070 L930 450 H830 L690 570 H100 Z" fill="rgba(244,244,240,0.06)" stroke={palette.line} strokeWidth="2" />
      {Array.from({length: 13}, (_, index) => <circle key={index} cx={120 + flow * (1450 - index * 58) + index * 58} cy={330 + (index % 3) * 70} r="9" fill={accent} opacity={flow > index * .035 ? .85 : 0} />)}
      <line x1="880" y1="300" x2="880" y2="520" stroke={accent} strokeWidth="3" />
    </svg>
    {design.stages.slice(0, 3).map((stage, index, stages) => <Node key={stage} label={stage} x={[15, 50, 85][index]} y={16} active={stageProgress(frame, duration, design, index, stages.length)} accent={accent} />)}
  </MotionCanvas>;
};

export const ParallelTurnaround: React.FC<{design: HslMotionDesign}> = ({design}) => {
  const frame = useCurrentFrame(); const duration = useDuration(); const accent = accentFor(design);
  return <MotionCanvas design={design}>
    <div style={{display: 'grid', gap: 34, paddingTop: 80}}>
      {design.stages.slice(0, 4).map((stage, index) => {
        const active = stageProgress(frame, duration, design, index, Math.min(4, design.stages.length));
        return <div key={stage} style={{display: 'grid', gridTemplateColumns: '260px 1fr', alignItems: 'center', gap: 24}}><div style={{fontSize: 18}}>{stage}</div><div style={{height: 2, background: palette.line}}><div style={{width: `${active * 100}%`, height: 2, background: accent}} /></div></div>;
      })}
    </div>
  </MotionCanvas>;
};

export const DelayPropagation: React.FC<{design: HslMotionDesign}> = ({design}) => <FlowMap design={design} />;

export const BeforeAfter: React.FC<{design: HslMotionDesign}> = ({design}) => {
  const frame = useCurrentFrame(); const duration = useDuration(); const accent = accentFor(design);
  const reveal = progress(frame, duration * .16, duration * .36);
  const left = design.stages[0] || 'ANTES'; const right = design.stages[design.stages.length - 1] || 'DEPOIS';
  return <MotionCanvas design={design}>
    <div style={{height: '100%', display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 70, alignItems: 'center', opacity: reveal}}>
      <div style={{textAlign: 'right', fontSize: 34, color: palette.muted}}>{left}</div>
      <div style={{height: '62%', background: accent}} />
      <div style={{fontSize: 34, color: palette.text}}>{right}</div>
    </div>
  </MotionCanvas>;
};

export const EvidenceCard: React.FC<{design: HslMotionDesign}> = ({design}) => {
  const frame = useCurrentFrame(); const duration = useDuration(); const accent = accentFor(design);
  return <MotionCanvas design={design}>
    <div style={{height: '100%', display: 'grid', gridTemplateColumns: `repeat(${Math.min(4, design.stages.length)}, 1fr)`, alignItems: 'center', gap: 44}}>
      {design.stages.slice(0, 4).map((stage, index) => {
        const active = stageProgress(frame, duration, design, index, Math.min(4, design.stages.length));
        return <div key={stage} style={{borderTop: `1px solid ${index === design.stages.length - 1 ? accent : palette.line}`, paddingTop: 16, minHeight: 150, opacity: active}}><div style={{fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: accent}}>0{index + 1}</div><div style={{fontSize: 24, lineHeight: 1.14, fontWeight: 700, marginTop: 36}}>{stage}</div></div>;
      })}
    </div>
  </MotionCanvas>;
};

export const MotionModule: React.FC<{design: HslMotionDesign; durationInFrames: number}> = ({design, durationInFrames}) => {
  let content: React.ReactNode = <FlowMap design={design} />;
  if (design.template === 'BRANCHING_ROUTES') content = <BranchingRoutes design={design} />;
  if (design.template === 'PROCESS_CUTAWAY') content = <ProcessCutaway design={design} />;
  if (design.template === 'STATE_TRANSITION') content = <StateTransition design={design} />;
  if (design.template === 'CAPACITY_VS_AVAILABILITY') content = <CapacityVsAvailability design={design} />;
  if (design.template === 'BOTTLENECK') content = <Bottleneck design={design} />;
  if (design.template === 'PARALLEL_TURNAROUND') content = <ParallelTurnaround design={design} />;
  if (design.template === 'DELAY_PROPAGATION') content = <DelayPropagation design={design} />;
  if (design.template === 'BEFORE_AFTER') content = <BeforeAfter design={design} />;
  if (design.template === 'EVIDENCE_CARD') content = <EvidenceCard design={design} />;
  return <DurationContext.Provider value={durationInFrames}>{content}</DurationContext.Provider>;
};
