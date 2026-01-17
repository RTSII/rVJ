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

  const { 
    timelineClips, 
    selectedClip, 
    setSelectedClip, 
    setCurrentTime, 
    setTransitionState,
    setAbsoluteTimelinePosition,
    setIsPlaying 
  } = useEditorStore();

  // Update transition state
  const updateTransitionState = useCallback((updates: Partial<TransitionState>) => {
    transitionState.current = { ...transitionState.current, ...updates };
    setTransitionState(transitionState.current);
  }, [setTransitionState]);

  // Smooth transition to next clip while maintaining audio continuity
  const transitionToClip = useCallback(async (nextClip: MediaClip, startTime: number = 0): Promise<void> => {
    if (!videoRef.current || !nextClip) return;

    const video = videoRef.current;
    const currentClip = selectedClip;
    
    console.log('🎬 TRANSITION: Starting seamless transition to clip:', nextClip.id);

    updateTransitionState({
      isTransitioning: true,
      fromClip: currentClip,
      toClip: nextClip,
      progress: 0
    });

    try {
      // CRITICAL: Keep audio playing during transition for seamless experience
      const audioWasPlaying = audioRef.current ? !audioRef.current.paused : false;
      
      // Update state immediately
      setSelectedClip(nextClip);
      setCurrentTime(0);

      // Handle video source change without interrupting audio
      if (video.src !== nextClip.src) {
        console.log('🎬 TRANSITION: Changing video source for seamless transition');
        
        await new Promise<void>((resolve, reject) => {
          const handleCanPlay = () => {
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
            
            // Set the start time and play if audio is playing
            const clipStartTime = nextClip.startTime ?? startTime;
            video.currentTime = clipStartTime;
            
            // Only play video if audio is playing - maintain sync
            if (audioWasPlaying) {
              video.play().then(() => {
                console.log('✅ TRANSITION: Video resumed seamlessly');
                resolve();
              }).catch(reject);
            } else {
              resolve();
            }
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
      } else {
        // Same video source - just update time
        const clipStartTime = nextClip.startTime ?? startTime;
        video.currentTime = clipStartTime;
      }

      updateTransitionState({
        isTransitioning: false,
        progress: 100
      });

      console.log('✅ TRANSITION: Seamless transition completed successfully');

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
  }, [videoRef, audioRef, selectedClip, setSelectedClip, setCurrentTime, updateTransitionState]);

  // Auto-transition to next clip when current ends
  const handleAutoTransition = useCallback(() => {
    if (!selectedClip || transitionState.current.isTransitioning) return;

    const currentIndex = timelineClips.findIndex(c => c.id === selectedClip.id);
    if (currentIndex >= 0 && currentIndex < timelineClips.length - 1) {
      const nextClip = timelineClips[currentIndex + 1];
      console.log('🎬 TRANSITION: Auto-transitioning to next clip:', nextClip.id);
      
      // Calculate new absolute position
      let newAbsolutePosition = 0;
      for (let i = 0; i <= currentIndex; i++) {
        const clip = timelineClips[i];
        const clipDuration = (clip.endTime ?? clip.originalDuration ?? 0) - (clip.startTime ?? 0);
        newAbsolutePosition += clipDuration;
      }
      
      setAbsoluteTimelinePosition(newAbsolutePosition);
      transitionToClip(nextClip);
    } else {
      console.log('🎬 TRANSITION: Reached end of timeline');
      setIsPlaying(false);
    }
  }, [selectedClip, timelineClips, transitionToClip, setIsPlaying, setAbsoluteTimelinePosition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up any ongoing transitions
      if (transitionState.current.isTransitioning) {
        updateTransitionState({ isTransitioning: false });
      }
    };
  }, [updateTransitionState]);

  return {
    transitionToClip,
    handleAutoTransition,
    isTransitioning: transitionState.current.isTransitioning,
    transitionProgress: transitionState.current.progress
  };
};