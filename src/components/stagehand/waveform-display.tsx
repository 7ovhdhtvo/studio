
"use client";

import { cn } from '@/lib/utils';
import { type WaveformData } from '@/lib/waveform';
import { useRef, type MouseEvent, type RefObject, useState, Dispatch, SetStateAction, useMemo, useCallback, TouchEvent, useEffect } from 'react';
import TimeRuler from './time-ruler';
import type { AutomationPoint, Marker } from '@/lib/storage-manager';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Flag } from 'lucide-react';

const POINT_RADIUS = 6;
const HITBOX_RADIUS = 12;

const MARKER_COLORS = [
    '#d946ef', // fuchsia-500
    '#f59e0b', // amber-500
    '#3b82f6', // blue-500
    '#eab308', // yellow-500
];

const getMarkerColor = (markerId: string) => {
    // Simple hash function to get a consistent color index
    let hash = 0;
    for (let i = 0; i < markerId.length; i++) {
        hash = markerId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % MARKER_COLORS.length);
    return MARKER_COLORS[index];
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
  isAutomationActive: boolean;
  showVolumeAutomation: boolean;
  automationPoints: AutomationPoint[];
  onAutomationPointsChange: (points: AutomationPoint[]) => void;
  onAutomationDragStart: () => void;
  onAutomationDragEnd: () => void;
  markers: Marker[];
  showMarkers: boolean;
  isMarkerModeActive: boolean;
  onMarkersChange: (markers: Marker[]) => void;
  onMarkerDragStart: (markerId: string) => void;
  onMarkerDragEnd: (newTime: number) => void;
  onEnterMarkerEditMode: (markerId: string) => void;
  editingMarkerId: string | null;
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
  isMarkerModeActive,
  onMarkersChange,
  onMarkerDragStart,
  onMarkerDragEnd,
  onEnterMarkerEditMode,
  editingMarkerId,
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

  const getSvgCoords = (e: MouseEvent<SVGSVGElement> | TouchEvent<SVGSVGElement>): {x: number, y: number} => {
    const svg = e.currentTarget as SVGSVGElement;
    const pt = svg.createSVGPoint();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    pt.x = clientX;
    pt.y = clientY;
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
  
  const handleEndDrag = (e: MouseEvent<SVGSVGElement> | TouchEvent<SVGSVGElement>) => {
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
        const draggedMarker = markers.find(m => m.id === draggingMarkerIdRef.current);
        draggingMarkerIdRef.current = null;
        if (draggedMarker) {
            onMarkerDragEnd(draggedMarker.time);
        }
    }
  };

  const handleSvgInteractionStart = (e: MouseEvent<SVGSVGElement> | TouchEvent<SVGSVGElement>) => {
      if (editingMarkerId || (e.target as SVGElement).dataset.pointId || (e.target as SVGElement).dataset.markerId) return;
      e.preventDefault();

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
              isPlaybackStart: false,
          };
          onMarkersChange([...markers, newMarker]);
          setDebugState(`Created Marker ${newMarker.id}`);
      }
  };

  const handleSvgInteractionMove = (e: MouseEvent<SVGSVGElement> | TouchEvent<SVGSVGElement>) => {
      if (!draggingPointIdRef.current && !draggingMarkerIdRef.current) return;
      e.preventDefault();

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
      }
  };

  const handlePointInteractionStart = (e: MouseEvent | TouchEvent, pointId: string) => {
      e.stopPropagation();
      if (!showVolumeAutomation) return;
      draggingPointIdRef.current = pointId;
      onAutomationDragStart();
      setDebugState(`Dragging ${pointId}`);
  }

  const handleMarkerInteractionStart = (e: MouseEvent | TouchEvent, markerId: string) => {
    e.stopPropagation();
    if (!showMarkers) return;
    
    if (editingMarkerId === markerId) {
        // Already in edit mode, start dragging
        draggingMarkerIdRef.current = markerId;
        onMarkerDragStart(markerId);
    } else {
        // Enter edit mode
        onEnterMarkerEditMode(markerId);
    }
  };

  const sortedMarkers = useMemo(() => [...markers].sort((a, b) => a.time - b.time), [markers]);
  const startMarker = useMemo(() => markers.find(m => m.isPlaybackStart), [markers]);

  const currentTime = (progress / 100) * durationInSeconds;
  
  useEffect(() => {
    if (editingMarkerId && scrollContainerRef.current) {
        const marker = markers.find(m => m.id === editingMarkerId);
        if (marker) {
            const scrollContainer = scrollContainerRef.current;
            const totalWidth = scrollContainer.scrollWidth;
            const markerPosition = (marker.time / durationInSeconds) * totalWidth;
            const visibleWidth = scrollContainer.clientWidth;
            const newScrollLeft = markerPosition - visibleWidth / 2;
            scrollContainer.scrollLeft = Math.max(0, newScrollLeft);
        }
    }
  }, [editingMarkerId, markers, durationInSeconds, zoom, scrollContainerRef]);


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
    
  const isAnyMarkerModeOn = showMarkers || isMarkerModeActive;

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
                    step="1"
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
          className="relative h-48 bg-card rounded-lg pt-6 shadow-inner"
          style={{ width: `${100 * zoom}%` }}
        >
          <div 
            ref={waveformInteractionRef}
            className="absolute inset-0 top-6 bottom-0 z-0"
            onMouseDown={handleScrubMouseDown}
            onMouseMove={handleScrubMouseMove}
            onMouseUp={handleEndDrag}
            onMouseLeave={(e) => handleEndDrag(e as any)}
            onTouchStart={(e) => {
              if (showVolumeAutomation || showMarkers) return;
              isMouseDownRef.current = true;
              onScrubStart();
            }}
            onTouchMove={(e) => {
              if (!isMouseDownRef.current) return;
              const rect = waveformInteractionRef.current!.getBoundingClientRect();
              const x = e.touches[0].clientX - rect.left;
              const newProgress = Math.max(0, Math.min(100, (x / rect.width) * 100));
              onProgressChange(newProgress);
            }}
            onTouchEnd={handleEndDrag}
            onTouchCancel={handleEndDrag}
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
            
            {(showVolumeAutomation || isAutomationActive || isAnyMarkerModeOn) && durationInSeconds > 0 && waveformInteractionRef.current && (
                <svg
                    width="100%"
                    height="100%"
                    className="absolute inset-0 top-0 bottom-0 z-10 overflow-visible"
                    onMouseDown={handleSvgInteractionStart}
                    onMouseMove={handleSvgInteractionMove}
                    onMouseUp={handleEndDrag}
                    onMouseLeave={handleEndDrag}
                    onTouchStart={handleSvgInteractionStart}
                    onTouchMove={handleSvgInteractionMove}
                    onTouchEnd={handleEndDrag}
                    onTouchCancel={handleEndDrag}
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
                              onMouseDown={(e) => handlePointInteractionStart(e, point.id)}
                              onTouchStart={(e) => handlePointInteractionStart(e, point.id)}
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
                     {isAnyMarkerModeOn && sortedMarkers.map((marker, index) => {
                        const { width, height } = waveformInteractionRef.current!.getBoundingClientRect();
                        const x = timeToX(marker.time, width);
                        
                        let color: string;
                        if ((startMarker && startMarker.id === marker.id) || (!startMarker && index === 0)) {
                           color = 'hsl(var(--destructive))';
                        } else {
                            color = getMarkerColor(marker.id);
                        }

                        const markerName = marker.name || `Marker ${index + 1}`;
                        const isEditing = editingMarkerId === marker.id;

                        return (
                           <g 
                            key={marker.id} 
                            transform={`translate(${x}, 0)`}
                            className={cn(isEditing && 'opacity-50')}
                           >
                              <line x1="0" y1="20" y2="100%" stroke={color} strokeWidth="2" />
                              <polygon points="-5,20 5,20 0,25" fill={color} />
                              
                              <text x="0" y="15" fill={color} textAnchor="middle" className="text-xs font-semibold pointer-events-none select-none">
                                {markerName}
                              </text>
                             
                              <g 
                                className={cn(showMarkers && "cursor-grab active:cursor-grabbing")}
                                onMouseDown={(e) => handleMarkerInteractionStart(e, marker.id)}
                                onTouchStart={(e) => handleMarkerInteractionStart(e, marker.id)}
                              >
                                <rect data-marker-id={marker.id} x="-12" y={height - 32} width="24" height="32" fill="transparent" />
                                <Flag x="-8" y={height - 24} className="w-4 h-4" style={{ color }} fillOpacity={0.2} />
                              </g>
                           </g>
                        );
                     })}
                </svg>
            )}
          </div>
          
          {durationInSeconds > 0 && (
            <div 
              className={cn(
                  "absolute top-0 h-full w-0.5 bg-foreground/70 pointer-events-none z-20",
                  editingMarkerId && "opacity-50"
              )}
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
}
