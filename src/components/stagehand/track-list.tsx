
"use client";

import type { AudioTrack } from "@/lib/local-db";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Folder, Music, Trash2, Edit, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "../ui/scroll-area";


type TrackListProps = {
  tracks: AudioTrack[];
  activeTrackId?: number;
  onSelectTrack: (track: AudioTrack) => void;
  onDeleteTrack: (id: number) => void;
  onRenameTrack: (id: number, newTitle: string) => void;
};

export default function TrackList({ 
    tracks, 
    activeTrackId, 
    onSelectTrack, 
    onDeleteTrack,
    onRenameTrack 
}: TrackListProps) {

  const handleRename = (id: number, currentTitle: string) => {
    const newTitle = prompt("Enter new track title:", currentTitle);
    if (newTitle && newTitle.trim() !== "") {
        onRenameTrack(id, newTitle.trim());
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  return (
    <Collapsible className="mb-6 border rounded-lg">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full flex justify-start items-center p-4 space-x-2">
          <Folder className="w-5 h-5" />
          <span className="font-semibold">Track Library</span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ScrollArea className="h-64">
          <div className="p-2 space-y-1">
            {tracks.length > 0 ? (
              tracks.map((track) => (
                <div
                  key={track.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md cursor-pointer group",
                    activeTrackId === track.id
                      ? "bg-primary/20 text-primary-foreground"
                      : "hover:bg-accent"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1" onClick={() => onSelectTrack(track)}>
                    <Music className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-none truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.originalFilename}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{formatDuration(track.duration)}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleRename(track.id, track.title)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Rename</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeleteTrack(track.id)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center p-4">No tracks imported yet.</p>
            )}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  );
}

    