import { useRef, useCallback, useEffect } from 'react';
import { useEditorStore } from '@/lib/store';

interface AudioBufferState {
  isLoading: boolean;
  loadProgress: number;
  bufferLevel: number;
  isReady: boolean;
  error?: string;
  retryCount: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export const useAudioBuffer = (audioRef: React.RefObject<HTMLAudioElement>) => {
  const audioBufferState = useRef<AudioBufferState>({
    isLoading: false,
    loadProgress: 0,
    bufferLevel: 0,
    isReady: false,
    retryCount: 0
  });

  const retryTimeout = useRef<NodeJS.Timeout | null>(null);

  const { 
    setIsBuffering, 
    setErrorState, 
    clearErrorState,
    audioFile,
    audioUrl 
  } = useEditorStore();

  // Update buffer state
  const updateBufferState = useCallback((updates: Partial<AudioBufferState>) => {
    audioBufferState.current = { ...audioBufferState.current, ...updates };
    setIsBuffering(updates.isLoading || updates.bufferLevel < 25);
  }, [setIsBuffering]);

  // Load audio with retry logic
  const loadAudioWithRetry = useCallback(async (audioElement: HTMLAudioElement, url: string): Promise<void> => {
    const state = audioBufferState.current;
    
    if (state.retryCount >= MAX_RETRIES) {
      throw new Error(`Failed to load audio after ${MAX_RETRIES} attempts`);
    }

    try {
      updateBufferState({ isLoading: true, error: undefined });
      clearErrorState('audio');

      // Set up progress monitoring
      const handleProgress = () => {
        if (audioElement.buffered.length > 0) {
          const buffered = audioElement.buffered.end(0);
          const duration = audioElement.duration || 1;
          const bufferLevel = (buffered / duration) * 100;
          
          updateBufferState({ 
            bufferLevel,
            loadProgress: bufferLevel 
          });
        }
      };

      const handleCanPlayThrough = () => {
        updateBufferState({ 
          isLoading: false, 
          isReady: true, 
          bufferLevel: 100,
          loadProgress: 100,
          retryCount: 0
        });
        
        console.log('✅ AUDIO: Large audio file loaded successfully');
      };

      const handleError = (error: Event) => {
        console.error('❌ AUDIO: Loading error:', error);
        throw new Error('Audio loading failed');
      };

      // Add event listeners
      audioElement.addEventListener('progress', handleProgress);
      audioElement.addEventListener('canplaythrough', handleCanPlayThrough);
      audioElement.addEventListener('error', handleError);

      // Configure audio element for large files
      audioElement.preload = 'auto';
      audioElement.src = url;
      audioElement.load();

      // Wait for audio to be ready with timeout
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Audio loading timeout'));
        }, 60000); // 60 second timeout for large files

        const checkReady = () => {
          if (audioBufferState.current.isReady) {
            clearTimeout(timeoutId);
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };

        checkReady();
      });

      // Clean up listeners
      audioElement.removeEventListener('progress', handleProgress);
      audioElement.removeEventListener('canplaythrough', handleCanPlayThrough);
      audioElement.removeEventListener('error', handleError);

    } catch (error) {
      console.error('❌ AUDIO: Loading attempt failed:', error);
      
      const newRetryCount = state.retryCount + 1;
      updateBufferState({ 
        isLoading: false, 
        retryCount: newRetryCount,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (newRetryCount < MAX_RETRIES) {
        console.log(`🔄 AUDIO: Retrying audio load (${newRetryCount}/${MAX_RETRIES})`);
        
        // Schedule retry with exponential backoff
        const delay = RETRY_DELAY * Math.pow(2, newRetryCount - 1);
        retryTimeout.current = setTimeout(() => {
          loadAudioWithRetry(audioElement, url);
        }, delay);
      } else {
        const errorMessage = `Failed to load audio after ${MAX_RETRIES} attempts`;
        setErrorState('audio', errorMessage);
        throw new Error(errorMessage);
      }
    }
  }, [updateBufferState, clearErrorState, setErrorState]);

  // Monitor audio buffer levels during playback
  const monitorAudioBuffer = useCallback(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    
    try {
      if (audio.buffered.length > 0) {
        const currentTime = audio.currentTime;
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const duration = audio.duration || 1;
        
        const bufferLevel = (bufferedEnd / duration) * 100;
        const bufferAhead = bufferedEnd - currentTime;
        
        updateBufferState({ bufferLevel });
        
        // Check if we need more buffering
        if (bufferAhead < 5 && !audio.paused) {
          // Less than 5 seconds buffered ahead
          updateBufferState({ isLoading: true });
        } else if (bufferAhead > 10) {
          updateBufferState({ isLoading: false });
        }
      }
    } catch (error) {
      console.warn('Audio buffer monitoring error:', error);
    }
  }, [updateBufferState]);

  // Initialize audio loading when audio URL changes
  useEffect(() => {
    if (!audioUrl || !audioRef.current) return;

    console.log('🎵 AUDIO: Loading large audio file:', audioFile?.name, 'Size:', audioFile?.size);
    
    // Reset state
    updateBufferState({
      isLoading: false,
      loadProgress: 0,
      bufferLevel: 0,
      isReady: false,
      retryCount: 0,
      error: undefined
    });

    // Start loading
    loadAudioWithRetry(audioRef.current, audioUrl).catch(error => {
      console.error('🚨 AUDIO: Failed to load audio:', error);
    });
  }, [audioUrl, audioRef, loadAudioWithRetry, updateBufferState, audioFile]);

  // Monitor buffer levels periodically
  useEffect(() => {
    const interval = setInterval(monitorAudioBuffer, 2000);
    return () => clearInterval(interval);
  }, [monitorAudioBuffer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
      }
    };
  }, []);

  return {
    audioBufferState: audioBufferState.current,
    loadAudioWithRetry,
    monitorAudioBuffer
  };
};