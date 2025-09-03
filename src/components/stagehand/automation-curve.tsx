
"use client";

import React from 'react';
import { cn } from '@/lib/utils';

type AutomationCurveProps = {
  duration: number;
  color: string;
  visible: boolean;
  maxHeight: number;
  baselineValue: number; // The master volume level (0-100)
  onBaselineChange: (newValue: number) => void;
};

export default function AutomationCurve({
  duration,
  color,
  visible,
  maxHeight,
  baselineValue,
  onBaselineChange,
}: AutomationCurveProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const svgRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    const handleMouseUpGlobal = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };
    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => window.removeEventListener('mouseup', handleMouseUpGlobal);
  }, [isDragging]);

  if (!visible || duration === 0) return null;

  const valueToY = (value: number) => maxHeight - (value / 100) * maxHeight;

  const pathData = `M 0 ${valueToY(baselineValue)} L 100 ${valueToY(baselineValue)}`;
  
  const getSVGCoordinates = (e: React.MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !svgRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const { y } = getSVGCoordinates(e);
    const newValue = Math.round(Math.max(0, Math.min(100, (maxHeight - y) / maxHeight * 100)));
    onBaselineChange(newValue);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div 
        data-automation-element
        className="absolute inset-0 w-full h-full pointer-events-auto"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
            d={pathData}
            stroke="transparent"
            strokeWidth="10"
            fill="none"
            vectorEffect="non-scaling-stroke"
            className="cursor-ns-resize"
            onMouseDown={handleMouseDown}
        />
        <path
          d={pathData}
          stroke={color}
          strokeWidth="2"
          fill="none"
          vectorEffect="non-scaling-stroke"
          className="pointer-events-none"
        />
      </svg>
    </div>
  );
}
