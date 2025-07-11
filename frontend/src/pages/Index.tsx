
import React, { useState, useEffect } from 'react';
import { Header } from "@/components/Header";
import MediaLibrary from "@/components/MediaLibrary";
import Timeline from "@/components/Timeline";
import VideoPreview from "@/components/VideoPreview";
import WorkflowTutorial from "@/components/WorkflowTutorial";
import { EditorProvider } from "@/context/EditorContext";
import ProjectDashboard from "@/components/ProjectDashboard";
import { useProjects, Project } from "@/hooks/useProjects";
import { useEditorStore } from "@/lib/store";
import { toast } from 'sonner';

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
      <div className="min-h-screen bg-slate-900 text-white">
        <Header 
          onShowProjects={() => setShowProjects(true)}
          onSaveProject={handleSaveProject}
          currentProjectName={currentProjectName}
          onProjectNameChange={setCurrentProjectName}
        />
        <div className="flex h-[calc(100vh-4rem)]">
          <div className="w-80 border-r border-slate-700 flex flex-col">
            <MediaLibrary />
            <WorkflowTutorial />
          </div>
          <div className="flex-1 flex flex-col">
            <div className="flex-1">
              <VideoPreview />
            </div>
            <div className="h-64">
              <Timeline />
            </div>
          </div>
        </div>
      </div>
    </EditorProvider>
  );
};

export default Index;
