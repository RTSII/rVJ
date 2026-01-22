import React, { useMemo } from 'react';
import { useEditorStore } from '@/lib/store';

interface TimelineRulerProps {
  containerWidth?: number;
}

const PIXELS_PER_SECOND_BASE = 10;

const TimelineRuler: React.FC<TimelineRulerProps> = ({ containerWidth = 800 }) => {
  const { duration, timelineClips, timelineZoom, absoluteTimelinePosition, isAudioMaster } = useEditorStore();

  // Calculate total project duration
  const totalDuration = useMemo(() => {
    if (isAudioMaster && duration > 0) {
      return duration;
    }
    // Calculate from clips
    return timelineClips.reduce((acc, clip) => {
      const clipDuration = (clip.endTime ?? clip.originalDuration ?? 0) - (clip.startTime ?? 0);
      return acc + clipDuration * (clip.loopCount || 1);
    }, 0);
  }, [duration, timelineClips, isAudioMaster]);

  // Calculate scaled pixels per second based on zoom
  const scaledPPS = PIXELS_PER_SECOND_BASE * (timelineZoom / 100);
  const totalWidth = Math.max(containerWidth, totalDuration * scaledPPS);

  // Determine interval based on zoom level for optimal readability
  const getMarkerInterval = () => {
    if (timelineZoom < 30) return 30; // 30 second intervals when very zoomed out
    if (timelineZoom < 60) return 10; // 10 second intervals
    if (timelineZoom < 100) return 5; // 5 second intervals
    if (timelineZoom < 200) return 2; // 2 second intervals
    return 1; // 1 second intervals when zoomed in
  };

  const markerInterval = getMarkerInterval();

  // Generate time markers
  const markers = useMemo(() => {
    if (totalDuration <= 0) return [];

    const result: { time: number; position: number; label: string }[] = [];
    const numMarkers = Math.ceil(totalDuration / markerInterval);

    for (let i = 0; i <= numMarkers; i++) {
      const time = i * markerInterval;
      if (time > totalDuration) break;

      const position = time * scaledPPS;

      // Format time label
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      const label = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      result.push({ time, position, label });
    }

    return result;
  }, [totalDuration, markerInterval, scaledPPS]);

  // Calculate playhead position
  const playheadPosition = useMemo(() => {
    if (totalDuration <= 0) return 0;
    return absoluteTimelinePosition * scaledPPS;
  }, [absoluteTimelinePosition, scaledPPS, totalDuration]);

  return (
    <div
      className="h-5 relative bg-[#0D0A1A]/60 border-b border-purple-500/20 flex-shrink-0 overflow-hidden"
      style={{ minWidth: totalWidth }}
    >
      {/* Time markers */}
      {markers.map((marker, index) => (
        <div
          key={index}
          className="absolute top-0 bottom-0 flex flex-col items-start"
          style={{ left: marker.position }}
        >
          {/* Tick line */}
          <div className="w-px h-2 bg-purple-400/50" />
          {/* Label */}
          <span className="text-[9px] text-purple-400/70 font-mono ml-0.5 select-none">
            {marker.label}
          </span>
        </div>
      ))}

      {/* Bold playhead */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-30 shadow-[0_0_8px_rgba(0,240,255,0.6)]"
        style={{ left: playheadPosition, transform: 'translateX(-50%)' }}
      >
        {/* Playhead handle */}
        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full border border-white shadow-lg" />
      </div>
    </div>
  );
};

export default TimelineRuler;
