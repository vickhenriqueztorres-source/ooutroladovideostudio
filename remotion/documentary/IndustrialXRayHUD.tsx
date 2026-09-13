import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {HslOverlaySpecV1} from '../../hsl/types/overlaySpec';

export interface IndustrialXRayHUDProps {
  spec?: Partial<HslOverlaySpecV1>;
  sceneNumber?: string;
  title?: string;
  subtitle?: string;
  bulletPoints?: string[];
  latencyMs?: number;
  transactionsPerSec?: string;
  systemStressPercent?: number;
  sourceText?: string;
  dateText?: string;
  accentColor?: string;
  telemetryColor?: string;
  nodeTitle?: string;
  nodeStatus?: string;
  nodeLayer?: string;
  metricLabel?: string;
  metricValue?: string;
  flowTitle?: string;
  flowStages?: string[];
  currentFlowIndex?: number;
}

/**
 * Componente IndustrialXRayHUD — O Sistema Gráfico 4K Oficial do Canal O Outro Lado
 * Renderiza em vetor/HTML/CSS nítido toda a telemetria, títulos, latência, gráficos
 * e carimbos regulatórios por cima do vídeo limpo gerado pelo Firefly.
 */
export const IndustrialXRayHUD: React.FC<IndustrialXRayHUDProps> = ({
  spec,
  sceneNumber = '',
  title = '',
  subtitle = '',
  bulletPoints = [],
  latencyMs = 0,
  transactionsPerSec = '',
  systemStressPercent = 0,
  sourceText = '',
  dateText = '',
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF',
  nodeTitle,
  nodeStatus,
  nodeLayer,
  metricLabel,
  metricValue,
  flowTitle,
  flowStages,
  currentFlowIndex
}) => {
  const frame = useCurrentFrame();

  const activeTitle = spec?.title || title;
  const activeSubtitle = spec?.subtitle || subtitle;
  const activeSceneTag = spec?.chapterTag || sceneNumber;

  // Animação de entrada suave dos elementos HUD
  const hudOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  // Pulso do sparkline de latência
  const sparklineOffset = (frame * 2) % 40;
  const pulseScale = Math.sin(frame * 0.2) * 0.15 + 0.85;

  return (
    <AbsoluteFill
      style={{
        opacity: hudOpacity,
        fontFamily: 'JetBrains Mono, Courier, monospace',
        color: '#F4F4F0',
        pointerEvents: 'none',
        padding: '40px 60px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        zIndex: 20
      }}
    >
      {/* 1. TOPO: Metadados Superiores */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        {/* Esquerda Superior: Identificação da Série */}
        <div>
          <div style={{fontSize: 12, letterSpacing: 2, color: '#8A8D9F'}}>
            O OUTRO LADO
          </div>
          <div style={{fontSize: 11, letterSpacing: 1.5, color: accentColor, marginTop: 3}}>
            IDENTIDADE VISUAL — INDUSTRIAL X-RAY
          </div>
        </div>

        {/* Direita Superior: Status do Nó & Latência */}
        <div style={{display: 'flex', gap: 24}}>
          {/* Card de Status do Nó */}
          <div
            style={{
              backgroundColor: 'rgba(6, 7, 9, 0.82)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '12px 18px',
              minWidth: 200
            }}
          >
            <div style={{fontSize: 10, color: '#8A8D9F', letterSpacing: 1}}>
              {nodeTitle || spec?.regulatorySource?.documentTitle || spec?.chapterTag || 'SISTEMA DE TELEMETRIA // NÓ ATIVO'}
            </div>
            <div style={{fontSize: 12, color: accentColor, fontWeight: 900, marginTop: 4}}>
              {nodeStatus || 'STATUS: OPERACIONAL'}
            </div>
            <div style={{fontSize: 10, color: telemetryColor, marginTop: 2}}>
              {nodeLayer || 'CAMADA: ENCRIPTAÇÃO & CONTROLE'}
            </div>
          </div>

          {/* Card de Latência com Sparkline */}
          <div
            style={{
              backgroundColor: 'rgba(6, 7, 9, 0.82)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '12px 18px',
              minWidth: 160
            }}
          >
            <div style={{fontSize: 10, color: '#8A8D9F', letterSpacing: 1}}>
              LATÊNCIA ATUAL
            </div>
            <div style={{fontSize: 22, fontWeight: 900, color: accentColor, marginTop: 2}}>
              {latencyMs} <span style={{fontSize: 12}}>ms</span>
            </div>
            <div style={{fontSize: 9, color: '#8A8D9F'}}>
              IDEAL &lt; 100ms
            </div>
            {/* Gráfico Sparkline de Onda */}
            <svg viewBox="0 0 100 20" style={{width: '100%', height: 16, marginTop: 4}}>
              <path
                d="M 0,15 Q 25,5 50,12 T 100,8"
                fill="none"
                stroke={telemetryColor}
                strokeWidth="1.5"
                strokeDasharray="4 2"
                strokeDashoffset={-sparklineOffset}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 2. CENTRO: Título Editorial & Painel de Verificação */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        {/* Bloco Editorial Esquerdo (Título e Tese) */}
        <div style={{maxWidth: 580}}>
          <div style={{fontSize: 14, fontWeight: 900, color: '#8A8D9F', letterSpacing: 2}}>
            {activeSceneTag}
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 900,
              fontFamily: 'Bebas Neue, Impact, sans-serif',
              letterSpacing: 2,
              lineHeight: 1.05,
              color: '#F4F4F0',
              marginTop: 8,
              textShadow: '0 4px 20px rgba(0,0,0,0.9)'
            }}
          >
            {activeTitle}
          </div>
          <div style={{marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6}}>
            {bulletPoints.map((point, index) => (
              <div
                key={index}
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: point.includes('RASTROS') || point.includes('MILISSEGUNDOS') || point.includes('INVISÍVEL') ? accentColor : '#C5C7D0',
                  letterSpacing: 1
                }}
              >
                {point}
              </div>
            ))}
          </div>

          {/* Barra de Estresse do Sistema */}
          <div
            style={{
              marginTop: 32,
              backgroundColor: 'rgba(6, 7, 9, 0.82)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '12px 18px',
              maxWidth: 320
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#8A8D9F'}}>
              <span>ESTRESSE DO SISTEMA</span>
              <span style={{color: accentColor, fontWeight: 900}}>{systemStressPercent}%</span>
            </div>
            {/* Barra Segmentada */}
            <div style={{display: 'flex', gap: 4, marginTop: 8}}>
              {Array.from({length: 12}).map((_, i) => {
                const isFilled = i < Math.floor((systemStressPercent / 100) * 12);
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 8,
                      backgroundColor: isFilled ? accentColor : 'rgba(255,255,255,0.1)',
                      transform: 'skewX(-20deg)',
                      boxShadow: isFilled ? `0 0 6px ${accentColor}` : 'none'
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Bloco de Telemetria Direito (Fluxo de Verificação) */}
        <div
          style={{
            backgroundColor: 'rgba(6, 7, 9, 0.88)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '20px 24px',
            minWidth: 380,
            boxShadow: '0 20px 50px rgba(0,0,0,0.85)'
          }}
        >
          <div style={{fontSize: 11, letterSpacing: 1.5, color: '#8A8D9F', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8}}>
            {flowTitle || 'FLUXO DE VERIFICAÇÃO'}
          </div>

          {/* Estágios do Fluxo */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16}}>
            {(flowStages || ['ENTRADA', 'ISOLAMENTO', 'AUDITORIA', 'VEREDITO']).map((stage, idx) => {
              const activeIdx = currentFlowIndex !== undefined ? currentFlowIndex : 2;
              const isCurrent = idx === activeIdx;
              return (
                <div key={idx} style={{textAlign: 'center', opacity: isCurrent ? 1 : 0.45}}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 4,
                      backgroundColor: isCurrent ? 'rgba(255,85,0,0.25)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isCurrent ? accentColor : 'rgba(255,255,255,0.2)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 6px',
                      color: isCurrent ? accentColor : '#F4F4F0',
                      fontSize: 14
                    }}
                  >
                    {idx === 0 ? '⛯' : idx === 1 ? '⚛' : idx === 2 ? '⚡' : '🎯'}
                  </div>
                  <div style={{fontSize: 9, color: isCurrent ? accentColor : '#8A8D9F', fontWeight: 900}}>
                    {stage}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Métrica Dinâmica / Taxa */}
          <div style={{marginTop: 20, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <div style={{fontSize: 9, color: '#8A8D9F'}}>{metricLabel || 'TAXA DE PROCESSAMENTO'}</div>
              <div style={{fontSize: 18, fontWeight: 900, color: telemetryColor, marginTop: 2}}>
                {metricValue || transactionsPerSec || '10.000 ops/s'}
              </div>
            </div>
            {/* Gráfico de Barras Miniatura */}
            <div style={{display: 'flex', gap: 3, alignItems: 'flex-end', height: 24}}>
              {[8, 14, 18, 12, 22, 16, 20, 24, 19].map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: 3,
                    height: h,
                    backgroundColor: telemetryColor,
                    opacity: 0.6 + (i / 9) * 0.4
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. BASE: Rodapé de Autenticidade, Branding & Fonte Regulatória */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 20}}>
        {/* Esquerda: Logo Split-Core + Tagline Oficial */}
        <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
          {/* Símbolo Split Core */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: '#0D0E15',
              border: '2px solid rgba(255,255,255,0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Fenda Laranja Central */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '50%',
                width: 2,
                backgroundColor: accentColor,
                boxShadow: `0 0 8px ${accentColor}`
              }}
            />
            {/* Metade Raio-X */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: 0,
                width: '50%',
                backgroundColor: 'rgba(255,85,0,0.35)'
              }}
            />
          </div>

          <div>
            <div style={{fontSize: 15, fontWeight: 900, fontFamily: 'Bebas Neue, Impact, sans-serif', letterSpacing: 2, color: '#F4F4F0'}}>
              <span style={{color: accentColor}}>O</span> OUTRO LADO
            </div>
            <div style={{fontSize: 9, letterSpacing: 2, color: '#8A8D9F', marginTop: 2}}>
              INVESTIGAR. <span style={{color: accentColor}}>REVELAR.</span> COMPREENDER.
            </div>
          </div>
        </div>

        {/* Direita: Carimbo da Fonte Reguladora */}
        <div style={{textAlign: 'right', fontSize: 10, color: '#8A8D9F', letterSpacing: 1}}>
          <div>{sourceText}</div>
          <div style={{marginTop: 3, color: '#6A6D7F'}}>{dateText}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
