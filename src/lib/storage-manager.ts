
// Zentrale Storage-Verwaltung mit klarer Trennung von Concerns
export interface AudioFile {
  id: string;
  title: string;
  originalName: string;
  duration: number;
  size: number;
  createdAt: number;
  fileHandle?: FileSystemFileHandle; // Für OPFS
  blobUrl?: string; // Für In-Memory
}

class StorageManager {
  private metadata: Map<string, AudioFile> = new Map();
  private audioBlobs: Map<string, Blob> = new Map();
  
  // Initialisierung - Lade Metadaten aus LocalStorage
  async initialize() {
    try {
      const stored = localStorage.getItem('audio_metadata');
      if (stored) {
        const data = JSON.parse(stored);
        this.metadata = new Map(data);
        
        // Revoke old blob URLs on startup to prevent memory leaks
        this.metadata.forEach(file => {
          if (file.blobUrl && file.blobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(file.blobUrl);
            file.blobUrl = undefined;
          }
        });
        this.persistMetadata();
      }
    } catch (e) {
      console.error('Failed to load metadata:', e);
      this.metadata = new Map();
    }
  }
  
  private async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        window.URL.revokeObjectURL(audio.src);
        resolve(audio.duration);
      };
      audio.src = window.URL.createObjectURL(file);
    });
  }

  // Speichere Audio-Datei
  async saveAudioFile(file: File): Promise<AudioFile> {
    const id = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Speichere Blob im Memory
    this.audioBlobs.set(id, file);
    const duration = await this.getAudioDuration(file);
    
    // Erstelle Metadaten
    const audioFile: AudioFile = {
      id,
      title: file.name.replace(/\.[^/.]+$/, ''),
      originalName: file.name,
      duration: duration,
      size: file.size,
      createdAt: Date.now(),
      blobUrl: URL.createObjectURL(file)
    };
    
    // Speichere Metadaten
    this.metadata.set(id, audioFile);
    this.persistMetadata();
    
    // Optional: Versuche OPFS zu nutzen (für größere Dateien)
    this.saveToOPFS(id, file).catch(console.error);
    
    return audioFile;
  }
  
  // Lösche Audio-Datei
  async deleteAudioFile(id: string): Promise<boolean> {
    try {
      // Revoke Blob URL wenn vorhanden
      const file = this.metadata.get(id);
      if (file?.blobUrl) {
        URL.revokeObjectURL(file.blobUrl);
      }
      
      // Lösche aus allen Speichern
      this.audioBlobs.delete(id);
      this.metadata.delete(id);
      this.persistMetadata();
      
      // Versuche aus OPFS zu löschen
      await this.deleteFromOPFS(id).catch(console.error);
      
      return true;
    } catch (e) {
      console.error('Delete failed:', e);
      return false;
    }
  }
  
  // Umbenennen
  async renameAudioFile(id: string, newTitle: string): Promise<boolean> {
    const file = this.metadata.get(id);
    if (!file) return false;
    
    file.title = newTitle;
    this.metadata.set(id, file);
    this.persistMetadata();
    
    return true;
  }
  
  // Hole Audio-URL für Playback
  async getAudioUrl(id: string): Promise<string | null> {
    const file = this.metadata.get(id);
    if (!file) return null;
    
    // Wenn Blob URL vorhanden, nutze diese
    if (file.blobUrl && file.blobUrl.startsWith('blob:')) return file.blobUrl;
    
    // Versuche aus OPFS zu laden
    const blob = await this.loadFromOPFS(id).catch(() => null);
    if (blob) {
      const url = URL.createObjectURL(blob);
      file.blobUrl = url;
      this.metadata.set(id, file); // No need to persist
      return url;
    }
    
    // Fallback: Versuche aus Memory
    const memoryBlob = this.audioBlobs.get(id);
    if (memoryBlob) {
      const url = URL.createObjectURL(memoryBlob);
      file.blobUrl = url;
      this.metadata.set(id, file); // No need to persist
      return url;
    }
    
    return null;
  }
  
  // Hole alle Tracks
  getAllTracks(): AudioFile[] {
    return Array.from(this.metadata.values()).sort((a, b) => b.createdAt - a.createdAt);
  }
  
  // Private Hilfsmethoden
  private persistMetadata() {
    try {
      const data = Array.from(this.metadata.entries());
      localStorage.setItem('audio_metadata', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to persist metadata:', e);
    }
  }
  
  private async saveToOPFS(id: string, blob: Blob) {
    if (!('storage' in navigator && 'getDirectory' in navigator.storage)) return;
    
    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(`${id}.audio`, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
    } catch (e) {
      console.error('OPFS save failed:', e);
    }
  }
  
  private async loadFromOPFS(id: string): Promise<Blob | null> {
    if (!('storage' in navigator && 'getDirectory' in navigator.storage)) return null;
    
    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(`${id}.audio`);
      return await fileHandle.getFile();
    } catch (e) {
      return null;
    }
  }
  
  private async deleteFromOPFS(id: string) {
    if (!('storage' in navigator && 'getDirectory' in navigator.storage)) return;
    
    try {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry(`${id}.audio`);
    } catch (e) {
      // Ignore not found errors
    }
  }
}

// Singleton Export
export const storageManager = new StorageManager();

    