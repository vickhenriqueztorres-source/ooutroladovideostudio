import React from 'react';
import {CinematicEpisode} from './cinema/CinematicEpisode';
import {EPISODE_MILK_CALCULATED_TIMELINE, MILK_RUN_ID} from './episodeMilkTimelineData';

export interface EpisodeMilkProps {
  runId?: string;
  includeNarration?: boolean;
}

export const EpisodeMilk: React.FC<EpisodeMilkProps> = ({
  runId = MILK_RUN_ID,
  includeNarration = true,
}) => {
  const timeline = includeNarration
    ? EPISODE_MILK_CALCULATED_TIMELINE
    : {
        ...EPISODE_MILK_CALCULATED_TIMELINE,
        scenes: EPISODE_MILK_CALCULATED_TIMELINE.scenes.map((scene) => ({
          ...scene,
          voiceoverFile: undefined,
        })),
      };
  return (
    <CinematicEpisode
      timeline={timeline}
      runId={runId}
      accentColor="#FF5500"
      telemetryColor="#00F0FF"
    />
  );
};
