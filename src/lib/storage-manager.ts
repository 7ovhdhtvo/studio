
import { logger } from './logger';
import { localDB } from './local-db';

const TRASH_FOLDER_ID = 'trash';

export interface AutomationPoint {
  id: string;
  time: number;
  value: number;
  name?: string;
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
  
  async initialize() {
    logger.log('StorageManager: Initializing...');
    try {
      // ONE-TIME HARD RESET - This will be removed in the next interaction.
      if (localStorage.getItem('__NEEDS_RESET__')) {
        logger.log('PERFORMING ONE-TIME STORAGE RESET.');
        localStorage.removeItem('audio_metadata');
        localStorage.removeItem('audio_folders');
        localStorage.removeItem('__NEEDS_RESET__');
      }


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
      
      // Revoke any old blob URLs from previous sessions
      this.metadata.forEach(file => {
        if (file.blobUrl && file.blobUrl.startsWith('blob:')) {
          URL.revokeObjectURL(file.blobUrl);
          file.blobUrl = undefined;
        }
      });
      this.persistMetadata(); // Save the cleaned metadata
    } catch (e) {
      logger.error('StorageManager: Failed to initialize.', { error: e });
      this.metadata = new Map();
      this.folders = new Map();
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
      // blobUrl is NOT set here, it will be created on demand
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

    // Recursive function to find all descendants of a folder
    const findDescendants = (folderId: string) => {
      // Find direct child folders
      const childFolders = Array.from(this.folders.values()).filter(f => f.parentId === folderId);
      for (const folder of childFolders) {
        if (!foldersToDelete.has(folder.id)) {
          foldersToDelete.add(folder.id);
          findDescendants(folder.id); // Recurse
        }
      }

      // Find direct child tracks
      const childTracks = Array.from(this.metadata.values()).filter(t => t.folderId === folderId);
      for (const track of childTracks) {
        tracksToDelete.add(track.id);
      }
    };
    
    // Start with all items directly in trash
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

    // Delete tracks
    for (const trackId of tracksToDelete) {
      await localDB.deleteItem(trackId);
      const track = this.metadata.get(trackId);
      if (track?.blobUrl) {
          URL.revokeObjectURL(track.blobUrl);
      }
      this.metadata.delete(trackId);
    }
    
    // Delete folders
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
    
    // If we have a valid URL in memory, use it
    if (fileMeta.blobUrl && fileMeta.blobUrl.startsWith('blob:')) {
      return fileMeta.blobUrl;
    }
    
    // Otherwise, fetch from IndexedDB
    const blob = await localDB.getItem(id);
    if (blob) {
      const url = URL.createObjectURL(blob);
      fileMeta.blobUrl = url; // Cache the URL in memory for this session
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

    // Check if original parent still exists, otherwise recover to root
    const parentExists = folder.originalParentId && this.folders.has(folder.originalParentId);
    folder.parentId = parentExists ? folder.originalParentId : null;
    
    // If it's a project, it should be a root item.
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

  getAllTracks(): AudioFile[] {
    return Array.from(this.metadata.values()).sort((a, b) => a.title.localeCompare(b.title));
  }

  getFolders(): Folder[] {
    return Array.from(this.folders.values()).sort((a,b) => a.name.localeCompare(b.name));
  }
  
  private persistMetadata() {
    try {
      // Create a temporary object without blobUrl before serializing
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
    try {
      const data = Array.from(this.folders.entries());
      localStorage.setItem('audio_folders', JSON.stringify(data));
    } catch (e) {
      logger.error('StorageManager: Failed to persist folders.', { error: e });
    }
  }
}

// Set a flag to perform a hard reset on next load
if (!localStorage.getItem('__RESET_PERFORMED__')) {
    localStorage.setItem('__NEEDS_RESET__', 'true');
    localStorage.setItem('__RESET_PERFORMED__', 'true');
}


export const storageManager = new StorageManager();
