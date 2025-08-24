"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Clock, Volume2 } from 'lucide-react';
import { Input } from "../ui/input";

export default function MetronomeControl() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <Clock className="h-5 w-5" />
          <span className="sr-only">Metronome Settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Metronome</h4>
            <p className="text-sm text-muted-foreground">
              Adjust tempo, volume, and count-in.
            </p>
          </div>
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="metronome-enabled">Enabled</Label>
              <Switch id="metronome-enabled" />
            </div>
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="speed">Speed (BPM)</Label>
                <span className="text-sm font-medium">120</span>
              </div>
              <Slider id="speed" defaultValue={[120]} max={240} min={40} step={1} />
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
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
