
import { useCallback } from 'react';
import { useEditorStore } from '@/lib/store';

export const usePlaybackControls = (
  videoRef: React.RefObject<HTMLVideoElement>,
  audioRef: React.RefObject<HTMLAudioElement>
) => {
  const {
    timelineClips,
    selectedClip,
    setSelectedClip,
    isPlaying,
    setIsPlaying,
    setCurrentTime,
    resetToTimelineStart
  } = useEditorStore();

  const togglePlay = useCallback(() => {
    if (!selectedClip || !videoRef.current || !audioRef.current) {
      console.log("🎮 PLAY: No clip selected, video ref, or audio ref not available");
      return;
    }
    
    const video = videoRef.current;
    const audio = audioRef.current;

    console.log("🎮 PLAY: Toggle play called, audio paused:", audio.paused);

    if (audio.paused) {
      // Update clip metadata if needed
      if (selectedClip.originalDuration === 0 && video.duration > 0) {
        console.log("🎮 PLAY: Updating clip metadata with video duration:", video.duration);
        const updatedClip = {
          ...selectedClip,
          originalDuration: video.duration,
          endTime: video.duration
        };
        setSelectedClip(updatedClip);
      }

      // Start playback - AUDIO IS THE MASTER
      audio.play().catch(e => console.error("🎮 PLAY: Audio play error:", e));
      video.play().catch(e => console.error("🎮 PLAY: Video play error:", e));
    } else {
      // Pause playback - AUDIO IS THE MASTER
      audio.pause();
      video.pause();
    }
  }, [selectedClip, setSelectedClip]);

  const jumpToStart = useCallback(() => {
    console.log("🎯 JUMP: Jumping to timeline start");
    resetToTimelineStart();
    
    // Reset audio to start (master timeline)
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    
    // Reset video to first clip start
    if (videoRef.current && timelineClips.length > 0) {
      const firstClip = timelineClips[0];
      const clipStartTime = firstClip.startTime ?? 0;
      videoRef.current.currentTime = clipStartTime;
    }
  }, [timelineClips, resetToTimelineStart]);

  const jumpToEnd = useCallback(() => {
    if (!audioRef.current || timelineClips.length === 0) return;
    
    // Calculate total timeline duration
    const totalDuration = timelineClips.reduce((acc, clip) => {
      const clipDuration = (clip.endTime ?? clip.originalDuration ?? 0) - (clip.startTime ?? 0);
      return acc + clipDuration;
    }, 0);

    console.log("🎯 JUMP: Jumping to timeline end, total duration:", totalDuration);

    // Set audio to end (master timeline)
    audioRef.current.currentTime = Math.min(totalDuration, audioRef.current.duration);
    
    // Find and set the last clip
    if (timelineClips.length > 0) {
      const lastClip = timelineClips[timelineClips.length - 1];
      const lastClipEndTime = lastClip.endTime ?? lastClip.originalDuration ?? 0;
      
      if (videoRef.current) {
        videoRef.current.currentTime = lastClipEndTime;
      }
      
      setSelectedClip(lastClip);
      const relativeTime = lastClipEndTime - (lastClip.startTime ?? 0);
      setCurrentTime(relativeTime);
    }
  }, [timelineClips, setSelectedClip, setCurrentTime]);

  return {
    togglePlay,
    jumpToStart,
    jumpToEnd
  };
};
