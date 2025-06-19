
import { useCallback } from 'react';
import { useEditorStore } from '@/lib/store';

export const useClipTransition = (
  videoRef: React.RefObject<HTMLVideoElement>,
  audioRef: React.RefObject<HTMLAudioElement>
) => {
  const {
    selectedClip,
    timelineClips,
    isPlaying,
    setSelectedClip,
    setCurrentTime,
    setAbsoluteTimelinePosition,
    setIsPlaying
  } = useEditorStore();

  const handleClipEnded = useCallback(() => {
    if (!selectedClip || timelineClips.length === 0) {
      console.log("🔄 CLIP-END: No clip selected or no clips in timeline");
      return;
    }

    console.log("🔄 CLIP-END: Current clip ended:", selectedClip.id);
    const currentIndex = timelineClips.findIndex(c => c.id === selectedClip.id);

    if (currentIndex >= 0 && currentIndex < timelineClips.length - 1) {
      const nextClip = timelineClips[currentIndex + 1];
      console.log("🔄 CLIP-END: Moving to next clip:", nextClip.id);
      
      // Calculate new absolute position (end of current clip)
      let newAbsolutePosition = 0;
      for (let i = 0; i <= currentIndex; i++) {
        const clip = timelineClips[i];
        const clipDuration = (clip.endTime ?? clip.originalDuration ?? 0) - (clip.startTime ?? 0);
        newAbsolutePosition += clipDuration;
      }
      
      // Store playing state before any changes
      const wasPlayingBefore = isPlaying;
      
      // Prepare video element for seamless transition
      if (videoRef.current && nextClip.src !== selectedClip.src) {
        const video = videoRef.current;
        const nextClipStartTime = nextClip.startTime ?? 0;
        
        console.log("🔄 CLIP-END: Preparing seamless transition to:", nextClip.id);
        
        // Update state immediately for UI consistency
        setAbsoluteTimelinePosition(newAbsolutePosition);
        setSelectedClip(nextClip);
        setCurrentTime(0);
        
        // Handle video source change and time sync
        if (video.src !== nextClip.src) {
          // Different video source - need to change src
          const handleLoadedData = () => {
            video.currentTime = nextClipStartTime;
            if (audioRef.current) {
              audioRef.current.currentTime = nextClipStartTime;
            }
            
            // Continue playing immediately if we were playing
            if (wasPlayingBefore) {
              console.log("🔄 CLIP-END: Resuming playback on new clip");
              video.play().then(() => {
                console.log("🔄 CLIP-END: Video playback resumed successfully");
              }).catch(e => {
                console.error("🔄 CLIP-END: Video play failed:", e);
              });
              
              if (audioRef.current) {
                audioRef.current.play().catch(e => 
                  console.error("🔄 CLIP-END: Audio play failed:", e)
                );
              }
            }
            
            // Remove the event listener
            video.removeEventListener('loadeddata', handleLoadedData);
          };
          
          video.addEventListener('loadeddata', handleLoadedData);
          video.src = nextClip.src;
        } else {
          // Same video source - just update time
          video.currentTime = nextClipStartTime;
          if (audioRef.current) {
            audioRef.current.currentTime = nextClipStartTime;
          }
          
          // Continue playing immediately if we were playing
          if (wasPlayingBefore) {
            console.log("🔄 CLIP-END: Continuing seamless playback on same video");
            video.play().catch(e => 
              console.error("🔄 CLIP-END: Video play failed:", e)
            );
            
            if (audioRef.current) {
              audioRef.current.play().catch(e => 
                console.error("🔄 CLIP-END: Audio play failed:", e)
              );
            }
          }
        }
      } else {
        // Same video source, just update state
        setAbsoluteTimelinePosition(newAbsolutePosition);
        setSelectedClip(nextClip);
        setCurrentTime(0);
      }
    } else {
      // End of timeline
      console.log("🔄 CLIP-END: Reached end of timeline, stopping playback");
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [selectedClip, timelineClips, isPlaying, setSelectedClip, setCurrentTime, setAbsoluteTimelinePosition, setIsPlaying]);

  return {
    handleClipEnded
  };
};
