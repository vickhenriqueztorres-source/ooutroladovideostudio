import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

type EnergyExplainerVariant =
  | 'query-chain'
  | 'queue-flow'
  | 'thermal-stack'
  | 'cooling-loop'
  | 'rack-cross-section'
  | 'power-route'
  | 'document-forecast';

export interface EnergyInfrastructureExplainerSceneProps {
  sceneId: string;
  durationInFrames: number;
  explainerVariant: EnergyExplainerVariant;
  explainerTitle: string;
  explainerSubtitle: string;
  explainerSource?: string;
  accentColor?: string;
  telemetryColor?: string;
}

const BG = '#060709';
const SURFACE = '#151820';
const WHITE = '#F4F4F0';
const MUTED = '#8A8D9F';
const ORANGE = '#FF5500';
const CYAN = '#00F0FF';

const nodeBox = (x: number, y: number, width: number, height: number, label: string, detail: string, active: boolean) => (
  <g>
    <rect x={x} y={y} width={width} height={height} fill={active ? '#202128' : SURFACE} stroke={active ? ORANGE : '#555964'} strokeWidth={active ? 2 : 1} />
    <text x={x + 16} y={y + 29} fill={active ? WHITE : MUTED} fontFamily="Inter, Arial, sans-serif" fontSize="18" fontWeight="700" letterSpacing="0">{label}</text>
    <text x={x + 16} y={y + 53} fill={active ? ORANGE : '#6F7382'} fontFamily="JetBrains Mono, Consolas, monospace" fontSize="12" letterSpacing="0">{detail}</text>
  </g>
);

const line = (x1: number, y1: number, x2: number, y2: number, progress: number, color = CYAN, width = 3) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} pathLength={1} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - progress} opacity="0.9" />
);

const flowDot = (x: number, y: number, progress: number, color = ORANGE) => (
  <circle cx={x} cy={y} r="7" fill={color} opacity={progress > 0.08 ? 1 : 0} />
);

