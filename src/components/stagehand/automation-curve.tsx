
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
  baselineValue: number;
  onBaselineChange: (newValue: number) => void;
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
  onBaselineChange,
}: AutomationCurveProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [isDraggingBaseline, setIsDraggingBaseline] = useState(false);

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
    if (!svgRef.current) return;
    const { x, y, svgWidth } = getSVGCoordinates(e);

    if (draggingPointId) {
      const newTime = xToTime(x, svgWidth);
      const newValue = yToValue(y);
      const updatedPoints = points.map(p =>
        p.id === draggingPointId ? { ...p, time: newTime, value: newValue } : p
      );
      onPointsChange(updatedPoints);
    } else if (isDraggingBaseline) {
      const newValue = yToValue(y);
      onBaselineChange(newValue);
    }
  }, [draggingPointId, isDraggingBaseline, points, onPointsChange, getSVGCoordinates, xToTime, yToValue, onBaselineChange]);
  
  const handleMouseUp = useCallback(() => {
    if (draggingPointId || isDraggingBaseline) {
      onDragEnd();
    }
    setDraggingPointId(null);
    setIsDraggingBaseline(false);
  }, [draggingPointId, isDraggingBaseline, onDragEnd]);

  useEffect(() => {
    if (draggingPointId || isDraggingBaseline) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp, { once: true });
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingPointId, isDraggingBaseline, handleMouseMove, handleMouseUp]);


  if (!visible || duration === 0) return null;

  const getPathData = () => {
    if (points.length === 0) {
      return `M 0 ${valueToY(baselineValue)} L 100 ${valueToY(baselineValue)}`;
    }
    
    const sortedPoints = [...points].sort((a, b) => a.time - b.time);
    const firstPoint = sortedPoints[0];
    
    const pathParts = [`M 0 ${valueToY(firstPoint.value)} L ${timeToX(firstPoint.time)} ${valueToY(firstPoint.value)}`];
    pathParts.push(...sortedPoints.map(p => `L ${timeToX(p.time)} ${valueToY(p.value)}`));
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
    
    let value;
    if (points.length === 0) {
        value = baselineValue;
    } else {
        const sortedPoints = [...points].sort((a, b) => a.time - b.time);
        let p1 = sortedPoints[0];
        if (time < p1.time) {
            value = p1.value;
        } else {
            let found = false;
            for (let i = 0; i < sortedPoints.length - 1; i++) {
                p1 = sortedPoints[i];
                const p2 = sortedPoints[i+1];
                if (time >= p1.time && time <= p2.time) {
                    const timeFraction = (time - p1.time) / (p2.time - p1.time);
                    value = p1.value + timeFraction * (p2.value - p1.value);
                    found = true;
                    break;
                }
            }
            if (!found) {
                value = sortedPoints[sortedPoints.length-1].value;
            }
        }
    }

    const newPoint: AutomationPoint = {
        id: `point_${Date.now()}`,
        time,
        value,
    };
    
    const newPoints = [...points, newPoint];
    onPointsChange(newPoints);
    onDragEnd();
  };
  
  const handlePointMouseDown = (e: React.MouseEvent, pointId: string) => {
    e.stopPropagation();
    setDraggingPointId(pointId);
    onDragStart();
  };

  const handleBaselineMouseDown = (e: React.MouseEvent) => {
    if (points.length > 0) return; // Only allow baseline drag when no points exist
    e.stopPropagation();
    setIsDraggingBaseline(true);
    onDragStart();
  };
  
  return (
    <div
      data-automation-element
      className="absolute inset-0 w-full h-full"
      onClick={points.length > 0 ? handleAddPoint : undefined}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox="0 0 100 192"
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {/* Invisible wider path for easier interaction with baseline */}
        {points.length === 0 && (
           <path
              d={getPathData()}
              stroke="transparent"
              strokeWidth="10"
              fill="none"
              className="cursor-ns-resize"
              onMouseDown={handleBaselineMouseDown}
           />
        )}
        <path
          d={getPathData()}
          stroke={color}
          strokeWidth="2"
          fill="none"
          vectorEffect="non-scaling-stroke"
          className={points.length > 0 ? "pointer-events-none" : "cursor-ns-resize pointer-events-auto"}
          onMouseDown={points.length === 0 ? handleBaselineMouseDown : undefined}
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

    