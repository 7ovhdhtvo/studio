
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/stagehand/header';
import PlaybackControls from '@/components/stagehand/playback-controls';
import WaveformDisplay from '@/components/stagehand/waveform-display';
import SpeedControl from '@/components/stagehand/speed-control';
import VolumeControl from '@/components/stagehand/volume-control';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Clapperboard } from 'lucide-react';
import ImportDialog from '@/components/stagehand/import-dialog';
import TrackList from '@/components/stagehand/track-list';
import { useAudioStorage } from '@/hooks/useAudioStorage';
import type { AudioFile, Folder, AutomationPoint } from '@/lib/storage-manager';
import DebugConsole from '@/components/stagehand/debug-console';
import { logger } from '@/lib/logger';
import { generateWaveformData, type WaveformData } from '@/lib/waveform';
import { storageManager } from '@/lib/storage-manager';
import MetronomeControl from '@/components/stagehand/metronome-control';
import PlaybackModeView from '@/components/stagehand/playback-mode-view';

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
    updateTrackAutomation,
  } = useAudioStorage();

  const [activeTrack, setActiveTrack] = useState<AudioFile | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showStereo, setShowStereo] = useState(false);
  const [isPlaybackMode, setIsPlaybackMode] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [showVolumeAutomation, setShowVolumeAutomation] = useState(false);
  const [showSpeedAutomation, setShowSpeedAutomation] = useState(false);
  const [zoom, setZoom] = useState(1); // 1 = 100%
  const [speed, setSpeed] = useState(100); // Global speed in %
  const [volume, setVolume] = useState(75); // Global volume in % (0-100)
  const [openControlPanel, setOpenControlPanel] = useState<OpenControlPanel>(null);
  const [progress, setProgress] = useState(0); // Progress in percentage
  const [showMockupCurve, setShowMockupCurve] = useState(false);
  
  const [volumePoints, setVolumePoints] = useState<AutomationPoint[]>([]);
  const [speedPoints, setSpeedPoints] = useState<AutomationPoint[]>([
    { id: '1', time: 3.2, value: 75 },
    { id: '2', time: 6.8, value: 125 },
  ]);
  const [isDraggingAutomation, setIsDraggingAutomation] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>();
  const isScrubbingRef = useRef(false);
  const waveformContainerRef = useRef<HTMLDivElement>(null);

  const duration = audioRef.current?.duration ?? activeTrack?.duration ?? 0;
  const currentTime = audioRef.current?.currentTime ?? 0;

  const getAutomationValue = useCallback((points: AutomationPoint[], time: number): number | null => {
    if (points.length === 0) return null;
    
    // Sort points by time to ensure correct interpolation
    const sortedPoints = [...points].sort((a, b) => a.time - b.time);

    if (time <= sortedPoints[0].time) return sortedPoints[0].value;
    if (time >= sortedPoints[sortedPoints.length - 1].time) return sortedPoints[sortedPoints.length - 1].value;
    if (sortedPoints.length === 1) return sortedPoints[0].value;


    let prevPoint = sortedPoints[0];
    for (let i = 1; i < sortedPoints.length; i++) {
        const nextPoint = sortedPoints[i];
        if (time >= prevPoint.time && time <= nextPoint.time) {
            const timeFraction = (time - prevPoint.time) / (nextPoint.time - prevPoint.time);
            return prevPoint.value + timeFraction * (nextPoint.value - prevPoint.value);
        }
        prevPoint = nextPoint;
    }

    return null;
  }, []);

  const stopProgressLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const startProgressLoop = useCallback(() => {
    stopProgressLoop();
    const animate = () => {
      if (audioRef.current && !isScrubbingRef.current && !audioRef.current.paused) {
        const audio = audioRef.current;
        const newProgress = (audio.currentTime / audio.duration) * 100;
        setProgress(newProgress);

        if (showVolumeAutomation && volumePoints.length > 0 && !isDraggingAutomation) {
            const automationVolume = getAutomationValue(volumePoints, audio.currentTime);
            if (automationVolume !== null) {
                const newClampedVolume = Math.max(0, Math.min(100, automationVolume));
                audio.volume = newClampedVolume / 100;
                setVolume(Math.round(newClampedVolume));
            }
        } else {
            // No automation points, use master volume
            audio.volume = volume / 100;
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [stopProgressLoop, showVolumeAutomation, volumePoints, getAutomationValue, isDraggingAutomation, volume]);

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

  
  // Effect for loading the audio source
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (audioSrc) {
      if (audio.src !== audioSrc) {
        logger.log("useEffect[audioSrc]: New audio source detected. Loading.", { audioSrc });
        audio.src = audioSrc;
        audio.load();
      }
    } else {
      logger.log("useEffect[audioSrc]: Clearing audio source.");
      audio.src = "";
    }
  }, [audioSrc]);

  // Effect for handling play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && audioSrc) {
      audio.play().catch(error => {
        logger.error("Playback failed", error);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, audioSrc]);


  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  useEffect(() => {
    if (audioRef.current && (!showVolumeAutomation || volumePoints.length === 0)) {
        audioRef.current.volume = volume / 100;
    }
  }, [volume, showVolumeAutomation, volumePoints]);

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

  // Center on playhead when zooming
  useEffect(() => {
    if (waveformContainerRef.current && progress > 0) {
      const scrollContainer = waveformContainerRef.current;
      const totalWidth = scrollContainer.scrollWidth;
      const playheadPosition = (progress / 100) * totalWidth;
      const visibleWidth = scrollContainer.clientWidth;
      const newScrollLeft = playheadPosition - visibleWidth / 2;
      
      scrollContainer.scrollLeft = Math.max(0, newScrollLeft);
    }
  }, [zoom, progress]);

  const handleSetIsPlaying = (playing: boolean) => {
    if (!audioSrc && playing) {
      logger.log('handleSetIsPlaying: Cannot play, no audio source.');
      return;
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
  
  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.5, 20);
    setZoom(newZoom);
    if (activeTrack) {
        regenerateWaveform(activeTrack, newZoom);
    }
  };
  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.5, 1);
    setZoom(newZoom);
    if (activeTrack) {
        regenerateWaveform(activeTrack, newZoom);
    }
  };

  const handleSelectTrack = async (track: AudioFile) => {
    logger.log('handleSelectTrack: Track selected.', { trackId: track.id, title: track.title });
    const wasPlaying = isPlaying;
    
    handleSetIsPlaying(false);
    
    setProgress(0);
    setActiveTrack(track);
    const trackVolumePoints = track.volumeAutomation || [];
    setVolumePoints(trackVolumePoints);
    if (trackVolumePoints.length === 0) {
      setVolume(75); // Default volume if no automation
    } else {
       // If points exist, find the value at time 0
       const initialVolume = getAutomationValue(trackVolumePoints, 0);
       setVolume(initialVolume ?? 75);
    }

    setWaveformData(null);
    setAudioSrc(null); // Clear previous source immediately

    try {
      const url = await getAudioUrl(track.id);
      if (url) {
        logger.log('handleSelectTrack: Audio URL received.', { url });
        setAudioSrc(url);
        
        await regenerateWaveform(track, zoom);

        if (wasPlaying) {
          // A short delay might be needed for the audio element to be ready
          setTimeout(() => handleSetIsPlaying(true), 50);
        }
      } else {
        logger.error('handleSelectTrack: Failed to get audio URL.', { trackId: track.id });
      }
    } catch (error) {
       logger.error('handleSelectTrack: Error during track selection process.', { error });
       setAudioSrc(null);
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
    if (audioRef.current && audioRef.current.duration) {
      const newTime = (newProgress / 100) * audioRef.current.duration;
      if (Math.abs(audioRef.current.currentTime - newTime) > 0.1) {
        audioRef.current.currentTime = newTime;
      }
    }
    setProgress(newProgress);
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

  const handleAutomationDragStart = () => {
    setIsDraggingAutomation(true);
  }

  const handleAutomationDragEnd = () => {
    setIsDraggingAutomation(false);
    if (activeTrack) {
        updateTrackAutomation(activeTrack.id, volumePoints);
    }
  };

  const handleSetVolumePoints = (points: AutomationPoint[]) => {
    setVolumePoints(points);
    // Defer saving until drag ends
  };

  const handleUpdateAutomationPoint = (id: string, newName: string, newTime: number) => {
    if (!activeTrack) return;
    const updatedPoints = volumePoints.map(p =>
      p.id === id ? { ...p, name: newName, time: newTime } : p
    );
    setVolumePoints(updatedPoints);
    updateTrackAutomation(activeTrack.id, updatedPoints);
  };
  
  const handleDeleteAutomationPoint = (id: string) => {
    if (!activeTrack) return;
    const updatedPoints = volumePoints.filter(p => p.id !== id);
    setVolumePoints(updatedPoints);
    updateTrackAutomation(activeTrack.id, updatedPoints);
  };

  const getTracksInCurrentProject = () => {
    if (!activeProjectId) return [];
    const project = folders.find(f => f.id === activeProjectId);
    if (!project) return [];

    const foldersInProject = folders.filter(f => f.parentId === activeProjectId);
    const folderIdsInProject = [activeProjectId, ...foldersInProject.map(f => f.id)];

    return tracks.filter(t => t.folderId && folderIdsInProject.includes(t.folderId));
  }

  return (
    <>
      <audio 
        ref={audioRef} 
        onEnded={handleAudioEnded} 
        onPlay={() => startProgressLoop()} 
        onPause={() => stopProgressLoop()} 
        onLoadedData={() => {
          if (isPlaying) {
            audioRef.current?.play().catch(e => logger.error("Playback failed in onLoadedData", e));
          }
        }}
      />
      {isPlaybackMode ? (
        <PlaybackModeView
          isPlaying={isPlaying}
          onTogglePlay={() => handleSetIsPlaying(!isPlaying)}
          volume={volume}
          onVolumeChange={setVolume}
          onExit={() => setIsPlaybackMode(false)}
          trackTitle={activeTrack?.title ?? "No Track Loaded"}
          trackArtist={activeTrack?.originalName ?? ""}
          onBackToStart={handleBackToStart}
          currentTime={currentTime}
          duration={duration}
          isLooping={isLooping}
          onToggleLoop={toggleLoop}
          projectTracks={getTracksInCurrentProject()}
          onSelectTrack={handleSelectTrack}
          activeTrackId={activeTrack?.id}
        />
      ) : (
        <div className="flex h-screen w-full flex-col bg-background text-foreground">
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
                    <Button 
                      variant={showStereo ? 'default' : 'outline'} 
                      onClick={() => setShowStereo(s => !s)}
                    >
                      Stereo
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleZoomOut}>
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleZoomIn}>
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setIsPlaybackMode(true)} disabled={!activeTrack}>
                      <Clapperboard className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <WaveformDisplay 
                  waveformData={waveformData}
                  speedPoints={speedPoints}
                  onSpeedPointsChange={setSpeedPoints}
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
                  scrollContainerRef={waveformContainerRef}
                  masterVolume={volume}
                  automationPoints={volumePoints}
                  onAutomationPointsChange={handleSetVolumePoints}
                  onAutomationDragStart={handleAutomationDragStart}
                  onAutomationDragEnd={handleAutomationDragEnd}
                  showMockupCurve={showMockupCurve}
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
                    volume={volume}
                    onVolumeChange={setVolume}
                    showAutomation={showVolumeAutomation}
                    onToggleAutomation={setShowVolumeAutomation}
                    automationPoints={volumePoints}
                    onUpdatePoint={handleUpdateAutomationPoint}
                    onDeletePoint={handleDeleteAutomationPoint}
                    showMockupCurve={showMockupCurve}
                    onToggleMockupCurve={setShowMockupCurve}
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
      )}
    </>
  );
}
