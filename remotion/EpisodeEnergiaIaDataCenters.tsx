import React from 'react';
import {CinematicEpisode} from './cinema/CinematicEpisode';
import {EPISODE_ENERGIA_IA_CALCULATED_TIMELINE} from './episodeEnergiaIaDataCentersTimelineData';

export const EpisodeEnergiaIaDataCenters: React.FC = () => (
  <CinematicEpisode
    timeline={EPISODE_ENERGIA_IA_CALCULATED_TIMELINE}
    accentColor="#FF5500"
    telemetryColor="#00F0FF"
    runId="energia-ia-data-centers-v1"
  />
);

