
import { create } from 'zustand';
import { TimelineClip } from '@/types';
import { generateId } from './utils';

interface EditorState {
  clips: TimelineClip[];
  selectedClipId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  waveformData: any[];
  audioUrl: string | null;
  zoomLevel: number;

  // Additional properties needed by components
  timelineClips: TimelineClip[];
  selectedClip: TimelineClip | null;
  audioSrc: string | null;
  waveform: number[];
  audioFile: File | null;
  isExporting: boolean;
  exportProgress: number;
  audioMarkers: number[];
  absoluteTimelinePosition: number;
  isAudioMaster: boolean;
  trimmingClipId: string | null;
}

interface EditorActions {
  addClip: (clip: Omit<TimelineClip, 'id'>) => void;
  updateClip: (id: string, updates: Partial<TimelineClip>) => void;
  removeClip: (id: string) => void;
  setSelectedClipId: (id: string | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (currentTime: number) => void;
  setDuration: (duration: number) => void;
  setWaveformData: (waveformData: any[]) => void;
  setAudioUrl: (audioUrl: string | null) => void;
  setZoomLevel: (zoomLevel: number) => void;

  // Additional actions needed by components
  setTimelineClips: (clips: TimelineClip[]) => void;
  setSelectedClip: (clip: TimelineClip | null) => void;
  addClipToTimeline: (clip: any) => void;
  loadAudio: (fileOrPath: File | string, assetUrl?: string) => Promise<void>;
  setIsExporting: (isExporting: boolean) => void;
  setExportProgress: (progress: number) => void;
  addAudioMarker: (time: number) => void;
  setAudioMarkers: (markers: number[]) => void;
  setAbsoluteTimelinePosition: (position: number) => void;
  resetToTimelineStart: () => void;
  setTrimmingClipId: (id: string | null) => void;

  loadProject: (clips: TimelineClip[]) => void;
  clearTimeline: () => void;
}

interface EditorStore extends EditorState, EditorActions { }

export const useEditorStore = create<EditorStore>((set, get) => ({
  clips: [],
  selectedClipId: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  waveformData: [],
  audioUrl: null,
  zoomLevel: 100,

  // Additional state
  timelineClips: [],
  selectedClip: null,
  audioSrc: null,
  waveform: [],
  audioFile: null,
  isExporting: false,
  exportProgress: 0,
  audioMarkers: [],
  absoluteTimelinePosition: 0,
  isAudioMaster: true,
  trimmingClipId: null,

  addClip: (clip) => {
    const newClip: TimelineClip = {
      ...clip,
      id: generateId(),
    };
    set((state) => ({
      clips: [...state.clips, newClip],
      timelineClips: [...state.timelineClips, newClip],
    }));
  },

  updateClip: (id, updates) => {
    set((state) => ({
      clips: state.clips.map((clip) => (clip.id === id ? { ...clip, ...updates } : clip)),
      timelineClips: state.timelineClips.map((clip) => (clip.id === id ? { ...clip, ...updates } : clip)),
    }));
  },

  removeClip: (id) => {
    set((state) => ({
      clips: state.clips.filter((clip) => clip.id !== id),
      timelineClips: state.timelineClips.filter((clip) => clip.id !== id),
      selectedClipId: state.selectedClipId === id ? null : state.selectedClipId,
      selectedClip: state.selectedClip?.id === id ? null : state.selectedClip,
    }));
  },

  setSelectedClipId: (id) => {
    const clip = id ? get().timelineClips.find(c => c.id === id) || null : null;
    set({
      selectedClipId: id,
      selectedClip: clip
    });
  },

  setSelectedClip: (clip) => {
    set({
      selectedClip: clip,
      selectedClipId: clip?.id || null
    });
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setWaveformData: (waveformData) => set({
    waveformData,
    waveform: waveformData
  }),
  setAudioUrl: (audioUrl) => set({
    audioUrl,
    audioSrc: audioUrl
  }),
  setZoomLevel: (zoomLevel) => set({ zoomLevel }),

  setTimelineClips: (clips) => set({
    timelineClips: clips,
    clips: clips
  }),

  addClipToTimeline: (clip) => {
    const newClip: TimelineClip = {
      ...clip,
      id: generateId(),
    };
    set((state) => {
      const newClips = [...state.timelineClips, newClip];
      // Always select the first clip for preview
      const firstClip = newClips[0];
      return {
        clips: [...state.clips, newClip],
        timelineClips: newClips,
        selectedClip: firstClip,
        selectedClipId: firstClip.id,
      };
    });
  },

  loadAudio: async (fileOrPath: File | string, assetUrl?: string) => {
    let audioUrl: string;
    let audioFile: File | null = null;

    if (typeof fileOrPath === 'string') {
      // Tauri desktop mode: use provided asset URL
      audioUrl = assetUrl || fileOrPath;
    } else {
      // Browser mode: create blob URL from File
      audioUrl = URL.createObjectURL(fileOrPath);
      audioFile = fileOrPath;
    }

    set({
      audioFile: audioFile,
      audioUrl,
      audioSrc: audioUrl
    });

    // Generate basic waveform data
    const mockWaveform = Array.from({ length: 100 }, () => Math.random());
    set({
      waveform: mockWaveform,
      waveformData: mockWaveform
    });
  },

  setIsExporting: (isExporting) => set({ isExporting }),
  setExportProgress: (exportProgress) => set({ exportProgress }),

  addAudioMarker: (time) => {
    set((state) => ({
      audioMarkers: [...state.audioMarkers, time].sort((a, b) => a - b)
    }));
  },

  setAudioMarkers: (audioMarkers) => set({ audioMarkers }),
  setAbsoluteTimelinePosition: (absoluteTimelinePosition) => set({ absoluteTimelinePosition }),
  setTrimmingClipId: (trimmingClipId) => set({ trimmingClipId }),

  resetToTimelineStart: () => {
    const firstClip = get().timelineClips[0] || null;
    set({
      currentTime: 0,
      absoluteTimelinePosition: 0,
      selectedClip: firstClip,
      selectedClipId: firstClip?.id || null,
    });
  },

  loadProject: (clips: TimelineClip[]) => set({
    clips,
    timelineClips: clips,
    selectedClipId: null,
    selectedClip: null,
    currentTime: 0,
    absoluteTimelinePosition: 0,
  }),

  clearTimeline: () => set({
    clips: [],
    timelineClips: [],
    selectedClipId: null,
    selectedClip: null,
    currentTime: 0,
    absoluteTimelinePosition: 0,
    isPlaying: false,
    audioUrl: null,
    audioSrc: null,
    audioFile: null,
    duration: 0,
    waveformData: [],
    waveform: [],
    audioMarkers: [],
  }),
}));
