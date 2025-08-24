"use client";

import { useState } from 'react';
import Header from '@/components/stagehand/header';
import TrackList from '@/components/stagehand/track-list';
import PlaybackControls from '@/components/stagehand/playback-controls';
import WaveformDisplay from '@/components/stagehand/waveform-display';
import SpeedControl from '@/components/stagehand/speed-control';
import VolumeControl from '@/components/stagehand/volume-control';

export type Track = {
  id: number;
  title: string;
  artist: string;
  duration: string;
};

const initialTracks: Track[] = [
    { id: 1, title: 'Opening Scene', artist: 'Soundtrack', duration: '3:45' },
    { id: 2, title: 'Interlude Music', artist: 'Soundtrack', duration: '1:30' },
    { id: 3, title: 'Thunder SFX', artist: 'Effects', duration: '0:12' },
    { id: 4, title: 'Walk-on Music', artist: 'Generic Band', duration: '2:15' },
    { id: 5, title: 'Closing Theme', artist: 'Soundtrack', duration: '4:02' },
];

export default function Home() {
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(initialTracks[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVolumeAutomation, setShowVolumeAutomation] = useState(true);
  const [showSpeedAutomation, setShowSpeedAutomation] = useState(false);

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
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: '#34495E' }}>
              {selectedTrack?.title || 'No Track Selected'}
            </h2>
            <p className="text-muted-foreground">{selectedTrack?.artist}</p>
          </div>

          <WaveformDisplay 
            isPlaying={isPlaying} 
            showVolumeAutomation={showVolumeAutomation}
            showSpeedAutomation={showSpeedAutomation}
          />
          <PlaybackControls isPlaying={isPlaying} setIsPlaying={setIsPlaying} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <VolumeControl 
              showAutomation={showVolumeAutomation}
              onToggleAutomation={setShowVolumeAutomation}
            />
            <SpeedControl 
              showAutomation={showSpeedAutomation}
              onToggleAutomation={setShowSpeedAutomation}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
