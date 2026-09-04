import React from 'react';
import { CinematicEpisode } from './cinema/CinematicEpisode';
import { EPISODE_DRONES_AGRO_FIELD_CALCULATED_TIMELINE } from './episodeDronesAgroFieldTimelineData';

export interface EpisodeDronesAgroProps {
  runId?: string;
  accentColor?: string;
  telemetryColor?: string;
}

/**
 * 🌾 EpisodeDronesAgro: Episódio Oficial dos Drones Gigantes do Agro
 * Monta deterministicamente o documentário inteiro através do CinematicEpisode.
 */
export const EpisodeDronesAgro: React.FC<EpisodeDronesAgroProps> = ({
  runId = 'latest',
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF'
}) => {
  return (
    <CinematicEpisode
      timeline={EPISODE_DRONES_AGRO_FIELD_CALCULATED_TIMELINE}
      accentColor={accentColor}
      telemetryColor={telemetryColor}
      runId={runId}
    />
  );
};
