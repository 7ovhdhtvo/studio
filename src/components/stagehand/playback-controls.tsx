
"use client";

import type { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Pause, Play, Repeat, SkipBack } from 'lucide-react';
import { cn } from '@/lib/utils';

type PlaybackControlsProps = {
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  onBackToStart: () => void;
};

export default function PlaybackControls({ isPlaying, setIsPlaying, onBackToStart }: PlaybackControlsProps) {
  const togglePlay = () => setIsPlaying(!isPlaying);

  return (
    <div className="flex items-center justify-center gap-4">
      <Button
        variant="outline"
        size="icon"
        className="h-20 w-20 rounded-full bg-foreground/80 hover:bg-foreground shadow-lg transition-transform transform hover:scale-105"
        aria-label="Loop"
      >
        <Repeat className="h-10 w-10 text-background" />
      </Button>

      <Button
        size="icon"
        className={cn(
          "h-20 w-20 rounded-full shadow-lg transition-transform transform hover:scale-105",
          isPlaying ? "bg-primary/90 hover:bg-primary" : "bg-primary hover:bg-primary/90"
        )}
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className="h-10 w-10 fill-primary-foreground" />
        ) : (
          <Play className="h-10 w-10 fill-primary-foreground" />
        )}
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="h-20 w-20 rounded-full bg-foreground/80 hover:bg-foreground shadow-lg transition-transform transform hover:scale-105"
        onClick={onBackToStart}
        aria-label="Back to Start"
      >
        <SkipBack className="h-10 w-10 text-background fill-background" />
      </Button>
    </div>
  );
}
