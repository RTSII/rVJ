import { useCallback, useRef, useEffect } from 'react';
import { useEditorStore } from '@/lib/store';
import { MediaClip } from '@/types';

interface TransitionState {
  isTransitioning: boolean;
  fromClip: MediaClip | null;
  toClip: MediaClip | null;
  progress: number;
  error?: string;
}

export const useTransitionManager = (
  videoRef: React.RefObject<HTMLVideoElement>,
  audioRef: React.RefObject<HTMLAudioElement>
) => {
  const transitionState = useRef<TransitionState>({
    isTransitioning: false,
    fromClip: null,
    toClip: null,
    progress: 0
  });

  const preloadVideo = useRef<HTMLVideoElement | null>(null);
  const transitionTimeout = useRef<NodeJS.Timeout | null>(null);

  const { 
    timelineClips, 
    selectedClip, 
    setSelectedClip, 
    setCurrentTime, 
    setTransitionState,
    bufferStates,
    setIsPlaying 
  } = useEditorStore();

  // Update transition state
  const updateTransitionState = useCallback((updates: Partial<TransitionState>) => {
    transitionState.current = { ...transitionState.current, ...updates };
    setTransitionState(transitionState.current);
  }, [setTransitionState]);

  // Preload next clip for smooth transition
  const preloadNextClip = useCallback(async (nextClip: MediaClip): Promise<void> => {
    if (!nextClip || preloadVideo.current?.src === nextClip.src) return;

    console.log('🎬 TRANSITION: Preloading next clip for smooth transition:', nextClip.id);

    // Create or reuse preload video element
    if (!preloadVideo.current) {
      preloadVideo.current = document.createElement('video');
      preloadVideo.current.style.display = 'none';
      preloadVideo.current.muted = true;
      preloadVideo.current.preload = 'auto';
      document.body.appendChild(preloadVideo.current);
    }

    return new Promise((resolve, reject) => {
      const video = preloadVideo.current!;
      
      const cleanup = () => {
        video.removeEventListener('canplaythrough', onCanPlay);
        video.removeEventListener('error', onError);
        video.removeEventListener('progress', onProgress);
      };

      const onCanPlay = () => {
        console.log('✅ TRANSITION: Next clip preloaded successfully');
        cleanup();
        resolve();
      };

      const onError = (error: any) => {
        console.error('❌ TRANSITION: Failed to preload next clip:', error);
        cleanup();
        reject(error);
      };

      const onProgress = () => {
        if (video.buffered.length > 0) {
          const buffered = video.buffered.end(0);
          const duration = video.duration || 1;
          const progress = (buffered / duration) * 100;
          
          updateTransitionState({ progress });
        }
      };

      video.addEventListener('canplaythrough', onCanPlay);
      video.addEventListener('error', onError);
      video.addEventListener('progress', onProgress);
      
      video.src = nextClip.src;
      video.load();

      // Timeout after 10 seconds
      setTimeout(() => {
        cleanup();
        reject(new Error('Preload timeout'));
      }, 10000);
    });
  }, [updateTransitionState]);

  // Smooth transition to next clip
  const transitionToClip = useCallback(async (nextClip: MediaClip, startTime: number = 0): Promise<void> => {
    if (!videoRef.current || !nextClip) return;

    const video = videoRef.current;
    const currentClip = selectedClip;
    
    console.log('🎬 TRANSITION: Starting transition to clip:', nextClip.id);

    updateTransitionState({
      isTransitioning: true,
      fromClip: currentClip,
      toClip: nextClip,
      progress: 0
    });

    try {
      // Check if next clip is already preloaded
      const bufferState = bufferStates[nextClip.id];
      if (!bufferState?.isLoaded) {
        console.log('🎬 TRANSITION: Next clip not preloaded, loading now...');
        await preloadNextClip(nextClip);
      }

      // Store current playback state
      const wasPlaying = !video.paused;
      const audioWasPlaying = audioRef.current ? !audioRef.current.paused : false;

      // Pause current playback
      if (wasPlaying) {
        video.pause();
      }
      if (audioWasPlaying && audioRef.current) {
        audioRef.current.pause();
      }

      // Set new clip
      setSelectedClip(nextClip);
      setCurrentTime(0);

      // Handle video source change
      if (video.src !== nextClip.src) {
        await new Promise<void>((resolve, reject) => {
          const handleCanPlay = () => {
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
            resolve();
          };

          const handleError = (error: any) => {
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
            reject(error);
          };

          video.addEventListener('canplay', handleCanPlay);
          video.addEventListener('error', handleError);
          
          video.src = nextClip.src;
          video.load();
        });
      }

      // Set start time
      const clipStartTime = nextClip.startTime ?? startTime;
      video.currentTime = clipStartTime;

      // Resume playback if was playing
      if (wasPlaying) {
        await video.play();
        setIsPlaying(true);
      }

      if (audioWasPlaying && audioRef.current) {
        audioRef.current.play();
      }

      updateTransitionState({
        isTransitioning: false,
        progress: 100
      });

      console.log('✅ TRANSITION: Transition completed successfully');

    } catch (error) {
      console.error('❌ TRANSITION: Transition failed:', error);
      
      updateTransitionState({
        isTransitioning: false,
        error: error instanceof Error ? error.message : 'Transition failed'
      });

      // Fallback: try to continue with current clip
      if (selectedClip && video.src !== selectedClip.src) {
        video.src = selectedClip.src;
        video.load();
      }
    }
  }, [videoRef, audioRef, selectedClip, setSelectedClip, setCurrentTime, setIsPlaying, bufferStates, preloadNextClip, updateTransitionState]);

  // Auto-transition to next clip when current ends
  const handleAutoTransition = useCallback(() => {
    if (!selectedClip || transitionState.current.isTransitioning) return;

    const currentIndex = timelineClips.findIndex(c => c.id === selectedClip.id);
    if (currentIndex >= 0 && currentIndex < timelineClips.length - 1) {
      const nextClip = timelineClips[currentIndex + 1];
      console.log('🎬 TRANSITION: Auto-transitioning to next clip:', nextClip.id);
      transitionToClip(nextClip);
    } else {
      console.log('🎬 TRANSITION: Reached end of timeline');
      setIsPlaying(false);
    }
  }, [selectedClip, timelineClips, transitionToClip, setIsPlaying]);

  // Preload next clip when approaching end of current clip
  useEffect(() => {
    if (!selectedClip || !videoRef.current) return;

    const video = videoRef.current;
    const currentIndex = timelineClips.findIndex(c => c.id === selectedClip.id);
    
    if (currentIndex >= 0 && currentIndex < timelineClips.length - 1) {
      const nextClip = timelineClips[currentIndex + 1];
      
      const handleTimeUpdate = () => {
        const clipEndTime = selectedClip.endTime ?? selectedClip.originalDuration ?? video.duration;
        const timeRemaining = clipEndTime - video.currentTime;
        
        // Preload next clip when 3 seconds remaining
        if (timeRemaining <= 3 && timeRemaining > 0) {
          const bufferState = bufferStates[nextClip.id];
          if (!bufferState?.isLoaded && !transitionState.current.isTransitioning) {
            console.log('🎬 TRANSITION: Preloading next clip (3s remaining)');
            preloadNextClip(nextClip).catch(console.error);
          }
        }
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }
  }, [selectedClip, timelineClips, videoRef, bufferStates, preloadNextClip]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeout.current) {
        clearTimeout(transitionTimeout.current);
      }
      if (preloadVideo.current) {
        preloadVideo.current.remove();
      }
    };
  }, []);

  return {
    transitionToClip,
    handleAutoTransition,
    isTransitioning: transitionState.current.isTransitioning,
    transitionProgress: transitionState.current.progress
  };
};