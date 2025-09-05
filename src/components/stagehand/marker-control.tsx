
"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Flag, Minus, Trash2, Edit } from 'lucide-react';
import type { Marker } from '@/lib/storage-manager';

type MarkerEditorProps = {
  marker: Marker;
  markerNumber: number;
  onUpdate: (id: string, newName: string, newTime: number) => void;
  onDelete: (id: string) => void;
};

function MarkerEditor({ marker, markerNumber, onUpdate, onDelete }: MarkerEditorProps) {
  const [name, setName] = useState(marker.name || '');
  const [time, setTime] = useState(marker.time.toFixed(2));

  const handleSave = () => {
    const timeValue = parseFloat(time);
    if (!isNaN(timeValue)) {
      onUpdate(marker.id, name, timeValue);
    }
  };

  return (
    <PopoverContent className="w-64" align="end" side="top">
      <div className="grid gap-4">
        <div className="space-y-2">
          <h4 className="font-medium leading-none">Edit Marker {markerNumber}</h4>
          <p className="text-xs text-muted-foreground">
            Update marker details.
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
              placeholder={`Marker ${markerNumber}`}
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
            <Button variant="destructive" size="icon" onClick={() => onDelete(marker.id)}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      </div>
    </PopoverContent>
  );
}


type MarkerControlProps = {
  isOpen: boolean;
  onToggle: () => void;
  markers: Marker[];
  showMarkers: boolean;
  onToggleShowMarkers: (value: boolean) => void;
  isMarkerModeActive: boolean;
  onToggleIsMarkerModeActive: (value: boolean) => void;
  isLoopActive: boolean;
  onToggleIsLoopActive: (value: boolean) => void;
  onUpdateMarker: (id: string, newName: string, newTime: number) => void;
  onDeleteMarker: (id: string) => void;
  onDeleteAllMarkers: () => void;
  onJumpToMarker: (time: number) => void;
};

export default function MarkerControl({ 
  isOpen, 
  onToggle, 
  markers,
  showMarkers, 
  onToggleShowMarkers, 
  isMarkerModeActive,
  onToggleIsMarkerModeActive,
  isLoopActive,
  onToggleIsLoopActive,
  onUpdateMarker,
  onDeleteMarker,
  onDeleteAllMarkers,
  onJumpToMarker,
}: MarkerControlProps) {

  if (!isOpen) {
    return (
      <Button variant="outline" size="icon" className="w-16 h-16" onClick={onToggle}>
        <Flag className="w-6 h-6" />
      </Button>
    )
  }

  return (
      <Card className="w-80">
        <CardHeader className="flex-row items-center justify-center relative py-4">
            <div className="flex items-center gap-2">
                <Flag className="w-5 h-5" />
                <CardTitle>Markers</CardTitle>
            </div>
             <Button variant="outline" size="icon" onClick={onToggle} className="absolute right-2 top-2 h-7 w-7 bg-secondary">
                <Minus className="w-4 h-4" />
            </Button>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="marker-edit-switch">Edit Markers</Label>
              <div className="flex items-center space-x-2">
                  <Edit className="w-4 h-4 text-muted-foreground" />
                  <Switch
                      id="marker-edit-switch"
                      checked={showMarkers}
                      onCheckedChange={onToggleShowMarkers}
                  />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="marker-active-switch">Marker active</Label>
              <Switch
                  id="marker-active-switch"
                  checked={isMarkerModeActive}
                  onCheckedChange={onToggleIsMarkerModeActive}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="loop-active-switch">Loop active</Label>
              <Switch
                  id="loop-active-switch"
                  checked={isLoopActive}
                  onCheckedChange={onToggleIsLoopActive}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <div className="flex justify-between items-center mb-1">
              <Label>Markers</Label>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={onDeleteAllMarkers}
                disabled={markers.length === 0}
              >
                  <Trash2 className="h-4 w-4 mr-1"/>
                  Clear All
              </Button>
            </div>
            <div className="flex flex-col gap-2 p-2 bg-secondary rounded-md min-h-[40px] max-h-48 overflow-y-auto">
               {markers.length > 0 ? (
                  markers.sort((a,b) => a.time - b.time).map((marker, index) => {
                    const markerNumber = index + 1;
                    const displayName = marker.name || `Marker ${markerNumber}`;
                    return (
                        <div key={marker.id} className="flex items-center justify-between gap-2">
                            <Button 
                                variant="ghost" 
                                className="flex-1 justify-start text-left h-auto py-1.5 min-w-0"
                                onClick={() => onJumpToMarker(marker.time)}
                            >
                                <div className="flex flex-col overflow-hidden">
                                    <span className="font-semibold break-words whitespace-pre-wrap">{displayName}</span>
                                    <span className="font-mono text-xs text-muted-foreground">{marker.time.toFixed(2)}s</span>
                                </div>
                            </Button>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <MarkerEditor marker={marker} markerNumber={markerNumber} onUpdate={onUpdateMarker} onDelete={onDeleteMarker} />
                            </Popover>
                        </div>
                    )
                  })
               ) : (
                  <p className="text-xs text-muted-foreground p-2">Click on the waveform to add markers.</p>
               )}
            </div>
          </div>
        </CardContent>
      </Card>
  );
}
