
"use client";

import { useState, useEffect, useCallback } from 'react';
import { storageManager, type AudioFile } from '@/lib/storage-manager';
import { logger } from '@/lib/logger';

export function useAudioStorage() {
  const [tracks, setTracks] = useState<AudioFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const refreshTracks = useCallback(() => {
      logger.log('useAudioStorage: Refreshing tracks from storageManager.');
      const freshTracks = [...storageManager.getAllTracks()];
      setTracks(freshTracks);
      logger.log(`useAudioStorage: State updated with ${freshTracks.length} tracks.`);
  }, []);

  useEffect(() => {
    const init = async () => {
      logger.log('useAudioStorage: Initializing and loading tracks.');
      await storageManager.initialize();
      refreshTracks();
      setIsLoading(false);
    };
    init();
  }, [refreshTracks]);
  
  const importAudio = useCallback(async (file: File) => {
    logger.log('useAudioStorage: Importing audio file.', { name: file.name });
    try {
      const audioFile = await storageManager.saveAudioFile(file);
      refreshTracks();
      logger.log('useAudioStorage: Import successful.', { id: audioFile.id });
      return { success: true, file: audioFile };
    } catch (error) {
      logger.error('useAudioStorage: Import failed.', { error });
      return { success: false, error };
    }
  }, [refreshTracks]);
  
  const deleteTrack = useCallback(async (id: string) => {
    logger.log('useAudioStorage: Deleting track.', { id });
    const success = await storageManager.deleteAudioFile(id);
    if (success) {
      refreshTracks();
      logger.log('useAudioStorage: Track deleted and list refreshed.');
    } else {
       logger.error('useAudioStorage: Track deletion failed in storageManager.');
    }
    return success;
  }, [refreshTracks]);
  
  const renameTrack = useCallback(async (id: string, newTitle: string) => {
    logger.log('useAudioStorage: Renaming track.', { id, newTitle });
    
    if (!newTitle || newTitle.trim().length === 0) {
      logger.error('useAudioStorage: Rename failed. New title is empty.');
      return false;
    }

    const success = await storageManager.renameAudioFile(id, newTitle.trim());
    if (success) {
      refreshTracks();
      logger.log('useAudioStorage: Track renamed and list refreshed.');
    } else {
      logger.error('useAudioStorage: Track rename failed in storageManager.');
    }
    return success;
  }, [refreshTracks]);
  
  const getAudioUrl = useCallback(async (id: string) => {
    return await storageManager.getAudioUrl(id);
  }, []);
  
  return {
    tracks,
    isLoading,
    importAudio,
    deleteTrack,
    renameTrack,
    getAudioUrl,
  };
}
