import React, { createContext, useContext, ReactNode, useRef } from 'react';
import { MediaClip } from '@/types';
import { useVideoSync } from '@/hooks/useVideoSync';
import { useAutoSelect } from '@/hooks/useAutoSelect';
import { usePlaybackControls } from '@/hooks/usePlaybackControls';
import { useSeekControls } from '@/hooks/useSeekControls';
import { useClipTransition } from '@/hooks/useClipTransition';
import { useAudioTimeSync } from '@/hooks/useAudioTimeSync';
import { useVideoTimeSync } from '@/hooks/useVideoTimeSync';
import { useBufferManager } from '@/hooks/useBufferManager';

export type { MediaClip };

interface EditorContextType {
  togglePlay: () => void;
  jumpToStart: () => void;
  jumpToEnd: () => void;
  handleClipEnded: () => void;
  seekToTime: (time: number) => void;
  seekToAbsoluteTime: (absoluteTime: number) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  audioRef: React.RefObject<HTMLAudioElement>;
  getAbsoluteTimePosition: () => number;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider = ({ children }: { children: ReactNode }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Use custom hooks for different concerns
  useVideoSync(videoRef, audioRef);
  useAutoSelect();
  useAudioTimeSync(videoRef, audioRef); // Audio-driven timeline sync
  useVideoTimeSync(videoRef); // NEW: Video-only timeline sync
  
  const { togglePlay, jumpToStart, jumpToEnd } = usePlaybackControls(videoRef, audioRef);
  const { getAbsoluteTimePosition, seekToAbsoluteTime, seekToTime } = useSeekControls(videoRef, audioRef);
  const { handleClipEnded } = useClipTransition(videoRef, audioRef);

  const value = {
    togglePlay,
    jumpToStart,
    jumpToEnd,
    handleClipEnded,
    seekToTime,
    seekToAbsoluteTime,
    videoRef,
    audioRef,
    getAbsoluteTimePosition,
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
