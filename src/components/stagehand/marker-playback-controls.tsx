
"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { Flag, ListMusic, SkipBack, SkipForward } from 'lucide-react';
import type { Marker } from '@/lib/storage-manager';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

type MarkerSelectorProps = {
  markers: Marker[];
  selectedMarkerId: string | null;
  onSelectMarker: (markerId: string | null) => void;
};

const MarkerSelector = ({ markers, selectedMarkerId, onSelectMarker }: MarkerSelectorProps) => {
  const sortedMarkers = [...markers].sort((a, b) => a.time - b.time);
  const selectedMarker = markers.find(m => m.id === selectedMarkerId);
  const selectedMarkerName = selectedMarker?.name || (selectedMarker ? `Marker ${sortedMarkers.findIndex(m => m.id === selectedMarkerId) + 1}` : 'Track Start');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-64 h-20 text-lg font-semibold shadow-lg bg-card hover:bg-accent flex-col gap-1"
        >
          <span className="text-xs text-muted-foreground font-medium">START FROM</span>
          <span className="truncate">{selectedMarkerName}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <div className="p-2 border-b">
            <h4 className="font-medium leading-none">Select Start Marker</h4>
        </div>
        <ScrollArea className="h-48">
          <div className="p-1">
            <Button
                variant={!selectedMarkerId ? "secondary" : "ghost"}
                className="w-full justify-start h-auto py-2"
                onClick={() => onSelectMarker(null)}
            >
                <div className="flex flex-col items-start whitespace-normal text-left">
                    <span>Track Start</span>
                    <span className="text-xs text-muted-foreground">0.00s</span>
                </div>
            </Button>
            {sortedMarkers.map((marker, index) => {
              const isSelected = marker.id === selectedMarkerId;
              return (
                <Button
                  key={marker.id}
                  variant={isSelected ? "secondary" : "ghost"}
                  className="w-full justify-start h-auto py-2"
                  onClick={() => onSelectMarker(marker.id)}
                >
                  <div className="flex flex-col items-start whitespace-normal text-left">
                    <span>{marker.name || `Marker ${index + 1}`}</span>
                    <span className="text-xs text-muted-foreground">{marker.time.toFixed(2)}s</span>
                  </div>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};


type MarkerPlaybackControlsProps = {
  markers: Marker[];
  onJumpToPrevious: () => void;
  onJumpToNext: () => void;
  onSelectStartMarker: (markerId: string | null) => void;
  selectedStartMarkerId: string | null;
};

export default function MarkerPlaybackControls({
  markers,
  onJumpToPrevious,
  onJumpToNext,
  onSelectStartMarker,
  selectedStartMarkerId,
}: MarkerPlaybackControlsProps) {

  return (
    <div className="flex items-center justify-center gap-4 mt-4">
      <Button
        variant="outline"
        size="icon"
        className="h-20 w-20 rounded-full bg-foreground/80 hover:bg-foreground shadow-lg transition-transform transform hover:scale-105 text-background"
        onClick={onJumpToPrevious}
        aria-label="Jump to Previous Marker"
        disabled={markers.length === 0}
      >
        <div className="flex items-center justify-center">
            <Flag className="h-6 w-6" />
            <SkipBack className="h-10 w-10" />
        </div>
      </Button>

      <MarkerSelector 
        markers={markers}
        selectedMarkerId={selectedStartMarkerId}
        onSelectMarker={onSelectStartMarker}
      />

      <Button
        variant="outline"
        size="icon"
        className="h-20 w-20 rounded-full bg-foreground/80 hover:bg-foreground shadow-lg transition-transform transform hover:scale-105 text-background"
        onClick={onJumpToNext}
        aria-label="Jump to Next Marker"
        disabled={markers.length === 0}
      >
        <div className="flex items-center justify-center">
            <SkipForward className="h-10 w-10" />
            <Flag className="h-6 w-6" />
        </div>
      </Button>
    </div>
  );
}
