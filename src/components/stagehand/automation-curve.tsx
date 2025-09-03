
"use client";

import React, { useRef, useState, useEffect } from 'react';
import type { AutomationPoint } from '@/lib/storage-manager';

type AutomationCurveProps = {
  duration: number;
  color: string;
  visible: boolean;
  maxHeight: number;
  points: AutomationPoint[];
  onPointsChange: (newPoints: AutomationPoint[]) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
};

export default function AutomationCurve({
  duration,
  color,
  visible,
  maxHeight,
  points,
  onPointsChange,
  onDragStart,
  onDragEnd,
}: AutomationCurveProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);

  useEffect(() => {
    const handleMouseUpGlobal = () => {
      if (draggingPointId) {
        setDraggingPointId(null);
        onDragEnd();
      }
    };
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      if (draggingPointId && svgRef.current) {
        const { x, y } = getSVGCoordinates(e);
        const newTime = Math.max(0, Math.min(duration, (x / 100) * duration));
        const newValue = Math.max(0, Math.min(100, (maxHeight - y) / maxHeight * 100));
        
        const updatedPoints = points.map(p => 
          p.id === draggingPointId ? { ...p, time: newTime, value: newValue } : p
        );
        onPointsChange(updatedPoints);
      }
    };

    window.addEventListener('mousemove', handleMouseMoveGlobal);
    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => {
        window.removeEventListener('mousemove', handleMouseMoveGlobal);
        window.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, [draggingPointId, onDragEnd, points, onPointsChange, duration, maxHeight]);

  if (!visible || duration === 0) return null;

  const valueToY = (value: number) => maxHeight - (value / 100) * maxHeight;
  const timeToX = (time: number) => (time / duration) * 100;

  const getSVGCoordinates = (e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  };
  
  const getPathData = () => {
    if (points.length === 0) {
        return `M 0 ${valueToY(75)} L 100 ${valueToY(75)}`;
    }
    const sortedPoints = [...points].sort((a, b) => a.time - b.time);
    const firstPoint = sortedPoints[0];
    const pathParts = [`M ${timeToX(firstPoint.time)} ${valueToY(firstPoint.value)}`];
    
    // Line from start to first point
    pathParts.unshift(`M 0 ${valueToY(firstPoint.value)} L ${timeToX(firstPoint.time)} ${valueToY(firstPoint.value)}`);

    for (let i = 1; i < sortedPoints.length; i++) {
        const p = sortedPoints[i];
        pathParts.push(`L ${timeToX(p.time)} ${valueToY(p.value)}`);
    }
    
    // Line from last point to end
    const lastPoint = sortedPoints[sortedPoints.length-1];
    pathParts.push(`L 100 ${valueToY(lastPoint.value)}`);

    return pathParts.join(' ');
  };
  
  const handleAddPoint = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const { x, y } = getSVGCoordinates(e);
    const time = (x / 100) * duration;
    const value = Math.max(0, Math.min(100, (maxHeight - y) / maxHeight * 100));

    const newPoint: AutomationPoint = {
        id: `point_${Date.now()}`,
        time,
        value,
    };
    const newPoints = [...points, newPoint];
    onPointsChange(newPoints);
    onDragEnd(); // Save after adding
  };
  
  const handlePointMouseDown = (e: React.MouseEvent, pointId: string) => {
    e.stopPropagation();
    setDraggingPointId(pointId);
    onDragStart();
  };

  return (
    <div 
        data-automation-element
        className="absolute inset-0 w-full h-full pointer-events-auto"
        onClick={handleAddPoint}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 100 ${maxHeight}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <path
            d={getPathData()}
            stroke={color}
            strokeWidth="2"
            fill="none"
            vectorEffect="non-scaling-stroke"
            className="pointer-events-none"
        />
        {points.map(point => (
            <circle
                key={point.id}
                cx={timeToX(point.time)}
                cy={valueToY(point.value)}
                r="4"
                fill="hsl(var(--background))"
                stroke={color}
                strokeWidth="2"
                className="cursor-grab"
                onMouseDown={(e) => handlePointMouseDown(e, point.id)}
                vectorEffect="non-scaling-stroke"
            />
        ))}
      </svg>
    </div>
  );
}
