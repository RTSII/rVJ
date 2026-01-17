import React from 'react';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useEditorStore } from '@/lib/store';

interface BufferIndicatorProps {
  clipId: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const BufferIndicator: React.FC<BufferIndicatorProps> = ({ 
  clipId, 
  size = 'md', 
  showText = true 
}) => {
  const { bufferStates, errorStates } = useEditorStore();
  const bufferState = bufferStates[clipId];
  const errorState = errorStates[clipId];

  if (!bufferState) return null;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // Error state
  if (errorState) {
    return (
      <div className="flex items-center gap-2 text-red-500">
        <AlertCircle className={sizeClasses[size]} />
        {showText && (
          <span className={textSizeClasses[size]}>
            Error: {errorState}
          </span>
        )}
      </div>
    );
  }

  // Loading state
  if (bufferState.isBuffering) {
    return (
      <div className="flex items-center gap-2 text-blue-500">
        <Loader2 className={`${sizeClasses[size]} animate-spin`} />
        {showText && (
          <span className={textSizeClasses[size]}>
            Buffering... {bufferState.bufferLevel.toFixed(0)}%
          </span>
        )}
      </div>
    );
  }

  // Loaded state
  if (bufferState.isLoaded) {
    return (
      <div className="flex items-center gap-2 text-green-500">
        <CheckCircle className={sizeClasses[size]} />
        {showText && (
          <span className={textSizeClasses[size]}>
            Ready
          </span>
        )}
      </div>
    );
  }

  // Buffer progress
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={`${sizeClasses[size]} rounded-full border-2 border-gray-300`}>
          <div 
            className="absolute inset-0 rounded-full bg-blue-500 transition-all duration-300"
            style={{ 
              clipPath: `polygon(0 0, ${bufferState.bufferLevel}% 0, ${bufferState.bufferLevel}% 100%, 0 100%)` 
            }}
          />
        </div>
      </div>
      {showText && (
        <span className={textSizeClasses[size]}>
          {bufferState.bufferLevel.toFixed(0)}%
        </span>
      )}
    </div>
  );
};

export default BufferIndicator;