export const EnergyInfrastructureExplainerScene: React.FC<EnergyInfrastructureExplainerSceneProps> = ({
  sceneId,
  durationInFrames,
  explainerVariant,
  explainerTitle,
  explainerSubtitle,
  explainerSource,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = interpolate(frame, [0, Math.min(18, durationInFrames * 0.2)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const draw = interpolate(frame, [8, Math.min(42, durationInFrames * 0.45)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const active = interpolate(frame, [12, Math.min(52, durationInFrames * 0.55)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const exit = interpolate(frame, [Math.max(0, durationInFrames - 12), durationInFrames], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const opacity = Math.min(enter, exit);
  const pulse = 0.78 + Math.sin((frame / fps) * Math.PI * 2.2) * 0.18;
  const moving = Math.min(1, Math.max(0, (frame - 22) / Math.max(1, durationInFrames - 30)));

  const renderDiagram = () => {
    switch (explainerVariant) {
      case 'query-chain': {
        const x = 150 + moving * 1260;
        return (
          <>
            {nodeBox(100, 390, 260, 90, 'PERGUNTA', 'entrada de dados', active > 0.2)}
            {nodeBox(500, 390, 260, 90, 'REDE', 'conexao fisica', active > 0.4)}
            {nodeBox(900, 390, 260, 90, 'RACK', 'calculo ativo', active > 0.6)}
            {nodeBox(1300, 390, 260, 90, 'RESPOSTA', 'saida processada', active > 0.8)}
            {line(360, 435, 500, 435, draw, ORANGE)}
            {line(760, 435, 900, 435, draw, ORANGE)}
            {line(1160, 435, 1300, 435, draw, ORANGE)}
            {flowDot(x, 435, draw, ORANGE)}
            <text x="100" y="570" fill={MUTED} fontFamily="JetBrains Mono, Consolas, monospace" fontSize="16">UMA FRASE ACIONA UMA CADEIA DE INFRAESTRUTURA</text>
          </>
        );
      }
      case 'queue-flow': {
        const rows = [0, 1, 2, 3, 4];
        const packetX = 330 + moving * 880;
        return (
          <>
            <text x="120" y="250" fill={WHITE} fontFamily="Inter, Arial, sans-serif" fontSize="24" fontWeight="700">FILA DE PEDIDOS</text>
            <text x="1250" y="250" fill={WHITE} fontFamily="Inter, Arial, sans-serif" fontSize="24" fontWeight="700">CAPACIDADE DO RACK</text>
            {rows.map((row) => <rect key={row} x="120" y={300 + row * 56} width="690" height="28" fill={row === 2 ? '#2C2522' : '#1A1D24'} stroke={row === 2 ? ORANGE : '#414550'} strokeWidth="1" />)}
            {rows.map((row) => <circle key={`node-${row}`} cx="850" cy={314 + row * 56} r="9" fill={row === 2 ? ORANGE : '#555964'} opacity={row === 2 ? pulse : 1} />)}
            {nodeBox(1050, 300, 510, 250, 'GPU / RACK', 'processamento simultaneo', true)}
            {line(860, 426, 1050, 426, draw, CYAN)}
            {flowDot(packetX, 426, draw, CYAN)}
            <text x="120" y="640" fill={MUTED} fontFamily="JetBrains Mono, Consolas, monospace" fontSize="16">CADA PEDIDO OCUPA TEMPO, MEMORIA E POTENCIA</text>
          </>
        );
      }
      case 'thermal-stack': {
        const heatY = 580 - moving * 240;
        return (
          <>
            {nodeBox(180, 300, 510, 260, 'ACELERADOR', 'energia eletrica -> computacao', true)}
            <rect x="260" y="390" width="350" height="92" fill="#222631" stroke={ORANGE} strokeWidth="2" />
            {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={285 + i * 62} y="418" width="38" height="36" fill="#87643F" />)}
            {line(690, 430, 1050, 430, draw, ORANGE, 4)}
            {nodeBox(1110, 300, 510, 260, 'REFRIGERACAO', 'calor precisa sair do rack', active > 0.5)}
            <path d="M 810 500 C 850 610, 940 610, 980 500" fill="none" stroke={CYAN} strokeWidth="5" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw} />
            <circle cx="870" cy={heatY} r="10" fill={ORANGE} opacity={draw} />
            <text x="180" y="660" fill={MUTED} fontFamily="JetBrains Mono, Consolas, monospace" fontSize="16">MAIS CARGA COMPUTACIONAL TAMBEM SIGNIFICA MAIS CALOR</text>
          </>
        );
      }
      case 'cooling-loop': {
        const dotX = 430 + moving * 770;
        return (
          <>
            <rect x="250" y="300" width="500" height="260" fill="none" stroke="#555964" strokeWidth="2" />
            <text x="300" y="350" fill={WHITE} fontFamily="Inter, Arial, sans-serif" fontSize="24" fontWeight="700">RACK DE IA</text>
            {[0, 1, 2, 3].map((i) => <rect key={i} x="310" y={390 + i * 36} width="350" height="20" fill={i === 1 ? '#3B2923' : '#20242C'} stroke={i === 1 ? ORANGE : '#555964'} />)}
            <path d="M 750 430 H 1040 V 300 H 1370 V 560 H 1040 V 500 H 750" fill="none" stroke={CYAN} strokeWidth="5" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw} />
            {nodeBox(1120, 350, 230, 100, 'BOMBA', 'fluxo liquido', true)}
            {nodeBox(1120, 470, 230, 100, 'TROCADOR', 'calor rejeitado', active > 0.55)}
            {flowDot(dotX, 430, draw, CYAN)}
            <text x="250" y="660" fill={MUTED} fontFamily="JetBrains Mono, Consolas, monospace" fontSize="16">O PROJETO TERMICO VIRA PARTE DO CONSUMO ELETRICO</text>
          </>
        );
      }
      case 'rack-cross-section': {
        return (
          <>
            <rect x="300" y="250" width="570" height="380" fill="#11141A" stroke="#555964" strokeWidth="2" />
            <text x="350" y="305" fill={WHITE} fontFamily="Inter, Arial, sans-serif" fontSize="24" fontWeight="700">CORTE DO RACK</text>
            {[0, 1, 2, 3, 4].map((i) => <g key={i}><rect x="370" y={350 + i * 48} width="410" height="26" fill={i === 2 ? '#3B2923' : '#20242C'} stroke={i === 2 ? ORANGE : '#555964'} /><circle cx="400" cy={363 + i * 48} r="6" fill={i === 2 ? ORANGE : CYAN} opacity={i === 2 ? pulse : 0.7} /></g>)}
            {line(900, 410, 1370, 410, draw, ORANGE, 5)}
            {line(900, 500, 1370, 500, draw, CYAN, 5)}
            {flowDot(900 + moving * 470, 410, draw, ORANGE)}
            {flowDot(900 + moving * 470, 500, draw, CYAN)}
            <text x="920" y="360" fill={ORANGE} fontFamily="JetBrains Mono, Consolas, monospace" fontSize="18">POTENCIA</text>
            <text x="920" y="555" fill={CYAN} fontFamily="JetBrains Mono, Consolas, monospace" fontSize="18">AR EXPELIDO</text>
          </>
        );
      }
      case 'power-route': {
        return (
          <>
            <path d="M 180 500 L 500 390 L 850 500 L 1180 340 L 1570 450" fill="none" stroke="#555964" strokeWidth="12" />
            <path d="M 180 500 L 500 390 L 850 500 L 1180 340 L 1570 450" fill="none" stroke={ORANGE} strokeWidth="4" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw} />
            {[{x:180,y:500,l:'SUBESTACAO'},{x:500,y:390,l:'CONEXAO'},{x:850,y:500,l:'UPS'},{x:1180,y:340,l:'DATA CENTER'},{x:1570,y:450,l:'RACK'}].map((n, i) => <g key={n.l}><circle cx={n.x} cy={n.y} r="14" fill={i === 3 ? ORANGE : CYAN} opacity={i === 3 ? pulse : 1} /><text x={n.x - 62} y={n.y + 48} fill={WHITE} fontFamily="JetBrains Mono, Consolas, monospace" fontSize="15">{n.l}</text></g>)}
            <text x="180" y="660" fill={MUTED} fontFamily="JetBrains Mono, Consolas, monospace" fontSize="16">EFICIENCIA NAO SUBSTITUI A CONEXAO FISICA</text>
          </>
        );
      }
      case 'document-forecast': {
        const first = interpolate(frame, [8, 42], [0, 53], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const second = interpolate(frame, [12, 50], [0, 1020], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        return (
          <>
            <rect x="300" y="230" width="1320" height="390" fill="#E6E3D9" opacity="0.96" />
            <text x="380" y="305" fill="#25262A" fontFamily="Inter, Arial, sans-serif" fontSize="24" fontWeight="700">DEMANDA MEDIA DE DATA CENTERS</text>
            <text x="380" y="344" fill="#66645F" fontFamily="JetBrains Mono, Consolas, monospace" fontSize="15">MW MEDIOS / CENARIO DE EXPANSAO</text>
            <rect x="450" y="520" width="280" height={Math.max(2, first * 0.14)} fill="#777A82" />
            <rect x="1080" y={520 - second * 0.14} width="280" height={Math.max(2, second * 0.14)} fill={ORANGE} />
            <text x="500" y="570" fill="#25262A" fontFamily="JetBrains Mono, Consolas, monospace" fontSize="24">2025</text>
            <text x="1130" y="570" fill="#25262A" fontFamily="JetBrains Mono, Consolas, monospace" fontSize="24">2029</text>
            <text x="520" y={500 - first * 0.14} fill="#25262A" fontFamily="JetBrains Mono, Consolas, monospace" fontSize="22">{Math.round(first)} MW</text>
            <text x="1140" y={490 - second * 0.14} fill="#25262A" fontFamily="JetBrains Mono, Consolas, monospace" fontSize="22">{Math.round(second)} MW</text>
          </>
        );
      }
    }
  };

  return (
    <AbsoluteFill style={{backgroundColor: BG, color: WHITE, opacity, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 84, top: 62, right: 84, zIndex: 2}}>
        <div style={{fontFamily: 'JetBrains Mono, Consolas, monospace', color: ORANGE, fontSize: 14, letterSpacing: 0}}>EVIDENCIA EXPLICATIVA // {sceneId}</div>
        <div style={{fontFamily: 'Inter, Arial, sans-serif', fontSize: 42, lineHeight: 1.05, fontWeight: 700, marginTop: 15, maxWidth: 1120}}>{explainerTitle}</div>
        <div style={{fontFamily: 'Inter, Arial, sans-serif', color: MUTED, fontSize: 19, marginTop: 12, maxWidth: 960}}>{explainerSubtitle}</div>
      </div>
      <svg viewBox="0 0 1920 800" preserveAspectRatio="none" style={{position: 'absolute', inset: '210px 0 0', width: '100%', height: 'calc(100% - 210px)'}}>
        <line x1="80" y1="680" x2="1840" y2="680" stroke="#262A33" strokeWidth="1" />
        {renderDiagram()}
      </svg>
      {explainerSource ? <div style={{position: 'absolute', left: 84, bottom: 48, color: MUTED, fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 13}}>FONTE: {explainerSource}</div> : null}
    </AbsoluteFill>
  );
};

