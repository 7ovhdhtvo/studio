
"use client";

import { Folder as FolderIcon, FolderPlus, Trash, Undo2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import type { AudioFile, Folder } from '@/lib/storage-manager';
import { useState, useMemo, type DragEvent, type MouseEvent, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import { Input } from '../ui/input';

const TRASH_FOLDER_ID = 'trash';

type TrackListProps = {
  tracks: AudioFile[];
  folders: Folder[];
  activeTrackId?: string | null;
  onSelectTrack: (track: AudioFile) => void;
  onDeleteTrack: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onRenameTrack: (id: string, newTitle: string) => void;
  onCreateFolder: () => Promise<void>;
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
  onSelectTrack,
  onDeleteTrack,
  onDeleteFolder,
  onRenameTrack,
  onCreateFolder,
  onRenameFolder,
  onMoveTrackToFolder,
  onEmptyTrash,
  onRecoverTrack,
  onImportTrack,
}: TrackListProps) {
  const [draggingOverFolder, setDraggingOverFolder] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingFolderId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingFolderId]);

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

  const { rootTracks, folderTracks, trashTracks } = useMemo(() => {
    const rootTracks: AudioFile[] = [];
    const trashTracks: AudioFile[] = [];
    const folderTracks: Map<string, AudioFile[]> = new Map();

    for (const track of tracks) {
      if (track.folderId === TRASH_FOLDER_ID) {
        trashTracks.push(track);
      } else if (track.folderId) {
        const tracksInFolder = folderTracks.get(track.folderId) || [];
        tracksInFolder.push(track);
        folderTracks.set(track.folderId, tracksInFolder);
      } else {
        rootTracks.push(track);
      }
    }
    return { rootTracks, folderTracks, trashTracks };
  }, [tracks]);
  
  const userFolders = folders.filter(f => f.id !== TRASH_FOLDER_ID);

  return (
    <>
      <div className="p-2 border-b">
        <Button variant="ghost" className="w-full justify-start" onClick={onCreateFolder}>
          <FolderPlus className="mr-2 h-4 w-4" />
          New Folder
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div 
          className={cn("p-2 space-y-1 min-h-[50px]", draggingOverFolder === 'root' && 'bg-accent/50 rounded-md')}
          onDrop={(e) => handleDrop(e, null)}
          onDragOver={handleDragOver}
          onDragEnter={() => setDraggingOverFolder('root')}
          onDragLeave={() => setDraggingOverFolder(null)}
        >
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
        
        <Accordion type="multiple" className="w-full px-2">
          {userFolders.map(folder => {
            const isDraggableFolder = folder.id !== TRASH_FOLDER_ID;
            return (
              <AccordionItem value={folder.id} key={folder.id} 
                draggable={isDraggableFolder}
                onDragStart={(e) => {
                  if (isDraggableFolder) {
                    e.dataTransfer.setData('folderId', folder.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }
                }}
                className={cn("border-none", draggingOverFolder === folder.id && 'bg-accent/50 rounded-md')}
                onDrop={(e) => {e.stopPropagation(); handleDrop(e, folder.id);}}
                onDragOver={handleDragOver}
                onDragEnter={(e) => { e.stopPropagation(); setDraggingOverFolder(folder.id); }}
                onDragLeave={(e) => { e.stopPropagation(); setDraggingOverFolder(null); }}
              >
                 <div className="flex items-center group/trigger pr-2 hover:bg-accent/50 rounded-md">
                    <AccordionTrigger className="hover:no-underline font-semibold text-base py-2 px-2 flex-1">
                        <div className="flex items-center gap-2 w-full">
                          <FolderIcon className="w-5 h-5" />
                          <div 
                            className="flex-1 text-left min-w-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStartEditingFolder(folder);
                            }}
                          >
                            {editingFolderId === folder.id ? (
                              <Input
                                ref={inputRef}
                                type="text"
                                value={editingFolderName}
                                onChange={(e) => setEditingFolderName(e.target.value)}
                                onBlur={handleRenameFolder}
                                onKeyDown={handleInputKeyDown}
                                className="h-8 text-base"
                                onClick={(e) => e.stopPropagation()} // Prevent accordion toggle
                              />
                            ) : (
                              <span className="break-words">{folder.name}</span>
                            )}
                          </div>
                        </div>
                    </AccordionTrigger>
                 </div>
                <AccordionContent className="pb-0 pl-2">
                  <div className="border-l-2 ml-2 pl-4 space-y-1 min-h-[40px]">
                      {(folderTracks.get(folder.id) || []).map(track => (
                          <TrackItem
                          key={track.id}
                          track={track}
                          isActive={activeTrackId === track.id}
                          onSelectTrack={onSelectTrack}
                          onRecoverTrack={onRecoverTrack}
                          />
                      ))}
                      {(folderTracks.get(folder.id) || []).length === 0 && (
                          <p className="text-sm text-muted-foreground p-2">Drop tracks here</p>
                      )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
          
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
    </>
  );
}
