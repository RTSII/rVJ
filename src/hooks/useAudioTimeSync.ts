
import { useEffect, useCallback, useRef } from 'react';
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

  const syncInProgress = useRef(false);
  const lastSyncTime = useRef(0);
  const videoTransitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Enhanced sync to audio time with better error handling
  const syncToAudioTime = useCallback(() => {
    // Only run in audio master mode
    if (!isAudioMaster || !audioRef.current || timelineClips.length === 0) return;

    // Prevent rapid successive syncs
    const now = Date.now();
    if (syncInProgress.current || now - lastSyncTime.current < 100) return;

    syncInProgress.current = true;
    lastSyncTime.current = now;

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
      console.log("🎵 AUDIO-SYNC: Auto-selecting clip based on audio time:", targetClip.id, "time in clip:", timeInClip);

      // Store current audio playing state
      const wasAudioPlaying = !audioRef.current.paused;
      const audioTimeSnapshot = audioCurrentTime;

      setSelectedClip(targetClip);

      // Enhanced video sync with better buffering handling
      if (videoRef.current) {
        const video = videoRef.current;
        const clipStartTime = targetClip.startTime ?? 0;
        const videoTime = clipStartTime + timeInClip;

        console.log("🎵 AUDIO-SYNC: Setting video time to:", videoTime, "for clip:", targetClip.id);

        if (video.src !== targetClip.src) {
          // Different video source - enhanced transition handling
          console.log("🎵 AUDIO-SYNC: Changing video source for auto-select");

          // Clear any existing timeout
          if (videoTransitionTimeout.current) {
            clearTimeout(videoTransitionTimeout.current);
            videoTransitionTimeout.current = null;
          }

          let transitionCompleted = false;

          const handleVideoReady = () => {
            if (transitionCompleted) return;
            transitionCompleted = true;

            console.log("🎵 AUDIO-SYNC: Video ready after source change");

            try {
              // Re-check audio time as it may have progressed during video loading
              const currentAudioTime = audioRef.current?.currentTime ?? audioTimeSnapshot;
              const updatedTimeInClip = currentAudioTime - accumulatedTime;
              const updatedVideoTime = clipStartTime + Math.max(0, updatedTimeInClip);

              video.currentTime = updatedVideoTime;
              console.log("🎵 AUDIO-SYNC: Updated video time to:", updatedVideoTime, "based on current audio:", currentAudioTime);

              // CRITICAL: Resume video playback if audio is playing
              if (wasAudioPlaying && audioRef.current && !audioRef.current.paused) {
                console.log("🎵 AUDIO-SYNC: Resuming video playback after auto-select");
                video.play().then(() => {
                  console.log("🎵 AUDIO-SYNC: ✅ Video resumed successfully");
                }).catch(e => {
                  console.error("🎵 AUDIO-SYNC: ❌ Video play failed:", e);
                  // Audio continues regardless of video issues
                });
              }
            } catch (error) {
              console.error("🎵 AUDIO-SYNC: Error during video sync:", error);
            }

            video.removeEventListener('canplay', handleVideoReady);
            video.removeEventListener('loadeddata', handleVideoReady);
          };

          const handleVideoError = (e: Event) => {
            if (transitionCompleted) return;
            transitionCompleted = true;

            console.error("🎵 AUDIO-SYNC: Video loading error during sync:", e);
            video.removeEventListener('canplay', handleVideoReady);
            video.removeEventListener('loadeddata', handleVideoReady);
            video.removeEventListener('error', handleVideoError);

            // Audio continues even if video fails
            console.log("🎵 AUDIO-SYNC: Continuing audio playback despite video error");
          };

          // Set up event listeners
          video.addEventListener('canplay', handleVideoReady);
          video.addEventListener('loadeddata', handleVideoReady);
          video.addEventListener('error', handleVideoError);

          // Timeout fallback to prevent infinite waiting
          videoTransitionTimeout.current = setTimeout(() => {
            if (!transitionCompleted) {
              console.warn("🎵 AUDIO-SYNC: Video loading timeout, forcing completion");
              handleVideoReady();
            }
          }, 3000);

          // Perform the source change
          video.src = targetClip.src;
          video.load();
        } else {
          // Same video source - just update time
          try {
            video.currentTime = videoTime;

            // Resume playback if audio is playing and video is paused
            if (wasAudioPlaying && !audioRef.current.paused && video.paused) {
              console.log("🎵 AUDIO-SYNC: Resuming video playback (same source)");
              video.play().catch(e =>
                console.error("🎵 AUDIO-SYNC: Video play failed:", e)
              );
            }
          } catch (error) {
            console.error("🎵 AUDIO-SYNC: Error setting video time:", error);
          }
        }
      }
    }

    // Update current time and absolute position
    if (targetClip) {
      setCurrentTime(Math.max(0, timeInClip));
      setAbsoluteTimelinePosition(audioCurrentTime);
    }

    syncInProgress.current = false;
  }, [timelineClips, selectedClip, setSelectedClip, setCurrentTime, setAbsoluteTimelinePosition, isAudioMaster]);

  // Listen to audio timeupdate events to drive the timeline (only in audio master mode)
  useEffect(() => {
    if (!isAudioMaster) return;

    const audio = audioRef.current;
    if (!audio) return;

    // Throttled time update handler to prevent excessive syncing
    let animationFrameId: number;

    const handleAudioTimeUpdate = () => {
      // Use requestAnimationFrame for smooth syncing
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(syncToAudioTime);
    };

    audio.addEventListener('timeupdate', handleAudioTimeUpdate);

    return () => {
      audio.removeEventListener('timeupdate', handleAudioTimeUpdate);
      cancelAnimationFrame(animationFrameId);
      if (videoTransitionTimeout.current) {
        clearTimeout(videoTransitionTimeout.current);
      }
    };
  }, [syncToAudioTime, isAudioMaster]);

  return {
    syncToAudioTime
  };
};
