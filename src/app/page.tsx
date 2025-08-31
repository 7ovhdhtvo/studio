
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
  'New Show': []
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
  const [currentProject, setCurrentProject] = useState('New Show');

  const tracks = projects[currentProject] || [];
  
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(findFirstTrack(tracks));
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVolumeAutomation, setShowVolumeAutomation] = useState(true);
  const [showSpeedAutomation, setShowSpeedAutomation] = useState(false);
  const [zoom, setZoom] = useState(1); // 1 = 100%
  const [speed, setSpeed] = useState(100); // Global speed in %
  const [openControlPanel, setOpenControlPanel] = useState<OpenControlPanel>(null);
  
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
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
  }, [isPlaying, audioSrc]);

  useEffect(() => {
    if (audioRef.current && audioSrc) {
      audioRef.current.src = audioSrc;
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback failed", e));
      }
    }
  }, [audioSrc, isPlaying]);


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
    setAudioSrc(null);
    setIsPlaying(false);
  };

  const handleCreateNewProject = () => {
    const newProjectName = prompt("Enter new project name:", `New Project ${Object.keys(projects).length + 1}`);
    if (newProjectName && !projects[newProjectName]) {
      setProjects(prev => ({ ...prev, [newProjectName]: [] }));
      setCurrentProject(newProjectName);
      setSelectedTrack(null);
    } else if (newProjectName) {
      alert("A project with this name already exists.");
    }
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
    const audioUrl = URL.createObjectURL(file);
    const audio = new Audio(audioUrl);
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
      setSelectedTrack(newTrack);
      setAudioSrc(audioUrl);
      // Do not revoke object URL as it's needed for playback
    });
  };
  
  const handleDeleteItem = (itemId: number, parentFolder?: TrackItem) => {
    const deleteRecursively = (items: TrackItem[], idToDelete: number): TrackItem[] => {
      return items.filter(item => {
        if (item.id === idToDelete) {
          if (item.type === 'track' && selectedTrack?.id === item.id) {
            setSelectedTrack(null);
            setAudioSrc(null);
            setIsPlaying(false);
          }
          return false;
        }
        if (item.type === 'folder') {
          item.children = deleteRecursively(item.children, idToDelete);
        }
        return true;
      });
    };

    setProjects(prev => {
      const newProjects = { ...prev };
      newProjects[currentProject] = deleteRecursively(newProjects[currentProject], itemId);
      return newProjects;
    });
  };

  const handleRenameItem = (itemId: number, newName: string) => {
    const renameRecursively = (items: TrackItem[]): TrackItem[] => {
      return items.map(item => {
        if (item.id === itemId) {
          if (item.type === 'track') {
            return { ...item, title: newName };
          }
          return { ...item, name: newName };
        }
        if (item.type === 'folder') {
          return { ...item, children: renameRecursively(item.children) };
        }
        return item;
      });
    };

    setProjects(prev => {
      const newProjects = { ...prev };
      newProjects[currentProject] = renameRecursively(newProjects[currentProject]);
      return newProjects;
    });
    
    if (selectedTrack?.id === itemId) {
      setSelectedTrack(prev => prev ? { ...prev, title: newName } : null);
    }
  };

  const handleSelectTrack = (track: Track) => {
    setSelectedTrack(track);
    setIsPlaying(false);
    setAudioSrc(null); 
    alert("Track selection is for display only. Please import a track to hear audio.")
  }

  const durationInSeconds = selectedTrack ? parseDuration(selectedTrack.duration) : 0;

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 20));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 1));

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
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
        onSelectTrack={(track) => {
            if(track.id !== selectedTrack?.id){
                handleSelectTrack(track);
            }
        }}
        onDeleteItem={handleDeleteItem}
        onRenameItem={handleRenameItem}
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
