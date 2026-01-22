
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import React, { useRef, useEffect, useState } from "react";
import { useEditor } from "@/context/EditorContext";
import { useEditorStore } from "@/lib/store";
import { toast } from "sonner";
import { exportVideo } from "@/lib/export";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { Transition } from "@/types";
import {
  TimelineControls,
  ControlsPanel,
  AudioTrack,
  VideoTrack,
  TimelineRuler
} from './timeline/index';

const Timeline = () => {
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const { audioRef, seekToAbsoluteTime, getAbsoluteTimePosition } = useEditor();

  const {
    timelineClips,
    setTimelineClips,
    updateClip,
    addClipToTimeline,
    currentTime,
    duration,
    audioSrc,
    waveform,
    audioFile,
    isExporting,
    setIsExporting,
    exportProgress,
    setExportProgress,
    audioMarkers,
    addAudioMarker,
    setAudioMarkers,
    selectedClip,
    absoluteTimelinePosition,
    timelineZoom,
    setTimelineZoom,
    isAudioMaster,
  } = useEditorStore();

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const ffmpegRef = useRef(new FFmpeg());
  const [draggingMarkerIndex, setDraggingMarkerIndex] = useState<number | null>(null);
  const [isDraggingProgressBar, setIsDraggingProgressBar] = useState(false);

  // Calculate playhead position based on absolute timeline position
  const getPlayheadPosition = () => {
    // If audio is loaded and is master, use audio duration for precise sync
    if (isAudioMaster && duration > 0) {
      return `${Math.min(100, (absoluteTimelinePosition / duration) * 100)}%`;
    }

    // Otherwise, calculate from video clips total duration
    if (timelineClips.length === 0) return '0%';

    const totalDuration = timelineClips.reduce((acc, clip) => {
      const clipDuration = (clip.endTime ?? clip.originalDuration ?? 0) - (clip.startTime ?? 0);
      return acc + clipDuration;
    }, 0);

    if (totalDuration === 0) return '0%';

    // Use absolute timeline position instead of calculating from current clip
    return `${Math.min(100, (absoluteTimelinePosition / totalDuration) * 100)}%`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineContainerRef.current || isDraggingProgressBar) return;

    const rect = timelineContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));

    // Calculate total duration of all clips
    const totalDuration = timelineClips.reduce((acc, clip) => {
      const clipDuration = (clip.endTime ?? clip.originalDuration ?? 0) - (clip.startTime ?? 0);
      return acc + clipDuration;
    }, 0);

    if (totalDuration === 0) return;

    const targetTime = progress * totalDuration;
    seekToAbsoluteTime(targetTime);
  };

  const handleProgressBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDraggingProgressBar(true);
    handleTimelineClick(e);
  };

  // Mouse wheel zoom handler (Ctrl/Cmd + Scroll)
  useEffect(() => {
    const container = timelineContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -10 : 10;
        const newZoom = Math.min(500, Math.max(10, timelineZoom + delta));
        setTimelineZoom(newZoom);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [timelineZoom, setTimelineZoom]);

  useEffect(() => {
    return () => {
      if (audioSrc) {
        URL.revokeObjectURL(audioSrc);
      }
    }
  }, [audioSrc]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingProgressBar && timelineContainerRef.current) {
        const rect = timelineContainerRef.current.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

        const totalDuration = timelineClips.reduce((acc, clip) => {
          const clipDuration = (clip.endTime ?? clip.originalDuration ?? 0) - (clip.startTime ?? 0);
          return acc + clipDuration;
        }, 0);

        if (totalDuration > 0) {
          const targetTime = progress * totalDuration;
          seekToAbsoluteTime(targetTime);
        }
      }

      if (draggingMarkerIndex === null || !timelineContainerRef.current || duration === 0) return;

      const timelineRect = timelineContainerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - timelineRect.left;
      const progress = Math.max(0, Math.min(1, relativeX / timelineRect.width));
      const newTime = progress * duration;

      const newMarkers = [...audioMarkers];
      newMarkers[draggingMarkerIndex] = newTime;
      setAudioMarkers(newMarkers.sort((a, b) => a - b));
    };

    const handleMouseUp = () => {
      setIsDraggingProgressBar(false);
      setDraggingMarkerIndex(null);
    };

    if (isDraggingProgressBar || draggingMarkerIndex !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingProgressBar, draggingMarkerIndex, audioMarkers, setAudioMarkers, duration, timelineClips, seekToAbsoluteTime]);

  const handleDropOnTimeline = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const clipData = e.dataTransfer.getData("application/rvj-clip");
    if (clipData) {
      try {
        const clip = JSON.parse(clipData);
        addClipToTimeline(clip);
      } catch (error) {
        console.error("Failed to parse clip data on drop", error);
      }
    }
  };

  const handleTimelineDragSort = () => {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) return;

    const newClips = [...timelineClips];
    const draggedItemContent = newClips.splice(dragItem.current!, 1)[0];
    if (draggedItemContent) {
      newClips.splice(dragOverItem.current!, 0, draggedItemContent);
    }
    dragItem.current = null;
    dragOverItem.current = null;
    setTimelineClips(newClips);
  };

  const handleToggleTransition = (clipId: string, currentTransition: Transition | null | undefined) => {
    if (currentTransition) {
      updateClip(clipId, { transition: null });
    } else {
      updateClip(clipId, { transition: { type: 'crossfade', duration: 1 } });
    }
  };

  const handleExport = async () => {
    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
    const { audioPath } = useEditorStore.getState();

    if (timelineClips.length === 0) {
      toast.error("Cannot export.", { description: "Please add at least one video clip to the timeline." });
      return;
    }

    if (!audioFile && !audioPath) {
      toast.error("Cannot export.", { description: "Please add an audio track." });
      return;
    }

    if (timelineClips.some(c => c.transition)) {
      toast.info("Transitions are coming soon!", {
        description: "Your video will be exported without transitions for now."
      });
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      if (isTauri) {
        // --- NATIVE EXPORT (TAURI) ---
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { exportVideoNative } = await import('@/lib/nativeExport');

        const outputPath = await save({
          filters: [{ name: 'Video', extensions: ['mp4'] }],
          defaultPath: 'rVJ-export.mp4'
        });

        if (!outputPath) {
          setIsExporting(false);
          return;
        }

        await exportVideoNative(
          timelineClips,
          audioPath!,
          outputPath,
          (progress) => setExportProgress(progress)
        );

        toast.success("Export complete!", { description: `Video saved to ${outputPath}` });
      } else {
        // --- BROWSER EXPORT (FFMPEG.WASM) ---
        const totalDuration = timelineClips.reduce((acc, clip) => {
          const duration = (clip.endTime ?? clip.originalDuration ?? 0) - (clip.startTime ?? 0);
          return acc + Math.max(0, duration);
        }, 0);

        if (totalDuration > 300) {
          toast.info("Long export started...", {
            description: "Exporting long videos can be memory intensive and may take a while. Please keep this tab open and active.",
            duration: 8000
          });
        }

        const outputBlob = await exportVideo({
          ffmpeg: ffmpegRef.current,
          timelineClips,
          audioFile: audioFile!,
          setExportProgress,
        });

        const url = URL.createObjectURL(outputBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rVJ-export.mp4';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("Export complete!", { description: "Your video has been downloaded." });
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed.", {
        description: "An error occurred during export. Check the console for details."
      });
    } finally {
      setIsExporting(false);
    }
  };

  const playheadPosition = getPlayheadPosition();

  // Get isAudioMuted to apply to audio element
  const { isAudioMuted } = useEditorStore();

  // Apply mute to audio element
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isAudioMuted;
    }
  }, [isAudioMuted, audioRef]);

  return (
    <Card className="flex flex-col h-full bg-card/50 border border-border/50 shadow-sm overflow-hidden">
      {audioSrc && <audio ref={audioRef} src={audioSrc} />}
      <ControlsPanel handleExport={handleExport} />
      <CardContent className="p-1 pt-0 flex-1 min-h-0 overflow-hidden flex flex-col">
        {isExporting && (
          <div className="mb-1 p-1.5 bg-secondary/20 border border-border/30 rounded-lg space-y-1">
            <p className="text-xs text-foreground font-medium text-center">Exporting Video...</p>
            <Progress value={exportProgress} className="w-full h-1.5" />
            <p className="text-[10px] text-muted-foreground text-center">{Math.round(exportProgress)}% complete</p>
          </div>
        )}
        <div
          className="relative flex-1 min-h-0 overflow-hidden flex flex-col bg-background/30 border border-border/30 rounded-lg"
          onDrop={handleDropOnTimeline}
          onDragOver={(e) => e.preventDefault()}
          onClick={handleTimelineClick}
          ref={timelineContainerRef}
        >
          {/* Tracks layout: Video clips → Time Ruler (with playhead) → Audio waveform */}
          <div className="flex-1 min-h-0 overflow-y-hidden overflow-x-auto px-1">
            <div className="space-y-0.5 h-full flex flex-col justify-end pb-1">
              {/* Video Track */}
              <VideoTrack
                dragItem={dragItem}
                dragOverItem={dragOverItem}
                handleTimelineDragSort={handleTimelineDragSort}
                handleToggleTransition={handleToggleTransition}
                timelineContainerRef={timelineContainerRef}
              />
              {/* Time ruler with integrated playhead between video and audio */}
              <TimelineRuler />
              {/* Audio Track */}
              <AudioTrack duration={duration} setDraggingMarkerIndex={setDraggingMarkerIndex} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Timeline;
