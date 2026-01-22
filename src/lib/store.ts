
import { create } from 'zustand';
import { TimelineClip, PreviewQuality, ProxySettings } from '@/types';
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
  isAudioMuted: boolean;
  trimmingClipId: string | null;
  audioPath: string | null;
  // Proxy video settings
  proxySettings: ProxySettings;
  // Timeline zoom
  timelineZoom: number;
  isExtendMode: boolean; // X Mode for extending clips
  // BPM Sync for audio-master playback
  bpmSync: {
    isEnabled: boolean;
    detectedBPM: number;
    targetBPM: number;
    beatInterval: number; // 60 / targetBPM in seconds
    currentBeat: number;
    quantizeMode: 'beat' | 'bar' | 'phrase';
  };
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
  // Proxy settings actions
  setProxyQuality: (quality: PreviewQuality) => void;
  setProxySettings: (settings: Partial<ProxySettings>) => void;
  updateClipProxy: (clipId: string, proxyPath: string, proxyUrl: string) => void;
  // Timeline zoom actions
  setTimelineZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  // Duplicate/extend actions
  duplicateClip: (clipId: string, multiplier: number) => void;
  setExtendMode: (mode: boolean) => void;
  // BPM Sync actions
  setBPMEnabled: (enabled: boolean) => void;
  setTargetBPM: (bpm: number) => void;
  updateBeatPosition: (beat: number) => void;
  toggleAudioMute: () => void;
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
  isAudioMuted: false,
  trimmingClipId: null,
  audioPath: null,
  // Default proxy settings: 480p, all storage options enabled
  proxySettings: {
    quality: '480p',
    autoDelete: true,
    manualClear: true,
    useTempFolder: true,
  },
  // Timeline zoom: 10 = full zoom out (long audio visible), 100 = 1:1, 500 = max zoom
  timelineZoom: 50,
  isExtendMode: false,
  // BPM Sync initial state
  bpmSync: {
    isEnabled: false,
    detectedBPM: 120,
    targetBPM: 120,
    beatInterval: 0.5, // 60 / 120 = 0.5 seconds per beat
    currentBeat: 0,
    quantizeMode: 'beat',
  },

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
    let audioPath: string | null = null;

    if (typeof fileOrPath === 'string') {
      // Tauri desktop mode: use provided asset URL
      audioUrl = assetUrl || fileOrPath;
      audioPath = fileOrPath;
    } else {
      // Browser mode: create blob URL from File
      audioUrl = URL.createObjectURL(fileOrPath);
      audioFile = fileOrPath;
    }

    set({
      audioFile: audioFile,
      audioUrl,
      audioSrc: audioUrl,
      audioPath
    });

    // Generate real waveform data from the audio file
    try {
      const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

      if (isTauri && assetUrl) {
        // Desktop mode: use the asset URL to generate waveform
        const { generateWaveformFromPath } = await import('@/lib/desktop');
        const waveform = await generateWaveformFromPath(assetUrl, 200);
        set({
          waveform,
          waveformData: waveform
        });
      } else if (audioFile) {
        // Browser mode: decode from File object with REAL frequency analysis
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Extract raw audio data
        const rawData = audioBuffer.getChannelData(0);
        const samples = 200;
        const blockSize = Math.floor(rawData.length / samples);

        // Create three frequency-band waveforms using biquad filters
        const lowFreqData: number[] = [];
        const midFreqData: number[] = [];
        const highFreqData: number[] = [];

        // Process audio in chunks to extract frequency bands
        for (let i = 0; i < samples; i++) {
          const startIdx = i * blockSize;
          const endIdx = Math.min(startIdx + blockSize, rawData.length);
          const chunk = rawData.slice(startIdx, endIdx);

          // Create temporary buffer for this chunk
          const chunkBuffer = audioContext.createBuffer(1, chunk.length, audioBuffer.sampleRate);
          chunkBuffer.copyToChannel(chunk, 0);

          // Offline context for frequency analysis
          const offlineCtx = new OfflineAudioContext(1, chunk.length, audioBuffer.sampleRate);
          const source = offlineCtx.createBufferSource();
          source.buffer = chunkBuffer;

          // Low-pass filter (bass: 20Hz-250Hz)
          const lowFilter = offlineCtx.createBiquadFilter();
          lowFilter.type = 'lowpass';
          lowFilter.frequency.value = 250;
          lowFilter.Q.value = 1;

          // Band-pass filter (mids: 250Hz-4000Hz)
          const midFilter = offlineCtx.createBiquadFilter();
          midFilter.type = 'bandpass';
          midFilter.frequency.value = 1000;
          midFilter.Q.value = 0.7;

          // High-pass filter (treble: 4000Hz-20000Hz)
          const highFilter = offlineCtx.createBiquadFilter();
          highFilter.type = 'highpass';
          highFilter.frequency.value = 4000;
          highFilter.Q.value = 1;

          // Connect and render each filter
          source.connect(lowFilter);
          lowFilter.connect(offlineCtx.destination);
          source.start(0);

          const lowResult = await offlineCtx.startRendering();
          const lowChunkData = lowResult.getChannelData(0);
          const lowAmplitude = Math.sqrt(lowChunkData.reduce((sum, val) => sum + val * val, 0) / lowChunkData.length);
          lowFreqData.push(lowAmplitude);

          // Repeat for mid - create filter IN this context
          const offlineCtx2 = new OfflineAudioContext(1, chunk.length, audioBuffer.sampleRate);
          const source2 = offlineCtx2.createBufferSource();
          const midFilter2 = offlineCtx2.createBiquadFilter();
          source2.buffer = chunkBuffer;
          midFilter2.type = 'bandpass';
          midFilter2.frequency.value = 1000;
          midFilter2.Q.value = 0.7;
          source2.connect(midFilter2);
          midFilter2.connect(offlineCtx2.destination);
          source2.start(0);
          const midResult = await offlineCtx2.startRendering();
          const midChunkData = midResult.getChannelData(0);
          const midAmplitude = Math.sqrt(midChunkData.reduce((sum, val) => sum + val * val, 0) / midChunkData.length);
          midFreqData.push(midAmplitude);

          // Repeat for high - create filter IN this context
          const offlineCtx3 = new OfflineAudioContext(1, chunk.length, audioBuffer.sampleRate);
          const source3 = offlineCtx3.createBufferSource();
          const highFilter3 = offlineCtx3.createBiquadFilter();
          source3.buffer = chunkBuffer;
          highFilter3.type = 'highpass';
          highFilter3.frequency.value = 4000;
          highFilter3.Q.value = 1;
          source3.connect(highFilter3);
          highFilter3.connect(offlineCtx3.destination);
          source3.start(0);
          const highResult = await offlineCtx3.startRendering();
          const highChunkData = highResult.getChannelData(0);
          const highAmplitude = Math.sqrt(highChunkData.reduce((sum, val) => sum + val * val, 0) / highChunkData.length);
          highFreqData.push(highAmplitude);
        }

        // Normalize each band independently
        const normalizeBand = (band: number[]) => {
          const max = Math.max(...band);
          return max > 0 ? band.map(v => v / max) : band;
        };

        const normalizedLow = normalizeBand(lowFreqData);
        const normalizedMid = normalizeBand(midFreqData);
        const normalizedHigh = normalizeBand(highFreqData);

        // Combine into structured waveform data
        const waveform: number[] = [];
        for (let i = 0; i < samples; i++) {
          // Store as interleaved: [low, mid, high, low, mid, high, ...]
          waveform.push(normalizedLow[i] || 0);
          waveform.push(normalizedMid[i] || 0);
          waveform.push(normalizedHigh[i] || 0);
        }

        set({
          waveform: waveform,
          waveformData: waveform
        });

        audioContext.close();
      } else {
        // Fallback to mock data
        const mockWaveform = Array.from({ length: 200 }, () => Math.random());
        set({
          waveform: mockWaveform,
          waveformData: mockWaveform
        });
      }
    } catch (error) {
      console.error('Waveform generation failed:', error);
      // Fallback to mock data on error
      const mockWaveform = Array.from({ length: 200 }, () => Math.random());
      set({
        waveform: mockWaveform,
        waveformData: mockWaveform
      });
    }
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

  // Proxy settings actions
  setProxyQuality: (quality) => set((state) => ({
    proxySettings: { ...state.proxySettings, quality }
  })),

  setProxySettings: (settings) => set((state) => ({
    proxySettings: { ...state.proxySettings, ...settings }
  })),

  updateClipProxy: (clipId, proxyPath, proxyUrl) => set((state) => ({
    clips: state.clips.map(clip =>
      clip.id === clipId
        ? { ...clip, proxyPath, proxyUrl, proxyReady: true }
        : clip
    ),
    timelineClips: state.timelineClips.map(clip =>
      clip.id === clipId
        ? { ...clip, proxyPath, proxyUrl, proxyReady: true }
        : clip
    ),
  })),

  // Timeline zoom actions (min 10%, max 500%)
  setTimelineZoom: (zoom) => set({
    timelineZoom: Math.min(500, Math.max(10, zoom))
  }),

  zoomIn: () => set((state) => ({
    timelineZoom: Math.min(500, state.timelineZoom + 10)
  })),

  zoomOut: () => set((state) => ({
    timelineZoom: Math.max(10, state.timelineZoom - 10)
  })),

  // Duplicate/extend clip actions
  duplicateClip: (clipId, multiplier) => set((state) => {
    const clipIndex = state.timelineClips.findIndex(c => c.id === clipId);
    if (clipIndex === -1) return state;

    const newClips = [...state.timelineClips];
    newClips[clipIndex] = {
      ...newClips[clipIndex],
      loopCount: multiplier
    };

    return { timelineClips: newClips };
  }),

  setExtendMode: (mode) => set({ isExtendMode: mode }),

  // BPM Sync actions
  setBPMEnabled: (enabled) => set((state) => ({
    bpmSync: {
      ...state.bpmSync,
      isEnabled: enabled
    }
  })),

  setTargetBPM: (bpm) => set((state) => ({
    bpmSync: {
      ...state.bpmSync,
      targetBPM: bpm,
      beatInterval: 60 / bpm
    }
  })),

  updateBeatPosition: (beat) => set((state) => ({
    bpmSync: {
      ...state.bpmSync,
      currentBeat: beat
    }
  })),

  toggleAudioMute: () => set((state) => ({
    isAudioMuted: !state.isAudioMuted
  })),
}));
