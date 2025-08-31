"use client";

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Folder as FolderIcon, Music, ChevronDown, ChevronsUpDown, PlusCircle, MoreHorizontal, Edit, Copy, Trash2, FolderPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import ImportDialog from './import-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

export type Track = {
  type: 'track';
  id: number;
  title: string;
  originalFilename: string;
  artist: string;
  duration: string;
};

export type Folder = {
  type: 'folder';
  id: number;
  name: string;
  children: TrackItem[];
};

export type TrackItem = Track | Folder;

type TrackListProps = {
  isOpen: boolean;
  onToggle: () => void;
  projects: string[];
  currentProject: string;
  onSelectProject: (project: string) => void;
  onNewProject: () => void;
  onAddFolder: () => void;
  onImportTrack: (file: File) => void;
  tracks: TrackItem[];
  selectedTrack: Track | null;
  onSelectTrack: (track: Track) => void;
};

const ProjectSelector = ({ projects, currentProject, onSelectProject, onNewProject }: Pick<TrackListProps, 'projects' | 'currentProject' | 'onSelectProject' | 'onNewProject'>) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="w-full justify-between"
        >
          {currentProject || "Select project..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
         <div className="p-1">
            {projects.map(project => (
              <Button
                key={project}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  onSelectProject(project);
                  setIsOpen(false);
                }}
              >
                {project}
              </Button>
            ))}
         </div>
         <div className="p-1 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start text-primary"
              onClick={() => {
                onNewProject();
                setIsOpen(false);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Project
            </Button>
         </div>
      </PopoverContent>
    </Popover>
  )
}

const TrackActions = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto shrink-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Track actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Edit className="mr-2 h-4 w-4" />
          <span>Rename</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Copy className="mr-2 h-4 w-4" />
          <span>Copy</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


const TrackNode = ({ item, selectedTrack, onSelectTrack, level = 0 }: { item: TrackItem, selectedTrack: Track | null, onSelectTrack: (track: Track) => void, level?: number }) => {
  if (item.type === 'folder') {
    return (
      <Collapsible defaultOpen>
        <div 
            className="flex items-center w-full text-left text-sm font-semibold py-1.5 hover:bg-accent rounded-md px-2 group"
            style={{ paddingLeft: `${12 + level * 16}px` }}
        >
            <CollapsibleTrigger asChild>
                <button className="flex items-center flex-1 text-left">
                    <ChevronDown className="h-4 w-4 mr-3 shrink-0 transition-transform duration-200 data-[state=open]:rotate-0 data-[state=closed]:-rotate-90"/>
                    <FolderIcon className="mr-3 h-4 w-4 flex-shrink-0" />
                    <span>{item.name}</span>
                </button>
            </CollapsibleTrigger>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <TrackActions />
            </div>
        </div>
        <CollapsibleContent className="py-1">
          {item.children.map(child => (
            <TrackNode key={child.id} item={child} selectedTrack={selectedTrack} onSelectTrack={onSelectTrack} level={level + 1} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  // item.type === 'track'
  return (
    <div
      className={cn(
        "flex items-center w-full justify-start h-auto py-1.5 px-2 rounded-md group",
        selectedTrack?.id === item.id ? "bg-accent" : "hover:bg-accent"
      )}
      style={{ paddingLeft: `${12 + level * 16}px` }}
    >
      <Button
        variant="ghost"
        className="flex-1 justify-start h-auto p-0 bg-transparent hover:bg-transparent"
        onClick={() => onSelectTrack(item)}
      >
        <Music className="mr-3 h-4 w-4 flex-shrink-0" />
        <div className="flex flex-col truncate text-left">
          <span className="font-medium leading-tight">{item.title}</span>
          <span className="text-xs text-muted-foreground">{item.originalFilename} - {item.duration}</span>
        </div>
      </Button>
       <div className="opacity-0 group-hover:opacity-100 transition-opacity">
         <TrackActions />
       </div>
    </div>
  )
}

export default function TrackList(props: TrackListProps) {
  const { tracks, selectedTrack, onSelectTrack, isOpen, onToggle, onAddFolder, onImportTrack } = props;

  return (
    <aside className={cn(
      "flex flex-col border-r bg-secondary/50 transition-all duration-300 ease-in-out relative",
      isOpen ? "w-80" : "w-0"
    )}>
      <div className={cn(
        "absolute top-1/2 -right-4 z-10 transition-opacity",
        !isOpen && "right-[-38px]"
      )}>
        <Button size="icon" variant="outline" onClick={onToggle} className="rounded-full h-8 w-8">
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>

      <div className={cn("flex flex-col h-full transition-opacity duration-100", isOpen ? "opacity-100" : "opacity-0 invisible")}>
        <div className="p-4 space-y-4">
          <ProjectSelector {...props} />
          <div className="flex gap-2">
              <ImportDialog onImportTrack={onImportTrack} />
              <Button variant="outline" onClick={onAddFolder} className="w-full">
                <FolderPlus className="mr-2 h-4 w-4" />
                Add Folder
              </Button>
          </div>
        </div>
        <ScrollArea className="flex-1 pr-2">
          <nav className="p-2 space-y-1">
            {tracks.map((item) => (
              <TrackNode key={item.id} item={item} selectedTrack={selectedTrack} onSelectTrack={onSelectTrack} />
            ))}
          </nav>
        </ScrollArea>
        <div className="p-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Stagehand v1.0.0
          </p>
        </div>
      </div>
    </aside>
  );
}
