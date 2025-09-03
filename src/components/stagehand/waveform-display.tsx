
"use client";

import { cn } from '@/lib/utils';
import { type WaveformData } from '@/lib/waveform';
import { useRef, type MouseEvent, type RefObject, useState, Dispatch, SetStateAction } from 'react';
import TimeRuler from './time-ruler';
import type { AutomationPoint } from '@/lib/storage-manager';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Dot, Tooltip } from 'recharts';

const CustomDot = (props: any) => {
    const { cx, cy, stroke, payload, onMouseDown, onMouseUp } = props;

    if (!payload.isAutomationPoint) {
        return null;
    }
    
    const hitboxSize = 24;

    return (
        <g 
            transform={`translate(${cx}, ${cy})`}
            onMouseDown={(e) => { 
                e.stopPropagation(); 
                onMouseDown(e, payload); 
            }}
            onMouseUp={(e) => { 
                e.stopPropagation(); 
                onMouseUp(e); 
            }}
            className="cursor-grab active:cursor-grabbing"
        >
            <rect 
                x={-hitboxSize / 2} 
                y={-hitboxSize / 2} 
                width={hitboxSize} 
                height={hitboxSize} 
                fill="transparent"
            />
            <circle r="6" fill={stroke} />
            <circle r="3" fill="hsl(var(--card))" />
        </g>
    );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const point = payload[0].payload;
    if (!point.isAutomationPoint) return null;
    return (
      <div className="bg-popover text-popover-foreground px-3 py-1.5 text-xs rounded-md border shadow-md">
        <p className="font-bold">{point.name || `Point`}</p>
        <p>Time: {point.time.toFixed(2)}s</p>
        <p>Volume: {Math.round(point.value)}%</p>
      </div>
    );
  }
  return null;
};


