
import { logger } from './logger';

const TRASH_FOLDER_ID = 'trash';

export interface AudioFile {
  id: string;
  title: string;
  originalName: string;
  duration: number;
  size: number;
  createdAt: number;
  folderId: string | null;
  blobUrl?: string; 
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

class StorageManager {
  private metadata: Map<string, AudioFile> = new Map();
  private folders: Map<string, Folder> = new Map();
  private audioBlobs: Map<string, Blob> = new Map();
  
  async initialize() {
    logger.log('StorageManager: Initializing...');
    try {
      const storedMeta = localStorage.getItem('audio_metadata');
      if (storedMeta) {
        this.metadata = new Map(JSON.parse(storedMeta));
        logger.log(`StorageManager: Loaded ${this.metadata.size} tracks.`);
      }

      const storedFolders = localStorage.getItem('audio_folders');
      if (storedFolders) {
        this.folders = new Map(JSON.parse(storedFolders));
        logger.log(`StorageManager: Loaded ${this.folders.size} folders.`);
      }

      if (!this.folders.has(TRASH_FOLDER_ID)) {
        this.folders.set(TRASH_FOLDER_ID, {
          id: TRASH_FOLDER_ID,
          name: 'Trash',
          createdAt: Date.now(),
        });
        this.persistFolders();
      }
      
      this.metadata.forEach(file => {
        if (file.blobUrl && file.blobUrl.startsWith('blob:')) {
          URL.revokeObjectURL(file.blobUrl);
          file.blobUrl = undefined;
        }
      });
      this.persistMetadata();
    } catch (e) {
      logger.error('StorageManager: Failed to load data.', { error: e });
      this.metadata = new Map();
      this.folders = new Map();
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

  async saveAudioFile(file: File, folderId: string | null): Promise<AudioFile> {
    const id = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logger.log('StorageManager: Saving new audio file.', { name: file.name, folderId });
    
    this.audioBlobs.set(id, file);
    const duration = await this.getAudioDuration(file);
    
    const audioFile: AudioFile = {
      id,
      title: file.name.replace(/\.[^/.]+$/, ''),
      originalName: file.name,
      duration: duration,
      size: file.size,
      createdAt: Date.now(),
      folderId: folderId,
      blobUrl: URL.createObjectURL(file)
    };
    
    this.metadata.set(id, audioFile);
    this.persistMetadata();
    
    return audioFile;
  }
  
  // Moves a file to the trash folder
  async deleteAudioFile(id: string): Promise<boolean> {
    return this.moveTrackToFolder(id, TRASH_FOLDER_ID);
  }

  async emptyTrash(): Promise<void> {
    logger.log('StorageManager: Emptying trash.');
    const tracksInTrash = this.getAllTracks().filter(t => t.folderId === TRASH_FOLDER_ID);
    for (const track of tracksInTrash) {
      const file = this.metadata.get(track.id);
      if (file?.blobUrl) {
        URL.revokeObjectURL(file.blobUrl);
      }
      this.audioBlobs.delete(track.id);
      this.metadata.delete(track.id);
    }
    this.persistMetadata();
    logger.log(`StorageManager: Emptied ${tracksInTrash.length} items from trash.`);
  }
  
  async renameAudioFile(id: string, newTitle: string): Promise<boolean> {
    logger.log('StorageManager: Attempting to rename file.', { id, newTitle });
    const file = this.metadata.get(id);
    if (!file) return false;
    
    file.title = newTitle;
    this.metadata.set(id, file);
    this.persistMetadata();
    logger.log('StorageManager: Rename successful.', { id });
    return true;
  }
  
  async getAudioUrl(id: string): Promise<string | null> {
    const file = this.metadata.get(id);
    if (!file) return null;
    
    if (file.blobUrl && file.blobUrl.startsWith('blob:')) return file.blobUrl;
    
    const memoryBlob = this.audioBlobs.get(id);
    if (memoryBlob) {
      const url = URL.createObjectURL(memoryBlob);
      file.blobUrl = url;
      this.metadata.set(id, file);
      return url;
    }
    
    return null;
  }

  // FOLDER MANAGEMENT
  async createFolder(name: string): Promise<Folder> {
    const id = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newFolder: Folder = { id, name, createdAt: Date.now() };
    this.folders.set(id, newFolder);
    this.persistFolders();
    return newFolder;
  }

  async renameFolder(id: string, newName: string): Promise<boolean> {
    const folder = this.folders.get(id);
    if (!folder || id === TRASH_FOLDER_ID) return false;
    folder.name = newName;
    this.folders.set(id, folder);
    this.persistFolders();
    return true;
  }

  async moveTrackToFolder(trackId: string, folderId: string | null): Promise<boolean> {
    const track = this.metadata.get(trackId);
    if (!track) return false;
    if (folderId && !this.folders.has(folderId)) return false;
    
    track.folderId = folderId;
    this.metadata.set(trackId, track);
    this.persistMetadata();
    return true;
  }
  
  async recoverTrack(trackId: string): Promise<boolean> {
    logger.log('StorageManager: Recovering track.', { trackId });
    return this.moveTrackToFolder(trackId, null); // Move to root
  }
  
  getAllTracks(): AudioFile[] {
    return Array.from(this.metadata.values()).sort((a, b) => a.title.localeCompare(b.title));
  }

  getFolders(): Folder[] {
    return Array.from(this.folders.values()).sort((a,b) => a.name.localeCompare(b.name));
  }
  
  private persistMetadata() {
    try {
      const data = Array.from(this.metadata.entries());
      localStorage.setItem('audio_metadata', JSON.stringify(data));
    } catch (e) {
      logger.error('StorageManager: Failed to persist metadata.', { error: e });
    }
  }

  private persistFolders() {
    try {
      const data = Array.from(this.folders.entries());
      localStorage.setItem('audio_folders', JSON.stringify(data));
    } catch (e) {
      logger.error('StorageManager: Failed to persist folders.', { error: e });
    }
  }
}

export const storageManager = new StorageManager();
