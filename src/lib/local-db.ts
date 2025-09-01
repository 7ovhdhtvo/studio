
import Dexie, { type Table } from 'dexie';

export interface AudioTrack {
  id: number;
  title: string;
  originalFilename: string;
  duration: number;
  blob: Blob;
}

export class AppDatabase extends Dexie {
  tracks!: Table<AudioTrack, number>; 

  constructor() {
    super('ADPlaybackDatabase');
    this.version(1).stores({
      tracks: '++id, title, originalFilename', // Primary key and indexed properties
    });
  }
}

export const db = new AppDatabase();

    