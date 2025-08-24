"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Volume2, VolumeX, LineChart } from 'lucide-react';
import { useState } from 'react';

type VolumeControlProps = {
  showAutomation: boolean;
  onToggleAutomation: (value: boolean) => void;
};

export default function VolumeControl({ showAutomation, onToggleAutomation }: VolumeControlProps) {
  const [volume, setVolume] = useState(75);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Volume Control</CardTitle>
        <div className="flex items-center space-x-2">
            <LineChart className="w-4 h-4 text-muted-foreground" />
            <Switch
                id="volume-automation-switch"
                checked={showAutomation}
                onCheckedChange={onToggleAutomation}
            />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2">
            <div className="flex justify-between items-center">
                <Label htmlFor="volume-slider">Master Volume</Label>
                 {volume === 0 ? <VolumeX className="w-5 h-5 text-muted-foreground" /> : <Volume2 className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div className="flex items-center gap-4">
                <Slider
                    id="volume-slider"
                    defaultValue={[75]}
                    max={100}
                    step={1}
                    onValueChange={(value) => setVolume(value[0])}
                />
                <span className="text-sm font-mono w-12 text-center bg-secondary py-1 rounded-md">{volume}</span>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="fade-in">Fade-in (s)</Label>
            <Input id="fade-in" type="number" placeholder="1.0" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fade-out">Fade-out (s)</Label>
            <Input id="fade-out" type="number" placeholder="2.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
