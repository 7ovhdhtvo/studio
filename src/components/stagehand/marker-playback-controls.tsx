
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Flag, SkipBack, SkipForward, Play } from 'lucide-react';
import type { Marker } from '@/lib/storage-manager';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type StaticOption = {
  id: string;
  name: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type MarkerSelectorProps = {
  markers: Marker[];
  selectedMarkerId: string | null;
  onSelectMarker: (markerId: string | null) => void;
  isPopoverOpen: boolean;
  onPopoverOpenChange: (isOpen: boolean) => void;
  label: string;
  defaultOptionLabel: string;
  showDefaultOption: boolean;
  staticOptions?: StaticOption[];
};

const MarkerSelector = ({ 
  markers, 
  selectedMarkerId, 
  onSelectMarker, 
  isPopoverOpen, 
  onPopoverOpenChange,
  label,
  defaultOptionLabel,
  showDefaultOption,
  staticOptions = [],
}: MarkerSelectorProps) => {
  const sortedMarkers = [...markers].sort((a, b) => a.time - b.time);
  
  const getSelectedItemName = () => {
    const staticOption = staticOptions.find(o => o.id === selectedMarkerId);
    if (staticOption) return staticOption.name;
    
    const selectedMarker = markers.find(m => m.id === selectedMarkerId);
    if (selectedMarker) {
      return selectedMarker.name || `Marker ${sortedMarkers.findIndex(m => m.id === selectedMarkerId) + 1}`;
    }
    
    return defaultOptionLabel;
  };

  const selectedItemName = getSelectedItemName();

  const handleSelect = (markerId: string | null) => {
    onSelectMarker(markerId);
    onPopoverOpenChange(false); // Close popover on selection
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={onPopoverOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-64 h-20 text-lg font-semibold shadow-lg bg-card hover:bg-accent flex-col gap-1"
        >
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          <span className="truncate">{selectedItemName}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <div className="p-2 border-b">
            <h4 className="font-medium leading-none">Select Marker</h4>
        </div>
        <ScrollArea className="h-48">
          <div className="p-1">
            {staticOptions.map(option => (
              <Button
                  key={option.id}
                  variant={option.id === selectedMarkerId ? "secondary" : "ghost"}
                  className="w-full justify-start h-auto py-2"
                  onClick={() => handleSelect(option.id)}
              >
                  <div className="flex flex-col items-start whitespace-normal text-left">
                      <span>{option.name}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
              </Button>
            ))}
            {showDefaultOption && (
              <Button
                  variant={!selectedMarkerId ? "secondary" : "ghost"}
                  className="w-full justify-start h-auto py-2"
                  onClick={() => handleSelect(null)}
              >
                  <div className="flex flex-col items-start whitespace-normal text-left">
                      <span>{defaultOptionLabel}</span>
                      <span className="text-xs text-muted-foreground">{defaultOptionLabel === 'Track Start' ? '0.00s' : 'End of Track'}</span>
                  </div>
              </Button>
            )}
            {sortedMarkers.map((marker, index) => {
              const isSelected = marker.id === selectedMarkerId;
              return (
                <Button
                  key={marker.id}
                  variant={isSelected ? "secondary" : "ghost"}
                  className="w-full justify-start h-auto py-2"
                  onClick={() => handleSelect(marker.id)}
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
  onSelectEndMarker: (markerId: string | null) => void;
  selectedEndMarkerId: string | null;
  isLoopActive: boolean;
};

export default function MarkerPlaybackControls({
  markers,
  onJumpToPrevious,
  onJumpToNext,
  onSelectStartMarker,
  selectedStartMarkerId,
  onSelectEndMarker,
  selectedEndMarkerId,
  isLoopActive,
}: MarkerPlaybackControlsProps) {
  const [isStartPopoverOpen, setIsStartPopoverOpen] = useState(false);
  const [isEndPopoverOpen, setIsEndPopoverOpen] = useState(false);

  const startStaticOptions: StaticOption[] = [
    { id: 'playhead', name: 'Playhead', description: 'Current position' },
  ];

  return (
    <div className="flex flex-col items-center gap-4 mt-4">
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="h-20 w-20 rounded-full bg-foreground/80 hover:bg-foreground shadow-lg transition-transform transform hover:scale-105 text-background"
          onClick={onJumpToPrevious}
          aria-label="Jump to Previous Marker"
          disabled={markers.length === 0}
        >
          <div className="flex items-center justify-center gap-1">
              <Flag className="h-6 w-6" />
              <SkipBack className="h-10 w-10" />
          </div>
        </Button>

        <MarkerSelector 
          markers={markers}
          selectedMarkerId={selectedStartMarkerId}
          onSelectMarker={onSelectStartMarker}
          isPopoverOpen={isStartPopoverOpen}
          onPopoverOpenChange={setIsStartPopoverOpen}
          label="START FROM"
          defaultOptionLabel="Track Start"
          showDefaultOption={true}
          staticOptions={startStaticOptions}
        />

        <Button
          variant="outline"
          size="icon"
          className="h-20 w-20 rounded-full bg-foreground/80 hover:bg-foreground shadow-lg transition-transform transform hover:scale-105 text-background"
          onClick={onJumpToNext}
          aria-label="Jump to Next Marker"
          disabled={markers.length === 0}
        >
          <div className="flex items-center justify-center gap-1">
              <SkipForward className="h-10 w-10" />
              <Flag className="h-6 w-6" />
          </div>
        </Button>
      </div>

      <div className={cn(
        "transition-all duration-300 ease-in-out transform",
        isLoopActive ? "max-h-40 opacity-100 scale-100 mt-4" : "max-h-0 opacity-0 scale-95"
      )}>
        {isLoopActive && (
           <MarkerSelector 
              markers={markers}
              selectedMarkerId={selectedEndMarkerId}
              onSelectMarker={onSelectEndMarker}
              isPopoverOpen={isEndPopoverOpen}
              onPopoverOpenChange={setIsEndPopoverOpen}
              label="END AT / LOOP TO"
              defaultOptionLabel="Track End"
              showDefaultOption={true}
            />
        )}
      </div>
    </div>
  );
}
