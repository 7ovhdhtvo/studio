
"use client";

import { Folder as FolderIcon, FolderPlus, Trash, Undo2, Briefcase, Plus, Import, Clapperboard, ChevronDown } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import type { AudioFile, Folder } from '@/lib/storage-manager';
import { useState, useMemo, type DragEvent, type MouseEvent, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import { Input } from '../ui/input';
import ImportDialog from './import-dialog';

const TRASH_FOLDER_ID = 'trash';

type TrackListProps = {
  tracks: AudioFile[];
  folders: Folder[];
  activeTrackId?: string | null;
  activeProjectId: string | null;
  onSelectTrack: (track: AudioFile) => void;
  onSelectProject: (projectId: string) => void;
  onDeleteTrack: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onRenameTrack: (id: string, newTitle: string) => void;
  onCreateFolder: () => Promise<void>;
  onCreateProject: () => Promise<void>;
  onRenameFolder: (id: string, newName: string) => Promise<void>;
  onMoveTrackToFolder: (trackId: string, folderId: string | null) => Promise<void>;
  onEmptyTrash: () => Promise<void>;
  onRecoverTrack: (id: string) => Promise<void>;
  onImportTrack: (file: File, folderId: string | null) => void;
};

const TrackItem = ({
  track,
  isActive,
  onSelectTrack,
  onRecoverTrack,
}: {
  track: AudioFile;
  isActive: boolean;
  onSelectTrack: (track: AudioFile) => void;
  onRecoverTrack: (id: string) => void;
}) => {
  const isTrashed = track.folderId === TRASH_FOLDER_ID;

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    if (isTrashed) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('trackId', track.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClick = () => {
    if (!isTrashed) {
      onSelectTrack(track);
    }
  };

  return (
    <div
      draggable={!isTrashed}
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={cn(
        "flex items-center justify-between p-2 rounded-md group",
        !isTrashed && "cursor-pointer hover:bg-accent",
        isActive && !isTrashed && "bg-accent",
        isTrashed && "opacity-70"
      )}
    >
      <div className="flex-1 overflow-hidden min-w-0">
        <p className="font-medium break-words">{track.title}</p>
        <p className="text-sm text-muted-foreground break-words">{track.originalName}</p>
      </div>
      
      {isTrashed && (
         <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); onRecoverTrack(track.id); }}
        >
            <Undo2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default function TrackList({
  tracks,
  folders,
  activeTrackId,
  activeProjectId,
  onSelectTrack,
  onSelectProject,
  onDeleteTrack,
  onDeleteFolder,
  onRenameTrack,
  onCreateFolder,
  onCreateProject,
  onRenameFolder,
  onMoveTrackToFolder,
  onEmptyTrash,
  onRecoverTrack,
  onImportTrack,
}: TrackListProps) {
  const [draggingOverFolder, setDraggingOverFolder] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importTargetFolder, setImportTargetFolder] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingFolderId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingFolderId]);
  
  const openImportDialog = (folderId: string | null) => {
    setImportTargetFolder(folderId);
    setIsImporting(true);
  };

  const handleStartEditingFolder = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const handleRenameFolder = () => {
    if (editingFolderId && editingFolderName.trim()) {
      onRenameFolder(editingFolderId, editingFolderName.trim());
    }
    setEditingFolderId(null);
    setEditingFolderName('');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRenameFolder();
    } else if (e.key === 'Escape') {
      setEditingFolderId(null);
      setEditingFolderName('');
    }
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>, folderId: string | null) => {
    e.preventDefault();
    setDraggingOverFolder(null);

    const trackId = e.dataTransfer.getData('trackId');
    const draggedFolderId = e.dataTransfer.getData('folderId');

    if (trackId) {
       if (folderId === TRASH_FOLDER_ID) {
        onDeleteTrack(trackId);
      } else {
        onMoveTrackToFolder(trackId, folderId);
      }
    } else if (draggedFolderId && folderId === TRASH_FOLDER_ID) {
        onDeleteFolder(draggedFolderId);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleEmptyTrashClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    logger.log('TrackList: Empty Trash button clicked.');
    onEmptyTrash();
  };

  const { rootTracks, projectMap, trashTracks } = useMemo(() => {
    const projectMap = new Map<string, { project: Folder; folders: Folder[]; tracks: AudioFile[] }>();
    const rootTracks: AudioFile[] = [];
    const trashTracks: AudioFile[] = [];
  
    const projects = folders.filter(f => f.isProject);
    projects.forEach(p => projectMap.set(p.id, { project: p, folders: [], tracks: [] }));

    const normalFolders = folders.filter(f => !f.isProject && f.id !== TRASH_FOLDER_ID);
    normalFolders.forEach(f => {
      if (f.parentId && projectMap.has(f.parentId)) {
        projectMap.get(f.parentId)!.folders.push(f);
      }
    });
    
    for (const track of tracks) {
      if (track.folderId === TRASH_FOLDER_ID) {
        trashTracks.push(track);
      } else if (track.folderId) {
        const folder = folders.find(f => f.id === track.folderId);
        if (folder?.parentId && projectMap.has(folder.parentId)) {
            projectMap.get(folder.parentId)!.tracks.push(track);
        } else if (folder?.isProject) {
            projectMap.get(folder.id)!.tracks.push(track);
        }
      } else {
        rootTracks.push(track);
      }
    }
    return { rootTracks, projectMap, trashTracks };
  }, [tracks, folders]);

  const projects = useMemo(() => {
    return Array.from(projectMap.values()).sort((a, b) => {
      if (a.project.id === activeProjectId) return -1;
      if (b.project.id === activeProjectId) return 1;
      return a.project.name.localeCompare(b.project.name);
    });
  }, [projectMap, activeProjectId]);

  return (
    <>
      <div className="p-2 border-b flex items-center gap-2">
        <Button variant="ghost" className="w-full justify-start" onClick={onCreateProject}>
          <Briefcase className="mr-2 h-4 w-4" />
          New Project
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={onCreateFolder} disabled={!activeProjectId}>
          <FolderPlus className="mr-2 h-4 w-4" />
          New Folder
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1 min-h-[50px]">
          {rootTracks.map((track) => (
            <TrackItem
              key={track.id}
              track={track}
              isActive={activeTrackId === track.id}
              onSelectTrack={onSelectTrack}
              onRecoverTrack={onRecoverTrack}
            />
          ))}
        </div>
        
        <div className="w-full px-2">
          {projects.map(({ project, folders: subFolders, tracks: projectTracks }) => {
            const isActiveProject = project.id === activeProjectId;
            const tracksInProjectFolders = projectTracks.filter(t => t.folderId && subFolders.some(f => f.id === t.folderId));
            const tracksDirectlyInProject = projectTracks.filter(t => t.folderId === project.id);
            return (
              <div key={project.id}
                className={cn("border rounded-md mb-2", isActiveProject ? "border-primary/50 bg-accent/50" : "border-border")}
              >
                 <div className="flex items-center group/trigger p-2 hover:bg-accent/50 rounded-md" onClick={() => onSelectProject(project.id)}>
                    <div className="flex items-center gap-1">
                      <Clapperboard className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left min-w-0 font-semibold text-base pl-2" onClick={(e) => {e.stopPropagation(); handleStartEditingFolder(project);}}>
                      {editingFolderId === project.id ? (
                        <Input ref={inputRef} type="text" value={editingFolderName} onChange={(e) => setEditingFolderName(e.target.value)} onBlur={handleRenameFolder} onKeyDown={handleInputKeyDown} className="h-8 text-base" onClick={(e) => e.stopPropagation()} />
                      ) : ( <span className="break-words min-w-0">{project.name}</span> )}
                    </div>
                 </div>
                {isActiveProject && (
                  <div className="pb-0 pl-2">
                    <div className="p-2">
                      <Button variant="outline" className="w-full" onClick={() => openImportDialog(project.id)}>
                        <Import className="mr-2 h-4 w-4" />
                        Import Tracks
                      </Button>
                    </div>
                    {tracksDirectlyInProject.map(track => (
                      <TrackItem key={track.id} track={track} isActive={activeTrackId === track.id} onSelectTrack={onSelectTrack} onRecoverTrack={onRecoverTrack} />
                    ))}
                    <Accordion type="multiple" className="w-full">
                      {subFolders.map(folder => (
                         <AccordionItem value={folder.id} key={folder.id} 
                          draggable onDragStart={(e) => {e.dataTransfer.setData('folderId', folder.id); e.dataTransfer.effectAllowed = 'move';}}
                          className={cn("border-none", draggingOverFolder === folder.id && 'bg-accent/50 rounded-md')}
                          onDrop={(e) => {e.stopPropagation(); handleDrop(e, folder.id);}}
                          onDragOver={handleDragOver}
                          onDragEnter={(e) => { e.stopPropagation(); setDraggingOverFolder(folder.id); }}
                          onDragLeave={(e) => { e.stopPropagation(); setDraggingOverFolder(null); }}
                         >
                           <div className="flex items-center group/trigger pr-2 hover:bg-accent/50 rounded-md">
                              <AccordionTrigger className="flex-initial p-2">
                                  <div className="flex items-center gap-1">
                                    <FolderIcon className="w-5 h-5" />
                                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                                  </div>
                              </AccordionTrigger>
                              <div className="flex-1 text-left min-w-0 pl-2" onClick={(e) => {e.preventDefault(); e.stopPropagation(); handleStartEditingFolder(folder);}}>
                                {editingFolderId === folder.id ? ( <Input ref={inputRef} type="text" value={editingFolderName} onChange={(e) => setEditingFolderName(e.target.value)} onBlur={handleRenameFolder} onKeyDown={handleInputKeyDown} className="h-8 text-base" onClick={(e) => e.stopPropagation()} /> ) : ( <span className="break-words min-w-0">{folder.name}</span> )}
                              </div>
                           </div>
                          <AccordionContent className="pb-0 pl-2">
                            <div className="border-l-2 ml-2 pl-4 space-y-1 min-h-[40px]">
                                {tracksInProjectFolders.filter(t => t.folderId === folder.id).map(track => (
                                    <TrackItem key={track.id} track={track} isActive={activeTrackId === track.id} onSelectTrack={onSelectTrack} onRecoverTrack={onRecoverTrack} />
                                ))}
                                {tracksInProjectFolders.filter(t => t.folderId === folder.id).length === 0 && (
                                    <p className="text-sm text-muted-foreground p-2">Drop tracks here</p>
                                )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <Accordion type="multiple" className="w-full px-2">
          <AccordionItem 
            value={TRASH_FOLDER_ID} 
            className="border-none"
            onDrop={(e) => handleDrop(e, TRASH_FOLDER_ID)}
            onDragOver={handleDragOver}
            onDragEnter={() => setDraggingOverFolder(TRASH_FOLDER_ID)}
            onDragLeave={() => setDraggingOverFolder(null)}
          >
            <AccordionTrigger className={cn("hover:no-underline font-semibold text-base py-2 px-2", draggingOverFolder === TRASH_FOLDER_ID && 'bg-destructive/20 rounded-md')}>
              <div className="flex items-center gap-2">
                <Trash className="w-5 h-5" />
                <span>Trash</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0 pl-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mb-2" 
                onClick={handleEmptyTrashClick} 
                disabled={trashTracks.length === 0}
              >
                Empty Trash
              </Button>
               <div className="border-l-2 ml-2 pl-4 space-y-1">
                {trashTracks.map(track => (
                    <TrackItem
                    key={track.id}
                    track={track}
                    isActive={activeTrackId === track.id}
                    onSelectTrack={onSelectTrack}
                    onRecoverTrack={onRecoverTrack}
                    />
                ))}
                {trashTracks.length === 0 && (
                    <p className="text-sm text-muted-foreground p-2">Trash is empty</p>
                )}
               </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollArea>
      {isImporting && (
          <ImportDialog
            onImportTrack={(file) => {
                onImportTrack(file, importTargetFolder);
                setIsImporting(false);
            }}
            isOpen={isImporting}
            onOpenChange={setIsImporting}
          />
      )}
    </>
  );
}
