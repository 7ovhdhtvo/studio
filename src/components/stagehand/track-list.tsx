
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, MoreVertical, Trash2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import type { AudioFile } from '@/lib/storage-manager';
import { logger } from '@/lib/logger';

type TrackListProps = {
  tracks: AudioFile[];
  activeTrackId?: string | null;
  onSelectTrack: (track: AudioFile) => void;
  onDeleteTrack: (id: string) => void;
  onRenameTrack: (id: string, currentTitle: string) => void;
};

export default function TrackList({
  tracks,
  activeTrackId,
  onSelectTrack,
  onDeleteTrack,
  onRenameTrack,
}: TrackListProps) {

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {tracks.map((track) => (
          <div
            key={track.id}
            onClick={() => onSelectTrack(track)}
            className={cn(
              "flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-accent",
              activeTrackId === track.id && "bg-accent"
            )}
          >
            <div className="flex-1 overflow-hidden">
              <p className="font-medium truncate">{track.title}</p>
              <p className="text-sm text-muted-foreground truncate">
                {track.originalName}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    logger.log('TrackList: Rename action triggered.', { id: track.id, currentTitle: track.title });
                    onRenameTrack(track.id, track.title);
                }}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Rename</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    logger.log('TrackList: Delete action triggered.', { id: track.id });
                    onDeleteTrack(track.id)
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
