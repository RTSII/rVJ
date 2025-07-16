
import { useEffect, useCallback, useRef } from 'react';
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

  const syncInProgress = useRef(false);
  const lastVideoTime = useRef(0);
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Enhanced video-only timeline progression and clip transitions
  const syncVideoTime = useCallback(() => {
    // Only run in video-only mode
    if (isAudioMaster || !videoRef.current || !selectedClip) return;

    // Prevent recursive syncing during transitions
    if (syncInProgress.current) return;

    const video = videoRef.current;
    const videoCurrentTime = video.currentTime;

    // Detect video stalling (time not progressing)
    const timeProgressed = Math.abs(videoCurrentTime - lastVideoTime.current) > 0.01;
    lastVideoTime.current = videoCurrentTime;

    if (!timeProgressed && !video.paused && !video.seeking) {
      console.warn("🎬 VIDEO-SYNC: Video appears stalled, current time:", videoCurrentTime);
      return;
    }

    const clipStartTime = selectedClip.startTime ?? 0;
    const clipEndTime = selectedClip.endTime ?? selectedClip.originalDuration ?? 0;

    // Enhanced clip boundary detection with buffer margin
    const bufferMargin = 0.1; // 100ms buffer for smooth transitions

    if (videoCurrentTime >= clipEndTime - bufferMargin) {
      console.log("🎬 VIDEO-SYNC: Clip boundary reached, initiating transition");

      syncInProgress.current = true;

      // Clear any existing transition timeout
      if (transitionTimeout.current) {
        clearTimeout(transitionTimeout.current);
        transitionTimeout.current = null;
      }

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

        // Store playback state before transition
        const wasPlaying = !video.paused;

        // Update state immediately for UI responsiveness
        setAbsoluteTimelinePosition(newAbsolutePosition);
        setSelectedClip(nextClip);
        setCurrentTime(0);

        // Enhanced video transition with better error handling
        const performTransition = () => {
          const nextClipStartTime = nextClip.startTime ?? 0;

          if (video.src !== nextClip.src) {
            // Different video source - handle with enhanced buffering
            console.log("🎬 VIDEO-SYNC: Changing video source with enhanced buffering");

            let transitionCompleted = false;

            const handleTransitionReady = () => {
              if (transitionCompleted) return;
              transitionCompleted = true;

              console.log("🎬 VIDEO-SYNC: Next video ready for playback");

              try {
                video.currentTime = nextClipStartTime;

                if (wasPlaying) {
                  console.log("🎬 VIDEO-SYNC: Resuming playback on new video");
                  video.play().then(() => {
                    console.log("🎬 VIDEO-SYNC: ✅ Seamless transition completed");
                    syncInProgress.current = false;
                  }).catch(e => {
                    console.error("🎬 VIDEO-SYNC: ❌ Failed to resume playback:", e);
                    syncInProgress.current = false;
                  });
                } else {
                  syncInProgress.current = false;
                }
              } catch (error) {
                console.error("🎬 VIDEO-SYNC: Error during transition completion:", error);
                syncInProgress.current = false;
              }

              // Cleanup listeners
              video.removeEventListener('canplay', handleTransitionReady);
              video.removeEventListener('loadeddata', handleTransitionReady);
            };

            const handleTransitionError = (e: Event) => {
              if (transitionCompleted) return;
              transitionCompleted = true;

              console.error("🎬 VIDEO-SYNC: Video loading error during transition:", e);
              video.removeEventListener('canplay', handleTransitionReady);
              video.removeEventListener('loadeddata', handleTransitionReady);
              video.removeEventListener('error', handleTransitionError);

              // Pause on error
              video.pause();
              syncInProgress.current = false;
            };

            // Set up enhanced event listeners
            video.addEventListener('canplay', handleTransitionReady);
            video.addEventListener('loadeddata', handleTransitionReady);
            video.addEventListener('error', handleTransitionError);

            // Timeout fallback for slow loading
            transitionTimeout.current = setTimeout(() => {
              if (!transitionCompleted) {
                console.warn("🎬 VIDEO-SYNC: Transition timeout, forcing completion");
                handleTransitionReady();
              }
            }, 5000);

            // Perform the source change
            video.src = nextClip.src;
            video.load();
          } else {
            // Same video source - just update time position
            console.log("🎬 VIDEO-SYNC: Same video source, updating position");
            try {
              video.currentTime = nextClipStartTime;

              if (wasPlaying) {
                video.play().then(() => {
                  console.log("🎬 VIDEO-SYNC: ✅ Same-source transition completed");
                  syncInProgress.current = false;
                }).catch(e => {
                  console.error("🎬 VIDEO-SYNC: ❌ Failed to continue playback:", e);
                  syncInProgress.current = false;
                });
              } else {
                syncInProgress.current = false;
              }
            } catch (error) {
              console.error("🎬 VIDEO-SYNC: Error updating video time:", error);
              syncInProgress.current = false;
            }
          }
        };

        performTransition();
        return;
      } else {
        // End of timeline - stop playback gracefully
        console.log("🎬 VIDEO-SYNC: End of timeline reached");
        video.pause();
        syncInProgress.current = false;
        return;
      }
    }

    // Regular time updates for current clip
    if (!syncInProgress.current) {
      const relativeTime = Math.max(0, videoCurrentTime - clipStartTime);
      setCurrentTime(relativeTime);

      // Calculate absolute position efficiently
      const currentClipIndex = timelineClips.findIndex(c => c.id === selectedClip.id);
      if (currentClipIndex >= 0) {
        let accumulatedTime = 0;
        for (let i = 0; i < currentClipIndex; i++) {
          const clip = timelineClips[i];
          const clipDuration = (clip.endTime ?? clip.originalDuration ?? 0) - (clip.startTime ?? 0);
          accumulatedTime += clipDuration;
        }
        const absoluteTime = accumulatedTime + relativeTime;
        setAbsoluteTimelinePosition(absoluteTime);
      }
    }
  }, [selectedClip, timelineClips, setSelectedClip, setCurrentTime, setAbsoluteTimelinePosition, isAudioMaster]);

  // Listen to video timeupdate events (only in video-only mode)
  useEffect(() => {
    if (isAudioMaster) return;

    const video = videoRef.current;
    if (!video) return;

    // Throttled time update handler for better performance
    let animationFrameId: number;

    const handleVideoTimeUpdate = () => {
      // Use requestAnimationFrame for smooth 60fps updates
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(syncVideoTime);
    };

    video.addEventListener('timeupdate', handleVideoTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleVideoTimeUpdate);
      cancelAnimationFrame(animationFrameId);
      if (transitionTimeout.current) {
        clearTimeout(transitionTimeout.current);
      }
    };
  }, [syncVideoTime, isAudioMaster]);

  return {
    syncVideoTime
  };
};
