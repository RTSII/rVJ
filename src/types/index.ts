
export type Transition = {
  type: 'crossfade';
  duration: number; // in seconds
};

export type MediaClip = {
  id: string;
  src: string;
  file: File;
  startTime?: number;
  endTime?: number;
  originalDuration?: number;
  transition?: Transition | null; // Transition from the PREVIOUS clip to this one
};

export type TimelineClip = {
  id: string;
  src: string;
  file: File;
  startTime?: number;
  endTime?: number;
  originalDuration?: number;
  transition?: Transition | null;
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
