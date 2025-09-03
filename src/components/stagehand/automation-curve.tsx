
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
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y, svgWidth: rect.width };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingPointId || !svgRef.current) return;
    
    const { x, y } = getSVGCoordinates(e);
    const newTime = xToTime(x, svgRef.current.viewBox.baseVal.width);
    const newValue = yToValue(y);
    
    const updatedPoints = points.map(p => 
      p.id === draggingPointId ? { ...p, time: newTime, value: newValue } : p
    );
    onPointsChange(updatedPoints);
  }, [draggingPointId, points, onPointsChange, getSVGCoordinates, xToTime, yToValue]);

  const handleMouseUp = useCallback(() => {
    if (draggingPointId) {
      setDraggingPointId(null);
      onDragEnd();
    }
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
      return `M 0 ${valueToY(baselineValue)} L 100 ${valueToY(baselineValue)}`;
    }
    
    const sortedPoints = [...points].sort((a, b) => a.time - b.time);
    const firstPoint = sortedPoints[0];
    
    // Line from start to first point
    const pathParts = [`M 0 ${valueToY(firstPoint.value)} L ${timeToX(firstPoint.time)} ${valueToY(firstPoint.value)}`];
    
    // Line connecting all points
    pathParts.push(...sortedPoints.map(p => `L ${timeToX(p.time)} ${valueToY(p.value)}`));

    // Line from last point to end
    const lastPoint = sortedPoints[sortedPoints.length - 1];
    pathParts.push(`L 100 ${valueToY(lastPoint.value)}`);

    return pathParts.join(' ');
  };
  
  const handleAddPoint = (e: React.MouseEvent) => {
    // Prevent adding a point when dragging an existing one starts
    if ((e.target as SVGElement).tagName === 'circle') return;
    
    e.preventDefault();
    e.stopPropagation();

    if (!svgRef.current) return;
    const { x, y } = getSVGCoordinates(e);
    const time = xToTime(x, svgRef.current.viewBox.baseVal.width);
    
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
        name: ``, // Name is determined by display order
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
