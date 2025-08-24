"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from "@/components/ui/badge";
import { LineChart } from 'lucide-react';
import { useState } from 'react';

type AutomationPoint = {
  time: number;
  value: number;
};

type SpeedControlProps = {
  showAutomation: boolean;
  onToggleAutomation: (value: boolean) => void;
  automationPoints: AutomationPoint[];
};

export default function SpeedControl({ showAutomation, onToggleAutomation, automationPoints }: SpeedControlProps) {
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
