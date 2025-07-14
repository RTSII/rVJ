
import { useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/lib/store';
import { safeAddEventListener } from '@/lib/safeEventListeners';

export const useVideoSync = (
  videoRef: React.RefObject<HTMLVideoElement>,
  audioRef: React.RefObject<HTMLAudioElement>
) => {
  const { setIsPlaying } = useEditorStore();

  // Sync video/audio play/pause state
  useEffect(() => {
    const video = videoRef.current;
    const handlePlay = () => {
      console.log("🎮 VIDEO: Play event triggered");
      setIsPlaying(true);
    };
    const handlePause = () => {
      console.log("🎮 VIDEO: Pause event triggered");
      setIsPlaying(false);
    };

    const removePlayListener = safeAddEventListener(video, 'play', handlePlay);
    const removePauseListener = safeAddEventListener(video, 'pause', handlePause);

    return () => {
      removePlayListener();
      removePauseListener();
    };
  }, [setIsPlaying]);
};
