import React from 'react';
import { CinematicEpisode } from './cinema/CinematicEpisode';
import { EPISODE_LINHA_SEGURA_CALCULATED_TIMELINE } from './episodeLinhaSeguraTimelineData';

export interface EpisodeLinhaSeguraProps {
  runId?: string;
  accentColor?: string;
  telemetryColor?: string;
}

/**
 * 🔒 EpisodeLinhaSegura: A Linha Segura: Como o Presidente do Brasil Fala sem Ser Grampeado
 * Montado exclusivamente pelo compositor canônico CinematicEpisode.
 */
export const EpisodeLinhaSegura: React.FC<EpisodeLinhaSeguraProps> = ({
  runId = 'latest',
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF'
}) => {
  return (
    <CinematicEpisode
      timeline={EPISODE_LINHA_SEGURA_CALCULATED_TIMELINE}
      accentColor={accentColor}
      telemetryColor={telemetryColor}
      runId={runId}
    />
  );
};
