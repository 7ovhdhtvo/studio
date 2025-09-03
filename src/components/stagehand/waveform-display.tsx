
"use client";

import { cn } from '@/lib/utils';
import { type WaveformData } from '@/lib/waveform';
import { useRef, type MouseEvent, type RefObject } from 'react';
import TimeRuler from './time-ruler';
import AutomationCurve from './automation-curve';
import type { AutomationPoint } from '@/lib/storage-manager';

type WaveformDisplayProps = {
  waveformData: WaveformData | null;
  speedPoints: AutomationPoint[];
  onSpeedPointsChange: (points: AutomationPoint[]) => void;
  showVolumeAutomation: boolean;
  showSpeedAutomation: boolean;
  durationInSeconds: number;
  zoom: number;
  progress: number;
  onProgressChange: (newProgress: number) => void;
  isPlaying: boolean;
  onScrubStart: () => void;
  onScrubEnd: () => void;
  showStereo: boolean;
  scrollContainerRef: RefObject<HTMLDivElement>;
  masterVolume: number;
  automationPoints: AutomationPoint[];
  onAutomationPointsChange: (points: AutomationPoint[]) => void;
  onAutomationDragStart: () => void;
  onAutomationDragEnd: () => void;
};

const ChannelWaveform = ({ data, progress, isStereo }: { data: number[], progress: number, isStereo: boolean }) => {
  return (
    <div className={cn(
        "w-full flex items-center gap-[1px]",
        isStereo ? "h-1/2" : "h-full"
    )}>
      {data.map((height, index) => (
        <div
          key={index}
          className={cn(
            "w-full rounded-sm transition-colors duration-200 pointer-events-none",
            (index / data.length * 100) < progress ? "bg-primary" : "bg-primary/20"
          )}
          style={{ height: `${height * 100}%` }}
        />
      ))}
    </div>
  );
};

export default function WaveformDisplay({ 
  waveformData,
  speedPoints,
  onSpeedPointsChange,
  showVolumeAutomation, 
  showSpeedAutomation,
  durationInSeconds,
  zoom,
  progress,
  onProgressChange,
  isPlaying,
  onScrubStart,
  onScrubEnd,
  showStereo,
  scrollContainerRef,
  masterVolume,
  automationPoints,
  onAutomationPointsChange,
  onAutomationDragStart,
  onAutomationDragEnd,
}: WaveformDisplayProps) {
  const waveformInteractionRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);

  const handleInteraction = (e: MouseEvent<HTMLDivElement>) => {
    if (!waveformInteractionRef.current) return;
    const rect = waveformInteractionRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(100, (x / rect.width) * 100));
    onProgressChange(newProgress);
  };
  
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    // Prevent scrub when interacting with automation curve
    if ((e.target as HTMLElement).closest('[data-automation-element]')) {
        return;
    }
    isMouseDownRef.current = true;
    onScrubStart();
    handleInteraction(e);
  };
  
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isMouseDownRef.current) {
      handleInteraction(e);
    }
  };
  
  const handleMouseUp = () => {
    if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        onScrubEnd();
    }
  };
  
  const handleMouseLeave = () => {
    if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        onScrubEnd();
    }
  };

  const currentTime = (progress / 100) * durationInSeconds;
  const waveformHeight = 192; // Corresponds to h-48 in tailwind

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds - Math.floor(seconds)) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }
  
  return (
    <div className="flex flex-col items-center space-y-2">
       <div className="font-mono text-4xl font-bold text-center w-full bg-secondary text-secondary-foreground py-2 rounded-lg">
          {formatTime(currentTime)}
       </div>
       <div 
         ref={scrollContainerRef}
         className="w-full overflow-x-auto"
       >
        <div 
          ref={waveformInteractionRef}
          className="relative h-48 bg-card rounded-lg p-2 shadow-inner"
          style={{ width: `${100 * zoom}%` }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {waveformData ? (
            <div className="w-full h-full flex flex-col justify-center items-center">
                <ChannelWaveform data={waveformData.left} progress={progress} isStereo={showStereo} />
                {showStereo && <div className="w-full h-[1px] bg-border my-1" />}
                {showStereo && <ChannelWaveform data={waveformData.right} progress={progress} isStereo={showStereo} />}
            </div>
          ) : (
             <div className="w-full h-full flex justify-center items-center text-muted-foreground">
                {durationInSeconds > 0 ? "Generating waveform..." : "No audio loaded"}
             </div>
          )}
          
          <AutomationCurve 
              duration={durationInSeconds}
              color="hsl(var(--destructive))"
              visible={showVolumeAutomation}
              maxHeight={waveformHeight}
              points={automationPoints}
              onPointsChange={onAutomationPointsChange}
              onDragStart={onAutomationDragStart}
              onDragEnd={onAutomationDragEnd}
              baselineValue={masterVolume}
          />
          {/* Speed Automation Curve would go here */}

          <div 
            className="absolute top-0 h-full w-0.5 bg-foreground/70 pointer-events-none"
            style={{ left: `${progress}%` }}
          >
            <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 bg-foreground/70 rounded-full"></div>
          </div>
        </div>
        <TimeRuler duration={durationInSeconds} zoom={zoom} />
      </div>
    </div>
  );
}
