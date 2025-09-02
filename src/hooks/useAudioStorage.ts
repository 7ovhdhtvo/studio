
"use client";

import { useState, useEffect, useCallback } from 'react';
import { storageManager, type AudioFile, type Folder } from '@/lib/storage-manager';
import { logger } from '@/lib/logger';

export function useAudioStorage() {
  const [tracks, setTracks] = useState<AudioFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(() => {
    logger.log('useAudioStorage: Refreshing data from storageManager.');
    const freshTracks = [...storageManager.getAllTracks()];
    const freshFolders = [...storageManager.getFolders()];
    setTracks(freshTracks);
    setFolders(freshFolders);
    logger.log(`useAudioStorage: State updated with ${freshTracks.length} tracks and ${freshFolders.length} folders.`);
  }, []);

  useEffect(() => {
    const init = async () => {
      logger.log('useAudioStorage: Initializing and loading data.');
      await storageManager.initialize();
      refreshData();
      setIsLoading(false);
    };
    init();
  }, [refreshData]);
  
  const importAudio = useCallback(async (file: File, folderId: string | null) => {
    logger.log('useAudioStorage: Importing audio file.', { name: file.name, folderId });
    try {
      const audioFile = await storageManager.saveAudioFile(file, folderId);
      refreshData();
      logger.log('useAudioStorage: Import successful.', { id: audioFile.id });
      return { success: true, file: audioFile };
    } catch (error) {
      logger.error('useAudioStorage: Import failed.', { error });
      return { success: false, error };
    }
  }, [refreshData]);
  
  const deleteTrack = useCallback(async (id: string) => {
    logger.log('useAudioStorage: Moving track to trash.', { id });
    const success = await storageManager.deleteAudioFile(id); // This now moves to trash
    if (success) {
      refreshData();
      logger.log('useAudioStorage: Track moved to trash and list refreshed.');
    } else {
       logger.error('useAudioStorage: Moving track to trash failed.');
    }
    return success;
  }, [refreshData]);

  const deleteFolder = useCallback(async (id: string) => {
    logger.log('useAudioStorage: Deleting folder.', { id });
    const success = await storageManager.deleteFolder(id);
    if (success) {
      refreshData();
      logger.log('useAudioStorage: Folder deleted and list refreshed.');
    } else {
      logger.error('useAudioStorage: Deleting folder failed.');
    }
    return success;
  }, [refreshData]);
  
  const renameTrack = useCallback(async (id: string, newTitle: string) => {
    logger.log('useAudioStorage: Renaming track.', { id, newTitle });
    
    if (!newTitle || newTitle.trim().length === 0) {
      logger.error('useAudioStorage: Rename failed. New title is empty.');
      return;
    }

    const success = await storageManager.renameAudioFile(id, newTitle.trim());
    if (success) {
      refreshData();
      logger.log('useAudioStorage: Track renamed and list refreshed.');
    } else {
      logger.error('useAudioStorage: Track rename failed in storageManager.');
    }
  }, [refreshData]);

  const createFolder = useCallback(async (parentId: string) => {
    logger.log('useAudioStorage: Creating new folder.', { parentId });
    await storageManager.createFolder("New Folder", parentId);
    refreshData();
  }, [refreshData]);
  
  const createProject = useCallback(async () => {
    logger.log('useAudioStorage: Creating new project.');
    const newProject = await storageManager.createProject("New Project");
    refreshData();
    return newProject.id;
  }, [refreshData]);

  const renameFolder = useCallback(async (id: string, newName: string) => {
    const success = await storageManager.renameFolder(id, newName);
    if (success) {
      refreshData();
    }
  }, [refreshData]);

  const moveTrackToFolder = useCallback(async (trackId: string, folderId: string | null) => {
    const success = await storageManager.moveTrackToFolder(trackId, folderId);
    if (success) {
      refreshData();
    }
  }, [refreshData]);

  const emptyTrash = useCallback(async () => {
    logger.log('useAudioStorage: emptyTrash function invoked.');
    await storageManager.emptyTrash();
    refreshData();
  }, [refreshData]); 
  
  const recoverTrack = useCallback(async (trackId: string) => {
    const success = await storageManager.recoverTrack(trackId);
    if (success) {
      refreshData();
    }
  }, [refreshData]);

  const recoverFolder = useCallback(async (folderId: string) => {
    const success = await storageManager.recoverFolder(folderId);
    if (success) {
      refreshData();
    }
  }, [refreshData]);
  
  const getAudioUrl = useCallback(async (id: string) => {
    return await storageManager.getAudioUrl(id);
  }, []);
  
  return {
    tracks,
    folders,
    isLoading,
    importAudio,
    deleteTrack,
    deleteFolder,
    renameTrack,
    createFolder,
    createProject,
    renameFolder,
    moveTrackToFolder,
    emptyTrash,
    recoverTrack,
    recoverFolder,
    getAudioUrl,
  };
}
