"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import { useState, type FormEvent } from "react";

type NewProjectDialogProps = {
  onNewProject: (name: string) => boolean;
  trigger?: React.ReactNode;
};

export default function NewProjectDialog({ onNewProject, trigger }: NewProjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [projectName, setProjectName] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (projectName.trim()) {
      const success = onNewProject(projectName.trim());
      if (success) {
        setProjectName("");
        setIsOpen(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
             <Button
              variant="ghost"
              className="w-full justify-start text-primary"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Project
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Give your new project a name. You can change this later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                Name
                </Label>
                <Input
                id="name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="col-span-3"
                placeholder="My Awesome Show"
                autoFocus
                />
            </div>
            </div>
            <DialogFooter>
            <Button type="submit">Create Project</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
