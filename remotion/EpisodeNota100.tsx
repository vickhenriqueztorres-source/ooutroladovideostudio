import React from 'react';
import { CinematicEpisode } from './cinema/CinematicEpisode';
import { EPISODE_NOTA_100_CALCULATED_TIMELINE } from './episodeNota100TimelineData';

export interface EpisodeNota100Props {
  runId?: string;
  accentColor?: string;
  telemetryColor?: string;
}

/**
 * 💵 EpisodeNota100: A Física da Nota de 100
 * Montado exclusivamente pelo compositor canônico CinematicEpisode.
 */
export const EpisodeNota100: React.FC<EpisodeNota100Props> = ({
  runId = 'latest',
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF'
}) => {
  return (
    <CinematicEpisode
      timeline={EPISODE_NOTA_100_CALCULATED_TIMELINE}
      accentColor={accentColor}
      telemetryColor={telemetryColor}
      runId={runId}
    />
  );
};