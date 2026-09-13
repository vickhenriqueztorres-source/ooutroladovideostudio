import fs from 'fs';
import path from 'path';
import { MotionChoreography } from './isometric3DArtDirector';
import { Logger } from '../../event-hub/logger';

export class RemotionMotionDeveloper {
  private static readonly NAME = 'RemotionMotionDeveloper';

  /**
   * Gera o código-fonte React/Remotion (.tsx) completo do componente 3D,
   * salva no disco em remotion/documentary/ e auto-registra no componentRegistry.
   */
  public static developAndRegister(choreography: MotionChoreography): {
    filePath: string;
    componentName: string;
    code: string;
  } {
    const { blueprint, viewport, timing, hudProps } = choreography;
    const componentName = blueprint.componentName;
    Logger.info(this.NAME, `Desenvolvendo componente de motion 3D '${componentName}'...`);

    const code = this.generateComponentCode(choreography);

    const isNode = typeof process !== 'undefined' && typeof process.cwd === 'function' && typeof fs?.writeFileSync === 'function';
    if (!isNode) {
      return {
        filePath: `remotion/documentary/${componentName}.tsx`,
        componentName,
        code
      };
    }

    // 1. Salva o arquivo em remotion/documentary/ se não existir
    const targetDir = path.join(process.cwd(), 'remotion', 'documentary');
    const targetFile = path.join(targetDir, `${componentName}.tsx`);
    if (!fs.existsSync(targetFile)) {
      fs.writeFileSync(targetFile, code, 'utf8');
      Logger.info(this.NAME, `Componente salvo em: ${targetFile}`);

      // 2. Auto-registra no remotion/documentary/index.ts
      this.registerInDocumentaryIndex(componentName);

      // 3. Auto-registra no remotion/cinema/componentRegistry.ts
      this.registerInComponentRegistry(componentName);
    }

    try {
      const { registerSceneComponent } = require('../../remotion/cinema/componentRegistry');
      registerSceneComponent(componentName, () => null as any);
    } catch (e) {}

    return {
      filePath: targetFile,
      componentName,
      code
    };
  }

