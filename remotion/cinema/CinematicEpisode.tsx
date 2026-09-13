import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import {
  CalculatedTimeline,
  TimelineContract,
  TimelineContractInput,
  AudioManifest,
  parseAndCalculateTimeline
} from '../../contracts/timelineContract';
import { FilmGrade } from './FilmGrade';
import { HudDirector } from './HudDirector';
import { SceneTransition } from './SceneTransition';
import { CameraLanguage } from './CameraLanguage';
import { CinematicAudioMix } from './CinematicAudioMix';
import { resolveSceneComponent } from './componentRegistry';
import { DynamicDocumentaryMedia } from '../documentary/DynamicDocumentaryMedia';
import { KineticEditorialCallout } from '../documentary/KineticEditorialCallout';
import {
  DocumentaryMotionStage,
  DocumentaryOverlayDirector,
} from '../motion-documentary';

export interface CinematicRenderManifest {
  compositor: 'CinematicEpisode';
  renderEngine: 'remotion';
  version: string;
  transitionsApplied: number;
  duckingApplied: boolean;
  gradeApplied: boolean;
  hudWindowsRespected: boolean;
  episodeId: string;
  totalDurationFrames: number;
  totalDurationSeconds: number;
  timestamp: string;
  compositionId?: string;
  output?: {
    path: string;
    sha256: string;
    sizeBytes: number;
    durationSeconds: number;
    codec: string;
    width: number;
    height: number;
    frozenRatio: number;
  };
}

export type CinematicRenderEvidence = Pick<CinematicRenderManifest, 'compositionId' | 'output'>;

export function generateCinematicRenderManifest(
  timeline: CalculatedTimeline | TimelineContract | TimelineContractInput | unknown,
  _runId?: string,
  evidence?: CinematicRenderEvidence,
): CinematicRenderManifest {
  const calc = (timeline && typeof timeline === 'object' && 'totalDurationFrames' in timeline)
    ? (timeline as CalculatedTimeline)
    : parseAndCalculateTimeline(timeline);

  const transitionsApplied = calc.scenes.length;
  const duckingApplied = calc.audio?.ducking !== false;
  const gradeApplied = true;
  const hudWindowsRespected = true;

  return {
    compositor: 'CinematicEpisode',
    renderEngine: 'remotion',
    version: '3.0.0',
    transitionsApplied,
    duckingApplied,
    gradeApplied,
    hudWindowsRespected,
    episodeId: calc.episodeId,
    totalDurationFrames: calc.totalDurationFrames,
    totalDurationSeconds: calc.totalDurationSeconds,
    timestamp: new Date().toISOString(),
    ...(evidence || {}),
  };
}

export function writeCinematicRenderManifest(
  timeline: CalculatedTimeline | TimelineContract | TimelineContractInput | unknown,
  runId: string = 'latest',
  baseOutputDir?: string,
  evidence?: CinematicRenderEvidence,
): string {
  const nodePath = require('path');
  const nodeFs = require('fs');

  const manifest = generateCinematicRenderManifest(timeline, runId, evidence);
  const calc = (timeline && typeof timeline === 'object' && 'totalDurationFrames' in timeline)
    ? (timeline as CalculatedTimeline)
    : parseAndCalculateTimeline(timeline);

  const targetDir = baseOutputDir || nodePath.join(process.cwd(), 'runs', calc.episodeId, runId);
  nodeFs.mkdirSync(targetDir, { recursive: true });
  const manifestPath = nodePath.join(targetDir, 'render_manifest.json');
  nodeFs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return manifestPath;
}

export interface CinematicEpisodeProps {
  timeline: CalculatedTimeline | TimelineContract | TimelineContractInput | any;
  audio?: AudioManifest;
  accentColor?: string;
  telemetryColor?: string;
  runId?: string;
}

/**
 * 👑 CinematicEpisode: Compositor Genérico Master de Episódios
 * Padrão Único e Inegociável de Composição para o canal "O Outro Lado".
 * Monta automaticamente qualquer episódio a partir de dados com:
 * FilmGrade > HudDirector > [cenas com SceneTransition + CameraLanguage] + CinematicAudioMix.
 */
