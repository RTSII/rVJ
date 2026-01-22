import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@/lib/store';

/**
 * Hook to apply BPM sync to video playback
 * Adjusts video playback rate to match target BPM
 * TRANSITION-AWARE: Only applies rate changes when video is stable, not during transitions
 */
export const useBPMSync = (
    videoRef: React.RefObject<HTMLVideoElement>,
    audioRef: React.RefObject<HTMLAudioElement>
) => {
    const { bpmSync, selectedClip } = useEditorStore();
    const isTransitioning = useRef(false);
    const lastClipId = useRef<string | null>(null);
    const playbackRateApplied = useRef(false);

    // Detect clip transitions - don't apply BPM sync during transitions
    useEffect(() => {
        if (selectedClip?.id !== lastClipId.current) {
            // Clip is changing - mark as transitioning
            isTransitioning.current = true;
            playbackRateApplied.current = false;
            lastClipId.current = selectedClip?.id ?? null;

            // Wait for video to stabilize before allowing BPM sync
            const stabilizeTimeout = setTimeout(() => {
                isTransitioning.current = false;
            }, 500); // Wait 500ms after clip change before applying BPM sync

            return () => clearTimeout(stabilizeTimeout);
        }
    }, [selectedClip?.id]);

    // Apply BPM sync only when video is stable
    const applyPlaybackRate = useCallback(() => {
        if (!bpmSync.isEnabled || !videoRef.current || isTransitioning.current) {
            return;
        }

        const video = videoRef.current;

        // Don't apply if video isn't ready
        if (video.readyState < 3) { // HAVE_FUTURE_DATA
            return;
        }

        const detectedBPM = bpmSync.detectedBPM;
        const targetBPM = bpmSync.targetBPM;

        // Calculate playback rate adjustment
        const playbackRate = targetBPM / detectedBPM;

        // Clamp playback rate to reasonable bounds (0.5x to 2.0x)
        const clampedRate = Math.max(0.5, Math.min(2.0, playbackRate));

        // Only log and apply if rate is different
        if (Math.abs(video.playbackRate - clampedRate) > 0.01) {
            console.log(`🎵 BPM-SYNC: Adjusting playback rate to ${clampedRate.toFixed(2)}x (${detectedBPM} → ${targetBPM} BPM)`);
            video.playbackRate = clampedRate;
            playbackRateApplied.current = true;
        }
    }, [bpmSync.isEnabled, bpmSync.targetBPM, bpmSync.detectedBPM]);

    // Apply BPM sync after video is ready and not transitioning
    useEffect(() => {
        if (!bpmSync.isEnabled) {
            // Reset playback rate when BPM sync is disabled
            if (videoRef.current && videoRef.current.playbackRate !== 1.0) {
                videoRef.current.playbackRate = 1.0;
                console.log('🎵 BPM-SYNC: Disabled, reset playback rate to 1.0x');
            }
            return;
        }

        const video = videoRef.current;
        if (!video) return;

        // Apply on canplaythrough (video fully buffered and ready)
        const handleCanPlayThrough = () => {
            if (!isTransitioning.current) {
                applyPlaybackRate();
            }
        };

        // Apply on playing (video started playing)
        const handlePlaying = () => {
            // Delay slightly to ensure transition is complete
            setTimeout(() => {
                if (!isTransitioning.current) {
                    applyPlaybackRate();
                }
            }, 100);
        };

        video.addEventListener('canplaythrough', handleCanPlayThrough);
        video.addEventListener('playing', handlePlaying);

        return () => {
            video.removeEventListener('canplaythrough', handleCanPlayThrough);
            video.removeEventListener('playing', handlePlaying);
        };
    }, [bpmSync.isEnabled, applyPlaybackRate]);

    // Re-apply when target BPM changes (but not during transitions)
    useEffect(() => {
        if (bpmSync.isEnabled && !isTransitioning.current) {
            applyPlaybackRate();
        }
    }, [bpmSync.targetBPM, bpmSync.isEnabled, applyPlaybackRate]);
};
