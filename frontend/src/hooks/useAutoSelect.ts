
import { useEffect } from 'react';
import { useEditorStore } from '@/lib/store';

export const useAutoSelect = () => {
  const {
    timelineClips,
    selectedClip,
    resetToTimelineStart
  } = useEditorStore();

  // Auto-select first clip when clips are added or timeline changes
  useEffect(() => {
    if (timelineClips.length > 0) {
      const firstClip = timelineClips[0];
      // Always select the first clip when timeline changes, unless the first clip is already selected
      if (!selectedClip || selectedClip.id !== firstClip.id) {
        console.log("🎯 AUTO-SELECT: Timeline changed, selecting first clip:", firstClip.id);
        resetToTimelineStart();
      }
    }
  }, [timelineClips, selectedClip, resetToTimelineStart]);
};
