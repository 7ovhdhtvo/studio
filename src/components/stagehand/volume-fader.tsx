
"use client";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Volume2, VolumeX } from "lucide-react";

type VolumeFaderProps = {
  value: number; // 0-100
  onChange: (value: number) => void;
};

export default function VolumeFader({ value, onChange }: VolumeFaderProps) {
  const isMuted = value === 0;

  return (
    <div className="flex flex-col items-center justify-center gap-4 bg-secondary p-4 rounded-lg">
      <div className="flex-1 flex flex-col justify-end items-center">
        <Slider
          value={[value]}
          onValueChange={(vals) => onChange(vals[0])}
          max={100}
          step={1}
          orientation="vertical"
          className="w-4 h-64" // Custom width for fader track
        />
      </div>
      <div className="flex flex-col items-center gap-2">
        {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        <Label className="font-mono text-lg">{value}</Label>
      </div>
    </div>
  );
}
