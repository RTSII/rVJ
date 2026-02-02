import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useWavesurfer } from '@wavesurfer/react';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import HoverPlugin from 'wavesurfer.js/dist/plugins/hover';
import { useEditorStore } from '@/lib/store';
import { useEditor } from '@/context/EditorContext';
import { AudioWaveform, VolumeX } from 'lucide-react';

// Neon color scheme matching project theme
const WAVEFORM_COLORS = {
    waveColor: 'rgba(168, 85, 247, 0.6)',     // Purple base
    progressColor: '#00F0FF',                   // Cyan for played portion
    cursorColor: '#00F0FF',                     // Cyan playhead
    cursorWidth: 2,
};

// Create gradient for waveform
const createGradient = (ctx: CanvasRenderingContext2D, height: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#FF2D92');    // Magenta at top
    gradient.addColorStop(0.5, '#A855F7');  // Purple in middle  
    gradient.addColorStop(1, '#00F0FF');    // Cyan at bottom
    return gradient;
};

interface WavesurferAudioTrackProps {
    onReady?: () => void;
}

const WavesurferAudioTrack: React.FC<WavesurferAudioTrackProps> = ({ onReady }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { audioRef, seekToAbsoluteTime } = useEditor();

    const {
        audioSrc,
        audioMarkers,
        timelineZoom,
        isAudioMuted,
        toggleAudioMute,
        absoluteTimelinePosition,
        setAbsoluteTimelinePosition,
        duration,
        setDuration,
        isPlaying,
    } = useEditorStore();

    // Memoize plugins to prevent re-initialization
    const plugins = useMemo(() => [
        RegionsPlugin.create(),
        HoverPlugin.create({
            lineColor: '#00F0FF',
            lineWidth: 1,
            labelBackground: 'rgba(13, 10, 26, 0.9)',
            labelColor: '#00F0FF',
            labelSize: '11px',
        }),
    ], []);

    // Calculate min pixels per second based on zoom
    const minPxPerSec = useMemo(() => {
        const BASE_PX_PER_SEC = 10;
        return BASE_PX_PER_SEC * (timelineZoom / 100);
    }, [timelineZoom]);

    // Initialize wavesurfer
    // NOTE: We don't pass audioRef to wavesurfer because it would take control
    // of playback. Instead, wavesurfer creates its own internal audio element
    // just for waveform visualization, and we sync positions manually.
    const { wavesurfer, isReady } = useWavesurfer({
        container: containerRef,
        height: 56,
        waveColor: WAVEFORM_COLORS.waveColor,
        progressColor: WAVEFORM_COLORS.progressColor,
        cursorColor: WAVEFORM_COLORS.cursorColor,
        cursorWidth: WAVEFORM_COLORS.cursorWidth,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        normalize: true,
        minPxPerSec,
        plugins,
        interact: true,
    });

    // Apply gradient after wavesurfer is ready
    useEffect(() => {
        if (wavesurfer && isReady && containerRef.current) {
            // Get canvas and apply gradient
            const canvas = containerRef.current.querySelector('canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const gradient = createGradient(ctx, canvas.height);
                    wavesurfer.setOptions({
                        waveColor: gradient,
                    });
                }
            }

            console.log('✅ Wavesurfer ready');
            onReady?.();
        }
    }, [wavesurfer, isReady, onReady]);

    // Load audio when source changes and pause wavesurfer immediately
    useEffect(() => {
        if (wavesurfer && audioSrc) {
            console.log('🎵 Loading audio into wavesurfer:', audioSrc);
            wavesurfer.load(audioSrc).then(() => {
                // Ensure wavesurfer doesn't auto-play
                if (wavesurfer.isPlaying()) {
                    wavesurfer.pause();
                }
            });
        }
    }, [wavesurfer, audioSrc]);

    // Sync duration when loaded
    useEffect(() => {
        if (!wavesurfer) return;

        const handleReady = () => {
            const dur = wavesurfer.getDuration();
            console.log('🎵 Wavesurfer loaded, duration:', dur);
            setDuration(dur);
        };

        wavesurfer.on('ready', handleReady);
        return () => { wavesurfer.un('ready', handleReady); };
    }, [wavesurfer, setDuration]);

    // Handle user seeking on waveform
    useEffect(() => {
        if (!wavesurfer) return;

        const handleSeek = (progress: number) => {
            const newTime = progress * wavesurfer.getDuration();
            console.log('🎵 Wavesurfer seek to:', newTime);
            seekToAbsoluteTime(newTime);
        };

        wavesurfer.on('seeking', handleSeek);
        return () => { wavesurfer.un('seeking', handleSeek); };
    }, [wavesurfer, seekToAbsoluteTime]);

    // Sync external position changes to wavesurfer
    useEffect(() => {
        if (!wavesurfer || !isReady || !duration) return;

        const currentWavesurferTime = wavesurfer.getCurrentTime();
        const diff = Math.abs(currentWavesurferTime - absoluteTimelinePosition);

        // Only sync if difference is significant (> 0.2s) to prevent feedback loops
        if (diff > 0.2) {
            wavesurfer.seekTo(absoluteTimelinePosition / duration);
        }
    }, [wavesurfer, isReady, absoluteTimelinePosition, duration]);

    // Update zoom level
    useEffect(() => {
        if (wavesurfer && isReady) {
            wavesurfer.zoom(minPxPerSec);
        }
    }, [wavesurfer, isReady, minPxPerSec]);

    // Add audio markers as regions
    useEffect(() => {
        if (!wavesurfer || !isReady) return;

        const regionsPlugin = wavesurfer.getActivePlugins().find(
            (p) => p instanceof RegionsPlugin
        ) as RegionsPlugin | undefined;

        if (regionsPlugin) {
            // Clear existing regions
            regionsPlugin.clearRegions();

            // Add marker regions
            audioMarkers.forEach((markerTime, index) => {
                regionsPlugin.addRegion({
                    start: markerTime,
                    end: markerTime + 0.1,
                    color: 'rgba(255, 193, 7, 0.5)',
                    drag: true,
                    resize: false,
                    id: `marker-${index}`,
                });
            });
        }
    }, [wavesurfer, isReady, audioMarkers]);

    // Handle playback state
    useEffect(() => {
        if (!wavesurfer || !isReady) return;

        if (isPlaying && wavesurfer.isPlaying() === false) {
            // Don't auto-play wavesurfer - let it be controlled by audioRef
        }
    }, [wavesurfer, isReady, isPlaying]);

    const handleMuteClick = useCallback(() => {
        toggleAudioMute();
    }, [toggleAudioMute]);

    return (
        <div className="h-16 bg-gradient-to-r from-[#151022]/60 to-[#0D0A1A]/60 rounded-lg py-1 px-1 flex items-center gap-1 border border-purple-500/20">
            {/* Track label - mute toggle */}
            <button
                onClick={handleMuteClick}
                className={`w-6 h-full flex items-center justify-center rounded-md flex-shrink-0 border transition-all cursor-pointer ${isAudioMuted
                    ? 'bg-gradient-to-b from-magenta-500/40 to-red-500/40 border-magenta-400/60 shadow-[0_0_12px_rgba(255,45,146,0.5)]'
                    : 'bg-gradient-to-b from-magenta-500/20 to-purple-500/20 border-purple-500/30 hover:border-cyan-400/50'
                    }`}
                title={isAudioMuted ? 'Unmute audio' : 'Mute audio'}
            >
                {isAudioMuted ? (
                    <VolumeX className="h-3 w-3 text-magenta-400" />
                ) : (
                    <AudioWaveform className="h-3 w-3 text-cyan-400" />
                )}
            </button>

            {/* Wavesurfer container */}
            <div
                ref={containerRef}
                className="flex-1 h-full relative bg-[#0D0A1A]/50 rounded-md overflow-hidden"
                style={{ scrollbarColor: '#A855F7 #151022' }}
            >
                {!audioSrc && (
                    <div className="absolute inset-0 flex items-center justify-center text-center">
                        <p className="text-muted-foreground text-sm opacity-70">
                            Upload audio to see waveform
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WavesurferAudioTrack;
