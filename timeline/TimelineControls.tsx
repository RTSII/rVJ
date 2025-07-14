
import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Minus, Download, Loader2, MapPin } from "lucide-react";
import { useEditorStore } from '@/lib/store';

interface TimelineControlsProps {
  handleExport: () => void;
}

const TimelineControls: React.FC<TimelineControlsProps> = ({ handleExport }) => {
  const { isExporting, exportProgress, currentTime, addAudioMarker } = useEditorStore();

  return (
    <div className="p-1.5 border-b border-border flex items-center justify-between">
      <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={() => addAudioMarker(currentTime)}>
            <MapPin className="h-3 w-3 mr-1"/>Add Marker
          </Button>
          <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Download className="h-3 w-3 mr-1" />
            )}
            {isExporting ? `Exporting... ${exportProgress}%` : "Export"}
          </Button>
      </div>
      <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">00:01:15:03</span>
      </div>
      <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6"><Minus className="h-3 w-3" /></Button>
          <div className="w-16 bg-muted h-1 rounded-full"><div className="w-1/2 bg-primary h-1 rounded-full"></div></div>
          <Button variant="ghost" size="icon" className="h-6 w-6"><Plus className="h-3 w-3" /></Button>
      </div>
    </div>
  );
};

export default TimelineControls;
