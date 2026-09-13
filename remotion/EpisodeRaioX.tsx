import React from 'react';
import { CinematicEpisode } from './cinema/CinematicEpisode';
import { EPISODE_RAIO_X_CALCULATED_TIMELINE } from './episodeRaioXTimelineData';

export interface EpisodeRaioXProps {
  runId?: string;
  accentColor?: string;
  telemetryColor?: string;
}

/**
 * 🧳 EpisodeRaioX: O Raio-X do Aeroporto
 * Montado exclusivamente pelo compositor canônico CinematicEpisode.
 */
export const EpisodeRaioX: React.FC<EpisodeRaioXProps> = ({
  runId = 'latest',
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF'
}) => {
  return (
    <CinematicEpisode
      timeline={EPISODE_RAIO_X_CALCULATED_TIMELINE}
      accentColor={accentColor}
      telemetryColor={telemetryColor}
      runId={runId}
    />
  );
};