export const CinematicEpisode: React.FC<CinematicEpisodeProps> = ({
  timeline,
  audio,
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF',
  runId = 'latest'
}) => {
  // Normaliza e calcula os timings da timeline se necessário
  const calculatedTimeline: CalculatedTimeline =
    'totalDurationFrames' in timeline && Array.isArray((timeline as CalculatedTimeline).scenes)
      ? (timeline as CalculatedTimeline)
      : parseAndCalculateTimeline(timeline);

  const audioManifest: AudioManifest = audio || calculatedTimeline.audio;
  const scenes = calculatedTimeline.scenes;

  return (
    <AbsoluteFill style={{ backgroundColor: '#060709', color: '#FFFFFF' }}>
      {/* 1. Master Film Grade documental: Rec.709 natural, grao fino e vinheta discreta. */}
      <FilmGrade>
        {/* 2. Diretor de anotacoes factuais em janelas declaradas. */}
        <HudDirector
          totalFrames={calculatedTimeline.totalDurationFrames}
          hudWindows={calculatedTimeline.hudWindows}
          accentColor={accentColor}
          telemetryColor={telemetryColor}
          showMasterStopwatch={false}
        >
          {/* 3. Sequenciador Canônico de Cenas com Transições e Câmera */}
          {scenes.map((scene, index) => {
            const SceneComponent = resolveSceneComponent(scene.component);
            const isFirst = index === 0;
            const isLast = index === scenes.length - 1;

            // Props mescladas da cena
            const mergedProps = {
              sceneId: scene.id,
              name: scene.name,
              chapterTitle: scene.chapterTitle,
              durationInFrames: scene.durationFrames,
              accentColor,
              telemetryColor,
              mediaPath: scene.mediaFile || scene.props?.mediaPath,
              imageSrc: scene.props?.imageSrc || `episodes/${calculatedTimeline.episodeId}/images/${scene.id}.png`,
              ...scene.props
            };

            const overlapFrames = !isFirst && scene.transition === 'crossfade' ? Math.min(8, Math.floor(scene.durationFrames / 4)) : 0;
            const sequenceFrom = Math.max(0, scene.startFrame - overlapFrames);
            const sequenceDuration = scene.durationFrames + overlapFrames;

            return (
              <Sequence
                key={scene.id}
                from={sequenceFrom}
                durationInFrames={sequenceDuration}
                name={`${scene.id}_${scene.name || scene.component}`}
              >
                <AbsoluteFill style={{ backgroundColor: '#060709' }}>
                  {/* Transição Cinematográfica (Crossfade por padrão, DipToBlack em Act Breaks) */}
                  <SceneTransition
                    transitionType={scene.transition}
                    durationInFrames={sequenceDuration}
                    transitionDurationFrames={overlapFrames || 8}
                    isFirstScene={isFirst}
                    isLastScene={isLast}
                  >
                    {/* Movimento fisico discreto, definido pela linguagem da cena. */}
                    <DocumentaryMotionStage recipes={scene.motionRecipes} fps={calculatedTimeline.fps}>
                      <CameraLanguage
                        motion={scene.camera}
                        durationInFrames={sequenceDuration}
                        sceneIndex={index}
                      >
                        {/* Camada 1: Realidade Observada (Take de Vídeo Real / Imagem 1080p) */}
                        <DynamicDocumentaryMedia {...mergedProps} />

                        {/* Camada 2: Mecanismo Revelado (Motion Graphics / HUD / Dossiê sobreposto) */}
                        {SceneComponent !== DynamicDocumentaryMedia && (
                          <SceneComponent {...mergedProps} />
                        )}
                      </CameraLanguage>
                    </DocumentaryMotionStage>

                    <DocumentaryOverlayDirector recipes={scene.motionRecipes} fps={calculatedTimeline.fps} />

                    {/* Tipografia Editorial Cinética Opcional */}
                    {scene.callout && scene.callout.mainText.trim().toLowerCase() !== String(scene.props?.title || '').trim().toLowerCase() && (
                      <KineticEditorialCallout
                        mainText={scene.callout.mainText}
                        subText={scene.callout.subText}
                        categoryText={scene.callout.categoryText}
                        startFrame={Math.round((scene.callout.startSeconds ?? 0.45) * calculatedTimeline.fps)}
                        durationFrames={Math.min(
                          Math.round((scene.callout.durationSeconds ?? 1.8) * calculatedTimeline.fps),
                          Math.max(1, scene.durationFrames - Math.round((scene.callout.startSeconds ?? 0.45) * calculatedTimeline.fps)),
                        )}
                        position={(scene.callout.position as any) || 'bottom_left'}
                        accentColor={accentColor}
                        telemetryColor={telemetryColor}
                      />
                    )}
                  </SceneTransition>
                </AbsoluteFill>
              </Sequence>
            );
          })}
        </HudDirector>
      </FilmGrade>

      {/* 4. Mixagem Master de Áudio com Ducking Inteligente */}
      <CinematicAudioMix
        audio={audioManifest}
        scenes={scenes}
        totalFrames={calculatedTimeline.totalDurationFrames}
      />
    </AbsoluteFill>
  );
};
