"use client";

import { useState } from 'react';
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

  const [volumePoints, setVolumePoints] = useState<AutomationPoint[]>([
    { time: 2.5, value: 80 },
    { time: 5.0, value: 50 },
  ]);
  const [speedPoints, setSpeedPoints] = useState<AutomationPoint[]>([
    { time: 3.2, value: 75 },
    { time: 6.8, value: 125 },
  ]);
  
  const [isSidebarOpen, setSidebarOpen] = useState(true);


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

  const durationInSeconds = selectedTrack ? parseDuration(selectedTrack.duration) : 0;

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 20));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 1));

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <TrackList 
        isOpen={isSidebarOpen}
        projects={Object.keys(projects)}
        currentProject={currentProject}
        onSelectProject={handleSelectProject}
        onNewProject={handleCreateNewProject}
        onAddFolder={handleAddFolder}
        tracks={tracks} 
        selectedTrack={selectedTrack} 
        onSelectTrack={setSelectedTrack}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Header onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
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
            <MetronomeControl />
          </div>
        </div>
      </main>
    </div>
  );
}
