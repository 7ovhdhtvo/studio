
"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  baselineValue: number; // Master volume
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
  baselineValue,
}: AutomationCurveProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);

  const valueToY = useCallback((value: number) => maxHeight - (value / 100) * maxHeight, [maxHeight]);
  const timeToX = useCallback((time: number) => (time / duration) * 100, [duration]);
  const yToValue = useCallback((y: number) => Math.max(0, Math.min(100, (maxHeight - y) / maxHeight * 100)), [maxHeight]);
  const xToTime = useCallback((x: number, svgWidth: number) => Math.max(0, Math.min(duration, (x / svgWidth) * duration)), [duration]);

  const getSVGCoordinates = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0, svgWidth: 0 };
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, svgWidth: rect.width };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!svgRef.current || !draggingPointId) return;
    const { x, y, svgWidth } = getSVGCoordinates(e);

    const newTime = xToTime(x, svgWidth);
    const newValue = yToValue(y);
    const updatedPoints = points.map(p =>
      p.id === draggingPointId ? { ...p, time: newTime, value: newValue } : p
    );
    onPointsChange(updatedPoints);
  }, [draggingPointId, points, onPointsChange, getSVGCoordinates, xToTime, yToValue]);
  
  const handleMouseUp = useCallback(() => {
    if (draggingPointId) {
      onDragEnd();
    }
    setDraggingPointId(null);
  }, [draggingPointId, onDragEnd]);

  useEffect(() => {
    if (draggingPointId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp, { once: true });
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingPointId, handleMouseMove, handleMouseUp]);


  if (!visible || duration === 0) return null;

  const getPathData = () => {
    if (points.length === 0) {
      const baselineY = valueToY(baselineValue);
      return `M 0 ${baselineY} L 100 ${baselineY}`;
    }

    const sortedPoints = [...points].sort((a, b) => a.time - b.time);
    const firstPoint = sortedPoints[0];
    
    // Start line from the beginning of the track at the first point's value
    let pathParts = [`M 0 ${valueToY(firstPoint.value)} L ${timeToX(firstPoint.time)} ${valueToY(firstPoint.value)}`];
    // Connect all the points
    pathParts.push(...sortedPoints.map(p => `L ${timeToX(p.time)} ${valueToY(p.value)}`));
    // End line at the end of the track with the last point's value
    const lastPoint = sortedPoints[sortedPoints.length - 1];
    pathParts.push(`L 100 ${valueToY(lastPoint.value)}`);

    return pathParts.join(' ');
  };
  
  const handleAddPoint = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!svgRef.current) return;
    const { x, y, svgWidth } = getSVGCoordinates(e);
    const time = xToTime(x, svgWidth);
    
    let value = yToValue(y);

    const newPoint: AutomationPoint = {
        id: `point_${Date.now()}`,
        time,
        value,
        name: `${points.length + 1}`
    };
    
    const newPoints = [...points, newPoint];
    onPointsChange(newPoints);
    onDragEnd(); // Save immediately after adding
  };
  
  const handlePointMouseDown = (e: React.MouseEvent, pointId: string) => {
    e.stopPropagation();
    setDraggingPointId(pointId);
    onDragStart();
  };
  
  return (
    <div
      data-automation-element
      className="absolute inset-0 w-full h-full"
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 100 ${maxHeight}`}
        preserveAspectRatio="none"
        className="overflow-visible"
        onClick={handleAddPoint}
      >
        {/* Invisible wider path for easier clicking */}
         <path
            d={getPathData()}
            stroke="transparent"
            strokeWidth="10"
            fill="none"
            className="cursor-pointer"
         />
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
            r="5"
            fill={color}
            stroke={"hsl(var(--background))"}
            strokeWidth="1"
            className="cursor-grab"
            onMouseDown={(e) => handlePointMouseDown(e, point.id)}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
}
