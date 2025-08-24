"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { LineChart } from 'lucide-react';
import { useState } from 'react';

type SpeedControlProps = {
  showAutomation: boolean;
  onToggleAutomation: (value: boolean) => void;
};

export default function SpeedControl({ showAutomation, onToggleAutomation }: SpeedControlProps) {
  const [speed, setSpeed] = useState(100);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Speed Control</CardTitle>
        <div className="flex items-center space-x-2">
            <LineChart className="w-4 h-4 text-muted-foreground" />
            <Switch
                id="speed-automation-switch"
                checked={showAutomation}
                onCheckedChange={onToggleAutomation}
            />
        </div>
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
