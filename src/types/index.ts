

export type Transition = {
  type: 'crossfade';
  duration: number; // in seconds
};

export type MediaClip = {
  id: string;
  src: string;
  file?: File; // Optional for backward compatibility
  filePath?: string; // Native filesystem path (Tauri desktop mode)
  assetUrl?: string; // Tauri asset:// URL for playback
  startTime?: number;
  endTime?: number;
  originalDuration?: number;
  transition?: Transition | null; // Transition from the PREVIOUS clip to this one
};

export type TimelineClip = {
  id: string;
  src: string;
  file?: File; // Optional for backward compatibility
  filePath?: string; // Native filesystem path (Tauri desktop mode)
  assetUrl?: string; // Tauri asset:// URL for playback
  startTime?: number;
  endTime?: number;
  originalDuration?: number;
  transition?: Transition | null;
  // Proxy video fields for optimized preview
  proxyPath?: string; // Path to low-quality proxy video
  proxyUrl?: string; // asset:// URL for proxy playback
  proxyReady?: boolean; // Whether proxy has been generated
};

// Preview quality settings
export type PreviewQuality = '360p' | '480p' | '720p';

export type ProxySettings = {
  quality: PreviewQuality;
  autoDelete: boolean; // Auto-delete after 7 days
  manualClear: boolean; // Show manual clear button
  useTempFolder: boolean; // Store in system temp (auto-cleaned on restart)
};


// Serializable version for database storage (without File objects)
export type SerializableClip = {
  id: string;
  src: string;
  fileName: string;
  fileType: string;
  startTime?: number;
  endTime?: number;
  originalDuration?: number;
  transition?: Transition | null;
};

export type SerializableTimelineData = {
  clips: SerializableClip[];
  audioUrl?: string;
  duration?: number;
};
