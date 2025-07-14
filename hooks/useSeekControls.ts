
import { useCallback } from 'react';
import { useEditorStore } from '@/lib/store';

export const useSeekControls = (
  videoRef: React.RefObject<HTMLVideoElement>,
  audioRef: React.RefObject<HTMLAudioElement>
) => {
  const {
    timelineClips,
    selectedClip,
    setSelectedClip,
    setCurrentTime,
    absoluteTimelinePosition,
    setAbsoluteTimelinePosition
  } = useEditorStore();

  const getAbsoluteTimePosition = useCallback(() => {
    // If audio is available, use its current time as the absolute position
    if (audioRef.current) {
      return audioRef.current.currentTime;
    }
    return absoluteTimelinePosition;
  }, [absoluteTimelinePosition]);

  const seekToAbsoluteTime = useCallback((absoluteTime: number) => {
    if (timelineClips.length === 0) return;

    console.log("🎯 SEEK: Seeking to absolute time:", absoluteTime);
    
    // Set audio to the absolute time (master timeline)
    if (audioRef.current) {
      audioRef.current.currentTime = absoluteTime;
    }
    
    // Find which clip this absolute time falls into
    let accumulatedTime = 0;
    let targetClip = null;
    let timeInClip = 0;

    for (const clip of timelineClips) {
      const clipDuration = (clip.endTime ?? clip.originalDuration ?? 0) - (clip.startTime ?? 0);
      
      if (absoluteTime <= accumulatedTime + clipDuration) {
        targetClip = clip;
        timeInClip = absoluteTime - accumulatedTime;
        break;
      }
      
      accumulatedTime += clipDuration;
    }

    if (targetClip) {
      console.log("🎯 SEEK: Found target clip:", targetClip.id, "time in clip:", timeInClip);
      
      // Update store state
      setAbsoluteTimelinePosition(absoluteTime);
      setCurrentTime(timeInClip);
      setSelectedClip(targetClip);
      
      // Sync video to the correct position within the clip
      if (videoRef.current) {
        const clipStartTime = targetClip.startTime ?? 0;
        const videoAbsoluteTime = clipStartTime + timeInClip;
        videoRef.current.currentTime = videoAbsoluteTime;
      }
    }
  }, [timelineClips, setSelectedClip, setCurrentTime, setAbsoluteTimelinePosition]);

  const seekToTime = useCallback((time: number) => {
    if (!selectedClip) return;
    
    console.log("🎯 SEEK: Seeking to relative time:", time);
    
    // Calculate absolute timeline position for this relative time
    const currentClipIndex = timelineClips.findIndex(c => c.id === selectedClip.id);
    let accumulatedTime = 0;
    for (let i = 0; i < currentClipIndex; i++) {
      const clip = timelineClips[i];
      const clipDuration = (clip.endTime ?? clip.originalDuration ?? 0) - (clip.startTime ?? 0);
      accumulatedTime += clipDuration;
    }
    const absoluteTime = accumulatedTime + time;
    
    // Use seekToAbsoluteTime to maintain audio as master
    seekToAbsoluteTime(absoluteTime);
  }, [selectedClip, timelineClips, seekToAbsoluteTime]);

  return {
    getAbsoluteTimePosition,
    seekToAbsoluteTime,
    seekToTime
  };
};
