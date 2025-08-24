"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Music, Volume2, Minus } from 'lucide-react';
import { Input } from "../ui/input";
import { useState } from 'react';
import { Button } from '../ui/button';

type MetronomeControlProps = {
  isOpen: boolean;
  onToggle: () => void;
  speed: number; // Speed in percentage (e.g., 100)
};

const BASE_BPM = 120; // Assuming a base BPM for calculation

export default function MetronomeControl({ isOpen, onToggle, speed }: MetronomeControlProps) {
  const [baseBpm, setBaseBpm] = useState(BASE_BPM);
  
  const effectiveBpm = Math.round(baseBpm * (speed / 100));

  if (!isOpen) {
    return (
      <Button variant="outline" size="icon" className="w-16 h-16" onClick={onToggle}>
        <Music className="w-6 h-6" />
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-center relative py-4">
        <div className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            <CardTitle>Metronome</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggle} className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full">
            <Minus className="w-4 h-4" />
        </Button>
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
