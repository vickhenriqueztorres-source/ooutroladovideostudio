import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export interface PowerBalanceMeterProps {
  generationMw?: number;
  demandMw?: number;
  frequencyHz?: number;
  title?: string;
  sourceText?: string;
  accentColor?: string;
  telemetryColor?: string;
}

/**
 * ⚖️ PowerBalanceMeter: Medidor do Equilíbrio Instável de Potência (MW)
 * Ilustra a balança em tempo real entre Geração Total e Demanda Nacional.
 */
export const PowerBalanceMeter: React.FC<PowerBalanceMeterProps> = ({
  generationMw = 84500,
  demandMw = 84500,
  frequencyHz = 60.00,
  title = 'BALANÇO INSTANTÂNEO DE CARGA DO SIN',
  sourceText = 'FONTE: ONS // CENTRO DE OPERAÇÃO DO SISTEMA (COS)',
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF'
}) => {
  const frame = useCurrentFrame();

  const enter = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  const deltaMw = generationMw - demandMw;
  const isBalanced = Math.abs(deltaMw) < 50;

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
          width: 1460,
          backgroundColor: 'rgba(6, 7, 9, 0.94)',
          border: '1px solid rgba(244, 244, 240, 0.16)',
          borderLeft: `6px solid ${isBalanced ? telemetryColor : accentColor}`,
          borderRadius: '8px',
          padding: '40px 52px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.85)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 28
        }}
      >
        {/* Topo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 22,
                fontWeight: 800,
                color: telemetryColor,
                letterSpacing: 2
              }}
            >
              // DESPACHO CENTRALIZADO DE ENERGIA
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 40,
                fontWeight: 850,
                color: '#F4F4F0',
                marginTop: 6
              }}
            >
              {title}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 20,
                color: '#8A8D9F'
              }}
            >
              FREQUÊNCIA DE REDE
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 54,
                fontWeight: 900,
                color: frequencyHz === 60.0 ? telemetryColor : accentColor,
                lineHeight: 1
              }}
            >
              {frequencyHz.toFixed(2)} Hz
            </div>
          </div>
        </div>

        {/* Barra de Balanço Visual (Dois Lados) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr', alignItems: 'center', gap: 24 }}>
          {/* Lado Geração */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '24px 32px'
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 18,
                color: telemetryColor,
                fontWeight: 700,
                letterSpacing: 1
              }}
            >
              [ GERAÇÃO TOTAL ATIVA ]
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 58,
                fontWeight: 900,
                color: '#F4F4F0',
                marginTop: 6,
                letterSpacing: -1
              }}
            >
              {generationMw.toLocaleString('pt-BR')} <span style={{ fontSize: 26, color: '#A4A6AE' }}>MW</span>
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 20,
                color: '#A4A6AE',
                marginTop: 6
              }}
            >
              UHE Itaipu + Belo Monte + Eólica + Térmica
            </div>
          </div>

          {/* Comparador Central */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                backgroundColor: isBalanced ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255, 85, 0, 0.15)',
                border: `2px solid ${isBalanced ? telemetryColor : accentColor}`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 32,
                fontWeight: 900,
                color: isBalanced ? telemetryColor : accentColor
              }}
            >
              {isBalanced ? '=' : '≠'}
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 18,
                fontWeight: 700,
                color: isBalanced ? telemetryColor : accentColor,
                marginTop: 8
              }}
            >
              Δ {deltaMw} MW
            </div>
          </div>

          {/* Lado Consumo */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '24px 32px'
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 18,
                color: accentColor,
                fontWeight: 700,
                letterSpacing: 1
              }}
            >
              [ DEMANDA NACIONAL (CARGA) ]
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 58,
                fontWeight: 900,
                color: '#F4F4F0',
                marginTop: 6,
                letterSpacing: -1
              }}
            >
              {demandMw.toLocaleString('pt-BR')} <span style={{ fontSize: 26, color: '#A4A6AE' }}>MW</span>
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 20,
                color: '#A4A6AE',
                marginTop: 6
              }}
            >
              Indústria + Comércio + Residências (Tempo Real)
            </div>
          </div>
        </div>

        {/* Rodapé Informativo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, color: '#A4A6AE' }}>
            REGRA INVIOLÁVEL: Se a Demanda exceder a Geração, a frequência cai em milissegundos.
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: '#8A8D9F' }}>
            {sourceText}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
