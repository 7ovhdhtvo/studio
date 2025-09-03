
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
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
import type { AudioFile, Folder } from '@/lib/storage-manager';
import DebugConsole from '@/components/stagehand/debug-console';
import { logger } from '@/lib/logger';
import { generateWaveformData, type WaveformData } from '@/lib/waveform';
import { storageManager } from '@/lib/storage-manager';

export type AutomationPoint = {
  time: number;
  value: number;
};

export type OpenControlPanel = 'volume' | 'speed' | 'metronome' | null;

export default function Home() {
  const { 
    tracks, 
    folders,
    isLoading, 
    importAudio, 
    deleteTrack,
    deleteFolder,
    renameTrack, 
    getAudioUrl,
    createFolder,
    createProject,
    renameFolder,
    moveTrackToFolder,
    emptyTrash,
    recoverTrack,
    recoverFolder,
  } = useAudioStorage();

  const [activeTrack, setActiveTrack] = useState<AudioFile | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showStereo, setShowStereo] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [showVolumeAutomation, setShowVolumeAutomation] = useState(true);
  const [showSpeedAutomation, setShowSpeedAutomation] = useState(false);
  const [zoom, setZoom] = useState(1); // 1 = 100%
  const [speed, setSpeed] = useState(100); // Global speed in %
  const [openControlPanel, setOpenControlPanel] = useState<OpenControlPanel>(null);
  const [progress, setProgress] = useState(0); // Progress in percentage
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>();
  const isScrubbingRef = useRef(false);

  const duration = audioRef.current?.duration ?? activeTrack?.duration ?? 0;

  const stopProgressLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const startProgressLoop = useCallback(() => {
    stopProgressLoop();
    const animate = () => {
      if (audioRef.current && !isScrubbingRef.current && !audioRef.current.paused) {
        const newProgress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setProgress(newProgress);
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [stopProgressLoop]);

  useEffect(() => {
    if (isPlaying) {
      startProgressLoop();
    } else {
      stopProgressLoop();
    }
    return stopProgressLoop;
  }, [isPlaying, startProgressLoop, stopProgressLoop]);


  useEffect(() => {
    if (!isLoading && folders.length > 0) {
      const firstProject = folders.find(f => f.isProject);
      if (firstProject && !activeProjectId) {
        setActiveProjectId(firstProject.id);
      }
    }
  }, [isLoading, folders, activeProjectId]);

  
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audioSrc) {
      if (audio.src !== audioSrc) {
        logger.log("useEffect[audioSrc]: New audio source detected. Loading.", { audioSrc });
        audio.src = audioSrc;
        audio.load();
        const handleCanPlay = () => {
           logger.log("useEffect[audioSrc]: Audio can play.", { isPlaying });
           if (isPlaying) {
             audio.play().catch(e => logger.error("Playback failed in src effect", e));
           }
           audio.removeEventListener('canplay', handleCanPlay);
        };
        audio.addEventListener('canplay', handleCanPlay);
      }
    } else if (audio && !audioSrc) {
       logger.log("useEffect[audioSrc]: Clearing audio source.");
       audio.src = "";
    }
  }, [audioSrc, isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  const regenerateWaveform = useCallback(async (track: AudioFile, currentZoom: number) => {
    try {
      const audioBlob = await storageManager.getAudioBlob(track.id);
      if (audioBlob) {
        const data = await generateWaveformData(await audioBlob.arrayBuffer(), currentZoom);
        setWaveformData(data);
      }
    } catch (error) {
      logger.error('regenerateWaveform: Failed to generate waveform.', { error });
    }
  }, []);

  useEffect(() => {
    if (activeTrack) {
      regenerateWaveform(activeTrack, zoom);
    }
  }, [zoom, activeTrack, regenerateWaveform]);


  const [volumePoints, setVolumePoints] = useState<AutomationPoint[]>([
    { time: 2.5, value: 80 },
    { time: 5.0, value: 50 },
  ]);
  const [speedPoints, setSpeedPoints] = useState<AutomationPoint[]>([
    { time: 3.2, value: 75 },
    { time: 6.8, value: 125 },
  ]);
  
  const handleSetIsPlaying = (playing: boolean) => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) {
      setIsPlaying(false);
      return;
    }

    if (playing) {
      audio.play().catch(e => {
        logger.error("Playback failed in handleSetIsPlaying", e);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
    setIsPlaying(playing);
  };


  const toggleLoop = () => {
    logger.log('toggleLoop: Toggling loop state.');
    setIsLooping(prev => !prev);
  }

  const handleToggleControlPanel = (panel: OpenControlPanel) => {
    setOpenControlPanel(prev => (prev === panel ? null : panel));
  };
  
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 20));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 1));

  const handleSelectTrack = async (track: AudioFile) => {
    logger.log('handleSelectTrack: Track selected.', { trackId: track.id, title: track.title });
    const wasPlaying = isPlaying;
    
    // Stop current playback before switching
    if (isPlaying) {
      handleSetIsPlaying(false);
    }

    setProgress(0);
    setActiveTrack(track);
    setWaveformData(null); // Clear old waveform data

    try {
      const url = await getAudioUrl(track.id);
      logger.log('handleSelectTrack: Audio URL received.', { url });
      setAudioSrc(url);
      
      if (wasPlaying) {
        // This will be handled by the useEffect for audioSrc
        handleSetIsPlaying(true);
      }
    } catch (error) {
       logger.error('handleSelectTrack: Failed to get audio URL or generate waveform.', { error });
    }
  };


  const handleDeleteTrack = async (id: string) => {
    await deleteTrack(id);
    if (activeTrack?.id === id) {
      setActiveTrack(null);
      setAudioSrc(null);
      setProgress(0);
    }
  }

  const handleRenameTrack = async (id: string, newTitle: string) => {
    await renameTrack(id, newTitle);
  }
  
  const handleRecoverTrack = async (id: string) => {
    await recoverTrack(id);
  }
  
  const handleCreateFolder = async () => {
    if (activeProjectId) {
      await createFolder(activeProjectId);
    } else {
      logger.error("No active project selected to create a folder in.");
    }
  };
  
  const handleCreateProject = async () => {
    const newProjectId = await createProject();
    if (newProjectId) {
      setActiveProjectId(newProjectId);
    }
  }
  
  const handleBackToStart = () => {
    logger.log('handleBackToStart: Triggered.');
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setProgress(0);
    }
  }

  const handleProgressChange = (newProgress: number) => {
    setProgress(newProgress);
    if (audioRef.current && audioRef.current.duration) {
      const newTime = (newProgress / 100) * audioRef.current.duration;
      if (Math.abs(audioRef.current.currentTime - newTime) > 0.1) {
        audioRef.current.currentTime = newTime;
      }
    }
  };

  const handleAudioEnded = () => {
    logger.log('handleAudioEnded: Audio track ended.', { isLooping });
    if (!isLooping) {
        handleSetIsPlaying(false);
        setProgress(0);
    }
  };
  
  const handleScrubEnd = () => {
    isScrubbingRef.current = false;
    if (isPlaying) {
      startProgressLoop();
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground">
      <audio ref={audioRef} onEnded={handleAudioEnded} onPlay={() => startProgressLoop()} onPause={() => stopProgressLoop()} />
      <Header />
      <main className="grid flex-1 grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr]">
        <div className="flex flex-col border-r bg-card">
          <div className="p-4 flex justify-between items-center border-b">
            <h2 className="text-lg font-semibold">Track Library</h2>
            <ImportDialog onImportTrack={(file) => importAudio(file, null)} />
          </div>
          <TrackList 
            tracks={tracks}
            folders={folders}
            activeTrackId={activeTrack?.id}
            activeProjectId={activeProjectId}
            onSelectTrack={handleSelectTrack}
            onSelectProject={setActiveProjectId}
            onDeleteTrack={handleDeleteTrack}
            onDeleteFolder={deleteFolder}
            onRenameTrack={handleRenameTrack}
            onCreateFolder={handleCreateFolder}
            onCreateProject={handleCreateProject}
            onRenameFolder={renameFolder}
            onMoveTrackToFolder={moveTrackToFolder}
            onEmptyTrash={emptyTrash}
            onRecoverTrack={handleRecoverTrack}
            onRecoverFolder={recoverFolder}
            onImportTrack={importAudio}
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
                <Button variant={showStereo ? 'secondary' : 'outline'} onClick={() => setShowStereo(s => !s)}>Stereo</Button>
                <Button variant="outline" size="icon" onClick={handleZoomOut}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleZoomIn}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <WaveformDisplay 
              waveformData={waveformData}
              showVolumeAutomation={showVolumeAutomation}
              showSpeedAutomation={showSpeedAutomation}
              durationInSeconds={duration}
              zoom={zoom}
              progress={progress}
              onProgressChange={handleProgressChange}
              isPlaying={isPlaying}
              onScrubStart={() => isScrubbingRef.current = true}
              onScrubEnd={handleScrubEnd}
              showStereo={showStereo}
            />
            <PlaybackControls 
              isPlaying={isPlaying} 
              setIsPlaying={handleSetIsPlaying}
              isLooping={isLooping}
              onToggleLoop={toggleLoop}
              onBackToStart={handleBackToStart}
            />

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
