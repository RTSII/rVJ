import { useEffect, useRef, useCallback, useState } from 'react';
import { MediaClip } from '@/types';

interface VideoBufferInfo {
  clipId: string;
  video: HTMLVideoElement;
  isReady: boolean;
  bufferHealth: number; // 0-100% of video buffered
  lastBufferCheck: number;
}

export const useVideoPreloader = (clips: MediaClip[], currentClipId: string | undefined) => {
  const preloadedVideos = useRef<Map<string, VideoBufferInfo>>(new Map());
  const [bufferStates, setBufferStates] = useState<Map<string, number>>(new Map());
  const bufferCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Enhanced buffer monitoring function
  const checkVideoBuffers = useCallback(() => {
    const newBufferStates = new Map<string, number>();

    preloadedVideos.current.forEach((bufferInfo, clipId) => {
      const video = bufferInfo.video;

      if (video.duration > 0) {
        // Calculate buffer health based on buffered time ranges
        let bufferedDuration = 0;
        for (let i = 0; i < video.buffered.length; i++) {
          bufferedDuration += video.buffered.end(i) - video.buffered.start(i);
        }

        const bufferHealth = Math.min(100, (bufferedDuration / video.duration) * 100);
        bufferInfo.bufferHealth = bufferHealth;
        bufferInfo.isReady = bufferHealth > 75; // Consider ready when 75% buffered
        bufferInfo.lastBufferCheck = Date.now();

        newBufferStates.set(clipId, bufferHealth);

        // Enhanced logging for debugging
        if (clipId === currentClipId) {
          console.log(`🎬 BUFFER: Current clip ${clipId} buffer health: ${bufferHealth.toFixed(1)}%`);
        }
      }
    });

    setBufferStates(newBufferStates);
  }, [currentClipId]);

  // Smart preloading with enhanced buffering strategy
  useEffect(() => {
    // Find current clip index
    const currentIndex = clips.findIndex(clip => clip.id === currentClipId);

    // Enhanced preload range: more aggressive for better UX
    const preloadRange = 3; // Increased from 2 to 3
    const startIndex = Math.max(0, currentIndex - 1);
    const endIndex = Math.min(clips.length - 1, currentIndex + preloadRange);

    // Clean up videos not in range
    preloadedVideos.current.forEach((bufferInfo, clipId) => {
      const clipIndex = clips.findIndex(clip => clip.id === clipId);
      if (clipIndex < startIndex || clipIndex > endIndex) {
        bufferInfo.video.src = '';
        bufferInfo.video.load();
        preloadedVideos.current.delete(clipId);
        console.log("🎬 PRELOAD: Cleaned up video for clip:", clipId);
      }
    });

    // Enhanced preload videos in range with better error handling
    for (let i = startIndex; i <= endIndex; i++) {
      const clip = clips[i];
      if (clip && !preloadedVideos.current.has(clip.id)) {
        const video = document.createElement('video');
        video.src = clip.src;
        video.preload = 'auto';
        video.muted = true;
        video.crossOrigin = 'anonymous'; // Better cross-origin support

        // Enhanced buffer info tracking
        const bufferInfo: VideoBufferInfo = {
          clipId: clip.id,
          video,
          isReady: false,
          bufferHealth: 0,
          lastBufferCheck: Date.now()
        };

        // Multiple event listeners for comprehensive loading tracking
        const handleCanPlayThrough = () => {
          console.log("🎬 PRELOAD: Video fully buffered for clip:", clip.id);
          bufferInfo.isReady = true;
          bufferInfo.bufferHealth = 100;
          checkVideoBuffers();
          video.removeEventListener('canplaythrough', handleCanPlayThrough);
        };

        const handleCanPlay = () => {
          console.log("🎬 PRELOAD: Video can start playing for clip:", clip.id);
          checkVideoBuffers();
        };

        const handleProgress = () => {
          checkVideoBuffers();
        };

        const handleError = (e: Event) => {
          console.error("🎬 PRELOAD: Video loading error for clip:", clip.id, e);
          bufferInfo.isReady = false;
          bufferInfo.bufferHealth = 0;
        };

        // Enhanced event listeners
        video.addEventListener('canplaythrough', handleCanPlayThrough);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('progress', handleProgress);
        video.addEventListener('error', handleError);
        video.addEventListener('loadeddata', () => console.log("🎬 PRELOAD: Metadata loaded for clip:", clip.id));

        video.load();
        preloadedVideos.current.set(clip.id, bufferInfo);
        console.log("🎬 PRELOAD: Started enhanced preloading for clip:", clip.id);
      }
    }
  }, [clips, currentClipId, checkVideoBuffers]);

  // Start buffer monitoring interval
  useEffect(() => {
    // Check buffers every 2 seconds
    bufferCheckInterval.current = setInterval(checkVideoBuffers, 2000);

    return () => {
      if (bufferCheckInterval.current) {
        clearInterval(bufferCheckInterval.current);
      }
    };
  }, [checkVideoBuffers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (bufferCheckInterval.current) {
        clearInterval(bufferCheckInterval.current);
      }
      preloadedVideos.current.forEach(bufferInfo => {
        bufferInfo.video.src = '';
        bufferInfo.video.load();
      });
      preloadedVideos.current.clear();
    };
  }, []);

  // Enhanced return functions with buffer health info
  return {
    isPreloaded: (clipId: string) => {
      const bufferInfo = preloadedVideos.current.get(clipId);
      return bufferInfo?.isReady ?? false;
    },
    getPreloadedVideo: (clipId: string) => {
      return preloadedVideos.current.get(clipId)?.video;
    },
    getBufferHealth: (clipId: string) => {
      return bufferStates.get(clipId) ?? 0;
    },
    getAllBufferStates: () => bufferStates,
    forceBufferCheck: checkVideoBuffers
  };
};