
"use client";

import { cn } from '@/lib/utils';
import { type WaveformData } from '@/lib/waveform';
import { useRef, type MouseEvent, type RefObject, useState } from 'react';
import TimeRuler from './time-ruler';
import type { AutomationPoint } from '@/lib/storage-manager';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Dot, Tooltip } from 'recharts';

const CustomDot = (props: any) => {
    const { cx, cy, stroke, payload, onMouseDown, onMouseUp, onDoubleClick } = props;

    if (!payload.isAutomationPoint) {
        return null;
    }
    
    const hitboxSize = 24;

    return (
        <g 
            transform={`translate(${cx}, ${cy})`}
            onMouseDown={(e) => { e.stopPropagation(); onMouseDown(payload); }}
            onMouseUp={(e) => { e.stopPropagation(); onMouseUp(); }}
            onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(payload); }}
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
  showMockup?: boolean;
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
  showMockup
}: WaveformDisplayProps) {
  const waveformInteractionRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);
  const draggingPointIdRef = useRef<string | null>(null);

  const getChartData = (points: AutomationPoint[], baseline: number) => {
    if (durationInSeconds === 0) return [];
    
    let data = [];
    if (points.length === 0) {
        data.push({ time: 0, value: baseline, isAutomationPoint: false });
        data.push({ time: durationInSeconds, value: baseline, isAutomationPoint: false });
    } else {
        const sortedPoints = [...points].sort((a, b) => a.time - b.time);
        
        if (sortedPoints[0].time > 0) {
            data.push({ time: 0, value: sortedPoints[0].value, isAutomationPoint: false });
        }
        
        sortedPoints.forEach(p => data.push({ ...p, isAutomationPoint: true }));
        
        const lastPoint = sortedPoints[sortedPoints.length - 1];
        if (lastPoint.time < durationInSeconds) {
            data.push({ time: durationInSeconds, value: lastPoint.value, isAutomationPoint: false });
        }
    }
    return data;
  };
  
  const chartData = getChartData(automationPoints, masterVolume);

  const handleInteraction = (e: MouseEvent<HTMLDivElement>) => {
    if (!waveformInteractionRef.current || draggingPointIdRef.current) return;
    const rect = waveformInteractionRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(100, (x / rect.width) * 100));
    onProgressChange(newProgress);
  };
  
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (showVolumeAutomation) {
      return;
    }
    isMouseDownRef.current = true;
    onScrubStart();
    handleInteraction(e);
  };
  
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isMouseDownRef.current && !showVolumeAutomation) {
      handleInteraction(e);
    }
  };
  
  const handleMouseUpAndLeave = () => {
    if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        onScrubEnd();
    }
    if (draggingPointIdRef.current) {
        draggingPointIdRef.current = null;
        onAutomationDragEnd();
    }
  };

  const handlePointMouseDown = (payload: any) => {
      if (!payload || !payload.id) return;
      onAutomationDragStart();
      draggingPointIdRef.current = payload.id;
  };

  const handlePointDoubleClick = (payload: any) => {
    if (payload && payload.id) {
        const newPoints = automationPoints.filter(p => p.id !== payload.id);
        onAutomationPointsChange(newPoints);
    }
  }
  
  const handleChartMouseMove = (e: any) => {
      const container = waveformInteractionRef.current;
      if (!container || !e?.activeCoordinate) return;
      
      if (draggingPointIdRef.current) {
          const rect = container.getBoundingClientRect();
          const { x, y } = e.activeCoordinate;
          const newTime = Math.max(0, Math.min(durationInSeconds, (x / rect.width) * durationInSeconds));
          const newValue = Math.max(0, Math.min(100, (1 - (y / rect.height)) * 100));
          
          const updatedPoints = automationPoints.map(p =>
            p.id === draggingPointIdRef.current ? { ...p, time: newTime, value: newValue } : p
          );
          onAutomationPointsChange(updatedPoints);
      }
  };

  const handleChartClick = (e: any) => {
    if (draggingPointIdRef.current || !showVolumeAutomation || !e?.activeCoordinate || !e?.activeLabel) {
        return;
    }
    
    // Prevent creating points if clicking on an existing one
    if (e.activePayload && e.activePayload.some((p: any) => p.payload.isAutomationPoint)) {
        return;
    }

    const { chartY, viewBox } = e;
    if (viewBox === undefined || chartY === undefined) return;

    const clickTime = e.activeLabel;
    const yValue = Math.max(0, Math.min(100, (1 - ((chartY - viewBox.y) / viewBox.height)) * 100));
    
    const newPoint: AutomationPoint = {
        id: `point_${Date.now()}`,
        time: clickTime,
        value: yValue,
        name: `${automationPoints.length + 1}`
    };
    const newPoints = [...automationPoints, newPoint].sort((a,b) => a.time - b.time);
    onAutomationPointsChange(newPoints);
    onAutomationDragEnd();
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
            
            <div className={cn("absolute inset-0", !showVolumeAutomation && "pointer-events-none")}>
                {(showVolumeAutomation || showMockup) && durationInSeconds > 0 && (
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                            onMouseMove={handleChartMouseMove}
                            onClick={handleChartClick}
                        >
                            <XAxis type="number" dataKey="time" domain={[0, durationInSeconds]} hide />
                            <YAxis type="number" dataKey="value" domain={[0, 100]} hide />
                            <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                            <Line 
                                type="linear" 
                                dataKey="value" 
                                stroke="hsl(var(--destructive))" 
                                strokeWidth={2}
                                dot={<CustomDot onMouseDown={handlePointMouseDown} onMouseUp={handleMouseUpAndLeave} onDoubleClick={handlePointDoubleClick} />}
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
