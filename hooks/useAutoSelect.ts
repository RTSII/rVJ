
import { useEffect } from 'react';
import { useEditorStore } from '@/lib/store';

export const useAutoSelect = () => {
  const {
    timelineClips,
    selectedClip,
    resetToTimelineStart
  } = useEditorStore();

  // Auto-select first clip when clips are added
  useEffect(() => {
    if (timelineClips.length > 0 && !selectedClip) {
      console.log("🎯 AUTO-SELECT: Timeline has clips but no selection, triggering reset");
      resetToTimelineStart();
    }
  }, [timelineClips.length, selectedClip, resetToTimelineStart]);
};
