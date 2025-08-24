"use client";

import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { Line, LineChart as RechartsLineChart, ResponsiveContainer } from 'recharts';
import TimeRuler from './time-ruler';

type WaveformDisplayProps = {
  isPlaying: boolean;
  showVolumeAutomation: boolean;
  showSpeedAutomation: boolean;
  durationInSeconds: number;
  zoom: number;
};

const volumeData = [
  { time: 0, value: 30 },
  { time: 1, value: 30 },
  { time: 2, value: 80 },
  { time: 3, value: 80 },
  { time: 4, value: 50 },
  { time: 5, value: 50 },
  { time: 6, value: 100 },
  { time: 7, value: 100 },
  { time: 8, value: 0 },
  { time: 9, value: 0 },
];

const speedData = [
  { time: 0, value: 100 },
  { time: 1, value: 100 },
  { time: 2, value: 100 },
  { time: 3, value: 75 },
  { time: 4, value: 75 },
  { time: 5, value: 125 },
  { time: 6, value: 125 },
  { time: 7, value: 100 },
  { time: 8, value: 100 },
  { time: 9, value: 100 },
];

const AutomationCurve = ({ data, color, visible }: { data: any[], color: string, visible: boolean }) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 w-full h-full opacity-70">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={true} />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function WaveformDisplay({ 
  isPlaying, 
  showVolumeAutomation, 
  showSpeedAutomation,
  durationInSeconds,
  zoom
}: WaveformDisplayProps) {
  const [bars, setBars] = useState<number[]>([]);
  const [progress, setProgress] = useState(0); // Progress in percentage
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newBars = Array.from({ length: 150 }, () => Math.random() * 0.8 + 0.2);
    setBars(newBars);
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    if (isPlaying) {
      const startTime = Date.now() - (progress / 100) * durationInSeconds * 1000;
      const animate = () => {
        const elapsedTime = Date.now() - startTime;
        const newProgress = (elapsedTime / (durationInSeconds * 1000)) * 100;
        
        if (newProgress >= 100) {
          setProgress(100);
        } else {
          setProgress(newProgress);
          animationFrameId = requestAnimationFrame(animate);
        }
      };
      animationFrameId = requestAnimationFrame(animate);
    }
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, durationInSeconds]);
  
  const currentTime = (progress / 100) * durationInSeconds;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds - Math.floor(seconds)) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }
  
  return (
    <div className="flex flex-col items-center space-y-2">
       <div className="font-mono text-4xl font-bold text-center w-full bg-secondary text-secondary-foreground py-2 rounded-lg">
          {formatTime(currentTime)}
       </div>
       <div 
         ref={containerRef}
         className="w-full overflow-x-auto"
       >
        <div 
          className="relative h-48 bg-card rounded-lg p-2 flex items-center gap-0.5 shadow-inner"
          style={{ width: `${100 * zoom}%` }}
        >
          {bars.map((height, index) => (
            <div
              key={index}
              className={cn(
                "w-full rounded-sm transition-colors duration-200",
                (index / bars.length * 100) < progress ? "bg-primary" : "bg-primary/20"
              )}
              style={{ height: `${height * 100}%` }}
            />
          ))}
          
          <AutomationCurve data={volumeData} color="hsl(var(--destructive))" visible={showVolumeAutomation} />
          <AutomationCurve data={speedData} color="#F5B041" visible={showSpeedAutomation} />

          <div 
            className="absolute top-0 h-full w-0.5 bg-foreground/70"
            style={{ left: `${progress}%` }}
          >
            <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 bg-foreground/70 rounded-full"></div>
          </div>
        </div>
        <TimeRuler duration={durationInSeconds} zoom={zoom} />
      </div>
    </div>
  );
}
