
import { useEffect, useCallback } from 'react';
import { useEditorStore } from '@/lib/store';

export const useVideoTimeSync = (
  videoRef: React.RefObject<HTMLVideoElement>
) => {
  const {
    timelineClips,
    selectedClip,
    setSelectedClip,
    setCurrentTime,
    setAbsoluteTimelinePosition,
    isAudioMaster
  } = useEditorStore();

  // Handle video-only timeline progression and clip transitions
  const syncVideoTime = useCallback(() => {
    // Only run in video-only mode
    if (isAudioMaster || !videoRef.current || !selectedClip) return;

    const video = videoRef.current;
    const videoCurrentTime = video.currentTime;
    const clipStartTime = selectedClip.startTime ?? 0;
    const clipEndTime = selectedClip.endTime ?? selectedClip.originalDuration ?? 0;

    // Check if we've reached the end of the current clip
    if (videoCurrentTime >= clipEndTime - 0.1) {
      console.log("🎬 VIDEO-SYNC: Clip ended, transitioning to next clip");
      
      // Find current clip index and move to next
      const currentIndex = timelineClips.findIndex(c => c.id === selectedClip.id);
      if (currentIndex >= 0 && currentIndex < timelineClips.length - 1) {
        const nextClip = timelineClips[currentIndex + 1];
        console.log("🎬 VIDEO-SYNC: Moving to next clip:", nextClip.id);
        
        // Calculate new absolute position
        let newAbsolutePosition = 0;
        for (let i = 0; i <= currentIndex; i++) {
          const clip = timelineClips[i];
          const clipDuration = (clip.endTime ?? clip.originalDuration ?? 0) - (clip.startTime ?? 0);
          newAbsolutePosition += clipDuration;
        }
        
        // Update state and switch to next clip
        setAbsoluteTimelinePosition(newAbsolutePosition);
        setSelectedClip(nextClip);
        setCurrentTime(0);
        
        // Set video to next clip and continue playing
        const wasPlaying = !video.paused;
        if (video.src !== nextClip.src) {
          const handleCanPlay = () => {
            const nextClipStartTime = nextClip.startTime ?? 0;
            video.currentTime = nextClipStartTime;
            if (wasPlaying) {
              video.play().catch(e => 
                console.error("🎬 VIDEO-SYNC: Failed to continue playback:", e)
              );
            }
            video.removeEventListener('canplay', handleCanPlay);
          };
          
          video.addEventListener('canplay', handleCanPlay);
          video.src = nextClip.src;
          video.load();
        } else {
          const nextClipStartTime = nextClip.startTime ?? 0;
          video.currentTime = nextClipStartTime;
          if (wasPlaying) {
            video.play().catch(e => 
              console.error("🎬 VIDEO-SYNC: Failed to continue playback:", e)
            );
          }
        }
        return;
      } else {
        // End of timeline - stop playback
        console.log("🎬 VIDEO-SYNC: End of timeline reached");
        video.pause();
        return;
      }
    }

    // Update relative time within the clip
    const relativeTime = Math.max(0, videoCurrentTime - clipStartTime);
    setCurrentTime(relativeTime);

    // Calculate absolute position
    const currentClipIndex = timelineClips.findIndex(c => c.id === selectedClip.id);
    let accumulatedTime = 0;
    for (let i = 0; i < currentClipIndex; i++) {
      const clip = timelineClips[i];
      const clipDuration = (clip.endTime ?? clip.originalDuration ?? 0) - (clip.startTime ?? 0);
      accumulatedTime += clipDuration;
    }
    const absoluteTime = accumulatedTime + relativeTime;
    setAbsoluteTimelinePosition(absoluteTime);

  }, [selectedClip, timelineClips, setSelectedClip, setCurrentTime, setAbsoluteTimelinePosition, isAudioMaster]);

  // Listen to video timeupdate events (only in video-only mode)
  useEffect(() => {
    if (isAudioMaster) return;
    
    const video = videoRef.current;
    if (!video) return;

    const handleVideoTimeUpdate = () => {
      syncVideoTime();
    };

    video.addEventListener('timeupdate', handleVideoTimeUpdate);
    
    return () => {
      video.removeEventListener('timeupdate', handleVideoTimeUpdate);
    };
  }, [syncVideoTime, isAudioMaster]);

  return {
    syncVideoTime
  };
};
