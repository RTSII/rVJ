import { useEffect, useRef } from 'react';
import { MediaClip } from '@/types';

export const useVideoPreloader = (clips: MediaClip[], currentClipId: string | undefined) => {
  const preloadedVideos = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    // Find current clip index
    const currentIndex = clips.findIndex(clip => clip.id === currentClipId);
    
    // Preload next 2-3 clips for smooth transitions
    const preloadRange = 2;
    const startIndex = Math.max(0, currentIndex - 1);
    const endIndex = Math.min(clips.length - 1, currentIndex + preloadRange);

    // Clean up videos not in range
    preloadedVideos.current.forEach((video, clipId) => {
      const clipIndex = clips.findIndex(clip => clip.id === clipId);
      if (clipIndex < startIndex || clipIndex > endIndex) {
        video.src = '';
        video.load();
        preloadedVideos.current.delete(clipId);
        console.log("🎬 PRELOAD: Cleaned up video for clip:", clipId);
      }
    });

    // Preload videos in range
    for (let i = startIndex; i <= endIndex; i++) {
      const clip = clips[i];
      if (clip && !preloadedVideos.current.has(clip.id)) {
        const video = document.createElement('video');
        video.src = clip.src;
        video.preload = 'auto';
        video.muted = true; // Preload videos should be muted
        
        const handleCanPlayThrough = () => {
          console.log("🎬 PRELOAD: Video ready for clip:", clip.id);
          video.removeEventListener('canplaythrough', handleCanPlayThrough);
        };
        
        video.addEventListener('canplaythrough', handleCanPlayThrough);
        video.load();
        
        preloadedVideos.current.set(clip.id, video);
        console.log("🎬 PRELOAD: Started preloading clip:", clip.id);
      }
    }
  }, [clips, currentClipId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      preloadedVideos.current.forEach(video => {
        video.src = '';
        video.load();
      });
      preloadedVideos.current.clear();
    };
  }, []);

  return {
    isPreloaded: (clipId: string) => preloadedVideos.current.has(clipId),
    getPreloadedVideo: (clipId: string) => preloadedVideos.current.get(clipId)
  };
};