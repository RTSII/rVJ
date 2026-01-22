import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/lib/store';

/**
 * Hook to detect BPM from audio waveform analysis
 * Uses peak detection and interval analysis to estimate tempo
 */
export const useAudioBPMDetection = (audioRef: React.RefObject<HTMLAudioElement>) => {
    const { setTargetBPM, waveformData } = useEditorStore();
    const detectionInProgress = useRef(false);

    useEffect(() => {
        if (!audioRef.current || detectionInProgress.current || waveformData.length === 0) {
            return;
        }

        detectionInProgress.current = true;

        // Simple BPM detection algorithm
        const detectBPM = () => {
            try {
                // Get energy levels from waveform data
                // This is a simplified approach - in production you'd use more sophisticated analysis
                const energyLevels: number[] = [];

                // Sample waveform data (assuming it's an array of amplitude values)
                for (let i = 0; i < waveformData.length; i++) {
                    const sample = waveformData[i];
                    // Calculate energy (could be sum of all bands, or specific frequency range)
                    const energy = Array.isArray(sample)
                        ? sample.reduce((sum, val) => sum + Math.abs(val), 0) / sample.length
                        : Math.abs(sample);
                    energyLevels.push(energy);
                }

                // Find peaks (beats) in energy levels
                const peaks: number[] = [];
                const threshold = Math.max(...energyLevels) * 0.7; // 70% of max energy

                for (let i = 1; i < energyLevels.length - 1; i++) {
                    if (
                        energyLevels[i] > threshold &&
                        energyLevels[i] > energyLevels[i - 1] &&
                        energyLevels[i] > energyLevels[i + 1]
                    ) {
                        peaks.push(i);
                    }
                }

                // Calculate intervals between peaks
                if (peaks.length < 2) {
                    console.log('🎵 BPM: Not enough peaks detected for BPM analysis');
                    return;
                }

                const intervals: number[] = [];
                for (let i = 1; i < peaks.length; i++) {
                    intervals.push(peaks[i] - peaks[i - 1]);
                }

                // Get median interval (more robust than average)
                intervals.sort((a, b) => a - b);
                const medianInterval = intervals[Math.floor(intervals.length / 2)];

                // Convert interval to BPM
                // Assuming waveformData covers the entire audio duration
                const audio = audioRef.current;
                if (!audio || !audio.duration) return;

                const samplesPerSecond = waveformData.length / audio.duration;
                const beatsPerSecond = samplesPerSecond / medianInterval;
                const bpm = Math.round(beatsPerSecond * 60);

                // Validate BPM range (typical music range)
                if (bpm >= 60 && bpm <= 200) {
                    console.log(`🎵 BPM: Detected ${bpm} BPM from audio analysis`);
                    setTargetBPM(bpm);
                } else {
                    console.log(`🎵 BPM: Detected ${bpm} BPM (outside typical range, not applied)`);
                }
            } catch (error) {
                console.error('🎵 BPM: Error detecting BPM:', error);
            } finally {
                detectionInProgress.current = false;
            }
        };

        // Run detection after a short delay to ensure waveform is ready
        const timeoutId = setTimeout(detectBPM, 500);

        return () => {
            clearTimeout(timeoutId);
            detectionInProgress.current = false;
        };
    }, [audioRef, waveformData, setTargetBPM]);
};
