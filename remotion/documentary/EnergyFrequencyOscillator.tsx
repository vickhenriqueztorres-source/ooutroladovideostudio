import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export interface EnergyFrequencyOscillatorProps {
  currentHz?: number;
  targetHz?: number;
  criticalLowHz?: number;
  criticalHighHz?: number;
  label?: string;
  sublabel?: string;
  sourceText?: string;
  accentColor?: string;
  telemetryColor?: string;
  showLimits?: boolean;
}

/**
 * ⚡ EnergyFrequencyOscillator: Oscilador Dinâmico de Frequência de Rede (60.00 Hz)
 * Visualiza a onda senoidal contínua da corrente alternada e os limites de estabilidade
 * do Sistema Interligado Nacional (SIN/ONS).
 */
export const EnergyFrequencyOscillator: React.FC<EnergyFrequencyOscillatorProps> = ({
  currentHz = 60.00,
  targetHz = 60.00,
  criticalLowHz = 59.50,
  criticalHighHz = 60.50,
  label = 'FREQUÊNCIA NOMINAL DO SISTEMA INTERLIGADO',
  sublabel = 'TOLERÂNCIA OPERACIONAL // RELÉ ERAC ATIVO',
  sourceText = 'FONTE: ONS // PROCEDIMENTOS DE REDE SUBMÓDULO 2.3',
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF',
  showLimits = true
}) => {
  const frame = useCurrentFrame();

  // Animação da fase da onda senoidal (60 ciclos virtuais simulados)
  const phase = (frame * 0.18) % (Math.PI * 2);
  const delta = currentHz - targetHz;
  const isCritical = currentHz <= criticalLowHz || currentHz >= criticalHighHz;
  const waveColor = isCritical ? accentColor : telemetryColor;

  // Geração de pontos da onda senoidal SVG
  const width = 1200;
  const height = 320;
  const points: string[] = [];
  const numSamples = 120;

  for (let i = 0; i <= numSamples; i++) {
    const x = (i / numSamples) * width;
    // Modulação de amplitude senoidal pura
    const y = (height / 2) + Math.sin((i / numSamples) * Math.PI * 6 + phase) * (height * 0.38);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  const polylineStr = points.join(' ');

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 60
      }}
    >
      <div
        style={{
          width: 1400,
          backgroundColor: 'rgba(6, 7, 9, 0.92)',
          border: '1px solid rgba(244, 244, 240, 0.15)',
          borderTop: `4px solid ${waveColor}`,
          padding: '36px 48px',
          borderRadius: '8px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.85)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 22,
                fontWeight: 800,
                color: waveColor,
                letterSpacing: 2,
                textTransform: 'uppercase'
              }}
            >
              // TELEMETRIA DINÂMICA DE REDE
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 38,
                fontWeight: 850,
                color: '#F4F4F0',
                marginTop: 6,
                letterSpacing: -0.5
              }}
            >
              {label}
            </div>
          </div>

          {/* Medição Digital de Grande Escala */}
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 68,
                fontWeight: 900,
                color: waveColor,
                lineHeight: 1,
                letterSpacing: -1,
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {currentHz.toFixed(2)} <span style={{ fontSize: 36, color: '#F4F4F0' }}>Hz</span>
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 20,
                color: delta === 0 ? '#A4A6AE' : (delta < 0 ? accentColor : telemetryColor),
                marginTop: 6,
                fontWeight: 700
              }}
            >
              {delta >= 0 ? `+${delta.toFixed(3)}` : delta.toFixed(3)} Hz DO NOMINAL
            </div>
          </div>
        </div>

        {/* Display do Osciloscópio (SVG) */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: height,
            backgroundColor: '#040507',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden'
          }}
        >
          {/* Grade de fundo do osciloscópio */}
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.25 }}>
            <defs>
              <pattern id="grid" width="80" height="40" patternUnits="userSpaceOnUse">
                <path d="M 80 0 L 0 0 0 40" fill="none" stroke="#F4F4F0" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Linha Central Zero */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: 'rgba(244,244,240,0.3)',
              borderBottom: '1px dashed rgba(244,244,240,0.4)'
            }}
          />

          {/* Linha de Limite Crítico Inferior (59.5 Hz) */}
          {showLimits && (
            <div
              style={{
                position: 'absolute',
                bottom: '18%',
                left: 20,
                right: 20,
                borderBottom: `2px dashed ${accentColor}80`,
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 16,
                fontFamily: "'JetBrains Mono', monospace",
                color: accentColor,
                fontWeight: 700,
                paddingBottom: 4
              }}
            >
              <span>LIMIAR DE DESCONEXÃO (ERAC)</span>
              <span>{criticalLowHz.toFixed(1)} Hz</span>
            </div>
          )}

          {/* Onda Senoidal Dinâmica */}
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            <polyline
              fill="none"
              stroke={waveColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylineStr}
            />
          </svg>
        </div>

        {/* Rodapé e Especificações de Auditoria */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 18,
              color: '#A4A6AE',
              letterSpacing: 0.5
            }}
          >
            {sublabel}
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 16,
              color: '#8A8D9F'
            }}
          >
            {sourceText}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