type WaveformDisplayProps = {
  waveformData: WaveformData | null;
  durationInSeconds: number;
  zoom: number;
  progress: number;
  onProgressChange: (newProgress: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
  showStereo: boolean;
  scrollContainerRef: RefObject<HTMLDivElement>;
  masterVolume: number;
  onMasterVolumeChange: (newVolume: number) => void;
  showVolumeAutomation: boolean;
  automationPoints: AutomationPoint[];
  onAutomationPointsChange: (points: AutomationPoint[]) => void;
  onAutomationDragStart: () => void;
  onAutomationDragEnd: () => void;
  debugState: string;
  setDebugState: Dispatch<SetStateAction<string>>;
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
  durationInSeconds,
  zoom,
  progress,
  onProgressChange,
  onScrubStart,
  onScrubEnd,
  showStereo,
  scrollContainerRef,
  masterVolume,
  onMasterVolumeChange,
  showVolumeAutomation, 
  automationPoints,
  onAutomationPointsChange,
  onAutomationDragStart,
  onAutomationDragEnd,
  debugState,
  setDebugState,
}: WaveformDisplayProps) {
  const waveformInteractionRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);
  const draggingPointIdRef = useRef<string | null>(null);

  const getChartData = (points: AutomationPoint[], baseline: number, duration: number) => {
    if (duration === 0) return [];
    
    const sortedPoints = [...points].sort((a, b) => a.time - b.time);

    if (sortedPoints.length === 0) {
      return [
        { time: 0, value: baseline, isAutomationPoint: false },
        { time: duration, value: baseline, isAutomationPoint: false },
      ];
    }
    
    const data: any[] = sortedPoints.map(p => ({ ...p, isAutomationPoint: true }));

    if (sortedPoints[0].time > 0.01) { // Add a small tolerance
        const firstPointValue = sortedPoints[0].value;
        data.unshift({ time: 0, value: firstPointValue, isAutomationPoint: false });
    }
    
    const lastPoint = sortedPoints[sortedPoints.length - 1];
    if (lastPoint.time < duration - 0.01) { // Add a small tolerance
        const lastPointValue = lastPoint.value;
        data.push({ time: duration, value: lastPointValue, isAutomationPoint: false });
    }
    
    return data;
  };
  
  const chartData = getChartData(automationPoints, masterVolume, durationInSeconds);

  const handleInteraction = (e: MouseEvent<HTMLDivElement>) => {
    if (!waveformInteractionRef.current || draggingPointIdRef.current) return;
    const rect = waveformInteractionRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(100, (x / rect.width) * 100));
    onProgressChange(newProgress);
  };
  
  const handleScrubMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    isMouseDownRef.current = true;
    onScrubStart();
    handleInteraction(e);
  };
  
  const handleScrubMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isMouseDownRef.current) {
      handleInteraction(e);
    }
  };
  
  const handleMouseUpAndLeave = () => {
    if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        onScrubEnd();
    }
    if (draggingPointIdRef.current) {
        setDebugState('Ready');
        onAutomationDragEnd();
        draggingPointIdRef.current = null;
    }
  };

  const handlePointMouseDown = (e: MouseEvent, payload: any) => {
      if (!payload || !payload.id) {
        return;
      }
      setDebugState(`Dragging point ${payload.id}`);
      onAutomationDragStart();
      draggingPointIdRef.current = payload.id;
  };

  
  const handleChartMouseMove = (e: any) => {
      if (!draggingPointIdRef.current || !e?.activeCoordinate) {
          return;
      }
      const container = waveformInteractionRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      
      const newTime = Math.max(0, Math.min(durationInSeconds, (e.activeCoordinate.x / rect.width) * durationInSeconds));
      const newValue = Math.max(0, Math.min(100, (1 - (e.activeCoordinate.y / rect.height)) * 100));
      
      const updatedPoints = automationPoints.map(p =>
        p.id === draggingPointIdRef.current ? { ...p, time: newTime, value: newValue } : p
      );
      onAutomationPointsChange(updatedPoints);
  };

  const handleChartClick = (e: any) => {
    if (draggingPointIdRef.current) {
      return;
    }
    if (e && e.activeDot) {
      return;
    }
    
    const container = waveformInteractionRef.current;
    if (!e || !e.activeCoordinate || !container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const clickTime = (e.activeCoordinate.x / rect.width) * durationInSeconds;
    const clickValue = Math.max(0, Math.min(100, (1 - (e.activeCoordinate.y / rect.height)) * 100));
    
    const newPoint: AutomationPoint = {
        id: `point_${Date.now()}`,
        time: clickTime,
        value: clickValue,
        name: `${automationPoints.length + 1}`
    };

    setDebugState(`Creating new point at ${clickTime.toFixed(2)}s`);
    const newPoints = [...automationPoints, newPoint].sort((a,b) => a.time - b.time);
    onAutomationPointsChange(newPoints);
    onAutomationDragEnd(); // Persist immediately
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
            className={cn(
              "absolute inset-0 z-0",
              showVolumeAutomation ? "pointer-events-none" : "pointer-events-auto"
            )}
            onMouseDown={handleScrubMouseDown}
            onMouseMove={handleScrubMouseMove}
            onMouseUp={handleMouseUpAndLeave}
            onMouseLeave={handleMouseUpAndLeave}
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
          </div>
            
          <div className={cn(
            "absolute inset-0 z-10",
            showVolumeAutomation ? "pointer-events-auto" : "pointer-events-none"
          )}>
              {showVolumeAutomation && durationInSeconds > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                          data={chartData}
                          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                          onMouseMove={handleChartMouseMove}
                          onClick={handleChartClick}
                          onMouseUp={handleMouseUpAndLeave}
                          onMouseLeave={handleMouseUpAndLeave}
                      >
                          <XAxis type="number" dataKey="time" domain={[0, durationInSeconds]} hide />
                          <YAxis type="number" dataKey="value" domain={[0, 100]} hide />
                          <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                          <Line 
                              type="linear" 
                              dataKey="value" 
                              stroke="hsl(var(--destructive))" 
                              strokeWidth={2}
                              dot={<CustomDot onMouseDown={handlePointMouseDown} onMouseUp={handleMouseUpAndLeave} />}
                              isAnimationActive={false}
                          />
                      </LineChart>
                  </ResponsiveContainer>
              )}
          </div>

          <div 
            className="absolute top-0 h-full w-0.5 bg-foreground/70 pointer-events-none z-20"
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
