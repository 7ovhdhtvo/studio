"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useState } from 'react';

export default function SpeedControl() {
  const [speed, setSpeed] = useState(100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Speed Control</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="speed-slider">Playback Speed</Label>
            <span className="text-sm font-medium text-muted-foreground">{speed}%</span>
          </div>
          <Slider
            id="speed-slider"
            defaultValue={[100]}
            max={200}
            min={50}
            step={1}
            onValueChange={(value) => setSpeed(value[0])}
          />
        </div>
        <div className="grid grid-cols-2 items-center gap-4">
          <Label htmlFor="ramp-time">Ramp Time (s)</Label>
          <Input id="ramp-time" type="number" placeholder="0.5" className="w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
