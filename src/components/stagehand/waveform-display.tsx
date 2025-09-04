
"use client";

import { cn } from '@/lib/utils';
import { type WaveformData } from '@/lib/waveform';
import { useRef, type MouseEvent, type RefObject, useState, Dispatch, SetStateAction, useMemo, useCallback } from 'react';
import TimeRuler from './time-ruler';
import type { AutomationPoint, Marker } from '@/lib/storage-manager';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Flag } from 'lucide-react';

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
  markers: Marker[];
  showMarkers: boolean;
  onMarkersChange: (markers: Marker[]) => void;
  onMarkerDragEnd: () => void;
  debugState: string;
  setDebugState: Dispatch<SetStateAction<string>>;
  startDelay: number;
  onStartDelayChange: (delay: number) => void;
  applyDelayToLoop: boolean;
  onApplyDelayToLoopChange: (checked: boolean) => void;
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
  markers,
  showMarkers,
  onMarkersChange,
  onMarkerDragEnd,
  debugState,
  setDebugState,
  startDelay,
  onStartDelayChange,
  applyDelayToLoop,
  onApplyDelayToLoopChange
}: WaveformDisplayProps) {
  const waveformInteractionRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);
  const draggingPointIdRef = useRef<string | null>(null);
  const draggingMarkerIdRef = useRef<string | null>(null);

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

      let d = `M 0 ${valueToY(sortedPoints[0].value, height)}`;

      sortedPoints.forEach(point => {
          d += ` L ${timeToX(point.time, width)} ${valueToY(point.value, height)}`;
      });
      
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
    if (!waveformInteractionRef.current || draggingPointIdRef.current || draggingMarkerIdRef.current) return;
    const rect = waveformInteractionRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(100, (x / rect.width) * 100));
    onProgressChange(newProgress);
  };

  const handleScrubMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (showVolumeAutomation || showMarkers) return;
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
    if (draggingMarkerIdRef.current) {
        setDebugState('Ready');
        draggingMarkerIdRef.current = null;
        onMarkerDragEnd();
    }
  };

  const handleSvgMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).dataset.pointId || (e.target as SVGElement).dataset.markerId) return;

    const { width, height } = e.currentTarget.getBoundingClientRect();
    const { x } = getSvgCoords(e);
    const clickTime = (x / width) * durationInSeconds;

    if (showVolumeAutomation) {
      const { y } = getSvgCoords(e);
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
    } else if (showMarkers) {
        const newMarker: Marker = {
            id: `marker_${Date.now()}`,
            time: Math.max(0, Math.min(durationInSeconds, clickTime)),
            name: `Marker ${markers.length + 1}`,
        };
        onMarkersChange([...markers, newMarker]);
        draggingMarkerIdRef.current = newMarker.id;
        setDebugState(`Created & Dragging ${newMarker.id}`);
    }
  };

  const handleSvgMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    const { width, height } = e.currentTarget.getBoundingClientRect();
    const { x } = getSvgCoords(e);
    const newTime = (x / width) * durationInSeconds;

    if (draggingPointIdRef.current && showVolumeAutomation) {
      const { y } = getSvgCoords(e);
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
    } else if (draggingMarkerIdRef.current && showMarkers) {
        const updatedMarkers = markers.map(m =>
            m.id === draggingMarkerIdRef.current ? {
                ...m,
                time: Math.max(0, Math.min(durationInSeconds, newTime)),
            } : m
        );
        onMarkersChange(updatedMarkers);
        setDebugState(`Dragging Marker ${draggingMarkerIdRef.current}`);
    }
  };

  const handlePointMouseDown = (e: MouseEvent, pointId: string) => {
      e.stopPropagation();
      if (!showVolumeAutomation) return;
      draggingPointIdRef.current = pointId;
      onAutomationDragStart();
      setDebugState(`Dragging ${pointId}`);
  }

  const handleMarkerMouseDown = (e: MouseEvent, markerId: string) => {
    e.stopPropagation();
    if (!showMarkers) return;
    draggingMarkerIdRef.current = markerId;
    setDebugState(`Dragging Marker ${markerId}`);
  };

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
    : '#3b82f6';

  return (
    <div className="flex flex-col items-center space-y-2">
       <div className="flex w-full items-stretch gap-4">
        <div className="font-mono text-4xl font-bold text-center w-full bg-secondary text-secondary-foreground py-2 rounded-lg flex items-center justify-center">
            {formatTime(currentTime)}
        </div>
        <div className="flex flex-col items-center justify-between gap-1">
            <div className='flex flex-col items-center'>
                <Label htmlFor="start-delay" className="text-xs text-muted-foreground whitespace-nowrap">Start Delay (s)</Label>
                <Input
                    id="start-delay"
                    type="number"
                    value={startDelay}
                    onChange={(e) => onStartDelayChange(parseFloat(e.target.value) || 0)}
                    className="w-24 h-10 text-center text-lg font-mono"
                    min="0"
                    step="0.1"
                />
            </div>
             <div className="flex items-center space-x-2">
                <Checkbox 
                    id="apply-delay-loop" 
                    checked={applyDelayToLoop}
                    onCheckedChange={(checked) => onApplyDelayToLoopChange(Boolean(checked))}
                />
                <label
                    htmlFor="apply-delay-loop"
                    className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Apply to loop
                </label>
            </div>
        </div>
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
            
            {(showVolumeAutomation || isAutomationActive || showMarkers) && durationInSeconds > 0 && waveformInteractionRef.current && (
                <svg
                    width="100%"
                    height="100%"
                    className="absolute inset-0 z-10 overflow-visible"
                    onMouseDown={handleSvgMouseDown}
                    onMouseMove={handleSvgMouseMove}
                    onMouseUp={handleMouseUpAndLeave}
                    onMouseLeave={handleMouseUpAndLeave}
                >
                    {(showVolumeAutomation || isAutomationActive) && (
                      <path
                          d={automationPath}
                          stroke={automationLineColor}
                          strokeWidth="2"
                          fill="none"
                          className="pointer-events-none"
                      />
                    )}
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
                                <circle cx={cx} cy={cy} r={POINT_RADIUS} fill={automationLineColor} className="pointer-events-none" />
                                <circle cx={cx} cy={cy} r={POINT_RADIUS / 2} fill="hsl(var(--card))" className="pointer-events-none" />
                            </g>
                        );
                    })}
                     {showMarkers && markers.map(marker => {
                        const { width } = waveformInteractionRef.current!.getBoundingClientRect();
                        const x = timeToX(marker.time, width);
                        return (
                           <g 
                            key={marker.id} 
                            className={cn(showMarkers && "cursor-grab active:cursor-grabbing")}
                            onMouseDown={(e) => handleMarkerMouseDown(e, marker.id)}
                            transform={`translate(${x}, 0)`}
                           >
                              <line x1="0" y1="0" x2="0" y2="100%" stroke="hsl(var(--primary))" strokeWidth="2" />
                              <polygon points="-5,0 5,0 0,5" fill="hsl(var(--primary))" />
                              <Flag x="-18" y="5" className="w-4 h-4 text-primary fill-primary/20 pointer-events-none" />
                              <rect data-marker-id={marker.id} x="-12" y="0" width="24" height="100%" fill="transparent" />
                           </g>
                        );
                     })}
                </svg>
            )}
          </div>
          
          {durationInSeconds > 0 && (
            <div 
              className="absolute top-0 h-full w-0.5 bg-foreground/70 pointer-events-none z-20"
              style={{ left: `${progress}%` }}
            >
              <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 bg-foreground/70 rounded-full"></div>
            </div>
          )}
        </div>
        <TimeRuler duration={durationInSeconds} zoom={zoom} />
      </div>
      <div className="h-4 text-xs font-mono text-muted-foreground">{debugState}</div>
    </div>
  );
