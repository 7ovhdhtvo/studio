
"use client";

import { cn } from '@/lib/utils';
import { type WaveformData } from '@/lib/waveform';
import { useRef, type MouseEvent, type RefObject, useState, Dispatch, SetStateAction, useMemo, useCallback } from 'react';
import TimeRuler from './time-ruler';
import type { AutomationPoint } from '@/lib/storage-manager';

const POINT_RADIUS = 6;
const HITBOX_RADIUS = 12;

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
  isAutomationActive: boolean;
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
  isAutomationActive,
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

  const getSvgCoords = (e: MouseEvent<SVGSVGElement>): {x: number, y: number} => {
    const svg = e.currentTarget as SVGSVGElement;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  };

  const timeToX = useCallback((time: number, width: number) => {
    if (durationInSeconds === 0) return 0;
    return (time / durationInSeconds) * width;
  }, [durationInSeconds]);

  const valueToY = useCallback((value: number, height: number) => {
    return height - (value / 100) * height;
  }, []);

  const getAutomationPath = useCallback((points: AutomationPoint[], baseline: number, width: number, height: number): string => {
      if (width === 0 || height === 0) return '';
      
      const sortedPoints = [...points].sort((a, b) => a.time - b.time);

      if (sortedPoints.length === 0) {
          const y = valueToY(baseline, height);
          return `M 0 ${y} L ${width} ${y}`;
      }

      // Start path from the value of the first point at time 0
      let d = `M 0 ${valueToY(sortedPoints[0].value, height)}`;

      sortedPoints.forEach(point => {
          d += ` L ${timeToX(point.time, width)} ${valueToY(point.value, height)}`;
      });
      
      // End path at the value of the last point at the end of the track
      const lastPoint = sortedPoints[sortedPoints.length - 1];
      d += ` L ${width} ${valueToY(lastPoint.value, height)}`;

      return d;
  }, [timeToX, valueToY]);
  
  const automationPath = useMemo(() => {
    if (!waveformInteractionRef.current || durationInSeconds === 0) return '';
    const { width, height } = waveformInteractionRef.current.getBoundingClientRect();
    return getAutomationPath(automationPoints, masterVolume, width, height);
  }, [automationPoints, masterVolume, durationInSeconds, getAutomationPath]);


  const handleInteraction = (e: MouseEvent<HTMLDivElement>) => {
    if (!waveformInteractionRef.current || draggingPointIdRef.current) return;
    const rect = waveformInteractionRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(100, (x / rect.width) * 100));
    onProgressChange(newProgress);
  };

  const handleScrubMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    // This function only handles scrubbing, not automation.
    if (showVolumeAutomation) return;
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
        draggingPointIdRef.current = null;
        onAutomationDragEnd();
    }
  };

  const handleSvgMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    if (!showVolumeAutomation) return;

    // Do not create a point if we clicked on an existing point's hitbox
    if ((e.target as SVGElement).dataset.pointId) return;

    const { width, height } = e.currentTarget.getBoundingClientRect();
    const { x, y } = getSvgCoords(e);
    
    const clickTime = (x / width) * durationInSeconds;
    const clickValue = 100 - (y / height) * 100;

    const newPoint: AutomationPoint = {
      id: `point_${Date.now()}`,
      time: Math.max(0, Math.min(durationInSeconds, clickTime)),
      value: Math.max(0, Math.min(100, clickValue)),
    };
    
    onAutomationPointsChange([...automationPoints, newPoint]);
    draggingPointIdRef.current = newPoint.id;
    onAutomationDragStart();
    setDebugState(`Created & Dragging ${newPoint.id}`);
  };

  const handleSvgMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (draggingPointIdRef.current && showVolumeAutomation) {
      const { width, height } = e.currentTarget.getBoundingClientRect();
      const { x, y } = getSvgCoords(e);

      const newTime = (x / width) * durationInSeconds;
      const newValue = 100 - (y / height) * 100;

      const updatedPoints = automationPoints.map(p =>
        p.id === draggingPointIdRef.current ? { 
            ...p, 
            time: Math.max(0, Math.min(durationInSeconds, newTime)), 
            value: Math.max(0, Math.min(100, newValue))
        } : p
      );
      onAutomationPointsChange(updatedPoints);
      setDebugState(`Dragging ${draggingPointIdRef.current}`);
    }
  };

  const handlePointMouseDown = (e: MouseEvent, pointId: string) => {
      e.stopPropagation(); // Prevent SvgMouseDown from firing and creating a new point
      if (!showVolumeAutomation) return;
      draggingPointIdRef.current = pointId;
      onAutomationDragStart();
      setDebugState(`Dragging ${pointId}`);
  }

  const currentTime = (progress / 100) * durationInSeconds;

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds - Math.floor(seconds)) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }

  const automationLineColor = showVolumeAutomation 
    ? 'hsl(var(--destructive))' 
    : '#3b82f6'; // Blue for 'active' mode

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
            className="absolute inset-0 z-0"
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
            
            {(showVolumeAutomation || isAutomationActive) && durationInSeconds > 0 && waveformInteractionRef.current && (
                <svg
                    width="100%"
                    height="100%"
                    className="absolute inset-0 z-10 overflow-visible"
                    onMouseDown={handleSvgMouseDown}
                    onMouseMove={handleSvgMouseMove}
                    onMouseUp={handleMouseUpAndLeave}
                    onMouseLeave={handleMouseUpAndLeave}
                >
                    <path
                        d={automationPath}
                        stroke={automationLineColor}
                        strokeWidth="2"
                        fill="none"
                        className="pointer-events-none"
                    />
                    {showVolumeAutomation && automationPoints.map(point => {
                        const { width, height } = waveformInteractionRef.current!.getBoundingClientRect();
                        const cx = timeToX(point.time, width);
                        const cy = valueToY(point.value, height);
                        return (
                            <g 
                              key={point.id}
                              className={cn(showVolumeAutomation && "cursor-grab active:cursor-grabbing")}
                              onMouseDown={(e) => handlePointMouseDown(e, point.id)}
                            >
                                <circle
                                    data-point-id={point.id}
                                    cx={cx}
                                    cy={cy}
                                    r={HITBOX_RADIUS}
                                    fill="transparent"
                                />
                                <circle
                                    cx={cx}
                                    cy={cy}
                                    r={POINT_RADIUS}
                                    fill={automationLineColor}
                                    className="pointer-events-none"
                                />
                                <circle
                                    cx={cx}
                                    cy={cy}
                                    r={POINT_RADIUS / 2}
                                    fill="hsl(var(--card))"
                                    className="pointer-events-none"
                                />
                            </g>
                        );
                    })}
                </svg>
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
      <div className="h-4 text-xs font-mono text-muted-foreground">{debugState}</div>
    </div>
  );

    
