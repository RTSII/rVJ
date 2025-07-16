
import { useCallback, useRef } from 'react';
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

  const transitionInProgress = useRef(false);
  const retryTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleClipEnded = useCallback(() => {
    if (!selectedClip || timelineClips.length === 0) {
      console.log("🔄 CLIP-END: No clip selected or no clips in timeline");
      return;
    }

    // Prevent multiple simultaneous transitions
    if (transitionInProgress.current) {
      console.log("🔄 CLIP-END: Transition already in progress, skipping");
      return;
    }

    console.log("🔄 CLIP-END: Current clip ended:", selectedClip.id);
    const currentIndex = timelineClips.findIndex(c => c.id === selectedClip.id);

    if (currentIndex >= 0 && currentIndex < timelineClips.length - 1) {
      const nextClip = timelineClips[currentIndex + 1];
      console.log("🔄 CLIP-END: Moving to next clip:", nextClip.id);

      transitionInProgress.current = true;

      // Calculate new absolute position (end of current clip)
      let newAbsolutePosition = 0;
      for (let i = 0; i <= currentIndex; i++) {
        const clip = timelineClips[i];
        const clipDuration = (clip.endTime ?? clip.originalDuration ?? 0) - (clip.startTime ?? 0);
        newAbsolutePosition += clipDuration;
      }

      // Store current playing state and audio time - CRITICAL for smooth transitions
      const wasPlaying = audioRef.current ? !audioRef.current.paused : false;
      const audioCurrentTime = audioRef.current?.currentTime ?? 0;
      console.log("🔄 CLIP-END: Audio was playing:", wasPlaying, "audio time:", audioCurrentTime);

      // Update state immediately for UI consistency
      setAbsoluteTimelinePosition(newAbsolutePosition);
      setSelectedClip(nextClip);
      setCurrentTime(0);

      // Enhanced video transition with retry logic
      if (videoRef.current) {
        const video = videoRef.current;
        const nextClipStartTime = nextClip.startTime ?? 0;

        console.log("🔄 CLIP-END: Preparing enhanced seamless transition to:", nextClip.id);

        const performVideoTransition = (retryCount = 0) => {
          const maxRetries = 3;

          if (video.src !== nextClip.src) {
            // Different video source - enhanced transition with better error handling
            console.log("🔄 CLIP-END: Changing video source (attempt", retryCount + 1, ")");

            let transitionComplete = false;

            const handleCanPlay = () => {
              if (transitionComplete) return;
              transitionComplete = true;

              console.log("🔄 CLIP-END: New video ready, syncing to audio timeline");

              // Enhanced time synchronization
              const currentAudioTime = audioRef.current?.currentTime ?? audioCurrentTime;
              const relativeVideoTime = currentAudioTime - newAbsolutePosition + nextClipStartTime;
              const targetTime = Math.max(nextClipStartTime, relativeVideoTime);

              console.log("🔄 CLIP-END: Syncing video time:", targetTime, "audio:", currentAudioTime);

              try {
                video.currentTime = targetTime;

                // CRITICAL: Resume video playback immediately if audio is playing
                if (wasPlaying) {
                  console.log("🔄 CLIP-END: Resuming video playback immediately");
                  video.play().then(() => {
                    console.log("🔄 CLIP-END: ✅ Video transition successful");
                    transitionInProgress.current = false;
                  }).catch(e => {
                    console.error("🔄 CLIP-END: ❌ Video play failed after transition:", e);
                    // Try to recover by ensuring audio continues
                    if (audioRef.current && audioRef.current.paused) {
                      audioRef.current.play().catch(console.error);
                    }
                    transitionInProgress.current = false;
                  });
                } else {
                  transitionInProgress.current = false;
                }
              } catch (error) {
                console.error("🔄 CLIP-END: Error during video sync:", error);
                transitionInProgress.current = false;
              }

              // Cleanup listeners
              video.removeEventListener('canplay', handleCanPlay);
              video.removeEventListener('error', handleError);
            };

            const handleError = (e: Event) => {
              if (transitionComplete) return;
              transitionComplete = true;

              console.error("🔄 CLIP-END: Video loading error (attempt", retryCount + 1, "):", e);

              video.removeEventListener('canplay', handleCanPlay);
              video.removeEventListener('error', handleError);

              if (retryCount < maxRetries) {
                // Retry after a short delay
                const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 3000); // Exponential backoff
                console.log("🔄 CLIP-END: Retrying video transition in", retryDelay, "ms");

                const retryTimeout = setTimeout(() => {
                  retryTimeouts.current.delete(nextClip.id);
                  performVideoTransition(retryCount + 1);
                }, retryDelay);

                retryTimeouts.current.set(nextClip.id, retryTimeout);
              } else {
                console.error("🔄 CLIP-END: Max retries exceeded, maintaining audio playback");
                // Keep audio playing even if video fails
                if (wasPlaying && audioRef.current && audioRef.current.paused) {
                  audioRef.current.play().catch(console.error);
                }
                transitionInProgress.current = false;
              }
            };

            // Set up enhanced event listeners with timeout
            video.addEventListener('canplay', handleCanPlay);
            video.addEventListener('error', handleError);

            // Timeout fallback to prevent infinite waiting
            setTimeout(() => {
              if (!transitionComplete) {
                console.warn("🔄 CLIP-END: Video transition timeout, forcing completion");
                handleCanPlay();
              }
            }, 5000);

            // Perform the source change
            video.src = nextClip.src;
            video.load();

          } else {
            // Same video source - just update time and maintain playback
            console.log("🔄 CLIP-END: Same video source, updating position");
            try {
              const currentAudioTime = audioRef.current?.currentTime ?? audioCurrentTime;
              const relativeVideoTime = currentAudioTime - newAbsolutePosition + nextClipStartTime;
              video.currentTime = Math.max(nextClipStartTime, relativeVideoTime);

              // Continue playing if audio is playing
              if (wasPlaying && video.paused) {
                console.log("🔄 CLIP-END: Continuing video playback on same source");
                video.play().catch(e => {
                  console.error("🔄 CLIP-END: Video play failed on same source:", e);
                  // Ensure audio continues
                  if (audioRef.current && audioRef.current.paused) {
                    audioRef.current.play().catch(console.error);
                  }
                });
              }

              transitionInProgress.current = false;
            } catch (error) {
              console.error("🔄 CLIP-END: Error updating video time:", error);
              transitionInProgress.current = false;
            }
          }
        };

        // Start the transition
        performVideoTransition();

      } else {
        console.warn("🔄 CLIP-END: No video ref available");
        transitionInProgress.current = false;
      }
    } else {
      // End of timeline - stop both video and audio gracefully
      console.log("🔄 CLIP-END: Reached end of timeline, stopping playback");

      try {
        if (videoRef.current) {
          videoRef.current.pause();
        }
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      } catch (error) {
        console.error("🔄 CLIP-END: Error stopping playback:", error);
      }
    }
  }, [selectedClip, timelineClips, setSelectedClip, setCurrentTime, setAbsoluteTimelinePosition, setIsPlaying]);

  // Cleanup function for retries
  const cleanup = useCallback(() => {
    retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
    retryTimeouts.current.clear();
    transitionInProgress.current = false;
  }, []);

  return {
    handleClipEnded,
    cleanup
  };
};
