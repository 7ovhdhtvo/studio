"use client";

import type { Track } from '@/app/page';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Music } from 'lucide-react';
import ImportDialog from './import-dialog';

type TrackListProps = {
  tracks: Track[];
  selectedTrack: Track | null;
  onSelectTrack: (track: Track) => void;
};

export default function TrackList({ tracks, selectedTrack, onSelectTrack }: TrackListProps) {
  return (
    <aside className="w-80 hidden md:flex flex-col border-r bg-secondary/50">
      <div className="p-4">
        <ImportDialog />
      </div>
      <ScrollArea className="flex-1">
        <nav className="p-4 space-y-1">
          {tracks.map((track) => (
            <Button
              key={track.id}
              variant="ghost"
              className={cn(
                "w-full justify-start h-auto py-2 px-3 text-left",
                selectedTrack?.id === track.id && "bg-accent"
              )}
              onClick={() => onSelectTrack(track)}
            >
              <Music className="mr-3 h-4 w-4 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="font-medium">{track.title}</span>
                <span className="text-xs text-muted-foreground">{track.artist} - {track.duration}</span>
              </div>
            </Button>
          ))}
        </nav>
      </ScrollArea>
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Stagehand v1.0.0
        </p>
      </div>
    </aside>
  );
}