  private static generateComponentCode(choreography: MotionChoreography): string {
    const { blueprint, viewport, timing, hudProps } = choreography;
    const compName = blueprint.componentName;
    const layers = blueprint.layers;
    const vars = blueprint.physicalVariables;

    return `import React from 'react';
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

export interface ${compName}Props {
  accentColor?: string;
  telemetryColor?: string;
  headerTag?: string;
  title?: string;
  subtitle?: string;
  durationInFrames?: number;
}

/**
 * 🔬 ${compName}: Reconstrução Isométrica 3D Documental
 * Desenvolvido autonomamente pelo Squad de Motion Graphics.
 * Arquétipo: ${blueprint.archetype}
 * Mecanismo: ${blueprint.mechanismDescription.replace(/\n/g, ' ')}
 */
export const ${compName}: React.FC<${compName}Props> = ({
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF',
  headerTag = '${hudProps.headerTag}',
  title = '${hudProps.title}',
  subtitle = '${hudProps.subtitle}',
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
    frame: Math.max(0, frame - ${timing.laserSliceStartFrame}),
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
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: accentColor,
              boxShadow: \`0 0 12px \${accentColor}\`
            }}
          />
          {headerTag}
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 46,
            fontWeight: 900,
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
            fontSize: 18,
            color: '#8A8D9F',
            letterSpacing: 1.2,
            marginTop: 6
          }}
        >
          {subtitle}
        </div>
      </div>

      {/* Viewport Isométrico 3D com Projeção e Luz */}
      <IsometricViewport
        rotateX={${viewport.rotateX} + cameraDrift}
        rotateZ={${viewport.rotateZ} + cameraDrift * 0.5}
        scale={${viewport.scale} * entrance}
        perspective={${viewport.perspective}}
      >
        {/* Grade CAD de Chão Isométrico */}
        <IsometricGrid size={900} divisions={18} opacity={0.6 * entrance} />

        {/* Camadas Estruturais do Mecanismo em 3D */}
        ${layers.map((layer, idx) => {
          const depthZ = layer.depthOffset * 4;
          const isCrit = layer.critical;
          const topCol = isCrit ? 'rgba(255, 85, 0, 0.22)' : 'rgba(28, 33, 44, 0.85)';
          const leftCol = isCrit ? 'rgba(255, 85, 0, 0.15)' : 'rgba(18, 22, 30, 0.9)';
          const rightCol = isCrit ? 'rgba(255, 85, 0, 0.08)' : 'rgba(10, 12, 18, 0.95)';
          const bordCol = isCrit ? '#FF5500' : 'rgba(255, 255, 255, 0.12)';

          return `
        {/* Camada ${idx + 1}: ${layer.label} */}
        <IsometricCuboid
          key="${layer.id}"
          width={540}
          height={320}
          depth={24}
          elevation={(${depthZ} + (${idx} * 28 * layerSplit))}
          topColor="${topCol}"
          leftColor="${leftCol}"
          rightColor="${rightCol}"
          borderColor="${bordCol}"
          opacity={${layer.opacity} * entrance}
        />`;
        }).join('\n')}

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
        ${vars.map((v, idx) => {
          const posX = (idx === 0 ? -180 : idx === 1 ? 160 : 0);
          const posY = (idx === 0 ? 100 : idx === 1 ? -90 : 120);
          const posZ = 120 + idx * 30;
          return `
        <IsometricTelemetryPin
          key="pin-${idx}"
          x={${posX}}
          y={${posY}}
          z={${posZ}}
          tagTitle="${v.name}"
          tagValue="${v.value}"
          unit="${v.unit}"
          accentColor={accentColor}
          telemetryColor={telemetryColor}
          opacity={laserSlice > 0.4 ? 1 : 0}
        />`;
        }).join('\n')}
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
        ${vars.map((v) => `
        <div
          key="${v.name}"
          style={{
            backgroundColor: 'rgba(13, 14, 21, 0.88)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderLeft: \`4px solid \${accentColor}\`,
            padding: '14px 22px',
            backdropFilter: 'blur(8px)',
            borderRadius: 4
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: '#8A8D9F', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            ${v.name}
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#F4F4F0', marginTop: 4 }}>
            <span style={{ color: accentColor }}>${v.value}</span> <span style={{ fontSize: 17, fontWeight: 500, color: '#A1A1AA' }}>${v.unit}</span>
          </div>
          ${v.standard ? `<div style={{ fontSize: 14, fontWeight: 700, color: telemetryColor, marginTop: 4, letterSpacing: 1 }}>${v.standard}</div>` : ''}
        </div>`).join('\n')}
      </div>
    </AbsoluteFill>
  );
};
`;
  }

  private static registerInDocumentaryIndex(componentName: string): void {
    const indexPath = path.join(process.cwd(), 'remotion', 'documentary', 'index.ts');
    let content = fs.readFileSync(indexPath, 'utf8');
    const exportLine = `export * from './${componentName}';`;

    if (!content.includes(exportLine)) {
      content = `${content.trim()}\n${exportLine}\n`;
      fs.writeFileSync(indexPath, content, 'utf8');
      Logger.info(this.NAME, `Exportado em remotion/documentary/index.ts: ${exportLine}`);
    }
  }

  private static registerInComponentRegistry(componentName: string): void {
    const regPath = path.join(process.cwd(), 'remotion', 'cinema', 'componentRegistry.ts');
    let content = fs.readFileSync(regPath, 'utf8');

    if (!content.includes(`${componentName}: DocumentaryComponents.${componentName}`)) {
      // Adiciona antes do fechamento do objeto SCENE_COMPONENT_REGISTRY
      content = content.replace(
        /(export const SCENE_COMPONENT_REGISTRY: Record<string, React\.ComponentType<any>> = {[^}]*)/s,
        `$1  ${componentName}: DocumentaryComponents.${componentName},\n`
      );
      fs.writeFileSync(regPath, content, 'utf8');
      Logger.info(this.NAME, `Registrado em remotion/cinema/componentRegistry.ts: ${componentName}`);
    }
  }
}
