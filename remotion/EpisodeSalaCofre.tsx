import React from 'react';
import { CinematicEpisode } from './cinema/CinematicEpisode';
import { EPISODE_SALA_COFRE_CALCULATED_TIMELINE } from './episodeSalaCofreTimelineData';

export interface EpisodeSalaCofreProps {
  runId?: string;
  accentColor?: string;
  telemetryColor?: string;
}

/**
 * 🗳️ EpisodeSalaCofre: A Máquina que Apura 150 Milhões de Votos em 120 Minutos
 * Montado exclusivamente pelo compositor canônico CinematicEpisode.
 */
export const EpisodeSalaCofre: React.FC<EpisodeSalaCofreProps> = ({
  runId = 'latest',
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF'
}) => {
  return (
    <CinematicEpisode
      timeline={EPISODE_SALA_COFRE_CALCULATED_TIMELINE}
      accentColor={accentColor}
      telemetryColor={telemetryColor}
      runId={runId}
    />
  );
};
