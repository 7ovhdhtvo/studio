
"use client";

import React, { useState, useRef, useEffect, type MouseEvent } from 'react';
import { type AutomationPoint } from '@/lib/storage-manager';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Trash2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

type AutomationCurveProps = {
  points: AutomationPoint[];
  onPointsChange: (points: AutomationPoint[]) => void;
  duration: number;
  color: string;
  visible: boolean;
  maxHeight: number; // The height of the container in pixels
};

type ContextMenuData = {
  x: number;
  y: number;
  pointId: string;
};

const NEUTRAL_VALUE = 75; // Default volume level

export default function AutomationCurve({
  points,
  onPointsChange,
  duration,
  color,
  visible,
  maxHeight,
}: AutomationCurveProps) {
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  if (!visible || duration === 0) return null;

  const sortedPoints = [...points].sort((a, b) => a.time - b.time);

  const valueToY = (value: number) => maxHeight - (value / 100) * maxHeight;
  const timeToX = (time: number) => (time / duration) * 100;

  let pathData = '';
  if (sortedPoints.length > 0) {
    const firstPoint = sortedPoints[0];
    pathData = `M ${timeToX(firstPoint.time)} ${valueToY(firstPoint.value)}`;
    sortedPoints.slice(1).forEach(p => {
      pathData += ` L ${timeToX(p.time)} ${valueToY(p.value)}`;
    });
  } else {
    // Draw a neutral baseline if no points exist
    pathData = `M 0 ${valueToY(NEUTRAL_VALUE)} L 100 ${valueToY(NEUTRAL_VALUE)}`;
  }

  const getSVGCoordinates = (e: MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  };

  const handleMouseDown = (pointId: string) => {
    setDraggingPointId(pointId);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingPointId || !svgRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const { x, y } = getSVGCoordinates(e);

    const newTime = Math.max(0, Math.min(duration, (x / 100) * duration));
    const newValue = Math.max(0, Math.min(100, (maxHeight - y) / maxHeight * 100));

    const updatedPoints = points.map(p =>
      p.id === draggingPointId ? { ...p, time: newTime, value: newValue } : p
    );
    onPointsChange(updatedPoints);
  };

  const handleMouseUp = () => {
    setDraggingPointId(null);
  };

  const handleAddPoint = (e: MouseEvent<SVGPathElement>) => {
    // Only trigger on the line itself, not on the point circles
    if (e.target !== e.currentTarget) return; 
    
    const { x, y } = getSVGCoordinates(e);
    const newTime = (x / 100) * duration;
    let newValue = (maxHeight - y) / maxHeight * 100;

    // If adding the first point, find the interpolated value on the existing line
    if (points.length > 0) {
        const sorted = [...points].sort((a,b) => a.time - b.time);
        let p1 = sorted[0];
        let p2 = sorted[sorted.length - 1];
        if (newTime < p1.time) {
            newValue = p1.value;
        } else if (newTime > p2.time) {
            newValue = p2.value;
        } else {
            for(let i=0; i<sorted.length - 1; i++) {
                if (newTime >= sorted[i].time && newTime <= sorted[i+1].time) {
                    p1 = sorted[i];
                    p2 = sorted[i+1];
                    const timeFraction = (newTime - p1.time) / (p2.time - p1.time);
                    newValue = p1.value + timeFraction * (p2.value - p1.value);
                    break;
                }
            }
        }
    }


    const newPoint: AutomationPoint = {
      id: `point_${Date.now()}`,
      time: Math.max(0, Math.min(duration, newTime)),
      value: Math.max(0, Math.min(100, newValue)),
    };
    onPointsChange([...points, newPoint]);
  };
  
  const handleDeletePoint = (id: string) => {
      onPointsChange(points.filter(p => p.id !== id));
      setContextMenu(null);
  }

  const handleContextMenu = (e: MouseEvent, pointId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, pointId });
  };
  
  return (
    <div 
        data-automation-element
        className="absolute inset-0 w-full h-full pointer-events-auto"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // Stop dragging if mouse leaves container
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 100 ${maxHeight}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {/* Invisible thicker line to make clicking easier */}
        {pathData && (
             <path
                d={pathData}
                stroke="transparent"
                strokeWidth="10"
                fill="none"
                vectorEffect="non-scaling-stroke"
                className="cursor-pointer"
                onClick={handleAddPoint}
            />
        )}
        <path
          d={pathData}
          stroke={color}
          strokeWidth="2"
          fill="none"
          vectorEffect="non-scaling-stroke"
          className="pointer-events-none"
        />
        {sortedPoints.map(p => (
          <circle
            key={p.id}
            cx={timeToX(p.time)}
            cy={valueToY(p.value)}
            r="4"
            fill={draggingPointId === p.id ? 'hsl(var(--primary))' : color}
            stroke="hsl(var(--background))"
            strokeWidth="1"
            className="cursor-pointer"
            onMouseDown={() => handleMouseDown(p.id)}
            onContextMenu={(e) => handleContextMenu(e, p.id)}
          />
        ))}
      </svg>
        <DropdownMenu open={!!contextMenu} onOpenChange={(open) => !open && setContextMenu(null)}>
            <DropdownMenuTrigger asChild>
                <div 
                    style={{ 
                        position: 'fixed', 
                        left: contextMenu?.x, 
                        top: contextMenu?.y,
                    }}
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => handleDeletePoint(contextMenu!.pointId)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete Point</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
}
