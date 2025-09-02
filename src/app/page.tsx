
"use client";

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/stagehand/header';
import PlaybackControls from '@/components/stagehand/playback-controls';
import WaveformDisplay from '@/components/stagehand/waveform-display';
import SpeedControl from '@/components/stagehand/speed-control';
import VolumeControl from '@/components/stagehand/volume-control';
import MetronomeControl from '@/components/stagehand/metronome-control';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Music } from 'lucide-react';
import ImportDialog from '@/components/stagehand/import-dialog';
import TrackList from '@/components/stagehand/track-list';
import type { AudioTrack } from '@/lib/local-db';
import { db } from '@/lib/local-db';


export type AutomationPoint = {
  time: number;
  value: number;
};

export type OpenControlPanel = 'volume' | 'speed' | 'metronome' | null;

export default function Home() {
  const [activeTrack, setActiveTrack] = useState<AudioTrack | null>(null);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVolumeAutomation, setShowVolumeAutomation] = useState(true);
  const [showSpeedAutomation, setShowSpeedAutomation] = useState(false);
  const [zoom, setZoom] = useState(1); // 1 = 100%
  const [speed, setSpeed] = useState(100); // Global speed in %
  const [openControlPanel, setOpenControlPanel] = useState<OpenControlPanel>(null);
  
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const loadTracksFromDb = async () => {
    const storedTracks = await db.tracks.toArray();
    setTracks(storedTracks);
  };

  useEffect(() => {
    loadTracksFromDb();
  }, []);

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
    if (audioSrc && audioRef.current) {
      audioRef.current.src = audioSrc;
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback failed", e));
      }
    }
  }, [audioSrc]);

  useEffect(() => {
    if (activeTrack?.blob) {
      const url = URL.createObjectURL(activeTrack.blob);
      setAudioSrc(url);
      setIsPlaying(false);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setAudioSrc(null);
    }
  }, [activeTrack]);


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

  const handleImportTrack = (file: File) => {
    const audio = new Audio(URL.createObjectURL(file));
    audio.addEventListener('loadedmetadata', async () => {
      const newTrack: Omit<AudioTrack, 'id'> = {
        title: file.name.replace(/\.[^/.]+$/, ""),
        originalFilename: file.name,
        duration: audio.duration,
        blob: file
      };
      await db.tracks.add(newTrack as AudioTrack);
      await loadTracksFromDb();
    });
  };

  const handleSelectTrack = (track: AudioTrack) => {
    setActiveTrack(track);
  };

  const handleDeleteTrack = async (id: number) => {
    console.log("Delete triggered for ID:", id);
    if (window.confirm("Are you sure you want to delete this track?")) {
      try {
        console.log("Deleting from DB...");
        await db.tracks.delete(id);
        console.log("DB delete successful");
        
        if (activeTrack?.id === id) {
          setActiveTrack(null);
          setAudioSrc(null);
        }
        
        console.log("Force-reloading tracks from DB...");
        await loadTracksFromDb();
        console.log("Track reload successful.");

      } catch (error) {
        console.error("Delete failed:", error);
      }
    } else {
       console.log("Delete cancelled by user.");
    }
  };

  const handleRenameTrack = async (id: number, newTitle: string) => {
    console.log(`Rename triggered for ID: ${id} with new title: "${newTitle}"`);
    try {
      console.log("Updating DB...");
      await db.tracks.update(id, { title: newTitle });
      console.log("DB update successful");
      
      if (activeTrack?.id === id) {
        setActiveTrack(prev => prev ? { ...prev, title: newTitle } : null);
      }

      console.log("Force-reloading tracks from DB...");
      await loadTracksFromDb();
      console.log("Track reload successful.");
      
    } catch(error) {
        console.error("Rename failed:", error);
    }
  };
  
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 20));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 1));

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
      <Header />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <TrackList 
          tracks={tracks}
          activeTrackId={activeTrack?.id}
          onSelectTrack={handleSelectTrack}
          onDeleteTrack={handleDeleteTrack}
          onRenameTrack={handleRenameTrack}
        />

        {!activeTrack ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Music className="w-24 h-24 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold tracking-tight mb-2">No Track Loaded</h2>
            <p className="text-muted-foreground mb-6">Import a track or select one from your library.</p>
            <ImportDialog onImportTrack={handleImportTrack} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">
                  {activeTrack.title}
                </h2>
                <p className="text-sm text-muted-foreground">{activeTrack.originalFilename}</p>
              </div>
               <div className="flex items-center gap-2">
                <ImportDialog onImportTrack={handleImportTrack} />
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
              durationInSeconds={activeTrack.duration}
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
        )}
      </main>
    </div>
  );
}
