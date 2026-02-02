
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
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Index = () => {
  const [showProjects, setShowProjects] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string>('Untitled Project');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeMode, setActiveMode] = useState<'video' | 'visualizer'>('video');
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
      <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#0D0A1A] via-[#151022] to-[#0D0A1A] text-foreground flex flex-col">
        <Header
          onShowProjects={() => setShowProjects(true)}
          onSaveProject={handleSaveProject}
          currentProjectName={currentProjectName}
          onProjectNameChange={setCurrentProjectName}
        >
          {/* Centered Mode Toggle in Header */}
          <div className="flex bg-[#110C1D]/60 border border-purple-500/20 cyber-border h-9 p-1 rounded-md">
            <button
              onClick={() => setActiveMode('video')}
              className={`px-6 py-1 text-xs uppercase tracking-widest font-bold transition-all rounded ${activeMode === 'video'
                ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                : 'text-muted-foreground hover:text-cyan-400/70'
                }`}
            >
              Cinema
            </button>
            <button
              onClick={() => setActiveMode('visualizer')}
              className={`px-6 py-1 text-xs uppercase tracking-widest font-bold transition-all rounded ${activeMode === 'visualizer'
                ? 'bg-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                : 'text-muted-foreground hover:text-purple-400/70'
                }`}
            >
              Waves
            </button>
          </div>
        </Header>
        <div className="flex flex-1 overflow-hidden relative">
          {/* Collapsible Left Sidebar - Media Library */}
          <div
            className={`border-r border-purple-500/30 flex flex-col bg-gradient-to-b from-[#151022]/50 to-[#0D0A1A]/50 backdrop-blur-sm overflow-hidden transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-0' : 'w-60'
              }`}
            style={{ minWidth: sidebarCollapsed ? '0' : '240px' }}
          >
            <div className={`${sidebarCollapsed ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200 h-full`}>
              <MediaLibrary />
            </div>
          </div>

          {/* Persistent Expand/Collapse Toggle Tab */}
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-1/2 -translate-y-1/2 h-16 w-4 z-50 rounded-r-md border border-l-0 border-purple-500/30 bg-[#151022]/90 backdrop-blur-md transition-all duration-300 ease-in-out hover:bg-purple-500/20 group hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]`}
            style={{
              left: sidebarCollapsed ? '0' : '240px',
              transition: 'left 0.3s ease-in-out'
            }}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <div className="flex items-center justify-center w-full h-full relative">
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4 text-cyan-400 group-hover:scale-125 transition-transform" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-cyan-400 group-hover:scale-125 transition-transform" />
              )}
            </div>
          </Button>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Workspace - Theater View - dynamic height with max constraint */}
            <div className="p-2 pb-0 overflow-hidden bg-black/40 relative flex items-center justify-center" style={{ maxHeight: '42vh', minHeight: '180px' }}>
              {/* Theater Ambient Light Effects */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute -top-[50%] left-1/4 w-[50%] h-[100%] bg-cyan-500/20 blur-[120px] rounded-full animate-pulse-slow"></div>
                <div className="absolute -top-[50%] right-1/4 w-[50%] h-[100%] bg-purple-500/20 blur-[120px] rounded-full animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
              </div>

              <div className="h-full w-full max-w-[1400px] flex items-center justify-center relative z-10">
                {activeMode === 'video' ? (
                  <div className="h-full aspect-video rounded-lg border border-purple-500/30 theater-shadow-cyan overflow-hidden scanlines relative bg-black shadow-[0_0_50px_-12px_rgba(34,211,238,0.3)] mx-auto">
                    <VideoPreview />
                  </div>
                ) : (
                  <div className="h-full aspect-video rounded-lg border border-purple-500/30 overflow-hidden p-3 bg-[#151022]/80 backdrop-blur-md shadow-[0_0_50px_-12px_rgba(168,85,247,0.3)] mx-auto">
                    <VisualizerPanel />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Workspace - Timeline - takes remaining space, no vertical scroll */}
            <div className="flex-1 min-h-[200px] border-t border-purple-500/30 bg-gradient-to-b from-[#151022]/80 to-[#0D0A1A]/80 backdrop-blur-sm overflow-hidden flex flex-col">
              <Timeline />
            </div>
          </div>
        </div>
      </div>
    </EditorProvider>
  );
};

export default Index;
