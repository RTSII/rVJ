import { useRef, useCallback, useEffect } from 'react';
import { useEditorStore } from '@/lib/store';
import { MediaClip } from '@/types';

interface BufferState {
  clipId: string;
  bufferLevel: number;
  isBuffering: boolean;
  isLoaded: boolean;
  retryCount: number;
  lastError?: string;
}

interface BufferManagerConfig {
  maxPreloadedClips: number;
  maxRetries: number;
  retryDelay: number;
  maxMemoryMB: number;
  preloadDistance: number;
}

export const useBufferManager = (
  videoRef: React.RefObject<HTMLVideoElement>,
  audioRef: React.RefObject<HTMLAudioElement>
) => {
  const bufferStates = useRef<Map<string, BufferState>>(new Map());
  const preloadedClips = useRef<Set<string>>(new Set());
  const memoryUsage = useRef<number>(0);
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const config: BufferManagerConfig = {
    maxPreloadedClips: 5, // Limit preloaded clips to manage memory
    maxRetries: 3,
    retryDelay: 1000,
    maxMemoryMB: 500, // 500MB memory limit
    preloadDistance: 2 // Preload 2 clips ahead/behind
  };

  const { 
    timelineClips, 
    selectedClip, 
    setBufferState, 
    setTransitionState,
    setErrorState 
  } = useEditorStore();

  // Create buffer state for a clip
  const createBufferState = (clipId: string): BufferState => ({
    clipId,
    bufferLevel: 0,
    isBuffering: false,
    isLoaded: false,
    retryCount: 0
  });

  // Update buffer state
  const updateBufferState = useCallback((clipId: string, updates: Partial<BufferState>) => {
    const current = bufferStates.current.get(clipId) || createBufferState(clipId);
    const updated = { ...current, ...updates };
    bufferStates.current.set(clipId, updated);
    setBufferState(clipId, updated);
  }, [setBufferState]);

  // Estimate memory usage of a clip
  const estimateClipMemory = (clip: MediaClip): number => {
    if (!clip.file) return 0;
    // Rough estimation: file size * 1.5 (for decompression overhead)
    return (clip.file.size / 1024 / 1024) * 1.5;
  };

  // Check if we can preload more clips
  const canPreload = useCallback((): boolean => {
    return preloadedClips.current.size < config.maxPreloadedClips && 
           memoryUsage.current < config.maxMemoryMB;
  }, []);

  // Unload distant clips to free memory
  const unloadDistantClips = useCallback((currentClipIndex: number) => {
    const clipsToUnload: string[] = [];
    
    preloadedClips.current.forEach(clipId => {
      const clipIndex = timelineClips.findIndex(c => c.id === clipId);
      const distance = Math.abs(clipIndex - currentClipIndex);
      
      if (distance > config.preloadDistance) {
        clipsToUnload.push(clipId);
      }
    });

    clipsToUnload.forEach(clipId => {
      const clip = timelineClips.find(c => c.id === clipId);
      if (clip) {
        // Revoke object URL to free memory
        if (clip.src.startsWith('blob:')) {
          URL.revokeObjectURL(clip.src);
        }
        preloadedClips.current.delete(clipId);
        memoryUsage.current -= estimateClipMemory(clip);
        
        console.log(`🧹 BUFFER: Unloaded distant clip ${clipId}, memory usage: ${memoryUsage.current.toFixed(1)}MB`);
      }
    });
  }, [timelineClips]);

  // Preload clip with retry logic
  const preloadClip = useCallback(async (clip: MediaClip): Promise<void> => {
    if (preloadedClips.current.has(clip.id)) return;
    
    const bufferState = bufferStates.current.get(clip.id) || createBufferState(clip.id);
    
    if (bufferState.retryCount >= config.maxRetries) {
      console.warn(`🔄 BUFFER: Max retries reached for clip ${clip.id}`);
      return;
    }

    try {
      updateBufferState(clip.id, { isBuffering: true });
      
      // Create a hidden video element for preloading
      const preloadVideo = document.createElement('video');
      preloadVideo.src = clip.src;
      preloadVideo.preload = 'auto';
      preloadVideo.muted = true;
      preloadVideo.style.display = 'none';
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Preload timeout'));
        }, 30000); // 30 second timeout

        preloadVideo.oncanplaythrough = () => {
          clearTimeout(timeout);
          resolve();
        };

        preloadVideo.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Preload failed'));
        };

        preloadVideo.onprogress = () => {
          if (preloadVideo.buffered.length > 0) {
            const buffered = preloadVideo.buffered.end(0);
            const duration = preloadVideo.duration || 1;
            const bufferLevel = (buffered / duration) * 100;
            updateBufferState(clip.id, { bufferLevel });
          }
        };
      });

      // Add to preloaded clips and update memory usage
      preloadedClips.current.add(clip.id);
      memoryUsage.current += estimateClipMemory(clip);
      
      updateBufferState(clip.id, { 
        isBuffering: false, 
        isLoaded: true, 
        bufferLevel: 100,
        retryCount: 0
      });
      
      console.log(`✅ BUFFER: Preloaded clip ${clip.id}, memory usage: ${memoryUsage.current.toFixed(1)}MB`);
      
      // Clean up preload element
      preloadVideo.remove();
      
    } catch (error) {
      console.error(`❌ BUFFER: Failed to preload clip ${clip.id}:`, error);
      
      const newRetryCount = bufferState.retryCount + 1;
      updateBufferState(clip.id, { 
        isBuffering: false, 
        retryCount: newRetryCount,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Schedule retry with exponential backoff
      if (newRetryCount < config.maxRetries) {
        const delay = config.retryDelay * Math.pow(2, newRetryCount - 1);
        const timeoutId = setTimeout(() => {
          retryTimeouts.current.delete(clip.id);
          preloadClip(clip);
        }, delay);
        
        retryTimeouts.current.set(clip.id, timeoutId);
      } else {
        setErrorState(clip.id, `Failed to load clip after ${config.maxRetries} attempts`);
      }
    }
  }, [updateBufferState, setErrorState]);

  // Get clips to preload based on current position
  const getClipsToPreload = useCallback((currentClipIndex: number): MediaClip[] => {
    const clipsToPreload: MediaClip[] = [];
    
    // Add previous clips
    for (let i = Math.max(0, currentClipIndex - config.preloadDistance); i < currentClipIndex; i++) {
      if (timelineClips[i] && !preloadedClips.current.has(timelineClips[i].id)) {
        clipsToPreload.push(timelineClips[i]);
      }
    }
    
    // Add next clips
    for (let i = currentClipIndex + 1; i <= Math.min(timelineClips.length - 1, currentClipIndex + config.preloadDistance); i++) {
      if (timelineClips[i] && !preloadedClips.current.has(timelineClips[i].id)) {
        clipsToPreload.push(timelineClips[i]);
      }
    }
    
    return clipsToPreload;
  }, [timelineClips]);

  // Main preload management function
  const managePreloading = useCallback(async () => {
    if (!selectedClip || timelineClips.length === 0) return;
    
    const currentClipIndex = timelineClips.findIndex(c => c.id === selectedClip.id);
    if (currentClipIndex === -1) return;
    
    // First, unload distant clips to free memory
    unloadDistantClips(currentClipIndex);
    
    // Then preload nearby clips if we have capacity
    if (canPreload()) {
      const clipsToPreload = getClipsToPreload(currentClipIndex);
      
      for (const clip of clipsToPreload) {
        if (canPreload()) {
          await preloadClip(clip);
        } else {
          break;
        }
      }
    }
  }, [selectedClip, timelineClips, unloadDistantClips, canPreload, getClipsToPreload, preloadClip]);

  // Monitor buffer levels for current video
  const monitorCurrentVideoBuffer = useCallback(() => {
    if (!videoRef.current || !selectedClip) return;
    
    const video = videoRef.current;
    
    try {
      if (video.buffered.length > 0) {
        const buffered = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration || 1;
        const bufferLevel = (buffered / duration) * 100;
        
        updateBufferState(selectedClip.id, { bufferLevel });
      }
      
      // Check if we're close to the end of the buffer
      const currentTime = video.currentTime;
      const bufferedEnd = video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0;
      const bufferAhead = bufferedEnd - currentTime;
      
      if (bufferAhead < 2 && !video.paused) {
        // Less than 2 seconds buffered ahead, might cause stuttering
        updateBufferState(selectedClip.id, { isBuffering: true });
      } else if (bufferAhead > 5) {
        updateBufferState(selectedClip.id, { isBuffering: false });
      }
    } catch (error) {
      console.warn('Buffer monitoring error:', error);
    }
  }, [selectedClip, updateBufferState]);

  // Get buffer state for a clip
  const getBufferState = useCallback((clipId: string): BufferState => {
    return bufferStates.current.get(clipId) || createBufferState(clipId);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clear all retry timeouts
      retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
      retryTimeouts.current.clear();
      
      // Revoke object URLs
      preloadedClips.current.forEach(clipId => {
        const clip = timelineClips.find(c => c.id === clipId);
        if (clip && clip.src.startsWith('blob:')) {
          URL.revokeObjectURL(clip.src);
        }
      });
    };
  }, [timelineClips]);

  // Run preload management when selected clip changes
  useEffect(() => {
    managePreloading();
  }, [selectedClip?.id, managePreloading]);

  // Monitor buffer levels periodically
  useEffect(() => {
    const interval = setInterval(monitorCurrentVideoBuffer, 1000);
    return () => clearInterval(interval);
  }, [monitorCurrentVideoBuffer]);

  return {
    getBufferState,
    preloadClip,
    managePreloading,
    memoryUsage: memoryUsage.current,
    preloadedClipsCount: preloadedClips.current.size
  };
};