
import { useEffect, useCallback } from 'react';
import { useEditorStore } from '@/lib/store';

export const useAudioTimeSync = (
  videoRef: React.RefObject<HTMLVideoElement>,
  audioRef: React.RefObject<HTMLAudioElement>
) => {
  const {
    timelineClips,
    selectedClip,
    setSelectedClip,
    setCurrentTime,
    setAbsoluteTimelinePosition,
    isAudioMaster
  } = useEditorStore();

  // Sync video clips to audio timeline position
  const syncToAudioTime = useCallback(() => {
    // Only run in audio master mode
    if (!isAudioMaster || !audioRef.current || timelineClips.length === 0) return;

    const audioCurrentTime = audioRef.current.currentTime;
    
    // Find which clip should be active based on audio time
    let accumulatedTime = 0;
    let targetClip = null;
    let timeInClip = 0;

    for (const clip of timelineClips) {
      const clipDuration = (clip.endTime ?? clip.originalDuration ?? 0) - (clip.startTime ?? 0);
      
      if (audioCurrentTime <= accumulatedTime + clipDuration) {
        targetClip = clip;
        timeInClip = audioCurrentTime - accumulatedTime;
        break;
      }
      
      accumulatedTime += clipDuration;
    }

    if (targetClip && targetClip.id !== selectedClip?.id) {
      console.log("🎵 AUDIO-SYNC: Auto-selecting clip based on audio time:", targetClip.id);
      
      // Store current audio playing state
      const wasAudioPlaying = !audioRef.current.paused;
      
      setSelectedClip(targetClip);
      
      // Sync video to correct position and maintain playback state
      if (videoRef.current) {
        const clipStartTime = targetClip.startTime ?? 0;
        const videoTime = clipStartTime + timeInClip;
        
        console.log("🎵 AUDIO-SYNC: Setting video time to:", videoTime, "for clip:", targetClip.id);
        
        if (videoRef.current.src !== targetClip.src) {
          // Different video source - handle the transition
          console.log("🎵 AUDIO-SYNC: Changing video source for auto-select");
          
          const handleCanPlay = () => {
            console.log("🎵 AUDIO-SYNC: Video ready after source change");
            videoRef.current!.currentTime = videoTime;
            
            // CRITICAL: Resume video playback if audio is playing
            if (wasAudioPlaying) {
              console.log("🎵 AUDIO-SYNC: Resuming video playback after auto-select");
              videoRef.current!.play().catch(e => 
                console.error("🎵 AUDIO-SYNC: Video play failed:", e)
              );
            }
            
            videoRef.current!.removeEventListener('canplay', handleCanPlay);
          };
          
          videoRef.current.addEventListener('canplay', handleCanPlay);
          videoRef.current.src = targetClip.src;
          videoRef.current.load();
        } else {
          // Same video source - just update time
          videoRef.current.currentTime = videoTime;
          
          // Resume playback if audio is playing and video is paused
          if (wasAudioPlaying && videoRef.current.paused) {
            console.log("🎵 AUDIO-SYNC: Resuming video playback (same source)");
            videoRef.current.play().catch(e => 
              console.error("🎵 AUDIO-SYNC: Video play failed:", e)
            );
          }
        }
      }
    }

    // Update current time and absolute position
    if (targetClip) {
      setCurrentTime(timeInClip);
      setAbsoluteTimelinePosition(audioCurrentTime);
    }
  }, [timelineClips, selectedClip, setSelectedClip, setCurrentTime, setAbsoluteTimelinePosition, isAudioMaster]);

  // Listen to audio timeupdate events to drive the timeline (only in audio master mode)
  useEffect(() => {
    if (!isAudioMaster) return;
    
    const audio = audioRef.current;
    if (!audio) return;

    const handleAudioTimeUpdate = () => {
      syncToAudioTime();
    };

    audio.addEventListener('timeupdate', handleAudioTimeUpdate);
    
    return () => {
      audio.removeEventListener('timeupdate', handleAudioTimeUpdate);
    };
  }, [syncToAudioTime, isAudioMaster]);

  return {
    syncToAudioTime
  };
};
