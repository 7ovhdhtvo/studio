
"use client"

import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Flag } from 'lucide-react';
import type { Marker } from '@/lib/storage-manager';
import { cn } from '@/lib/utils';

const SkipToFlagIcon = ({ direction = 'left' }: { direction?: 'left' | 'right' }) => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
    className={cn("h-10 w-10", direction === 'right' && 'transform scale-x-[-1]')}
  >
    <path d="M18 16.5V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 9H13.2C13.2 9 12.6 9 12.6 9.6C12.6 10.2 13.2 10.2 13.2 10.2H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 17.5L12 12L5 6.5V17.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="currentColor"/>
  </svg>
);

type MarkerSelectorProps = {
  markers: Marker[];
  selectedMarkerId: string | null;
  onSelectMarker: (markerId: string) => void;
};

const MarkerSelector = ({ markers, selectedMarkerId, onSelectMarker }: MarkerSelectorProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedMarkerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selectedMarkerRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const element = selectedMarkerRef.current;
      const offsetTop = element.offsetTop;
      const elementHeight = element.offsetHeight;
      const containerHeight = container.offsetHeight;
      container.scrollTop = offsetTop - (containerHeight / 2) + (elementHeight / 2);
    }
  }, [selectedMarkerId]);
  
  const sortedMarkers = [...markers].sort((a,b) => a.time - b.time);

  return (
    <div className="relative w-64 h-20 bg-foreground/80 rounded-lg shadow-lg flex flex-col items-center justify-center text-background overflow-hidden">
       <div ref={scrollContainerRef} className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar py-8">
            <div className="flex flex-col items-center justify-start gap-1">
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full h-8 text-lg font-semibold snap-center transition-all duration-200 text-muted-foreground/50 hover:text-background",
                        !selectedMarkerId && "text-background scale-110"
                    )}
                    onClick={() => onSelectMarker('')}
                >
                    Track Start
                </Button>
                {sortedMarkers.map((marker, index) => {
                    const isSelected = marker.id === selectedMarkerId;
                    return (
                        <Button
                            key={marker.id}
                            ref={isSelected ? selectedMarkerRef : null}
                            variant="ghost"
                            className={cn(
                                "w-full h-8 text-lg font-semibold snap-center transition-all duration-200 text-muted-foreground/50 hover:text-background",
                                isSelected && "text-background scale-110"
                            )}
                            onClick={() => onSelectMarker(marker.id)}
                        >
                            {marker.name || `Marker ${index + 1}`}
                        </Button>
                    );
                })}
            </div>
       </div>
       <div className="absolute inset-0 w-full h-full pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-foreground to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-foreground to-transparent"></div>
            <div className="absolute top-1/2 left-4 right-4 h-px -translate-y-1/2 bg-primary/50"></div>
       </div>
    </div>
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

  const handleSelect = (markerId: string) => {
    onSelectStartMarker(markerId === '' ? null : markerId);
  }

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
        <SkipToFlagIcon direction="left" />
      </Button>

      <MarkerSelector 
        markers={markers}
        selectedMarkerId={selectedStartMarkerId}
        onSelectMarker={handleSelect}
      />

      <Button
        variant="outline"
        size="icon"
        className="h-20 w-20 rounded-full bg-foreground/80 hover:bg-foreground shadow-lg transition-transform transform hover:scale-105 text-background"
        onClick={onJumpToNext}
        aria-label="Jump to Next Marker"
        disabled={markers.length === 0}
      >
        <SkipToFlagIcon direction="right" />
      </Button>
    </div>
  );
}
