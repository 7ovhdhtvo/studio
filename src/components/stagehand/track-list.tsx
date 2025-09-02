
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, MoreVertical, Trash2, Folder as FolderIcon, FolderPlus, Trash, CornerDownRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import type { AudioFile, Folder } from '@/lib/storage-manager';
import { logger } from '@/lib/logger';
import { useState, useMemo, type DragEvent } from 'react';
import RenameDialog from './rename-dialog';

const TRASH_FOLDER_ID = 'trash';

type TrackListProps = {
  tracks: AudioFile[];
  folders: Folder[];
  activeTrackId?: string | null;
  onSelectTrack: (track: AudioFile) => void;
  onDeleteTrack: (id: string) => void;
  onRenameTrack: (id: string, newTitle: string) => void;
  onCreateFolder: () => Promise<void>;
  onRenameFolder: (id: string, newName: string) => Promise<void>;
  onMoveTrackToFolder: (trackId: string, folderId: string | null) => Promise<void>;
  onEmptyTrash: () => Promise<void>;
};

const TrackItem = ({
  track,
  isActive,
  onSelectTrack,
  setRenamingTrack,
  onDeleteTrack,
}: {
  track: AudioFile;
  isActive: boolean;
  onSelectTrack: (track: AudioFile) => void;
  setRenamingTrack: (track: AudioFile) => void;
  onDeleteTrack: (id: string) => void;
}) => {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('trackId', track.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelectTrack(track)}
      className={cn(
        "flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-accent group",
        isActive && "bg-accent"
      )}
    >
      <div className="flex-1 overflow-hidden">
        <p className="font-medium truncate">{track.title}</p>
        <p className="text-sm text-muted-foreground truncate">{track.originalName}</p>
      </div>
      {track.folderId !== TRASH_FOLDER_ID && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              setRenamingTrack(track);
            }}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              onDeleteTrack(track.id);
            }} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Move to Trash</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
  onRenameTrack,
  onCreateFolder,
  onRenameFolder,
  onMoveTrackToFolder,
  onEmptyTrash,
}: TrackListProps) {
  const [renamingTrack, setRenamingTrack] = useState<AudioFile | null>(null);
  const [draggingOverFolder, setDraggingOverFolder] = useState<string | null>(null);

  const handleRenameSave = (id: string, newTitle: string) => {
    onRenameTrack(id, newTitle);
    setRenamingTrack(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, folderId: string | null) => {
    e.preventDefault();
    const trackId = e.dataTransfer.getData('trackId');
    if (trackId) {
      onMoveTrackToFolder(trackId, folderId);
    }
    setDraggingOverFolder(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
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
          className={cn("p-2 space-y-1", draggingOverFolder === 'root' && 'bg-accent/50 rounded-md')}
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
              setRenamingTrack={setRenamingTrack}
              onDeleteTrack={onDeleteTrack}
            />
          ))}
        </div>
        
        <Accordion type="multiple" className="w-full px-2">
          {userFolders.map(folder => (
            <AccordionItem value={folder.id} key={folder.id} 
              className={cn("border-none", draggingOverFolder === folder.id && 'bg-accent/50 rounded-md')}
              onDrop={(e) => {e.stopPropagation(); handleDrop(e, folder.id);}}
              onDragOver={handleDragOver}
              onDragEnter={(e) => { e.stopPropagation(); setDraggingOverFolder(folder.id); }}
              onDragLeave={(e) => { e.stopPropagation(); setDraggingOverFolder(null); }}
            >
              <AccordionTrigger className="hover:no-underline font-semibold text-base py-2 px-2">
                <div className="flex items-center gap-2">
                  <FolderIcon className="w-5 h-5" />
                  <span>{folder.name}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-0 pl-2">
                 <div className="border-l-2 ml-2 pl-4 space-y-1">
                    {(folderTracks.get(folder.id) || []).map(track => (
                        <TrackItem
                        key={track.id}
                        track={track}
                        isActive={activeTrackId === track.id}
                        onSelectTrack={onSelectTrack}
                        setRenamingTrack={setRenamingTrack}
                        onDeleteTrack={onDeleteTrack}
                        />
                    ))}
                    {(folderTracks.get(folder.id) || []).length === 0 && (
                        <p className="text-sm text-muted-foreground p-2">Drop tracks here</p>
                    )}
                 </div>
              </AccordionContent>
            </AccordionItem>
          ))}
          
          <AccordionItem value={TRASH_FOLDER_ID} className="border-none">
            <AccordionTrigger className="hover:no-underline font-semibold text-base py-2 px-2">
              <div className="flex items-center gap-2">
                <Trash className="w-5 h-5" />
                <span>Trash</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0 pl-2">
              <Button variant="outline" size="sm" className="w-full mb-2" onClick={onEmptyTrash} disabled={trashTracks.length === 0}>
                Empty Trash
              </Button>
               <div className="border-l-2 ml-2 pl-4 space-y-1">
                {trashTracks.map(track => (
                    <TrackItem
                    key={track.id}
                    track={track}
                    isActive={activeTrackId === track.id}
                    onSelectTrack={onSelectTrack}
                    setRenamingTrack={setRenamingTrack}
                    onDeleteTrack={onDeleteTrack}
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
      <RenameDialog 
        track={renamingTrack}
        onSave={handleRenameSave}
        onClose={() => setRenamingTrack(null)}
      />
    </>
  );
}
