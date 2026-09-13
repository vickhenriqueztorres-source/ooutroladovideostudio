import React from 'react';
import { CinematicEpisode } from './cinema/CinematicEpisode';
import { EPISODE_DIARIO_OFICIAL_CALCULATED_TIMELINE } from './episodeDiarioOficialTimelineData';

export interface EpisodeDiarioOficialProps {
  runId?: string;
  accentColor?: string;
  telemetryColor?: string;
}

/**
 * 🏛️ EpisodeDiarioOficial: O Outro Lado das 3 da Madrugada: A Máquina que Muda as Leis do País Enquanto Você Dorme
 * Montado exclusivamente pelo compositor canônico CinematicEpisode.
 */
export const EpisodeDiarioOficial: React.FC<EpisodeDiarioOficialProps> = ({
  runId = 'latest',
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF'
}) => {
  return (
    <CinematicEpisode
      timeline={EPISODE_DIARIO_OFICIAL_CALCULATED_TIMELINE}
      accentColor={accentColor}
      telemetryColor={telemetryColor}
      runId={runId}
    />
  );
};
