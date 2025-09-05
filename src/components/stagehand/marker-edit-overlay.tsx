
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import type { Marker } from '@/lib/storage-manager';
import { cn } from '@/lib/utils';

type MarkerEditOverlayProps = {
  marker: Marker | null;
  onUpdate: (id: string, newName: string, newTime: number) => void;
  onExit: () => void;
  duration: number;
};

export default function MarkerEditOverlay({ marker, onUpdate, onExit, duration }: MarkerEditOverlayProps) {
  const [name, setName] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    if (marker) {
      setName(marker.name || '');
      setTime(marker.time.toFixed(3));
    }
  }, [marker]);

  if (!marker) {
    return null;
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTime(newTime);
    const parsedTime = parseFloat(newTime);
    if (!isNaN(parsedTime) && parsedTime >= 0 && parsedTime <= duration) {
        onUpdate(marker.id, name, parsedTime);
    }
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    const parsedTime = parseFloat(time);
    if (!isNaN(parsedTime)) {
        onUpdate(marker.id, newName, parsedTime);
    }
  }

  const handleSetMarker = () => {
    const parsedTime = parseFloat(time);
    if (!isNaN(parsedTime)) {
        onUpdate(marker.id, name, parsedTime);
    }
    onExit();
  };

  return (
    <Card className="bg-secondary border-primary/50 shadow-lg -mb-4">
      <CardContent className="p-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <div className="grid gap-1.5">
                <Label htmlFor="marker-name" className="text-xs">Marker Name</Label>
                <Input
                    id="marker-name"
                    value={name}
                    onChange={handleNameChange}
                    className="h-9 w-48"
                    placeholder="Enter name"
                />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="marker-time" className="text-xs">Time (s)</Label>
                <Input
                    id="marker-time"
                    type="number"
                    value={time}
                    onChange={handleTimeChange}
                    className="h-9 w-32 font-mono"
                    step="0.01"
                />
            </div>
        </div>
        <Button onClick={handleSetMarker} className="self-end">
            <CheckCircle className="mr-2 h-4 w-4" />
            Set Marker
        </Button>
      </CardContent>
    </Card>
  );
}
