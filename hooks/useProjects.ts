
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TimelineClip, SerializableClip, SerializableTimelineData } from '@/types';
import { toast } from 'sonner';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  timeline_data?: SerializableTimelineData | null;
  audio_url?: string | null;
  waveform_data?: any;
  duration?: number | null;
  created_at: string;
  updated_at: string;
}

// Helper functions to convert between TimelineClip and SerializableClip
const timelineClipToSerializable = (clip: TimelineClip): SerializableClip => ({
  id: clip.id,
  src: clip.src,
  fileName: clip.file.name,
  fileType: clip.file.type,
  startTime: clip.startTime,
  endTime: clip.endTime,
  originalDuration: clip.originalDuration,
  transition: clip.transition,
});

const serializableToTimelineClip = (clip: SerializableClip): TimelineClip => {
  // Create a mock File object since we can't recreate the original File
  const mockFile = new File([''], clip.fileName, { type: clip.fileType });
  
  return {
    id: clip.id,
    src: clip.src,
    file: mockFile,
    startTime: clip.startTime,
    endTime: clip.endTime,
    originalDuration: clip.originalDuration,
    transition: clip.transition,
  };
};

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchProjects = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our Project interface
      const transformedData = (data || []).map(item => ({
        ...item,
        timeline_data: item.timeline_data as SerializableTimelineData | null
      }));
      
      setProjects(transformedData);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const saveProject = async (
    name: string,
    timelineData: { clips: TimelineClip[]; audioUrl?: string; duration?: number },
    projectId?: string
  ) => {
    if (!user) {
      toast.error('Please sign in to save projects');
      return null;
    }

    try {
      // Convert TimelineClips to SerializableClips
      const serializableData: SerializableTimelineData = {
        clips: timelineData.clips.map(timelineClipToSerializable),
        audioUrl: timelineData.audioUrl,
        duration: timelineData.duration,
      };

      const projectData = {
        name,
        timeline_data: serializableData as any, // Cast to any for Supabase JSON type
        audio_url: timelineData.audioUrl,
        duration: timelineData.duration,
        user_id: user.id
      };

      let result;
      if (projectId) {
        // Update existing project
        const { data, error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', projectId)
          .select()
          .single();
        
        if (error) throw error;
        result = {
          ...data,
          timeline_data: data.timeline_data as SerializableTimelineData | null
        };
        toast.success('Project updated successfully!');
      } else {
        // Create new project
        const { data, error } = await supabase
          .from('projects')
          .insert(projectData)
          .select()
          .single();
        
        if (error) throw error;
        result = {
          ...data,
          timeline_data: data.timeline_data as SerializableTimelineData | null
        };
        toast.success('Project saved successfully!');
      }

      await fetchProjects(); // Refresh the projects list
      return result;
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Failed to save project');
      return null;
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      
      toast.success('Project deleted successfully!');
      await fetchProjects(); // Refresh the projects list
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  const loadProject = async (projectId: string): Promise<{ project: Project; timelineClips: TimelineClip[] } | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      
      const project = {
        ...data,
        timeline_data: data.timeline_data as SerializableTimelineData | null
      };

      // Convert SerializableClips back to TimelineClips
      const timelineClips = project.timeline_data?.clips?.map(serializableToTimelineClip) || [];
      
      return { project, timelineClips };
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project');
      return null;
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
    } else {
      setProjects([]);
    }
  }, [user]);

  return {
    projects,
    loading,
    saveProject,
    deleteProject,
    loadProject,
    fetchProjects
  };
};
