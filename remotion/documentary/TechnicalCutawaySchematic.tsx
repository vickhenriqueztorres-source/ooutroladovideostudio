import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

export interface TechnicalCutawaySchematicProps {
  systemTitle?: string;
  compartmentName?: string;
  compartmentSpecs?: string[];
  schematicTag?: string;
  accentColor?: string;
  telemetryColor?: string;
  archetype?: 'aircraft' | 'conduit_gallery' | 'chassis_terminal' | 'orbital_satellite' | 'electronic_rack';
}

/**
 * Componente Documental Estilo Neo (How the U.S. Doomsday Plane Works)
 * Esquema técnico 3D com corte transversal (Cutaway / X-Ray) e chamada HUD ancorada.
 */
export const TechnicalCutawaySchematic: React.FC<TechnicalCutawaySchematicProps> = ({
  systemTitle = '',
  compartmentName = '',
  compartmentSpecs = [],
  schematicTag = '',
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF',
  archetype
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Curva de mola suave para revelação da telemetria
  const revealProgress = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: {damping: 16, stiffness: 70}
  });

  const cameraScale = interpolate(frame, [0, 150], [1.0, 1.07]);
  const cameraPanX = interpolate(frame, [0, 150], [0, -25]);

  const calloutLineLength = interpolate(revealProgress, [0, 1], [0, 220]);
  const cardOpacity = interpolate(revealProgress, [0.3, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'rgba(10, 11, 16, 0.78)',
        backdropFilter: 'blur(6px)',
        overflow: 'hidden',
        fontFamily: 'JetBrains Mono, Courier, monospace',
        color: '#F4F4F0'
      }}
    >
      {/* Grid de Engenharia de Fundo */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Cabeçalho Técnico Superior */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 80,
          zIndex: 10,
          maxWidth: 900
        }}
      >
        <div style={{fontSize: 12, color: telemetryColor, letterSpacing: 2}}>
          {schematicTag}
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: 1.5,
            color: '#F4F4F0'
          }}
        >
          {systemTitle}
        </div>
      </div>

      {/* Corpo da Reconstrução 3D / Wireframe com Câmera Push-in */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${cameraScale}) translateX(${cameraPanX}px)`,
          transformOrigin: 'center center'
        }}
      >
        {/* Silhueta Vetorial do Sistema Paramétrica */}
        <svg viewBox="0 0 1600 800" style={{width: '90%', height: '80%'}}>
          {archetype === 'conduit_gallery' ? (
            <>
              {/* Duto Subterrâneo: Anéis de concreto e esteiras de cabos */}
              <rect x="250" y="240" width="1100" height="320" rx="20" fill="rgba(18, 20, 28, 0.75)" stroke="rgba(244, 244, 240, 0.25)" strokeWidth="2.5" />
              <line x1="250" y1="300" x2="1350" y2="300" stroke="rgba(255,255,255,0.12)" strokeDasharray="6 4" />
              <line x1="250" y1="500" x2="1350" y2="500" stroke="rgba(255,255,255,0.12)" strokeDasharray="6 4" />
              {/* Feixes de Fibra Óptica */}
              <path d="M 280,340 C 500,350 800,330 1320,340" fill="none" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="3" />
              <path d="M 280,380 C 500,390 800,370 1320,380" fill="none" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="3" />
              <path d="M 280,420 C 500,410 800,430 1320,420" fill="none" stroke="rgba(0, 240, 255, 0.6)" strokeWidth="4" />
              {/* Duto Blindado Crítico Ativo */}
              <rect x="680" y="320" width="320" height="160" rx="8" fill="rgba(255, 85, 0, 0.22)" stroke={accentColor} strokeWidth="3" style={{filter: `drop-shadow(0 0 22px ${accentColor})`}} />
              <circle cx="840" cy="400" r="8" fill={accentColor} style={{filter: `drop-shadow(0 0 12px ${accentColor})`}} />
              <circle cx="840" cy="400" r="16" fill="none" stroke={telemetryColor} strokeWidth="1.5" />
            </>
          ) : archetype === 'chassis_terminal' ? (
            <>
              {/* Chassis de Terminal Seguro */}
              <rect x="300" y="220" width="1000" height="360" rx="12" fill="rgba(20, 22, 32, 0.85)" stroke="rgba(244, 244, 240, 0.25)" strokeWidth="3" />
              {/* Blindagem de Faraday Interna */}
              <rect x="340" y="260" width="920" height="280" rx="6" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
              {/* Chip / Módulo Criptográfico em Destaque */}
              <rect x="740" y="320" width="200" height="160" rx="8" fill="rgba(255, 85, 0, 0.25)" stroke={accentColor} strokeWidth="3" style={{filter: `drop-shadow(0 0 25px ${accentColor})`}} />
              <circle cx="840" cy="400" r="7" fill={accentColor} style={{filter: `drop-shadow(0 0 10px ${accentColor})`}} />
              <circle cx="840" cy="400" r="15" fill="none" stroke={telemetryColor} strokeWidth="1.5" />
            </>
          ) : archetype === 'orbital_satellite' ? (
            <>
              {/* Satélite: Corpo Central e Painéis Solares */}
              <rect x="650" y="300" width="300" height="200" rx="10" fill="rgba(22, 25, 36, 0.85)" stroke="rgba(244, 244, 240, 0.3)" strokeWidth="3" />
              {/* Painel Solar Esquerdo */}
              <rect x="250" y="330" width="350" height="140" fill="rgba(0, 240, 255, 0.15)" stroke="rgba(0, 240, 255, 0.5)" strokeWidth="2" />
              {/* Painel Solar Direito */}
              <rect x="1000" y="330" width="350" height="140" fill="rgba(0, 240, 255, 0.15)" stroke="rgba(0, 240, 255, 0.5)" strokeWidth="2" />
              {/* Antena Parabólica / Transponder Militar */}
              <path d="M 800,290 C 720,200 880,200 800,290" fill="rgba(255,85,0,0.25)" stroke={accentColor} strokeWidth="3" />
              <circle cx="800" cy="240" r="8" fill={accentColor} style={{filter: `drop-shadow(0 0 12px ${accentColor})`}} />
              <circle cx="800" cy="240" r="16" fill="none" stroke={telemetryColor} strokeWidth="1.5" />
            </>
          ) : (
            <>
              {/* Silhueta Clássica de Fuselagem / Aeronave Presidencial VC-1 */}
              <path d="M 200,400 Q 300,320 800,320 L 1300,340 Q 1450,380 1500,400 Q 1450,420 1300,460 L 800,480 Q 300,480 200,400 Z" fill="rgba(22, 24, 36, 0.6)" stroke="rgba(244, 244, 240, 0.2)" strokeWidth="2" />
              <line x1="450" y1="330" x2="450" y2="470" stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
              <line x1="700" y1="325" x2="700" y2="475" stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
              <line x1="980" y1="330" x2="980" y2="470" stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
              <rect x="710" y="340" width="260" height="120" rx="4" fill="rgba(255, 85, 0, 0.22)" stroke={accentColor} strokeWidth="3" style={{filter: `drop-shadow(0 0 20px ${accentColor})`}} />
              <circle cx="840" cy="400" r="7" fill={accentColor} style={{filter: `drop-shadow(0 0 10px ${accentColor})`}} />
              <circle cx="840" cy="400" r="14" fill="none" stroke={telemetryColor} strokeWidth="1.5" />
            </>
          )}
        </svg>

        {/* Linha de Conexão HUD para o Card Técnico */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}
        >
          <path
            d={`M 980,480 L 1150,320 L ${1150 + calloutLineLength},320`}
            fill="none"
            stroke={telemetryColor}
            strokeWidth="2"
            strokeDasharray="6 3"
          />
        </svg>

        {/* Card Flutuante de Especificações HUD */}
        <div
          style={{
            position: 'absolute',
            left: 1170,
            top: 210,
            width: 440,
            backgroundColor: 'rgba(6, 7, 9, 0.92)',
            border: `1px solid ${accentColor}`,
            borderLeft: `4px solid ${accentColor}`,
            boxShadow: '0 15px 40px rgba(0,0,0,0.85)',
            padding: '24px 28px',
            opacity: cardOpacity,
            transform: `translateY(${(1 - cardOpacity) * 15}px)`
          }}
        >
          <div style={{color: accentColor, fontWeight: 900, fontSize: 16, letterSpacing: 1.5}}>
            {compartmentName}
          </div>
          <div style={{marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10}}>
            {compartmentSpecs.map((spec, idx) => (
              <div key={idx} style={{fontSize: 12, color: '#C5C7D0', display: 'flex', alignItems: 'center'}}>
                <span style={{color: telemetryColor, marginRight: 8, fontSize: 14}}>▸</span>
                <span>{spec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
