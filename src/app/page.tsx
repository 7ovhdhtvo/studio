
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/stagehand/header';
import PlaybackControls from '@/components/stagehand/playback-controls';
import WaveformDisplay from '@/components/stagehand/waveform-display';
import SpeedControl from '@/components/stagehand/speed-control';
import VolumeControl from '@/components/stagehand/volume-control';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ZoomIn, ZoomOut, Clapperboard } from 'lucide-react';
import ImportDialog from '@/components/stagehand/import-dialog';
import TrackList from '@/components/stagehand/track-list';
import { useAudioStorage } from '@/hooks/useAudioStorage';
import type { AudioFile, Folder, AutomationPoint, Marker } from '@/lib/storage-manager';
import DebugConsole from '@/components/stagehand/debug-console';
import { logger } from '@/lib/logger';
import { generateWaveformData, type WaveformData } from '@/lib/waveform';
import { storageManager } from '@/lib/storage-manager';
import MetronomeControl from '@/components/stagehand/metronome-control';
import PlaybackModeView from '@/components/stagehand/playback-mode-view';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import MarkerControl from '@/components/stagehand/marker-control';
import MarkerPlaybackControls from '@/components/stagehand/marker-playback-controls';

export type OpenControlPanel = 'volume' | 'speed' | 'metronome' | 'markers' | null;

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
    updateTrackMarkers,
  } = useAudioStorage();

  const [activeTrack, setActiveTrack] = useState<AudioFile | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showStereo, setShowStereo] = useState(false);
  const [isPlaybackMode, setIsPlaybackMode] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [showVolumeAutomation, setShowVolumeAutomation] = useState(false);
  const [isAutomationActive, setIsAutomationActive] = useState(false);
  const [showSpeedAutomation, setShowSpeedAutomation] = useState(false);
  const [zoom, setZoom] = useState(1); // 1 = 100%
  const [speed, setSpeed] = useState(100); // Global speed in %
  const [volume, setVolume] = useState(75); // Global volume in % (0-100)
  const [openControlPanel, setOpenControlPanel] = useState<OpenControlPanel>(null);
  const [progress, setProgress] = useState(0); // Progress in percentage
  const [startDelay, setStartDelay] = useState(0);
  const [applyDelayToLoop, setApplyDelayToLoop] = useState(false);
  
  const [volumePoints, setVolumePoints] = useState<AutomationPoint[]>([]);
  const [speedPoints, setSpeedPoints] = useState<AutomationPoint[]>([
    { id: '1', time: 3.2, value: 75 },
    { id: '2', time: 6.8, value: 125 },
  ]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [playbackStartTime, setPlaybackStartTime] = useState(0);
  const [showMarkers, setShowMarkers] = useState(false);
  const [isMarkerModeActive, setIsMarkerModeActive] = useState(false);
  
  const [isDraggingAutomation, setIsDraggingAutomation] = useState(false);
  const [debugState, setDebugState] = useState('Ready');

  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>();
  const playbackTimeoutRef = useRef<NodeJS.Timeout>();
  const isScrubbingRef = useRef(false);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    if (isMobile) {
      setIsLibraryOpen(false);
    } else {
      setIsLibraryOpen(true);
    }
  }, [isMobile]);

  const duration = audioRef.current?.duration ?? activeTrack?.duration ?? 0;
  const currentTime = audioRef.current?.currentTime ?? 0;

  const getAutomationValue = useCallback((points: AutomationPoint[], time: number): number | null => {
    if (points.length === 0) return null;
    
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

        if (isAutomationActive && volumePoints.length > 0 && !isDraggingAutomation) {
            const automationVolume = getAutomationValue(volumePoints, audio.currentTime);
            if (automationVolume !== null) {
                const newClampedVolume = Math.max(0, Math.min(100, automationVolume));
                audio.volume = newClampedVolume / 100;
                setVolume(Math.round(newClampedVolume));
            }
        } else {
            audio.volume = volume / 100;
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [stopProgressLoop, isAutomationActive, volumePoints, getAutomationValue, isDraggingAutomation, volume]);


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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && audioSrc) {
        if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);

        const isAtStartTime = Math.abs(audio.currentTime - playbackStartTime) < 0.1;
        // Only set currentTime if it's not already at the start, to avoid re-triggering load
        if (!isAtStartTime) {
          audio.currentTime = playbackStartTime;
        }
        
        const delay = startDelay > 0 ? startDelay * 1000 : 0;
        
        playbackTimeoutRef.current = setTimeout(() => {
            if (audio.paused) {
                audio.play().catch(error => {
                    logger.error("Playback failed", error);
                    setIsPlaying(false);
                });
            }
        }, delay);
    } else {
        if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
        audio.pause();
    }
    
    return () => {
        if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
    }
  }, [isPlaying, audioSrc, startDelay, playbackStartTime]);


  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = false;
    }
  }, []);

  useEffect(() => {
    if (audioRef.current && !isAutomationActive) {
        audioRef.current.volume = volume / 100;
    }
  }, [volume, isAutomationActive]);

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
    
    if (activeTrack?.id === track.id) {
        handleSetIsPlaying(!isPlaying);
        return;
    }
    
    handleSetIsPlaying(false);
    
    setActiveTrack(track);
    const trackMarkers = track.markers || [];
    setMarkers(trackMarkers);
    const startMarker = trackMarkers.find(m => m.isPlaybackStart);
    setPlaybackStartTime(startMarker ? startMarker.time : 0);

    setProgress(startMarker ? (startMarker.time / track.duration) * 100 : 0);
    setVolumePoints(track.volumeAutomation || []);
    
    if ((track.volumeAutomation || []).length === 0) {
      setVolume(75);
    } else {
       const initialVolume = getAutomationValue(track.volumeAutomation!, 0);
       setVolume(initialVolume ?? 75);
    }

    setWaveformData(null);
    setAudioSrc(null);

    try {
      const url = await getAudioUrl(track.id);
      if (url) {
        logger.log('handleSelectTrack: Audio URL received.', { url });
        setAudioSrc(url);
        
        await regenerateWaveform(track, zoom);
        handleSetIsPlaying(true);

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
    if (!audioRef.current) return;
    audioRef.current.currentTime = playbackStartTime;
    setProgress((playbackStartTime / duration) * 100);
  };
  
  const handleJumpToPreviousMarker = () => {
    if (!audioRef.current || markers.length === 0) return handleBackToStart();

    const sortedMarkers = [...markers].sort((a, b) => a.time - b.time);
    const prevMarkers = sortedMarkers.filter(m => m.time < audioRef.current!.currentTime - 0.5);

    if (prevMarkers.length > 0) {
        const targetTime = prevMarkers[prevMarkers.length - 1].time;
        audioRef.current.currentTime = targetTime;
        setProgress((targetTime / duration) * 100);
    } else {
        handleBackToStart();
    }
  };

  const handleJumpToNextMarker = () => {
    if (!audioRef.current || markers.length === 0) return;

    const sortedMarkers = [...markers].sort((a, b) => a.time - b.time);
    const nextMarkers = sortedMarkers.filter(m => m.time > audioRef.current!.currentTime + 0.5);

    if (nextMarkers.length > 0) {
        const targetTime = nextMarkers[0].time;
        audioRef.current.currentTime = targetTime;
        setProgress((targetTime / duration) * 100);
    }
  };

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
    if (isLooping && audioRef.current) {
        audioRef.current.currentTime = playbackStartTime;
        setProgress((playbackStartTime / duration) * 100);

        if (applyDelayToLoop && startDelay > 0) {
            setIsPlaying(false);
            setTimeout(() => setIsPlaying(true), 10); // small timeout to re-trigger useEffect
        } else {
            audioRef.current.play().catch(e => logger.error("Loop playback failed", e));
        }
    } else {
        handleSetIsPlaying(false);
        if (audioRef.current) {
            audioRef.current.currentTime = playbackStartTime;
        }
        setProgress((playbackStartTime / duration) * 100);
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
    setDebugState('Dragging point...');
  }

  const handleAutomationDragEnd = () => {
    setIsDraggingAutomation(false);
    setDebugState('Ready');
    if (activeTrack) {
        console.log("handleAutomationDragEnd: Persisting points", { points: volumePoints });
        updateTrackAutomation(activeTrack.id, volumePoints);
    }
  };

  const handleSetVolumePoints = (points: AutomationPoint[]) => {
    setVolumePoints(points);
  };
  
  const handleSetMarkers = (newMarkers: Marker[]) => {
    setMarkers(newMarkers);
  }

  const handleMarkerDragEnd = () => {
    if (activeTrack) {
        updateTrackMarkers(activeTrack.id, markers);
    }
  }

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

  const handleDeleteAllAutomationPoints = () => {
    if (!activeTrack) return;
    setVolumePoints([]);
    updateTrackAutomation(activeTrack.id, []);
  };

  const handleUpdateMarker = (id: string, newName: string, newTime: number, isStart: boolean) => {
    if (!activeTrack) return;
    let updatedMarkers = markers.map(m => {
        const isThisMarker = m.id === id;
        const shouldBeStart = isThisMarker && isStart;
        return {
            ...m,
            name: isThisMarker ? newName : m.name,
            time: isThisMarker ? newTime : m.time,
            isPlaybackStart: shouldBeStart ? true : (isStart ? false : m.isPlaybackStart),
        };
    });

    const startMarker = updatedMarkers.find(m => m.isPlaybackStart);
    setPlaybackStartTime(startMarker ? startMarker.time : 0);

    setMarkers(updatedMarkers);
    updateTrackMarkers(activeTrack.id, updatedMarkers);
  };
  
  const handleSelectStartMarker = (markerId: string | null) => {
    if (!activeTrack) return;
    const updatedMarkers = markers.map(m => ({
        ...m,
        isPlaybackStart: m.id === markerId
    }));
    
    const startMarker = updatedMarkers.find(m => m.isPlaybackStart);
    setPlaybackStartTime(startMarker ? startMarker.time : 0);
    
    setMarkers(updatedMarkers);
    updateTrackMarkers(activeTrack.id, updatedMarkers);
  }

  const handleDeleteMarker = (id: string) => {
      if (!activeTrack) return;
      const updatedMarkers = markers.filter(m => m.id !== id);
      setMarkers(updatedMarkers);
      updateTrackMarkers(activeTrack.id, updatedMarkers);
  };

  const handleDeleteAllMarkers = () => {
      if (!activeTrack) return;
      setMarkers([]);
      updateTrackMarkers(activeTrack.id, []);
  };
  
  const handleBaselineVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
  };

  const getTracksInCurrentProject = () => {
    if (!activeProjectId) return [];
    const project = folders.find(f => f.id === activeProjectId);
    if (!project) return [];

    const foldersInProject = folders.filter(f => f.parentId === activeProjectId);
    const folderIdsInProject = [activeProjectId, ...foldersInProject.map(f => f.id)];

    return tracks.filter(t => t.folderId && folderIdsInProject.includes(t.folderId));
  }
  
  const trackListComponent = (
    <div className="flex flex-col border-r bg-card h-full">
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
        isPlaying={isPlaying}
      />
    </div>
  );

  return (
    <>
      <audio 
        ref={audioRef} 
        onEnded={handleAudioEnded} 
        onPlay={startProgressLoop} 
        onPause={stopProgressLoop} 
        onLoadedData={() => {
          if (isPlaying && audioRef.current && startDelay === 0) {
            audioRef.current.play().catch(e => logger.error("Playback failed in onLoadedData", e));
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
          <Header onToggleLibrary={() => setIsLibraryOpen(prev => !prev)} isLibraryOpen={isLibraryOpen} />
          <main className="flex flex-1 overflow-hidden">
            <aside
              className={cn(
                "absolute top-16 left-0 h-[calc(100vh-4rem)] flex-shrink-0 bg-card transition-transform duration-300 ease-in-out z-20",
                isLibraryOpen ? 'translate-x-0' : '-translate-x-full'
              )}
              style={{ width: '350px' }}
            >
              {trackListComponent}
            </aside>


            <div className={cn(
                "flex flex-col flex-1 overflow-y-auto p-6 lg:p-8 transition-all duration-300 ease-in-out",
                 isLibraryOpen && !isMobile ? "ml-[350px]" : "ml-0"
              )}>
              
              <DebugConsole />

              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">
                      {activeTrack?.title ?? "No Track Loaded"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {activeTrack?.originalName ?? "Import or select a track to begin"}
                      {!activeTrack && (
                        <span className="block text-xs mt-1">
                          Open Sidebar with top left button to import tracks
                        </span>
                      )}
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
                  durationInSeconds={duration}
                  zoom={zoom}
                  progress={progress}
                  onProgressChange={handleProgressChange}
                  onScrubStart={() => isScrubbingRef.current = true}
                  onScrubEnd={handleScrubEnd}
                  showStereo={showStereo}
                  scrollContainerRef={waveformContainerRef}
                  masterVolume={volume}
                  onMasterVolumeChange={handleBaselineVolumeChange}
                  isAutomationActive={isAutomationActive}
                  showVolumeAutomation={showVolumeAutomation}
                  automationPoints={volumePoints}
                  onAutomationPointsChange={handleSetVolumePoints}
                  onAutomationDragStart={handleAutomationDragStart}
                  onAutomationDragEnd={handleAutomationDragEnd}
                  markers={markers}
                  showMarkers={showMarkers}
                  isMarkerModeActive={isMarkerModeActive}
                  onMarkersChange={handleSetMarkers}
                  onMarkerDragEnd={handleMarkerDragEnd}
                  debugState={debugState}
                  setDebugState={setDebugState}
                  startDelay={startDelay}
                  onStartDelayChange={setStartDelay}
                  applyDelayToLoop={applyDelayToLoop}
                  onApplyDelayToLoopChange={setApplyDelayToLoop}
                />
                <PlaybackControls 
                  isPlaying={isPlaying} 
                  setIsPlaying={handleSetIsPlaying}
                  isLooping={isLooping}
                  onToggleLoop={toggleLoop}
                  onBackToStart={handleBackToStart}
                />

                {isMarkerModeActive && (
                  <MarkerPlaybackControls 
                    markers={markers}
                    onJumpToPrevious={handleJumpToPreviousMarker}
                    onJumpToNext={handleJumpToNextMarker}
                    onSelectStartMarker={handleSelectStartMarker}
                    selectedStartMarkerId={markers.find(m => m.isPlaybackStart)?.id || null}
                  />
                )}

                <div className="flex justify-center items-start gap-4 pt-4 flex-wrap">
                  <VolumeControl 
                    isOpen={openControlPanel === 'volume'}
                    onToggle={() => handleToggleControlPanel('volume')}
                    volume={volume}
                    onVolumeChange={setVolume}
                    showAutomation={showVolumeAutomation}
                    onToggleAutomation={setShowVolumeAutomation}
                    isAutomationActive={isAutomationActive}
                    onToggleIsAutomationActive={setIsAutomationActive}
                    automationPoints={volumePoints}
                    onUpdatePoint={handleUpdateAutomationPoint}
                    onDeletePoint={handleDeleteAutomationPoint}
                    onDeleteAllPoints={handleDeleteAllAutomationPoints}
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
                   <MarkerControl 
                      isOpen={openControlPanel === 'markers'}
                      onToggle={() => handleToggleControlPanel('markers')}
                      markers={markers}
                      showMarkers={showMarkers}
                      onToggleShowMarkers={setShowMarkers}
                      isMarkerModeActive={isMarkerModeActive}
                      onToggleIsMarkerModeActive={setIsMarkerModeActive}
                      onUpdateMarker={handleUpdateMarker}
                      onDeleteMarker={handleDeleteMarker}
                      onDeleteAllMarkers={handleDeleteAllMarkers}
                      onJumpToMarker={(time) => {
                        if (audioRef.current) {
                          handleProgressChange((time / duration) * 100);
                        }
                      }}
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
