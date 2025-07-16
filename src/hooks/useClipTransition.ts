
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
    if (!selectedClip || timelineClips.length === 0 || !audioRef.current) {
      console.log("🔄 CLIP-END: No clip selected, no clips in timeline, or no audio");
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
      
      // Store current playing state - CRITICAL for smooth transitions
      const wasPlaying = !audioRef.current.paused;
      console.log("🔄 CLIP-END: Audio was playing:", wasPlaying);
      
      // Update state immediately for UI consistency
      setAbsoluteTimelinePosition(newAbsolutePosition);
      setSelectedClip(nextClip);
      setCurrentTime(0);
      
      // Handle video transition - AUDIO CONTINUES UNINTERRUPTED
      if (videoRef.current) {
        const video = videoRef.current;
        const nextClipStartTime = nextClip.startTime ?? 0;
        
        console.log("🔄 CLIP-END: Preparing seamless video transition to:", nextClip.id);
        
        if (video.src !== nextClip.src) {
          // Different video source - need to change src and maintain playback
          console.log("🔄 CLIP-END: Changing video source from", video.src, "to", nextClip.src);
          
          const handleCanPlay = () => {
            console.log("🔄 CLIP-END: New video can play, syncing to audio time");
            
            // Sync video to current audio time
            const audioCurrentTime = audioRef.current?.currentTime ?? 0;
            const relativeVideoTime = audioCurrentTime - newAbsolutePosition + nextClipStartTime;
            const targetTime = Math.max(nextClipStartTime, relativeVideoTime);
            
            console.log("🔄 CLIP-END: Setting video time to:", targetTime, "audio time:", audioCurrentTime);
            video.currentTime = targetTime;
            
            // CRITICAL: Continue playing immediately if audio is playing
            if (wasPlaying) {
              console.log("🔄 CLIP-END: Resuming video playback immediately");
              video.play().then(() => {
                console.log("🔄 CLIP-END: ✅ Video playback resumed successfully");
              }).catch(e => {
                console.error("🔄 CLIP-END: ❌ Video play failed:", e);
              });
            }
            
            // Remove the event listener
            video.removeEventListener('canplay', handleCanPlay);
          };
          
          video.addEventListener('canplay', handleCanPlay);
          video.src = nextClip.src;
          video.load(); // Force reload
        } else {
          // Same video source - just update time and maintain playback
          console.log("🔄 CLIP-END: Same video source, updating time position");
          const audioCurrentTime = audioRef.current?.currentTime ?? 0;
          const relativeVideoTime = audioCurrentTime - newAbsolutePosition + nextClipStartTime;
          video.currentTime = Math.max(nextClipStartTime, relativeVideoTime);
          
          // Continue playing if audio is playing
          if (wasPlaying && video.paused) {
            console.log("🔄 CLIP-END: Continuing video playback on same source");
            video.play().catch(e => 
              console.error("🔄 CLIP-END: Video play failed:", e)
            );
          }
        }
      }
    } else {
      // End of timeline - stop both video and audio
      console.log("🔄 CLIP-END: Reached end of timeline, stopping playback");
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [selectedClip, timelineClips, setSelectedClip, setCurrentTime, setAbsoluteTimelinePosition, setIsPlaying]);

  return {
    handleClipEnded
  };
};
