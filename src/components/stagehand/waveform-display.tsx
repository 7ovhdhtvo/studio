"use client";

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

type WaveformDisplayProps = {
  isPlaying: boolean;
};

export default function WaveformDisplay({ isPlaying }: WaveformDisplayProps) {
  const [bars, setBars] = useState<number[]>([]);
  const [progress, setProgress] = useState(30); // Percentage of progress

  useEffect(() => {
    // Generate random bar heights on client mount to avoid hydration mismatch
    const newBars = Array.from({ length: 150 }, () => Math.random() * 0.8 + 0.2);
    setBars(newBars);
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    if (isPlaying) {
      const animate = () => {
        setProgress(prev => (prev >= 100 ? 0 : prev + 0.05));
        animationFrameId = requestAnimationFrame(animate);
      };
      animationFrameId = requestAnimationFrame(animate);
    }
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);


  return (
    <div className="relative w-full h-32 bg-card rounded-lg p-2 flex items-center gap-0.5 overflow-hidden shadow-inner">
      {bars.map((height, index) => (
        <div
          key={index}
          className={cn(
            "w-full rounded-sm transition-colors duration-200",
            index < (progress / 100) * bars.length ? "bg-primary" : "bg-primary/20"
          )}
          style={{ height: `${height * 100}%` }}
        />
      ))}
       <div 
        className="absolute top-0 h-full w-0.5 bg-red-500"
        style={{ left: `${progress}%` }}
       >
         <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full"></div>
       </div>
    </div>
  );
}
