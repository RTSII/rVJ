
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, FileText } from "lucide-react";
import UserMenu from "./UserMenu";
import ProxySettings from "./ProxySettings";
import AnimatedLogoSVG from "./AnimatedLogoSVG";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  onShowProjects: () => void;
  onSaveProject: (name?: string) => void;
  currentProjectName: string;
  onProjectNameChange: (name: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onShowProjects,
  onSaveProject,
  currentProjectName,
  onProjectNameChange
}) => {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState(currentProjectName);
  const { user } = useAuth();

  const handleSaveProject = () => {
    onSaveProject(projectName);
    onProjectNameChange(projectName);
    setSaveDialogOpen(false);
  };

  const handleQuickSave = () => {
    onSaveProject();
  };

  if (!user) {
    return (
      <header className="relative bg-gradient-to-r from-[#0D0A1A] via-[#151022] to-[#0D0A1A] border-b border-purple-500/30 px-6 py-3 shadow-[0_4px_20px_rgba(168,85,247,0.2)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <AnimatedLogoSVG size={48} />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="relative bg-gradient-to-r from-[#0D0A1A] via-[#151022] to-[#0D0A1A] border-b border-purple-500/30 px-6 py-3 shadow-[0_4px_20px_rgba(168,85,247,0.2)]">
      {/* Animated gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {/* Animated Logo */}
          <AnimatedLogoSVG size={48} className="hover:scale-110 transition-transform duration-300" />

          {/* Project name with cyber styling */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-purple-500/10 border border-purple-500/30 cyber-border">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-foreground/90">{currentProjectName}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Quick Save Button */}
          <Button
            onClick={handleQuickSave}
            variant="default"
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>

          {/* Save As Dialog */}
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProjectName(currentProjectName)}
              >
                Save As
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#151022] border-purple-500/30 cyber-border">
              <DialogHeader>
                <DialogTitle className="text-xl gradient-text">Save Project</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Enter a name for your project
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name" className="text-foreground/90">Project Name</Label>
                  <Input
                    id="project-name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name"
                    className="bg-[#1A1228] border-purple-500/30 text-foreground focus:border-cyan-400 focus:ring-cyan-400/20"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSaveDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProject}
                  variant="default"
                >
                  Save Project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <ProxySettings />

          <UserMenu onShowProjects={onShowProjects} />
        </div>
      </div>
    </header>
  );
};
