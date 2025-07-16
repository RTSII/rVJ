
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, HelpCircle } from "lucide-react";
import { useEditorStore } from "@/lib/store";

const WorkflowTutorial = () => {
  const { timelineClips, audioFile, selectedClip } = useEditorStore();

  const workflowSteps = [
    {
      id: 'upload-video',
      title: 'Upload Video Clips',
      description: 'Click "Upload Video" to add your video files to the media library',
      completed: timelineClips.length > 0,
      required: true
    },
    {
      id: 'upload-audio',
      title: 'Upload Audio Track',
      description: 'Click "Upload Audio" to add background music or audio',
      completed: !!audioFile,
      required: true
    },
    {
      id: 'add-to-timeline',
      title: 'Add Clips to Timeline',
      description: 'Drag video clips from the media library to the timeline or click the + button',
      completed: timelineClips.length > 0,
      required: true
    },
    {
      id: 'trim-clips',
      title: 'Trim Video Clips (Optional)',
      description: 'Double-click any video clip in the timeline to trim its start and end points',
      completed: timelineClips.some(clip => 
        (clip.startTime ?? 0) > 0 || 
        (clip.endTime ?? clip.originalDuration ?? 0) < (clip.originalDuration ?? 0)
      ),
      required: false
    },
    {
      id: 'preview',
      title: 'Preview Your Edit',
      description: 'Click on any clip in the timeline to preview it in the video player',
      completed: !!selectedClip,
      required: false
    },
    {
      id: 'add-markers',
      title: 'Add Audio Markers (Optional)',
      description: 'Click on the audio waveform to add markers for sync points',
      completed: false, // We'll need to track this in the store
      required: false
    },
    {
      id: 'export',
      title: 'Export Final Video',
      description: 'Click "Export Video" to render and download your final video with audio',
      completed: false, // This resets after each export
      required: true
    }
  ];

  const completedSteps = workflowSteps.filter(step => step.completed).length;
  const requiredSteps = workflowSteps.filter(step => step.required).length;
  const completedRequiredSteps = workflowSteps.filter(step => step.required && step.completed).length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="h-4 w-4 mr-2" />
          Workflow Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>rVJ Editing Workflow</DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Progress: {completedSteps}/{workflowSteps.length} steps</span>
            <Badge variant={completedRequiredSteps === requiredSteps ? "default" : "secondary"}>
              {completedRequiredSteps}/{requiredSteps} required
            </Badge>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          {workflowSteps.map((step, index) => (
            <Card key={step.id} className={step.completed ? "border-green-500/50 bg-green-50/50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {step.completed ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{index + 1}. {step.title}</h4>
                      {step.required && !step.completed && (
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      )}
                      {!step.required && (
                        <Badge variant="outline" className="text-xs">Optional</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Card className="border-blue-500/50 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-lg">Missing Features Identified</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <p className="font-medium mb-2">Potential Enhancements:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Audio volume controls for individual clips</li>
                  <li>• Video speed adjustment (slow motion/time lapse)</li>
                  <li>• Text overlays and titles</li>
                  <li>• Color grading and filters</li>
                  <li>• Crossfade transitions between clips</li>
                  <li>• Audio ducking when music overlaps with speech</li>
                  <li>• Keyboard shortcuts for common actions</li>
                  <li>• Undo/Redo functionality</li>
                  <li>• Project save/load functionality</li>
                  <li>• Batch export options</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkflowTutorial;
