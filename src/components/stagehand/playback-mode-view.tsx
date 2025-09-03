
"use client";

import { X, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnalogKnob from './analog-knob';

type PlaybackModeViewProps = {
  isPlaying: boolean;
  onTogglePlay: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onExit: () => void;
  trackTitle: string;
  trackArtist: string;
};

export default function PlaybackModeView({
  isPlaying,
  onTogglePlay,
  volume,
  onVolumeChange,
  onExit,
  trackTitle,
  trackArtist
}: PlaybackModeViewProps) {
  const isMuted = volume === 0;

  const toggleMute = () => {
    onVolumeChange(isMuted ? 75 : 0);
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-8">
      <Button
        variant="ghost"
        size="icon"
        onClick={onExit}
        className="absolute top-6 right-6"
      >
        <X className="w-8 h-8" />
      </Button>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">{trackTitle}</h1>
        <p className="text-xl text-muted-foreground mt-2">{trackArtist}</p>
      </div>

      <div className="flex items-center justify-center gap-16">
        <Button
          variant={isMuted ? "destructive" : "outline"}
          size="icon"
          className="w-24 h-24 rounded-full"
          onClick={toggleMute}
        >
          {isMuted ? <VolumeX className="w-12 h-12" /> : <Volume2 className="w-12 h-12" />}
        </Button>

        <Button
          size="icon"
          className="h-32 w-32 rounded-full shadow-lg"
          onClick={onTogglePlay}
        >
          {isPlaying ? (
            <Pause className="h-16 w-16 fill-primary-foreground" />
          ) : (
            <Play className="h-16 w-16 fill-primary-foreground" />
          )}
        </Button>

        <AnalogKnob
          value={volume}
          onChange={onVolumeChange}
          size={120}
        />
      </div>
    </div>
  );
}
