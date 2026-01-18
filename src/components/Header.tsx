
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, FileText, Settings } from "lucide-react";
import UserMenu from "./UserMenu";
import ProxySettings from "./ProxySettings";
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
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">RVJ</h1>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-white">RVJ</h1>
          <div className="text-slate-400">
            <FileText className="w-4 h-4 inline mr-2" />
            {currentProjectName}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            onClick={handleQuickSave}
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>

          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => setProjectName(currentProjectName)}
              >
                Save As
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Save Project</DialogTitle>
                <DialogDescription className="text-slate-300">
                  Enter a name for your project
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name" className="text-slate-300">Project Name</Label>
                  <Input
                    id="project-name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSaveDialogOpen(false)}
                  className="border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProject}
                  className="bg-purple-600 hover:bg-purple-700"
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
