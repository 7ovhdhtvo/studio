"use client";

import { useMemo } from 'react';

type TimeRulerProps = {
  duration: number;
  zoom: number;
};

const getInterval = (zoom: number): number => {
  if (zoom > 10) return 1;
  if (zoom > 5) return 5;
  if (zoom > 2) return 10;
  return 30;
};

const TimeRuler = ({ duration, zoom }: TimeRulerProps) => {
  const interval = getInterval(zoom);
  const markers = useMemo(() => {
    const numMarkers = Math.floor(duration / interval);
    return Array.from({ length: numMarkers + 1 }, (_, i) => i * interval);
  }, [duration, interval]);

  const formatMarker = (seconds: number) => {
    if (duration < 60 && interval < 5) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  return (
    <div 
        className="relative h-8 w-full mt-1"
        style={{ width: `${100 * zoom}%` }}
    >
      <div className="w-full h-full relative">
        <div className="absolute bottom-4 left-0 w-full h-px bg-border"></div>
        {markers.map(marker => {
          const percentage = (marker / duration) * 100;
          if (percentage > 100) return null;

          return (
            <div key={marker} className="absolute h-full" style={{ left: `${percentage}%` }}>
              <div className="w-px h-2 bg-border absolute bottom-4"></div>
              <span className="absolute bottom-0 -translate-x-1/2 text-xs text-muted-foreground">
                {formatMarker(marker)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeRuler;
