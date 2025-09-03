
"use client";

import { cn } from '@/lib/utils';
import { type WaveformData } from '@/lib/waveform';
import { useRef, type MouseEvent, type RefObject, useCallback, useState, useEffect } from 'react';
import TimeRuler from './time-ruler';
import type { AutomationPoint } from '@/lib/storage-manager';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Dot, Tooltip } from 'recharts';

const CustomDot = (props: any) => {
    const { cx, cy, stroke, payload, onMouseDown, onMouseUp } = props;

    if (!payload.isAutomationPoint) {
        return null;
    }

    const hitboxSize = 16;

    return (
        <g 
            transform={`translate(${cx}, ${cy})`}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            className="cursor-grab active:cursor-grabbing"
        >
            <rect 
                x={-hitboxSize / 2} 
                y={-hitboxSize / 2} 
                width={hitboxSize} 
                height={hitboxSize} 
                fill="transparent"
            />
            <circle r="5" fill={stroke} stroke="hsl(var(--card))" strokeWidth={2} />
        </g>
    );
};


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
  showMockupCurve: boolean;
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
  showMockupCurve,
}: WaveformDisplayProps) {
  const waveformInteractionRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);

  const getChartData = (points: AutomationPoint[], baseline: number) => {
    if (durationInSeconds === 0) return [];
    
    let data = [];
    if (points.length === 0) {
        data.push({ time: 0, value: baseline, isAutomationPoint: false });
        data.push({ time: durationInSeconds, value: baseline, isAutomationPoint: false });
    } else {
        const sortedPoints = [...points].sort((a, b) => a.time - b.time);
        
        // Start from beginning of track
        if (sortedPoints[0].time > 0) {
            data.push({ time: 0, value: sortedPoints[0].value, isAutomationPoint: false });
        }
        
        sortedPoints.forEach(p => data.push({ ...p, isAutomationPoint: true }));
        
        // End at end of track
        const lastPoint = sortedPoints[sortedPoints.length - 1];
        if (lastPoint.time < durationInSeconds) {
            data.push({ time: durationInSeconds, value: lastPoint.value, isAutomationPoint: false });
        }
    }
    return data;
  };
  
  const chartData = getChartData(automationPoints, masterVolume);

  const handleInteraction = (e: MouseEvent<HTMLDivElement>) => {
    if (!waveformInteractionRef.current || draggingPointId) return;
    const rect = waveformInteractionRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(100, (x / rect.width) * 100));
    onProgressChange(newProgress);
  };
  
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    isMouseDownRef.current = true;
    onScrubStart();
    handleInteraction(e);
  };
  
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isMouseDownRef.current && !draggingPointId) {
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

  const handlePointMouseDown = (point: any) => {
      onAutomationDragStart();
      setDraggingPointId(point.id);
  };

  const handlePointMouseUp = () => {
      onAutomationDragEnd();
      setDraggingPointId(null);
  };
  
  const handleChartMouseMove = (e: any) => {
      if (draggingPointId && e?.activeCoordinate) {
          const { x, y } = e.activeCoordinate;
          const container = waveformInteractionRef.current;
          if (!container) return;
          
          const rect = container.getBoundingClientRect();
          const newTime = Math.max(0, Math.min(durationInSeconds, (x / rect.width) * durationInSeconds));
          const newValue = Math.max(0, Math.min(100, (1 - (y / rect.height)) * 100));
          
          const updatedPoints = automationPoints.map(p =>
            p.id === draggingPointId ? { ...p, time: newTime, value: newValue } : p
          );
          onAutomationPointsChange(updatedPoints);
      }
  };

  const handleChartClick = (e: any) => {
    if (draggingPointId || !e?.activeCoordinate) return;

    // Prevent adding point if clicking near an existing dot
    if (e.activePayload && e.activePayload.length > 0) {
        const clickTime = e.activeLabel;
        const clickValue = e.activePayload[0].value;
        const chartY = e.chartY;
        
        const yValue = Math.max(0, Math.min(100, (1 - ((chartY - e.chartY_offset) / e.height)) * 100));

        const proximityThreshold = durationInSeconds * 0.01;
        const isNearExisting = automationPoints.some(p => Math.abs(p.time - clickTime) < proximityThreshold);
        if (isNearExisting) return;

        const newPoint: AutomationPoint = {
            id: `point_${Date.now()}`,
            time: clickTime,
            value: yValue,
            name: `${automationPoints.length + 1}`
        };
        const newPoints = [...automationPoints, newPoint].sort((a,b) => a.time - b.time);
        onAutomationPointsChange(newPoints);
        onAutomationDragEnd();
    }
  };


  const currentTime = (progress / 100) * durationInSeconds;

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
          className="relative h-48 bg-card rounded-lg p-2 shadow-inner"
          style={{ width: `${100 * zoom}%` }}
        >
          <div 
            ref={waveformInteractionRef}
            className="w-full h-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {waveformData ? (
              <div className="w-full h-full flex flex-col justify-center items-center pointer-events-none">
                  <ChannelWaveform data={waveformData.left} progress={progress} isStereo={showStereo} />
                  {showStereo && <div className="w-full h-[1px] bg-border my-1" />}
                  {showStereo && <ChannelWaveform data={waveformData.right} progress={progress} isStereo={showStereo} />}
              </div>
            ) : (
               <div className="w-full h-full flex justify-center items-center text-muted-foreground pointer-events-none">
                  {durationInSeconds > 0 ? "Generating waveform..." : "No audio loaded"}
               </div>
            )}
            
            <div className="absolute inset-0">
                {showVolumeAutomation && durationInSeconds > 0 && (
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                            onMouseMove={handleChartMouseMove}
                            onMouseUp={handlePointMouseUp}
                            onClick={handleChartClick}
                        >
                            <XAxis type="number" dataKey="time" domain={[0, durationInSeconds]} hide />
                            <YAxis type="number" dataKey="value" domain={[0, 100]} hide />
                            <Line 
                                type="linear" 
                                dataKey="value" 
                                stroke="hsl(var(--destructive))" 
                                strokeWidth={2}
                                dot={<CustomDot onMouseDown={handlePointMouseDown} onMouseUp={handlePointMouseUp} />}
                                activeDot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div 
              className="absolute top-0 h-full w-0.5 bg-foreground/70 pointer-events-none"
              style={{ left: `${progress}%` }}
            >
              <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 bg-foreground/70 rounded-full"></div>
            </div>
          </div>
        </div>
        <TimeRuler duration={durationInSeconds} zoom={zoom} />
      </div>
    </div>
  );
}
