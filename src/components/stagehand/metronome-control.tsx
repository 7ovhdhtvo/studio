"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Clock, Volume2 } from 'lucide-react';
import { Input } from "../ui/input";
import { useState } from 'react';

type MetronomeControlProps = {
  speed: number; // Speed in percentage (e.g., 100)
};

const BASE_BPM = 120; // Assuming a base BPM for calculation

export default function MetronomeControl({ speed }: MetronomeControlProps) {
  const [baseBpm, setBaseBpm] = useState(BASE_BPM);
  
  // Calculate the effective BPM based on the global speed control
  const effectiveBpm = Math.round(baseBpm * (speed / 100));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Metronome
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="metronome-enabled">Enabled</Label>
          <Switch id="metronome-enabled" />
        </div>
        <div className="grid gap-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="speed">Speed (BPM)</Label>
            <span className="text-sm font-medium">{effectiveBpm}</span>
          </div>
          <Slider 
            id="speed" 
            value={[baseBpm]} 
            max={240} 
            min={40} 
            step={1}
            onValueChange={(value) => setBaseBpm(value[0])}
          />
        </div>
        <div className="grid gap-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="volume">Volume</Label>
            <Volume2 className="w-4 h-4" />
          </div>
          <Slider id="volume" defaultValue={[75]} max={100} step={1} />
        </div>
        <div className="grid grid-cols-3 items-center gap-4">
          <Label htmlFor="count-in" className="col-span-2">Count-in (bars)</Label>
          <Input id="count-in" type="number" defaultValue="1" className="col-span-1" />
        </div>
      </CardContent>
    </Card>
  );
}
