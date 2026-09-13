import React from 'react';
import { CinematicEpisode } from './cinema/CinematicEpisode';
import { EPISODE_ENCOMENDA_CHINA_CALCULATED_TIMELINE } from './episodeEncomendaChinaTimelineData';

export interface EpisodeEncomendaChinaProps {
  runId?: string;
  accentColor?: string;
  telemetryColor?: string;
}

/**
 * 📦 EpisodeEncomendaChina: O Outro Lado da Sua Encomenda de R$ 20 da China: A Rota dos 18.000 km
 * Montado exclusivamente pelo compositor canônico CinematicEpisode sob a estética Dossiê do Sistema 3.0.
 */
export const EpisodeEncomendaChina: React.FC<EpisodeEncomendaChinaProps> = ({
  runId = 'latest',
  accentColor = '#FF5500',
  telemetryColor = '#00F0FF'
}) => {
  return (
    <CinematicEpisode
      timeline={EPISODE_ENCOMENDA_CHINA_CALCULATED_TIMELINE}
      accentColor={accentColor}
      telemetryColor={telemetryColor}
      runId={runId}
    />
  );
};
