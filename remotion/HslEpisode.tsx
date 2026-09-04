import React from 'react';
import {AbsoluteFill, Audio, Sequence, Video, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {HslEpisodeRenderProps, HslRenderScene} from './types';
import {MotionModule} from './motion/MotionModules';
import {buildMotionDesign, stripShotIntent} from '../hsl/motion/motionDesign';
import {
  AnamorphicCinematicOverlay,
  AtomicStopwatch,
  CyberMapTrace,
  DocumentaryTextTyper,
  IndustrialXRayHUD,
  KineticEditorialCallout,
  KineticNumberCounter,
  LaserRevealWipe,
  LaserScanDossier,
  OnScreenResearchLapse,
  ParallaxRackFocus,
  TechnicalCutawaySchematic,
  VlfSubmarineAntennaTrace
} from './documentary';
import {HSL_BRAND_IDENTITY, HSL_COLOR_TOKENS} from '../spec/hsl-spec';

const tokens = {
  background: HSL_COLOR_TOKENS.CARBON_BLACK,     // #060709
  surface: HSL_COLOR_TOKENS.DEEP_STEEL,          // #0D0E15
  border: 'rgba(255, 255, 255, 0.12)',
  primaryOrange: HSL_COLOR_TOKENS.SODIUM_ORANGE, // #FF5500
  telemetryCyan: HSL_COLOR_TOKENS.LASER_CYAN,    // #00F0FF
  glass: HSL_COLOR_TOKENS.FROSTED_GLASS,         // rgba(255, 255, 255, 0.08)
  text: HSL_COLOR_TOKENS.TITANIUM_WHITE,         // #F4F4F0
  muted: HSL_COLOR_TOKENS.MUTED_SLATE            // #8A8D9F
};

function accentFor(scene: HslRenderScene): string {
  if (scene.motionDesign?.accent === 'orange') return tokens.primaryOrange;
  if (scene.motionDesign?.accent === 'blue') return tokens.telemetryCyan;
  if (scene.motionDesign?.accent === 'yellow') return tokens.primaryOrange;
  const value = `${scene.narrativeFunction} ${scene.visualSubject}`.toLowerCase();
  if (/delay|blocked|constraint|bottleneck|hold|crisis|colapso/.test(value)) return tokens.primaryOrange;
  if (/quality|filter|verification|information|quantum|frequency|telemetria/.test(value)) return tokens.telemetryCyan;
  return tokens.primaryOrange;
}

const TypographyScene: React.FC<{scene: HslRenderScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const accent = accentFor(scene);
  const text = stripShotIntent(scene.visualSubject);
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  const emphasis = words.findIndex((word) => /NOT|NO|HIDDEN|TIME|TEMPO|RELÓGIO|INVISÍVEL|COLAPSO|CÉSIO|EINSTEIN/.test(word));
  const fontSize = text.length > 85 ? 58 : text.length > 58 ? 72 : 88;
  const line = interpolate(frame, [6, Math.min(34, scene.durationInFrames * 0.28)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const kicker = interpolate(frame, [scene.durationInFrames * 0.58, scene.durationInFrames * 0.76], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '150px 150px 120px', backgroundColor: tokens.background}}>
      <div style={{fontFamily: 'Bebas Neue, sans-serif', letterSpacing: 2, fontSize, lineHeight: 1.05, color: tokens.text, maxWidth: 1540}}>
        {words.map((word, index) => {
          const start = 8 + index * Math.max(2, Math.floor(28 / Math.max(1, words.length)));
          const wordReveal = interpolate(frame, [start, start + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return (
            <span
              key={`${word}-${index}`}
              style={{
                display: 'inline-block',
                marginRight: 18,
                color: index === emphasis ? accent : tokens.text,
                opacity: wordReveal,
                transform: `translateY(${(1 - wordReveal) * 24}px)`
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
      <div style={{width: 280, height: 6, background: accent, marginTop: 36, transformOrigin: 'left center', transform: `scaleX(${line})`, boxShadow: `0 0 16px ${accent}`}} />
      <div style={{height: 32, marginTop: 24, fontFamily: 'JetBrains Mono, monospace', color: tokens.telemetryCyan, fontSize: 16, letterSpacing: 3, fontWeight: 700, opacity: kicker, transform: `translateY(${(1 - kicker) * 12}px)`}}>
        {scene.variant === 'CONSEQUENCE' ? '// A MÁQUINA INVISÍVEL REVELADA' : '// INVESTIGAR. REVELAR. COMPREENDER.'}
      </div>
    </AbsoluteFill>
  );
};

const HybridOverlay: React.FC<{scene: HslRenderScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const design = scene.motionDesign;
  if (!design) return null;
  const reveal = interpolate(frame, [4, 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const stageIndex = Math.min(
    design.stages.length - 1,
    Math.floor((frame / Math.max(1, scene.durationInFrames)) * design.stages.length)
  );
  const accent = design.accent === 'orange' ? tokens.primaryOrange : tokens.telemetryCyan;

  return (
    <>
      <div style={{position: 'absolute', left: 70, top: 110, opacity: reveal, maxWidth: 620, zIndex: 15}}>
        <div style={{display: 'inline-block', color: accent, borderTop: `1px solid ${accent}`, paddingTop: 7, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, letterSpacing: 0, fontWeight: 700}}>
          {design.eyebrow}
        </div>
        <div style={{marginTop: 10, color: tokens.text, fontFamily: 'Inter, sans-serif', fontSize: 28, lineHeight: 1.08, letterSpacing: 0, fontWeight: 750, textShadow: '0 3px 18px rgba(0,0,0,0.95)'}}>
          {design.headline}
        </div>
      </div>
      <div style={{position: 'absolute', right: 70, bottom: 76, width: 360, paddingTop: 8, borderTop: `1px solid ${accent}`, color: tokens.text, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, letterSpacing: 0, zIndex: 15, opacity: reveal, textAlign: 'right', textShadow: '0 2px 12px rgba(0,0,0,0.95)'}}>
        {design.stages[stageIndex]}
      </div>
    </>
  );
};

const SceneBody: React.FC<{scene: HslRenderScene; showGlobalOverlays: boolean; showHybridTextOverlay: boolean}> = ({
  scene, showGlobalOverlays, showHybridTextOverlay
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, scene.durationInFrames - 10, scene.durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const progress = Math.max(0, Math.min(1, frame / Math.max(1, scene.durationInFrames - 1)));
  const accent = accentFor(scene);

  return (
    <AbsoluteFill style={{opacity, overflow: 'hidden', backgroundColor: tokens.background}}>
      {/* 1. Mídia de Vídeo Cinematográfico 35mm (Firefly Take) */}
      {(scene.visualMode === 'generated_ai' || scene.visualMode === 'licensed_real') && (
        scene.mediaSrc ? (
          <>
            <Video src={staticFile(scene.mediaSrc)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
            <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(6,7,9,0.10) 0%, rgba(6,7,9,0.75) 100%)'}} />
          </>
        ) : null
      )}

      {/* 2. Módulos Motion Graphics Especializados */}
      {scene.visualMode === 'remotion' && (
        <MotionModule durationInFrames={scene.durationInFrames} design={scene.motionDesign || buildMotionDesign({
          narrativeFunction: scene.narrativeFunction, visualSubject: scene.visualSubject, variant: scene.variant
        })} />
      )}

      {showHybridTextOverlay && scene.generationStrategy === 'VEO_REMOTION_HYBRID' && <HybridOverlay scene={scene} />}
      {scene.visualMode === 'typography' && <TypographyScene scene={scene} />}

      {/* 3. Camada Global de Telemetria e HUD Industrial X-Ray */}
      {showGlobalOverlays && (
        <>
          <div style={{position: 'absolute', top: 50, left: 70, color: tokens.text, fontFamily: 'Bebas Neue, sans-serif', letterSpacing: 2, fontSize: 24, zIndex: 12}}>
            O OUTRO LADO <span style={{color: tokens.primaryOrange}}>//</span> {scene.chapterTitle.toUpperCase()}
          </div>
          <div style={{position: 'absolute', top: 54, right: 70, color: tokens.telemetryCyan, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, letterSpacing: 2, zIndex: 12}}>
            [{scene.shotId}]
          </div>
          <div style={{position: 'absolute', left: 70, bottom: 55, color: tokens.muted, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, letterSpacing: 1.5, zIndex: 12}}>
            REVELAÇÃO FÍSICA // {stripShotIntent(scene.visualSubject).slice(0, 55).toUpperCase()}
          </div>
          <div style={{position: 'absolute', left: 0, bottom: 0, width: '100%', height: 4, background: 'rgba(255,255,255,0.08)', zIndex: 14}}>
            <div style={{height: '100%', width: `${progress * 100}%`, background: tokens.primaryOrange, boxShadow: `0 0 10px ${tokens.primaryOrange}`}} />
          </div>
          {scene.aiDisclosureRequired && (
            <div style={{position: 'absolute', right: 70, bottom: 50, color: tokens.telemetryCyan, background: tokens.glass, border: `1px solid ${tokens.border}`, backdropFilter: 'blur(8px)', padding: '6px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: 2, zIndex: 12}}>
              SIMULAÇÃO // IA VISUALIZATION
            </div>
          )}
        </>
      )}
    </AbsoluteFill>
  );
};

export const HslEpisode: React.FC<HslEpisodeRenderProps> = (props) => {
  let from = 0;
  const showGlobalOverlays = props.showGlobalOverlays ?? false;
  const showHybridTextOverlay = props.showHybridTextOverlay ?? false;
  const showMasterStopwatch = props.showMasterStopwatch ?? false;

  return (
    <AbsoluteFill style={{backgroundColor: tokens.background}}>
      {/* 1. Cronômetro Atômico Superior de Alta Precisão */}
      {showMasterStopwatch ? <AtomicStopwatch totalFrames={props.totalDurationInFrames} /> : null}

      {/* 2. Sequência Temporal de Cenas */}
      {props.scenes.map((scene) => {
        const start = from;
        from += scene.durationInFrames;
        return (
          <Sequence key={scene.shotId} from={start} durationInFrames={scene.durationInFrames} premountFor={15}>
            <SceneBody scene={scene} showGlobalOverlays={showGlobalOverlays} showHybridTextOverlay={showHybridTextOverlay} />
          </Sequence>
        );
      })}

      {/* 3. Trilha e Narração Master */}
      {props.narrationSrc && <Audio src={staticFile(props.narrationSrc)} volume={1} />}
      {props.soundFxSrc && <Audio src={staticFile(props.soundFxSrc)} volume={props.soundFxVolume ?? 1} />}

      {/* 4. Overlay Anamórfico 35mm (Letterbox 2.39:1 + Grão + Cantoneiras [ ]) */}
      <AnamorphicCinematicOverlay
        showLetterbox={false}
        showFramingBrackets={false}
        showFilmGrain={true}
        accentColor={tokens.primaryOrange}
      />
    </AbsoluteFill>
  );
};
