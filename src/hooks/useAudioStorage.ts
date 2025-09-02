
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
  
  // Import Audio
  const importAudio = useCallback(async (file: File) => {
    try {
      const audioFile = await storageManager.saveAudioFile(file);
      setTracks(storageManager.getAllTracks());
      return { success: true, file: audioFile };
    } catch (error) {
      console.error('Import failed:', error);
      return { success: false, error };
    }
  }, []);
  
  // Delete Track
  const deleteTrack = useCallback(async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this track?');
    if (!confirmed) return false;
    
    const success = await storageManager.deleteAudioFile(id);
    if (success) {
      setTracks(storageManager.getAllTracks());
    }
    return success;
  }, []);
  
  // Rename Track
  const renameTrack = useCallback(async (id: string, newTitle: string) => {
    const success = await storageManager.renameAudioFile(id, newTitle);
    if (success) {
      setTracks(storageManager.getAllTracks());
    }
    return success;
  }, []);
  
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
    getAudioUrl
  };
}
