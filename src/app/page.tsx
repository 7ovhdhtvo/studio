
"use client";

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/stagehand/header';
import PlaybackControls from '@/components/stagehand/playback-controls';
import WaveformDisplay from '@/components/stagehand/waveform-display';
import SpeedControl from '@/components/stagehand/speed-control';
import VolumeControl from '@/components/stagehand/volume-control';
import MetronomeControl from '@/components/stagehand/metronome-control';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut } from 'lucide-react';
import ImportDialog from '@/components/stagehand/import-dialog';
import TrackList from '@/components/stagehand/track-list';
import { useAudioStorage } from '@/hooks/useAudioStorage';
import type { AudioFile } from '@/lib/storage-manager';
import DebugConsole from '@/components/stagehand/debug-console';

export type AutomationPoint = {
  time: number;
  value: number;
};

export type OpenControlPanel = 'volume' | 'speed' | 'metronome' | null;

export default function Home() {
  const { tracks, isLoading, importAudio, deleteTrack, renameTrack, getAudioUrl } = useAudioStorage();
  const [activeTrack, setActiveTrack] = useState<AudioFile | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showVolumeAutomation, setShowVolumeAutomation] = useState(true);
  const [showSpeedAutomation, setShowSpeedAutomation] = useState(false);
  const [zoom, setZoom] = useState(1); // 1 = 100%
  const [speed, setSpeed] = useState(100); // Global speed in %
  const [openControlPanel, setOpenControlPanel] = useState<OpenControlPanel>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.warn(`Failed to acquire wake lock: ${err}`);
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        } catch (err) {
          console.warn(`Failed to release wake lock: ${err}`);
        }
      }
    };
    
    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying]);
  
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback failed", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current && audioSrc) {
      audioRef.current.src = audioSrc;
      audioRef.current.load(); // Ensure the new source is loaded
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback failed", e));
      }
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
  }, [audioSrc]);


  const [volumePoints, setVolumePoints] = useState<AutomationPoint[]>([
    { time: 2.5, value: 80 },
    { time: 5.0, value: 50 },
  ]);
  const [speedPoints, setSpeedPoints] = useState<AutomationPoint[]>([
    { time: 3.2, value: 75 },
    { time: 6.8, value: 125 },
  ]);

  const handleToggleControlPanel = (panel: OpenControlPanel) => {
    setOpenControlPanel(prev => (prev === panel ? null : panel));
  };
  
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 20));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 1));

  const handleSelectTrack = async (track: AudioFile) => {
    setIsPlaying(false);
    setActiveTrack(track);
    const url = await getAudioUrl(track.id);
    setAudioSrc(url);
  };

  const handleDeleteTrack = async (id: string) => {
    await deleteTrack(id);
    if (activeTrack?.id === id) {
      setActiveTrack(null);
      setAudioSrc(null);
    }
  }

  const handleRenameTrack = async (id: string, currentTitle: string) => {
    await renameTrack(id, currentTitle);
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
      <Header />
      <main className="grid flex-1 grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr]">
        <div className="flex flex-col border-r bg-card">
          <div className="p-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Track Library</h2>
            <ImportDialog onImportTrack={importAudio} />
          </div>
          <TrackList 
            tracks={tracks}
            activeTrackId={activeTrack?.id}
            onSelectTrack={handleSelectTrack}
            onDeleteTrack={handleDeleteTrack}
            onRenameTrack={handleRenameTrack}
          />
        </div>

        <div className="flex flex-col overflow-y-auto p-6 lg:p-8">
          
          <DebugConsole />

          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">
                  {activeTrack?.title ?? "No Track Loaded"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {activeTrack?.originalName ?? "Import or select a track to begin"}
                </p>
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
              durationInSeconds={activeTrack?.duration ?? 180}
              zoom={zoom}
            />
            <PlaybackControls isPlaying={isPlaying} setIsPlaying={setIsPlaying} />

            <div className="flex justify-center items-start gap-4 pt-4 flex-wrap">
              <VolumeControl 
                isOpen={openControlPanel === 'volume'}
                onToggle={() => handleToggleControlPanel('volume')}
                showAutomation={showVolumeAutomation}
                onToggleAutomation={setShowVolumeAutomation}
                automationPoints={volumePoints}
              />
              <SpeedControl 
                isOpen={openControlPanel === 'speed'}
                onToggle={() => handleToggleControlPanel('speed')}
                speed={speed}
                onSpeedChange={setSpeed}
                showAutomation={showSpeedAutomation}
                onToggleAutomation={setShowSpeedAutomation}
                automationPoints={speedPoints}
              />
              <MetronomeControl 
                isOpen={openControlPanel === 'metronome'}
                onToggle={() => handleToggleControlPanel('metronome')}
                speed={speed} 
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
