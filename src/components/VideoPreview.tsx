
import React from 'react';
import { Button } from "@/components/ui/button";
import { Play, Pause, Rewind, FastForward, Expand } from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useVideoPreloader } from "@/hooks/useVideoPreloader";
import { useEditor } from "@/context/EditorContext";
import { useEditorStore } from "@/lib/store";
import { toast } from "sonner";
import AnimatedLogoSVG from "./AnimatedLogoSVG";

const VideoPreview = () => {
  const previewContainerRef = React.useRef<HTMLDivElement>(null);
  const {
    videoRef,
    togglePlay,
    jumpToStart,
    jumpToEnd,
    handleClipEnded,
    seekToTime
  } = useEditor();

  const {
    selectedClip,
    isPlaying,
    currentTime,
    setCurrentTime,
    updateClip,
    timelineClips,
    absoluteTimelinePosition,
    setAbsoluteTimelinePosition,
    isAudioMaster
  } = useEditorStore();

  const [clipDisplayDuration, setClipDisplayDuration] = React.useState(0);
  const [isBuffering, setIsBuffering] = React.useState(false);
  const isTransitioning = React.useRef(false);
  const transitionTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();
  const { isPreloaded, getBufferHealth, forceBufferCheck } = useVideoPreloader(timelineClips, selectedClip?.id);
  const [bufferHealth, setBufferHealth] = React.useState(0);
  const [bufferStalled, setBufferStalled] = React.useState(false);
  const lastBufferUpdate = React.useRef(Date.now());

  // Monitor buffer health for current clip - using ref to avoid infinite loop
  const getBufferHealthRef = React.useRef(getBufferHealth);
  getBufferHealthRef.current = getBufferHealth;

  React.useEffect(() => {
    if (selectedClip) {
      const health = getBufferHealthRef.current(selectedClip.id);
      setBufferHealth(health);
    }
  }, [selectedClip?.id]); // Only re-run when clip changes, not on every render

  // Enhanced buffering detection - using ref to avoid infinite loop
  const forceBufferCheckRef = React.useRef(forceBufferCheck);
  forceBufferCheckRef.current = forceBufferCheck;

  React.useEffect(() => {
    if (!videoRef.current || !selectedClip) return;

    const video = videoRef.current;
    let stallTimeout: ReturnType<typeof setTimeout>;

    const handleWaiting = () => {
      console.log("🎬 BUFFER: Video waiting/buffering for clip:", selectedClip.id);
      setIsBuffering(true);
      setBufferStalled(false);

      // Set stall detection timeout
      stallTimeout = setTimeout(() => {
        console.warn("🎬 BUFFER: Video stalled for 3+ seconds");
        setBufferStalled(true);
        forceBufferCheckRef.current();
      }, 3000);
    };

    const handleCanPlay = () => {
      console.log("🎬 BUFFER: Video can play for clip:", selectedClip.id);
      setIsBuffering(false);
      setBufferStalled(false);
      if (stallTimeout) clearTimeout(stallTimeout);
    };

    const handleCanPlayThrough = () => {
      console.log("🎬 BUFFER: Video can play through for clip:", selectedClip.id);
      setIsBuffering(false);
      setBufferStalled(false);
      if (stallTimeout) clearTimeout(stallTimeout);
    };

    const handleProgress = () => {
      // Throttle buffer health updates
      const now = Date.now();
      if (now - lastBufferUpdate.current > 1000) {
        const health = getBufferHealthRef.current(selectedClip.id);
        setBufferHealth(health);
        lastBufferUpdate.current = now;
      }
    };

    const handleSeeking = () => {
      console.log("🎬 BUFFER: Video seeking");
      setIsBuffering(true);
    };

    const handleSeeked = () => {
      console.log("🎬 BUFFER: Video seek complete");
      setIsBuffering(false);
    };

    // Enhanced event listeners for better buffer monitoring
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('seeked', handleSeeked);

    return () => {
      if (stallTimeout) clearTimeout(stallTimeout);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, [selectedClip?.id]); // Only depends on clip ID now


  const handleTimeUpdate = () => {
    if (videoRef.current && selectedClip && !isTransitioning.current) {
      const videoCurrentTime = videoRef.current.currentTime;
      const clipStartTime = selectedClip.startTime ?? 0;
      const clipEndTime = selectedClip.endTime ?? videoRef.current.duration;

      if (clipEndTime && videoCurrentTime >= clipEndTime - 0.02) {
        console.log("🎬 TIME-UPDATE: Clip reached end, triggering seamless transition");
        isTransitioning.current = true;

        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }

        handleClipEnded();

        transitionTimeoutRef.current = setTimeout(() => {
          isTransitioning.current = false;
        }, 500);
      } else {
        const relativeTime = Math.max(0, videoCurrentTime - clipStartTime);
        setCurrentTime(relativeTime);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && selectedClip) {
      const videoDuration = videoRef.current.duration || 0;
      console.log("🎬 METADATA: Video loaded for clip:", selectedClip.id, "duration:", videoDuration);

      if (!selectedClip.originalDuration || selectedClip.originalDuration === 0) {
        console.log("🎬 METADATA: Updating clip with video duration");
        updateClip(selectedClip.id, {
          startTime: 0,
          endTime: videoDuration,
          originalDuration: videoDuration,
        });
        setClipDisplayDuration(videoDuration);
      } else {
        const clipStartTime = selectedClip.startTime ?? 0;
        const clipEndTime = selectedClip.endTime ?? videoDuration;
        const clipDuration = clipEndTime - clipStartTime;

        videoRef.current.currentTime = clipStartTime;
        setClipDisplayDuration(clipDuration || videoDuration);
        setCurrentTime(0);
      }
    }
  };

  const handleVideoEnded = () => {
    console.log("🎬 VIDEO-END: Video element ended event");
    if (!isTransitioning.current) {
      handleClipEnded();
    }
  };

  // Enhanced clip change handler
  React.useEffect(() => {
    if (videoRef.current && selectedClip) {
      const clipStartTime = selectedClip.startTime ?? 0;
      const clipEndTime = selectedClip.endTime ?? selectedClip.originalDuration;
      const clipDuration = (clipEndTime || 0) - clipStartTime;

      console.log("🎬 CLIP-CHANGE: Selected clip changed to:", selectedClip.id);
      console.log("🎬 CLIP-CHANGE: Clip start time:", clipStartTime, "duration:", clipDuration);

      setClipDisplayDuration(clipDuration > 0 ? clipDuration : (videoRef.current.duration || 8));
      setCurrentTime(0);

      if (!isTransitioning.current) {
        console.log("🎬 CLIP-CHANGE: Setting video time to clip start:", clipStartTime);
        videoRef.current.currentTime = clipStartTime;
      }
    }
  }, [selectedClip?.id, selectedClip?.startTime, selectedClip?.endTime, setCurrentTime]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedClip || clipDisplayDuration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = clickX / rect.width;
    const newTime = progress * clipDisplayDuration;

    console.log("🎬 PROGRESS-CLICK: Seeking to time:", newTime);
    seekToTime(newTime);
  };

  const toggleFullScreen = () => {
    const elem = previewContainerRef.current;
    if (!elem) return;

    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(err => {
        toast.error("Could not enter full screen mode.", { description: err.message });
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return "00:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const currentClipIndex = selectedClip ? timelineClips.findIndex(c => c.id === selectedClip.id) + 1 : 0;
  const totalClips = timelineClips.length;
  const videoIsPlaying = videoRef.current ? !videoRef.current.paused : false;
  const shouldShowPlayButton = !videoIsPlaying && !isTransitioning.current;
  const progressPercentage = clipDisplayDuration > 0 ? Math.min(100, (currentTime / clipDisplayDuration) * 100) : 0;

  return (
    <div ref={previewContainerRef} className="bg-card border border-border rounded-lg overflow-hidden grid grid-rows-[1fr_auto] h-full">
      <div className="bg-black flex items-center justify-center relative group overflow-hidden">
        {selectedClip ? (
          <>
            <video
              ref={videoRef}
              src={selectedClip.proxyUrl && selectedClip.proxyReady ? selectedClip.proxyUrl : selectedClip.src}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleVideoEnded}
              onClick={togglePlay}
              preload="auto"
              playsInline
              muted={false}
            />

            {/* Enhanced Loading/Buffering Indicator */}
            {(isBuffering || bufferStalled) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
                <div className="bg-black/80 rounded-lg p-4 flex flex-col items-center gap-3">
                  {bufferStalled ? (
                    <>
                      <div className="w-8 h-8 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                      <div className="text-white text-sm">Connection issues - retrying...</div>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <div className="text-white text-sm">Buffering...</div>
                    </>
                  )}
                  {bufferHealth > 0 && (
                    <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 transition-all duration-300"
                        style={{ width: `${bufferHealth}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced Preload Status Indicator */}
            {selectedClip && (
              <div className="absolute top-2 right-2 flex items-center gap-2 text-xs text-white/90 bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <div className={`w-2 h-2 rounded-full ${isPreloaded(selectedClip.id)
                  ? 'bg-green-400 shadow-lg shadow-green-400/30'
                  : bufferHealth > 50
                    ? 'bg-yellow-400 shadow-lg shadow-yellow-400/30'
                    : 'bg-red-400 shadow-lg shadow-red-400/30'
                  }`}></div>
                <span className="font-medium">
                  {isPreloaded(selectedClip.id)
                    ? 'Ready'
                    : bufferHealth > 0
                      ? `${Math.round(bufferHealth)}%`
                      : 'Loading'}
                </span>
                {bufferHealth > 0 && bufferHealth < 100 && (
                  <div className="w-12 h-1 bg-white/20 rounded-full overflow-hidden ml-1">
                    <div
                      className="h-full bg-current transition-all duration-300"
                      style={{ width: `${bufferHealth}%` }}
                    ></div>
                  </div>
                )}
              </div>
            )}

            {shouldShowPlayButton && !isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-16 h-16 rounded-full bg-black/40 hover:bg-black/60 text-cyan-400 border border-cyan-500/30 backdrop-blur-md pointer-events-auto shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all hover:scale-110"
                  onClick={togglePlay}
                >
                  <Play className="h-8 w-8 ml-1 fill-cyan-400" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center flex-col bg-[#050505] relative group overflow-hidden">
            {/* Cinematic Screening Placeholder */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
              <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.9)_100%)]"></div>
            </div>

            <div className="relative transform transition-transform duration-1000 group-hover:scale-105 z-10">
              <div className="absolute -inset-16 bg-cyan-500/10 blur-[100px] rounded-full opacity-40 group-hover:opacity-100 transition-opacity duration-1000"></div>
              <AnimatedLogoSVG size={180} />
            </div>

            <div className="text-center z-10 mt-8 space-y-2">
              <h3 className="text-xs uppercase tracking-[0.5em] font-black text-white/50">Theater Mode</h3>
              <p className="text-[9px] text-cyan-400/60 uppercase tracking-[0.3em] font-mono font-bold animate-pulse">
                Ready for screening
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Cinematic Control Bar */}
      <div className="px-5 py-2 bg-[#0D0A1A]/95 border-t border-white/5 flex items-center justify-between backdrop-blur-2xl">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white/100 hover:bg-white/5" onClick={jumpToStart} title="Jump to project start">
            <Rewind className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-cyan-400 hover:bg-cyan-500/10" onClick={togglePlay} title="Play/Pause (Space)">
            {videoIsPlaying ? <Pause className="h-5 w-5 fill-cyan-400" /> : <Play className="h-5 w-5 fill-cyan-400" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white/100 hover:bg-white/5" onClick={jumpToEnd} title="Jump to clip end">
            <FastForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 mx-6 group/progress relative px-2">
          <div
            className="w-full bg-white/5 h-1 rounded-full cursor-pointer relative overflow-visible"
            onClick={handleProgressBarClick}
          >
            {/* Playback Progress */}
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-150"
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] opacity-0 group-hover/progress:opacity-100 transition-opacity"></div>
            </div>

            {/* Hover Indicator */}
            <div className="absolute inset-0 h-full bg-white/5 opacity-0 group-hover/progress:opacity-100 transition-opacity"></div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10">
              {formatTime(currentTime)}
            </span>
            <span className="text-[10px] font-mono text-white/20">/</span>
            <span className="text-[10px] font-mono text-white/40">
              {formatTime(clipDisplayDuration)}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-white/10 mx-1"></div>

          <div className="flex items-center gap-1">
            {totalClips > 0 && (
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter mr-2">
                Clip {currentClipIndex}<span className="text-white/10 mx-0.5">/</span>{totalClips}
              </span>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white/100 hover:bg-white/5" onClick={toggleFullScreen} title="Fullscreen">
              <Expand className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPreview;
