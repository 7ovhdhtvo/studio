"use client";

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/stagehand/header';
import TrackList from '@/components/stagehand/track-list';
import PlaybackControls from '@/components/stagehand/playback-controls';
import WaveformDisplay from '@/components/stagehand/waveform-display';
import SpeedControl from '@/components/stagehand/speed-control';
import VolumeControl from '@/components/stagehand/volume-control';
import MetronomeControl from '@/components/stagehand/metronome-control';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut } from 'lucide-react';
import type { TrackItem, Track } from '@/components/stagehand/track-list';

export type AutomationPoint = {
  time: number;
  value: number;
};

export type OpenControlPanel = 'volume' | 'speed' | 'metronome' | null;

const initialProjects: { [key: string]: TrackItem[] } = {
  'Show - 24.07.24': [
    { 
      type: 'folder', 
      id: 100, 
      name: 'Intro Music', 
      children: [
        { id: 1, type: 'track', title: 'Opening Scene', originalFilename: 'opening_final_v3.wav', artist: 'Soundtrack', duration: '3:45' },
        { id: 4, type: 'track', title: 'Walk-on Music', originalFilename: 'generic_walkon.mp3', artist: 'Generic Band', duration: '2:15' },
      ] 
    },
    { 
      type: 'folder', 
      id: 101, 
      name: 'Sound Effects', 
      children: [
        { id: 3, type: 'track', title: 'Thunder SFX', originalFilename: 'sfx_thunder_rain.wav', artist: 'Effects', duration: '0:12' },
      ]
    },
    { id: 2, type: 'track', title: 'Interlude Music', originalFilename: 'interlude_temp.mp3', artist: 'Soundtrack', duration: '1:30' },
    { id: 5, type: 'track', title: 'Closing Theme', originalFilename: 'closing_theme_master.flac', artist: 'Soundtrack', duration: '4:02' },
  ],
  'Rehearsal - 20.07.24': [
      { id: 6, type: 'track', title: 'Test Track 1', originalFilename: 'test_1.wav', artist: 'Test', duration: '1:00' },
      { id: 7, type: 'track', title: 'Test Track 2', originalFilename: 'test_2.mp3', artist: 'Test', duration: '2:30' },
  ]
};

const findFirstTrack = (items: TrackItem[]): Track | null => {
  for (const item of items) {
    if (item.type === 'track') {
      return item;
    }
    if (item.type === 'folder') {
      const track = findFirstTrack(item.children);
      if (track) return track;
    }
  }
  return null;
};

const parseDuration = (duration: string): number => {
    const parts = duration.split(':').map(Number);
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return 0;
}

export default function Home() {
  const [projects, setProjects] = useState(initialProjects);
  const [currentProject, setCurrentProject] = useState('Show - 24.07.24');

  const tracks = projects[currentProject] || [];
  
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(findFirstTrack(tracks));
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVolumeAutomation, setShowVolumeAutomation] = useState(true);
  const [showSpeedAutomation, setShowSpeedAutomation] = useState(false);
  const [zoom, setZoom] = useState(1); // 1 = 100%
  const [speed, setSpeed] = useState(100); // Global speed in %
  const [openControlPanel, setOpenControlPanel] = useState<OpenControlPanel>(null);

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.error(`Failed to acquire wake lock: ${err}`);
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        } catch (err) {
          console.error(`Failed to release wake lock: ${err}`);
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


  const [volumePoints, setVolumePoints] = useState<AutomationPoint[]>([
    { time: 2.5, value: 80 },
    { time: 5.0, value: 50 },
  ]);
  const [speedPoints, setSpeedPoints] = useState<AutomationPoint[]>([
    { time: 3.2, value: 75 },
    { time: 6.8, value: 125 },
  ]);
  
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const handleToggleControlPanel = (panel: OpenControlPanel) => {
    setOpenControlPanel(prev => (prev === panel ? null : panel));
  };


  const handleSelectProject = (projectName: string) => {
    setCurrentProject(projectName);
    const firstTrack = findFirstTrack(projects[projectName] || []);
    setSelectedTrack(firstTrack);
  };

  const handleCreateNewProject = () => {
    const newProjectName = `New Project ${Object.keys(projects).length + 1}`;
    setProjects(prev => ({ ...prev, [newProjectName]: [] }));
    setCurrentProject(newProjectName);
    setSelectedTrack(null);
  }
  
  const handleAddFolder = () => {
    const newFolder: TrackItem = {
      type: 'folder',
      id: Date.now(),
      name: `New Folder ${projects[currentProject].filter(i => i.type === 'folder').length + 1}`,
      children: [],
    };
    setProjects(prev => ({
      ...prev,
      [currentProject]: [...prev[currentProject], newFolder],
    }));
  }

  const handleImportTrack = (file: File) => {
    const audio = new Audio(URL.createObjectURL(file));
    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration;
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      const newTrack: Track = {
        id: Date.now(),
        type: 'track',
        title: file.name.replace(/\.[^/.]+$/, ""),
        originalFilename: file.name,
        artist: 'Unknown Artist',
        duration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      };

      setProjects(prev => {
        const currentTracks = prev[currentProject] || [];
        return {
          ...prev,
          [currentProject]: [...currentTracks, newTrack]
        }
      });
      URL.revokeObjectURL(audio.src);
    });
  };

  const durationInSeconds = selectedTrack ? parseDuration(selectedTrack.duration) : 0;

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 20));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 1));

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <TrackList 
        isOpen={isSidebarOpen}
        onToggle={() => setSidebarOpen(!isSidebarOpen)}
        projects={Object.keys(projects)}
        currentProject={currentProject}
        onSelectProject={handleSelectProject}
        onNewProject={handleCreateNewProject}
        onAddFolder={handleAddFolder}
        onImportTrack={handleImportTrack}
        tracks={tracks} 
        selectedTrack={selectedTrack} 
        onSelectTrack={setSelectedTrack}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">
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
      </main>
    </div>
  );
}
