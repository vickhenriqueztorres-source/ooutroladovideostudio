import React from 'react';
import { CinematicEpisode } from './cinema/CinematicEpisode';
import { EPISODE_REDE_ELETRICA_CALCULATED_TIMELINE } from './episodeRedeEletrica60hzTimelineData';

export interface EpisodeRedeEletrica60hzProps {
  runId?: string;
  accentColor?: string;
  telemetryColor?: string;
}

/**
 * ⚡ EpisodeRedeEletrica60hz: O Outro Lado da Tomada: A Máquina de 60 Hz que Não Pode Parar
 * Montado exclusivamente pelo compositor canônico CinematicEpisode.
 */
export const EpisodeRedeEletrica60hz: React.FC<EpisodeRedeEletrica60hzProps> = ({
  runId = 'latest',
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF'
}) => {
  return (
    <CinematicEpisode
      timeline={EPISODE_REDE_ELETRICA_CALCULATED_TIMELINE}
      accentColor={accentColor}
      telemetryColor={telemetryColor}
      runId={runId}
    />
  );
};
