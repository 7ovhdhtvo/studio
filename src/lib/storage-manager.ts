
import { logger } from './logger';
import { localDB } from './local-db';

const TRASH_FOLDER_ID = 'trash';

export interface AutomationPoint {
  id: string;
  time: number;
  value: number;
  name?: string;
}

export interface Marker {
  id: string;
  time: number;
  name: string;
  isPlaybackStart?: boolean;
  isLoopEnd?: boolean;
}

export interface AudioFile {
  id: string;
  title: string;
  originalName: string;
  duration: number;
  size: number;
  createdAt: number;
  folderId: string | null;
  volumeAutomation?: AutomationPoint[];
  markers?: Marker[];
  blobUrl?: string; // This will now be a temporary, in-memory URL
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
  isProject: boolean;
  parentId: string | null;
  originalParentId?: string | null; // Used for recovery
}

class StorageManager {
  private metadata: Map<string, AudioFile> = new Map();
  private folders: Map<string, Folder> = new Map();
  private isInitialized = false;
  
  async initialize() {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }
    this.isInitialized = true;
    logger.log('StorageManager: Initializing...');
    try {
      this.performOneTimeReset();

      await localDB.openDB();

      const storedMeta = localStorage.getItem('audio_metadata');
      if (storedMeta) {
        this.metadata = new Map(JSON.parse(storedMeta));
        logger.log(`StorageManager: Loaded ${this.metadata.size} tracks metadata.`);
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
          isProject: false,
          parentId: null,
        });
        this.persistFolders();
      }

      const projectsExist = Array.from(this.folders.values()).some(f => f.isProject);
      if (!projectsExist) {
        await this.createProject("My First Project");
      }
      
      this.metadata.forEach(file => {
        if (file.blobUrl && file.blobUrl.startsWith('blob:')) {
          URL.revokeObjectURL(file.blobUrl);
          file.blobUrl = undefined;
        }
      });
      this.persistMetadata();
    } catch (e) {
      logger.error('StorageManager: Failed to initialize.', { error: e });
      this.metadata = new Map();
      this.folders = new Map();
    }
  }

  private performOneTimeReset() {
    if (localStorage.getItem('__NEEDS_RESET__')) {
      logger.log('PERFORMING ONE-TIME STORAGE RESET.');
      localStorage.removeItem('audio_metadata');
      localStorage.removeItem('audio_folders');
      localStorage.removeItem('__NEEDS_RESET__');
    }
  }
  
  private async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      
      audio.onloadedmetadata = () => {
        window.URL.revokeObjectURL(audio.src);
        resolve(audio.duration);
      };

      audio.onerror = () => {
        window.URL.revokeObjectURL(audio.src);
        reject(new Error(`Failed to load audio metadata for file: ${file.name}`));
      };

      audio.src = window.URL.createObjectURL(file);
    });
  }
  
  private getUniqueFolderName(baseName: string): string {
    let name = baseName;
    let counter = 1;
    const existingNames = new Set(Array.from(this.folders.values()).map(f => f.name));
    while (existingNames.has(name)) {
      name = `${baseName} (${counter})`;
      counter++;
    }
    return name;
  }

  async saveAudioFile(file: File, folderId: string | null): Promise<AudioFile> {
    const id = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logger.log('StorageManager: Saving new audio file.', { name: file.name, folderId });
    
    await localDB.setItem(id, file);
    const duration = await this.getAudioDuration(file);
    
    const audioFile: AudioFile = {
      id,
      title: file.name.replace(/\.[^/.]+$/, ''),
      originalName: file.name,
      duration: duration,
      size: file.size,
      createdAt: Date.now(),
      folderId: folderId,
      volumeAutomation: [],
      markers: [],
    };
    
    this.metadata.set(id, audioFile);
    this.persistMetadata();
    
    return audioFile;
  }
  
  async deleteAudioFile(id: string): Promise<boolean> {
    return this.moveTrackToFolder(id, TRASH_FOLDER_ID);
  }

  async emptyTrash(): Promise<void> {
    logger.log('StorageManager: emptyTrash method started.');
    
    const foldersToDelete = new Set<string>();
    const tracksToDelete = new Set<string>();

    const findDescendants = (folderId: string) => {
      const childFolders = Array.from(this.folders.values()).filter(f => f.parentId === folderId);
      for (const folder of childFolders) {
        if (!foldersToDelete.has(folder.id)) {
          foldersToDelete.add(folder.id);
          findDescendants(folder.id);
        }
      }

      const childTracks = Array.from(this.metadata.values()).filter(t => t.folderId === folderId);
      for (const track of childTracks) {
        tracksToDelete.add(track.id);
      }
    };
    
    const rootTrashFolders = Array.from(this.folders.values()).filter(f => f.parentId === TRASH_FOLDER_ID);
    const rootTrashTracks = Array.from(this.metadata.values()).filter(t => t.folderId === TRASH_FOLDER_ID);

    for (const folder of rootTrashFolders) {
        foldersToDelete.add(folder.id);
        findDescendants(folder.id);
    }
    for (const track of rootTrashTracks) {
        tracksToDelete.add(track.id);
    }
    
    logger.log(`Found ${tracksToDelete.size} tracks and ${foldersToDelete.size} folders to delete permanently.`);

    for (const trackId of tracksToDelete) {
      await localDB.deleteItem(trackId);
      const track = this.metadata.get(trackId);
      if (track?.blobUrl) {
          URL.revokeObjectURL(track.blobUrl);
      }
      this.metadata.delete(trackId);
    }
    
    for (const folderId of foldersToDelete) {
      this.folders.delete(folderId);
    }

    this.persistMetadata();
    this.persistFolders();
    logger.log('StorageManager: Emptied trash and persisted changes.');
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
    const fileMeta = this.metadata.get(id);
    if (!fileMeta) return null;
    
    if (fileMeta.blobUrl && fileMeta.blobUrl.startsWith('blob:')) {
      return fileMeta.blobUrl;
    }
    
    const blob = await localDB.getItem(id);
    if (blob) {
      const url = URL.createObjectURL(blob);
      fileMeta.blobUrl = url;
      this.metadata.set(id, fileMeta);
      return url;
    }
    
    logger.error('StorageManager: Blob not found in IndexedDB for track.', { id });
    return null;
  }

  async getAudioBlob(id: string): Promise<Blob | null> {
    return localDB.getItem(id);
  }


  // FOLDER MANAGEMENT
  async createFolder(name: string, parentId: string): Promise<Folder> {
    const id = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newFolder: Folder = { id, name: this.getUniqueFolderName(name), createdAt: Date.now(), isProject: false, parentId };
    this.folders.set(id, newFolder);
    this.persistFolders();
    return newFolder;
  }

  async createProject(name: string): Promise<Folder> {
    const id = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newProject: Folder = { id, name: this.getUniqueFolderName(name), createdAt: Date.now(), isProject: true, parentId: null };
    this.folders.set(id, newProject);
    this.persistFolders();
    return newProject;
  }

  async renameFolder(id: string, newName: string): Promise<boolean> {
    const folder = this.folders.get(id);
    if (!folder || id === TRASH_FOLDER_ID) return false;
    folder.name = newName;
    this.folders.set(id, folder);
    this.persistFolders();
    return true;
  }

  async deleteFolder(id: string): Promise<boolean> {
      const folder = this.folders.get(id);
      if (!folder || id === TRASH_FOLDER_ID) return false;

      folder.originalParentId = folder.parentId;
      folder.parentId = TRASH_FOLDER_ID;
      this.folders.set(id, folder);
      this.persistFolders();
      logger.log('StorageManager: Moved folder to trash.', { id });
      return true;
  }

  async moveTrackToFolder(trackId: string, folderId: string | null): Promise<boolean> {
    const track = this.metadata.get(trackId);
    if (!track) return false;
    if (folderId && !this.folders.has(folderId) && folderId !== TRASH_FOLDER_ID) return false;
    
    track.folderId = folderId;
    this.metadata.set(trackId, track);
    this.persistMetadata();
    return true;
  }
  
  async recoverTrack(trackId: string): Promise<boolean> {
    const track = this.metadata.get(trackId);
    if (!track || track.folderId !== TRASH_FOLDER_ID) return false;
    
    logger.log('StorageManager: Recovering track.', { trackId });
    return this.moveTrackToFolder(trackId, null);
  }

  async recoverFolder(folderId: string): Promise<boolean> {
    const folder = this.folders.get(folderId);
    if (!folder || folder.parentId !== TRASH_FOLDER_ID) return false;

    const parentExists = folder.originalParentId && this.folders.has(folder.originalParentId);
    folder.parentId = parentExists ? folder.originalParentId : null;
    
    if (folder.isProject) {
      folder.parentId = null;
    }
    
    delete folder.originalParentId;

    this.folders.set(folderId, folder);
    this.persistFolders();
    return true;
  }
  
  async updateTrackAutomation(trackId: string, points: AutomationPoint[]): Promise<AudioFile | null> {
    const track = this.metadata.get(trackId);
    if (!track) return null;
    track.volumeAutomation = points;
    this.metadata.set(trackId, track);
    this.persistMetadata();
    return track;
  }

  async updateTrackMarkers(trackId: string, markers: Marker[]): Promise<AudioFile | null> {
    const track = this.metadata.get(trackId);
    if (!track) return null;
    track.markers = markers;
    this.metadata.set(trackId, track);
    this.persistMetadata();
    return track;
  }

  getAllTracks(): AudioFile[] {
    return Array.from(this.metadata.values()).sort((a, b) => a.title.localeCompare(b.title));
  }

  getFolders(): Folder[] {
    return Array.from(this.folders.values()).sort((a,b) => a.name.localeCompare(b.name));
  }
  
  private persistMetadata() {
    if (typeof window === 'undefined') return;
    try {
      const serializableMetadata = new Map<string, Omit<AudioFile, 'blobUrl'>>();
      this.metadata.forEach((value, key) => {
          const { blobUrl, ...rest } = value;
          serializableMetadata.set(key, rest);
      });
      const data = Array.from(serializableMetadata.entries());
      localStorage.setItem('audio_metadata', JSON.stringify(data));
    } catch (e) {
      logger.error('StorageManager: Failed to persist metadata.', { error: e });
    }
  }

  private persistFolders() {
    if (typeof window === 'undefined') return;
    try {
      const data = Array.from(this.folders.entries());
      localStorage.setItem('audio_folders', JSON.stringify(data));
    } catch (e) {
      logger.error('StorageManager: Failed to persist folders.', { error: e });
    }
  }
}

const initializeOneTimeReset = () => {
  if (typeof window !== 'undefined') {
    if (!localStorage.getItem('__RESET_PERFORMED__')) {
        localStorage.setItem('__NEEDS_RESET__', 'true');
        localStorage.setItem('__RESET_PERFORMED__', 'true');
    }
  }
};

initializeOneTimeReset();

export const storageManager = new StorageManager();
