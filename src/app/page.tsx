"use client";

import { useState } from 'react';
import Header from '@/components/stagehand/header';
import TrackList from '@/components/stagehand/track-list';
import PlaybackControls from '@/components/stagehand/playback-controls';
import WaveformDisplay from '@/components/stagehand/waveform-display';
import SpeedControl from '@/components/stagehand/speed-control';
import VolumeControl from '@/components/stagehand/volume-control';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut } from 'lucide-react';

export type Track = {
  id: number;
  title: string;
  artist: string;
  duration: string;
};

export type AutomationPoint = {
  time: number;
  value: number;
};

const initialTracks: Track[] = [
    { id: 1, title: 'Opening Scene', artist: 'Soundtrack', duration: '3:45' },
    { id: 2, title: 'Interlude Music', artist: 'Soundtrack', duration: '1:30' },
    { id: 3, title: 'Thunder SFX', artist: 'Effects', duration: '0:12' },
    { id: 4, title: 'Walk-on Music', artist: 'Generic Band', duration: '2:15' },
    { id: 5, title: 'Closing Theme', artist: 'Soundtrack', duration: '4:02' },
];

const parseDuration = (duration: string): number => {
    const parts = duration.split(':').map(Number);
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return 0;
}

export default function Home() {
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(initialTracks[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVolumeAutomation, setShowVolumeAutomation] = useState(true);
  const [showSpeedAutomation, setShowSpeedAutomation] = useState(false);
  const [zoom, setZoom] = useState(1); // 1 = 100%

  const [volumePoints, setVolumePoints] = useState<AutomationPoint[]>([
    { time: 2.5, value: 80 },
    { time: 5.0, value: 50 },
  ]);
  const [speedPoints, setSpeedPoints] = useState<AutomationPoint[]>([
    { time: 3.2, value: 75 },
    { time: 6.8, value: 125 },
  ]);

  const durationInSeconds = selectedTrack ? parseDuration(selectedTrack.duration) : 0;

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 20));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 1));

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <TrackList 
        tracks={tracks} 
        selectedTrack={selectedTrack} 
        onSelectTrack={setSelectedTrack}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: '#34495E' }}>
                {selectedTrack?.title || 'No Track Selected'}
              </h2>
              <p className="text-muted-foreground">{selectedTrack?.artist}</p>
            </div>
             <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>


          <WaveformDisplay 
            isPlaying={isPlaying} 
            showVolumeAutomation={showVolumeAutomation}
            showSpeedAutomation={showSpeedAutomation}
            durationInSeconds={durationInSeconds}
            zoom={zoom}
          />
          <PlaybackControls isPlaying={isPlaying} setIsPlaying={setIsPlaying} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <VolumeControl 
              showAutomation={showVolumeAutomation}
              onToggleAutomation={setShowVolumeAutomation}
              automationPoints={volumePoints}
            />
            <SpeedControl 
              showAutomation={showSpeedAutomation}
              onToggleAutomation={setShowSpeedAutomation}
              automationPoints={speedPoints}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
