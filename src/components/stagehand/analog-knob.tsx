
"use client";

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type AnalogKnobProps = {
  value: number; // 0-100
  onChange: (value: number) => void;
  size?: number;
};

const MIN_DEG = -135;
const MAX_DEG = 135;

export default function AnalogKnob({
  value,
  onChange,
  size = 100
}: AnalogKnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const previousY = useRef(0);

  const valueToRotation = useCallback((v: number) => {
    const percentage = v / 100;
    return MIN_DEG + (MAX_DEG - MIN_DEG) * percentage;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaY = previousY.current - e.clientY;
    previousY.current = e.clientY;

    const newValue = Math.max(0, Math.min(100, value + deltaY));
    onChange(newValue);
  }, [isDragging, value, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    previousY.current = e.clientY;
  };
  
  const rotation = valueToRotation(value);

  return (
    <div
      ref={knobRef}
      className="relative flex items-center justify-center cursor-pointer select-none"
      style={{ width: size, height: size }}
      onMouseDown={handleMouseDown}
      title={`Volume: ${value}%`}
    >
      <div
        className="absolute w-full h-full rounded-full bg-secondary shadow-inner"
      />
      <div
        className="w-full h-full rounded-full bg-card shadow-md flex items-center justify-center"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 100ms ease-out',
        }}
      >
        <div className="w-1 h-1/3 bg-primary rounded-full absolute top-[10%]" />
      </div>
      <div className="absolute text-xs bottom-[-20px] font-mono text-muted-foreground">
        {value}%
      </div>
    </div>
  );
}
