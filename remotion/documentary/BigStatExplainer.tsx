import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export interface BigStatExplainerProps {
  statValue?: string | number;
  statUnit?: string;
  unitText?: string;
  categoryBadge?: string;
  badgeText?: string;
  headline?: string;
  title?: string;
  description?: string;
  sourceText?: string;
  accentColor?: string;
  telemetryColor?: string;
}

/**
 * 📊 BigStatExplainer: Card de Grande Revelação Numérica e Escala
 * Destaca grandezas físicas e de engenharia monumentais com leitura instantânea.
 */
export const BigStatExplainer: React.FC<BigStatExplainerProps> = (props) => {
  const statValue = props.statValue ?? '800.000';
  const statUnit = props.statUnit || props.unitText || 'UNIDADES';
  const categoryBadge = props.categoryBadge || props.badgeText || 'POTÊNCIA DE ULTRA-ALTA TENSÃO';
  const headline = props.headline || props.title || 'TRANSMISSÃO EM CORRENTE CONTÍNUA (HVDC)';
  const description = props.description || 'A eletricidade sai de Belo Monte e cruza mais de 2.500 km pelo meio da Amazônia até os centros de carga do Sudeste sem perder estabilidade.';
  const sourceText = props.sourceText || 'FONTE: ONS // LINHÃO DE TRANSMISSÃO XINGU-RIO';
  const accentColor = props.accentColor || '#FF5500';
  const telemetryColor = props.telemetryColor || '#00F0FF';
  const frame = useCurrentFrame();

  const enter = interpolate(frame, [0, 12], [0, 1], {
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
          width: 1420,
          backgroundColor: 'rgba(6, 7, 9, 0.94)',
          border: '1px solid rgba(244, 244, 240, 0.16)',
          borderTop: `5px solid ${accentColor}`,
          borderRadius: '8px',
          padding: '44px 56px',
          boxShadow: '0 24px 70px rgba(0,0,0,0.9)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 24
        }}
      >
        {/* Topo / Categoria */}
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

        {/* Linha do Número Monumental */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 104,
              fontWeight: 900,
              color: '#F4F4F0',
              lineHeight: 1,
              letterSpacing: -2,
              textShadow: '0 4px 24px rgba(0,0,0,0.9)'
            }}
          >
            {statValue}
          </div>
          {statUnit && (
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 48,
                fontWeight: 850,
                color: accentColor,
                letterSpacing: 1,
                textTransform: 'uppercase'
              }}
            >
              {statUnit}
            </div>
          )}
        </div>

        {/* Título & Descrição Contextual */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 36,
              fontWeight: 850,
              color: '#F4F4F0',
              letterSpacing: -0.5,
              textTransform: 'uppercase'
            }}
          >
            {headline}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 24,
              color: '#A4A6AE',
              lineHeight: 1.45,
              maxWidth: 1260
            }}
          >
            {description}
          </div>
        </div>

        {/* Traço de Conclusão */}
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
          <span>MÉTRICA COMPROVADA EM CAMPO</span>
          <span style={{ color: telemetryColor, fontWeight: 700 }}>AUDITORIA FORENSE ATIVA</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
