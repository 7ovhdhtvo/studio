
"use client";

import { useState, useEffect, useCallback } from 'react';
import { storageManager, type AudioFile } from '@/lib/storage-manager';

export function useAudioStorage() {
  const [tracks, setTracks] = useState<AudioFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialisierung
  useEffect(() => {
    const init = async () => {
      await storageManager.initialize();
      setTracks(storageManager.getAllTracks());
      setIsLoading(false);
    };
    init();
  }, []);
  
  const refreshTracks = useCallback(() => {
      // Create a NEW array from the storage manager's results
      // This is crucial for React to detect a state change.
      const freshTracks = [...storageManager.getAllTracks()];
      setTracks(freshTracks);
  }, []);

  // Import Audio
  const importAudio = useCallback(async (file: File) => {
    try {
      const audioFile = await storageManager.saveAudioFile(file);
      refreshTracks(); // Use the new refresh function
      return { success: true, file: audioFile };
    } catch (error) {
      console.error('Import failed:', error);
      return { success: false, error };
    }
  }, [refreshTracks]);
  
  // Delete Track
  const deleteTrack = useCallback(async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this track?');
    if (!confirmed) return false;
    
    const success = await storageManager.deleteAudioFile(id);
    if (success) {
      refreshTracks(); // Use the new refresh function
    }
    return success;
  }, [refreshTracks]);
  
  // Rename Track
  const renameTrack = useCallback(async (id: string, newTitle: string) => {
    const success = await storageManager.renameAudioFile(id, newTitle);
    if (success) {
      refreshTracks(); // Use the new refresh function
    }
    return success;
  }, [refreshTracks]);
  
  // Get Audio URL
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
    setTracks // Expose setTracks for the debug panel
  };
}

    