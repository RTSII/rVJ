import { useEffect, useRef, useState } from 'react';

export interface AudioAnalysisData {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  subBass: number;  // 20-60 Hz (kick drums)
  bass: number;     // 60-250 Hz (bass synths)
  mid: number;      // 250-2000 Hz (snares, hats)
  treble: number;   // 2000+ Hz (cymbals, air)
  energy: number;
  beatDetected: boolean;
}

export const useAudioAnalysis = (audioElement: HTMLAudioElement | null) => {
  const [analysisData, setAnalysisData] = useState<AudioAnalysisData | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // Beat detection variables
  const bassHistoryRef = useRef<number[]>([]);
  const lastBeatTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!audioElement) return;

    const initAudioContext = async () => {
      try {
        // Create audio context
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create analyser
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        analyserRef.current.smoothingTimeConstant = 0.8;
        
        // Create source from audio element
        sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement);
        
        // Connect: source -> analyser -> destination
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
        
        // Start analysis loop
        startAnalysis();
        
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
      }
    };

    const startAnalysis = () => {
      if (!analyserRef.current) return;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const frequencyData = new Uint8Array(bufferLength);
      const timeData = new Uint8Array(bufferLength);
      
      const analyze = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(frequencyData);
        analyserRef.current.getByteTimeDomainData(timeData);
        
        // Calculate frequency ranges using proper Hz-to-bin conversion
        const sampleRate = audioContextRef.current?.sampleRate || 44100;
        const nyquist = sampleRate / 2;
        const binSize = nyquist / bufferLength;
        
        // Electronic music frequency ranges (optimized for kick/bass detection)
        // Sub-bass: 20-60 Hz (kick drum fundamentals)
        // Bass: 60-250 Hz (bass synths, kick harmonics) 
        // Low-mids: 250-500 Hz (snare fundamentals, bass harmonics)
        // Mids: 500-2000 Hz (snare, hats, melodic content)
        // High-mids: 2000-6000 Hz (hi-hats, cymbals, presence)
        // Treble: 6000+ Hz (air, brightness)
        
        const subBassBin = Math.floor(60 / binSize);
        const bassBin = Math.floor(250 / binSize);
        const midBin = Math.floor(2000 / binSize);
        const trebleBin = Math.floor(6000 / binSize);
        
        // Focus on sub-bass for kick detection (20-60 Hz)
        const subBass = getFrequencyRange(frequencyData, Math.floor(20 / binSize), subBassBin);
        // Bass range for bass synths (60-250 Hz)
        const bass = getFrequencyRange(frequencyData, subBassBin, bassBin);
        // Mid range for snares/hats (250-2000 Hz)
        const mid = getFrequencyRange(frequencyData, bassBin, midBin);
        // Treble for cymbals/air (2000+ Hz)
        const treble = getFrequencyRange(frequencyData, midBin, Math.min(trebleBin, bufferLength));
        
        // Calculate overall energy
        const energy = frequencyData.reduce((sum, value) => sum + value, 0) / bufferLength / 255;
        
        // Beat detection using sub-bass for kick drums (20-60 Hz)
        const beatDetected = detectBeat(subBass);
        
        setAnalysisData({
          frequencyData: new Uint8Array(frequencyData),
          timeData: new Uint8Array(timeData),
          subBass,
          bass,
          mid,
          treble,
          energy,
          beatDetected
        });
        
        animationRef.current = requestAnimationFrame(analyze);
      };
      
      analyze();
    };

    const getFrequencyRange = (data: Uint8Array, start: number, end: number): number => {
      const slice = data.slice(start, end);
      return slice.reduce((sum, value) => sum + value, 0) / slice.length / 255;
    };

    const detectBeat = (subBassLevel: number): boolean => {
      const now = Date.now();
      const history = bassHistoryRef.current;
      
      // Add current sub-bass level to history (for kick detection)
      history.push(subBassLevel);
      if (history.length > 15) history.shift(); // Shorter history for faster response
      
      // Calculate average and variance for better threshold
      const average = history.reduce((sum, val) => sum + val, 0) / history.length;
      const variance = history.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / history.length;
      const standardDev = Math.sqrt(variance);
      
      // Dynamic threshold based on variance (more sensitive in quiet parts)
      const dynamicThreshold = average + Math.max(standardDev * 1.5, average * 0.15);
      
      // Minimum time between beats for "four on the floor" patterns (120-140 BPM typical)
      // 120 BPM = 500ms, 140 BPM = 428ms, so 400ms is a good minimum
      const timeSinceLastBeat = now - lastBeatTimeRef.current;
      const minBeatInterval = 350; // Allow slightly faster detection
      
      // Beat detected if current level exceeds dynamic threshold
      // and sufficient time has passed since last beat
      if (subBassLevel > dynamicThreshold && timeSinceLastBeat > minBeatInterval) {
        lastBeatTimeRef.current = now;
        return true;
      }
      
      return false;
    };

    // Initialize when audio starts playing
    const handlePlay = () => {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      if (!analyserRef.current) {
        initAudioContext();
      }
    };

    audioElement.addEventListener('play', handlePlay);
    
    // Cleanup
    return () => {
      audioElement.removeEventListener('play', handlePlay);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioElement]);

  return analysisData;
};