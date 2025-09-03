
"use client";

import { X, Pause, Play, Volume2, VolumeX, SkipBack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VolumeFader from './volume-fader';
import { cn } from '@/lib/utils';

type PlaybackModeViewProps = {
  isPlaying: boolean;
  onTogglePlay: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onExit: () => void;
  trackTitle: string;
  trackArtist: string;
  onBackToStart: () => void;
  currentTime: number;
  duration: number;
};

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds - Math.floor(seconds)) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
};

export default function PlaybackModeView({
  isPlaying,
  onTogglePlay,
  volume,
  onVolumeChange,
  onExit,
  trackTitle,
  trackArtist,
  onBackToStart,
  currentTime,
  duration,
}: PlaybackModeViewProps) {
  const isMuted = volume === 0;

  const toggleMute = () => {
    onVolumeChange(isMuted ? 75 : 0);
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onExit}
        className="absolute top-4 right-4"
      >
        <X className="w-8 h-8" />
      </Button>

      <div className="w-full max-w-xs mx-auto flex flex-col items-center gap-8">
        <div className="text-center w-full">
            <p className="text-lg font-mono tracking-wider bg-secondary text-secondary-foreground rounded-md py-2">
                {formatTime(currentTime)} / {formatTime(duration)}
            </p>
            <h1 className="text-2xl font-bold tracking-tight mt-4 truncate">{trackTitle}</h1>
            <p className="text-md text-muted-foreground mt-1 truncate">{trackArtist}</p>
        </div>

        <div className="flex w-full justify-center items-stretch gap-8">
            <VolumeFader value={volume} onChange={onVolumeChange} />
            
            <div className="flex flex-col items-center justify-between gap-4">
                <Button
                    size="icon"
                    className="h-24 w-24 rounded-full shadow-lg"
                    onClick={onTogglePlay}
                    aria-label={isPlaying ? "Pause" : "Play"}
                >
                    {isPlaying ? (
                    <Pause className="h-12 w-12 fill-primary-foreground" />
                    ) : (
                    <Play className="h-12 w-12 fill-primary-foreground" />
                    )}
                </Button>

                <Button
                    variant={isMuted ? "destructive" : "outline"}
                    size="icon"
                    className="w-16 h-16 rounded-full"
                    onClick={toggleMute}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? <VolumeX className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />}
                </Button>

                <Button
                    variant="outline"
                    size="icon"
                    className="w-16 h-16 rounded-full"
                    onClick={onBackToStart}
                    aria-label="Back to Start"
                >
                    <SkipBack className="w-8 h-8" />
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
