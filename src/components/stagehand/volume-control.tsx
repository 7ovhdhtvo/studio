
"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { LineChart, Volume2, VolumeX, Minus, Trash2 } from 'lucide-react';
import type { AutomationPoint } from '@/lib/storage-manager';

type PointEditorProps = {
  point: AutomationPoint;
  pointNumber: number;
  onUpdate: (id: string, newName: string, newTime: number) => void;
  onDelete: (id: string) => void;
};

function PointEditor({ point, pointNumber, onUpdate, onDelete }: PointEditorProps) {
  const [name, setName] = useState(point.name || '');
  const [time, setTime] = useState(point.time.toFixed(2));

  const handleSave = () => {
    const timeValue = parseFloat(time);
    if (!isNaN(timeValue)) {
      onUpdate(point.id, name, timeValue);
    }
  };

  return (
    <PopoverContent className="w-56" align="end" side="top">
      <div className="grid gap-4">
        <div className="space-y-2">
          <h4 className="font-medium leading-none">Edit Point {pointNumber}</h4>
          <p className="text-xs text-muted-foreground">
            Update point details.
          </p>
        </div>
        <div className="grid gap-2">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="width">Name</Label>
            <Input
              id="width"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-2 h-8"
              placeholder='Optional'
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="maxWidth">Time</Label>
            <Input
              id="maxWidth"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="col-span-2 h-8"
            />
          </div>
        </div>
        <div className="flex justify-between">
            <Button size="sm" onClick={handleSave}>Save</Button>
            <Button variant="destructive" size="icon" onClick={() => onDelete(point.id)}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      </div>
    </PopoverContent>
  );
}


type VolumeControlProps = {
  isOpen: boolean;
  onToggle: () => void;
  volume: number;
  onVolumeChange: (value: number) => void;
  showAutomation: boolean;
  onToggleAutomation: (value: boolean) => void;
  automationPoints: AutomationPoint[];
  onUpdatePoint: (id: string, newName: string, newTime: number) => void;
  onDeletePoint: (id: string) => void;
};

export default function VolumeControl({ 
  isOpen, 
  onToggle, 
  volume,
  onVolumeChange,
  showAutomation, 
  onToggleAutomation, 
  automationPoints,
  onUpdatePoint,
  onDeletePoint,
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
                  automationPoints.sort((a,b) => a.time - b.time).map((point, index) => {
                    const pointNumber = index + 1;
                    const displayName = point.name || `Point ${pointNumber}`;
                    return (
                        <Popover key={point.id}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="font-mono text-xs">
                                    {displayName}: {point.time.toFixed(1)}s @ {Math.round(point.value)}%
                                </Button>
                            </PopoverTrigger>
                            <PointEditor point={point} pointNumber={pointNumber} onUpdate={onUpdatePoint} onDelete={onDeletePoint} />
                        </Popover>
                    )
                  })
               ) : (
                  <p className="text-xs text-muted-foreground">Click on the automation line to add points.</p>
               )}
            </div>
          </div>
        </CardContent>
      </Card>
  );
}
