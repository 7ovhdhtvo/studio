"use client";

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Line, LineChart as RechartsLineChart, ResponsiveContainer } from 'recharts';

type WaveformDisplayProps = {
  isPlaying: boolean;
  showVolumeAutomation: boolean;
  showSpeedAutomation: boolean;
  durationInSeconds: number;
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

const TimeAxis = ({ duration }: { duration: number }) => {
  const markers = Array.from({ length: Math.floor(duration / 5) + 1 }, (_, i) => i * 5);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-6 flex justify-between text-xs text-muted-foreground px-2">
      {markers.map(marker => {
        const percentage = (marker / duration) * 100;
        return (
          <div key={marker} className="absolute" style={{ left: `${percentage}%` }}>
            <span className="absolute -translate-x-1/2">{marker}s</span>
          </div>
        )
      })}
    </div>
  )
}

export default function WaveformDisplay({ 
  isPlaying, 
  showVolumeAutomation, 
  showSpeedAutomation,
  durationInSeconds
}: WaveformDisplayProps) {
  const [bars, setBars] = useState<number[]>([]);
  const [progress, setProgress] = useState(30);

  useEffect(() => {
    const newBars = Array.from({ length: 150 }, () => Math.random() * 0.8 + 0.2);
    setBars(newBars);
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    if (isPlaying) {
      const animate = () => {
        setProgress(prev => (prev >= 100 ? 0 : prev + (0.05 / durationInSeconds * 100)));
        animationFrameId = requestAnimationFrame(animate);
      };
      animationFrameId = requestAnimationFrame(animate);
    }
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, durationInSeconds]);

  return (
    <div className="relative w-full h-56 flex flex-col">
      <div className="relative w-full h-48 bg-card rounded-lg p-2 flex items-center gap-0.5 overflow-hidden shadow-inner">
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
        
        <AutomationCurve data={volumeData} color="hsl(var(--destructive))" visible={showVolumeAutomation} />
        <AutomationCurve data={speedData} color="#F5B041" visible={showSpeedAutomation} />

         <div 
          className="absolute top-0 h-full w-0.5 bg-foreground/70"
          style={{ left: `${progress}%` }}
         >
           <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 bg-foreground/70 rounded-full"></div>
         </div>
      </div>
      <div className="relative h-8 w-full mt-1">
         <TimeAxis duration={durationInSeconds} />
      </div>
    </div>
  );
}
