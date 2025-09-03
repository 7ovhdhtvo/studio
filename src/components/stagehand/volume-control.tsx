
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from "@/components/ui/badge";
import { LineChart, Volume2, VolumeX, Minus } from 'lucide-react';
import { Button } from '../ui/button';
import type { AutomationPoint } from '@/lib/storage-manager';


type VolumeControlProps = {
  isOpen: boolean;
  onToggle: () => void;
  volume: number;
  onVolumeChange: (value: number) => void;
  showAutomation: boolean;
  onToggleAutomation: (value: boolean) => void;
  automationPoints: AutomationPoint[];
};

export default function VolumeControl({ 
  isOpen, 
  onToggle, 
  volume,
  onVolumeChange,
  showAutomation, 
  onToggleAutomation, 
  automationPoints 
}: VolumeControlProps) {

  if (!isOpen) {
    return (
      <Button variant="outline" size="icon" className="w-16 h-16" onClick={onToggle}>
        <Volume2 className="w-6 h-6" />
      </Button>
    )
  }

  return (
      <Card>
        <CardHeader className="flex-row items-center justify-center relative py-4">
            <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                <CardTitle>Volume</CardTitle>
            </div>
             <Button variant="outline" size="icon" onClick={onToggle} className="absolute right-2 top-2 h-7 w-7 bg-secondary">
                <Minus className="w-4 h-4" />
            </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
              <div className="flex justify-between items-center">
                  <Label htmlFor="volume-slider">Master Volume</Label>
                   {volume === 0 ? <VolumeX className="w-5 h-5 text-muted-foreground" /> : <Volume2 className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-4 w-full">
                    <Slider
                        id="volume-slider"
                        value={[volume]}
                        max={100}
                        step={1}
                        onValueChange={(value) => onVolumeChange(value[0])}
                        disabled={showAutomation}
                    />
                    <span className="text-sm font-mono w-12 text-center bg-secondary py-1 rounded-md">{volume}</span>
                  </div>
                  {showAutomation && (
                    <p className="text-xs text-muted-foreground w-full -mt-1">Automation active</p>
                  )}
              </div>
          </div>
           <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="volume-automation-switch">Automation</Label>
              <div className="flex items-center space-x-2">
                  <LineChart className="w-4 h-4 text-muted-foreground" />
                  <Switch
                      id="volume-automation-switch"
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
                      <Badge key={point.id} variant="outline">
                          {point.time.toFixed(1)}s: {Math.round(point.value)}%
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
