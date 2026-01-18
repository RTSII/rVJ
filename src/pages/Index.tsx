
import React, { useState, useEffect } from 'react';
import { Header } from "@/components/Header";
import MediaLibrary from "@/components/MediaLibrary";
import Timeline from "@/components/Timeline";
import VideoPreview from "@/components/VideoPreview";
import WorkflowTutorial from "@/components/WorkflowTutorial";
import { VisualizerPanel } from "@/components/VisualizerPanel";
import { EditorProvider } from "@/context/EditorContext";
import ProjectDashboard from "@/components/ProjectDashboard";
import { useProjects, Project } from "@/hooks/useProjects";
import { useEditorStore } from "@/lib/store";
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [showProjects, setShowProjects] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string>('Untitled Project');
  const { saveProject, loadProject } = useProjects();
  const { clips, audioUrl, duration } = useEditorStore();

  const handleNewProject = () => {
    // Reset the editor state for a new project
    useEditorStore.getState().clearTimeline();
    setCurrentProjectId(null);
    setCurrentProjectName('Untitled Project');
    setShowProjects(false);
    toast.success('New project created');
  };

  const handleLoadProject = async (project: Project) => {
    try {
      const result = await loadProject(project.id);
      if (result) {
        const { project: loadedProject, timelineClips } = result;

        // Load project data into the editor
        if (timelineClips.length > 0) {
          useEditorStore.getState().loadProject(timelineClips);
        }
        if (loadedProject.timeline_data?.audioUrl) {
          useEditorStore.getState().setAudioUrl(loadedProject.timeline_data.audioUrl);
        }

        setCurrentProjectId(loadedProject.id);
        setCurrentProjectName(loadedProject.name);
        setShowProjects(false);

        console.log('Project loaded:', loadedProject.name, 'with', timelineClips.length, 'clips');
      }
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project');
    }
  };

  const handleSaveProject = async (name?: string) => {
    const projectName = name || currentProjectName;
    const timelineData = {
      clips,
      audioUrl,
      duration
    };

    console.log('Saving project:', projectName, 'with', clips.length, 'clips');

    const savedProject = await saveProject(projectName, timelineData, currentProjectId || undefined);

    if (savedProject) {
      setCurrentProjectId(savedProject.id);
      setCurrentProjectName(savedProject.name);
    }
  };

  if (showProjects) {
    return (
      <ProjectDashboard
        onNewProject={handleNewProject}
        onLoadProject={handleLoadProject}
      />
    );
  }

  return (
    <EditorProvider>
      <div className="min-h-screen bg-gradient-to-br from-[#0D0A1A] via-[#151022] to-[#0D0A1A] text-foreground">
        <Header
          onShowProjects={() => setShowProjects(true)}
          onSaveProject={handleSaveProject}
          currentProjectName={currentProjectName}
          onProjectNameChange={setCurrentProjectName}
        />
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Left Sidebar - Media Library */}
          <div className="w-80 border-r border-purple-500/30 flex flex-col bg-gradient-to-b from-[#151022]/50 to-[#0D0A1A]/50 backdrop-blur-sm">
            <MediaLibrary />
            <WorkflowTutorial />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Video Preview / Visualizer */}
            <div className="flex-1 p-4">
              <Tabs defaultValue="video" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2 bg-[#151022] border border-purple-500/30 cyber-border">
                  <TabsTrigger
                    value="video"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-b-2 data-[state=active]:border-cyan-400"
                  >
                    Video Preview
                  </TabsTrigger>
                  <TabsTrigger
                    value="visualizer"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-pink-500/20 data-[state=active]:text-pink-400 data-[state=active]:border-b-2 data-[state=active]:border-pink-400"
                  >
                    Audio Visualizer
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="video" className="flex-1 mt-4">
                  <div className="h-full rounded-lg border border-purple-500/30 cyber-border-cyan overflow-hidden scanlines">
                    <VideoPreview />
                  </div>
                </TabsContent>
                <TabsContent value="visualizer" className="flex-1 mt-4">
                  <div className="h-full rounded-lg border border-purple-500/30 cyber-border overflow-hidden p-4 bg-[#151022]/50">
                    <VisualizerPanel />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Timeline */}
            <div className="h-64 border-t border-purple-500/30 bg-gradient-to-b from-[#151022]/80 to-[#0D0A1A]/80 backdrop-blur-sm">
              <Timeline />
            </div>
          </div>
        </div>
      </div>
    </EditorProvider>
  );
};

export default Index;
