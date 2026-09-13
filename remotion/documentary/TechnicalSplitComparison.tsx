import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export interface TechnicalSplitComparisonProps {
  leftTitle?: string;
  leftSubtitle?: string;
  leftDetail?: string;
  rightTitle?: string;
  rightSubtitle?: string;
  rightDetail?: string;
  categoryBadge?: string;
  sourceText?: string;
  accentColor?: string;
  telemetryColor?: string;
  durationInFrames?: number;
}

/**
 * ⚖️ TechnicalSplitComparison: Comparação Lado a Lado de Alta Potência Cognitiva
 * Constrasta a crença intuitiva falsa ("O que você pensa") com a verdade física do sistema ("A realidade").
 */
export const TechnicalSplitComparison: React.FC<TechnicalSplitComparisonProps> = ({
  leftTitle = 'O QUE VOCÊ PENSA',
  leftSubtitle = 'ENERGIA ESTOCADA NA TOMADA',
  leftDetail = 'Modelo intuitivo: eletricidade funciona como um reservatório ou bateria estacionária esperando ser consumida.',
  rightTitle = 'A REALIDADE FÍSICA',
  rightSubtitle = 'GERAÇÃO NO MESMO MILISSEGUNDO',
  rightDetail = 'Lei física: zero estoque. O elétron que move seu motor agora está sendo girado pela turbina em Itaipu neste instante.',
  categoryBadge = 'DESCONSTRUÇÃO CAUSAL // O OUTRO LADO',
  sourceText = 'FONTE: OPERADOR NACIONAL DO SISTEMA (ONS)',
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF',
  durationInFrames = 150
}) => {
  const frame = useCurrentFrame();

  const enter = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  const dividerScan = interpolate(frame, [10, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 60,
        opacity: enter
      }}
    >
      <div
        style={{
          width: 1540,
          backgroundColor: 'rgba(6, 7, 9, 0.94)',
          border: '1px solid rgba(244, 244, 240, 0.16)',
          borderRadius: '8px',
          boxShadow: '0 24px 70px rgba(0,0,0,0.9)',
          backdropFilter: 'blur(20px)',
          padding: '44px 56px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28
        }}
      >
        {/* Topo: Categoria e Rigor */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 22,
              fontWeight: 800,
              color: telemetryColor,
              letterSpacing: 2
            }}
          >
            // {categoryBadge}
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 18,
              color: '#8A8D9F'
            }}
          >
            {sourceText}
          </div>
        </div>

        {/* Bloco Dividido em Duas Colunas */}
        <div style={{ display: 'flex', position: 'relative', gap: 64, alignItems: 'stretch' }}>
          {/* Lado Esquerdo: Modelo Falso / Comum */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 20,
                fontWeight: 700,
                color: '#8A8D9F',
                letterSpacing: 1.5,
                textTransform: 'uppercase'
              }}
            >
              [ 01 // {leftTitle} ]
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 42,
                fontWeight: 850,
                color: '#A4A6AE',
                lineHeight: 1.15,
                textTransform: 'uppercase'
              }}
            >
              {leftSubtitle}
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 24,
                color: '#8A8D9F',
                lineHeight: 1.4,
                marginTop: 6
              }}
            >
              {leftDetail}
            </div>
          </div>

          {/* Linha Divisora Laser Vertical */}
          <div
            style={{
              width: 3,
              backgroundColor: 'rgba(244,244,240,0.15)',
              position: 'relative',
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: 3,
                backgroundColor: accentColor,
                transform: `scaleY(${dividerScan})`,
                transformOrigin: 'top center',
                boxShadow: `0 0 12px ${accentColor}`
              }}
            />
          </div>

          {/* Lado Direito: A Realidade Causal Revelada */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 20,
                fontWeight: 800,
                color: accentColor,
                letterSpacing: 1.5,
                textTransform: 'uppercase'
              }}
            >
              [ 02 // {rightTitle} ]
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 42,
                fontWeight: 900,
                color: '#F4F4F0',
                lineHeight: 1.15,
                textTransform: 'uppercase'
              }}
            >
              {rightSubtitle}
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 24,
                color: '#E2E4DE',
                lineHeight: 1.4,
                marginTop: 6,
                fontWeight: 500
              }}
            >
              {rightDetail}
            </div>
          </div>
        </div>

        {/* Barra de Status Inferior */}
        <div
          style={{
            borderTop: '1px solid rgba(244,244,240,0.12)',
            paddingTop: 16,
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 18,
            color: '#8A8D9F'
          }}
        >
          <span>EQUAÇÃO CAUSAL DO SISTEMA</span>
          <span style={{ color: accentColor, fontWeight: 700 }}>GERAÇÃO(t) ≡ DEMANDA(t)</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
