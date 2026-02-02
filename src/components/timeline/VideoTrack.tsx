
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useEditorStore } from '@/lib/store';
import { Button } from "@/components/ui/button";
import { Video, GitMerge, X } from "lucide-react";
import { Transition, MediaClip } from "@/types";

interface VideoTrackProps {
  dragItem: React.MutableRefObject<number | null>;
  dragOverItem: React.MutableRefObject<number | null>;
  handleTimelineDragSort: () => void;
  handleToggleTransition: (clipId: string, currentTransition: Transition | null | undefined) => void;
  timelineContainerRef: React.RefObject<HTMLDivElement>;
}

interface ThumbnailCache {
  [key: string]: string;
}

const MIN_CLIP_WIDTH = 60; // Minimum visible width
const MIN_CLIP_DURATION = 0.5;
const PIXELS_PER_SECOND_BASE = 10; // At 100% zoom

const VideoTrack: React.FC<VideoTrackProps> = ({
  dragItem,
  dragOverItem,
  handleTimelineDragSort,
  handleToggleTransition,
  timelineContainerRef,
}) => {
  const { timelineClips, selectedClip, setSelectedClip, trimmingClipId, setTrimmingClipId, updateClip, timelineZoom, duplicateClip, isExtendMode, removeClip } = useEditorStore();
  const [draggingHandle, setDraggingHandle] = useState<'left' | 'right' | null>(null);
  const dragClipRef = useRef<MediaClip | null>(null);
  const dragStartRef = useRef({ x: 0, startTime: 0, endTime: 0 });
  const [thumbnailCache, setThumbnailCache] = useState<ThumbnailCache>({});
  const generatingThumbnails = useRef<Set<string>>(new Set());
  const lastClipCount = useRef<number>(0);

  // Haptic feedback states
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [holdingClipId, setHoldingClipId] = useState<string | null>(null);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTrimMouseDown = (e: React.MouseEvent, clip: MediaClip, handle: 'left' | 'right') => {
    e.stopPropagation();
    setDraggingHandle(handle);
    dragClipRef.current = clip;
    dragStartRef.current = { x: e.clientX, startTime: clip.startTime ?? 0, endTime: clip.endTime ?? clip.originalDuration ?? 0 };
  };

  // Optimized thumbnail generation function - only generate when really needed
  const generateThumbnail = useCallback((videoSrc: string, clipId: string) => {
    // Prevent duplicate generation
    if (thumbnailCache[clipId] || generatingThumbnails.current.has(clipId)) {
      return;
    }

    console.log(`Generating thumbnail for clip: ${clipId}`);
    generatingThumbnails.current.add(clipId);

    const video = document.createElement('video');
    video.crossOrigin = "anonymous";
    video.src = videoSrc;
    video.muted = true;
    video.preload = "metadata";

    const cleanup = () => {
      generatingThumbnails.current.delete(clipId);
      video.remove();
    };

    const timeoutId = setTimeout(() => {
      console.log(`Thumbnail generation timeout for clip: ${clipId}`);
      setThumbnailCache(prev => ({
        ...prev,
        [clipId]: "data:,"
      }));
      cleanup();
    }, 5000);

    video.onloadedmetadata = () => {
      console.log(`Video metadata loaded for thumbnail: ${clipId}, duration: ${video.duration}`);
      video.currentTime = Math.min(0.5, video.duration / 3);
    };

    video.onseeked = () => {
      clearTimeout(timeoutId);

      try {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');

        if (ctx && video.videoWidth > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
          console.log(`Thumbnail generated successfully for clip: ${clipId}`);
          setThumbnailCache(prev => ({
            ...prev,
            [clipId]: thumbnailUrl
          }));
        } else {
          console.error(`Failed to get canvas context or video dimensions for clip: ${clipId}`);
          setThumbnailCache(prev => ({ ...prev, [clipId]: "data:," }));
        }
      } catch (err) {
        console.error(`Error generating thumbnail for clip ${clipId}:`, err);
        setThumbnailCache(prev => ({ ...prev, [clipId]: "data:," }));
      } finally {
        cleanup();
      }
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      console.error(`Error loading video for thumbnail: ${clipId}`);
      setThumbnailCache(prev => ({ ...prev, [clipId]: "data:," }));
      cleanup();
    };
  }, [thumbnailCache]);

  // Only generate thumbnails when clip count changes or new clips are added
  useEffect(() => {
    if (timelineClips.length !== lastClipCount.current) {
      console.log("Checking for clips needing thumbnails, total clips:", timelineClips.length);
      lastClipCount.current = timelineClips.length;

      // Only generate for clips that truly need thumbnails
      const clipsNeedingThumbnails = timelineClips.filter(
        clip => !thumbnailCache[clip.id] && !generatingThumbnails.current.has(clip.id) && clip.src
      );

      // Generate thumbnails with a small delay to prevent flooding
      clipsNeedingThumbnails.forEach((clip, index) => {
        // If clip already has thumbnail data, use it directly
        if (clip.thumbnail) {
          setThumbnailCache(prev => ({ ...prev, [clip.id]: clip.thumbnail! }));
        } else {
          // Otherwise generate new thumbnail
          setTimeout(() => {
            generateThumbnail(clip.src, clip.id);
          }, index * 100); // Stagger thumbnail generation
        }
      });
    }
  }, [timelineClips.length, thumbnailCache, generateThumbnail]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingHandle || !dragClipRef.current) return;

      const deltaX = e.clientX - dragStartRef.current.x;
      const PIXELS_PER_SECOND = PIXELS_PER_SECOND_BASE * (timelineZoom / 100);
      const deltaTime = deltaX / PIXELS_PER_SECOND;
      const clip = dragClipRef.current;

      if (draggingHandle === 'left') {
        const newStartTime = Math.max(0, dragStartRef.current.startTime + deltaTime);
        if (newStartTime < dragStartRef.current.endTime - MIN_CLIP_DURATION) {
          updateClip(clip.id, { startTime: newStartTime });
        }
      } else {
        const newEndTime = Math.min(clip.originalDuration ?? Infinity, dragStartRef.current.endTime + deltaTime);
        if (newEndTime > (clip.startTime ?? 0) + MIN_CLIP_DURATION) {
          updateClip(clip.id, { endTime: newEndTime });
        }
      }
    };

    const handleMouseUp = () => {
      setDraggingHandle(null);
      dragClipRef.current = null;
    };

    if (draggingHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingHandle, updateClip]);

  // Haptic feedback handlers
  const handleClipMouseDown = (e: React.MouseEvent, clipId: string) => {
    setActiveClipId(clipId);
    setHoldingClipId(clipId);

    // Clear any existing timeout
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
    }

    // Set timeout for hold detection (150ms for quick response)
    holdTimeoutRef.current = setTimeout(() => {
      setHoldingClipId(null);
    }, 150);
  };

  const handleClipMouseUp = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
    }
    setHoldingClipId(null);
  };

  const handleDoubleClick = (e: React.MouseEvent, clipId: string) => {
    e.stopPropagation();
    setTrimmingClipId(trimmingClipId === clipId ? null : clipId);
  }

  return (
    <div className="h-16 bg-[#151022]/40 rounded-lg p-1 flex items-center gap-1 border border-purple-500/10">
      <div className="w-5 h-full flex items-center justify-center bg-purple-500/10 rounded flex-shrink-0 border border-purple-500/20">
        <Video className="h-2.5 w-2.5 text-cyan-400" />
      </div>
      <div
        className="flex-1 h-full flex items-center gap-0"
        onDragOver={(e) => e.preventDefault()} // Enable drops in container
        onDrop={(e) => e.preventDefault()}
      >
        {timelineClips.map((clip, index) => (
          <React.Fragment key={clip.id}>
            {/* Show transition button only if the clip has a transition */}
            {index > 0 && clip.transition && (
              <div className="w-4 h-full flex items-center justify-center flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-4 h-4 rounded-full hover:bg-primary/20"
                  onClick={() => handleToggleTransition(clip.id, clip.transition)}
                >
                  <GitMerge className="h-2 w-2 text-primary" />
                </Button>
              </div>
            )}
            <div
              className="relative h-full flex-shrink-0 group"
              style={{
                width: `${Math.max(MIN_CLIP_WIDTH, ((clip.endTime ?? clip.originalDuration ?? 10) - (clip.startTime ?? 0)) * PIXELS_PER_SECOND_BASE * (timelineZoom / 100)) * (clip.loopCount || 1)}px`
              }}
            >
              <div
                className={`
                  w-full h-full rounded-sm relative overflow-hidden cursor-pointer transition-all duration-150
                  ${selectedClip?.id === clip.id && !trimmingClipId
                    ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0D0A1A] scale-[1.02] shadow-[0_0_20px_rgba(34,211,238,0.4)]'
                    : 'border-2 border-muted'
                  }
                  ${holdingClipId === clip.id ? 'scale-95 opacity-90' : ''}
                  hover:ring-1 hover:ring-cyan-500/50 hover:scale-[1.01]
                  active:cursor-grabbing
                `}
                draggable
                onClick={(e) => {
                  e.stopPropagation(); // Prevent timeline container from capturing click
                  setSelectedClip(clip);
                }}
                onMouseDown={(e) => handleClipMouseDown(e, clip.id)}
                onMouseUp={handleClipMouseUp}
                onMouseLeave={handleClipMouseUp}
                onDoubleClick={(e) => handleDoubleClick(e, clip.id)}
                onDragStart={() => (dragItem.current = index)}
                onDragEnter={() => (dragOverItem.current = index)}
                onDragEnd={(e) => {
                  // Check if dropped outside timeline
                  const timelineRect = timelineContainerRef.current?.getBoundingClientRect();
                  if (timelineRect) {
                    const { clientX, clientY } = e;
                    if (
                      clientX < timelineRect.left || clientX > timelineRect.right ||
                      clientY < timelineRect.top || clientY > timelineRect.bottom
                    ) {
                      // Dropped outside - delete clip
                      removeClip(clip.id);
                      dragItem.current = null;
                      dragOverItem.current = null;
                      return;
                    }
                  }
                  handleTimelineDragSort();
                }}
                onDragOver={(e) => {
                  e.preventDefault(); // Enable drop
                  e.stopPropagation();
                }}
              >
                {/* Render looped thumbnails for X-extend */}
                {clip.loopCount && clip.loopCount > 1 ? (
                  <div className="flex h-full w-full">
                    {Array.from({ length: clip.loopCount }).map((_, i) => (
                      <div key={i} className="flex-1 h-full relative border-r border-cyan-500/30 last:border-r-0">
                        {thumbnailCache[clip.id] && thumbnailCache[clip.id] !== "data:," ? (
                          <img
                            src={thumbnailCache[clip.id]}
                            alt={clip.file?.name || 'Video clip'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted/50">
                            <Video className="h-8 w-8 text-muted-foreground opacity-30" />
                          </div>
                        )}
                        {/* Loop number indicator */}
                        <span className="absolute top-0 left-0 text-[8px] font-bold text-cyan-400 bg-black/80 px-1 rounded-br-sm border-r border-b border-cyan-500/50">
                          ×{i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Show single thumbnail if no loop */
                  <>
                    {thumbnailCache[clip.id] && thumbnailCache[clip.id] !== "data:," ? (
                      <img
                        src={thumbnailCache[clip.id]}
                        alt={clip.file?.name || 'Video clip'}
                        className="w-full h-full object-cover"
                        onError={() => {
                          console.error(`Failed to load thumbnail for clip: ${clip.id}`);
                          setThumbnailCache(prev => ({ ...prev, [clip.id]: "data:," }));
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted/50">
                        <Video className="h-8 w-8 text-muted-foreground opacity-30" />
                      </div>
                    )}
                  </>
                )}
                <p className="absolute bottom-0 left-0 text-[10px] text-foreground bg-black/70 px-1 rounded-sm truncate pointer-events-none max-w-full font-medium">
                  {clip.file?.name || clip.filePath?.split(/[\\/]/).pop() || 'Clip'}
                </p>
                {/* Add transition button - only show on hover if no transition exists */}
                {index > 0 && !clip.transition && (
                  <div
                    className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTransition(clip.id, null);
                    }}
                  >
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-1.5 h-1.5 rounded-full bg-background/80 hover:bg-primary/20 border"
                      title="Add transition"
                    >
                      <GitMerge className="h-0.5 w-0.5 text-muted-foreground" />
                    </Button>
                  </div>
                )}

                {/* Duplicate/Extend controls - show on hover */}
                <div className="absolute -bottom-7 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-30">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 bg-[#0D0A1A]/90 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateClip(clip.id, 2);
                    }}
                    title="Duplicate 2x"
                  >
                    <span className="text-[9px] font-bold text-cyan-400">×2</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 bg-[#0D0A1A]/90 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateClip(clip.id, 3);
                    }}
                    title="Duplicate 3x"
                  >
                    <span className="text-[9px] font-bold text-cyan-400">×3</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 bg-[#0D0A1A]/90 hover:bg-magenta-500/20 border border-magenta-500/30 rounded-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateClip(clip.id, 10); // Extend with 10 copies for "infinite"
                    }}
                    title="Extend (10x)"
                  >
                    <X className="h-3 w-3 text-magenta-400" />
                  </Button>
                </div>
              </div>
              {/* Trimming handles */}
              {trimmingClipId === clip.id && (
                <>
                  <div className="absolute inset-0 ring-1 ring-primary ring-offset-1 ring-offset-background rounded-sm pointer-events-none z-10"></div>
                  <div
                    className="absolute -left-0.5 top-0 bottom-0 w-1 bg-primary/80 hover:bg-primary transition-colors cursor-ew-resize z-20 flex items-center justify-center rounded-l-sm"
                    onMouseDown={(e) => handleTrimMouseDown(e, clip, 'left')}
                  >
                    <div className="w-0.5 h-1 bg-primary-foreground/70 rounded-full" />
                  </div>
                  <div
                    className="absolute -right-0.5 top-0 bottom-0 w-1 bg-primary/80 hover:bg-primary transition-colors cursor-ew-resize z-20 flex items-center justify-center rounded-r-sm"
                    onMouseDown={(e) => handleTrimMouseDown(e, clip, 'right')}
                  >
                    <div className="w-0.5 h-1 bg-primary-foreground/70 rounded-full" />
                  </div>
                </>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default VideoTrack;
