
import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Minus, Download, Loader2, MapPin, SkipBack, X, Play, Pause } from "lucide-react";
import { useEditorStore } from '@/lib/store';
import { useEditor } from '@/context/EditorContext';

interface TimelineControlsProps {
  handleExport: () => void;
}

// Format duration as HH:MM:SS:FF (timecode)
const formatTimecode = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "00:00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor(((seconds % 1) * 30)); // Assume 30fps
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
};

const TimelineControls: React.FC<TimelineControlsProps> = ({ handleExport }) => {
  const { togglePlay } = useEditor();
  const {
    isExporting,
    exportProgress,
    currentTime,
    addAudioMarker,
    duration,
    timelineZoom,
    zoomIn,
    zoomOut,
    isExtendMode,
    setExtendMode,
    resetToTimelineStart,
    isPlaying
  } = useEditorStore();

  // Calculate zoom slider position (10-500 mapped to 0-100%)
  const zoomPercentage = ((timelineZoom - 10) / (500 - 10)) * 100;

  return (
    <div className="px-3 py-0.5 border-b border-purple-500/20 flex items-center justify-between bg-gradient-to-r from-[#151022]/80 to-[#0D0A1A]/80">
      {/* Left controls - Marker & Export */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="h-7 text-[10px] bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-cyan-400 px-2"
          onClick={() => addAudioMarker(currentTime)}
        >
          <MapPin className="h-3 w-3 mr-1" />
          Add Marker
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="h-7 text-[10px] bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-400 px-2"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Download className="h-3 w-3 mr-1" />
          )}
          {isExporting ? `Exporting... ${exportProgress}%` : "Export"}
        </Button>
        <Button
          variant={isExtendMode ? "default" : "ghost"}
          size="icon"
          className={`h-7 w-7 ${isExtendMode ? 'bg-magenta-500/30 text-magenta-400 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'text-muted-foreground hover:bg-magenta-500/20'}`}
          onClick={() => setExtendMode(!isExtendMode)}
          title="Toggle Extend Mode (X2/X3 clip duplication)"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Center - Rewind + Timecode display */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-cyan-400 hover:bg-cyan-500/20"
          onClick={resetToTimelineStart}
          title="Rewind to beginning"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <span className="text-sm font-mono text-cyan-400 bg-[#0D0A1A]/80 px-3 py-1 rounded-md border border-cyan-500/30">
          {formatTimecode(duration)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-cyan-400 hover:bg-cyan-500/20"
          onClick={togglePlay}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      </div>

      {/* Right controls - Zoom */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-magenta-400 hover:bg-magenta-500/20"
          onClick={zoomOut}
          title="Zoom Out (or Ctrl+Scroll)"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <div className="relative w-20 h-2 bg-[#0D0A1A] rounded-full border border-purple-500/30">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-magenta-500 to-cyan-500 rounded-full transition-all duration-150"
            style={{ width: `${zoomPercentage}%` }}
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-cyan-400 hover:bg-cyan-500/20"
          onClick={zoomIn}
          title="Zoom In (or Ctrl+Scroll)"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <span className="text-xs text-muted-foreground w-10 text-right font-mono">
          {timelineZoom}%
        </span>
      </div>
    </div>
  );
};

export default TimelineControls;
