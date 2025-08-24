"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ArrowDown, ArrowUp, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

const chartData = [
  { time: '0s', volume: 0 },
  { time: '1s', volume: 20 },
  { time: '2s', volume: 50 },
  { time: '3s', volume: 80 },
  { time: '4s', volume: 100 },
];

const chartConfig = {
  volume: {
    label: 'Volume',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function VolumeControl() {
  const [volume, setVolume] = useState(75);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Volume Automation</CardTitle>
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
         <div className="space-y-2">
            <Label>Automation Curve</Label>
             <ChartContainer config={chartConfig} className="h-[100px] w-full">
              <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{
                  left: -20,
                  right: 0,
                  top: 10,
                  bottom: 0,
                }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                 <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  dataKey="volume"
                  type="natural"
                  fill="var(--color-volume)"
                  fillOpacity={0.4}
                  stroke="var(--color-volume)"
                />
              </AreaChart>
            </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
