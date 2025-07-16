import React from 'react';
import { Loader2, AlertCircle, CheckCircle, Music, Volume2 } from 'lucide-react';
import { useEditorStore } from '@/lib/store';
import { useAudioBuffer } from '@/hooks/useAudioBuffer';

interface AudioLoadingIndicatorProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  showDetailed?: boolean;
}

const AudioLoadingIndicator: React.FC<AudioLoadingIndicatorProps> = ({ 
  audioRef, 
  showDetailed = true 
}) => {
  const { audioFile, audioUrl, isBuffering, errorStates } = useEditorStore();
  const { audioBufferState } = useAudioBuffer(audioRef);

  if (!audioFile || !audioUrl) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLargeFile = audioFile.size > 50 * 1024 * 1024; // 50MB
  const audioError = errorStates['audio'];

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-blue-500" />
          <span className="font-medium text-sm">Audio Track</span>
        </div>
        
        {audioError && (
          <div className="flex items-center gap-1 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs">Error</span>
          </div>
        )}
        
        {audioBufferState.isLoading && (
          <div className="flex items-center gap-1 text-blue-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Loading...</span>
          </div>
        )}
        
        {audioBufferState.isReady && (
          <div className="flex items-center gap-1 text-green-500">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs">Ready</span>
          </div>
        )}
        
        {isBuffering && (
          <div className="flex items-center gap-1 text-yellow-500">
            <Volume2 className="h-4 w-4" />
            <span className="text-xs">Buffering</span>
          </div>
        )}
      </div>

      {showDetailed && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{audioFile.name}</span>
            <span>{formatFileSize(audioFile.size)}</span>
          </div>
          
          {isLargeFile && (
            <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
              Large audio file detected. Loading may take longer.
            </div>
          )}
          
          {audioError && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              Error: {audioError}
              {audioBufferState.retryCount > 0 && (
                <span className="ml-2">
                  (Retry {audioBufferState.retryCount}/3)
                </span>
              )}
            </div>
          )}
          
          {/* Loading Progress */}
          {audioBufferState.loadProgress > 0 && audioBufferState.loadProgress < 100 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Loading Progress</span>
                <span>{audioBufferState.loadProgress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${audioBufferState.loadProgress}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Buffer Level */}
          {audioBufferState.bufferLevel > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Buffer Level</span>
                <span>{audioBufferState.bufferLevel.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${audioBufferState.bufferLevel}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Audio Duration (if available) */}
          {audioRef.current?.duration && (
            <div className="text-xs text-muted-foreground">
              Duration: {formatTime(audioRef.current.duration)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioLoadingIndicator;