import React, { useRef, useEffect, useMemo } from 'react';
import { useEditorStore } from '@/lib/store';
import { AudioWaveform, MapPin, VolumeX } from 'lucide-react';

interface AudioTrackProps {
  duration: number;
  setDraggingMarkerIndex: (index: number | null) => void;
}

// Neon frequency band colors (project theme)
const FREQ_COLORS = {
  low: '#FF2D92',   // Magenta (bass)
  mid: '#A855F7',   // Purple (mids) 
  high: '#00F0FF',  // Cyan (highs)
};

const VERTICAL_PADDING = 3; // Reduced padding

const AudioTrack: React.FC<AudioTrackProps> = ({ duration, setDraggingMarkerIndex }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { waveform, audioMarkers, timelineZoom, isAudioMuted, toggleAudioMute } = useEditorStore();

  // Calculate canvas width based on duration and zoom level
  const canvasWidth = useMemo(() => {
    if (duration <= 0) return 1200;
    // At zoom 100%, 60 seconds = 600px (10 pixels per second)
    // At zoom 10%, 3600 seconds (1hr) = 600px (very zoomed out)
    // At zoom 500%, 60 seconds = 3000px (very zoomed in)
    const PIXELS_PER_SECOND_BASE = 10;
    const scaledPPS = PIXELS_PER_SECOND_BASE * (timelineZoom / 100);
    return Math.max(600, duration * scaledPPS);
  }, [duration, timelineZoom]);

  useEffect(() => {
    if (waveform.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    console.log("Drawing multi-color waveform, data points:", waveform.length, "canvas width:", canvasWidth);

    // Update canvas size
    canvas.width = canvasWidth;
    canvas.height = 44;

    const width = canvas.width;
    const height = canvas.height;
    const drawHeight = height - (VERTICAL_PADDING * 2);

    // Clear canvas
    context.clearRect(0, 0, width, height);

    const barWidth = Math.max(1, width / (waveform.length / 3)); // Divide by 3 since data is interleaved
    const centerY = height / 2;

    // Extract real frequency bands from interleaved data
    // Data format: [low, mid, high, low, mid, high, ...]
    const numSamples = waveform.length / 3;

    for (let i = 0; i < numSamples; i++) {
      const x = i * barWidth;
      const idx = i * 3;

      // Extract real frequency values (already normalized)
      const lowVal = waveform[idx] || 0;
      const midVal = waveform[idx + 1] || 0;
      const highVal = waveform[idx + 2] || 0;

      // Calculate band heights based on REAL frequency analysis
      const lowHeight = lowVal * drawHeight * 0.4; // Bass gets 40% of height potential
      const midHeight = midVal * drawHeight * 0.45; // Mids get 45%
      const highHeight = highVal * drawHeight * 0.3; // Treble gets 30%

      // Draw low frequency (magenta) - bottom portion, mirrored
      context.fillStyle = FREQ_COLORS.low;
      context.fillRect(
        x,
        centerY - (lowHeight / 2),
        barWidth * 0.85,
        lowHeight / 2
      );
      context.fillRect(
        x,
        centerY,
        barWidth * 0.85,
        lowHeight / 2
      );

      // Draw mid frequency (purple) - middle portion
      context.fillStyle = FREQ_COLORS.mid;
      const midStart = centerY - (lowHeight / 2) - (midHeight / 2);
      context.fillRect(
        x,
        midStart,
        barWidth * 0.85,
        midHeight / 2
      );
      context.fillRect(
        x,
        centerY + (lowHeight / 2),
        barWidth * 0.85,
        midHeight / 2
      );

      // Draw high frequency (cyan) - top/bottom tips
      context.fillStyle = FREQ_COLORS.high;
      const highStartTop = centerY - (lowHeight / 2) - (midHeight / 2) - (highHeight / 2);
      context.fillRect(
        x,
        highStartTop,
        barWidth * 0.85,
        highHeight / 2
      );
      const highStartBottom = centerY + (lowHeight / 2) + (midHeight / 2);
      context.fillRect(
        x,
        highStartBottom,
        barWidth * 0.85,
        highHeight / 2
      );
    }

    console.log("Multi-color waveform drawn successfully");
  }, [waveform, canvasWidth]);

  return (
    <div className="h-10 bg-gradient-to-r from-[#151022]/60 to-[#0D0A1A]/60 rounded-lg py-0.5 px-1 flex items-center gap-1 border border-purple-500/20">
      {/* Track label - now clickable for mute toggle */}
      <button
        onClick={toggleAudioMute}
        className={`w-5 h-full flex items-center justify-center rounded-md flex-shrink-0 border transition-all cursor-pointer ${isAudioMuted
            ? 'bg-gradient-to-b from-magenta-500/40 to-red-500/40 border-magenta-400/60 shadow-[0_0_12px_rgba(255,45,146,0.5)]'
            : 'bg-gradient-to-b from-magenta-500/20 to-purple-500/20 border-purple-500/30 hover:border-cyan-400/50'
          }`}
        title={isAudioMuted ? 'Unmute audio' : 'Mute audio'}
      >
        {isAudioMuted ? (
          <VolumeX className="h-2.5 w-2.5 text-magenta-400" />
        ) : (
          <AudioWaveform className="h-2.5 w-2.5 text-cyan-400" />
        )}
      </button>

      {/* Waveform container with horizontal scroll */}
      <div
        ref={containerRef}
        className="flex-1 h-full relative bg-[#0D0A1A]/50 rounded-md overflow-x-auto overflow-y-hidden"
        style={{ scrollbarColor: '#A855F7 #151022' }}
      >
        {waveform.length > 0 ? (
          <div style={{ width: canvasWidth, height: '100%', position: 'relative' }}>
            <canvas
              ref={canvasRef}
              className="h-full"
              style={{ width: canvasWidth }}
              height={36}
            />

            {/* Audio markers */}
            {audioMarkers.map((markerTime, index) => {
              const markerPosition = duration > 0 ? (markerTime / duration) * canvasWidth : 0;
              return (
                <div
                  key={index}
                  className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-20 cursor-ew-resize group"
                  style={{ left: markerPosition }}
                  onMouseDown={() => setDraggingMarkerIndex(index)}
                >
                  <div className="absolute -top-1 -translate-x-1/2 bg-yellow-400 p-0.5 rounded-full ring-2 ring-background group-hover:scale-125 transition-transform shadow-lg shadow-yellow-400/30">
                    <MapPin className="h-2.5 w-2.5 text-background" fill="currentColor" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-center p-2">
            <p className="text-muted-foreground text-sm opacity-70">Upload audio to generate waveform</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioTrack;
