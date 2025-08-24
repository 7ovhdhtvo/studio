"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from "@/components/ui/badge";
import { LineChart, Rabbit, Minus } from 'lucide-react';
import { Button } from '../ui/button';

type AutomationPoint = {
  time: number;
  value: number;
};

type SpeedControlProps = {
  isOpen: boolean;
  onToggle: () => void;
  speed: number;
  onSpeedChange: (value: number) => void;
  showAutomation: boolean;
  onToggleAutomation: (value: boolean) => void;
  automationPoints: AutomationPoint[];
};

export default function SpeedControl({ isOpen, onToggle, speed, onSpeedChange, showAutomation, onToggleAutomation, automationPoints }: SpeedControlProps) {

  if (!isOpen) {
    return (
      <Button variant="outline" size="icon" className="w-16 h-16" onClick={onToggle}>
        <Rabbit className="w-6 h-6" />
      </Button>
    )
  }

  return (
      <Card>
        <CardHeader className="flex-row items-center justify-center relative py-4">
           <div className="flex items-center gap-2">
              <Rabbit className="w-5 h-5" />
              <CardTitle>Speed</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onToggle} className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7">
            <Minus className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="speed-slider">Playback Speed</Label>
              <span className="text-sm font-medium text-muted-foreground">{speed}%</span>
            </div>
            <Slider
              id="speed-slider"
              value={[speed]}
              max={200}
              min={50}
              step={1}
              onValueChange={(value) => onSpeedChange(value[0])}
            />
          </div>
           <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="speed-automation-switch">Automation</Label>
              <div className="flex items-center space-x-2">
                  <LineChart className="w-4 h-4 text-muted-foreground" />
                  <Switch
                      id="speed-automation-switch"
                      checked={showAutomation}
                      onCheckedChange={onToggleAutomation}
                  />
              </div>
            </div>
          </div>
           <div className="grid gap-2">
            <Label>Automation Points</Label>
            <div className="flex flex-wrap gap-2 p-2 bg-secondary rounded-md min-h-[40px]">
               {automationPoints.length > 0 ? (
                  automationPoints.map(point => (
                      <Badge key={`${point.time}-${point.value}`} variant="outline">
                          {point.time.toFixed(1)}s: {point.value}%
                      </Badge>
                  ))
               ) : (
                  <p className="text-xs text-muted-foreground">Click on the automation line to add points.</p>
               )}
            </div>
          </div>
        </CardContent>
      </Card>
  );
}
