"use client";

import type { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Pause, Play, Repeat, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

type PlaybackControlsProps = {
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
};

export default function PlaybackControls({ isPlaying, setIsPlaying }: PlaybackControlsProps) {
  const togglePlay = () => setIsPlaying(!isPlaying);

  return (
    <div className="flex items-center justify-center gap-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 text-muted-foreground hover:text-foreground"
              aria-label="Loop"
            >
              <Repeat className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Loop</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

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
        variant="destructive"
        size="icon"
        className="h-20 w-20 rounded-full bg-foreground/80 hover:bg-foreground shadow-lg transition-transform transform hover:scale-105"
        onClick={() => setIsPlaying(false)}
        aria-label="Stop"
      >
        <StopCircle className="h-10 w-10 fill-background" />
      </Button>
    </div>
  );
}
