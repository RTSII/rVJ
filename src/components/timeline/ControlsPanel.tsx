import React from 'react';
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    MapPin,
    Download,
    X,
    SkipBack,
    Play,
    Pause,
    Music,
    Repeat,
    Magnet,
    Grid3x3
} from "lucide-react";
import { useEditorStore } from '@/lib/store';
import { useEditor } from '@/context/EditorContext';
import BPMControls from './BPMControls';

interface ControlsPanelProps {
    handleExport: () => void;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({ handleExport }) => {
    const { togglePlay } = useEditor();
    const {
        isExporting,
        exportProgress,
        currentTime,
        addAudioMarker,
        duration,
        isExtendMode,
        setExtendMode,
        resetToTimelineStart,
        isPlaying,
        bpmSync,
        setBPMEnabled
    } = useEditorStore();

    // Format timecode as HH:MM:SS:FF
    const formatTimecode = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const frames = Math.floor((seconds % 1) * 30);
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
    };

    return (
        <div className="w-full bg-[#0D0A1A]/80 backdrop-blur-sm border-y border-purple-500/20">
            {/* Main Control Bar */}
            <div className="flex items-center justify-between px-3 py-2 gap-3">
                {/* Left: Primary Actions */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-3 text-purple-400 hover:bg-purple-500/20"
                        onClick={() => addAudioMarker(currentTime)}
                        title="Add Marker (M)"
                    >
                        <MapPin className="h-3.5 w-3.5 mr-1.5" />
                        Marker
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-3 text-cyan-400 hover:bg-cyan-500/20"
                        onClick={handleExport}
                        disabled={isExporting}
                        title="Export Video (Ctrl+E)"
                    >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        {isExporting ? `${Math.round(exportProgress)}%` : 'Export'}
                    </Button>
                </div>

                {/* Center: Timecode & Playback */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-cyan-400 hover:bg-cyan-500/20"
                        onClick={resetToTimelineStart}
                        title="Rewind to Start"
                    >
                        <SkipBack className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-mono text-cyan-400 bg-[#0D0A1A]/80 px-3 py-1 rounded-md border border-cyan-500/30 min-w-[120px] text-center">
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

                {/* BPM Controls */}
                <BPMControls />

                {/* Right: Controls Popover */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-3 text-magenta-400 hover:bg-magenta-500/20"
                        >
                            <Grid3x3 className="h-3.5 w-3.5 mr-1.5" />
                            Controls
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        className="w-auto bg-[#0A0715]/95 backdrop-blur-md border-purple-500/30 p-3"
                        side="left"
                        align="end"
                        sideOffset={12}
                    >
                        <div className="grid grid-cols-2 gap-2">
                            {/* BPM Sync */}
                            <button
                                className={`w-[70px] h-[70px] rounded-lg border transition-all flex flex-col items-center justify-center gap-1 group ${bpmSync.isEnabled
                                    ? 'bg-gradient-to-br from-purple-500/20 to-magenta-500/20 border-purple-400/50'
                                    : 'bg-gradient-to-br from-purple-500/10 to-magenta-500/10 border-purple-500/30 hover:border-purple-400/50'
                                    }`}
                                onClick={() => setBPMEnabled(!bpmSync.isEnabled)}
                                title="BPM Sync - Auto-adjust video playback to audio tempo"
                            >
                                <Music className="h-5 w-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                                <span className={`text-[10px] font-medium transition-colors ${bpmSync.isEnabled ? 'text-purple-300' : 'text-purple-400/80 group-hover:text-purple-300'
                                    }`}>BPM Sync</span>
                                <span className={`text-[9px] transition-colors ${bpmSync.isEnabled ? 'text-purple-300/80' : 'text-purple-400/60'
                                    }`}>{bpmSync.targetBPM}</span>
                            </button>

                            {/* X-Mode */}
                            <button
                                className={`w-[70px] h-[70px] rounded-lg border transition-all flex flex-col items-center justify-center gap-1 group ${isExtendMode
                                    ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-400/50'
                                    : 'bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30 hover:border-cyan-400/50'
                                    }`}
                                onClick={() => setExtendMode(!isExtendMode)}
                                title="X-Mode: Quick Extend Clips"
                            >
                                <X className="h-5 w-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                                <span className={`text-[10px] font-medium transition-colors ${isExtendMode ? 'text-cyan-300' : 'text-cyan-400/80 group-hover:text-cyan-300'
                                    }`}>X-Mode</span>
                                <span className={`text-[9px] transition-colors ${isExtendMode ? 'text-cyan-300/80' : 'text-cyan-400/60'
                                    }`}>{isExtendMode ? 'ON' : 'OFF'}</span>
                            </button>

                            {/* Snap */}
                            <button
                                className="w-[70px] h-[70px] rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 hover:border-green-400/50 transition-all flex flex-col items-center justify-center gap-1 group"
                                title="Snap to Grid (Coming soon)"
                            >
                                <Magnet className="h-5 w-5 text-green-400 group-hover:text-green-300 transition-colors" />
                                <span className="text-[10px] font-medium text-green-400/80 group-hover:text-green-300 transition-colors">Snap</span>
                                <span className="text-[9px] text-green-400/60">1/4</span>
                            </button>

                            {/* Loop */}
                            <button
                                className="w-[70px] h-[70px] rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 hover:border-yellow-400/50 transition-all flex flex-col items-center justify-center gap-1 group"
                                title="Loop Playback (Coming soon)"
                            >
                                <Repeat className="h-5 w-5 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
                                <span className="text-[10px] font-medium text-yellow-400/80 group-hover:text-yellow-300 transition-colors">Loop</span>
                                <span className="text-[9px] text-yellow-400/60">OFF</span>
                            </button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
};

export default ControlsPanel;
