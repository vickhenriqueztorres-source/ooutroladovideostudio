import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';
import {
  IsometricViewport,
  IsometricGrid,
  IsometricCuboid,
  IsometricSliceLaser,
  IsometricTelemetryPin
} from '../motion-documentary/isometric3DPrimitives';

export interface RaioxaeroportoVolumetricCutawayRX015SceneProps {
  accentColor?: string;
  telemetryColor?: string;
  headerTag?: string;
  title?: string;
  subtitle?: string;
  durationInFrames?: number;
}

/**
 * 🔬 RaioxaeroportoVolumetricCutawayRX015Scene: Reconstrução Isométrica 3D Documental
 * Desenvolvido autonomamente pelo Squad de Motion Graphics.
 * Arquétipo: VOLUMETRIC_CUTAWAY
 * Mecanismo: Maços compactos de dólares, tabletes de cocaína e blocos de explosivo militar C4 compartilham o mesmo número atômico de uma barra de chocolate.
 */
export const RaioxaeroportoVolumetricCutawayRX015Scene: React.FC<RaioxaeroportoVolumetricCutawayRX015SceneProps> = ({
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF',
  headerTag = 'RAIO-X 3D // VOLUMETRIC CUTAWAY',
  title = 'CORTE VOLUMÉTRICO MICROMÉTRICO // RX_015',
  subtitle = 'TOLERÂNCIA ESTRUTURAL: ±0.01 MILÍMETROS (mm) | ISO 9001',
  durationInFrames = 240
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. Entrada Elástica Isométrica
  const entrance = spring({
    frame,
    fps,
    config: { damping: 18, mass: 0.8, stiffness: 85 }
  });

  // 2. Animação de Varredura Laser de Corte
  const laserSlice = spring({
    frame: Math.max(0, frame - 27),
    fps,
    config: { damping: 16, mass: 1, stiffness: 60 }
  });

  // 3. Afastamento Volumétrico das Camadas (Layer Separation)
  const layerSplit = interpolate(
    laserSlice,
    [0.3, 1],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // 4. Oscilação Sutil de Respiração da Câmera (Drift)
  const cameraDrift = Math.sin(frame * 0.03) * 1.5;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#060709',
        color: '#F4F4F0',
        overflow: 'hidden',
        fontFamily: "'JetBrains Mono', monospace"
      }}
    >
      {/* Grade Sutil de Fundo */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(255,85,0,0.06) 0%, transparent 70%), linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 60px 60px, 60px 60px',
          opacity: entrance
        }}
      />

      {/* Cabeçalho Editorial CAD / Investigativo */}
      <div
        style={{
          position: 'absolute',
          top: 50,
          left: 70,
          zIndex: 40,
          opacity: entrance
        }}
      >
        <div
          style={{
            fontSize: 18,
            color: telemetryColor,
            letterSpacing: 3,
            fontWeight: 800,
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div
            style={{
              width: 10, height: 10,
              borderRadius: '50%',
              backgroundColor: accentColor,
              boxShadow: `0 0 12px ${accentColor}`
            }}
          />
          {headerTag}
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 46, fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            color: '#F4F4F0',
            maxWidth: 920
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 18, color: '#8A8D9F', letterSpacing: 1.2, marginTop: 6
          }}
        >
          {subtitle}
        </div>
      </div>

      {/* Viewport Isométrico 3D com Projeção e Luz */}
      <IsometricViewport
        rotateX={62 + cameraDrift}
        rotateZ={-34 + cameraDrift * 0.5}
        scale={1.05 * entrance}
        perspective={1400}
      >
        {/* Grade CAD de Chão Isométrico */}
        <IsometricGrid size={900} divisions={18} opacity={0.6 * entrance} />

        {/* Camadas Estruturais do Mecanismo em 3D */}
        
        {/* Camada 1: BLINDAGEM EXTERNA DE AÇO */}
        <IsometricCuboid
          key="LAYER_EXTERNAL_SHELL"
          width={540}
          height={320}
          depth={24}
          elevation={(120 + (0 * 28 * layerSplit))}
          topColor="rgba(28, 33, 44, 0.85)"
          leftColor="rgba(18, 22, 30, 0.9)"
          rightColor="rgba(10, 12, 18, 0.95)"
          borderColor="rgba(255, 255, 255, 0.12)"
          opacity={0.9 * entrance}
        />

        {/* Camada 2: CÂMARA TÉCNICA OPERACIONAL */}
        <IsometricCuboid
          key="LAYER_INTERNAL_CHAMBER"
          width={540}
          height={320}
          depth={24}
          elevation={(0 + (1 * 28 * layerSplit))}
          topColor="rgba(255, 85, 0, 0.22)"
          leftColor="rgba(255, 85, 0, 0.15)"
          rightColor="rgba(255, 85, 0, 0.08)"
          borderColor="#FF5500"
          opacity={0.85 * entrance}
        />

        {/* Camada 3: BASE ESTRUTURAL DE FIXAÇÃO */}
        <IsometricCuboid
          key="LAYER_BASE_CHASSIS"
          width={540}
          height={320}
          depth={24}
          elevation={(-80 + (2 * 28 * layerSplit))}
          topColor="rgba(28, 33, 44, 0.85)"
          leftColor="rgba(18, 22, 30, 0.9)"
          rightColor="rgba(10, 12, 18, 0.95)"
          borderColor="rgba(255, 255, 255, 0.12)"
          opacity={0.95 * entrance}
        />

        {/* Lâmina Laser Ativa de Corte Transversal */}
        {laserSlice > 0.05 && laserSlice < 0.98 && (
          <IsometricSliceLaser
            width={580}
            height={360}
            depth={160}
            sliceProgress={laserSlice}
            laserColor={accentColor}
          />
        )}

        {/* Pinos de Telemetria CAD Tridimensional */}
        
        <IsometricTelemetryPin
          key="pin-0"
          x={-180}
          y={100}
          z={120}
          tagTitle="TOLERÂNCIA ESTRUTURAL"
          tagValue="±0.01"
          unit="MILÍMETROS (mm)"
          accentColor={accentColor}
          telemetryColor={telemetryColor}
          opacity={laserSlice > 0.4 ? 1 : 0}
        />

        <IsometricTelemetryPin
          key="pin-1"
          x={160}
          y={-90}
          z={150}
          tagTitle="ESTADO TÉCNICO"
          tagValue="CALIBRADO"
          unit="AUDITORIA NÍVEL 1"
          accentColor={accentColor}
          telemetryColor={telemetryColor}
          opacity={laserSlice > 0.4 ? 1 : 0}
        />
      </IsometricViewport>

      {/* Painel Inferior Direito de Metrologia & Normas */}
      <div
        style={{
          position: 'absolute',
          bottom: 50,
          right: 70,
          zIndex: 40,
          display: 'flex',
          gap: 16,
          opacity: entrance
        }}
      >
        
        <div
          key="TOLERÂNCIA ESTRUTURAL"
          style={{
            backgroundColor: 'rgba(13, 14, 21, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderLeft: `4px solid ${accentColor}`,
            padding: '14px 22px',
            backdropFilter: 'blur(8px)',
            borderRadius: 4
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: '#8A8D9F', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            TOLERÂNCIA ESTRUTURAL
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#F4F4F0', marginTop: 4 }}>
            <span style={{ color: accentColor }}>±0.01</span> <span style={{ fontSize: 17, fontWeight: 500, color: '#A1A1AA' }}>MILÍMETROS (mm)</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: telemetryColor, marginTop: 4, letterSpacing: 1 }}>ISO 9001</div>
        </div>

        <div
          key="ESTADO TÉCNICO"
          style={{
            backgroundColor: 'rgba(13, 14, 21, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderLeft: `4px solid ${accentColor}`,
            padding: '14px 22px',
            backdropFilter: 'blur(8px)',
            borderRadius: 4
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: '#8A8D9F', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            ESTADO TÉCNICO
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#F4F4F0', marginTop: 4 }}>
            <span style={{ color: accentColor }}>CALIBRADO</span> <span style={{ fontSize: 17, fontWeight: 500, color: '#A1A1AA' }}>AUDITORIA NÍVEL 1</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: telemetryColor, marginTop: 4, letterSpacing: 1 }}>LAUDO FORENSE</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
